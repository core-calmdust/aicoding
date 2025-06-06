document.addEventListener('DOMContentLoaded', () => {
    // --- 定数とDOM要素 ---
    const SIZE = 9;
    const gridElement = document.getElementById('sudoku-grid');
    const newGameBtn = document.getElementById('new-game-btn');
    const checkSolutionBtn = document.getElementById('check-solution-btn');
    const showSolutionBtn = document.getElementById('show-solution-btn');
    const messageElement = document.getElementById('message');
    const difficultySelect = document.getElementById('difficulty-select');
    const memoToggleBtn = document.getElementById('memo-toggle-btn');

    // --- ゲームの状態変数 ---
    let board = [], initialBoard = [], solution = [], memos = [];
    let selectedCell = null;
    let isMemoMode = false;
    let errorCells = new Set();
    let focusedNumberInfo = null;

    // --- 初期化とゲーム開始 ---
    function initializeGame() {
        const difficulty = parseInt(difficultySelect.value, 10);
        
        board = Array(SIZE).fill(0).map(() => Array(SIZE).fill(0));
        solveSudoku(board);
        solution = JSON.parse(JSON.stringify(board));

        let empties = difficulty;
        while (empties > 0) {
            const row = Math.floor(Math.random() * SIZE);
            const col = Math.floor(Math.random() * SIZE);
            if (board[row][col] !== 0) {
                board[row][col] = 0;
                empties--;
            }
        }
        
        initialBoard = JSON.parse(JSON.stringify(board));
        initializeMemos();
        selectedCell = null;
        errorCells.clear();
        focusedNumberInfo = null;
        renderBoard();
        clearMessage();
    }

    function initializeMemos() {
        memos = Array(SIZE).fill(0).map(() => Array(SIZE).fill(0).map(() => new Set()));
    }
    
    // --- 描画ロジック ---
    function renderBoard() {
        gridElement.innerHTML = '';
        for (let row = 0; row < SIZE; row++) {
            for (let col = 0; col < SIZE; col++) {
                const cell = createCell(row, col);
                gridElement.appendChild(cell);
            }
        }
    }

    function createCell(row, col) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.row = row;
        cell.dataset.col = col;

        if ((row + 1) % 3 === 0 && row < SIZE - 1) cell.style.borderBottom = '2px solid #333';
        if ((col + 1) % 3 === 0 && col < SIZE - 1) cell.style.borderRight = '2px solid #333';

        const cellValue = board[row][col] || initialBoard[row][col];
        const isGiven = initialBoard[row][col] !== 0;

        // ハイライトロジックを「行」と「列」のみに修正
        if (focusedNumberInfo) {
            const { focusRow, focusCol, focusNum } = focusedNumberInfo;

            // 行・列のハイライト
            if (row === focusRow || col === focusCol) {
                cell.classList.add('highlight-area');
            }
            // 同じ数字のハイライト
            if (cellValue !== 0 && cellValue === focusNum) {
                cell.classList.add('highlight-num');
            }
        }
        
        if (isGiven) {
            cell.textContent = initialBoard[row][col];
            cell.classList.add('given-cell');
        } else {
            if (board[row][col] !== 0) {
                cell.textContent = board[row][col];
                cell.classList.add('user-input');
                if (errorCells.has(`${row},${col}`)) {
                    cell.classList.add('error-cell');
                }
            } else {
                cell.innerHTML = ' ';
                const memoGrid = document.createElement('div');
                memoGrid.classList.add('memo-grid');
                for (let i = 1; i <= 9; i++) {
                    const memoCell = document.createElement('div');
                    memoCell.classList.add('memo-cell');
                    if (memos[row][col].has(i)) {
                        memoCell.textContent = i;
                        memoCell.classList.add('active');
                    }
                    memoGrid.appendChild(memoCell);
                }
                cell.appendChild(memoGrid);
            }
        }

        if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
            cell.classList.add('selected');
        }
        return cell;
    }

    // --- イベントハンドラ ---
    function handleCellClick(e) {
        const cell = e.target.closest('.cell');
        if (!cell) return;

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        const cellValue = board[row][col] || initialBoard[row][col];
        if (cellValue !== 0) {
            focusedNumberInfo = { focusRow: row, focusCol: col, focusNum: cellValue };
        } else {
            focusedNumberInfo = null;
        }

        if (cell.classList.contains('given-cell')) {
            selectedCell = null;
        } else {
            selectedCell = { row, col };
        }

        renderBoard();
    }

    function handleKeyDown(e) {
        if (!selectedCell) return;
        const { row, col } = selectedCell;
        const key = parseInt(e.key);
        
        errorCells.delete(`${row},${col}`);

        if (e.key === 'Backspace' || e.key === 'Delete') {
            board[row][col] = 0;
            memos[row][col].clear();
        } else if (key >= 1 && key <= 9) {
            if (isMemoMode) {
                if (memos[row][col].has(key)) {
                    memos[row][col].delete(key);
                } else {
                    memos[row][col].add(key);
                }
                board[row][col] = 0;
            } else {
                board[row][col] = key;
                memos[row][col].clear();
            }
        } else {
            return;
        }
        
        e.preventDefault();
        renderBoard();
    }

    function toggleMemoMode() {
        isMemoMode = !isMemoMode;
        memoToggleBtn.classList.toggle('active', isMemoMode);
        memoToggleBtn.textContent = isMemoMode ? 'メモ入力 ON' : 'メモ入力 OFF';
    }
    
    function checkSolutionHandler() {
        errorCells.clear();
        let isComplete = true;
        
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const isGiven = initialBoard[r][c] !== 0;
                if (!isGiven) {
                    if (board[r][c] === 0) {
                        isComplete = false;
                    } else if (board[r][c] !== solution[r][c]) {
                        errorCells.add(`${r},${c}`);
                    }
                }
            }
        }

        if (errorCells.size > 0) {
            setMessage("間違いがあります。赤色のマスを確認してください。", 'error');
        } else if (!isComplete) {
            setMessage("まだ空のマスがあります。", 'error');
        } else {
            setMessage("正解です！おめでとうございます！", 'success');
        }
        
        renderBoard();
    }

    function showSolutionHandler() {
        board = JSON.parse(JSON.stringify(solution));
        initializeMemos();
        selectedCell = null;
        errorCells.clear();
        focusedNumberInfo = null;
        renderBoard();
        setMessage('答えを表示しました。');
    }

    function setMessage(text, type = '') {
        messageElement.textContent = text;
        messageElement.className = type;
    }

    function clearMessage() {
        messageElement.textContent = '';
        messageElement.className = '';
    }

    // --- 数独生成アルゴリズム (バックトラッキング) ---
    function solveSudoku(grid) {
        const emptySpot = findEmpty(grid);
        if (!emptySpot) return true;
        const [row, col] = emptySpot;
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (let num of nums) {
            if (isValid(grid, row, col, num)) {
                grid[row][col] = num;
                if (solveSudoku(grid)) return true;
                grid[row][col] = 0;
            }
        }
        return false;
    }

    function findEmpty(grid) {
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                if (grid[i][j] === 0) return [i, j];
            }
        }
        return null;
    }

    function isValid(grid, row, col, num) {
        for (let x = 0; x < SIZE; x++) if (grid[row][x] === num) return false;
        for (let y = 0; y < SIZE; y++) if (grid[y][col] === num) return false;
        const startRow = row - row % 3, startCol = col - col % 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (grid[i + startRow][j + startCol] === num) return false;
            }
        }
        return true;
    }

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // --- イベントリスナー設定 ---
    newGameBtn.addEventListener('click', initializeGame);
    gridElement.addEventListener('click', handleCellClick);
    document.addEventListener('keydown', handleKeyDown);
    memoToggleBtn.addEventListener('click', toggleMemoMode);
    checkSolutionBtn.addEventListener('click', checkSolutionHandler);
    showSolutionBtn.addEventListener('click', showSolutionHandler);

    // --- 初期ゲーム開始 ---
    initializeGame();
});
