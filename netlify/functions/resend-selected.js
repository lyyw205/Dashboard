// 1. _config.js에서 공통 기능만 가져옵니다.
const { supabase, sendAlimtalk, corsHeaders } = require('./modules/_config.js');

const modules = {
  entrance: require('./modules/entrance.js'),
  location: require('./modules/location.js'),
  reminder: require('./modules/reminder.js'),
  'resend-failed': require('./modules/resend-failed.js'),
  review: require('./modules/review.js'),
};

exports.handler = async (event) => {
  // CORS Preflight 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }
  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
    const { type, ids } = requestBody;

    // 필수 파라미터 검사
    if (!type || !ids || !Array.isArray(ids) || ids.length === 0) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: '요청 형식이 잘못되었습니다. type(string)과 ids(array)는 필수입니다.' }) };
    }

    // ★★★ 핵심 로직 ★★★
    // 2. type 이름과 동일한 모듈 파일을 동적으로 불러옵니다.
    const messageModule = modules[type];\
    
    if (!messageModule) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: `정의되지 않은 메시지 타입입니다: '${type}'` }),
      };
    }

    // 3. 각 모듈에 정의된 'getUsers' 함수를 호출하여 발송 대상을 필터링합니다.
    const { users, error } = await messageModule.getUsers(supabase, ids);

    if (error) {
      throw new Error(`[${type}] DB 조회 중 오류 발생: ${error.message}`);
    }
    if (!users || users.length === 0) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: '조건에 맞는 발송 대상이 없습니다.' })
      };
    }

    let successCount = 0;
    const sendPromises = users.map(async (user) => {
      try {
        if (!user.phone) {
          console.warn(`[${type}] User ID ${user.id} 건너뛰기 (전화번호 없음)`);
          return;
        }

        // 4. 각 모듈에서 메시지 내용(템플릿, 변수)을 생성합니다.
        const templateCode = messageModule.getTemplateId(user);
        const variables = messageModule.getVariables(user);

        // 5. 공통 발송 함수를 사용해 알림톡을 보냅니다.
        const isSent = await sendAlimtalk(user, templateCode, variables);

        // 6. 각 모듈에 정의된 방식으로 DB 상태를 업데이트합니다.
        await messageModule.updateStatus(supabase, user, isSent);
        
        if (isSent) {
          successCount++;
        }
      } catch (e) {
        // 개별 사용자 처리 중 오류가 발생해도 전체 프로세스는 중단되지 않도록 합니다.
        console.error(`[${type}] User ID ${user.id} 처리 중 개별 오류 발생:`, e);
      }
    });

    await Promise.all(sendPromises);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: `[${type}] 요청 처리 완료: 총 ${users.length}명 중 ${successCount}명에게 발송 성공` }),
    };

  } catch (error) {
    console.error('💥 총괄 핸들러 처리 중 심각한 오류 발생:', error);
    
    // 모듈 파일을 찾지 못한 경우 (가장 흔한 에러)
    if (error.code === 'MODULE_NOT_FOUND') {
      return { 
        statusCode: 404, 
        headers: corsHeaders, 
        body: JSON.stringify({ error: `정의되지 않은 메시지 타입입니다: '${requestBody?.type}'` }) 
      };
    }
    
    // 그 외 일반적인 서버 오류
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};