// netlify/functions/webhook.js (올바른 코드)

const { createClient } = require('@supabase/supabase-js');

// Netlify 환경 변수에서 URL과 키를 가져와 Supabase 클라이언트 생성
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 날짜 변환 함수
function parseKoreanDate(dateStr) {
  try {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const match = dateStr.match(/(\d{1,2})월\s*(\d{1,2})일/);
    if (!match) return null;
    const [, month, day] = match;
    const year = new Date().getFullYear();
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  } catch (e) {
    return null;
  }
}

// 성별 UUID 맵
const genderMap = {
  '2fef7478-255d-4fa2-8a46-0ab754993fa1': '남자',
  '3d6cfc90-f6e9-4f56-9f5e-17ff22d60d69': '남자',
  '5baa3a5a-c069-41c2-9449-d5e5942f9dce': '여자',
  'c6553a0d-150d-428a-8a90-8106b6a0408f': '여자'
};

// Tally 필드 키 맵
const fieldMap = {
  question_NlOAMp: 'name',
  question_LKR80j: 'name',

  question_zyVpkM: 'birth_year',
  question_po8gVq: 'birth_year',

  question_Y08D1v: 'phone',
  question_Jl5y04: 'phone',

  question_da7LOd: 'gender',
  question_14qjEQ: 'gender',

  question_Y02E1W: 'job',
  question_Mao05p: 'job',

  question_zylEMM: 'apply_date',
  question_gqKB4l: 'apply_date',

  question_RoV6Oj: 'selfy',
  question_y4VODB: 'selfy',

  question_oRkaJx: 'coupon',
  question_jo1NMQ: 'coupon',

  question_y4RMXg: 'mbti',
  question_8L79eO: 'mbti',

  question_XokL5g: 'ideal',
  question_08N4PN: 'ideal'
};

// Netlify Function의 시작점인 exports.handler
exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const raw = JSON.parse(event.body);
    console.log('🔥 받은 데이터:', JSON.stringify(raw, null, 2));

    const fieldsArray = raw.data?.fields || [];
    
    const formData = {};
    fieldsArray.forEach((field) => {
      const mappedKey = fieldMap[field.key];
      if (mappedKey && field.value) {
        formData[mappedKey] = Array.isArray(field.value) ? field.value[0] : field.value;
      }
    });
    console.log('✅ 파싱된 폼 데이터:', formData);

    const applyDateFormatted = parseKoreanDate(formData.apply_date);
    const genderUUID = formData.gender;
    const gender = genderMap[genderUUID] || genderUUID;

    const { error } = await supabase.from('responses').insert([
      {
        name: formData.name,
        birth_year: parseInt(formData.birth_year, 10),
        phone: formData.phone,
        gender: gender,
        apply_date: applyDateFormatted,
        mbti: formData.mbti,
        selfy: formData.selfy?.url, // ?.url 로 안전하게 URL 추출
        coupon: formData.coupon,   // 쿠폰 코드 추가
        ideal: formData.ideal,
        job: formData.job,
      }
    ]);

    if (error) {
      console.error('❌ Supabase insert error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Error saving to Supabase', details: error.message }),
      };
    }

    console.log('✅ 저장 성공');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: '✅ 저장 성공' }),
    };

  } catch (e) {
    console.error('❌ Function Error:', e);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error', details: e.toString() }),
    };
  }
};