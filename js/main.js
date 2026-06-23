// ============================================
// MAIN ENTRY POINT — initialization, start, restart
// ============================================
import { CONFIG } from './config.js';
import { setCanvas, setCtx, setRestartBtn, setHighScore, setGameRunning,
         setScore, setLives, setWave, setTanks, setBullets, setParticles,
         setPowerUps, setActivePowerUps,
         getCanvas, getAnimationFrameId, setAnimationFrameId,
         setTargetingMode, getTargetingMode } from './state.js';
import { setupInputHandlers } from './input.js';
import { Tank } from './tank.js';
import { PowerUp } from './powerup.js';

function resetTankId() {
    Tank._nextId = 1;
}
import { spawnWave } from './waves.js';
import { updateUI, gameOver } from './ui.js';
import { gameLoop } from './loop.js';

function initGame() {
    Tank._nextId = 1;
    setGameRunning(true);
    setScore(0);
    setLives(3);
    setWave(1);

    const canvas = getCanvas();
    setTanks([
        new Tank(100, canvas.height / 2, '#4ecca3', true)
    ]);
    setBullets([]);
    setParticles([]);
    setPowerUps([]);
    setActivePowerUps([]);

    spawnWave();
    updateUI();
}

function init() {
    const canvasEl = document.getElementById('gameCanvas');
    setCanvas(canvasEl);
    setCtx(canvasEl.getContext('2d'));
    setRestartBtn(document.getElementById('restartBtn'));

    setHighScore(parseInt(localStorage.getItem('tankHighScore')) || 0);

    setupInputHandlers();
}

window.startGame = function () {
    const selectedMode = document.querySelector('input[name="targetingMode"]:checked').value;
    setTargetingMode(selectedMode);
    
    document.getElementById('startScreen').style.display = 'none';
    playStart();
    initGame();
    gameLoop();
};

window.restartGame = function () {
    document.getElementById('gameOver').style.display = 'none';
    const id = getAnimationFrameId();
    if (id !== null) {
        cancelAnimationFrame(id);
        setAnimationFrameId(null);
    }
    initGame();
    gameLoop();
};

// Sound
import {
    playStart,
    playPlayerShoot,
    playEnemyShoot,
    playHit,
    playExplosion,
    playPlayerHit,
    playWaveComplete,
    playGameOver,
} from './sound.js';

// Re-export for other modules that referenced them
export { initGame, gameOver };

// Expose sounds on window so other modules can call them
window.__SOUNDS__ = {
    playPlayerShoot,
    playEnemyShoot,
    playHit,
    playExplosion,
    playPlayerHit,
    playWaveComplete,
    playGameOver,
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
