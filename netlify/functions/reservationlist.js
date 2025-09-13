import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://wqxmvqqkbxiykiotbusd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxeG12cXFrYnhpeWtpb3RidXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NDcyOTYsImV4cCI6MjA2NDAyMzI5Nn0.RmB92YtjLPMx4tkQibuRVT_T4DL3_O8Pny3ZA9DU0tk'; // 생략
const supabase = createClient(supabaseUrl, supabaseKey);

function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}


const tabContainer = document.getElementById('date-tabs');
const tableContainer = document.getElementById('reservation-list');

function formatDate(iso) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function groupByDate(data) {
  const grouped = {};
  data.forEach(row => {
    const date = formatDate(row.apply_date);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(row);
  });
  return grouped;
}

function renderTabs(dates) {
  tabContainer.innerHTML = '';

  const today = new Date().setHours(0, 0, 0, 0);
  let activeDate = dates[0]; // 기본값: 첫 날짜
  let firstRender = true;

  dates.forEach(dateStr => {
    const btn = document.createElement('button');
    btn.textContent = formatKoreanDate(dateStr);
    btn.dataset.date = dateStr;

    const date = new Date(dateStr).setHours(0, 0, 0, 0);
    if (date < today) {
      btn.classList.add('past-date');
    }

    btn.addEventListener('click', () => {
      renderTable(groupedData[dateStr]);
      document.querySelectorAll('#date-tabs button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });

    tabContainer.appendChild(btn);

    // 첫 날짜 선택 시 active 표시 및 테이블 렌더 
    if (firstRender) {
      btn.classList.add('active');
      renderTable(groupedData[dateStr]);
      firstRender = false;
    }
  });
}

let currentSort = {
    column: null,
    direction: 'asc' // 'asc' 또는 'desc'
};

function renderTable(data, sortColumn = null, sortDirection = null) {
  if (!data || data.length === 0) {
    tableContainer.innerHTML = '<p>예약자가 없습니다.</p>';
    return;
  }

  // 정렬 로직
  if (sortColumn) {
    currentSort.column = sortColumn;
    currentSort.direction = sortDirection;
  } else if (currentSort.column) {
    // 정렬 상태 유지
    sortColumn = currentSort.column;
    sortDirection = currentSort.direction;
  }

  if (sortColumn === 'nickname') {
    data.sort((a, b) => {
      const valA = a.nickname || '';
      const valB = b.nickname || '';
      
      if (sortDirection === 'asc') {
        return valA.localeCompare(valB, undefined, { numeric: true });
      } else {
        return valB.localeCompare(valA, undefined, { numeric: true });
      }
    });
  }

  renderSummary(data);

  const table = document.createElement('table');
  table.className = 'my-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>입장체크</th>
        <th class="sortable" data-column="nickname">번호</th> 
        <th>이름</th>
        <th>전화번호</th>
        <th>성별</th>
        <th>직업</th>
        <th>MBTI</th>
        <th>이상형</th>
        <th>안내문자</th>
        <th>메인</th>
        <th>애프터</th>
        <th>메모</th>
      </tr>
    </thead>
    <tbody>
      ${data.map(row => `
        <tr>
          <td><input type="checkbox" class="form-check-input memo-checkbox" ${row.incheck ? 'checked' : ''} data-id="${row.id}" data-field="incheck" /></td>
          <td><input type="text" class="nicknameinput" value="${row.nickname || ''}" data-id="${row.id}" data-field="nickname" /></td>  
          <td>${row.name || ''}</td>
          <td>${row.phone || ''}</td>
          <td >${row.gender || ''}</td>
          <td title="${row.job || ''}">${row.job || ''}</td>
          <td title="${row.mbti || ''}">${row.mbti || ''}</td>
          <td title="${row.ideal || ''}">${row.ideal || ''}</td>
          <td title="${row.memo3 || ''}">${row.memo3 || ''}</td>
          <td><input type="checkbox" class="form-check-input memo-checkbox" ${row.memo2 ? 'checked' : ''} data-id="${row.id}" data-field="memo2" /></td>
          <td><input type="checkbox" class="form-check-input memo-checkbox" ${row.memo4 ? 'checked' : ''} data-id="${row.id}" data-field="memo4" /></td>
          <td><input type="text" class="memoinput" value="${row.memo5 || ''}" data-id="${row.id}" data-field="memo5" /></td>
        </tr>
      `).join('')}
    </tbody>
  `;
  tableContainer.innerHTML = '';
  tableContainer.appendChild(table);

  // 정렬 헤더 UI 업데이트
  const headers = table.querySelectorAll('th.sortable');
  headers.forEach(header => {
    const column = header.dataset.column;
    if (column === currentSort.column) {
      header.classList.add(currentSort.direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
    }
  });

  // 정렬 클릭 이벤트 리스너 추가
  table.querySelectorAll('th.sortable').forEach(header => {
    header.addEventListener('click', () => {
      const column = header.dataset.column;
      let direction = 'asc';
      if (currentSort.column === column && currentSort.direction === 'asc') {
        direction = 'desc';
      }
      // 정렬된 데이터로 테이블을 다시 렌더링
      renderTable(data, column, direction); 
    });
  });

  // 자동 저장: 텍스트 입력
  const saveData = async (inputElement) => {
    const id = inputElement.dataset.id;
    const field = inputElement.dataset.field;
    const value = inputElement.value;

    const { error } = await supabase
      .from('responses')
      .update({ [field]: value })
      .eq('id', id);

    if (error) {
      console.error(`❌ ${field} 저장 실패:`, error.message);
    } else {
      console.log(`✅ ${field} 저장 완료 (디바운스)`);
    }
  };

  const debouncedSave = debounce(saveData, 3000);

  document.querySelectorAll('input[type="text"][data-field]').forEach(input => {
    input.addEventListener('input', () => {
      debouncedSave(input);
    });
  });

  // 자동 저장: 체크박스 변경
  document.querySelectorAll('input[type="checkbox"][data-field]').forEach(checkbox => {
    checkbox.addEventListener('change', async () => {
      const id = checkbox.dataset.id;
      const field = checkbox.dataset.field;
      const checked = checkbox.checked;

      console.log("체크박스 변경 감지:", { id, field, checked });

      const { error } = await supabase
        .from('responses')
        .update({ [field]: checked })
        .eq('id', id);

      if (error) {
        console.error(`❌ ${field} 저장 실패:`, error.message);
      } else {
        console.log(`✅ ${field} 저장 완료`);
      }
    });
  });
}


let groupedData = {};

async function fetchData() {
  const { data, error } = await supabase
    .from('responses')
    .select('id, name, phone, gender, job, mbti, ideal, apply_date, memo2, memo3, memo4, memo5, nickname, incheck, created_at')
    .or('memo2.eq.true,memo4.eq.true') 
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ 데이터 로딩 오류:', error.message);
    tableContainer.innerHTML = '<p>데이터를 불러오는 데 실패했습니다.</p>';
    return;
  }

  groupedData = groupByDate(data);

  const today = new Date();
  today.setHours(0, 0, 0, 0); // 오늘 날짜의 시간을 자정으로 설정

  const sortedDates = Object.keys(groupedData).sort((a, b) => {
    const aDate = new Date(a);
    const bDate = new Date(b);

    const aIsPast = aDate < today;
    const bIsPast = bDate < today;

    // 1. 그룹 정렬: 미래(false) 그룹이 과거(true) 그룹보다 먼저 오도록 정렬
    // aIsPast가 false(0), bIsPast가 true(1)이면 a가 먼저 옴.
    if (aIsPast !== bIsPast) {
      return aIsPast - bIsPast;
    }

    // 2. 그룹 내 정렬
    if (!aIsPast) { // 둘 다 미래 날짜인 경우
      // 오름차순 정렬 (가까운 날짜부터)
      return aDate - bDate; 
    } else { // 둘 다 과거 날짜인 경우
      // 내림차순 정렬 (최근에 지난 날짜부터)
      return bDate - aDate;
    }
  });

  renderTabs(sortedDates);
  // 첫 렌더링 시 테이블이 비어있지 않도록 수정
  if (sortedDates.length > 0) {
      renderTable(groupedData[sortedDates[0]]);
  } else {
      renderTable([]); // 데이터가 없을 경우 빈 테이블 렌더링
  }
}

function renderSummary(data) {
  const summaryEl = document.getElementById('summary-stats');
  summaryEl.className = 'summary-container';

  let maleCount = 0;
  let femaleCount = 0;
  let afterCount = 0;

  data.forEach(row => {
    if (row.gender === '남자') maleCount++;
    else if (row.gender === '여자') femaleCount++;

    if (row.memo4) afterCount++;
  });

  const total = data.length;
  const afterRatio = total > 0 ? Math.round((afterCount / total) * 100) : 0;

  summaryEl.innerHTML = `
    <div class="summary-box-sex">
      <div class="summary-box summary-male">
        <span class="summary-label">남자</span>
        <span class="summary-value">${maleCount}명</span>
      </div>
      <div class="summary-box summary-female">
        <span class="summary-label">여자</span>
        <span class="summary-value">${femaleCount}명</span>
      </div>
    </div>
    <div class="summary-box-data">
      <div class="summary-box summary-total">
        <span class="summary-label">총원</span>
        <span class="summary-value">${total}명</span>
      </div>
      <div class="summary-box summary-after">
        <span class="summary-label">애프터 신청률</span>
        <span class="summary-value">${afterRatio}%</span>
      </div>
    </div>
  `;
}

function formatKoreanDate(isoStr) {
  const date = new Date(isoStr);
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dayOfWeek = dayNames[date.getDay()];
  return `${month}월 ${day}일 (${dayOfWeek})`;
}

fetchData();

// 날짜 탭 컨테이너에서 마우스 휠 이벤트 감지
const dateTabsContainer = document.getElementById('date-tabs');

dateTabsContainer.addEventListener('wheel', (event) => {
  // 기본 세로 스크롤 동작을 막음
  event.preventDefault();

  // 휠의 세로 스크롤 값(event.deltaY)을 가로 스크롤 값(scrollLeft)에 더해줌
  dateTabsContainer.scrollLeft += event.deltaY;
});