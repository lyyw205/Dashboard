// 파일 상단
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const SolapiMessageService = require('coolsms-node-sdk').default;
// const axios = require('axios'); // 실제 알림톡 API 라이브러리

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function formatKoreanDate(isoDateString) {
  if (!isoDateString) {
    return '날짜 미정'; // 날짜 값이 없을 경우 대비
  }

  const date = new Date(isoDateString);
  
  // 날짜가 유효한지 확인
  if (isNaN(date.getTime())) {
      return isoDateString; // 유효하지 않으면 원래 문자열 반환
  }

  const month = date.getMonth() + 1; // getMonth()는 0부터 시작하므로 +1
  const day = date.getDate();

  return `${month}월 ${day}일`;
}

// 템플릿 ID 목록 (1번 파일의 ALIMTALK_CONFIG와 동일하게 맞춤)
const FREE_INVITE_TEMPLATE = 'KA01TP250709145734382Qm8j2DgohNp'; // 무료초대 -> 바로 장소문자 템플릿
const MALE_PAID_TEMPLATE = 'KA01TP250717092857251yAnTUzfxJvp'; // 입금안내(남)
const FEMALE_PAID_TEMPLATE = 'KA01TP250707173844176ndkmNlwondi'; // 입금안내(여)

// 무료 쿠폰 코드 목록 (1번 파일과 동일하게 대문자로 관리)
const MALE_FREE_COUPONS = ['WEINVITEYOU', '민수', '재환', '문토']; //
const FEMALE_FREE_COUPONS = ['WEINVITEYOU','민수', '재환', '문토'];

// --- 메시지 타입별 설정을 한 곳에서 관리 ---
const MESSAGE_CONFIG = {
  'resend_failed': {
    memoField: 'memo1',

    // 템플릿 ID를 동적으로 결정
    template: (user) => {
      const gender = user.gender || '공통';
      // 중요: 재전송 로직에서 사용하는 user 객체의 쿠폰 필드명이 'coupon'인지 'coupon_code'인지 확인하세요.
      // 여기서는 'coupon'으로 가정하고 작성합니다.
      const couponCode = user.coupon ? user.coupon.trim().toUpperCase() : null;

      if (gender === '남자') {
        if (couponCode && MALE_FREE_COUPONS.includes(couponCode)) {
          return FREE_INVITE_TEMPLATE;
        }
        return MALE_PAID_TEMPLATE;
      }
      
      if (gender === '여자') {
        if (couponCode && FEMALE_FREE_COUPONS.includes(couponCode)) {
          return FREE_INVITE_TEMPLATE;
        }
        return FEMALE_PAID_TEMPLATE;
      }

      // 성별 정보가 없는 경우 기본 유료 템플릿
      return FEMALE_PAID_TEMPLATE;
    },

    // 성공 메시지를 동적으로 결정
    successMessage: (user) => {
      const gender = user.gender || '공통';
      const couponCode = user.coupon ? user.coupon.trim().toUpperCase() : null;

      if (gender === '남자') {
        if (couponCode && MALE_FREE_COUPONS.includes(couponCode)) {
          return `✅무료초대_남_${couponCode}`; 
        }
        return '✅입금안내_남';
      }
      
      if (gender === '여자') {
        if (couponCode && FEMALE_FREE_COUPONS.includes(couponCode)) {
          return `✅무료초대_여_${couponCode}`;
        }
        return '✅입금안내_여';
      }

      return '✅입금안내_공통';
    },

    // 알림톡 변수(#{})를 동적으로 결정
    variables: (user) => {
      const gender = user.gender || '공통';
      const couponCode = user.coupon ? user.coupon.trim().toUpperCase() : null;
      const formattedApplyDate = formatKoreanDate(user.apply_date);

      const isMaleAndFree = (gender === '남자' && couponCode && MALE_FREE_COUPONS.includes(couponCode));
      const isFemaleAndFree = (gender === '여자' && couponCode && FEMALE_FREE_COUPONS.includes(couponCode));

      // 무료 초대 대상인 경우
      if (isMaleAndFree || isFemaleAndFree) {
        return {
          '#{고객명}': user.name,
          '#{파티명}': '게릴라 파티',
          '#{date}': formattedApplyDate
        };
      }
      
      // 유료 안내 대상인 경우
      return {
        '#{고객명}': user.name,
        '#{브랜드이름}': '게릴라 파티',
        '#{파티날짜}': formattedApplyDate
      };
    }
  },
  'location': {
    template: 'KA01TP250725103215185gMM09ZrdeDh',
    memoField: 'memo3',
    keyword: '장소문자',
    successMessage: '✅장소문자',
    failMessage: '❌장소문자', // 실패 메시지도 추가해주는 것이 좋습니다.
    // variables를 함수로 만들어서 user 객체를 인자로 받음
    variables: (user) => {
      // 함수 안에서 formatKoreanDate를 호출하여 날짜를 변환
      const formattedDate = formatKoreanDate(user.apply_date); 
      
      // 변환된 날짜를 포함한 객체를 반환
      return { 
        '#{고객명}': user.name, 
        '#{파티명}': '게릴라 파티', 
        '#{date}': formattedDate // CoolSMS 템플릿의 변수명과 일치시켜야 함
      };
    }
  },
  'reminder': {
    template: 'KA01TP250715052324608TTX6PYORFi3',
    memoField: 'memo3',
    keyword: '입금재촉',
    successMessage: '✅입금재촉',
    failMessage: '❌입금재촉',
    variables: (user) => ({})
  },
  'entrance': {
    template: 'KA01TP250728071222845K3Rr2ZMO4oq', // 1. CoolSMS에서 발급받은 실제 템플릿 ID
    memoField: 'memo3',                        // 2. 이 메시지의 상태를 기록할 DB 컬럼명 (예: memo4)
    keyword: '입장안내',
    successMessage: '✅입장안내(일반)',        // 3. 발송 성공 시 DB에 기록될 텍스트
    failMessage: '❌입장안내(일반)',          // 4. 발송 실패 시 DB에 기록될 텍스트
    variables: (user) => ({
      '#{브랜드명}': '게릴라 파티'
    })
  },
  'entrance2': {
    template: 'KA01TP250728073901156nzSLS3pWWVw', // 1. CoolSMS에서 발급받은 실제 템플릿 ID
    memoField: 'memo3',                        // 2. 이 메시지의 상태를 기록할 DB 컬럼명 (예: memo4)
    keyword: '입장안내',
    successMessage: '✅입장안내(초대)',        // 3. 발송 성공 시 DB에 기록될 텍스트
    failMessage: '❌입장안내(초대)',          // 4. 발송 실패 시 DB에 기록될 텍스트
    variables: (user) => ({
      '#{고객명}': user.name,
      '#{브랜드명}': '게릴라 파티'
    })
  },
  'review': {
    template: 'KA01TP250728091343537cMnl2OyYPsI',    // 1. 실제 템플릿 ID
    memoField: 'memo3',                       // 2. DB 컬럼명 (예: memo6)
    keyword: '후기',
    successMessage: '✅후기(일반/남)',     // 3. 성공 메시지
    failMessage: '❌후기(일반/남)',       // 4. 실패 메시지
    variables: (user) => ({})
  },
  'review1': {
    template: 'KA01TP2507260429579241AtnXD6QQIx',    // 1. 실제 템플릿 ID
    memoField: 'memo3',                       // 2. DB 컬럼명 (예: memo6)
    keyword: '후기',
    successMessage: '✅후기(일반/여)',     // 3. 성공 메시지
    failMessage: '❌후기(일반/여)',       // 4. 실패 메시지
    variables: (user) => ({})
  },
  'review2': {
    template: 'KA01TP250728070139799s2AwuVqSwYG',    // 1. 실제 템플릿 ID
    memoField: 'memo3',                       // 2. DB 컬럼명 (예: memo6)
    keyword: '후기',
    successMessage: '✅후기(문토)',     // 3. 성공 메시지
    failMessage: '❌후기(문토)',       // 4. 실패 메시지
    variables: (user) => ({})
  },
  'review3': {
    template: 'KA01TP250728074631591vikenhhLrRr',    // 1. 실제 템플릿 ID
    memoField: 'memo3',                       // 2. DB 컬럼명 (예: memo6)
    keyword: '후기',
    successMessage: '✅후기(무료초대)',     // 3. 성공 메시지
    failMessage: '❌후기(무료초대)',       // 4. 실패 메시지
    variables: (user) => ({})
  }  
};


// Netlify Function의 핸들러
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { type, ids } = JSON.parse(event.body);
    const config = MESSAGE_CONFIG[type];

    if (!config) {
      return { statusCode: 400, body: JSON.stringify({ error: `알 수 없는 메시지 타입입니다: ${type}` }) };
    }

    let users; // 발송 대상 사용자 목록을 담을 변수
    let dbError; // DB 조회 에러를 담을 변수

    // ===================================================================
    // ★★★★★ 로직 분기: 'resend_failed' 타입과 나머지 타입 처리 분리 ★★★★★
    // ===================================================================
    if (type === 'resend_failed') {
      console.log("▶️ 'resend_failed' 타입 특별 처리 시작");
      // 'resend_failed'는 memo1 필드에서 '발송실패' 상태인 것만 찾습니다.
      const { data, error } = await supabase
        .from('responses')
        .select('*')
        .in('id', ids)
        .or('memo1.like.%❌%,memo1.like.%발송실패%'); // 실패 키워드가 포함된 경우
      
      users = data;
      dbError = error;

    } else { // ★ else 블록으로 나머지 로직을 감싸줍니다.
      console.log(`▶️ '${type}' 타입 일반 처리 시작 (키워드 기반)`);
      
      const memoFieldToCheck = config.memoField;
      const keywordToCheck = config.keyword;

      if (!keywordToCheck) {
        throw new Error(`'${type}' 메시지 타입에 'keyword' 설정이 없습니다. 'resend_failed'가 아닌 타입은 keyword가 필수입니다.`);
      }

      const { data, error } = await supabase
        .from('responses')
        .select('*')
        .in('id', ids)
        .or(
          // 1. 키워드가 포함되어 있지 않거나
          `${memoFieldToCheck}.not.like.%${keywordToCheck}%,` + 
          // 2. 실패 키워드가 포함되어 있거나
          `${memoFieldToCheck}.like.%❌${keywordToCheck}%,` +
          // 3. 또는 필드 값이 아예 NULL인 경우 (가장 중요!)
          `${memoFieldToCheck}.is.null` 
        );

      users = data;
      dbError = error;
    }

    if (dbError) throw new Error(`DB 조회 실패: ${dbError.message}`);
    if (!users || users.length === 0) {
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: '조건에 맞는 발송 대상이 없습니다.' }) };
    }

    let successCount = 0;
    const sendPromises = users.map(async (user) => {
      if (!user.phone || user.phone.trim() === '') {
        console.error(`Skipping user ${user.name} (ID: ${user.id}) - Missing phone number.`);
        return;
      }
      const templateCode = typeof config.template === 'function' ? config.template(user) : config.template;
      const variables = config.variables(user);
      const successMsg = typeof config.successMessage === 'function' ? config.successMessage(user) : config.successMessage;
      const failMsg = config.failMessage || `❌${type}`; // failMessage가 없으면 기본값 사용
      
      const isSentSuccessfully = await sendAlimtalk(user, templateCode, variables); 
      
      // DB 업데이트 로직 분기
      if (type === 'resend_failed') {
        const messageToUpdate = isSentSuccessfully ? successMsg : failMsg;
        await supabase.from('responses')
          .update({ [config.memoField]: messageToUpdate })
          .eq('id', user.id);
      } else {
        const messageToAppend = isSentSuccessfully ? successMsg : failMsg;
        const existingMemo = user[config.memoField] || '';
        const newMemo = existingMemo ? `${existingMemo} ${messageToAppend}` : messageToAppend;
        await supabase.from('responses')
          .update({ [config.memoField]: newMemo })
          .eq('id', user.id);
      }

      // ★★★★★ 2. successCount++ 위치 수정 ★★★★★
      // 성공 카운트는 타입에 관계없이 집계되어야 하므로 if/else 바깥으로 이동
      if (isSentSuccessfully) {
        successCount++;
      }
    });

    await Promise.all(sendPromises);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: `요청 처리 완료: 총 ${users.length}건 중 ${successCount}건에 대해 발송 성공했습니다.` }),
    };

  } catch (error) {
    console.error('💥 서버리스 함수 처리 중 오류:', error);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
  }
};


// (참고) sendAlimtalk 함수는 아래와 같이 성공/실패를 반환하도록 구현하는 것이 좋습니다.
async function sendAlimtalk(user, templateCode, variables) {
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

  console.log(`[REQUEST] 🚀 CoolSMS 요청 페이로드:`, JSON.stringify(payload, null, 2));

  try {
    const response = await messageService.sendOne(payload);
    
    console.log(`[RESPONSE] ✅ CoolSMS API 응답 수신:`, JSON.stringify(response, null, 2));

    // statusCode가 '2000'일 때만 명백한 성공으로 간주합니다.
    if (response.statusCode === '2000') {
      return true;
    } else {
      console.error(`[FAILURE] 👎 CoolSMS 발송 실패: ${response.statusMessage} (Code: ${response.statusCode})`);
      return false;
    }
  } catch (error) {
    console.error(`[ERROR] ❌ CoolSMS API 통신 중 심각한 오류 발생:`, error);
    return false;
  }
}