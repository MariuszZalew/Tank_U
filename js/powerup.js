// ============================================
// POWER-UP SYSTEM
// ============================================
import { getCanvas, getCtx } from './state.js';

export const POWERUP_TYPES = {
    HEALTH_PACK:   { id: 'health_pack',   label: '+Health',   color: '#2ecc71', icon: '+' },
    RAPID_FIRE:    { id: 'rapid_fire',    label: 'Rapid Fire', color: '#f39c12', icon: '»' },
    SHIELD:        { id: 'shield',        label: 'Shield',   color: '#3498db', icon: '◆' },
    MULTI_SHOT:    { id: 'multi_shot',    label: 'Multi-Shot', color: '#e74c3c', icon: '†' },
    SPEED_BOOST:   { id: 'speed_boost',   label: 'Speed',    color: '#1abc9c', icon: '›' },
    DAMAGE_UP:     { id: 'damage_up',     label: 'Damage',   color: '#e67e22', icon: '!'},
};

// How often each type can drop (seconds before expiring if unused)
const POWERUP_LIFETIME = 10000;

export class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;          // one of POWERUP_TYPES values
        this.radius = 14;
        this.alive = true;
        this.age = 0;
        this.expiresAt = Date.now() + POWERUP_LIFETIME;
        this.bobPhase = Math.random() * Math.PI * 2;
    }

    update() {
        this.age++;
        if (Date.now() > this.expiresAt) {
            this.alive = false;
        }
    }

    draw() {
        const ctx = getCtx();
        const canvas = getCanvas();

        // Fade out in last 2 seconds
        const remaining = this.expiresAt - Date.now();
        let alpha = 1;
        if (remaining < 2000) {
            alpha = Math.max(0, remaining / 2000);
        }

        // Bob animation
        const bobY = Math.sin(this.age * 0.06 + this.bobPhase) * 3;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y + bobY);

        // Outer glow
        const pulse = 0.5 + 0.5 * Math.sin(this.age * 0.08);
        ctx.globalAlpha = alpha * (0.12 + 0.08 * pulse);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = this.type.color;
        ctx.fill();

        // Restore alpha for body
        ctx.globalAlpha = alpha;

        // Body circle
        const grad = ctx.createRadialGradient(-3, -3, 1, 0, 0, this.radius);
        grad.addColorStop(0, lightenColor(this.type.color, 40));
        grad.addColorStop(1, this.type.color);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Border ring
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Icon text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.icon, 0, 0);

        ctx.restore();
    }
}

// Helper: lighten a hex color by amount (0-100)
function lightenColor(hex, amount) {
    const num = parseInt(hex.slice(1), 16);
    let r = Math.min(255, ((num >> 16) & 0xff) + amount);
    let g = Math.min(255, ((num >> 8) & 0xff) + amount);
    let b = Math.min(255, (num & 0xff) + amount);
    return `rgb(${r},${g},${b})`;
}
