require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase 연결
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

(async () => {
  // ✅ 대상자 필터링 조건:
  // 1. memo1 = '문자발송완료'
  // 2. memo2 = true
  // 3. memo3 미기입 (null 또는 빈 문자열)
  const { data: rows, error } = await supabase
    .from('responses')
    .select('*')
    .eq('memo1', '✅발송완료')
    .eq('memo2', true)
    .not('memo3', 'eq', '✅발송완료');

  if (error) {
    console.error('❌ 대상자 조회 실패:', error);
    return;
  }

  if (rows.length === 0) {
    console.log('📭 대상자가 없습니다.');
    return;
  }

  console.log(`📋 총 ${rows.length}명 대상자 발견`);
  for (const row of rows) {
    console.log(`- ${row.name} (${row.phone}) → memo3 기입 시도`);

    // 실제 문자 발송은 생략, 대신 memo3 필드 업데이트 테스트
    const { error: updateError } = await supabase
      .from('responses')
      .update({ memo3: '✅발송완료' })
      .eq('id', row.id);

    if (updateError) {
      console.error(`❌ memo3 업데이트 실패 (${row.phone}):`, updateError);
    } else {
      console.log(`✅ memo3 기입 완료 (${row.name})`);
    }
  }
})();
