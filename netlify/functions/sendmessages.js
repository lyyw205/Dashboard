
// 1. _config.js에서 필요한 모든 것을 가져옵니다.
const { supabase, sendAlimtalk, COUPON_CONFIG, DEFAULT_CONFIG, formatKoreanDate, getInitialGuidanceConfig } = require('./modules/_config.js');

// 2. 이 파일에서만 사용하는 함수는 여기에 남겨둡니다.
/**
 * 'responses' 테이블의 memo1 필드를 업데이트합니다.
 * @param {string} id - 업데이트할 레코드의 ID
 * @param {string} status - 기록할 상태 메시지
 */
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

// 3. 메인 핸들러 로직은 그대로 유지하되, 함수와 설정을 외부에서 가져와 사용합니다.
exports.handler = async (event) => {
  console.log('▶️ 알림톡 자동 발송 함수 진입 (HTTP', event.httpMethod, ')');
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let recordId; // 에러 핸들링을 위해 try 블록 외부에서 선언

  try {
    const payload = JSON.parse(event.body);
    console.log('📥 Supabase Webhook 페이로드 수신:', payload);

    // ★★★ record.id를 안전하게 추출합니다.
    recordId = payload?.record?.id;
    if (!recordId) {
      console.warn('⚠️ 페이로드에 record.id가 없어 처리를 중단합니다.');
      return { statusCode: 200, body: 'Skipped: No record ID in payload.' };
    }
    
    // DB에서 최신 데이터 조회
    const { data: newUser, error: fetchError } = await supabase
      .from('responses')
      .select('*')
      .eq('id', recordId)
      .single();

    if (fetchError || !newUser) {
      throw new Error(`DB에서 ID ${recordId} 조회 실패: ${fetchError?.message || 'User not found'}`);
    }
    console.log('✅ 전체 데이터 조회 성공:', newUser);

    // 유효성 검사
    if (!newUser.phone) {
      console.warn('⚠️ 전화번호가 없어 건너뜁니다.');
      await markAsSent(newUser.id, '❌발송실패(번호없음)'); // 실패 사유 기록
      return { statusCode: 200, body: 'No phone number, skipped.' };
    }
    if (newUser.memo1 && newUser.memo1 !== '처리 대기중') {
      console.warn(`⚠️ 이미 처리된 제출이라 건너뜁니다 (id=${newUser.id}, memo1=${newUser.memo1})`);
      return { statusCode: 200, body: 'Already processed, skipped.' };
    }

    // 알림톡 발송 분기 처리
    const config = getInitialGuidanceConfig(newUser);
    
    const formattedApplyDate = formatKoreanDate(newUser.apply_date);
    
    // 4. 알림톡 발송
    const isSent = await sendAlimtalk(
      newUser,
      config.template,
      config.variables(newUser, formattedApplyDate)
    );

    const statusMessage = isSent ? config.successMessage : '❌발송실패';
    await markAsSent(newUser.id, statusMessage);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Alimtalk process finished successfully.' }),
    };

  } catch (error) {
    console.error('❌ 알림톡 자동 발송 함수 전체 실행 중 에러:', error);
    // 에러 발생 시 ID가 존재하면 실패 기록
    if (recordId) {
        await markAsSent(recordId, '❌발송실패(시스템오류)');
    }
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};