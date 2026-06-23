// ============================================
// WAVES / SPAWNING
// ============================================
import { getCanvas, getTanks, setTanks, getWave, setWave, setScreenShake, setBossAnnounce } from './state.js';
import { Tank } from './tank.js';
import { playWaveComplete } from './sound.js';
import { CONFIG } from './config.js';

export function spawnWave() {
    const canvas = getCanvas();
    const wave = getWave();
    const tanks = getTanks();

    // 1. Always spawn the regular wave of enemies
    const enemyCount = wave + 1;
    for (let i = 0; i < enemyCount; i++) {
        const isElite = Math.random() < 0.2;
        let x, y;
        const side = Math.floor(Math.random() * 4);
        switch (side) {
            case 0: x = Math.random() * canvas.width; y = -30; break;
            case 1: x = canvas.width + 30; y = Math.random() * canvas.height; break;
            case 2: x = Math.random() * canvas.width; y = canvas.height + 30; break;
            case 3: x = -30; y = Math.random() * canvas.height; break;
        }
        const color = isElite ? '#f5a623' : '#e74c3c';
        const enemy = new Tank(x, y, color, false, isElite);
        tanks.push(enemy);
    }

    // 2. Add the Boss if it's a designated boss wave
    if (wave % CONFIG.BOSS_WAVE_INTERVAL === 0) {
        const x = canvas.width / 2;
        const y = -100; // Spawn off-screen top
        const boss = new Tank(x, y, '#e74c3c', false, false, true);
        tanks.push(boss);
        
        // Trigger announcement and impact
        setBossAnnounce({ shownAt: Date.now(), duration: 3000 });
        setScreenShake(20);
    }

    setTanks(tanks);
}

export function checkWaveComplete() {
    const tanks = getTanks();
    const enemies = tanks.filter(t => !t.isPlayer);
    if (enemies.length === 0) {
        setWave(getWave() + 1);
        playWaveComplete();
        spawnWave();
    }
}
