document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentCity = 'aizuwakamatsu';
    let rules = null;
    let currentQuestions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let isAnswering = false;

    // DOM Elements
    const startScreen = document.getElementById('start-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const resultScreen = document.getElementById('result-screen');

    const startBtn = document.getElementById('start-btn');
    const nextBtn = document.getElementById('next-btn');
    const restartBtn = document.getElementById('restart-btn');

    const questionItem = document.getElementById('question-item');
    const optionsContainer = document.getElementById('options-container');
    const progressText = document.getElementById('progress-text');
    const currentScoreDisplay = document.getElementById('current-score');

    const feedbackOverlay = document.getElementById('feedback-overlay');
    const feedbackIcon = document.getElementById('feedback-icon');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackText = document.getElementById('feedback-text');

    const finalScoreDisplay = document.getElementById('final-score-display');
    const totalQuestionsDisplay = document.getElementById('total-questions');
    const resultMessage = document.getElementById('result-message');

    // Initialize
    init();

    async function init() {
        try {
            const response = await fetch(`./api/rules/${currentCity}`);
            rules = await response.json();
            console.log('Rules loaded:', rules);

            // Update title based on city
            document.querySelector('.subtitle').textContent = `${rules.municipality}編`;

            startBtn.addEventListener('click', startQuiz);
            nextBtn.addEventListener('click', nextQuestion);
            restartBtn.addEventListener('click', resetQuiz);

            // Connect to WebSocket server for NFC interactions
            connectWebSocket();

        } catch (error) {
            console.error('Failed to load rules:', error);
            alert('ルールデータの読み込みに失敗しました。');
        }
    }

    // WebSocket Connection
    function connectWebSocket() {
        console.log('Attempting to connect to WebSocket...');
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws`);

        ws.onopen = () => {
            console.log('WebSocket connected');
        };

        ws.onmessage = (event) => {
            console.log('WebSocket raw message received:', event.data);
            try {
                const data = JSON.parse(event.data);
                console.log('WebSocket parsed data:', data);
                if (data.type === 'answer' && data.category) {
                    handleAnswer(data.category);
                }
            } catch (e) {
                console.error('Error processing WebSocket message:', e);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected. Retrying in 3 seconds...');
            setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (err) => {
            console.error('WebSocket error:', err);
            ws.close();
        };
    }

    function startQuiz() {
        score = 0;
        currentQuestionIndex = 0;
        // Shuffle and pick 5 questions
        currentQuestions = shuffleArray([...rules.items]).slice(0, 5);

        updateScoreDisplay();
        showScreen(quizScreen);
        loadQuestion();
    }

    function loadQuestion() {
        feedbackOverlay.classList.add('hidden'); // Ensure feedback is hidden
        isAnswering = false;
        optionsContainer.style.pointerEvents = 'none'; // Disable clicks
        optionsContainer.style.opacity = '0.5'; // Visual feedback

        console.log('Loading question, input disabled');

        // Prevent accidental double-clicks or ghost clicks during transition
        setTimeout(() => {
            isAnswering = true;
            optionsContainer.style.pointerEvents = 'auto';
            optionsContainer.style.opacity = '1';
            console.log('Input enabled');
        }, 500);
        const item = currentQuestions[currentQuestionIndex];

        // Update UI
        questionItem.textContent = item.name;
        progressText.textContent = `Q${currentQuestionIndex + 1} / ${currentQuestions.length}`;

        // Generate Options
        optionsContainer.innerHTML = '';
        const categories = Object.entries(rules.categories);

        // We want to show the correct category + 3 random others (or all if few)
        // For simplicity, let's show all 6 categories or a subset?
        // Aizu has 6 categories. 6 buttons might be too many for mobile grid (3 rows).
        // Let's try showing 4 options: Correct + 3 Random Incorrect

        const correctCategoryKey = item.category;
        const incorrectKeys = Object.keys(rules.categories).filter(k => k !== correctCategoryKey);
        const randomIncorrect = shuffleArray(incorrectKeys).slice(0, 3);
        const optionKeys = shuffleArray([correctCategoryKey, ...randomIncorrect]);

        optionKeys.forEach(key => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = rules.categories[key];
            btn.dataset.key = key;
            btn.addEventListener('click', () => handleAnswer(key));
            optionsContainer.appendChild(btn);
        });
    }

    function handleAnswer(selectedKey) {
        if (!isAnswering) {
            console.log('Answered too early, ignoring');
            return;
        }
        isAnswering = false;

        const currentItem = currentQuestions[currentQuestionIndex];
        const isCorrect = selectedKey === currentItem.category;

        if (isCorrect) {
            score++;
            updateScoreDisplay();
            showFeedback(true, currentItem);
        } else {
            showFeedback(false, currentItem);
        }
    }

    function showFeedback(isCorrect, item) {
        feedbackOverlay.classList.remove('hidden');

        if (isCorrect) {
            feedbackIcon.textContent = '⭕';
            feedbackTitle.textContent = '正解！';
            feedbackTitle.className = 'correct';
        } else {
            feedbackIcon.textContent = '❌';
            feedbackTitle.textContent = '残念...';
            feedbackTitle.className = 'incorrect';
        }

        const categoryName = rules.categories[item.category];
        feedbackText.innerHTML = `
            正解は「<strong>${categoryName}</strong>」です。<br><br>
            ${item.description}<br>
            <span style="font-size:0.9em; color:#777;">💡 ${item.tips}</span>
            <div class="trivia-box">
                <span class="trivia-icon">🎓</span>
                <p class="trivia-text">${item.trivia}</p>
            </div>
        `;
    }

    function nextQuestion() {
        feedbackOverlay.classList.add('hidden');
        currentQuestionIndex++;

        if (currentQuestionIndex < currentQuestions.length) {
            loadQuestion();
        } else {
            showResult();
        }
    }

    function showResult() {
        showScreen(resultScreen);
        finalScoreDisplay.textContent = score;
        totalQuestionsDisplay.textContent = currentQuestions.length;

        const percentage = (score / currentQuestions.length) * 100;
        if (percentage === 100) {
            resultMessage.textContent = '完璧です！ゴミ分別マスター！🏆';
        } else if (percentage >= 80) {
            resultMessage.textContent = '素晴らしい！あと少しでマスターです✨';
        } else if (percentage >= 60) {
            resultMessage.textContent = 'いい感じです！復習して満点を目指そう👍';
        } else {
            resultMessage.textContent = 'まだまだこれから！一緒に学びましょう🔰';
        }
    }

    function resetQuiz() {
        showScreen(startScreen);
    }

    function updateScoreDisplay() {
        currentScoreDisplay.textContent = score;
    }

    function showScreen(screen) {
        [startScreen, quizScreen, resultScreen].forEach(s => {
            s.classList.remove('active');
            s.classList.add('hidden');
        });
        screen.classList.remove('hidden');
        screen.classList.add('active');
    }

    // Utility: Fisher-Yates Shuffle
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
});
