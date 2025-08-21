// board.js

document.addEventListener('DOMContentLoaded', function() {
    // 1. 브라우저 임시 저장소에서 데이터 가져오기
    const titleKeyword = sessionStorage.getItem('titleKeyword') || '★ 히든 상품 ★';
    const keywordsJSON = sessionStorage.getItem('keywords');
    const keywords = keywordsJSON ? JSON.parse(keywordsJSON) : [];

    // --- 타이틀 카드 처리 ---
    const titleCard = document.getElementById('title-card');
    const titleCardBack = document.getElementById('title-card-back');
    
    titleCardBack.textContent = titleKeyword;
    titleCard.addEventListener('click', function() {
        titleCard.classList.toggle('is-flipped');
    });

    // --- 일반 카드 생성 ---
    const cardContainer = document.getElementById('card-container');
    
    keywords.forEach((keyword, index) => {
        const card = document.createElement('div');
        card.className = 'flippable item-card';

        const cardInner = document.createElement('div');
        cardInner.className = 'flippable-inner';

        const cardFront = document.createElement('div');
        cardFront.className = 'flippable-front';
        cardFront.textContent = index + 1;

        const cardBack = document.createElement('div');
        cardBack.className = 'flippable-back';
        cardBack.textContent = keyword;

        cardInner.appendChild(cardFront);
        cardInner.appendChild(cardBack);
        card.appendChild(cardInner);
        
        card.addEventListener('click', function() {
            card.classList.toggle('is-flipped');
        });

        cardContainer.appendChild(card);
    });
});