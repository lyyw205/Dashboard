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

// --- Supabase 실시간 이벤트 리스너 (핵심 로직) ---
console.log('📡 폼 제출 감시 시작...');
supabase
  .channel('realtime-responses-channel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'responses' },
    async (payload) => {
      const newUser = payload.new;
      console.log('📥 새 제출 감지됨:', newUser);

      if (!newUser.phone) {
        console.warn(`⚠️ 전화번호가 없어 건너뜁니다 (id=${newUser.id})`);
        return;
      }
      if (newUser.memo1) {
        console.warn(`⚠️ 이미 처리된 제출이라 건너뜁니다 (id=${newUser.id}, memo1=${newUser.memo1})`);
        return;
      }

      try {
        const userCouponCode = newUser.coupon_code;
        const matchedConfig = COUPON_CONFIG[userCouponCode];

        if (matchedConfig) {
          console.log(`✨ 쿠폰 코드 "${userCouponCode}"에 대한 설정을 찾았습니다.`);
          await sendAlimtalk(
            newUser,
            matchedConfig.template,
            matchedConfig.variables(newUser)
          );
          await markAsSent(newUser.id, matchedConfig.successMessage);
        } else {
          console.log(`🎫 유효한 쿠폰 코드가 없어 유료 안내를 발송합니다.`);
          
          // [수정할 부분] 이 객체(Object)가 알림톡에 들어갈 변수입니다.
          await sendAlimtalk(
            newUser, 
            'KA01TP250705163644669ytqNtJ0gaZl', // 유료 안내 템플릿 ID
            { 
              '#{고객명}': newUser.name,
              '#{파티명}': '스타벅스 쿠폰',
              '#{date}': '7월 12일'
            }
          );

          await markAsSent(newUser.id, '✅유료안내_발송완료');
        }
      } catch (error) {
        console.error('❌ 알림톡 발송 또는 처리 중 오류 발생:', error.message);
        await markAsSent(newUser.id, '❌발송실패');
      }
    }
  )
  .subscribe();