// 1. 필요한 모듈을 가져옵니다.
const { supabase } = require('./modules/_config.js');
const SolapiMessageService = require('coolsms-node-sdk').default; // Coolsms SDK를 가져옵니다.

// 2. 관리자에게 '문자'를 보내는 함수입니다.
/**
 * Coolsms를 통해 관리자에게 문자(SMS) 알림을 보냅니다.
 * @param {object} failureInfo - 실패 정보 객체
 */
async function sendAdminSms(failureInfo) {
  const { userName, recipient, reason } = failureInfo;
  const adminPhone = process.env.ADMIN_PHONE; // .env 파일에서 관리자 번호를 가져옵니다.
  const senderPhone = process.env.COOLSMS_SENDER_PHONE; // .env 파일에서 발신번호를 가져옵니다.
  
  if (!adminPhone || !senderPhone) {
    console.error('❌ 문자 발송 실패: .env 파일에 ADMIN_PHONE 또는 COOLSMS_SENDER_PHONE이 설정되지 않았습니다.');
    return;
  }

  // Coolsms 클라이언트 초기화
  const messageService = new SolapiMessageService(
    process.env.COOLSMS_API_KEY,
    process.env.COOLSMS_API_SECRET
  );

  // 전송할 메시지 내용 생성
  const text = `[알림톡 실패]
- 대상: ${userName} (${recipient})
- 사유: ${reason}`;

  try {
    const response = await messageService.sendOne({
      to: adminPhone,
      from: senderPhone,
      text: text,
    });

    if (response.statusCode === '2000') {
      console.log(`📲 관리자(${adminPhone})에게 실패 알림 문자 발송 완료.`);
    } else {
      console.error('❌ Coolsms 문자 발송 응답 에러:', response);
    }
  } catch (error) {
    console.error('❌ Coolsms 문자 발송 중 에러:', error);
  }
}

// 3. Coolsms 웹훅을 처리하는 메인 핸들러입니다.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const results = JSON.parse(event.body);
    console.log('📥 Coolsms Webhook 페이로드 수신:', JSON.stringify(results, null, 2));

    for (const result of results) {
      if (result.statusCode === '3000') continue; // 성공 건은 무시

      const recordId = result?.customFields?.recordId;
      const userName = result?.customFields?.userName || '이름없음';

      // ★★★★★ 관리자에게 '문자' 발송 함수를 호출합니다. ★★★★★
      await sendAdminSms({
        userName: userName,
        recipient: result.to,
        reason: result.statusMessage,
      });
      
      // DB 업데이트 로직 (이전과 동일)
      if (recordId) {
        const { error } = await supabase
          .from('responses')
          .update({ memo1: `❌발송실패(${result.statusMessage})` })
          .eq('id', recordId);
        if (error) {
          console.error(`❌ DB 업데이트 실패 (id=${recordId}):`, error.message);
        } else {
          console.log(`📝 DB 업데이트 완료 (id=${recordId})`);
        }
      }
    }
    return { statusCode: 200, body: 'Webhook processed.' };
  } catch (error) {
    console.error('❌ Coolsms 웹훅 처리 중 에러:', error);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};