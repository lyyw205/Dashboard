const spendCategories = ['광고', '장소 대관', '안주/주류', '비품', '업무추진비', '공과금', '기타'];
const incomeCategories = ['파티비', '기타'];

if (window.supabase) {
  const supa = window.supabase.createClient(
    'https://wqxmvqqkbxiykiotbusd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxeG12cXFrYnhpeWtpb3RidXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NDcyOTYsImV4cCI6MjA2NDAyMzI5Nn0.RmB92YtjLPMx4tkQibuRVT_T4DL3_O8Pny3ZA9DU0tk'
  );



  // 📌 필터링 조건 확인 함수
  function isInRange(rowDate, range) {
    const now = new Date();
    if (range === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return rowDate >= startOfWeek;
    } else if (range === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return rowDate >= startOfMonth;
    }
    return true; // 전체
  }

  // 📌 핵심 로딩 함수 (선택된 범위 인자로 받음)
  async function loadDashboardMetrics(range = 'all') {
    const { data, error } = await supa
      .from('card_logs')
      .select('amount, category, type, timeline');

    if (error) {
      console.error('❌ 대시보드 로딩 실패:', error);
      return;
    }

    console.log('✅ 데이터 개수:', data.length);

    const spendMap = {};
    const incomeMap = {};
    let spendTotal = 0;
    let incomeTotal = 0;

    data.forEach(row => {
      const amount = row.amount || 0;
      const date = new Date(row.timeline);
      if (!isInRange(date, range)) return;

      if (row.type === '출금' && spendCategories.includes(row.category)) {
        spendTotal += amount;
        spendMap[row.category] = (spendMap[row.category] || 0) + amount;
      }

      if (row.type === '입금' && incomeCategories.includes(row.category)) {
        incomeTotal += amount;
        incomeMap[row.category] = (incomeMap[row.category] || 0) + amount;
      }
    });

    // 📌 DOM 반영
    const expenseEl = document.getElementById('expense-total');
    const incomeEl = document.getElementById('income-total');
    if (expenseEl) expenseEl.textContent = `₩${spendTotal.toLocaleString('ko-KR')}`;
    if (incomeEl) incomeEl.textContent = `₩${incomeTotal.toLocaleString('ko-KR')}`;

    // 📌 차트 색상
    const spendColors = ['#ff6384', '#ff9f40', '#ffcd56', '#4bc0c0', '#36a2eb', '#9966ff', '#c9cbcf'];
    const incomeColors = ['#4caf50', '#81c784'];

    // 기존 차트 제거
    Chart.getChart("expenseChart")?.destroy();
    Chart.getChart("incomeChart")?.destroy();

    // 💸 지출 차트
    const spendCtx = document.getElementById('expenseChart');
    if (spendCtx) {
      new Chart(spendCtx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(spendMap),
          datasets: [{
            label: '지출',
            data: Object.values(spendMap),
            backgroundColor: spendColors,
            borderWidth: 0,
          }]
        },
        options: {
          responsive: true,
          cutout: '70%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#333',
                boxWidth: 16,
                padding: 12
              }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.label}: ₩${ctx.raw.toLocaleString('ko-KR')}`
              }
            }
          }
        }
      });
    }

    // 💰 수입 차트
    const incomeCtx = document.getElementById('incomeChart');
    if (incomeCtx) {
      new Chart(incomeCtx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(incomeMap),
          datasets: [{
            label: '수입',
            data: Object.values(incomeMap),
            backgroundColor: incomeColors,
            borderWidth: 0,
          }]
        },
        options: {
          responsive: true,
          cutout: '70%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#333',
                boxWidth: 16,
                padding: 12
              }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.label}: ₩${ctx.raw.toLocaleString('ko-KR')}`
              }
            }
          }
        }
      });
    }
  }

  // 📌 DOM 로딩 후 + 드롭다운 이벤트 연결
  document.addEventListener('DOMContentLoaded', () => {
    const rangeSelect = document.getElementById('range-select');
    if (rangeSelect) {
      rangeSelect.addEventListener('change', () => {
        loadDashboardMetrics(rangeSelect.value);
      });
    }
    loadDashboardMetrics(); // 최초 전체 로딩
  });
} else {
  console.error('❌ Supabase가 로드되지 않았습니다.');
}