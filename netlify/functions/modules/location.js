// _config.js에서 필요한 공통 함수를 가져옵니다.
const { formatKoreanDate } = require('./_config.js');

// 이 모듈에서만 사용하는 상수들을 정의합니다.
const TEMPLATES = {
  '남자': 'KA01TP250915111655543dNyrrzwEjp0',
  '여자': 'KA01TP250915111655543dNyrrzwEjp0',
  'DEFAULT': 'KA01TP250915111655543dNyrrzwEjp0' // 성별이 없거나 일치하지 않을 때 사용할 기본값
};

const MEMO_FIELD = 'memo3'; // 상태를 기록할 DB 필드
const KEYWORD = '장소문자'; // 중복 발송을 막기 위한 키워드

// ★★★ 각 모듈은 아래 4개의 함수를 반드시 export 해야 합니다 ★★★
module.exports = {
  /**
   * (필수) 발송 대상 사용자를 필터링하여 반환합니다.
   * @param {SupabaseClient} supabase - Supabase 클라이언트
   * @param {string[]} ids - 프론트에서 선택한 사용자 ID 배열
   * @returns {Promise<{users: object[], error: any}>}
   */
  getUsers: async (supabase, ids) => {
    // 기존 resend-selected.js의 'location' 타입 DB 조회 로직
    const { data, error } = await supabase
      .from('responses')
      .select(`id, name, phone, apply_date, ${MEMO_FIELD}`) // 필요한 컬럼만 조회
      .in('id', ids)
      .or(
        `${MEMO_FIELD}.not.like.%${KEYWORD}%,` +     // 1. '장소문자'가 포함되지 않았거나
        `${MEMO_FIELD}.like.%❌${KEYWORD}%,` +      // 2. '❌장소문자'가 포함되었거나
        `${MEMO_FIELD}.is.null`                     // 3. 필드가 비어있는 경우
      );
    return { users: data, error };
  },

  /**
   * (필수) 사용자 정보에 따라 사용할 템플릿 ID를 반환합니다.
   * @param {object} user - 사용자 정보 객체
   * @returns {string} - CoolSMS 템플릿 ID
   */
  getTemplateId: (user) => {
    // 사용자의 성별(예: '남자')을 키로 사용하여 TEMPLATES 객체에서 값을 찾습니다.
    // 만약 해당하는 키가 없으면(user.gender가 null이거나 다른 값이면),
    // || 연산자 뒤의 기본값(TEMPLATES['DEFAULT'])을 사용합니다.
    const templateId = TEMPLATES[user.gender] || TEMPLATES['DEFAULT'];
    
    console.log(`[location] ${user.name}님(${user.gender})에게 '${templateId}' 템플릿을 사용합니다.`);
    
    return templateId;
  },

  /**
   * (필수) 템플릿에 주입할 변수를 생성하여 반환합니다.
   * @param {object} user - 사용자 정보 객체
   * @returns {object} - 템플릿 변수 객체
   */
  getVariables: (user) => {
    // 함수 안에서 formatKoreanDate를 호출하여 날짜를 변환
    const formattedDate = formatKoreanDate(user.apply_date); 
    
    // 변환된 날짜를 포함한 객체를 반환
    return { 
      '#{고객명}': user.name, 
      '#{파티명}': '게릴라 파티', 
      '#{date}': formattedDate // CoolSMS 템플릿의 변수명과 일치시켜야 함
    };
  },

  /**
   * (필수) 발송 결과를 DB에 업데이트합니다.
   * @param {SupabaseClient} supabase - Supabase 클라이언트
   * @param {object} user - 사용자 정보 객체
   * @param {boolean} isSent - 알림톡 발송 성공 여부
   */
  updateStatus: async (supabase, user, isSent) => {
    const successMsg = `✅${KEYWORD}`;
    const failMsg = `❌${KEYWORD}`;
    
    const messageToAppend = isSent ? successMsg : failMsg;
    const existingMemo = user[MEMO_FIELD] || '';

    // 기존 메모에서 같은 키워드의 성공/실패 메시지를 정규식으로 안전하게 제거 (중복 방지)
    const cleanedMemo = existingMemo
        .replace(new RegExp(`✅${KEYWORD}`, 'g'), '')
        .replace(new RegExp(`❌${KEYWORD}`, 'g'), '')
        .trim();

    const newMemo = `${cleanedMemo} ${messageToAppend}`.trim();

    await supabase
      .from('responses')
      .update({ [MEMO_FIELD]: newMemo })
      .eq('id', user.id);
  }
};