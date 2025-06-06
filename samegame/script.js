document.addEventListener('DOMContentLoaded', () => {

    // --- 設定 ---
    const COLORS = 5;
    const BLOCK_SIZE = 40; // CSSの--block-sizeと合わせる
    const ANIMATION_DELAY = 300; // CSSのtransition-speedと合わせる

    // ゲームサイズのプリセット
    const SIZES = {
        'small': { rows: 10, cols: 10, name: '標準 (10x10)' },
        'wide': { rows: 8, cols: 15, name: '横長 (8x15)' },
        'large': { rows: 15, cols: 15, name: '大きい (15x15)' }
    };
    let currentSize = 'small';

    // --- DOM要素 ---
    const gameBoardElement = document.getElementById('game-board');
    const scoreElement = document.getElementById('score');
    const previewScoreElement = document.getElementById('preview-score');
    const resetButton = document.getElementById('reset-button');
    const sizeSelectorElement = document.getElementById('size-selector');
    const gameContainer = document.getElementById('game-container');

    // --- ゲームの状態 ---
    let board = []; // 2次元配列でゲーム盤を管理
    let score = 0;
    let blockElements = []; // ブロックのDOM要素を保持
    let isProcessing = false; // 処理中のフラグ

    // --- サイズ選択ボタンの生成 ---
    function createSizeSelector() {
        sizeSelectorElement.innerHTML = '';
        Object.keys(SIZES).forEach(key => {
            const button = document.createElement('button');
            button.textContent = SIZES[key].name;
            button.dataset.size = key;
            if (key === currentSize) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => {
                currentSize = key;
                init();
            });
            sizeSelectorElement.appendChild(button);
        });
    }

    // --- 初期化処理 ---
    function init() {
        isProcessing = true; // 初期化中は操作不可
        const config = SIZES[currentSize];

        // ボードのサイズをCSSに反映
        gameContainer.style.width = `${config.cols * BLOCK_SIZE + 20}px`;
        gameContainer.style.height = `${config.rows * BLOCK_SIZE + 20}px`;
        gameBoardElement.style.width = `${config.cols * BLOCK_SIZE}px`;
        gameBoardElement.style.height = `${config.rows * BLOCK_SIZE}px`;

        gameBoardElement.innerHTML = '';
        board = [];
        blockElements = [];
        score = 0;
        updateScore();
        createSizeSelector(); // サイズボタンを再描画

        // 2次元配列とDOM要素を生成
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

    // --- ボードの描画処理 ---
    function renderBoard() {
        const config = SIZES[currentSize];
        for (let r = 0; r < config.rows; r++) {
            for (let c = 0; c < config.cols; c++) {
                const block = blockElements[r][c];
                const color = board[r][c];

                if (color !== null) {
                    block.className = `block color-${color}`;
                    block.style.transform = `translate(${c * BLOCK_SIZE}px, ${r * BLOCK_SIZE}px)`;
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

        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        
        // 元の座標を保存しておく（データが更新された後も参照するため）
        const originalPos = findOriginalPosition(e.target);
        if (board[originalPos.r][originalPos.c] === null) return;
        
        await handleBlockClick(originalPos.r, originalPos.c);
    });

    gameBoardElement.addEventListener('mouseover', (e) => {
        if (isProcessing || !e.target.classList.contains('block')) return;
        const originalPos = findOriginalPosition(e.target);
        if (board[originalPos.r][originalPos.c] === null) return;
        
        showPreview(originalPos.r, originalPos.c);
    });

    gameBoardElement.addEventListener('mouseout', () => {
        clearPreview();
    });

    resetButton.addEventListener('click', init);

    // --- ゲームロジック ---
    async function handleBlockClick(r, c) {
        const color = board[r][c];
        const connected = findConnectedBlocks(r, c, color);

        if (connected.length < 2) return;
        
        isProcessing = true; // 処理開始
        clearPreview(); // プレビューを消す

        // 1. スコアを計算し、ブロックを消すアニメーション
        score += (connected.length - 2) ** 2;
        updateScore();

        connected.forEach(({r, c}) => {
            blockElements[r][c].classList.add('disappearing');
        });

        // アニメーション完了を待つ
        await new Promise(resolve => setTimeout(resolve, ANIMATION_DELAY));

        // 2. データからブロックを削除
        connected.forEach(({r, c}) => {
            board[r][c] = null;
        });

        // 3. ブロックを落下させ、列を詰める
        dropAndShiftBlocks();

        // 4. 新しい位置にアニメーション付きで再描画
        renderBoard();

        // アニメーション完了を待つ
        await new Promise(resolve => setTimeout(resolve, ANIMATION_DELAY));

        // 5. ゲームオーバー判定
        if (isGameOver()) {
            setTimeout(() => alert(`ゲームオーバー！\n最終スコア: ${score}`), 100);
        }
        
        isProcessing = false; // 処理完了
    }

    // 繋がっているブロックを探す (再帰)
    function findConnectedBlocks(r, c, color, visited = {}) {
        const config = SIZES[currentSize];
        const key = `${r},${c}`;
        if (r < 0 || r >= config.rows || c < 0 || c >= config.cols || board[r][c] !== color || visited[key]) {
            return [];
        }
        visited[key] = true;
        let connected = [{r, c}];
        // 上下左右を探索
        [[r-1,c], [r+1,c], [r,c-1], [r,c+1]].forEach(([nr, nc]) => {
            connected = connected.concat(findConnectedBlocks(nr, nc, color, visited));
        });
        return connected;
    }

    // 落下と列詰めのデータ処理を一度に行う
    function dropAndShiftBlocks() {
        const config = SIZES[currentSize];
        let newBoard = [];
        for (let r = 0; r < config.rows; r++) newBoard.push([]);

        // 空でない列を左から順に新しいボードにコピー
        for (let c = 0; c < config.cols; c++) {
            let newCol = [];
            for (let r = 0; r < config.rows; r++) {
                if (board[r][c] !== null) {
                    newCol.push(board[r][c]);
                }
            }

            if (newCol.length > 0) {
                // 空白を先頭に追加して落下させる
                const emptySlots = config.rows - newCol.length;
                for (let i = 0; i < emptySlots; i++) {
                    newCol.unshift(null);
                }
                // 新しいボードの次の列として追加
                const targetColIndex = newBoard[0].length;
                for (let r = 0; r < config.rows; r++) {
                    newBoard[r][targetColIndex] = newCol[r];
                }
            }
        }
        
        // 残りの空の列をnullで埋める
        const filledCols = newBoard[0].length;
        for (let c = filledCols; c < config.cols; c++) {
            for (let r = 0; r < config.rows; r++) {
                newBoard[r][c] = null;
            }
        }
        board = newBoard;
    }
    
    // ゲームオーバー判定
    function isGameOver() {
        const config = SIZES[currentSize];
        for (let r = 0; r < config.rows; r++) {
            for (let c = 0; c < config.cols; c++) {
                if (board[r][c] !== null) {
                    if ((r > 0 && board[r][c] === board[r-1][c]) || (c > 0 && board[r][c] === board[r][c-1])) {
                        return false; // 消せるブロックがある
                    }
                }
            }
        }
        return true;
    }
    
    // --- スコアプレビュー機能 ---
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
        const config = SIZES[currentSize];
        for (let r = 0; r < config.rows; r++) {
            for (let c = 0; c < config.cols; c++) {
                blockElements[r][c].classList.remove('preview');
            }
        }
        previewScoreElement.textContent = 0;
    }

    // --- ヘルパー関数 ---
    function updateScore() {
        scoreElement.textContent = score;
    }
    
    // DOM要素から元のデータ配列上の座標を見つける
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
