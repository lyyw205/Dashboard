// ★★★ _config.js에서 공용 로직 함수를 가져오는 것이 핵심입니다.
const { getInitialGuidanceConfig, formatKoreanDate } = require('./_config.js');

const MEMO_FIELD = 'memo1'; // ★★★ 초기 안내는 memo1 필드를 사용합니다.
const KEYWORD = '발송실패'; // 실패를 감지할 키워드

module.exports = {
  /**
   * (필수) 'memo1'에 실패 기록이 있는 사용자를 필터링합니다.
   */
  getUsers: async (supabase, ids) => {
    // 1. '실패' 기록이 있는 사용자를 먼저 조회합니다.
    const { data: failedUsers, error: failedError } = await supabase
      .from('responses')
      .select('*')
      .in('id', ids)
      .or(`memo1.like.%❌%,memo1.like.%${KEYWORD}%`);

    if (failedError) {
      console.error('실패 사용자 조회 중 오류:', failedError);
      return { users: null, error: failedError };
    }

    // 2. 'memo1' 필드가 비어있거나 NULL인 사용자를 조회합니다.
    const { data: emptyUsers, error: emptyError } = await supabase
      .from('responses')
      .select('*')
      .in('id', ids)
      .or(`memo1.is.null,memo1.eq.''`);

    if (emptyError) {
      console.error('비어있는 사용자 조회 중 오류:', emptyError);
      return { users: null, error: emptyError };
    }

    // 3. 두 배열을 합치고, 중복된 ID를 제거합니다.
    const allUsers = [...failedUsers, ...emptyUsers];
    const uniqueUsers = Array.from(new Map(allUsers.map(user => [user.id, user])).values());
    
    console.log(`[resend-failed] 조회 결과: 실패 ${failedUsers.length}명, 비어있음 ${emptyUsers.length}명 => 총 ${uniqueUsers.length}명`);

    return { users: uniqueUsers, error: null };
  },

  /**
   * (필수) 공용 함수를 호출하여 올바른 템플릿 ID를 얻어옵니다.
   */
  getTemplateId: (user) => {
    const config = getInitialGuidanceConfig(user);
    return config.template;
  },

  /**
   * (필수) 공용 함수를 호출하여 올바른 변수를 얻어옵니다.
   */
  getVariables: (user) => {
    const config = getInitialGuidanceConfig(user);
    const formattedDate = formatKoreanDate(user.apply_date);
    // getInitialGuidanceConfig가 반환한 variables 함수를 실행하여 최종 변수 객체를 얻습니다.
    return config.variables(user, formattedDate);
  },

  /**
   * (필수) 발송 결과를 DB에 업데이트합니다. (덮어쓰기 방식)
   */
  updateStatus: async (supabase, user, isSent) => {
    const config = getInitialGuidanceConfig(user);
    
    // ★★★ 다른 모듈과 달리, 이 모듈은 내용을 추가하는게 아니라 '덮어씁니다'.
    const statusMessage = isSent ? config.successMessage : `❌${KEYWORD}`;
    
    await supabase
      .from('responses')
      .update({ [MEMO_FIELD]: statusMessage }) // memo1 필드를 업데이트
      .eq('id', user.id);
  }
};