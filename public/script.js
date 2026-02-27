document.addEventListener('DOMContentLoaded', () => {
    // State
    let rules = null;
    let currentQuestions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let isAnswering = false;
    let currentDifficulty = null; // Add difficulty tracking
    let optionKeys = []; // NFC/Keyboard answer options

    // DOM Elements
    const startScreen = document.getElementById('start-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const resultScreen = document.getElementById('result-screen');
    const howToPlayScreen = document.getElementById('how-to-play-screen');

    const kantanBtn = document.getElementById('btn-kantan');
    const muriBtn = document.getElementById('btn-muri');
    const howtoBtn = document.getElementById('btn-howto');
    const backToTitleBtn = document.getElementById('btn-back-to-title');
    const nextBtn = document.getElementById('next-btn');
    const restartBtn = document.getElementById('restart-btn');

    const trashName = document.getElementById('trash-name');
    const trashDetail = document.getElementById('trash-detail');
    const currentQuestionNum = document.getElementById('current-question-num');
    const totalQuestionsNum = document.getElementById('total-questions-num');
    const scoreDisplay = document.getElementById('score-display');

    const feedbackOverlay = document.getElementById('feedback-overlay');
    const feedbackIcon = document.getElementById('feedback-icon');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackText = document.getElementById('feedback-text');

    const finalScoreText = document.getElementById('final-score-text');
    const finalTimeText = document.getElementById('final-time-text');
    const finalRankText = document.getElementById('final-rank-text');
    const backToHomeBtn = document.getElementById('btn-back-to-home');

    const interruptBtn = document.getElementById('btn-interrupt-img');
    const interruptDialog = document.getElementById('interrupt-dialog');
    const interruptYesBtn = document.getElementById('btn-interrupt-yes');
    const interruptNoBtn = document.getElementById('btn-interrupt-no');

    const effectsContainer = document.querySelector('.effects-container');
    const charactersContainer = document.querySelector('.characters-container');
    const judgmentMark = document.getElementById('judgment-mark');
    const explanationBox = document.getElementById('explanation-box');

    // Sound Effects
    const correctSound = new Audio('./sounds/Quiz-Ding_Dong05-1(Fast-Short).mp3');
    const incorrectSound = new Audio('./sounds/Quiz-Buzzer05-1(Mid).mp3');

    // Timer
    let timerInterval = null;
    let startTime = null;
    let totalTime = 0;
    const timerDisplay = document.getElementById('timer-display');
    
    // Screen switching function using class-based approach
    function activateScreen(screenId) {
        // Remove .active-screen from all screens
        [startScreen, quizScreen, resultScreen, howToPlayScreen].forEach(s => {
            s.classList.remove('active-screen');
        });
        
        // Add .active-screen to target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active-screen');
            console.log(`Activated screen: ${screenId}`);
        } else {
            console.error(`Screen not found: ${screenId}`);
        }
    }
    
    // Initialize - set start screen as active
    startScreen.classList.add('active-screen');
    
    init();

    function init() {
        // Event listeners for buttons - Title buttons
        if (kantanBtn) kantanBtn.addEventListener('click', () => {
            console.log('Kantan button clicked');
            loadRulesAndStart('easy');
        });
        if (muriBtn) muriBtn.addEventListener('click', () => {
            console.log('Muri button clicked');
            loadRulesAndStart('normal');
        });
        if (howtoBtn) howtoBtn.addEventListener('click', () => {
            console.log('Howto button clicked');
            activateScreen('how-to-play-screen');
        });
        
        // Back to Title button from How-to-Play screen
        if (backToTitleBtn) {
            backToTitleBtn.addEventListener('click', () => {
                console.log('Back to title button clicked');
                activateScreen('start-screen');
            });
        }
        
        if (nextBtn) nextBtn.addEventListener('click', nextQuestion);
        
        // Next Question button on red explanation box
        const nextQuestionBtn = document.getElementById('btn-next-question');
        if (nextQuestionBtn) {
            nextQuestionBtn.addEventListener('click', handleNextQuestion);
        }
        
        // Back to Home button on result screen
        if (backToHomeBtn) {
            backToHomeBtn.addEventListener('click', () => {
                console.log('Back to home button clicked');
                activateScreen('start-screen');
            });
        }
        
        if (interruptBtn) interruptBtn.addEventListener('click', showInterruptDialog);
        if (interruptYesBtn) interruptYesBtn.addEventListener('click', interruptQuiz);
        if (interruptNoBtn) interruptNoBtn.addEventListener('click', hideInterruptDialog);

        // Keyboard input for NFC/Direct input (1, 2, 3, 4 keys)
        document.addEventListener('keydown', (event) => {
            // Only accept input during quiz screen and when answering
            if (!quizScreen.classList.contains('active') || !isAnswering) {
                return;
            }
            
            const keyNum = parseInt(event.key);
            if (keyNum >= 1 && keyNum <= 4 && keyNum <= optionKeys.length) {
                const selectedKey = optionKeys[keyNum - 1];
                handleAnswer(selectedKey);
            }
        });

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
        activateScreen('quiz-screen');
        loadQuestion();
    }

    function loadQuestion() {
        feedbackOverlay.classList.add('hidden'); // Ensure feedback is hidden
        effectsContainer.classList.add('hidden'); // Hide effects container
        document.getElementById('explanation-red-box').classList.add('hidden'); // Hide explanation box
        document.getElementById('explanation-red-box').classList.add('fade-out'); // Ensure fade-out is applied
        
        // Reset fade-out classes for characters, timer, and button
        charactersContainer.classList.remove('fade-out'); // Show characters for new question
        document.getElementById('timer-display').classList.remove('fade-out'); // Show timer
        document.querySelector('.interrupt-btn-bottom').classList.remove('fade-out'); // Show button
        judgmentMark.classList.remove('fade-out'); // Reset judgment mark
        
        isAnswering = false;

        // Stop previous timer if running
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        // Start timer for this question
        startTime = Date.now();
        timerInterval = setInterval(() => {
            const elapsedTime = (Date.now() - startTime) / 1000; // Convert to seconds
            timerDisplay.textContent = elapsedTime.toFixed(1);
        }, 100); // Update every 100ms

        console.log('Loading question, input disabled');

        // Prevent accidental double-clicks or ghost clicks during transition
        setTimeout(() => {
            isAnswering = true;
            console.log('Input enabled');
        }, 500);
        const item = currentQuestions[currentQuestionIndex];

        // Update UI
        trashName.textContent = item.name;
        trashDetail.textContent = item.detail || rules.categories[item.category] || '';
        currentQuestionNum.textContent = currentQuestionIndex + 1;
        totalQuestionsNum.textContent = currentQuestions.length;

        // Generate answer options (for keyboard/NFC input)
        const correctCategoryKey = item.category;
        const incorrectKeys = Object.keys(rules.categories).filter(k => k !== correctCategoryKey);
        const randomIncorrect = shuffleArray(incorrectKeys).slice(0, 3);
        optionKeys = shuffleArray([correctCategoryKey, ...randomIncorrect]);
        
        console.log('Answer options:', optionKeys.map(k => rules.categories[k]));
    }

    function handleAnswer(selectedKey) {
        if (!isAnswering) {
            console.log('Answered too early, ignoring');
            return;
        }
        isAnswering = false;

        // Stop timer and calculate time for this question
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        const questionTime = (Date.now() - startTime) / 1000; // Convert to seconds
        totalTime += questionTime;

        const currentItem = currentQuestions[currentQuestionIndex];
        const isCorrect = selectedKey === currentItem.category;

        // Show judgement mark
        if (isCorrect) {
            score++;
            updateScoreDisplay();
            judgmentMark.innerHTML = '<div class="mark-correct"></div>';
            // Play correct sound
            correctSound.currentTime = 0;
            correctSound.play();
        } else {
            judgmentMark.innerHTML = '<div class="mark-incorrect">✕</div>';
            // Play incorrect sound
            incorrectSound.currentTime = 0;
            incorrectSound.play();
        }
        effectsContainer.classList.remove('hidden');

        // STEP 2 (約1000ミリ秒後): キャラクター、タイマー、おわるボタンに .fade-out を付与
        setTimeout(() => {
            charactersContainer.classList.add('fade-out');
            document.getElementById('timer-display').classList.add('fade-out');
            document.querySelector('.interrupt-btn-bottom').classList.add('fade-out');
            
            // STEP 3 (約1500ミリ秒後): 赤い解説ブロックを表示
            setTimeout(() => {
                const categoryName_label = isCorrect ? rules.categories[currentItem.category] : '不正解';
                const explanationContent = `
                    正解は「<strong>${rules.categories[currentItem.category]}</strong>」です。<br><br>
                    ${currentItem.description}<br><br>
                    <span style="font-size:0.9em; color:#fff;">💡 ${currentItem.tips}</span><br><br>
                    <strong>📚 豆知識:</strong> ${currentItem.trivia}
                `;
                document.getElementById('explanation-text').innerHTML = explanationContent;
                document.getElementById('explanation-red-box').classList.remove('hidden');
                document.getElementById('explanation-red-box').classList.remove('fade-out');
                
                // STEP 4 (約2000ミリ秒後): 〇×マークを消す
                setTimeout(() => {
                    judgmentMark.classList.add('fade-out');
                }, 500);
            }, 500);
        }, 1000);
    }

    function showFeedback(isCorrect, item) {
        effectsContainer.classList.add('hidden'); // Hide effects
        charactersContainer.classList.add('hidden'); // Hide characters when showing feedback
        document.querySelector('.layer-front-ui').classList.add('hidden'); // Hide timer and button
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

        const categoryName_label = rules.categories[item.category];
        
        // Display brief message in feedback overlay
        feedbackText.innerHTML = `
            正解は「<strong>${categoryName_label}</strong>」です。<br><br>
            ${item.description}<br><br>
            <span style="font-size:0.9em; color:#666;">💡 ${item.tips}</span><br><br>
            <strong>📚 豆知識:</strong> ${item.trivia}
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
    
    function handleNextQuestion() {
        // Hide red explanation box with fade-out
        document.getElementById('explanation-red-box').classList.add('fade-out');
        
        // Show characters, timer, and interrupt button by removing fade-out class
        charactersContainer.classList.remove('fade-out');
        document.getElementById('timer-display').classList.remove('fade-out');
        document.querySelector('.interrupt-btn-bottom').classList.remove('fade-out');
        
        // Move to next question
        currentQuestionIndex++;
        
        if (currentQuestionIndex < currentQuestions.length) {
            loadQuestion();
        } else {
            showResult();
        }
    }

    function showResult() {
        activateScreen('result-screen');
        
        // Calculate score (10 points per correct answer)
        const totalScore = score * 10;
        const maxScore = currentQuestions.length * 10;
        
        // Display score
        document.getElementById('final-score-value').textContent = totalScore;
        
        // Display time (convert to fixed decimal)
        document.getElementById('final-time-value').textContent = `${totalTime.toFixed(1)}`;
        
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
        finalRankText.textContent = rank;
    }

    function resetQuiz() {
        // Reset quiz state
        score = 0;
        currentQuestionIndex = 0;
        totalTime = 0;
        isAnswering = false;
        currentDifficulty = null;
        
        // Stop timer
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        // Clear question data
        currentQuestions = [];
        optionKeys = [];
        
        // Go to title screen
        activateScreen('start-screen');
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
            activateScreen('start-screen');
        }
    }

    function showHowToPlay() {
        activateScreen('how-to-play-screen');
    }

    function backToTitle() {
        timerInterval && clearInterval(timerInterval);
        activateScreen('start-screen');
    }

    function showInterruptDialog() {
        interruptDialog.style.display = 'flex';
    }

    function hideInterruptDialog() {
        interruptDialog.style.display = 'none';
    }

    function interruptQuiz() {
        // Hide dialog first
        hideInterruptDialog();
        
        // Reset all quiz state
        score = 0;
        currentQuestionIndex = 0;
        totalTime = 0;
        isAnswering = false;
        currentDifficulty = null;
        
        // Stop timer
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        // Clear question data
        currentQuestions = [];
        optionKeys = [];
        
        // Go to title screen
        activateScreen('start-screen');
    }

    function updateScoreDisplay() {
        scoreDisplay.textContent = `スコア: ${score}`;
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
