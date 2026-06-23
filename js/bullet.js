// ============================================
// BULLET CLASS
// ============================================
import { getCanvas, getCtx } from "./state.js";

export class Bullet {
  static _nextId = 1;

  constructor(x, y, vx, vy, isPlayerBullet, ownerId, damage = 10) {
    this.id = Bullet._nextId++;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 4;
    this.isPlayerBullet = isPlayerBullet;
    this.ownerId = ownerId;
    this.damage = damage;
    this.alive = true;
    this.trail = []; // NEW: position history for trail
    this.age = 0; // NEW: for pulse animation
  }

  update() {
    // Store trail before moving
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 10) this.trail.shift();
    this.age++;

    this.x += this.vx;
    this.y += this.vy;
    const canvas = getCanvas();
    if (
      this.x < 0 ||
      this.x > canvas.width ||
      this.y < 0 ||
      this.y > canvas.height
    ) {
      this.alive = false;
    }
  }

  draw() {
    const ctx = getCtx();

    const isPlayer = this.isPlayerBullet;
    const coreColor = isPlayer ? "#4ecca3" : "#e74c3c";
    const glowColor = isPlayer ? "rgba(78,204,163," : "rgba(231,76,60,";
    const trailColor = isPlayer ? "rgba(78,204,163," : "rgba(231,76,60,";

    // Bullet travel angle (for elongated shape)
    const angle = Math.atan2(this.vy, this.vx);
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

    // ── Trail ──
    for (let i = 0; i < this.trail.length; i++) {
      const t = i / this.trail.length; // 0 = oldest, 1 = newest
      const pt = this.trail[i];
      const r = this.radius * t * 0.7;
      if (r < 0.5) continue;

      ctx.save();
      ctx.globalAlpha = t * 0.45;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fillStyle = trailColor + "1)";
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);

    // ── Outer pulse ring (animated) ──
    const pulse = 0.5 + 0.5 * Math.sin(this.age * 0.4);
    ctx.globalAlpha = 0.15 + 0.1 * pulse;
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      this.radius * 3.5 + pulse * 2,
      this.radius * 2,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = coreColor;
    ctx.fill();

    // ── Soft glow halo ──
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius * 2.2, this.radius * 1.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = glowColor + "1)";
    ctx.fill();

    // ── Shell casing (elongated body) ──
    ctx.globalAlpha = 1;
    const bodyLen = this.radius * 2.4 + Math.min(speed * 0.6, 5);
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyLen, this.radius * 0.85, 0, 0, Math.PI * 2);
    ctx.fillStyle = isPlayer ? "#1a7a5a" : "#7a1a1a";
    ctx.fill();

    // ── Core ──
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius * 1.6, this.radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fillStyle = coreColor;
    ctx.fill();

    // ── Nose tip (bright point) ──
    ctx.beginPath();
    ctx.ellipse(
      bodyLen * 0.55,
      0,
      this.radius * 0.6,
      this.radius * 0.4,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = isPlayer ? "#a0ffe0" : "#ffaaaa";
    ctx.fill();

    // ── Shine streak ──
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(
      -this.radius * 0.2,
      -this.radius * 0.25,
      this.radius * 1.1,
      this.radius * 0.22,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fill();

    // ── Tail spark (hot exhaust glow) ──
    ctx.globalAlpha = 0.6 + 0.3 * pulse;
    ctx.beginPath();
    ctx.ellipse(
      -bodyLen * 0.65,
      0,
      this.radius * 0.9,
      this.radius * 0.35,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = isPlayer ? "rgba(100,255,200,0.8)" : "rgba(255,160,50,0.9)";
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
