const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Supabase 연결
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// JSON 파싱, CORS 허용
app.use(express.json());
app.use(require('cors')());

// ✅ 날짜가 이미 YYYY-MM-DD 형식이면 그대로 사용
function parseKoreanDate(dateStr) {
  try {
    if (!dateStr) return null;

    // 이미 YYYY-MM-DD 형식이면 그대로 사용
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    // '6월 20일 (토)' 형식일 경우
    const match = dateStr.match(/(\d{1,2})월\s*(\d{1,2})일/);
    if (!match) return null;

    const [, month, day] = match;
    const year = new Date().getFullYear();
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } catch (e) {
    return null;
  }
}



// ✅ 성별 UUID → 사람이 읽는 값으로 변환
const genderMap = {
  '2fef7478-255d-4fa2-8a46-0ab754993fa1': '남자',
  '3cab93e0-4a1b-449b-895b-ecd659767364': '여자'
};

app.post('/webhook', async (req, res) => {
  const raw = req.body;
  console.log('🔥 받은 데이터:', raw);

  const fieldsArray = raw.data?.fields || [];

  // ✅ Tally 자동 생성 질문키 → 우리가 사용하는 필드명으로 매핑
  const fieldMap = {
    question_NlOAMp: 'name',
    question_zyVpkM: 'birth_year',
    question_Y08D1v: 'phone',
    question_da7LOd: 'gender',
    question_Y02E1W: 'mbti',
    question_zylEMM: 'apply_date',
    question_lepoxN: 'tmi',
  };

  // ✅ fieldMap 기준으로 키 변환
  const formData = {};
  fieldsArray.forEach((field) => {
    console.log('🧩 key:', field.key, '| value:', field.value);
    const mappedKey = fieldMap[field.key];
    if (mappedKey && field.value) {
      formData[mappedKey] = Array.isArray(field.value)
        ? field.value[0]
        : field.value;
    }
  });

  console.log('✅ 파싱된 폼 데이터:', formData);

  // ✅ 날짜 변환
  const applyDateFormatted = parseKoreanDate(formData.apply_date);

  console.log('📅 원본 날짜:', formData.apply_date);
  console.log('📅 변환된 날짜:', applyDateFormatted);

  // ✅ 성별 UUID → 텍스트로 변환
  const genderUUID = formData.gender;
  const gender = genderMap[genderUUID] || genderUUID;

  // ✅ Supabase 저장
  const { error } = await supabase.from('responses').insert([
    {
      name: formData.name,
      birth_year: parseInt(formData.birth_year),
      phone: formData.phone,
      gender: gender,
      apply_date: applyDateFormatted,
      mbti: formData.mbti,
      tmi: formData.tmi,
    }
  ]);

  if (error) {
    console.error('❌ Supabase insert error:', error);
    return res.status(500).send('Error saving to Supabase');
  }

  res.send('✅ 저장 성공');
});

// 서버 실행
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
