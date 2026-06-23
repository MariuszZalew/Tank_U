// ============================================
// EFFECTS (explosions, screen shake)
// ============================================
import { getParticles, setParticles, getScreenShake, setScreenShake } from './state.js';
import { Particle } from './particle.js';

export function createExplosion(x, y, count = 30) {
    const colors = [
        '#f39c12',
        '#e74c3c',
        '#f1c40f',
        '#ffffff',
    ];

    setScreenShake(Math.max(getScreenShake(), count * 0.4));

    const particles = getParticles();
    for (let i = 0; i < count; i++) {
        particles.push(
            new Particle(
                x,
                y,
                colors[Math.floor(Math.random() * colors.length)]
            )
        );
    }
    setParticles(particles);
}
