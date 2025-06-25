import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://wqxmvqqkbxiykiotbusd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxeG12cXFrYnhpeWtpb3RidXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NDcyOTYsImV4cCI6MjA2NDAyMzI5Nn0.RmB92YtjLPMx4tkQibuRVT_T4DL3_O8Pny3ZA9DU0tk'; // 생략
const supabase = createClient(supabaseUrl, supabaseKey);


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


function renderTable(data) {
  if (!data || data.length === 0) {
    tableContainer.innerHTML = '<p>예약자가 없습니다.</p>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'my-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>입장체크</th>
        <th>닉네임</th> 
        <th>이름</th>
        <th>전화번호</th>
        <th>성별</th>
        <th>MBTI</th>
        <th>장소문자</th>
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
          <td>${row.gender || ''}</td>
          <td>${row.mbti || ''}</td>
          <td>${row.memo3 || ''}</td>
          <td><input type="checkbox" class="form-check-input memo-checkbox" ${row.memo4 ? 'checked' : ''} data-id="${row.id}" data-field="memo4" /></td>
          <td><input type="text" class="memoinput" value="${row.memo5 || ''}" data-id="${row.id}" data-field="memo5" /></td>
        </tr>
      `).join('')}
    </tbody>
  `;
  tableContainer.innerHTML = '';
  tableContainer.appendChild(table);

  // 자동 저장: 텍스트 입력
  document.querySelectorAll('input[type="text"][data-field]').forEach(input => {
    input.addEventListener('input', async () => {
      const id = input.dataset.id;
      const field = input.dataset.field;
      const value = input.value;

      const { error } = await supabase
        .from('responses')
        .update({ [field]: value })
        .eq('id', id);

      if (error) {
        console.error(`❌ ${field} 저장 실패:`, error.message);
      } else {
        console.log(`✅ ${field} 저장 완료`);
      }
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
    .select('id, name, phone, gender, mbti, apply_date, memo3, memo4, memo5, nickname, incheck')
    .eq('memo2', true)
    .order('apply_date', { ascending: true });

  if (error) {
    console.error('❌ 데이터 로딩 오류:', error.message);
    tableContainer.innerHTML = '<p>데이터를 불러오는 데 실패했습니다.</p>';
    return;
  }

  groupedData = groupByDate(data);
  const dates = Object.keys(groupedData).sort();

  const today = new Date();
  const sortedDates = Object.keys(groupedData).sort((a, b) => {
    const aDate = new Date(a);
    const bDate = new Date(b);
    const aIsPast = aDate < today ? 1 : 0;
    const bIsPast = bDate < today ? 1 : 0;
    return aIsPast - bIsPast || aDate - bDate;
  });

  renderTabs(sortedDates);
  renderTable(groupedData[sortedDates[0]]);
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