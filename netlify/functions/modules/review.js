// 이 모듈에서는 공통 함수가 필요하지 않습니다.

// --- '후기 요청' 모듈 전용 상수 정의 ---
const TEMPLATES = {
  'GENERAL_MALE': 'KA01TP250728091343537cMnl2OyYPsI', // 후기(일반/남)
  'GENERAL_FEMALE': 'KA01TP2507260429579241AtnXD6QQIx', // 후기(일반/여)
  'INVITED': 'KA01TP250728074631591vikenhhLrRr',         // 후기(무료초대)
};
const MEMO_FIELD = 'memo3'; 
const KEYWORD = '후기';

module.exports = {
  /**
   * (필수) '후기 요청'을 보낼 대상을 필터링합니다.
   */
  getUsers: async (supabase, ids) => {
    // 모든 조건을 판단하기 위해 필요한 컬럼들을 모두 조회합니다.
    const { data, error } = await supabase
      .from('responses')
      .select(`id, name, phone, gender, coupon, memo1, ${MEMO_FIELD}`) // ★★★ gender, coupon, memo1 모두 필요
      .in('id', ids)
      .not('coupon', 'ilike', '문토') 
      .or(
        `${MEMO_FIELD}.not.like.%${KEYWORD}%,` +
        `${MEMO_FIELD}.like.%❌${KEYWORD}%,` +
        `${MEMO_FIELD}.is.null`
      );
    return { users: data, error };
  },

  /**
   * (필수) 사용자의 조건에 맞는 '후기' 템플릿 ID를 반환합니다.
   */
  getTemplateId: (user) => {
    // ★★★ 복잡한 분기 처리: 구체적인 조건부터 확인하는 것이 중요합니다. ★★★
    
    // 1. '무료초대' 대상자인가?
    if (user.memo1 && (user.memo1.includes('무료초대'))) {
      console.log(`[review] ${user.name}님은 '무료초대' 대상자입니다.`);
      return TEMPLATES['INVITED'];
    }
    // 2. 일반 참석자(여자)인가?
    else if (user.gender === '여자') {
      console.log(`[review] ${user.name}님은 '일반(여)' 참석자입니다.`);
      return TEMPLATES['GENERAL_FEMALE'];
    }
    // 3. 그 외 모든 경우 (일반 참석자(남자) 및 성별 미지정)
    else {
      console.log(`[review] ${user.name}님은 '일반(남)' 참석자입니다.`);
      return TEMPLATES['GENERAL_MALE'];
    }
  },

  /**
   * (필수) 템플릿에 주입할 변수를 반환합니다.
   */
  getVariables: (user) => {
    return {};
  },
  // getTemplateId와 완전히 동일한 분기 로직을 사용합니다.
  
  // 1. '문토' 쿠폰 사용자인가?
  // if (user.coupon && user.coupon.toUpperCase() === '문토') {
  //   // 예시: '문토' 후기 템플릿에는 '고객명' 변수가 필요하다고 가정
  //   return {
  //     '#{고객명}': user.name 
  //   };
  // } 
  // // 2. '무료초대' 대상자인가?
  // else if (user.memo1 && (user.memo1.includes('무료초대'))) {
  //   // 예시: '무료초대' 후기 템플릿에도 '고객명' 변수가 필요하다고 가정
  //   return {
  //     '#{고객명}': user.name
  //   };
  // }
  // // 3. 일반 참석자(남자)인가?
  // else if (user.gender === '남자') {
  //   // 예시: '일반' 후기 템플릿에는 변수가 전혀 필요 없다고 가정
  //   return {}; // 빈 객체 반환
  // }
  // // 4. 그 외 모든 경우 (일반 참석자(여자) 및 성별 미지정)
  // else {
  //   // 예시: '일반' 후기 템플릿에는 변수가 전혀 필요 없다고 가정
  //   return {}; // 빈 객체 반환
  // }

  /**
   * (필수) 발송 결과를 조건에 맞는 성공 메시지로 DB에 업데이트합니다.
   */
  updateStatus: async (supabase, user, isSent) => {
    let successMsg;
    const failMsg = `❌${KEYWORD}`;
    
    // getTemplateId와 동일한 로직으로 성공 메시지를 결정합니다.

    if (user.memo1 && (user.memo1.includes('무료초대'))) {
      successMsg = '✏️후기(무료초대)';
    }
    else if (user.gender === '여자') {
      successMsg = '✏️후기(일반/여)';
    }
    else {
      successMsg = '✏️후기(일반/남)';
    }
    
    const messageToAppend = isSent ? successMsg : failMsg;
    const existingMemo = user[MEMO_FIELD] || '';

    // 기존에 기록된 모든 종류의 '후기' 관련 메시지를 전부 찾아서 지웁니다.
    const cleanedMemo = existingMemo
        .replace(/✏️후기\(문토\)/g, '')
        .replace(/✏️후기\(무료초대\)/g, '')
        .replace(/✏️후기\(일반\/남\)/g, '')
        .replace(/✏️후기\(일반\/여\)/g, '')
        .replace(new RegExp(failMsg, 'g'), '')
        .trim();

    const newMemo = `${cleanedMemo} ${messageToAppend}`.trim();

    await supabase
      .from('responses')
      .update({ [MEMO_FIELD]: newMemo })
      .eq('id', user.id);
  }
};