// 파일 상단
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
// 여기에 알림톡 발송 라이브러리 추가 (예: const axios = require('axios');)

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// --- 알림톡 발송 함수 정의 ---

// 1. 무료 초대자용 알림톡 발송 함수
async function sendFreeInviteAlimtalk(user) {
  console.log(`🚀 [무료 초대] 알림톡 발송 시도: ${user.name} (${user.phone})`);
  // TODO: 실제 알림톡 API 호출 로직을 여기에 구현합니다.
  // 예시:
  // const templateCode = 'FREE_INVITE_TEMPLATE';
  // await alimtalkApi.send(user.phone, templateCode, { 고객명: user.name });
  console.log(`✅ [무료 초대] 알림톡 발송 요청 완료: ${user.name}`);
}

// 2. 유료 결제 안내 알림톡 발송 함수
async function sendPaymentInfoAlimtalk(user) {
  console.log(`🚀 [유료 안내] 알림톡 발송 시도: ${user.name} (${user.phone})`);
  // TODO: 실제 알림톡 API 호출 로직을 여기에 구현합니다.
  // 예시:
  // const templateCode = 'PAYMENT_INFO_TEMPLATE';
  // await alimtalkApi.send(user.phone, templateCode, { 고객명: user.name });
  console.log(`✅ [유료 안내] 알림톡 발송 요청 완료: ${user.name}`);
}

// --- DB 업데이트 함수 ---

// 처리 완료 후, 중복 발송을 막기 위해 memo1 필드를 업데이트하는 함수
async function markAsSent(id, status) {
  const { error } = await supabase
    .from('responses')
    .update({ memo1: status }) // '무료' 또는 '유료' 상태를 기록
    .eq('id', id);

  if (error) {
    console.error(`❌ memo1 업데이트 실패 (id=${id}):`, error.message);
  } else {
    console.log(`📝 memo1 업데이트 완료 (id=${id}, status=${status})`);
  }
}

// --- Supabase 실시간 이벤트 리스너 (핵심 로직) ---

console.log('📡 폼 제출 감시 시작...');

supabase
  .channel('realtime-responses-channel')
  .on(
    'postgres_changes',
    {
      event: 'INSERT', // 'INSERT' 이벤트만 감지
      schema: 'public',
      table: 'responses',
    },
    async (payload) => {
      // payload.new 에 방금 삽입된 데이터 전체가 들어있습니다.
      const newUser = payload.new;
      console.log('📥 새 제출 감지됨:', newUser);

      // --- 예외 처리: 전화번호가 없거나, 이미 처리된 경우(memo1이 있는 경우) 건너뛰기 ---
      if (!newUser.phone) {
        console.warn(`⚠️ 전화번호가 없어 건너뜁니다 (id=${newUser.id})`);
        return;
      }
      if (newUser.memo1) {
        console.warn(`⚠️ 이미 처리된 제출이라 건너뜁니다 (id=${newUser.id}, memo1=${newUser.memo1})`);
        return;
      }


      // --- 분기 로직: 쿠폰 코드 값에 따라 다른 함수 호출 ---
      try {
        // 여기에 실제 사용하는 쿠폰 코드를 입력하세요.
        const VVIP_COUPON_CODE = 'FREEPARTY24'; 

        if (newUser.coupon_code === VVIP_COUPON_CODE) {
          // 쿠폰 코드가 일치하는 경우 (무료 초대자)
          await sendFreeInviteAlimtalk(newUser);
          await markAsSent(newUser.id, '✅무료초대_발송완료');

        } else {
          // 쿠폰 코드가 없거나 틀린 경우 (유료 신청자)
          await sendPaymentInfoAlimtalk(newUser);
          await markAsSent(newUser.id, '✅유료안내_발송완료');
        }
      } catch (error) {
        console.error('❌ 알림톡 발송 또는 처리 중 오류 발생:', error);
        // 에러 발생 시 memo1에 에러 기록 (선택사항)
        await markAsSent(newUser.id, '❌발송실패');
      }
    }
  )
  .subscribe();