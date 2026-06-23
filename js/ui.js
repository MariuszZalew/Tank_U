// ============================================
// UI / HUD / GAME STATE TRANSITIONS
// ============================================
import { getScore, setScore, getHighScore, setHighScore, getLives, getWave,
         setGameRunning, isGameRunning, getTanks } from './state.js';
import { playGameOver, playPlayerHit } from './sound.js';
import { CONFIG } from './config.js';

export function updateUI() {
    document.getElementById('score').textContent = getScore();
    document.getElementById('highScore').textContent = getHighScore();
    document.getElementById('lives').textContent = getLives();
    document.getElementById('wave').textContent = getWave();

    // Update Shield Cooldown UI
    const player = getTanks().find(t => t.isPlayer);
    if (player) {
        const now = Date.now();
        const isActive = now < player.shieldActiveUntil;
        const timeSinceUsed = now - player.lastShieldUsed;
        const cooldown = CONFIG.SHIELD_ABILITY_COOLDOWN;
        const percent = Math.min(100, (timeSinceUsed / cooldown) * 100);
        const isReady = percent >= 100;
        
        const card = document.querySelector('.ability-card');
        const bar = document.getElementById('shieldCooldown');
        const statusLabel = document.getElementById('shieldStatus');

        if (card && bar && statusLabel) {
            bar.style.width = percent + '%';
            
            if (isActive) {
                card.className = 'ability-card state-active';
                statusLabel.textContent = 'ACTIVE';
                bar.style.background = '#3498db'; // Bright blue
            } else if (isReady) {
                card.className = 'ability-card state-ready';
                statusLabel.textContent = 'READY';
                bar.style.background = '#4ecca3'; // Cyan
            } else {
                card.className = 'ability-card state-charging';
                statusLabel.textContent = 'CHARGING';
                bar.style.background = '#f39c12'; // Orange
            }
        }
    }
}

export function incrementScore(amount) {
    setScore(getScore() + amount);
    updateUI();
}

export function gameOver() {
    setGameRunning(false);
    playGameOver();
    document.getElementById('finalScore').textContent = getScore();
    document.getElementById('gameOver').style.display = 'block';

    if (getScore() > getHighScore()) {
        setHighScore(getScore());
        localStorage.setItem('tankHighScore', getHighScore());
    }
}
