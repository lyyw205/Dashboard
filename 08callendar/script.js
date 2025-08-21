// calendar_script.js

// 1. Supabase 클라이언트 초기화 (관리자 페이지와 동일한 키 사용)
const SUPABASE_URL = "https://wqxmvqqkbxiykiotbusd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxeG12cXFrYnhpeWtpb3RidXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NDcyOTYsImV4cCI6MjA2NDAyMzI5Nn0.RmB92YtjLPMx4tkQibuRVT_T4DL3_O8Pny3ZA9DU0tk";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. 전역 변수 선언
let calendarEvents = []; // Supabase에서 가져온 일정을 저장할 배열
const monthYearElement = document.getElementById('month-year');
const calendarDaysElement = document.getElementById('calendar-days');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const selectedEventDetails = document.getElementById('selected-event-details');
const defaultEventList = document.getElementById('default-event-list');
let currentDate = new Date();



function parseKoreanDateString(koreanDate) {
    // '7월 18일' 에서 숫자만 추출 -> ["7", "18"]
    const parts = koreanDate.match(/\d+/g);
    if (!parts || parts.length < 2) {
        // 형식이 맞지 않으면 유효하지 않은 날짜로 처리
        return { dateString: null, dateObject: new Date(null) };
    }

    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    
    // 데이터가 2025년 기준인 것으로 보이므로, 연도를 2025로 고정합니다.
    // 만약 다른 연도의 데이터도 있다면 이 부분을 수정해야 합니다.
    const year = 2025; 

    // 'YYYY-MM-DD' 형식의 문자열 생성 (예: '2025-07-18')
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // 시간대 문제를 피하기 위해 'T00:00:00'을 붙여 Date 객체 생성
    const dateObject = new Date(dateString + 'T00:00:00');
    
    return { dateString, dateObject };
}

function calculateDdayLabel(deadlineStr) {
    if (!deadlineStr) return '미정'; // deadline 값이 없으면 '미정'

    const deadline = new Date(deadlineStr);
    const today = new Date();

    // 시간 정보를 제거하여 날짜만 순수하게 비교
    deadline.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diff = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
        return `D-${diffDays}`;
    } else if (diffDays === 0) {
        return 'D-Day';
    } else {
        return '마감';
    }
}

// 3. ★★★ [핵심] Supabase에서 데이터를 가져와 캘린더 형식으로 변환하는 함수 ★★★
async function loadAndFormatEvents() {
    const { data, error } = await client.from("party_cards").select("*").order("date", { ascending: true });

    if (error) {
        console.error("❌ Supabase 데이터 로딩 실패:", error);
        return;
    }

    calendarEvents = data.map(item => {
        // 위에서 만든 헬퍼 함수를 사용하여 날짜 변환
        const parsedDate = parseKoreanDateString(item.date);

        return {
            date: parsedDate.dateString,       // '2025-07-18' 형식
            dateObject: parsedDate.dateObject, // 유효한 Date 객체
            description: `<div><strong>${item.date}</strong><br>${item.gender}</div>`,
            deadline: item.deadline 
        };
    }).filter(event => event.dateObject.toString() !== 'Invalid Date'); // 변환 실패한 데이터는 제외
}

// 4. 페이지가 처음 로드될 때 실행될 메인 함수
async function initializeCalendar() {
    await loadAndFormatEvents(); // Supabase에서 데이터를 먼저 가져오고
    renderCalendar();            // 캘린더를 렌더링
    renderDefaultEvents();       // 기본 일정 목록을 렌더링
}

// (이하 캘린더를 그리고, 일정을 표시하는 함수들은 이전과 거의 동일)
// 단, 정적인 'events' 배열 대신 동적인 'calendarEvents' 배열을 사용하도록 수정

function renderDefaultEvents() {
    if (!calendarEvents || calendarEvents.length === 0) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastEvents = calendarEvents.filter(e => e.dateObject < today);
    const upcomingEvents = calendarEvents.filter(e => e.dateObject >= today);
    pastEvents.sort((a, b) => b.dateObject - a.dateObject);
    upcomingEvents.sort((a, b) => a.dateObject - b.dateObject);

    let html = '<h3>주요 일정</h3>';

    // ★★★ "다가오는 일정" 대신 D-Day 라벨 사용 ★★★
    if (upcomingEvents.length > 0) {
        const ddayLabel = calculateDdayLabel(upcomingEvents[0].deadline);
        html += `
            <div class="default-event-item">
                <span class="event-label">${ddayLabel}</span>
                ${upcomingEvents[0].description}
            </div>
        `;
    }

    // ★★★ "지난 일정" 대신 "마감" 라벨 사용 ★★★
    pastEvents.slice(0, 2).forEach(event => {
        html += `
            <div class="default-event-item">
                <span class="event-label">마감</span>
                ${event.description}
            </div>
        `;
    });
    
    if (upcomingEvents.length === 0 && pastEvents.length === 0) {
        html = '<p>현재 예정된 일정이 없습니다.</p>';
    }
    defaultEventList.innerHTML = html;
}

// calendar_script.js 파일의 renderCalendar 함수를 아래 코드로 교체하세요.

function renderCalendar() {
    if (!calendarEvents) {
        console.warn("⚠️ 'renderCalendar'가 호출되었지만, calendarEvents 배열이 정의되지 않았습니다.");
        return;
    }

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    monthYearElement.textContent = `${year}년 ${month + 1}월`;
    calendarDaysElement.innerHTML = '';
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const lastDateOfMonth = new Date(year, month + 1, 0).getDate();
    const lastDateOfPrevMonth = new Date(year, month, 0).getDate();
    
    // 이전 달 날짜 렌더링 (변경 없음)
    for (let i = firstDayOfMonth; i > 0; i--) {
        const dayDiv = document.createElement('div');
        dayDiv.textContent = lastDateOfPrevMonth - i + 1;
        dayDiv.classList.add('other-month');
        calendarDaysElement.appendChild(dayDiv);
    }

    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    //                  핵심 수정 부분 시작
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

    // 현재 달의 날짜들을 렌더링합니다.
    for (let i = 1; i <= lastDateOfMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.textContent = i;
        
        // 캘린더에서 현재 그리고 있는 날짜를 'YYYY-MM-DD' 형식의 문자열로 만듭니다.
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        // 오늘 날짜인지 확인 (변경 없음)
        const today = new Date();
        if (i === today.getDate() && year === today.getFullYear() && month === today.getMonth()) {
            dayDiv.classList.add('today');
        }

        // 'calendarEvents' 배열에서 현재 날짜(dateString)와 일치하는 이벤트를 찾습니다.
        const eventsForThisDay = calendarEvents.filter(event => {
            // ✅ [로그] 비교 과정을 콘솔에 출력합니다.
            // 이 로그가 너무 많이 나온다면, 아래 if 블록 안으로 옮겨도 됩니다.
            // console.log(`- 비교 중: 달력(${dateString}) vs 이벤트(${event.date})`);
            return event.date === dateString;
        });

        // 만약 일치하는 이벤트가 하나라도 있다면
        if (eventsForThisDay.length > 0) {

            dayDiv.classList.add('event-day'); // 점을 표시하는 클래스 추가
            dayDiv.addEventListener('click', () => { // 클릭 이벤트 추가
                if (dayDiv.classList.contains('active')) {
                    hideSelectedEvent();
                    dayDiv.classList.remove('active');
                } else {
                    showSelectedEvent(dateString);
                    document.querySelectorAll('.calendar-days div').forEach(d => d.classList.remove('active'));
                    dayDiv.classList.add('active');
                }
            });
        }
        
        calendarDaysElement.appendChild(dayDiv);
    }

    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    //                  핵심 수정 부분 끝
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    
    // 다음 달 날짜 렌더링 (변경 없음)
    const totalCells = calendarDaysElement.children.length;
    const remainingCells = 42 - totalCells;
    for (let i = 1; i <= remainingCells; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.textContent = i;
        dayDiv.classList.add('other-month');
        calendarDaysElement.appendChild(dayDiv);
    }
}

function showSelectedEvent(dateString) {
    // ★★★ 'events' 대신 'calendarEvents' 사용
    const event = calendarEvents.find(e => e.date === dateString);
    if (event) {
        selectedEventDetails.innerHTML = `<p>${event.description}</p>`;
        selectedEventDetails.classList.add('visible');
    }
}

function hideSelectedEvent() {
    selectedEventDetails.classList.remove('visible');
}

prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });

// ★★★ 페이지 로드 시 initializeCalendar 함수를 실행
document.addEventListener('DOMContentLoaded', initializeCalendar);