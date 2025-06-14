document.addEventListener('DOMContentLoaded', () => {
    // --- サウンドエンジン ---
    const sound = {
        audioContext: null, bgmInterval: null, masterVolume: 0.3,
        init: async function() { if (!this.audioContext) try { this.audioContext = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { console.error("Web Audio API not supported."); return; } if (this.audioContext.state === 'suspended') await this.audioContext.resume(); },
        _playTone: function(freq, type, dur, vol = 1) { if (!this.audioContext || this.audioContext.state !== 'running') return; const osc = this.audioContext.createOscillator(), gain = this.audioContext.createGain(); osc.connect(gain); gain.connect(this.audioContext.destination); osc.type = type; osc.frequency.setValueAtTime(freq, this.audioContext.currentTime); gain.gain.setValueAtTime(vol * this.masterVolume, this.audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + dur); osc.start(); osc.stop(this.audioContext.currentTime + dur); },
        startBgm: function() { if (this.bgmInterval) clearInterval(this.bgmInterval); if (!this.audioContext || this.audioContext.state !== 'running') return; const notes = [261.63, 329.63, 392.00, 440.00]; let i = 0; this.bgmInterval = setInterval(() => { this._playTone(notes[i++ % notes.length], 'triangle', 0.1, 0.4); }, 150); },
        stopBgm: function() { if (this.bgmInterval) clearInterval(this.bgmInterval); this.bgmInterval = null; },
        playStart: function() { this._playTone(261.63, 'square', 0.2, 0.7); },
        playCorrect: function() { this._playTone(523.25, 'sine', 0.2, 0.8); },
        playWrong: function() { this._playTone(130.81, 'sawtooth', 0.4, 0.6); },
        playStageClear: function() { this._playTone(1046.50, 'triangle', 0.4, 0.7); }
    };

    // --- DOM要素 ---
    const dom = {
        screens: { title: document.getElementById('title-screen'), game: document.getElementById('game-screen'), stageClear: document.getElementById('stage-clear-screen'), gameOver: document.getElementById('game-over-screen'), ending: document.getElementById('ending-screen'), },
        difficultyButtons: document.querySelectorAll('#difficulty-selection .menu-button'),
        categorySelect: document.getElementById('category-selection'),
        startButton: document.getElementById('start-button'),
        stageDisplay: document.getElementById('stage-display'),
        progressDisplay: document.getElementById('progress-display'),
        totalStagesDisplay: document.getElementById('total-stages-display'),
        perStageDisplay: document.getElementById('per-stage-display'),
        questionText: document.getElementById('question-text'),
        answerOptions: document.getElementById('answer-options'),
        nextStageButton: document.getElementById('next-stage-button'),
        retryButton: document.getElementById('retry-button'),
        backToTitleButton: document.getElementById('back-to-title-button'),
        timerBar: document.getElementById('timer-bar'),
        livesDisplay: document.getElementById('lives-display'),
    };

    // --- ゲーム状態変数 ---
    const state = {
        currentStage: 1, totalStages: 5, questionsPerStage: 5,
        correctInStage: 0, currentQuestionIndexInStage: 0,
        difficulty: 'normal', category: 'all',
        availableQuestions: [], stageQuestions: [],
        timer: null,
        totalLives: 3,
        mistakesThisStage: 0,
    };

    // --- メイン関数 ---
    const shuffleArray = (array) => { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array; };
    const showScreen = (screenName) => { Object.values(dom.screens).forEach(s => s.classList.remove('active')); if (dom.screens[screenName]) dom.screens[screenName].classList.add('active'); };
    
    const updateHUD = () => {
        dom.livesDisplay.textContent = state.totalLives > 0 ? '❤️'.repeat(state.totalLives) : '💔';
        dom.stageDisplay.textContent = state.currentStage;
        dom.progressDisplay.textContent = state.correctInStage;
        dom.totalStagesDisplay.textContent = state.totalStages;
        dom.perStageDisplay.textContent = state.questionsPerStage;
    };

    const stopTimer = () => { if (state.timer) clearInterval(state.timer); state.timer = null; };

    const startTimer = () => {
        stopTimer();
        const timeLimits = { easy: 10, normal: 7, hard: 5 };
        let timeLeft = timeLimits[state.difficulty];
        const totalTime = timeLeft;
        dom.timerBar.style.width = '100%';
        dom.timerBar.style.transition = 'none';

        state.timer = setInterval(() => {
            timeLeft -= 0.01;
            dom.timerBar.style.width = `${(timeLeft / totalTime) * 100}%`;
            dom.timerBar.style.transition = 'width 0.01s linear';
            if (timeLeft <= 0) {
                stopTimer();
                handleAnswer(null, false, true);
            }
        }, 10);
    };

    const isGameOver = () => {
        if (state.totalLives <= 0) return true;
        const maxMistakesAllowed = (state.currentStage <= 2) ? 2 : 1;
        if (state.mistakesThisStage > maxMistakesAllowed) return true;
        return false;
    };

    const displayQuestion = () => {
        const question = state.stageQuestions[state.currentQuestionIndexInStage];
        if (!question) { gameOver(); return; }
        dom.questionText.textContent = question.question;
        dom.answerOptions.innerHTML = '';
        const answersWithOriginal = question.answers.map((ans, i) => ({ text: ans, isCorrect: i === question.correctIndex }));
        shuffleArray(answersWithOriginal).forEach(ansObj => {
            const button = document.createElement('button');
            button.classList.add('answer-button');
            button.textContent = ansObj.text;
            button.onclick = () => handleAnswer(button, ansObj.isCorrect, false);
            dom.answerOptions.appendChild(button);
        });
        startTimer();
    };

    const handleAnswer = (button, isCorrect, isTimeUp) => {
        stopTimer();
        document.querySelectorAll('.answer-button').forEach(btn => { btn.disabled = true; });

        if (isCorrect) {
            sound.playCorrect();
            button.classList.add('correct');
            state.correctInStage++;
        } else {
            sound.playWrong();
            if (button) button.classList.add('wrong');
            const correctText = state.stageQuestions[state.currentQuestionIndexInStage].answers[state.stageQuestions[state.currentQuestionIndexInStage].correctIndex];
            document.querySelectorAll('.answer-button').forEach(btn => { if (btn.textContent === correctText) btn.classList.add('correct'); });
            state.totalLives--;
            state.mistakesThisStage++;
        }
        updateHUD();
        setTimeout(proceedToNextStep, 1500);
    };

    const proceedToNextStep = () => {
        if (isGameOver()) { gameOver(); return; }
        if (state.correctInStage >= state.questionsPerStage) { stageClear(); return; }
        
        state.currentQuestionIndexInStage++;
        if (state.currentQuestionIndexInStage >= state.stageQuestions.length) { gameOver(); return; }
        
        displayQuestion();
    };

    const stageClear = () => {
        sound.playStageClear();
        if (state.currentStage >= state.totalStages) {
            showScreen('ending');
            sound.stopBgm();
        } else {
            showScreen('stageClear');
        }
    };

    const gameOver = () => {
        showScreen('gameOver');
        sound.stopBgm();
    };

    const prepareStage = () => {
        state.correctInStage = 0;
        state.currentQuestionIndexInStage = 0;
        state.mistakesThisStage = 0;
        
        const stageDifficultyMap = { 1: [1,2], 2: [2,3], 3: [3,4], 4: [4,5], 5: [5] };
        const targetDifficulties = stageDifficultyMap[state.currentStage];
        
        const questionsNeededForStage = 10;
        
        let questionsForStage = state.availableQuestions.filter(q => targetDifficulties.includes(q.difficulty));
        if (questionsForStage.length < questionsNeededForStage) {
            const needed = questionsNeededForStage - questionsForStage.length;
            const remaining = state.availableQuestions.filter(q => !questionsForStage.includes(q));
            questionsForStage.push(...shuffleArray(remaining).slice(0, needed));
        }
        
        state.stageQuestions = shuffleArray(questionsForStage).slice(0, questionsNeededForStage);
        state.availableQuestions = state.availableQuestions.filter(q => !state.stageQuestions.includes(q));

        if(state.stageQuestions.length === 0) {
            alert('出題できる問題がありません！カテゴリや難易度の設定を見直してください。');
            showScreen('title');
            sound.stopBgm();
            return;
        }

        updateHUD();
        displayQuestion();
        showScreen('game');
    };
    
    const handleNextStageButton = async () => {
        await sound.init();
        if (state.currentStage < state.totalStages) {
            state.currentStage++;
            prepareStage();
        }
    };
    
    const startGame = async () => {
        await sound.init();
        sound.playStart();
        sound.startBgm();

        state.currentStage = 1;
        state.totalLives = 3;
        
        let filteredQuestions = allQuestions;
        if (state.category !== 'all') filteredQuestions = allQuestions.filter(q => q.category === state.category);
        const difficultyMap = { easy: [1, 2, 3], normal: [2, 3, 4, 5], hard: [3, 4, 5] };
        state.availableQuestions = shuffleArray(filteredQuestions.filter(q => difficultyMap[state.difficulty].includes(q.difficulty)));

        const totalQuestionsNeeded = 25;
        if (state.availableQuestions.length < totalQuestionsNeeded) {
            alert(`問題数が足りません！この設定では${state.availableQuestions.length}問しかありません。`);
            sound.stopBgm();
            return;
        }

        prepareStage();
    };

    const populateCategories = () => {
        if (typeof allQuestions === 'undefined' || allQuestions.length === 0) {
            console.error("`allQuestions` is not defined or is empty. Make sure `questions.js` is loaded correctly before `script.js`.");
            return;
        }
        const categories = [...new Set(allQuestions.map(q => q.category))];
        categories.forEach(c => { const opt = document.createElement('option'); opt.value = c; opt.textContent = c.toUpperCase(); dom.categorySelect.appendChild(opt); });
    };

    const init = () => {
        dom.difficultyButtons.forEach(b => b.onclick = () => { dom.difficultyButtons.forEach(btn => btn.classList.remove('selected')); b.classList.add('selected'); state.difficulty = b.dataset.difficulty; });
        dom.categorySelect.onchange = () => { state.category = dom.categorySelect.value; };
        
        dom.startButton.onclick = startGame;
        dom.nextStageButton.onclick = handleNextStageButton;
        dom.retryButton.onclick = () => { showScreen('title'); sound.stopBgm(); };
        dom.backToTitleButton.onclick = () => { showScreen('title'); sound.stopBgm(); };
        
        populateCategories();
        showScreen('title');
    };

    init();
});