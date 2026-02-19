document.addEventListener('DOMContentLoaded', () => {
    // State
    let rules = null;
    let currentQuestions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let isAnswering = false;
    let currentDifficulty = null; // Add difficulty tracking

    // DOM Elements
    const startScreen = document.getElementById('start-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const resultScreen = document.getElementById('result-screen');
    const howToPlayScreen = document.getElementById('how-to-play-screen');

    const easyBtn = document.getElementById('btn-easy');
    const normalBtn = document.getElementById('btn-normal');
    const howToPlayBtn = document.getElementById('btn-how-to-play');
    const backToTitleBtn = document.getElementById('btn-back-to-title');
    const nextBtn = document.getElementById('next-btn');
    const restartBtn = document.getElementById('restart-btn');
    const playAgainBtn = document.getElementById('btn-play-again');

    const questionItem = document.getElementById('question-item');
    const optionsContainer = document.getElementById('options-container');
    const progressText = document.getElementById('progress-text');
    const currentScoreDisplay = document.getElementById('current-score');

    const feedbackOverlay = document.getElementById('feedback-overlay');
    const feedbackIcon = document.getElementById('feedback-icon');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackText = document.getElementById('feedback-text');

    const resultRank = document.getElementById('result-rank');
    const resultScore = document.getElementById('result-score');
    const resultTime = document.getElementById('result-time');
    const returnTitleBtn = document.getElementById('btn-return-title');

    const interruptBtn = document.getElementById('btn-interrupt');
    const interruptDialog = document.getElementById('interrupt-dialog');
    const interruptYesBtn = document.getElementById('btn-interrupt-yes');
    const interruptNoBtn = document.getElementById('btn-interrupt-no');

    const judgementOverlay = document.getElementById('judgement-overlay');
    const judgementSymbol = document.getElementById('judgement-symbol');

    // Sound Effects
    const correctSound = new Audio('./sounds/Quiz-Ding_Dong05-1(Fast-Short).mp3');
    const incorrectSound = new Audio('./sounds/Quiz-Buzzer05-1(Mid).mp3');

    // Timer
    let timerInterval = null;
    let startTime = null;
    let totalTime = 0;
    const timerDisplay = document.getElementById('timer-display');
    init();

    function init() {
        // Event listeners for buttons
        easyBtn.addEventListener('click', () => loadRulesAndStart('easy'));
        normalBtn.addEventListener('click', () => loadRulesAndStart('normal'));
        howToPlayBtn.addEventListener('click', showHowToPlay);
        backToTitleBtn.addEventListener('click', backToTitle);
        nextBtn.addEventListener('click', nextQuestion);
        returnTitleBtn.addEventListener('click', resetQuiz);
        playAgainBtn.addEventListener('click', playAgain);
        interruptBtn.addEventListener('click', showInterruptDialog);
        interruptYesBtn.addEventListener('click', interruptQuiz);
        interruptNoBtn.addEventListener('click', hideInterruptDialog);

        // Connect to WebSocket server for NFC interactions
        connectWebSocket();
    }

    async function loadRulesAndStart(difficulty) {
        try {
            currentDifficulty = difficulty; // Save current difficulty
            const response = await fetch(`./api/rules/${difficulty}`);
            rules = await response.json();
            console.log('Rules loaded:', rules);

            // Update title based on city
            //document.querySelector('.subtitle').textContent = `${rules.municipality}編`;

            startQuiz();
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
        totalTime = 0; // Reset total time
        // Shuffle and pick 5 questions
        currentQuestions = shuffleArray([...rules.items]).slice(0, 5);

        updateScoreDisplay();
        showScreen(quizScreen);
        loadQuestion();
    }

    function loadQuestion() {
        feedbackOverlay.classList.add('hidden'); // Ensure feedback is hidden
        judgementOverlay.classList.add('hidden'); // Hide judgement overlay
        isAnswering = false;
        optionsContainer.style.pointerEvents = 'none'; // Disable clicks
        optionsContainer.style.opacity = '0.5'; // Visual feedback

        // Stop previous timer if running
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        // Start timer for this question
        startTime = Date.now();
        timerInterval = setInterval(() => {
            const elapsedTime = (Date.now() - startTime) / 1000; // Convert to seconds
            timerDisplay.textContent = `タイム: ${elapsedTime.toFixed(1)}秒`;
        }, 100); // Update every 100ms

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
        optionsContainer.style.pointerEvents = 'none'; // Disable further clicks

        // Stop timer and calculate time for this question
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        const questionTime = (Date.now() - startTime) / 1000; // Convert to seconds
        totalTime += questionTime;

        const currentItem = currentQuestions[currentQuestionIndex];
        const isCorrect = selectedKey === currentItem.category;

        // Show judgement symbol
        if (isCorrect) {
            score++;
            updateScoreDisplay();
            judgementSymbol.textContent = '⭕'; // Circle
            judgementOverlay.classList.remove('incorrect');
            judgementOverlay.classList.add('correct');
            // Play correct sound
            correctSound.currentTime = 0;
            correctSound.play();
        } else {
            judgementSymbol.textContent = '✕'; // Cross
            judgementOverlay.classList.remove('correct');
            judgementOverlay.classList.add('incorrect');
            // Play incorrect sound
            incorrectSound.currentTime = 0;
            incorrectSound.play();
        }
        judgementOverlay.classList.remove('hidden');

        // Wait 1.5 seconds then show feedback
        setTimeout(() => {
            showFeedback(isCorrect, currentItem);
        }, 1500);
    }

    function showFeedback(isCorrect, item) {
        judgementOverlay.classList.add('hidden'); // Hide judgement symbol
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
        
        // Calculate score (10 points per correct answer)
        const totalScore = score * 10;
        const maxScore = currentQuestions.length * 10;
        
        // Display score: "〇点（〇問中〇問正解）"
        resultScore.textContent = `${totalScore}点`;
        
        // Display time (convert to fixed decimal)
        resultTime.textContent = `${totalTime.toFixed(1)}秒`;
        
        // Calculate rank based on percentage
        const percentage = (score / currentQuestions.length) * 100;
        let rank = '';
        if (percentage === 100) {
            rank = 'Sランク 🏆';
        } else if (percentage >= 70) {
            rank = 'Aランク 🌟';
        } else if (percentage >= 40) {
            rank = 'Bランク 👍';
        } else {
            rank = 'Cランク 🔰';
        }
        resultRank.textContent = rank;
    }

    function resetQuiz() {
        showScreen(startScreen);
    }

    function playAgain() {
        // Reset score and timer
        score = 0;
        totalTime = 0;
        currentQuestionIndex = 0;
        
        // Clear timer if running
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        // Restart with the same difficulty
        if (currentDifficulty) {
            loadRulesAndStart(currentDifficulty);
        } else {
            // Fallback to title screen if no difficulty was saved
            showScreen(startScreen);
        }
    }

    function showHowToPlay() {
        showScreen(howToPlayScreen);
    }

    function backToTitle() {
        showScreen(startScreen);
    }

    function showInterruptDialog() {
        interruptDialog.style.display = 'flex';
    }

    function hideInterruptDialog() {
        interruptDialog.style.display = 'none';
    }

    function interruptQuiz() {
        hideInterruptDialog();
        resetQuiz();
    }

    function updateScoreDisplay() {
        currentScoreDisplay.textContent = score;
    }

    function showScreen(screen) {
        [startScreen, quizScreen, resultScreen, howToPlayScreen].forEach(s => {
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
