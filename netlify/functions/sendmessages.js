// 파일 상단
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const SolapiMessageService = require('coolsms-node-sdk').default;

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// --- 알림톡 발송 함수 정의 (CoolSMS SDK 버전) ---
async function sendAlimtalk(user, templateCode, variables) {
  console.log(`🚀 CoolSMS 알림톡 발송 시도: ${user.name}(${user.phone}), 템플릿: ${templateCode}`);

  const messageService = new SolapiMessageService(
    process.env.COOLSMS_API_KEY,
    process.env.COOLSMS_API_SECRET
  );

  try {
    const response = await messageService.sendOne({
      to: user.phone.replace(/-/g, ''), // 하이픈(-) 제거
      kakaoOptions: {
        pfId: process.env.COOLSMS_PFID,
        templateId: templateCode,
        variables: variables,
      },
    });
    console.log(`✅ CoolSMS 알림톡 API 요청 성공: ${user.name}`, response);
  } catch (error) {
    console.error(`❌ CoolSMS 알림톡 API 요청 실패: ${user.name}`, error);
    throw new Error('CoolSMS Alimtalk API request failed');
  }
}

// --- DB 업데이트 함수 ---
async function markAsSent(id, status) {
  const { error } = await supabase
    .from('responses')
    .update({ memo1: status })
    .eq('id', id);

  if (error) {
    console.error(`❌ memo1 업데이트 실패 (id=${id}):`, error.message);
  } else {
    console.log(`📝 memo1 업데이트 완료 (id=${id}, status=${status})`);
  }
}

// ========================================================================
// ★★★★★ 핵심 개선점: 쿠폰 코드 설정 맵 ★★★★★
// ========================================================================
const COUPON_CONFIG = {
  'FREEPARTY24': {
    template: 'KA01TP250705163644669ytqNtJ0gaZl',
    successMessage: '✅무료초대(파티)_발송완료',
    variables: (user) => ({ 
      '#{고객명}': user.name 
    }),
  },
  'SPECIALGIFT25': {
    template: 'KA01TP250705163644669ytqNtJ0gaZl',
    successMessage: '✅특별선물안내_발송완료',
    variables: (user) => ({
      '#{고객명}': user.name,
      '#{선물명}': '스타벅스 쿠폰'
    }),
  },
  'EARLYBIRD10': {
    template: 'KA01TP250705163644669ytqNtJ0gaZl',
    successMessage: '✅얼리버드할인_발송완료',
    variables: (user) => ({
      '#{고객명}': user.name,
      '#{할인율}': '10%'
    }),
  },
};

// --- 4. Netlify Function의 메인 핸들러 (모든 로직의 시작점) ---
exports.handler = async (event) => {
  // Supabase Webhook은 POST 요청으로만 데이터를 보냅니다.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // --- (A) Supabase Webhook이 보낸 데이터 파싱 ---
    const payload = JSON.parse(event.body);
    console.log('📥 Supabase Webhook 페이로드 수신:', payload);

    // Supabase Webhook은 payload.record에 새로 INSERT된 데이터를 담아 보냅니다.
    const newUser = payload.record;

    // --- (B) 유효성 검사 ---
    if (!newUser || !newUser.phone) {
      console.warn('⚠️ 전화번호가 없거나 유효하지 않은 데이터라 건너뜁니다.');
      return { statusCode: 200, body: 'No phone number, skipped.' };
    }
    // Webhook은 항상 새로 생성된 데이터에 대해서만 호출되므로,
    // memo1 필드를 굳이 검사할 필요는 없지만 안전을 위해 남겨둘 수 있습니다.
    if (newUser.memo1 && newUser.memo1 !== '처리 대기중') { // '처리 대기중' 상태는 무시
      console.warn(`⚠️ 이미 처리된 제출이라 건너뜁니다 (id=${newUser.id}, memo1=${newUser.memo1})`);
      return { statusCode: 200, body: 'Already processed, skipped.' };
    }


    // --- (C) 알림톡 발송 분기 처리 (기존 핵심 로직) ---
    const userCouponCode = newUser.coupon_code;
    const matchedConfig = COUPON_CONFIG[userCouponCode];

    if (matchedConfig) {
      // 쿠폰 코드가 있는 경우
      console.log(`✨ 쿠폰 코드 "${userCouponCode}"에 대한 설정을 찾았습니다.`);
      await sendAlimtalk(
        newUser,
        matchedConfig.template,
        matchedConfig.variables(newUser)
      );
      await markAsSent(newUser.id, matchedConfig.successMessage);
    } else {
      // 쿠폰 코드가 없는 경우 (기본: 유료 안내)
      console.log(`🎫 유효한 쿠폰 코드가 없어 유료 안내를 발송합니다.`);
      await sendAlimtalk(
        newUser, 
        'KA01TP250705163644669ytqNtJ0gaZl', // 유료 안내 템플릿 ID (실제 ID로 변경)
        { 
          '#{고객명}': newUser.name,
          '#{파티명}': '스타벅스 쿠폰',
          '#{date}': '7월 12일'
        }
      );
      await markAsSent(newUser.id, '✅유료안내_발송완료');
    }

    // --- (D) 모든 작업 완료 후 성공 응답 ---
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Alimtalk process finished successfully.' }),
    };

  } catch (error) {
    console.error('❌ 알림톡 함수 전체 실행 중 에러:', error);
    // 에러 발생 시 memo1에 실패 기록 (선택 사항)
    try {
        const payload = JSON.parse(event.body);
        if (payload && payload.record && payload.record.id) {
            await markAsSent(payload.record.id, '❌발송실패');
        }
    } catch (e) {
        // body 파싱 실패 시 무시
    }
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};