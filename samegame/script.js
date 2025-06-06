document.addEventListener('DOMContentLoaded', () => {

    // --- 設定 ---
    const BLOCK_SIZE = 40;
    const ANIMATION_DELAY = 200;

    const SIZES = {
        'small': { rows: 10, cols: 10, name: '10x10' },
        'wide': { rows: 8, cols: 15, name: '8x15' },
        'large': { rows: 15, cols: 15, name: '15x15' }
    };
    let currentSize = 'small';
    // ▼▼▼ ここから修正 ▼▼▼
    let currentColors = 4; // デフォルトの色数を4に設定
    // ▲▲▲ ここまで修正 ▲▲▲

    // --- DOM要素 ---
    const gameBoardElement = document.getElementById('game-board');
    const scoreElement = document.getElementById('score');
    const previewScoreElement = document.getElementById('preview-score');
    const resetButton = document.getElementById('reset-button');
    const sizeSelectorElement = document.getElementById('size-selector');
    // ▼▼▼ ここから追加 ▼▼▼
    const colorSelectorElement = document.getElementById('color-selector');
    // ▲▲▲ ここまで追加 ▲▲▲
    
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

    // ▼▼▼ ここから追加 ▼▼▼
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
    // ▲▲▲ ここまで追加 ▲▲▲

    // --- 初期化処理 ---
    function init() {
        isProcessing = true;
        const config = SIZES[currentSize];

        gameBoardElement.style.width = `${config.cols * BLOCK_SIZE}px`;
        gameBoardElement.style.height = `${config.rows * BLOCK_SIZE}px`;

        gameBoardElement.innerHTML = '';
        board = [], blockElements = [], score = 0;
        updateScore();
        
        // ▼▼▼ ここから修正 ▼▼▼
        createSizeSelector();
        createColorSelector(); // 色選択UIも生成
        // ▲▲▲ ここまで修正 ▲▲▲

        for (let r = 0; r < config.rows; r++) {
            const row = [], elRow = [];
            for (let c = 0; c < config.cols; c++) {
                // ▼▼▼ ここから修正 ▼▼▼
                // currentColors を使って色を決定
                const color = Math.floor(Math.random() * currentColors);
                // ▲▲▲ ここまで修正 ▲▲▲
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

    // (renderBoard から下の関数は変更ありません)
    // ...
    // (変更のない関数は省略します。前回のコードをそのままお使いください)

    // --- ゲーム開始 ---
    init();

    // 変更のない関数の再掲
    function renderBoard(){const config=SIZES[currentSize];for(let r=0;r<config.rows;r++){for(let c=0;c<config.cols;c++){const block=blockElements[r][c];const color=board[r][c];if(color!==null){block.className=`block color-${color}`;block.style.setProperty('--x',`${c*BLOCK_SIZE}px`);block.style.setProperty('--y',`${r*BLOCK_SIZE}px`);block.style.opacity=1}else{block.className='block';block.style.opacity=0}}}}
    gameBoardElement.addEventListener('click',async(e)=>{if(isProcessing||!e.target.classList.contains('block'))return;const originalPos=findOriginalPosition(e.target);if(!originalPos||board[originalPos.r][originalPos.c]===null)return;await handleBlockClick(originalPos.r,originalPos.c)});
    gameBoardElement.addEventListener('mouseover',(e)=>{if(isProcessing||!e.target.classList.contains('block'))return;const originalPos=findOriginalPosition(e.target);if(!originalPos||board[originalPos.r][originalPos.c]===null)return;showPreview(originalPos.r,originalPos.c)});
    gameBoardElement.addEventListener('mouseout',clearPreview);resetButton.addEventListener('click',init);
    async function handleBlockClick(r,c){const color=board[r][c];const connected=findConnectedBlocks(r,c,color);if(connected.length<2)return;isProcessing=true;clearPreview();score+=(connected.length-2)**2;updateScore();connected.forEach(({r,c})=>{blockElements[r][c].classList.add('disappearing')});await new Promise(resolve=>setTimeout(resolve,ANIMATION_DELAY));connected.forEach(({r,c})=>{board[r][c]=null});dropAndShiftBlocks();renderBoard();await new Promise(resolve=>setTimeout(resolve,ANIMATION_DELAY));if(isGameOver()){setTimeout(()=>alert(`ゲームオーバー！\n最終スコア: ${score}`),100)}isProcessing=false}
    function findConnectedBlocks(r,c,color,visited={}){const config=SIZES[currentSize];const key=`${r},${c}`;if(r<0||r>=config.rows||c<0||c>=config.cols||board[r][c]!==color||visited[key]){return[]}visited[key]=true;let connected=[{r,c}];[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([nr,nc])=>{connected=connected.concat(findConnectedBlocks(nr,nc,color,visited))});return connected}
    function dropAndShiftBlocks(){const config=SIZES[currentSize];let newBoard=[];for(let r=0;r<config.rows;r++)newBoard.push([]);for(let c=0;c<config.cols;c++){let newCol=[];for(let r=0;r<config.rows;r++){if(board[r][c]!==null){newCol.push(board[r][c])}}if(newCol.length>0){const emptySlots=config.rows-newCol.length;for(let i=0;i<emptySlots;i++){newCol.unshift(null)}const targetColIndex=newBoard[0].length;for(let r=0;r<config.rows;r++){newBoard[r][targetColIndex]=newCol[r]}}}const filledCols=newBoard[0].length;for(let c=filledCols;c<config.cols;c++){for(let r=0;r<config.rows;r++){newBoard[r][c]=null}}board=newBoard}
    function isGameOver(){const config=SIZES[currentSize];for(let r=0;r<config.rows;r++){for(let c=0;c<config.cols;c++){if(board[r][c]!==null){if((r>0&&board[r][c]===board[r-1][c])||(c>0&&board[r][c]===board[r][c-1])){return false}}}}return true}
    function showPreview(r,c){const color=board[r][c];if(color===null)return;const connected=findConnectedBlocks(r,c,color);if(connected.length>=2){connected.forEach(({r,c})=>{blockElements[r][c].classList.add('preview')});previewScoreElement.textContent=(connected.length-2)**2}}
    function clearPreview(){blockElements.flat().forEach(block=>block.classList.remove('preview'));previewScoreElement.textContent=0}
    function updateScore(){scoreElement.textContent=score}
    function findOriginalPosition(element){const config=SIZES[currentSize];for(let r=0;r<config.rows;r++){for(let c=0;c<config.cols;c++){if(blockElements[r][c]===element){return{r,c}}}}}
});
