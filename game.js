// ============================================
// GAME CONFIGURATION
// ============================================
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    PLAYER_SPEED: 0.75,
    ENEMY_SPEED: 0.375,
    BULLET_SPEED: 2,
    PLAYER_SHOOT_COOLDOWN: 200,
    ENEMY_SHOOT_COOLDOWN: 1500,
    PLAYER_MAX_HEALTH: 100,
    ENEMY_MAX_HEALTH: 50,
    PLAYER_DAMAGE_FROM_ENEMY: 20,
    ENEMY_DAMAGE_FROM_PLAYER: 35,
    GRID_SIZE: 50,
};

// ============================================
// GAME STATE
// ============================================
let animationFrameId = null;
let score = 0;
let highScore = 0;
let lives = 3;
let wave = 1;
let gameRunning = true;
let mouseX = 0;
let mouseY = 0;
let mouseDown = false;
let spacePressed = false;
const keys = {};

// Game objects
let tanks = [];
let bullets = [];
let particles = [];
let screenShake = 0;

// DOM elements
let canvas, ctx;
let restartBtn;

// Wave spawn timeout reference to prevent duplicate spawns
let waveSpawnTimeout = null;

// ============================================
// INPUT HANDLING
// ============================================
function setupInputHandlers() {
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;

        if (e.code === 'Space') {
            e.preventDefault();
            spacePressed = true;
        }

        if (e.key === 'r' || e.key === 'R') {
            restartGame();
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;

        if (e.code === 'Space') {
            spacePressed = false;
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!gameRunning) return;
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    canvas.addEventListener('mousedown', () => mouseDown = true);
    canvas.addEventListener('mouseup', () => mouseDown = false);

    if (restartBtn) {
        restartBtn.addEventListener('click', restartGame);
    }

    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', window.startGame);
    }
}

// ============================================
// TANK CLASS
// ============================================
class Tank {
    static _nextId = 1;
    constructor(x, y, color, isPlayer = false) {
        this.isRespawning = false;
        this.invulnerable = false;
        this.invulnerableUntil = 0;
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 30;
        this.color = color;
        this.speed = isPlayer ? CONFIG.PLAYER_SPEED : CONFIG.ENEMY_SPEED;
        this.angle = 0;
        this.isPlayer = isPlayer;
        this.health = isPlayer ? CONFIG.PLAYER_MAX_HEALTH : CONFIG.ENEMY_MAX_HEALTH;
        this.maxHealth = this.health;
        this.shootCooldown = isPlayer ? CONFIG.PLAYER_SHOOT_COOLDOWN : CONFIG.ENEMY_SHOOT_COOLDOWN;
        this.lastShot = 0;
        this.id = Tank._nextId++;
    }

    update() {
        if (this.isRespawning) return;
        if (this.isPlayer) {
            this.updatePlayer();
        } else {
            this.updateAI();
        }
    }

    updatePlayer() {
        let dx = 0, dy = 0;

        if (keys['w'] || keys['arrowup']) dy -= 1;
        if (keys['s'] || keys['arrowdown']) dy += 1;
        if (keys['a'] || keys['arrowleft']) dx -= 1;
        if (keys['d'] || keys['arrowright']) dx += 1;

        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        this.x += dx * this.speed;
        this.y += dy * this.speed;

        this.x = Math.max(this.width / 2, Math.min(canvas.width - this.width / 2, this.x));
        this.y = Math.max(this.height / 2, Math.min(canvas.height - this.height / 2, this.y));

        this.angle = Math.atan2(mouseY - this.y, mouseX - this.x);

        if ((mouseDown || spacePressed) && Date.now() - this.lastShot > this.shootCooldown) {
            this.shoot();
        }
    }

    updateAI() {
        const player = tanks.find(t => t.isPlayer);
        if (!player) return;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 150 && dist > 0) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }

        this.angle = Math.atan2(dy, dx);

        if (dist < 400 && Date.now() - this.lastShot > this.shootCooldown) {
            this.shoot();
        }
    }

    shoot() {
        const bulletSpeed = CONFIG.BULLET_SPEED;
        bullets.push(new Bullet(
            this.x + Math.cos(this.angle) * 25,
            this.y + Math.sin(this.angle) * 25,
            Math.cos(this.angle) * bulletSpeed,
            Math.sin(this.angle) * bulletSpeed,
            this.isPlayer,
            this.id
        ));
        this.lastShot = Date.now();
    }

    draw() {
        ctx.save();
        if (this.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }
        if (this.isRespawning) {
            const t = (Date.now() % 800) / 800;
            ctx.globalAlpha = t;
        }
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        ctx.fillStyle = this.isPlayer ? '#3ba887' : '#c0392b';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.isPlayer ? '#4ecca3' : '#e74c3c';
        ctx.fillRect(0, -3, 25, 6);

        ctx.globalAlpha = 1;
        ctx.restore();

        if (this.health < this.maxHealth) {
            const barWidth = 40;
            const healthPercent = this.health / this.maxHealth;

            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - barWidth / 2, this.y - 30, barWidth, 5);

            ctx.fillStyle = healthPercent > 0.5 ? '#4ecca3' : healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
            ctx.fillRect(this.x - barWidth / 2, this.y - 30, barWidth * healthPercent, 5);
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }
}

// ============================================
// BULLET CLASS
// ============================================
class Bullet {
    constructor(x, y, vx, vy, isPlayerBullet, ownerId) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = 4;
        this.isPlayerBullet = isPlayerBullet;
        this.ownerId = ownerId;
        this.alive = true;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width ||
            this.y < 0 || this.y > canvas.height) {
            this.alive = false;
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isPlayerBullet ? '#4ecca3' : '#e74c3c';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
        ctx.fillStyle = this.isPlayerBullet ? 'rgba(78, 204, 163, 0.3)' : 'rgba(231, 76, 60, 0.3)';
        ctx.fill();
    }
}

// ============================================
// PARTICLE CLASS (Explosions)
// ============================================
// class Particle {
//     constructor(x, y) {
//         this.x = x;
//         this.y = y;
//         const angle = Math.random() * Math.PI * 2;
//         const speed = Math.random() * 3 + 1;
//         this.vx = Math.cos(angle) * speed;
//         this.vy = Math.sin(angle) * speed;
//         this.life = 1;
//         this.decay = Math.random() * 0.03 + 0.02;
//         this.size = Math.random() * 4 + 2;
//     }

//     update() {
//         this.x += this.vx;
//         this.y += this.vy;
//         this.life = Math.max(0, this.life - this.decay); // clamp to 0, never go negative
//         this.vx *= 0.98;
//         this.vy *= 0.98;
//     }

//     draw() {
//         if (this.life <= 0) return; // guard: skip draw if already dead
//         ctx.globalAlpha = this.life;
//         ctx.fillStyle = '#f39c12';
//         ctx.beginPath();
//         ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
//         ctx.fill();
//         ctx.globalAlpha = 1;
//     }
// }
class Particle {
    constructor(x, y, color = '#f39c12') {
        this.x = x;
        this.y = y;

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 2;

        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.life = 1;
        this.decay = Math.random() * 0.025 + 0.015;

        this.size = Math.random() * 8 + 3;
        this.color = color;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        this.vx *= 0.96;
        this.vy *= 0.96;

        this.life = Math.max(0, this.life - this.decay);
    }

    draw() {
        if (this.life <= 0) return;

        ctx.globalAlpha = this.life;

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
    }
}

// ============================================
// GAME FUNCTIONS
// ============================================
function initGame() {
    gameRunning = true;
    score = 0;
    lives = 3;
    wave = 1;

    tanks = [
        new Tank(100, canvas.height / 2, '#4ecca3', true)
    ];
    bullets = [];
    particles = [];

    spawnWave();
    updateUI();
}

function spawnWave() {
    const enemyCount = wave + 1;
    for (let i = 0; i < enemyCount; i++) {
        let x, y;
        const side = Math.floor(Math.random() * 4);
        switch(side) {
            case 0: x = Math.random() * canvas.width; y = -30; break;
            case 1: x = canvas.width + 30; y = Math.random() * canvas.height; break;
            case 2: x = Math.random() * canvas.width; y = canvas.height + 30; break;
            case 3: x = -30; y = Math.random() * canvas.height; break;
        }
        tanks.push(new Tank(x, y, '#e74c3c'));
    }
}

function checkCollisions() {
    for (let bullet of bullets) {
        if (!bullet.alive) continue;

        for (let tank of tanks) {
            if (tank.id === bullet.ownerId) continue;
            if (tank.isRespawning) continue;
            if (tank.isPlayer && tank.invulnerable) continue;

            const dx = bullet.x - tank.x;
            const dy = bullet.y - tank.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 25) {
                bullet.alive = false;
                createExplosion(bullet.x, bullet.y, 5);

                // FIX 1: Swapped damage constants — each branch now uses the correct config value.
                // FIX 2: Player only loses on lives === 0, not on first hit; gameOver deferred
                //         via setTimeout so it runs after the current frame completes, preventing freeze.
                if (!bullet.isPlayerBullet && tank.isPlayer) {
                    const killed = tank.takeDamage(CONFIG.PLAYER_DAMAGE_FROM_ENEMY);
                    if (killed) {
                        lives--;
                        updateUI();
                        if (lives <= 0) {
                            setTimeout(gameOver, 0);
                        } else {
                            // Respawn player with full health for next life
                            // createExplosion(tank.x, tank.y, 60);
                            // setTimeout(() => {
                            //     tank.health = tank.maxHealth;
                            //     tank.x = 100;
                            //     tank.y = canvas.height / 2;

                            //     // 👉 ENABLE spawn protection
                            //     tank.invulnerable = true;
                            //     tank.invulnerableUntil = Date.now() + 1500;

                            //     // disable after time
                            //     setTimeout(() => {
                            //         tank.invulnerable = false;
                            //     }, 1500);

                            // }, 800);
                            tank.isRespawning = true;
                            tank.invulnerable = true;

                            // optional: hide health reset until spawn finishes
                            tank.health = tank.maxHealth;

                            setTimeout(() => {
                                // FIXED SPAWN POSITION (no corner glitch)
                                tank.x = 100;
                                tank.y = canvas.height / 2;

                                tank.angle = 0;

                                tank.isRespawning = false;

                                // spawn protection after reappearing
                                setTimeout(() => {
                                    tank.invulnerable = false;
                                }, 1200);

                            }, 800);
                        }
                    }
                } else if (bullet.isPlayerBullet && !tank.isPlayer) {
                    const killed = tank.takeDamage(CONFIG.ENEMY_DAMAGE_FROM_PLAYER);
                    if (killed) {
                        createExplosion(tank.x, tank.y, 40);
                        score += 10;
                        updateUI();
                    }
                }
            }
        }
    }
}

// function createExplosion(x, y, count) {
//     for (let i = 0; i < count; i++) {
//         particles.push(new Particle(x, y));
//     }
// }
function createExplosion(x, y, count = 30) {
    const colors = [
        '#f39c12',
        '#e74c3c',
        '#f1c40f',
        '#ffffff'
    ];

    screenShake = Math.max(screenShake, count * 0.4);

    for (let i = 0; i < count; i++) {
        particles.push(
            new Particle(
                x,
                y,
                colors[Math.floor(Math.random() * colors.length)]
            )
        );
    }
}

function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('highScore').textContent = highScore;
    document.getElementById('lives').textContent = lives;
    document.getElementById('wave').textContent = wave;
}

function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').style.display = 'block';

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('tankHighScore', highScore);
    }
}

window.restartGame = function() {
    document.getElementById('gameOver').style.display = 'none';
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    initGame();
    gameLoop();
};

// ============================================
// RENDERING
// ============================================
function drawBackground() {
    ctx.fillStyle = '#0f3460';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(78, 204, 163, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += CONFIG.GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += CONFIG.GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// ============================================
// MAIN GAME LOOP
// ============================================
function gameLoop() {
    if (!gameRunning) return;

    // drawBackground();
    drawBackground();

    ctx.save();

    if (screenShake > 0) {
        ctx.translate(
            (Math.random() - 0.5) * screenShake,
            (Math.random() - 0.5) * screenShake
        );

        screenShake *= 0.9;
    }

    // FIX 3: Remove dead enemy tanks each frame so the wave-clear check works.
    tanks = tanks.filter(t => t.isPlayer || t.health > 0);

    // FIX 4: Advance to next wave when all enemies are cleared.
    const enemies = tanks.filter(t => !t.isPlayer);
    if (enemies.length === 0) {
        wave++;
        updateUI();
        spawnWave();
    }

    tanks.forEach(tank => {
        tank.update();
        tank.draw();
    });

    bullets = bullets.filter(b => b.alive);
    bullets.forEach(bullet => {
        bullet.update();
        bullet.draw();
    });

    particles = particles.filter(p => p.life > 0);
    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });

    checkCollisions();

    ctx.restore();
    animationFrameId = requestAnimationFrame(gameLoop);
}

// ============================================
// INITIALIZATION
// ============================================
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    restartBtn = document.getElementById('restartBtn');

    highScore = parseInt(localStorage.getItem('tankHighScore')) || 0;

    setupInputHandlers();
}

window.startGame = function() {
    document.getElementById('startScreen').style.display = 'none';
    initGame();
    gameLoop();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
