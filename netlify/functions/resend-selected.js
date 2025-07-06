// 이 파일은 netlify/functions/resend-selected.js 입니다.

const { createClient } = require('@supabase/supabase-js');
// 여기에 실제 알림톡 발송에 필요한 라이브러리들을 가져오세요.
// 예: const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- 실제 알림톡 발송 함수들 (이 부분을 실제 로직으로 채워주세요) ---
async function sendFreeInviteAlimtalk(user) {
  console.log(`🚀 [무료/재발송] 알림톡 발송 시도: ${user.name} (${user.phone})`);
  // TODO: 실제 무료 초대 알림톡 API 호출 로직 구현
  // 예: await axios.post(...)
}

async function sendPaymentInfoAlimtalk(user) {
  console.log(`🚀 [유료/재발송] 알림톡 발송 시도: ${user.name} (${user.phone})`);
  // TODO: 실제 유료 안내 알림톡 API 호출 로직 구현
  // 예: await axios.post(...)
}

async function markAsSent(id, status) {
  const { error } = await supabase.from('responses').update({ memo1: status }).eq('id', id);
  if (error) {
    console.error(`❌ memo1 업데이트 실패 (id=${id}):`, error.message);
  } else {
    console.log(`📝 memo1 업데이트 완료 (id=${id}, status=${status})`);
  }
}

// Netlify Function의 핸들러
exports.handler = async function(event) {
  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // 1. 요청 본문(body)에서 ID 목록 추출
    const { ids } = JSON.parse(event.body);

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return { statusCode: 400, body: '재발송할 ID 목록이 없습니다.' };
    }

    console.log(`🚀 선택 재발송 프로세스 시작. 요청 ID: ${ids.join(', ')}`);

    // 2. 전달받은 ID에 해당하는 최신 데이터만 DB에서 조회
    const { data: targets, error } = await supabase
      .from('responses')
      .select('*')
      .in('id', ids);

    if (error) {
      throw new Error(`DB 조회 실패: ${error.message}`);
    }

    let successCount = 0;
    let skippedCount = 0; // 건너뛴 항목 수를 세기 위한 변수 추가

    // 3. 각 대상에 대해 재발송 로직 실행
    for (const user of targets) {
      // ▼▼▼▼▼▼▼▼▼▼ 여기가 핵심 변경사항입니다 ▼▼▼▼▼▼▼▼▼▼
      // DB에서 가져온 최신 memo1 상태를 확인합니다.
      // '발송실패' 상태이거나, 관리자가 강제 재발송을 위해 memo1을 비워둔 경우를 모두 처리합니다.
      if (user.memo1 === '❌발송실패' || user.memo1 === null || user.memo1 === '') {
        // 재발송 대상이 맞으면, 발송 로직 실행
        try {
          // 실제 사용하는 쿠폰 코드를 여기에 입력하세요.
          const VVIP_COUPON_CODE = 'FREEPARTY24'; 
          
          if (user.coupon_code === VVIP_COUPON_CODE) {
            await sendFreeInviteAlimtalk(user);
            await markAsSent(user.id, '✅무료초대_재발송완료');
          } else {
            await sendPaymentInfoAlimtalk(user);
            await markAsSent(user.id, '✅유료안내_재발송완료');
          }
          successCount++;
        } catch (e) {
          console.error(`❌ ID ${user.id} 재발송 중 개별 실패:`, e);
          // 개별 발송 실패 시에는 '발송실패' 상태를 유지하기 위해 아무것도 하지 않음
        }
      } else {
        // 재발송 대상이 아닌 경우 (이미 성공했거나 다른 상태)
        console.log(`🟡 ID ${user.id} 건너뛰기: 현재 상태(${user.memo1})가 재발송 대상이 아님`);
        skippedCount++;
      }
      // ▲▲▲▲▲▲▲▲▲▲ 여기까지가 핵심 변경사항입니다 ▲▲▲▲▲▲▲▲▲▲
    }

    // 4. 최종 결과 메시지 생성
    const resultMessage = `재발송 처리 완료: 총 요청 ${ids.length}건 | 성공 ${successCount}건 | 건너뜀 ${skippedCount}건`;
    console.log(resultMessage);
    return { statusCode: 200, body: resultMessage };

  } catch (e) {
    console.error('❌ 선택 재발송 프로세스 전체 오류:', e);
    return { statusCode: 500, body: `서버 오류가 발생했습니다: ${e.message}` };
  }
};