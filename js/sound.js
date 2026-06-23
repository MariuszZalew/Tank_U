// ============================================
// SOUND SYSTEM — synthesized audio via Web Audio API
// No external assets required.
// ============================================
import { CONFIG } from './config.js';

let audioCtx = null;

function getContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

/** Play a short burst of noise (explosions, hits) */
export function playNoise(duration = 0.15, freqStart = 800, freqEnd = 200,
                             volume = 0.3, type = 'lowpass') {
    const ctx = getContext();
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        // Simple white noise approximation via random walk
        data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    if (type === 'lowpass') {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freqStart, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), ctx.currentTime + duration);
    } else {
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(freqStart, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), ctx.currentTime + duration);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
}

/** Play a tonal sound (shoot, power-up) */
export function playTone(freqStart, freqEnd, duration = 0.12,
                          volume = 0.15, type = 'square') {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), ctx.currentTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.01);
}

// --- Sound presets for game events ---

export function playPlayerShoot() {
    // Soft "pew" — sine wave, shorter and lower
    const ctx = getContext();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
}

export function playEnemyShoot() {
    // Lower, duller "thwip"
    const ctx = getContext();
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.17);
}

export function playHit() {
    // Short noise burst — bullet impact on tank
    playNoise(0.08, 2000, 400, 0.2, 'lowpass');
}

export function playExplosion(count = 1) {
    // Bigger explosion noise — enemy destroyed
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            playNoise(0.3 + Math.random() * 0.2, 1500, 80, 0.4);
        }, i * 60);
    }
}

export function playPlayerHit() {
    // Hurt sound — harsh noise + low thud
    const ctx = getContext();
    playNoise(0.2, 1000, 150, 0.35);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.25);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.26);
}

export function playWaveComplete() {
    // Ascending arpeggio — fanfare-ish
    const ctx = getContext();
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.1 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.15);

        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.16);
    });
}

export function playGameOver() {
    // Descending tones — sad trombone-ish
    const ctx = getContext();
    const notes = [440, 350, 280, 200];
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.25);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.25);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.25 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.4);

        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.25);
        osc.stop(ctx.currentTime + i * 0.25 + 0.41);
    });
}

export function playStart() {
    // Quick ascending — "let's go!"
    const ctx = getContext();
    const notes = [392, 523, 659, 784];
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.15);

        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.16);
    });
}
