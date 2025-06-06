document.addEventListener('DOMContentLoaded', () => {

    // (設定やDOM要素の取得は変更なし)
    const COLORS = 5;
    const BLOCK_SIZE = 40;
    const ANIMATION_DELAY = 200; // CSSのtransition-speedと合わせる

    const SIZES = {
        'small': { rows: 10, cols: 10, name: '標準 (10x10)' },
        'wide': { rows: 8, cols: 15, name: '横長 (8x15)' },
        'large': { rows: 15, cols: 15, name: '大きい (15x15)' }
    };
    let currentSize = 'small';

    const gameBoardElement = document.getElementById('game-board');
    const scoreElement = document.getElementById('score');
    const previewScoreElement = document.getElementById('preview-score');
    const resetButton = document.getElementById('reset-button');
    const sizeSelectorElement = document.getElementById('size-selector');
    const gameContainer = document.getElementById('game-container'); // この行はもう不要ですが、念のため残します

    let board = [];
    let score = 0;
    let blockElements = [];
    let isProcessing = false;

    // (createSizeSelector関数は変更なし)
    function createSizeSelector() {
        sizeSelectorElement.innerHTML = '';
        Object.keys(SIZES).forEach(key => {
            const button = document.createElement('button');
            button.textContent = SIZES[key].name;
            button.dataset.size = key;
            if (key === currentSize) button.classList.add('active');
            button.addEventListener('click', () => {
                currentSize = key;
                init();
            });
            sizeSelectorElement.appendChild(button);
        });
    }

    function init() {
        isProcessing = true;
        const config = SIZES[currentSize];

        /* --- レイアウト修正 --- */
        // game-containerのサイズ計算を削除。CSSに任せる
        // gameContainer.style.width = ... (削除)
        // gameContainer.style.height = ... (削除)

        // game-boardのサイズは引き続き設定
        gameBoardElement.style.width = `${config.cols * BLOCK_SIZE}px`;
        gameBoardElement.style.height = `${config.rows * BLOCK_SIZE}px`;

        gameBoardElement.innerHTML = '';
        board = [];
        blockElements = [];
        score = 0;
        updateScore();
        createSizeSelector();

        for (let r = 0; r < config.rows; r++) {
            const row = [];
            const elRow = [];
            for (let c = 0; c < config.cols; c++) {
                const color = Math.floor(Math.random() * COLORS);
                row.push(color);
                
                const block = document.createElement('div');
                block.dataset.row = r;
                block.dataset.col = c;
                elRow.push(block);
                gameBoardElement.appendChild(block);
            }
            board.push(row);
            blockElements.push(elRow);
        }
        renderBoard();
        isProcessing = false;
    }

    function renderBoard() {
        const config = SIZES[currentSize];
        for (let r = 0; r < config.rows; r++) {
            for (let c = 0; c < config.cols; c++) {
                const block = blockElements[r][c];
                const color = board[r][c];

                if (color !== null) {
                    block.className = `block color-${color}`;
                    /* --- アニメーション修正 --- */
                    // transformを直接いじるのではなく、CSS変数を設定する
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
    
    // (イベントリスナーや他のゲームロジックは変更なし)
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

    // (handleBlockClick, findConnectedBlocks, dropAndShiftBlocks, isGameOver, 
    // showPreview, clearPreview, updateScore, findOriginalPosition 関数は変更なし)
    
    // ... (変更のない関数は省略) ...
    // 以下、変更のない関数を貼り付けます
    async function handleBlockClick(r, c) {
        const color = board[r][c];
        const connected = findConnectedBlocks(r, c, color);

        if (connected.length < 2) return;
        
        isProcessing = true;
        clearPreview();

        score += (connected.length - 2) ** 2;
        updateScore();

        connected.forEach(({r, c}) => {
            blockElements[r][c].classList.add('disappearing');
        });

        await new Promise(resolve => setTimeout(resolve, ANIMATION_DELAY));

        connected.forEach(({r, c}) => {
            board[r][c] = null;
        });
        
        dropAndShiftBlocks();
        renderBoard();

        await new Promise(resolve => setTimeout(resolve, ANIMATION_DELAY));

        if (isGameOver()) {
            setTimeout(() => alert(`ゲームオーバー！\n最終スコア: ${score}`), 100);
        }
        
        isProcessing = false;
    }

    function findConnectedBlocks(r, c, color, visited = {}) {
        const config = SIZES[currentSize];
        const key = `${r},${c}`;
        if (r < 0 || r >= config.rows || c < 0 || c >= config.cols || board[r][c] !== color || visited[key]) {
            return [];
        }
        visited[key] = true;
        let connected = [{r, c}];
        [[r-1,c], [r+1,c], [r,c-1], [r,c+1]].forEach(([nr, nc]) => {
            connected = connected.concat(findConnectedBlocks(nr, nc, color, visited));
        });
        return connected;
    }

    function dropAndShiftBlocks() {
        const config = SIZES[currentSize];
        let newBoard = [];
        for (let r = 0; r < config.rows; r++) newBoard.push([]);

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
    
    function isGameOver() {
        const config = SIZES[currentSize];
        for (let r = 0; r < config.rows; r++) {
            for (let c = 0; c < config.cols; c++) {
                if (board[r][c] !== null) {
                    if ((r > 0 && board[r][c] === board[r-1][c]) || (c > 0 && board[r][c] === board[r][c-1])) {
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
            connected.forEach(({r, c}) => {
                blockElements[r][c].classList.add('preview');
            });
            previewScoreElement.textContent = (connected.length - 2) ** 2;
        }
    }

    function clearPreview() {
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

    init();
});
