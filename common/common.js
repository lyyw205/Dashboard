// 페이지의 모든 요소가 로드된 후에 스크립트를 실행합니다.
document.addEventListener('DOMContentLoaded', () => {

  // iOS PWA에서 '완료' 버튼이 뜨는 현상을 막는 코드
  // '.content-link' 또는 다른 페이지로 이동하는 링크에 적용할 수 있습니다.
  const internalLinks = document.querySelectorAll('a.content-link, a.sidebar-link'); // 적용 대상을 추가할 수 있습니다.

  // 모바일 환경(PWA 포함)인지 확인합니다.
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // 모바일 PWA 환경에서만 이 로직을 실행합니다.
  if (isStandalone && isMobile) {
    internalLinks.forEach(link => {
      link.addEventListener('click', (event) => {
        // 1. 링크의 기본 동작을 막습니다.
        event.preventDefault();
        
        // 2. 링크가 가리키는 주소(href)를 가져옵니다.
        const destination = link.href;
        
        // 3. JavaScript를 통해 해당 주소로 페이지를 이동시킵니다.
        window.location.href = destination;
      });
    });
  }
  
  // 여기에 다른 모든 페이지에서 공통으로 사용될 JavaScript 코드를 추가할 수 있습니다.
  // 예를 들어, 사이드바를 동적으로 불러오는 코드 등...

});