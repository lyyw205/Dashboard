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

// --- 메시지 타입별 설정을 한 곳에서 관리 ---
const MESSAGE_CONFIG = {
  'resend_failed': {
    template: (user) => user.coupon_code === 'FREEPARTY24' ? 'FREE_INVITE_TEMPLATE_V1' : 'PAYMENT_INFO_TEMPLATE',
    memoField: 'memo1',
    successMessage: (user) => user.coupon_code === 'FREEPARTY24' ? '✅무료초대_재발송완료' : '✅유료안내_재발송완료',
    variables: (user) => ({ '고객명': user.name })
  },
  'location': {
    template: 'KA01TP250705163644669ytqNtJ0gaZl',
    memoField: 'memo3',
    successMessage: '✅확정문자',
    failMessage: '❌확정문자_실패', // 실패 메시지도 추가해주는 것이 좋습니다.
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
    template: 'PARTICIPATION_REMINDER_TEMPLATE',
    memoField: 'memo5',
    successMessage: '✅특수문자_발송완료',
    variables: (user) => ({ '고객명': user.name, '날짜': '내일 저녁 7시' })
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

    // --- ★★★★★ 핵심 변경점: 쿼리 로직 통합 ★★★★★ ---
    const memoFieldToCheck = config.memoField;
    const failMessage = config.failMessage || `❌${type}_발송실패`; // 각 타입에 맞는 실패 메시지 생성 (예: '❌location_발송실패')

    // 모든 타입에 대해 "실패했거나, 비어있는 경우"를 찾는 조건으로 통일
    let query = supabase.from('responses')
      .select('*')
      .in('id', ids)
      .or(`${memoFieldToCheck}.eq.${failMessage},${memoFieldToCheck}.is.null,${memoFieldToCheck}.eq.`);
    // --- ★★★★★ 여기까지가 핵심 변경점입니다 ★★★★★ ---

    const { data: users, error: dbError } = await query;

    if (dbError) throw new Error(`DB 조회 실패: ${dbError.message}`);
    if (!users || users.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ message: '조건에 맞는 발송 대상이 없습니다. (이미 발송되었거나, 실패 상태가 아닐 수 있습니다)' }) };
    }

    // --- ★★★★★ 핵심 변경점: 발송 및 후처리 로직 수정 ★★★★★ ---
    let successCount = 0;
    const sendPromises = users.map(async (user) => {
      if (!user.phone || user.phone.trim() === '') {
        console.error(`Skipping user ${user.name} (ID: ${user.id}) - Missing phone number.`);
        return; // 현재 user에 대한 작업만 건너뛰고 다음으로 넘어갑니다.
      }
      const templateCode = typeof config.template === 'function' ? config.template(user) : config.template;
      const variables = config.variables(user);
      const successMsg = typeof config.successMessage === 'function' ? config.successMessage(user) : config.successMessage;

      // TODO: 여기에 실제 알림톡 발송 API 호출 로직을 넣으세요.
      // 이 함수는 성공 시 true, 실패 시 false를 반환해야 합니다.
      const isSentSuccessfully = await sendAlimtalk(user, templateCode, variables); 
      
      if (isSentSuccessfully) {
        successCount++;
        // 발송 성공 시: 성공 메시지로 덮어쓰기
        await supabase.from('responses').update({ [config.memoField]: successMsg }).eq('id', user.id);
      } else {
        // 발송 실패 시: 실패 메시지로 덮어쓰기
        await supabase.from('responses').update({ [config.memoField]: failMessage }).eq('id', user.id);
      }
    });
    // --- ★★★★★ 여기까지가 핵심 변경점입니다 ★★★★★ ---

    await Promise.all(sendPromises);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: `요청 처리 완료: 총 ${users.length}건 중 ${successCount}건에 대해 발송 성공했습니다.` }),
    };

  } catch (error) {
    console.error('💥 서버리스 함수 처리 중 오류:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
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