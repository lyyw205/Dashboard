document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');

  // 사이드바 요소가 없으면 실행하지 않음 (안전장치)
  if (!sidebar || !toggleBtn) return;

  // ✅ 모바일 진입 시 기본 접힘 상태로 설정
  if (window.innerWidth <= 768) {
    sidebar.classList.add('collapsed');
  }

  // ✅ 햄버거 버튼 클릭 시 collapsed 토글 (PC/모바일 공통)
  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });

  // ✅ 브라우저 창 크기 변경 시 모바일로 진입하면 자동 접힘
  window.addEventListener('resize', () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.add('collapsed');
    }
  });
});
