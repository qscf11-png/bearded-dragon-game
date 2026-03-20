const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
const overlayTitle = document.getElementById('overlay-title');
const overlayDesc = document.getElementById('overlay-desc');

// 遊戲設定
let score = 0;
let lives = 3;
let gameActive = false;
let animationId;

// 載入資源
const dragonImg = new Image();
dragonImg.src = 'assets/dragon.png';
const bugImg = new Image();
bugImg.src = 'assets/bugs.png';

// 實體
const player = {
    x: 0,
    y: 0,
    width: 120,
    height: 80,
    speed: 8,
    targetX: 0
};

const items = [];
const itemTypes = [
    { type: 'cricket', points: 10, speedMult: 1, color: '#f1c40f' },
    { type: 'roach', points: 20, speedMult: 1.2, color: '#e67e22' },
    { type: 'pepper', points: -5, speedMult: 1.5, color: '#e74c3c' }
];

// 初始化畫布大小
function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    player.y = canvas.height - player.height - 20;
    player.x = canvas.width / 2 - player.width / 2;
    player.targetX = player.x;
}

window.addEventListener('resize', resize);
resize();

// 控制
window.addEventListener('mousemove', (e) => {
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    player.targetX = e.clientX - rect.left - player.width / 2;
});

window.addEventListener('touchmove', (e) => {
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    player.targetX = e.touches[0].clientX - rect.left - player.width / 2;
    e.preventDefault();
}, { passive: false });

// 鍵盤控制
const keys = {};
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

function spawnItem() {
    if (!gameActive) return;
    const type = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    items.push({
        x: Math.random() * (canvas.width - 40),
        y: -50,
        width: 40,
        height: 40,
        ...type,
        speed: (2 + Math.random() * 3) * type.speedMult
    });
    
    // 隨機間隔生成下一個
    setTimeout(spawnItem, 1000 + Math.random() * 2000 - (score * 5));
}

function update() {
    if (!gameActive) return;

    // 平滑移動玩家
    if (keys['ArrowLeft']) player.targetX -= player.speed * 1.5;
    if (keys['ArrowRight']) player.targetX += player.speed * 1.5;

    player.x += (player.targetX - player.x) * 0.15;
    
    // 邊界限制
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;

    // 更新物品
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.y += item.speed;

        // 碰撞偵測
        if (
            item.x < player.x + player.width &&
            item.x + item.width > player.x &&
            item.y < player.y + player.height &&
            item.y + item.height > player.y
        ) {
            score += item.points;
            if (item.type === 'pepper') {
                // 吃到辣椒扣血或效果
            }
            items.splice(i, 1);
            updateUI();
            continue;
        }

        // 掉落偵測
        if (item.y > canvas.height) {
            if (item.type !== 'pepper') {
                lives--;
                updateUI();
                if (lives <= 0) gameOver();
            }
            items.splice(i, 1);
        }
    }

    draw();
    animationId = requestAnimationFrame(update);
}

// 載入資源後進行初始繪製
console.log('正在載入資源...');
Promise.all([
    new Promise(res => { dragonImg.onload = res; dragonImg.onerror = () => { console.error('龍圖片載入失敗'); res(); } }),
    new Promise(res => { bugImg.onload = res; bugImg.onerror = () => { console.error('蟲圖片載入失敗'); res(); } })
]).then(() => {
    console.log('資源載入完成，進行去背處理...');
    // 去背處理
    const transparentDragon = makeTransparent(dragonImg);
    const transparentBugs = makeTransparent(bugImg);
    
    // 替換原始圖片 (使用 Canvas 元素替代 Image)
    dragonImg.__processed = transparentDragon;
    bugImg.__processed = transparentBugs;
    
    draw();
});

function makeTransparent(img) {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const imgData = x.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
        // 接近白色的像素設為透明
        if (imgData.data[i] > 230 && imgData.data[i+1] > 230 && imgData.data[i+2] > 230) {
            imgData.data[i+3] = 0;
        }
    }
    x.putImageData(imgData, 0, 0);
    return c;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const dragonToDraw = dragonImg.__processed || dragonImg;
    const bugsToDraw = bugImg.__processed || bugImg;

    // 畫玩家
    const flip = player.targetX < player.x - 5;
    ctx.save();
    if (flip) {
        ctx.translate(player.x + player.width, player.y);
        ctx.scale(-1, 1);
        ctx.drawImage(dragonToDraw, 0, 0, player.width, player.height);
    } else {
        ctx.drawImage(dragonToDraw, player.x, player.y, player.width, player.height);
    }
    ctx.restore();

    // 畫物品
    items.forEach(item => {
        ctx.drawImage(bugsToDraw, item.x, item.y, item.width, item.height);
        
        // 加上光暈效果
        ctx.shadowBlur = 15;
        ctx.shadowColor = item.color;
        ctx.beginPath();
        ctx.arc(item.x + item.width/2, item.y + item.height/2, item.width/1.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.stroke();
        ctx.shadowBlur = 0;
    });
}


function update() {
    // 即使遊戲沒啟動也可以畫，保持畫面不留白 (例如開始前的預覽)
    if (!gameActive) {
        draw();
        animationId = requestAnimationFrame(update);
        return;
    }

    // 平滑移動玩家
    player.x += (player.targetX - player.x) * 0.15;
    
    // 邊界限制
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;

    // 更新物品
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.y += item.speed;

        // 碰撞偵測
        if (
            item.x < player.x + player.width &&
            item.x + item.width > player.x &&
            item.y < player.y + player.height &&
            item.y + item.height > player.y
        ) {
            score += item.points;
            items.splice(i, 1);
            updateUI();
            
            // 吃到東西的特效 (改個顏色或縮放)
            player.height += 5;
            setTimeout(() => player.height -= 5, 200);
            continue;
        }

        // 掉落偵測
        if (item.y > canvas.height) {
            if (item.type !== 'pepper') {
                lives--;
                updateUI();
                if (lives <= 0) gameOver();
            }
            items.splice(i, 1);
        }
    }

    draw();
    animationId = requestAnimationFrame(update);
}

// 啟動動畫循環
update();

function updateUI() {
    scoreElement.textContent = score;
    livesElement.textContent = lives;
}

function startGame() {
    score = 0;
    lives = 3;
    items.length = 0;
    gameActive = true;
    updateUI();
    overlay.classList.add('hidden');
    spawnItem();
}

function gameOver() {
    gameActive = false;
    overlayTitle.textContent = '遊戲結束！';
    overlayDesc.textContent = `最終分數：${score}`;
    startBtn.textContent = '再玩一次';
    overlay.classList.remove('hidden');
}

startBtn.addEventListener('click', startGame);

