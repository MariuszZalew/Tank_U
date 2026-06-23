// ============================================
// COLLISIONS
// ============================================
import { CONFIG } from './config.js';
import { getBullets, getTanks, getLives, setLives, getCanvas,
         getPowerUps, setActivePowerUps, getActivePowerUps }
from './state.js';
import { tryDropPowerUp, collectPowerUp } from './state.js';
import { createExplosion } from './effects.js';
import { updateUI, gameOver, incrementScore } from './ui.js';
import {
    playHit,
    playExplosion,
    playPlayerHit,
} from './sound.js';

export function checkCollisions() {
    const bullets = getBullets();
    const tanks = getTanks();
    const canvas = getCanvas();

    // ── Bullet ↔ Tank ──────────────────────────────
    for (let bullet of bullets) {
        if (!bullet.alive) continue;

        for (let tank of tanks) {
            if (tank.id === bullet.ownerId) continue;
            if (tank.isRespawning) continue;
            if (tank.isPlayer && tank.invulnerable) continue;

            const dx = Math.abs(bullet.x - tank.x);
            const dy = Math.abs(bullet.y - tank.y);

            // AABB Collision check
            if (dx < tank.width / 2 && dy < tank.height / 2) {
                bullet.alive = false;
                createExplosion(bullet.x, bullet.y, 5);

                if (!bullet.isPlayerBullet && tank.isPlayer) {
                    playHit();
                    const dmg = CONFIG.PLAYER_DAMAGE_FROM_ENEMY;
                    const killed = tank.takeDamage(dmg);
                    if (killed) {
                        playPlayerHit();
                        setLives(getLives() - 1);
                        updateUI();
                        if (getLives() <= 0) {
                            setTimeout(gameOver, 0);
                        } else {
                            tank.isRespawning = true;
                            tank.invulnerable = true;
                            tank.health = tank.maxHealth;

                            setTimeout(() => {
                                tank.x = 100;
                                tank.y = canvas.height / 2;
                                tank.angle = 0;
                                tank.isRespawning = false;

                                setTimeout(() => {
                                    tank.invulnerable = false;
                                }, 1200);
                            }, 800);
                        }
                    }
                } else if (bullet.isPlayerBullet && !tank.isPlayer) {
                    const killed = tank.takeDamage(bullet.damage);
                    if (killed) {
                        const explosionSize = tank.isBoss ? 100 : 40;
                        createExplosion(tank.x, tank.y, explosionSize);
                        playExplosion(tank.isBoss ? 5 : 3);
                        playHit();
                        
                        let scoreGain = 10;
                        if (tank.isBoss) scoreGain = 500;
                        else if (tank.isElite) scoreGain = 50;
                        incrementScore(scoreGain);

                        // ── Drop power-up on enemy death ───────
                        if (tank.isBoss) {
                            // Boss multi-drop
                            for (let i = 0; i < 3; i++) {
                                const ox = (Math.random() - 0.5) * 40;
                                const oy = (Math.random() - 0.5) * 40;
                                tryDropPowerUp(tank.x + ox, tank.y + oy, true);
                            }
                        } else {
                            tryDropPowerUp(tank.x, tank.y, tank.isElite);
                        }
                    }
                }
            }
        }
    }

    // ── Player ↔ Power-Up ──────────────────────────
    const player = tanks.find(t => t.isPlayer);
    if (player && !player.isRespawning) {
        const powerUps = getPowerUps();
        for (let pu of powerUps) {
            if (!pu.alive) continue;

            const dx = pu.x - player.x;
            const dy = pu.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 25 + pu.radius) {
                pu.alive = false;
                collectPowerUp(pu.type, player);
            }
        }
    }
}
