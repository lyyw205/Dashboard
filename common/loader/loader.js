/* =================================================================== */
/*                 공통 로딩 및 진입 애니메이션 (loader.js)              */
/* =================================================================== */

// DOM이 로드된 후 즉시 실행하여, FOUC(화면 깜빡임)를 최소화합니다.
document.addEventListener('DOMContentLoaded', () => {
  const pageLoader = document.getElementById('page-loader');
  const mainContent = document.querySelector('.main-content');

  // 필수 요소가 없으면 실행하지 않습니다 (안전장치).
  if (!pageLoader || !mainContent) {
    console.warn("로딩 화면 또는 메인 콘텐츠(.main-content)를 찾을 수 없습니다.");
    return;
  }

  // --- 메인 콘텐츠 진입 애니메이션 트리거 ---
  // 브라우저가 초기 렌더링을 마칠 약간의 시간을 준 후 'loaded' 클래스를 추가합니다.
  setTimeout(() => {
    mainContent.classList.add('loaded');
  }, 10); // 10ms 지연

  // --- 로딩 화면 숨기기 로직 ---
  
  const hideLoader = () => {
    pageLoader.classList.add('hidden');
  };

  // 1순위: 페이지의 모든 리소스(이미지, API 등)가 로드되면 로더를 숨깁니다.
  window.addEventListener('load', hideLoader);

  // 2순위 (안전장치): 만약 3초가 지나도 load 이벤트가 발생하지 않으면,
  // 네트워크가 느리거나 특정 리소스 로딩에 문제가 있는 경우이므로 강제로 로더를 숨깁니다.
  setTimeout(hideLoader, 3000); // 3000ms = 3초
});