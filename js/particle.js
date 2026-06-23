// ============================================
// PARTICLE CLASS (Explosions)
// ============================================
import { getCtx } from './state.js';

export class Particle {
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

        const ctx = getCtx();
        ctx.globalAlpha = this.life;

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
    }
}
