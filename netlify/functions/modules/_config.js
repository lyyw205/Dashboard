// 파일 상단에 환경 변수를 로드하는 코드를 둡니다.
require('dotenv').config();

// 필요한 라이브러리를 가져옵니다.
const { createClient } = require('@supabase/supabase-js');
const SolapiMessageService = require('coolsms-node-sdk').default;

// --- 공용 클라이언트 및 변수 ---

// Supabase 클라이언트 (한 번만 생성해서 공유)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// CORS 헤더 (resend-selected.js에서도 사용하게 될 것입니다)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// --- 공용 함수 ---

/**
 * CoolSMS를 통해 알림톡을 발송하고 성공 여부(boolean)를 반환합니다.
 * @param {object} user - 사용자 정보 (name, phone 포함)
 * @param {string} templateCode - CoolSMS 템플릿 ID
 * @param {object} variables - 템플릿에 주입할 변수 객체
 * @returns {Promise<boolean>} - 발송 성공 시 true, 실패 시 false
 */
async function sendAlimtalk(user, templateCode, variables) {
  // resend-selected.js에 있던 개선된 버전의 sendAlimtalk 함수를 여기에 둡니다.
  const messageService = new SolapiMessageService(
    process.env.COOLSMS_API_KEY,
    process.env.COOLSMS_API_SECRET
  );
  
  const payload = {
    to: user.phone.replace(/-/g, ''),
    kakaoOptions: {
      pfId: process.env.COOLSMS_PFID,
      templateId: templateCode,
      variables: variables
    }
  };

  try {
    const response = await messageService.sendOne(payload);
    // CoolSMS의 성공 응답 코드 '2000'을 기준으로 성공/실패를 명확히 판단합니다.
    if (response.statusCode === '2000') {
      console.log(`✅ [${user.name}]에게 알림톡 발송 성공:`, response);
      return true;
    } else {
      console.error(`❌ [${user.name}]에게 알림톡 발송 실패:`, response);
      return false;
    }
  } catch (error) {
    console.error(`❌ [${user.name}]에게 알림톡 API 요청 중 심각한 오류 발생:`, error);
    return false;
  }
}

/**
 * 날짜 문자열(YYYY-MM-DD)을 'M월 D일' 형식으로 변환합니다.
 * @param {string} isoDateString - YYYY-MM-DD 형식의 날짜 문자열
 * @returns {string} - 변환된 날짜 문자열
 */
function formatKoreanDate(isoDateString) {
  if (!isoDateString) return '날짜 미정';
  const date = new Date(isoDateString);
  if (isNaN(date.getTime())) return isoDateString;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}월 ${day}일`;
}


// --- sendmessages.js 전용 설정 ---

// 기존 sendmessages.js에 있던 ALIMTALK_CONFIG를 그대로 옮겨옵니다.
const COUPON_CONFIG = [
  // --- 시나리오 1: 남/여 공통 쿠폰이지만, 템플릿과 메시지가 다른 경우 (가장 복잡한 케이스) ---
  {
    code: 'WEINVITEYOU',
    // 템플릿과 성공 메시지를 객체로 만들어 성별에 따라 다른 값을 갖도록 함
    template: {
      '남자': 'KA01TP250709145734382Qm8j2DgohNp', // 남성용 무료 초대 템플릿
      '여자': 'KA01TP250709145734382Qm8j2DgohNp',  // 여성용 무료 초대 템플릿 (예시)
    },
    successMessage: {
      '남자': '✅무료초대_남',
      '여자': '✅무료초대_여',
    },
    // 변수는 공통으로 사용 가능
    variables: (user, formattedDate) => ({
      '#{고객명}': user.name,
      '#{파티명}': '게릴라 파티',
      '#{date}': formattedDate
    }),
    extraUpdate: {
      field: 'memo3',
      value: '✅장소문자'
    }
  },
  {
    code: 'PARTY',
    // 템플릿과 성공 메시지를 객체로 만들어 성별에 따라 다른 값을 갖도록 함
    template: {
      '남자': 'KA01TP250717092857251yAnTUzfxJvp', // 남성용 무료 초대 템플릿
      '여자': 'KA01TP250707173844176ndkmNlwondi',  // 여성용 무료 초대 템플릿 (예시)
    },
    successMessage: {
      '남자': '✅현장초대_남',
      '여자': '✅현장초대_여',
    },
    // 변수는 공통으로 사용 가능
    variables: (user, formattedDate) => ({
      '#{고객명}': user.name,
      '#{파티명}': '게릴라 파티',
      '#{date}': formattedDate
    })
  },
  
  // --- 시나리오 2: 남/여 공통 쿠폰이고, 템플릿도 완전히 동일한 경우 (가장 간단한 케이스) ---
  {
    code: '민수',
    template: 'KA01TP250709145734382Qm8j2DgohNp', // 남/여 공통 템플릿을 문자열로 바로 할당
    successMessage: (user) => `✅무료초대_민수`, // 메시지는 동적으로 생성
    variables: (user, formattedDate) => ({
      '#{고객명}': user.name,
      '#{파티명}': '게릴라 파티',
      '#{date}': formattedDate
    }),
    extraUpdate: {
      field: 'memo3',
      value: '✅장소문자'
    }
  },
  {
    code: '선준',
    template: 'KA01TP250709145734382Qm8j2DgohNp', // 남/여 공통 템플릿을 문자열로 바로 할당
    successMessage: (user) => `✅무료초대_선준`, // 메시지는 동적으로 생성
    variables: (user, formattedDate) => ({
      '#{고객명}': user.name,
      '#{파티명}': '게릴라 파티',
      '#{date}': formattedDate
    }),
    extraUpdate: {
      field: 'memo3',
      value: '✅장소문자'
    }
  },

  {
    code: '재환',
    template: 'KA01TP250709145734382Qm8j2DgohNp', // 남/여 공통 템플릿을 문자열로 바로 할당
    successMessage: (user) => `✅무료초대_재환`, // 메시지는 동적으로 생성
    variables: (user, formattedDate) => ({
      '#{고객명}': user.name,
      '#{파티명}': '게릴라 파티',
      '#{date}': formattedDate
    }),
    extraUpdate: {
      field: 'memo3',
      value: '✅장소문자'
    }
  },
  {
    code: '문토',
    template: 'KA01TP250709145734382Qm8j2DgohNp', // 남/여 공통 템플릿을 문자열로 바로 할당
    successMessage: (user) => `✅문토예약_${user.gender}`, // 메시지는 동적으로 생성
    variables: (user, formattedDate) => ({
      '#{고객명}': user.name,
      '#{파티명}': '게릴라 파티',
      '#{date}': formattedDate
    }),
    extraUpdate: {
      field: 'memo3',
      value: '☑️장소문자'
    }
  },
  // --- 시나리오 3: 특정 성별에게만 적용되는 쿠폰의 경우 ---
  {
    code: 'LADYFIRST',
    // 이 쿠폰은 여자가 입력했을 때만 유효하며, 아래 템플릿을 사용함
    target: '여자', // target을 명시하여 적용 대상을 제한
    template: 'LADY_ONLY_TEMPLATE_ID',
    successMessage: '✅레이디퍼스트_특별혜택',
    variables: (user, formattedDate) => ({ /* ... */ }),
  },
];

// --- 2. 기본 설정 (일치하는 쿠폰이 없을 때 사용) ---
const DEFAULT_CONFIG = {
  '남자': {
    template: 'KA01TP250717092857251yAnTUzfxJvp', // 유료 안내 (남자)
    successMessage: '✅입금안내_남',
    variables: (user, formattedDate) => ({
      '#{고객명}': user.name,
      '#{브랜드이름}': '게릴라 파티',
      '#{파티날짜}': formattedDate,
    }),
  },
  '여자': {
    template: 'KA01TP250707173844176ndkmNlwondi', // 유료 안내 (여자)
    successMessage: '✅입금안내_여',
    variables: (user, formattedDate) => ({
      '#{고객명}': user.name,
      '#{브랜드이름}': '게릴라 파티',
      '#{파티날짜}': formattedDate,
    }),
  },
  // '공통': {
  //   template: 'KA01TP250707173844176ndkmNlwondi', // 성별 없을 시 기본
  //   successMessage: '✅입금안내_공통',
  //   variables: (user, formattedDate) => ({
  //     '#{고객명}': user.name,
  //     '#{브랜드이름}': '게릴라 파티',
  //     '#{파티날짜}': formattedDate,
  //   }),
  // }
};

// ========================================================================
// ★★★★★ 여기부터가 추가/수정되어야 할 핵심 부분입니다 ★★★★★
// ========================================================================
/**
 * 사용자 정보에 따라 발송할 초기 안내(유료/무료) 설정을 반환합니다.
 * @param {object} user - 사용자 정보 객체
 * @returns {{template: string, variables: function, successMessage: string}} - 발송에 필요한 설정 객체
 */
function getInitialGuidanceConfig(user) {
  const userGender = user.gender || '공통';
  const userCouponCode = user.coupon ? user.coupon.trim().toUpperCase() : null;

  let configToSend, templateToSend, successMessageToSend;

  if (userCouponCode) {
    const foundCouponConfig = COUPON_CONFIG.find(coupon => coupon.code === userCouponCode && (!coupon.target || coupon.target === userGender));
    if (foundCouponConfig) {
      configToSend = foundCouponConfig;
    }
  }

  if (configToSend) {
    if (typeof configToSend.template === 'object') {
      templateToSend = configToSend.template[userGender] || configToSend.template['공통'];
    } else {
      templateToSend = configToSend.template;
    }
    if (typeof configToSend.successMessage === 'object') {
      successMessageToSend = configToSend.successMessage[userGender] || configToSend.successMessage['공통'];
    } else if (typeof configToSend.successMessage === 'function') {
      successMessageToSend = configToSend.successMessage(user);
    } else {
      successMessageToSend = configToSend.successMessage;
    }
    if (!templateToSend) {
      configToSend = null; 
    }
  }

  if (!configToSend) {
    const defaultConfig = DEFAULT_CONFIG[userGender] || DEFAULT_CONFIG['공통'];
    templateToSend = defaultConfig.template;
    successMessageToSend = defaultConfig.successMessage;
    configToSend = defaultConfig; 
  }
  
  return {
    template: templateToSend,
    variables: configToSend.variables,
    successMessage: successMessageToSend,
    extraUpdate: configToSend.extraUpdate || null 
  };
}

// --- 최종 모듈 내보내기 ---
module.exports = {
  supabase,
  corsHeaders,
  sendAlimtalk,
  formatKoreanDate,
  COUPON_CONFIG,
  DEFAULT_CONFIG,
  // ★★★ 새로 만든 함수를 반드시 여기서 내보내야 합니다 ★★★
  getInitialGuidanceConfig,
};