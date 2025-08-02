// _config.js에서 필요한 공통 함수를 가져옵니다.
const { formatKoreanDate } = require('./_config.js');

// 이 모듈에서만 사용하는 상수들을 정의합니다.
const TEMPLATES = {
  'GENERAL': 'KA01TP250728071222845K3Rr2ZMO4oq',
  'INVITED': 'KA01TP250728073901156nzSLS3pWWVw',
};

const MEMO_FIELD = 'memo3'; // 상태를 기록할 DB 필드
const KEYWORD = '입장안내'; // 중복 발송을 막기 위한 키워드

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
      .select(`id, name, phone, apply_date, memo1, ${MEMO_FIELD}`) // 필요한 컬럼만 조회
      .in('id', ids)
      .or(
        `${MEMO_FIELD}.not.like.%${KEYWORD}%,` +     // 1. '입장안내'가 포함되지 않았거나
        `${MEMO_FIELD}.like.%❌${KEYWORD}%,` +      // 2. '❌입장안내'가 포함되었거나
        `${MEMO_FIELD}.is.null`                     // 3. 필드가 비어있는 경우
      );
    return { users: data, error };
  },

  /**
   * (필수) 사용자 정보에 따라 사용할 템플릿 ID를 반환합니다.
   * @param {object} user - 사용자 정보 객체
   * @returns {string} - CoolSMS 템플릿 ID
   */
  /**
   * (필수) 사용자가 '초대자'인지 '일반'인지에 따라 다른 템플릿 ID를 반환합니다.
   */
  getTemplateId: (user) => {
    // memo1 필드에 '초대' 또는 '무료' 관련 키워드가 있는지 확인하여 초대자 여부를 판단합니다.
    // 이 조건은 비즈니스 로직에 맞게 얼마든지 변경할 수 있습니다.
    if (user.memo1 && (user.memo1.includes('무료초대'))) {
      console.log(`[entrance] ${user.name}님은 초대자이므로 초대용 템플릿을 사용합니다.`);
      return TEMPLATES['INVITED'];
    } else {
      console.log(`[entrance] ${user.name}님은 일반 참석자이므로 일반용 템플릿을 사용합니다.`);
      return TEMPLATES['GENERAL'];
    }
  },

  /**
   * (필수) 사용하는 템플릿에 맞춰 다른 변수를 생성하여 반환합니다.
   */
  getVariables: (user) => {
    // getTemplateId와 동일한 조건으로 분기하여 필요한 변수를 제공합니다.
    if (user.memo1 && (user.memo1.includes('무료초대'))) {
      // 초대자용 템플릿은 '고객명'과 '브랜드명' 변수가 필요합니다.
      return {
        '#{고객명}': user.name,
        '#{브랜드명}': '게릴라 파티'
      };
    } else {
      // 일반용 템플릿은 '브랜드명' 변수만 필요합니다.
      return {
        '#{브랜드명}': '게릴라 파티'
      };
    }
  },

  /**
   * (필수) 발송 결과를 DB에 업데이트합니다.
   * @param {SupabaseClient} supabase - Supabase 클라이언트
   * @param {object} user - 사용자 정보 객체
   * @param {boolean} isSent - 알림톡 발송 성공 여부
   */
  updateStatus: async (supabase, user, isSent) => {
    let successMsg;
    // getTemplateId/getVariables와 동일한 조건으로 성공 메시지를 다르게 설정합니다.
    if (user.memo1 && (user.memo1.includes('무료초대'))) {
      successMsg = '🔔입장안내(초대)';
    } else {
      successMsg = '🔔입장안내(일반)';
    }
    const failMsg = `❌${KEYWORD}`;
    
    const messageToAppend = isSent ? successMsg : failMsg;
    const existingMemo = user[MEMO_FIELD] || '';

    // 기존의 모든 입장안내 관련 메시지를 정규식으로 찾아서 지웁니다.
    const cleanedMemo = existingMemo
        .replace(new RegExp(`🔔입장안내\\(초대\\)`, 'g'), '')
        .replace(new RegExp(`🔔입장안내\\(일반\\)`, 'g'), '')
        .replace(new RegExp(`❌${KEYWORD}`, 'g'), '')
        .trim();

    const newMemo = `${cleanedMemo} ${messageToAppend}`.trim();

    await supabase
      .from('responses')
      .update({ [MEMO_FIELD]: newMemo })
      .eq('id', user.id);
  }
};