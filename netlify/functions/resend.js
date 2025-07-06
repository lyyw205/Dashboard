// 이 파일은 netlify/functions/resend.js 입니다.

const { createClient } = require('@supabase/supabase-js');
// 알림톡 발송에 필요한 라이브러리와 함수들을 여기에 가져와야 합니다.
// 예: const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- 실제 알림톡 발송 함수들 ---
// 기존 Node.js 파일에 있던 함수들을 여기에 복사해오거나,
// 별도 모듈로 분리하여 require로 가져와야 합니다.
async function sendFreeInviteAlimtalk(user) {
  console.log(`🚀 [재발송/무료] 알림톡 발송 시도: ${user.name}`);
  // TODO: 실제 무료 초대 알림톡 API 호출 로직
}
async function sendPaymentInfoAlimtalk(user) {
  console.log(`🚀 [재발송/유료] 알림톡 발송 시도: ${user.name}`);
  // TODO: 실제 유료 안내 알림톡 API 호출 로직
}
async function markAsSent(id, status) {
  const { error } = await supabase.from('responses').update({ memo1: status }).eq('id', id);
  if (error) console.error(`❌ memo1 업데이트 실패 (id=${id}):`, error.message);
  else console.log(`📝 memo1 업데이트 완료 (id=${id})`);
}

// Netlify Function의 핸들러
exports.handler = async function(event) {
  // 간단한 보안 장치: GET 요청만 허용
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    console.log('🚀 재발송 프로세스 시작...');
    
    // 1. 재발송 대상 조회 ('❌발송실패' 상태인 사람)
    const { data: targets, error } = await supabase
      .from('responses')
      .select('*')
      .eq('memo1', '❌발송실패');

    if (error) throw new Error(`DB 조회 실패: ${error.message}`);
    
    const targetCount = targets.length;
    if (targetCount === 0) {
      return { statusCode: 200, body: '재발송 대상이 없습니다.' };
    }

    console.log(`🔍 재발송 대상 ${targetCount}명 발견.`);
    let successCount = 0;

    // 2. 각 대상에 대해 재발송 로직 실행
    for (const user of targets) {
      try {
        const VVIP_COUPON_CODE = 'FREEPARTY24'; // 실제 쿠폰 코드로 변경
        
        if (user.coupon_code === VVIP_COUPON_CODE) {
          await sendFreeInviteAlimtalk(user);
          await markAsSent(user.id, '✅무료초대_재발송');
        } else {
          await sendPaymentInfoAlimtalk(user);
          await markAsSent(user.id, '✅유료안내_재발송');
        }
        successCount++;
      } catch (e) {
        console.error(`❌ ID ${user.id} 재발송 개별 실패:`, e);
      }
    }

    const resultMessage = `재발송 처리 완료: 총 ${targetCount}건 중 ${successCount}건 성공`;
    console.log(resultMessage);
    return { statusCode: 200, body: resultMessage };

  } catch (e) {
    console.error('❌ 재발송 프로세스 전체 오류:', e);
    return { statusCode: 500, body: '서버 오류가 발생하여 재발송에 실패했습니다.' };
  }
};