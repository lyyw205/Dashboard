// test-send.js (버전 2.1.0에 맞는 최종 코드)
require('dotenv').config();

// [중요] 버전 2.1.0에서는 SolapiMessageService를 직접 가져옵니다.
const SolapiMessageService = require('coolsms-node-sdk').default;

// ▼▼▼ 본인 정보로 수정하세요 ▼▼▼
const MY_PHONE_NUMBER = '01036886080';
const TEST_TEMPLATE_ID = 'KA01TP250705163644669ytqNtJ0gaZl';
const TEST_VARIABLES = { 
  '#{고객명}': '홍길동님',
  '#{파티명}': '여름맞이 특별 파티',
  '#{date}': '2024년 7월 12일'
};
// ▲▲▲ 여기까지 수정 ▲▲▲

async function testSendAlimtalk(phoneNumber, templateCode, variables) {
  console.log(`🚀 CoolSMS 단독 발송 테스트 시작...`);

  // [중요] SolapiMessageService를 직접 생성합니다.
  const messageService = new SolapiMessageService(
    process.env.COOLSMS_API_KEY,
    process.env.COOLSMS_API_SECRET
  );

  try {
    // [중요] messageService.sendOne()으로 바로 호출합니다.
    const response = await messageService.sendOne({
      to: phoneNumber,
      kakaoOptions: {
        pfId: process.env.COOLSMS_PFID,
        templateId: templateCode,
        variables: variables,
      },
    });
    console.log('✅ 테스트 발송 성공!', response);
    console.log('🎉 본인 휴대폰으로 알림톡이 왔는지 확인해보세요!');
  } catch (error) {
    console.error('❌ 테스트 발송 실패!', error);
  }
}

testSendAlimtalk(MY_PHONE_NUMBER, TEST_TEMPLATE_ID, TEST_VARIABLES);