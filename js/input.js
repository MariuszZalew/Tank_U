// ============================================
// INPUT HANDLING
// ============================================
import { keys, mouseDown, spacePressed, getKeys, getCanvas, gameRunning,
         setMouseX, setMouseY, setMouseDown, setSpacePressed, isGameRunning,
         setLastMouseMoveTime, setIsMouseMoving, getLastMouseMoveTime } from './state.js';

const MOUSE_MOVE_THRESHOLD = 2000; // 2 seconds in milliseconds

export function setupInputHandlers() {
    document.addEventListener('keydown', (e) => {
        getKeys()[e.key.toLowerCase()] = true;

        if (e.code === 'Space') {
            e.preventDefault();
            setSpacePressed(true);
        }

        if (e.key === 'r' || e.key === 'R') {
            restartGame();
        }
    });

    document.addEventListener('keyup', (e) => {
        getKeys()[e.key.toLowerCase()] = false;

        if (e.code === 'Space') {
            setSpacePressed(false);
        }
    });

    const canvas = getCanvas();
    canvas.addEventListener('mousemove', (e) => {
        if (!isGameRunning()) return;
        const rect = canvas.getBoundingClientRect();
        setMouseX(e.clientX - rect.left);
        setMouseY(e.clientY - rect.top);
        setLastMouseMoveTime(Date.now());
        setIsMouseMoving(true);
    });

    canvas.addEventListener('mousedown', () => setMouseDown(true));
    canvas.addEventListener('mouseup', () => setMouseDown(false));

    // Hook restart button (handler injected by main)
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'restartBtn') {
            restartGame();
        }
    });

    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => window.startGame());
    }
}

export function updateMouseState() {
    const now = Date.now();
    const timeSinceLastMove = now - getLastMouseMoveTime();
    
    if (timeSinceLastMove > MOUSE_MOVE_THRESHOLD) {
        setIsMouseMoving(false);
    }
}

// Forward declaration — main.js binds the real restartGame to window
function restartGame() {
    if (typeof window.restartGame === 'function') {
        window.restartGame();
    }
}
