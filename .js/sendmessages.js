require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 대상 조건: memo1이 비어 있고, 전화번호가 있는 경우
async function fetchTargets() {
  const { data, error } = await supabase
    .from('responses')
    .select('id, name, phone, memo1')
    .or('memo1.is.null,memo1.eq.')
    .neq('phone', '');

  if (error) {
    console.error('❌ 대상 조회 오류:', error.message);
    return [];
  }

  return data;
}

// 업데이트 처리
async function markAsSent(id) {
  const { error } = await supabase
    .from('responses')
    .update({ memo1: '✅발송완료' })
    .eq('id', id);

  if (error) {
    console.error(`❌ memo1 업데이트 실패 (id=${id}):`, error.message);
  } else {
    console.log(`📝 memo1 업데이트 완료 (id=${id})`);
  }
}

// 10초 후 실행할 전체 로직
async function run() {
  const targets = await fetchTargets();
  console.log(`🔍 발송 대상 ${targets.length}명`);

  for (const user of targets) {
    console.log(`📋 대상: ${user.name} (${user.phone})`);
    // 문자 발송 로직 생략
    await markAsSent(user.id);
  }

  console.log('✅ 처리 완료 (문자 제외)');
}

// Supabase INSERT 이벤트 감지 → 10초 후 run()
console.log('📡 폼 제출 감시 시작...');

supabase
  .channel('realtime:responses')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'responses',
    },
    async (payload) => {
      console.log('📥 새 제출 감지됨 → 10초 뒤 처리 예약');

      setTimeout(() => {
        run();
      }, 10000);
    }
  )
  .subscribe();
