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

  // ── 디버깅: 실제 sendOne() 호출 옵션을 찍어봅니다. ──
  const sendOptions = {
    to: user.phone.replace(/-/g, ''),
    kakaoOptions: {
      pfId: process.env.COOLSMS_PFID,
      templateId: templateCode,
      variables: variables
    }
  };
  console.log('🛠 [DEBUG] sendOne 옵션:', JSON.stringify(sendOptions, null, 2));
  // ───────────────────────────────────────────────────

  try {
    // 디버깅 옵션을 실제 호출에도 사용
    const response = await messageService.sendOne(sendOptions);
    console.log(`✅ CoolSMS 알림톡 API 요청 성공: ${user.name}`, response);
    return response;
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
const ALIMTALK_CONFIG = {
  // --- 남자 사용자 설정 ---
  '남자': {
    // 남자가 쿠폰 없이 제출했을 때의 기본값
    DEFAULT: {
      template: 'KA01TP250717092857251yAnTUzfxJvp', // 유료 안내 (남자 버전, 필요시 수정)
      successMessage: '✅입금안내_남',
      variables: (user, formattedDate) => ({
        '#{고객명}': user.name,
        '#{브랜드이름}': '게릴라 파티',
        '#{파티날짜}': formattedDate,
      }),
    },
    // 남자 사용자 전용 쿠폰 설정
    COUPONS: {
      'WEINVITEYOU': {
        template: 'KA01TP250709145734382Qm8j2DgohNp', // 무료 초대 (내용이 같다면 그대로 사용)
        successMessage: '✅무료초대_남',
        variables: (user, formattedDate) => ({
          '#{고객명}': user.name,
          '#{파티명}': '게릴라 파티',
          '#{date}': formattedDate
        }),
      },
      '민수': {
        template: 'KA01TP250709145734382Qm8j2DgohNp', // 특별 선물 (내용이 같다면 그대로 사용)
        successMessage: '✅민수초대_남',
        variables: (user, formattedDate) => ({
          '#{고객명}': user.name,
          '#{파티명}': '게릴라 파티',
          '#{date}': formattedDate
        }),
      },
      '재환': {
        template: 'KA01TP250709145734382Qm8j2DgohNp', // 특별 선물 (내용이 같다면 그대로 사용)
        successMessage: '✅재환초대_남',
        variables: (user, formattedDate) => ({
          '#{고객명}': user.name,
          '#{파티명}': '게릴라 파티',
          '#{date}': formattedDate
        }),
      },
      '문토': {
        template: 'KA01TP250709145734382Qm8j2DgohNp', // 특별 선물 (내용이 같다면 그대로 사용)
        successMessage: '✅문토',
        variables: (user, formattedDate) => ({
          '#{고객명}': user.name,
          '#{파티명}': '게릴라 파티',
          '#{date}': formattedDate
        }),
      },
    }
  },
  // --- 여자 사용자 설정 ---
  '여자': {
    // 여자가 쿠폰 없이 제출했을 때의 기본값
    DEFAULT: {
      template: 'KA01TP250707173844176ndkmNlwondi', // 예: 여자용 유료 안내 템플릿 ID
      successMessage: '✅입금안내_여',
      variables: (user, formattedDate) => ({
        '#{고객명}': user.name,
        '#{브랜드이름}': '게릴라 파티',
        '#{파티날짜}': formattedDate,
      }),
    },
    // 여자 사용자 전용 쿠폰 설정
    COUPONS: {
      'WEINVITEYOU': {
        template: 'KA01TP250709145734382Qm8j2DgohNp', // 예: 여자용 무료 초대 템플릿 ID
        successMessage: '✅무료초대_여',
        variables: (user, formattedDate) => ({
          '#{고객명}': user.name,
          '#{파티명}': '게릴라 파티',
          '#{date}': formattedDate
        }),
      },
      '민수': {
        template: 'KA01TP250709145734382Qm8j2DgohNp', // 예: 여자용 특별 선물 템플릿 ID
        successMessage: '✅민수초대_여',
        variables: (user, formattedDate) => ({
          '#{고객명}': user.name,
          '#{파티명}': '게릴라 파티',
          '#{date}': formattedDate
        }),
      },
      '재환': {
        template: 'KA01TP250709145734382Qm8j2DgohNp', // 예: 여자용 특별 선물 템플릿 ID
        successMessage: '✅재환초대_여',
        variables: (user, formattedDate) => ({
          '#{고객명}': user.name,
          '#{파티명}': '게릴라 파티',
          '#{date}': formattedDate
        }),
      },
      '문토': {
        template: 'KA01TP250709145734382Qm8j2DgohNp', // 특별 선물 (내용이 같다면 그대로 사용)
        successMessage: '✅문토',
        variables: (user, formattedDate) => ({
          '#{고객명}': user.name,
          '#{파티명}': '게릴라 파티',
          '#{date}': formattedDate
        }),
      },
    }
  },
  // --- 성별 정보가 없거나 기타 경우를 위한 공통 설정 (Fallback) ---
  '공통': {
    DEFAULT: {
      template: 'KA01TP250707173844176ndkmNlwondi', // 기존 유료 안내
      successMessage: '✅입금안내_공통',
      variables: (user, formattedDate) => ({
        '#{고객명}': user.name,
        '#{브랜드이름}': '게릴라 파티',
        '#{파티날짜}': formattedDate,
      }),
    },
    COUPONS: {
        // 공통으로 처리할 쿠폰이 있다면 여기에 정의
    }
  }
};

// 날짜 형식 변환 함수 (YYYY-MM-DD -> M월 D일)
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

// --- 4. Netlify Function의 메인 핸들러 (모든 로직의 시작점) ---
exports.handler = async (event) => {
  console.log('▶️ 알림톡 함수 진입 (HTTP', event.httpMethod, ')');
  // Supabase Webhook은 POST 요청으로만 데이터를 보냅니다.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // --- (A) Supabase Webhook이 보낸 데이터 파싱 ---
    const payload = JSON.parse(event.body);
    console.log('📥 Supabase Webhook 페이로드 수신:', payload);

    const newRecordId = payload.record.id;
    if (!newRecordId) {
      console.warn('⚠️ 페이로드에 record.id가 없어 처리를 중단합니다.');
      return { statusCode: 200, body: 'Skipped: No record ID in payload.' };
    }
    const { data: fetchedUser, error: fetchError } = await supabase
      .from('responses')
      .select('*')
      .eq('id', newRecordId)
      .single(); // 단 하나의 결과만 가져옴
      

    if (fetchError || !fetchedUser) {
      throw new Error(`DB에서 ID ${newRecordId} 조회 실패: ${fetchError?.message || 'User not found'}`);
    }
    
    // 이제부터는 신뢰할 수 있는 'fetchedUser' 객체를 사용합니다.
    const newUser = fetchedUser;
    console.log('✅ 전체 데이터 조회 성공:', newUser);

    // --- (B) 유효성 검사 ---
    if (!newUser.phone) {
      console.warn('⚠️ 전화번호가 없거나 유효하지 않은 데이터라 건너뜁니다.');
      return { statusCode: 200, body: 'No phone number, skipped.' };
    }
    // Webhook은 항상 새로 생성된 데이터에 대해서만 호출되므로,
    // memo1 필드를 굳이 검사할 필요는 없지만 안전을 위해 남겨둘 수 있습니다.
    if (newUser.memo1 && newUser.memo1 !== '처리 대기중') { // '처리 대기중' 상태는 무시
      console.warn(`⚠️ 이미 처리된 제출이라 건너뜁니다 (id=${newUser.id}, memo1=${newUser.memo1})`);
      return { statusCode: 200, body: 'Already processed, skipped.' };
    }

    //대문자수정
    // --- (C) 알림톡 발송 분기 처리 (기존 핵심 로직) ---
    // 1. 공백 제거(.trim()) 후 2. 대문자 변환(.toUpperCase())
    const userGender = newUser.gender || '공통'; // DB에 gender 값이 없으면 '공통'으로 처리
    const userCouponCode = newUser.coupon ? newUser.coupon.trim().toUpperCase() : null;
    const formattedApplyDate = formatKoreanDate(newUser.apply_date);

    // 2. 성별에 맞는 설정 블록 선택
    const genderConfig = ALIMTALK_CONFIG[userGender] || ALIMTALK_CONFIG['공통'];
    
    let configToSend; // 최종적으로 발송할 설정을 담을 변수
    
    // 3. 쿠폰 코드 유무에 따라 최종 설정 결정
    if (userCouponCode && genderConfig.COUPONS[userCouponCode]) {
      // 쿠폰 코드가 있고, 해당 성별 설정에 쿠폰이 정의되어 있다면 그것을 사용
      console.log(`✨ 성별(${userGender}), 쿠폰(${userCouponCode})에 맞는 설정을 찾았습니다.`);
      configToSend = genderConfig.COUPONS[userCouponCode];
    } else {
      // 쿠폰이 없거나, 유효하지 않으면 해당 성별의 기본(DEFAULT) 설정을 사용
      console.log(`🎫 유효한 쿠폰이 없어 ${userGender} 기본 안내를 발송합니다.`);
      configToSend = genderConfig.DEFAULT;
    }

    // 4. 결정된 설정으로 알림톡 발송 및 DB 업데이트
    await sendAlimtalk(
      newUser,
      configToSend.template,
      configToSend.variables(newUser, formattedApplyDate)
    );
    await markAsSent(newUser.id, configToSend.successMessage);

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