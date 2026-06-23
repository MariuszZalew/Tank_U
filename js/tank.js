// ============================================
// TANK CLASS
// ============================================
import { CONFIG } from './config.js';
import { getCanvas, getCtx, getMouseX, getMouseY, isMouseDown, isSpacePressed,
         getTanks, getBullets, getKeys, isMouseMovingActive, getTargetingMode, isPowerUpActive } from './state.js';
import { playPlayerShoot, playEnemyShoot } from './sound.js';

export class Tank {
    static _nextId = 1;

    constructor(x, y, color, isPlayer = false, isElite = false, isBoss = false) {
        this.isRespawning = false;
        this.invulnerable = false;
        this.invulnerableUntil = 0;
        this.x = x;
        this.y = y;
        this.isBoss = isBoss;
        this.width = isPlayer ? 40 : (isBoss ? CONFIG.BOSS_WIDTH : (isElite ? 48 : 40));
        this.height = isPlayer ? 30 : (isBoss ? CONFIG.BOSS_HEIGHT : (isElite ? 36 : 30));
        this.color = color;
        this.isElite = isElite;
        this.speed = isPlayer ? CONFIG.PLAYER_SPEED : (isBoss ? CONFIG.BOSS_SPEED : (isElite ? CONFIG.ENEMY_SPEED * 1.3 : CONFIG.ENEMY_SPEED));
        this.angle = 0;
        this.isPlayer = isPlayer;
        this.health = isPlayer ? CONFIG.PLAYER_MAX_HEALTH : (isBoss ? CONFIG.BOSS_MAX_HEALTH : (isElite
            ? CONFIG.ENEMY_MAX_HEALTH * 2
            : CONFIG.ENEMY_MAX_HEALTH));
        this.maxHealth = this.health;
        this.shootCooldown = isPlayer ? CONFIG.PLAYER_SHOOT_COOLDOWN : (isBoss ? CONFIG.BOSS_SHOOT_COOLDOWN : CONFIG.ENEMY_SHOOT_COOLDOWN);
        this.lastShot = 0;
        this.id = Tank._nextId++;

        // Shield Ability (Player only)
        if (this.isPlayer) {
            this.lastShieldUsed = 0;
            this.shieldActiveUntil = 0;
        }

        // Boss state
        if (this.isBoss) {
            this.bossPhase = 'spread'; // 'spread' or 'salvo'
            this.burstCounter = 0;
            this.lastBurstShot = 0;
            this.phaseTimer = Date.now();
        }
    }

    update() {
        if (this.isRespawning) return;
        if (this.isPlayer) {
            this.updatePlayer();
        } else if (this.isBoss) {
            this.updateBossAI();
        } else {
            this.updateAI();
        }
    }

    updateBossAI() {
        const tanks = getTanks();
        const player = tanks.find(t => t.isPlayer);
        if (!player) return;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Movement: maintain distance
        if (dist > 250) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        } else if (dist < 150) {
            this.x -= (dx / dist) * this.speed;
            this.y -= (dy / dist) * this.speed;
        }

        this.angle = Math.atan2(dy, dx);

        // Phase switching
        if (Date.now() - this.phaseTimer > 5000) {
            this.bossPhase = this.bossPhase === 'spread' ? 'salvo' : 'spread';
            this.phaseTimer = Date.now();
            this.burstCounter = 0;
        }

        // Shooting logic
        if (this.bossPhase === 'spread') {
            if (Date.now() - this.lastShot > this.shootCooldown) {
                this.shootSpread();
                this.burstCounter++;
                if (this.burstCounter >= 3) {
                    this.lastShot = Date.now() + 1000; // Extra cooldown after burst
                    this.burstCounter = 0;
                } else {
                    this.lastShot = Date.now();
                }
            }
        } else if (this.bossPhase === 'salvo') {
            if (Date.now() - this.lastShot > 150) { // Fast staggered shots
                this.shoot();
                this.burstCounter++;
                if (this.burstCounter >= 6) {
                    this.lastShot = Date.now() + 1500; // Longer cooldown after salvo
                    this.burstCounter = 0;
                } else {
                    this.lastShot = Date.now();
                }
            }
        }
    }

    shootSpread() {
        const bulletSpeed = CONFIG.BULLET_SPEED;
        const bullets = getBullets();
        const damage = CONFIG.BOSS_DAMAGE_PER_BULLET;

        const fire = (angleOffset = 0) => {
            const angle = this.angle + angleOffset;
            bullets.push(new Bullet(
                this.x + Math.cos(angle) * 40,
                this.y + Math.sin(angle) * 40,
                Math.cos(angle) * bulletSpeed,
                Math.sin(angle) * bulletSpeed,
                false,
                this.id,
                damage
            ));
        };

        fire(0);
        fire(-0.4);
        fire(0.4);
        this.lastShot = Date.now();
        playEnemyShoot();
    }

    updatePlayer() {
        const keys = getKeys();
        let dx = 0, dy = 0;

        if (keys['w'] || keys['arrowup']) dy -= 1;
        if (keys['s'] || keys['arrowdown']) dy += 1;
        if (keys['a'] || keys['arrowleft']) dx -= 1;
        if (keys['d'] || keys['arrowright']) dx += 1;

        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        let speed = this.speed;
        if (isPowerUpActive('speed_boost')) speed *= 1.6;

        this.x += dx * speed;
        this.y += dy * speed;

        const canvas = getCanvas();
        this.x = Math.max(this.width / 2, Math.min(canvas.width - this.width / 2, this.x));
        this.y = Math.max(this.height / 2, Math.min(canvas.height - this.height / 2, this.y));

        // Active Shield Ability (Shift key)
        const now = Date.now();
        if ((keys['shift'] || keys['control']) && now - this.lastShieldUsed > CONFIG.SHIELD_ABILITY_COOLDOWN) {
            this.lastShieldUsed = now;
            this.shieldActiveUntil = now + CONFIG.SHIELD_ABILITY_DURATION;
        }

        if (isMouseMovingActive() || getTargetingMode() === 'manual') {
            const mouseX = getMouseX();
            const mouseY = getMouseY();
            this.angle = Math.atan2(mouseY - this.y, mouseX - this.x);
        } else {
            const tanks = getTanks();
            const enemies = tanks.filter(t => !t.isPlayer && t.health > 0);
            
            if (enemies.length > 0) {
                let nearestEnemy = null;
                let minDist = Infinity;
                
                for (const enemy of enemies) {
                    const dx = enemy.x - this.x;
                    const dy = enemy.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < minDist) {
                        minDist = dist;
                        nearestEnemy = enemy;
                    }
                }
                
                if (nearestEnemy) {
                    const dx = nearestEnemy.x - this.x;
                    const dy = nearestEnemy.y - this.y;
                    this.angle = Math.atan2(dy, dx);
                }
            }
        }

        let cooldown = this.shootCooldown;
        if (isPowerUpActive('rapid_fire')) cooldown *= 0.6;

        if ((isMouseDown() || isSpacePressed()) && Date.now() - this.lastShot > cooldown) {
            this.shoot();
        }
    }

    updateAI() {
        const tanks = getTanks();
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
        const bullets = getBullets();

        let damage = this.isPlayer ? CONFIG.ENEMY_DAMAGE_FROM_PLAYER : CONFIG.PLAYER_DAMAGE_FROM_ENEMY;
        if (this.isPlayer && isPowerUpActive('damage_up')) damage *= 2;

        const fire = (angleOffset = 0) => {
            const angle = this.angle + angleOffset;
            bullets.push(new Bullet(
                this.x + Math.cos(angle) * 25,
                this.y + Math.sin(angle) * 25,
                Math.cos(angle) * bulletSpeed,
                Math.sin(angle) * bulletSpeed,
                this.isPlayer,
                this.id,
                damage
            ));
        };

        fire();

        if (this.isPlayer && isPowerUpActive('multi_shot')) {
            fire(-0.2);
            fire(0.2);
        }

        this.lastShot = Date.now();
        if (this.isPlayer) {
            playPlayerShoot();
        } else {
            playEnemyShoot();
        }
    }

    draw() {
        const ctx = getCtx();
        ctx.save();

        // Invulnerability flicker
        if (this.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }
        // Respawn fade-in
        if (this.isRespawning) {
            ctx.globalAlpha = (Date.now() % 800) / 800;
        }

        ctx.translate(this.x, this.y);

        // ── Power-up: Shield Visual ──
        if (this.isPlayer) {
            const now = Date.now();
            const isActiveAbility = now < this.shieldActiveUntil;
            const isPowerUp = isPowerUpActive('shield');

            if (isActiveAbility || isPowerUp) {
                ctx.save();
                const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.015);
                ctx.beginPath();
                ctx.arc(0, 0, this.width * 0.85, 0, Math.PI * 2);
                
                if (isActiveAbility) {
                    // Stronger, high-energy pulse for active ability
                    ctx.strokeStyle = `rgba(52, 152, 219, ${0.7 + 0.3 * pulse})`;
                    ctx.lineWidth = 4;
                    ctx.stroke();
                    ctx.fillStyle = `rgba(52, 152, 219, ${0.2 + 0.1 * pulse})`;
                } else {
                    // Softer pulse for power-up
                    ctx.strokeStyle = `rgba(52, 152, 219, ${0.4 + 0.2 * pulse})`;
                    ctx.lineWidth = 3;
                    ctx.stroke();
                    ctx.fillStyle = `rgba(52, 152, 219, ${0.1 + 0.05 * pulse})`;
                }
                
                ctx.fill();
                ctx.restore();
            }
        }

        ctx.rotate(this.angle);

        const w = this.width;
        const h = this.height;
        const hw = w / 2;
        const hh = h / 2;

        // ── Tread shadows (ground layer) ──
        const treadColor = this.isBoss ? '#3d2b1f' : (this.isElite ? '#4a3520' : (this.isPlayer ? '#1a3a30' : '#2a1a1a'));
        ctx.fillStyle = treadColor;
        if (this.isBoss) {
            // Wider treads for boss
            ctx.fillRect(-hw - 10, -hh - 4, 16, h + 8);
            ctx.fillRect(hw - 6,   -hh - 4, 16, h + 8);
        } else {
            ctx.fillRect(-hw - 6, -hh - 2, 10, h + 4);
            ctx.fillRect(hw - 4,  -hh - 2, 10, h + 4);
        }

        // ── Tread segments ──
        const segCount = this.isBoss ? 10 : 6;
        const segH = (h + (this.isBoss ? 8 : 4)) / segCount;
        for (let i = 0; i < segCount; i++) {
            const shade = i % 2 === 0 ? 0.18 : 0.06;
            ctx.fillStyle = `rgba(0,0,0,${shade})`;
            if (this.isBoss) {
                ctx.fillRect(-hw - 10, -hh - 4 + i * segH, 16, segH);
                ctx.fillRect(hw - 6,   -hh - 4 + i * segH, 16, segH);
            } else {
                ctx.fillRect(-hw - 6,  -hh - 2 + i * segH, 10, segH);
                ctx.fillRect(hw - 4,   -hh - 2 + i * segH, 10, segH);
            }
        }

        // ── Hull (main body) ──
        const bodyBase = this.isBoss ? '#4a4a4a' : (this.isElite ? '#7a5a28' : (this.isPlayer ? '#2a6655' : '#6b2222'));
        ctx.fillStyle = bodyBase;
        ctx.beginPath();
        ctx.roundRect(-hw, -hh, w, h, 6);
        ctx.fill();

        // Hull side bevel panels
        const panelColor = this.isBoss ? '#5a5a5a' : (this.isElite ? '#8a6a38' : (this.isPlayer ? '#3a7a65' : '#7b3232'));
        ctx.fillStyle = panelColor;
        ctx.fillRect(-hw + 4, -hh + 4, w - 8, h - 8);

        // ── Turret base ring ──
        const ringColor = this.isBoss ? '#333' : (this.isElite ? '#5a4010' : (this.isPlayer ? '#1a4535' : '#4a0a0a'));
        ctx.fillStyle = ringColor;
        ctx.beginPath();
        ctx.arc(0, 0, this.isBoss ? 22 : 13, 0, Math.PI * 2);
        ctx.fill();

        // ── Turret dome ──
        const turretColor = this.isBoss ? '#e74c3c' : (this.isElite ? '#e67e22' : (this.isPlayer ? '#3ba887' : '#c0392b'));
        ctx.fillStyle = turretColor;
        ctx.beginPath();
        ctx.arc(0, 0, this.isBoss ? 18 : 10, 0, Math.PI * 2);
        ctx.fill();

        // Turret gloss highlight
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        if (this.isBoss) {
            ctx.ellipse(-4, -6, 10, 6, -0.5, 0, Math.PI * 2);
        } else {
            ctx.ellipse(-2, -3, 5, 3, -0.5, 0, Math.PI * 2);
        }
        ctx.fill();

        // ── Barrel ──
        const barrelBase = this.isBoss ? '#c0392b' : (this.isElite ? '#f5a623' : (this.isPlayer ? '#4ecca3' : '#e74c3c'));
        
        if (this.isBoss) {
            // Triple barrel for boss
            const drawBarrel = (offsetY) => {
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(0, offsetY + 3, 35, 7);
                ctx.fillStyle = barrelBase;
                ctx.fillRect(0, offsetY, 34, 6);
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.fillRect(0, offsetY, 34, 2);
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.fillRect(30, offsetY - 1, 6, 8);
            };
            drawBarrel(-12);
            drawBarrel(-3);
            drawBarrel(6);
        } else {
            // Barrel shadow underside
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(0, 0, 27, 7);
            // Barrel main
            ctx.fillStyle = barrelBase;
            ctx.fillRect(0, -3, 26, 6);
            // Barrel highlight top
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(0, -3, 26, 2);
            // Muzzle brake
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(22, -4, 6, 8);
            ctx.fillStyle = barrelBase;
            ctx.fillRect(23, -3, 4, 6);
        }

        // ── Antenna (player only) ──
        if (this.isPlayer) {
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-5, -hh);
            ctx.lineTo(-3, -hh - 12);
            ctx.stroke();
            ctx.fillStyle = '#4ecca3';
            ctx.beginPath();
            ctx.arc(-3, -hh - 13, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Elite crown spikes ──
        if (this.isElite) {
            ctx.fillStyle = '#f5a623';
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 9 - 4, -hh);
                ctx.lineTo(i * 9,     -hh - 9);
                ctx.lineTo(i * 9 + 4, -hh);
                ctx.closePath();
                ctx.fill();
            }
        }

        // ── Boss Spikes ──
        if (this.isBoss) {
            ctx.fillStyle = '#c0392b';
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 12 - 5, -hh);
                ctx.lineTo(i * 12,     -hh - 12);
                ctx.lineTo(i * 12 + 5, -hh);
                ctx.closePath();
                ctx.fill();
            }
        }

        ctx.globalAlpha = 1;
        ctx.restore();

        // ── Health bar ──
        if (this.health < this.maxHealth || this.isBoss) {
            const barWidth = this.isBoss ? 100 : (this.isElite ? 52 : 44);
            const healthPercent = Math.max(0, this.health / this.maxHealth);
            const bx = this.x - barWidth / 2;
            const by = this.y - (this.isBoss ? 60 : (this.isElite ? 42 : 36));

            // Bar shadow
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(bx - 1, by - 1, barWidth + 2, 9);
            // Bar background
            ctx.fillStyle = '#111';
            ctx.fillRect(bx, by, barWidth, 7);
            // Bar fill
            ctx.fillStyle = healthPercent > 0.5 ? '#4ecca3'
                        : healthPercent > 0.25 ? '#f39c12'
                        : '#e74c3c';
            ctx.fillRect(bx, by, barWidth * healthPercent, 7);
            // Bar shine
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(bx, by, barWidth * healthPercent, 3);
            
            if (this.isBoss) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('BOSS', this.x, by - 5);
            }
        }
    }


    takeDamage(amount) {
        if (this.isPlayer) {
            const now = Date.now();
            if (now < this.shieldActiveUntil || isPowerUpActive('shield')) {
                return false;
            }
        }
        this.health -= amount;
        return this.health <= 0;
    }
}

import { Bullet } from './bullet.js';
