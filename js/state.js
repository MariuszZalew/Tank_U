// ============================================
// GAME STATE (shared mutable state)
// ============================================

// DOM elements
export let canvas = null;
export let ctx = null;
export let restartBtn = null;

export function setCanvas(el) { canvas = el; }
export function setCtx(c) { ctx = c; }
export function setRestartBtn(b) { restartBtn = b; }

// DOM accessors (used by init)
export function getCanvas() { return canvas; }
export function getCtx() { return ctx; }

// Frame / loop
export let animationFrameId = null;
export function setAnimationFrameId(id) { animationFrameId = id; }
export function getAnimationFrameId() { return animationFrameId; }

// Score / progression
export let score = 0;
export let highScore = 0;
export let lives = 3;
export let wave = 1;
export let gameRunning = true;

export let targetingMode = 'auto'; // 'auto' or 'manual'

export function setScore(v) { score = v; }
export function getScore() { return score; }
export function setHighScore(v) { highScore = v; }
export function getHighScore() { return highScore; }
export function setLives(v) { lives = v; }
export function getLives() { return lives; }
export function setWave(v) { wave = v; }
export function getWave() { return wave; }
export function setGameRunning(v) { gameRunning = v; }
export function isGameRunning() { return gameRunning; }
export function setTargetingMode(v) { targetingMode = v; }
export function getTargetingMode() { return targetingMode; }

// Input state
export let mouseX = 0;
export let mouseY = 0;
export let mouseDown = false;
export let spacePressed = false;
export let lastMouseMoveTime = 0;
export let isMouseMoving = false;
export const keys = {};

export function setMouseX(v) { mouseX = v; }
export function setMouseY(v) { mouseY = v; }
export function setMouseDown(v) { mouseDown = v; }
export function setSpacePressed(v) { spacePressed = v; }
export function setLastMouseMoveTime(v) { lastMouseMoveTime = v; }
export function setIsMouseMoving(v) { isMouseMoving = v; }
export function getMouseX() { return mouseX; }
export function getMouseY() { return mouseY; }
export function isMouseDown() { return mouseDown; }
export function isSpacePressed() { return spacePressed; }
export function getLastMouseMoveTime() { return lastMouseMoveTime; }
export function isMouseMovingActive() { return isMouseMoving; }
export function getKeys() { return keys; }

// Game object collections
export let tanks = [];
export let bullets = [];
export let particles = [];
export let powerUps = [];    // on-field drops
export let activePowerUps = []; // player-buffed states { type, expiresAt }
export let screenShake = 0;
export let bossAnnounce = null; // { shownAt, duration }

export function setTanks(arr) { tanks = arr; }
export function getTanks() { return tanks; }
export function setBullets(arr) { bullets = arr; }
export function getBullets() { return bullets; }
export function setParticles(arr) { particles = arr; }
export function getParticles() { return particles; }
export function setPowerUps(arr) { powerUps = arr; }
export function getPowerUps() { return powerUps; }
export function setActivePowerUps(arr) { activePowerUps = arr; }
export function getActivePowerUps() { return activePowerUps; }
export function setScreenShake(v) { screenShake = v; }
export function getScreenShake() { return screenShake; }
export function setBossAnnounce(v) { bossAnnounce = v; }
export function getBossAnnounce() { return bossAnnounce; }

// ── Power-up helpers ─────────────────────────────
import { POWERUP_TYPES, PowerUp } from './powerup.js';

/** Drop a power-up on the field when an enemy dies. */
export function tryDropPowerUp(x, y, isElite) {
    // Non-elite: 6% chance; elite: 15% chance
    const dropChance = isElite ? 0.15 : 0.06;
    if (Math.random() > dropChance) return;

    const types = Object.values(POWERUP_TYPES);
    // Elite always gets a random type; non-elites exclude multi_shot for balance
    const pool = isElite ? types : types.filter(t => t.id !== 'multi_shot');
    const type = pool[Math.floor(Math.random() * pool.length)];

    getPowerUps().push(new PowerUp(x, y, type));
}

/** Collect an active power-up for a player tank. */
export function collectPowerUp(type, player) {
    // Remove any existing buff of the same type (re-stack lifetime)
    const existing = getActivePowerUps().find(p => p.type.id === type.id);
    if (existing) {
        existing.expiresAt = Date.now() + POWERUP_BUFF_DURATION;
        return;
    }

    // Health pack is instant — heal and don't stack a buff
    if (type.id === 'health_pack') {
        const healAmount = Math.min(30, player.maxHealth - player.health);
        player.health += healAmount;
        return;
    }

    getActivePowerUps().push({ type, expiresAt: Date.now() + POWERUP_BUFF_DURATION });
}

/** How long a non-health power-up buff lasts (ms). */
export const POWERUP_BUFF_DURATION = 8000; // 8 seconds

/** Check if a specific power-up type is currently active on the player. */
export function isPowerUpActive(typeId) {
    return getActivePowerUps().some(p => p.type.id === typeId && p.expiresAt > Date.now());
}
