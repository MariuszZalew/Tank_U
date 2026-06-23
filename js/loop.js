// ============================================
// GAME LOOP
// ============================================
import { getTanks, setTanks, getBullets, setBullets, getParticles, setParticles,
         getPowerUps, setPowerUps, getActivePowerUps, setActivePowerUps,
         isGameRunning, getAnimationFrameId, setAnimationFrameId, getCtx, getCanvas, getBossAnnounce } from './state.js';
import { drawBackground, applyScreenShake } from './render.js';
import { checkCollisions } from './collisions.js';
import { checkWaveComplete } from './waves.js';
import { updateUI } from './ui.js';
import { updateMouseState } from './input.js';
import { CONFIG } from './config.js';

export function gameLoop() {
    if (!isGameRunning()) return;

    drawBackground();
    const ctx = getCtx();
    const canvas = getCanvas();
    ctx.save();
    applyScreenShake();

    // Remove dead enemy tanks each frame so the wave-clear check works
    const tanks = getTanks().filter(t => t.isPlayer || t.health > 0);
    setTanks(tanks);

    checkWaveComplete();
    updateUI();

    updateMouseState();

    // ── Update active buffs (expire old ones) ──
    const now = Date.now();
    const buffs = getActivePowerUps().filter(p => p.expiresAt > now);
    setActivePowerUps(buffs);

    // ── Update and draw power-ups ──
    const livePowerUps = getPowerUps().filter(p => p.alive);
    setPowerUps(livePowerUps);
    livePowerUps.forEach(pu => {
        pu.update();
        pu.draw();
    });

    tanks.forEach(tank => {
        tank.update();
        tank.draw();
    });

    let liveBullets = getBullets().filter(b => b.alive);
    
    // Bullet capping
    const enemyBullets = liveBullets.filter(b => !b.isPlayerBullet);
    if (enemyBullets.length > CONFIG.MAX_ENEMY_BULLETS) {
        const toRemove = enemyBullets.length - CONFIG.MAX_ENEMY_BULLETS;
        const removedIds = new Set(enemyBullets.slice(0, toRemove).map(b => b.id)); // Assuming Bullet has an id or use index
        liveBullets = liveBullets.filter(b => b.isPlayerBullet || !removedIds.has(b.id));
    }

    setBullets(liveBullets);
    liveBullets.forEach(bullet => {
        bullet.update();
        bullet.draw();
    });

    const liveParticles = getParticles().filter(p => p.life > 0);
    setParticles(liveParticles);
    liveParticles.forEach(particle => {
        particle.update();
        particle.draw();
    });

    checkCollisions();

    // Boss Announcement
    const announce = getBossAnnounce();
    if (announce && now - announce.shownAt < announce.duration) {
        const elapsed = now - announce.shownAt;
        const opacity = elapsed < 500 ? elapsed / 500 : (announce.duration - elapsed < 500 ? (announce.duration - elapsed) / 500 : 1);
        
        ctx.save();
        ctx.fillStyle = `rgba(231, 76, 60, ${opacity * 0.2})`;
        ctx.fillRect(0, canvas.height / 2 - 50, canvas.width, 100);
        
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('WARNING: BOSS INCOMING', canvas.width / 2, canvas.height / 2 + 15);
        ctx.restore();
    }

    ctx.restore();
    setAnimationFrameId(requestAnimationFrame(gameLoop));
}
