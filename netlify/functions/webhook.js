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
      // field.key가 이제 'name', 'gender' 등이므로 그대로 사용합니다.
      if (field.key && field.value !== null && field.value !== undefined) {
        // 'gender'처럼 선택 옵션인 경우, value는 텍스트 값 자체가 됩니다.
        formData[field.key] = Array.isArray(field.value) ? field.value[0]?.text || field.value[0] : field.value;
      }
    });
        // 사진(selfy) 필드는 URL만 추출합니다.
    if (formData.selfy && formData.selfy.url) {
      formData.selfy = formData.selfy.url;
    }
    console.log('✅ 파싱된 폼 데이터:', formData);

    const { error } = await supabase.from('responses').insert([
      {
        name: formData.name,
        birth_year: formData.birth_year ? parseInt(formData.birth_year, 10) : null,
        phone: formData.phone,
        gender: formData.gender, // '남자' 또는 '여자' 텍스트가 바로 들어감
        apply_date: formData.apply_date,
        mbti: formData.mbti,
        selfy: formData.selfy,
        coupon: formData.coupon,
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