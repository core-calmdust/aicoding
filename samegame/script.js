document.addEventListener('DOMContentLoaded', () => {

    // --- 設定 ---
    const BLOCK_SIZE = 40;
    const ANIMATION_DELAY = 200;

    const SIZES = {
        'small': { rows: 10, cols: 10, name: '10x10' },
        'wide': { rows: 8, cols: 15, name: '8x15' },
        'large': { rows: 15, cols: 15, name: '15x15' }
    };
    let currentSize = 'wide';
    let currentColors = 4; // デフォルトの色数

    // --- DOM要素 ---
    const gameBoardElement = document.getElementById('game-board');
    const scoreElement = document.getElementById('score');
    const previewScoreElement = document.getElementById('preview-score');
    const resetButton = document.getElementById('reset-button');
    const sizeSelectorElement = document.getElementById('size-selector');
    const colorSelectorElement = document.getElementById('color-selector');
    const fireworksCanvas = document.getElementById('fireworks-canvas');
    const myConfetti = confetti.create(fireworksCanvas, { resize: true });
    
    // --- ゲームの状態 ---
    let board = [], score = 0, blockElements = [], isProcessing = false;

    // --- UI生成 ---
    function createSizeSelector() {
        sizeSelectorElement.innerHTML = '';
        Object.keys(SIZES).forEach(key => {
            const button = document.createElement('button');
            button.textContent = SIZES[key].name;
            if (key === currentSize) button.classList.add('active');
            button.addEventListener('click', () => {
                currentSize = key;
                init();
            });
            sizeSelectorElement.appendChild(button);
        });
    }

    function createColorSelector() {
        colorSelectorElement.innerHTML = '';
        for (let i = 3; i <= 6; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            if (i === currentColors) button.classList.add('active');
            button.addEventListener('click', () => {
                currentColors = i;
                init();
            });
            colorSelectorElement.appendChild(button);
        }
    }

    // --- 初期化処理 ---
    function init() {
        isProcessing = true;
        const config = SIZES[currentSize];

        gameBoardElement.style.width = `${config.cols * BLOCK_SIZE}px`;
        gameBoardElement.style.height = `${config.rows * BLOCK_SIZE}px`;

        gameBoardElement.innerHTML = '';
        board = [], blockElements = [], score = 0;
        updateScore();
        clearPreview();
        
        createSizeSelector();
        createColorSelector();

        for (let r = 0; r < config.rows; r++) {
            const row = [], elRow = [];
            for (let c = 0; c < config.cols; c++) {
                const color = Math.floor(Math.random() * currentColors);
                row.push(color);
                
                const block = document.createElement('div');
                block.dataset.row = r, block.dataset.col = c;
                elRow.push(block);
                gameBoardElement.appendChild(block);
            }
            board.push(row), blockElements.push(elRow);
        }
        renderBoard();
        isProcessing = false;
    }

    // --- ボード描画処理 ---
    function renderBoard() {
        const config = SIZES[currentSize];
        for (let r = 0; r < config.rows; r++) {
            for (let c = 0; c < config.cols; c++) {
                const block = blockElements[r][c];
                const color = board[r][c];
                if (color !== null) {
                    block.className = `block color-${color}`;
                    block.style.setProperty('--x', `${c * BLOCK_SIZE}px`);
                    block.style.setProperty('--y', `${r * BLOCK_SIZE}px`);
                    block.style.opacity = 1;
                } else {
                    block.className = 'block';
                    block.style.opacity = 0;
                }
            }
        }
    }

    // --- イベントリスナー ---
    gameBoardElement.addEventListener('click', async (e) => {
        if (isProcessing || !e.target.classList.contains('block')) return;
        const originalPos = findOriginalPosition(e.target);
        if (!originalPos || board[originalPos.r][originalPos.c] === null) return;
        await handleBlockClick(originalPos.r, originalPos.c);
    });

    gameBoardElement.addEventListener('mouseover', (e) => {
        if (isProcessing || !e.target.classList.contains('block')) return;
        const originalPos = findOriginalPosition(e.target);
        if (!originalPos || board[originalPos.r][originalPos.c] === null) return;
        showPreview(originalPos.r, originalPos.c);
    });

    gameBoardElement.addEventListener('mouseout', clearPreview);
    resetButton.addEventListener('click', init);

    // --- ゲームロジック ---
    async function handleBlockClick(r, c) {
        const color = board[r][c];
        const connected = findConnectedBlocks(r, c, color);
        if (connected.length < 2) return;

        isProcessing = true;
        clearPreview();

        score += (connected.length - 2) ** 2;
        updateScore();
        connected.forEach(({ r, c }) => {
            blockElements[r][c].classList.add('disappearing');
        });
        await new Promise(resolve => setTimeout(resolve, ANIMATION_DELAY));

        connected.forEach(({ r, c }) => {
            board[r][c] = null;
        });

        dropAndShiftBlocks();
        renderBoard();
        await new Promise(resolve => setTimeout(resolve, ANIMATION_DELAY));

        if (isAllBlocksCleared()) {
            launchFireworks(); // 花火を打ち上げ！
            const bonus = 1000;
            score += bonus;
            updateScore();
            setTimeout(() => alert(`パーフェクト！\nボーナス ${bonus} 点獲得！\n最終スコア: ${score}`), 2000);
        } else if (isGameOver()) {
            setTimeout(() => alert(`ゲームオーバー！\n最終スコア: ${score}`), 100);
        }
        
        isProcessing = false;
    }

    function launchFireworks() {
        const fire = (particleRatio, opts) => {
            myConfetti(Object.assign({}, {
                origin: { y: 0.7 }
            }, opts, {
                particleCount: Math.floor(200 * particleRatio)
            }));
        };

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });

        setTimeout(() => {
            fire(0.3, { spread: 80, startVelocity: 60, decay: 0.9, scalar: 0.9 });
        }, 500);
    }

    function findConnectedBlocks(r, c, color, visited = {}) {
        const config = SIZES[currentSize];
        const key = `${r},${c}`;
        if (r < 0 || r >= config.rows || c < 0 || c >= config.cols || board[r][c] !== color || visited[key]) {
            return [];
        }
        visited[key] = true;
        let connected = [{ r, c }];
        [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([nr, nc]) => {
            connected = connected.concat(findConnectedBlocks(nr, nc, color, visited));
        });
        return connected;
    }

    function dropAndShiftBlocks() {
        const config = SIZES[currentSize];
        let newBoard = Array(config.rows).fill(0).map(() => []);

        for (let c = 0; c < config.cols; c++) {
            let newCol = [];
            for (let r = 0; r < config.rows; r++) {
                if (board[r][c] !== null) {
                    newCol.push(board[r][c]);
                }
            }

            if (newCol.length > 0) {
                const emptySlots = config.rows - newCol.length;
                for (let i = 0; i < emptySlots; i++) {
                    newCol.unshift(null);
                }
                const targetColIndex = newBoard[0].length;
                for (let r = 0; r < config.rows; r++) {
                    newBoard[r][targetColIndex] = newCol[r];
                }
            }
        }
        
        const filledCols = newBoard[0].length;
        for (let c = filledCols; c < config.cols; c++) {
            for (let r = 0; r < config.rows; r++) {
                newBoard[r][c] = null;
            }
        }
        board = newBoard;
    }
    
    function isAllBlocksCleared() {
        return board.every(row => row.every(cell => cell === null));
    }
    
    function isGameOver() {
        const config = SIZES[currentSize];
        for (let r = 0; r < config.rows; r++) {
            for (let c = 0; c < config.cols; c++) {
                if (board[r][c] !== null) {
                    if ((r > 0 && board[r][c] === board[r - 1][c]) ||
                        (c > 0 && board[r][c] === board[r][c - 1])) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    
    function showPreview(r, c) {
        const color = board[r][c];
        if (color === null) return;
        
        const connected = findConnectedBlocks(r, c, color);
        if (connected.length >= 2) {
            connected.forEach(({ r, c }) => {
                blockElements[r][c].classList.add('preview');
            });
            previewScoreElement.textContent = (connected.length - 2) ** 2;
        }
    }

    function clearPreview() {
        if (blockElements.length === 0) return;
        blockElements.flat().forEach(block => block.classList.remove('preview'));
        previewScoreElement.textContent = 0;
    }

    function updateScore() {
        scoreElement.textContent = score;
    }
    
    function findOriginalPosition(element) {
        const config = SIZES[currentSize];
        for (let r = 0; r < config.rows; r++) {
            for (let c = 0; c < config.cols; c++) {
                if (blockElements[r][c] === element) {
                    return { r, c };
                }
            }
        }
        return null;
    }

    // --- ゲーム開始 ---
    init();
});
