// main.js

document.addEventListener('DOMContentLoaded', function() {
    const titleKeywordInput = document.getElementById('title-keyword');
    const keywordsInput = document.getElementById('keywords-input');
    const createBtn = document.getElementById('create-board-btn');
    const answerSheet = document.getElementById('answer-sheet');

    createBtn.addEventListener('click', function() {
        // 1. 입력된 키워드 가져오기
        const titleKeyword = titleKeywordInput.value.trim();
        const keywords = keywordsInput.value.trim().split('\n')
                                         .filter(keyword => keyword.trim() !== ''); // 빈 줄은 제거

        if (keywords.length === 0) {
            alert('일반 경품 키워드를 한 개 이상 입력해주세요.');
            return;
        }

        // 2. 키워드 배열을 랜덤으로 섞기 (Fisher-Yates Shuffle 알고리즘)
        const shuffledKeywords = [...keywords]; // 원본 배열 복사
        for (let i = shuffledKeywords.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledKeywords[i], shuffledKeywords[j]] = [shuffledKeywords[j], shuffledKeywords[i]];
        }

        // 3. 브라우저 임시 저장소(sessionStorage)에 데이터 저장
        // 새 창에 데이터를 전달하는 가장 안정적인 방법
        sessionStorage.setItem('titleKeyword', titleKeyword);
        sessionStorage.setItem('keywords', JSON.stringify(shuffledKeywords)); // 배열은 JSON 문자열로 변환

        // 4. 새로운 창으로 뽑기판(board.html) 열기
        window.open('board.html', '_blank');

        // 5. 현재 창에 정답 리스트 표시
        answerSheet.innerHTML = '<h2>★ 경품 결과 ★</h2>';
        const resultList = document.createElement('ul');
        shuffledKeywords.forEach((keyword, index) => {
            const listItem = document.createElement('li');
            listItem.textContent = `${index + 1}번: ${keyword}`;
            resultList.appendChild(listItem);
        });
        answerSheet.appendChild(resultList);
    });
});