// 페이지의 DOM이 완전히 로드되면, 비동기적으로 사이드바 초기화 함수를 실행합니다.
document.addEventListener('DOMContentLoaded', async () => {
  
  // 1. 경로 정의
  const SIDEBAR_HTML_PATH = '../common/sidebar.html';
  const SIDEBAR_CSS_PATH = '../common/sidebar.css';

  // 2. 사이드바 HTML과 CSS 동적 로딩 (<template> 방식)
  try {
    const response = await fetch(SIDEBAR_HTML_PATH);
    if (!response.ok) throw new Error(`[Sidebar Fetch Error] HTTP error! status: ${response.status}`);
    const componentHTMLText = await response.text();

    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = componentHTMLText;
    const template = tempContainer.querySelector('#sidebar-template');

    if (!template) throw new Error('[Sidebar Error] #sidebar-template 요소를 component 파일에서 찾을 수 없습니다.');
    
    const sidebarContent = template.content.cloneNode(true);
    document.body.prepend(sidebarContent);

    if (!document.querySelector(`link[href="${SIDEBAR_CSS_PATH}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = SIDEBAR_CSS_PATH;
      document.head.appendChild(link);
    }
  } catch (error) {
    console.error("사이드바 컴포넌트를 초기화하는 데 실패했습니다:", error);
    return;
  }

  // 3. 요소 찾기 및 이벤트 리스너 설정
  const sidebar = document.querySelector('.sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');
  const mainContent = document.querySelector('.main-content');
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  

  if (!sidebar || !toggleBtn || !mainContent || !mobileMenuToggle || !mobileMenu) {
    console.warn("사이드바 또는 메인 콘텐츠의 필수 요소가 페이지에 없습니다.");
    return;
  }

  // --- 데스크탑 로직 ---
  const EXPANDED_MARGIN = '260px';
  const COLLAPSED_MARGIN = '60px';

  const updateLayout = () => {
    if (window.innerWidth > 768) {
      if (sidebar.classList.contains('collapsed')) {
        mainContent.style.marginLeft = COLLAPSED_MARGIN;
      } else {
        mainContent.style.marginLeft = EXPANDED_MARGIN;
      }
    } else {
      mainContent.style.marginLeft = '0';
    }
  };

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    updateLayout();
  });

  window.addEventListener('resize', updateLayout);
  
  // --- 모바일 로직 (기존 코드의 장점 통합) ---
  
  // ✅ [복원된 기능 1] maxHeight를 이용한 부드러운 슬라이드 애니메이션
  mobileMenuToggle.addEventListener('click', () => {
    if (mobileMenu.classList.contains('show')) {
      mobileMenu.style.maxHeight = null;
      mobileMenu.classList.remove('show');
    } else {
      mobileMenu.style.maxHeight = mobileMenu.scrollHeight + "px";
      mobileMenu.classList.add('show');
    }
  });

  // ✅ [복원된 기능 2] 모바일 터치용 hover 효과 추가
  const menuItems = document.querySelectorAll('#mobile-menu .list.nav-item');
  menuItems.forEach(item => {
    item.addEventListener('touchstart', () => {
      // 다른 항목에 있던 효과를 제거하고 현재 항목에만 추가
      menuItems.forEach(i => i.classList.remove('touched'));
      item.classList.add('touched');
    });
  
    // touchend 대신 click 이벤트를 사용하여 페이지 이동 후에도 효과가 남는 문제 방지
    item.addEventListener('click', () => {
      setTimeout(() => {
        item.classList.remove('touched');
      }, 300);
    });
  });

  // --- 초기화 ---
  updateLayout();
});