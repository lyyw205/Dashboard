// 1. 키워드와 콘텐츠 데이터 세트
const keywords = [
    '여행 패키지',
    '플러팅 100% 아이템',
    '용도 외 사용금지 2',
    '용도 외 사용금지 1',
    '추억',
    '이거뭐지',
    '손가락 므훗',
    'MC 뽀뽀권',
    '배민 기프티콘2만원',
    '민수 뽀뽀권',
    '전체이용가',
    '생필품',
    '배민 기프티콘2만원',
    '맥쭈',
    '재환 뽀뽀권',
    'CU 편의점 1만원',
    '두뇌개발',
    '재환 뽀뽀권',
    '너 T야?',
    '민수 뽀뽀권',
    '이거때메 사람죽음'
];

const titleCardKeyword = '★ 히든 상품 ★';


// HTML 문서 로딩이 완료되면 실행
document.addEventListener('DOMContentLoaded', function() {
    
    // --- 타이틀 카드 처리 ---
    const titleCard = document.getElementById('title-card');
    const titleCardBack = document.getElementById('title-card-back');
    
    // 타이틀 카드 뒷면에 히든 키워드 설정
    titleCardBack.textContent = titleCardKeyword;

    // 타이틀 카드에 클릭 이벤트 추가
    titleCard.addEventListener('click', function() {
        titleCard.classList.toggle('is-flipped');
    });


    // --- 일반 카드 생성 ---
    const cardContainer = document.getElementById('card-container');
    
    keywords.forEach((keyword, index) => {
        // 카드 요소들 생성
        const card = document.createElement('div');
        card.className = 'card';

        const cardInner = document.createElement('div');
        cardInner.className = 'card-inner';

        const cardFront = document.createElement('div');
        cardFront.className = 'card-front';
        cardFront.textContent = index + 1; // 앞면에 1부터 시작하는 숫자

        const cardBack = document.createElement('div');
        cardBack.className = 'card-back';
        cardBack.textContent = keyword; // 뒷면에 키워드

        // 생성한 요소들을 조립
        cardInner.appendChild(cardFront);
        cardInner.appendChild(cardBack);
        card.appendChild(cardInner);
        
        // 각 카드에 뒤집기 이벤트 추가
        card.addEventListener('click', function() {
            card.classList.toggle('is-flipped');
        });

        // 완성된 카드를 컨테이너에 추가
        cardContainer.appendChild(card);
    });
});