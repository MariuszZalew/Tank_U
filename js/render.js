// ============================================
// RENDERING
// ============================================
import { CONFIG } from "./config.js";
import { getCanvas, getCtx, getScreenShake, setScreenShake } from "./state.js";

export function drawBackground() {
  const canvas = getCanvas();
  const ctx = getCtx();

  // 1. Base Dark Metallic Floor with Noise Texture
  ctx.fillStyle = "#16213e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Subtle Noise/Grain
  ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
  for (let i = 0; i < 1000; i++) {
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
  }

  // 2. Beveled Industrial Plates
  const panelSize = CONFIG.GRID_SIZE * 4;
  for (let x = 0; x < canvas.width; x += panelSize) {
    for (let y = 0; y < canvas.height; y += panelSize) {
      // Plate Body
      ctx.fillStyle = "rgba(255, 255, 255, 0.01)";
      ctx.fillRect(x + 2, y + 2, panelSize - 4, panelSize - 4);
      
      // Beveled Edges (Shading)
      ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, panelSize, panelSize);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.strokeRect(x + 1, y + 1, panelSize - 2, panelSize - 2);

      // Recessed Rivets
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      const rSize = 4;
      ctx.fillRect(x + 10, y + 10, rSize, rSize);
      ctx.fillRect(x + panelSize - 14, y + 10, rSize, rSize);
      ctx.fillRect(x + 10, y + panelSize - 14, rSize, rSize);
      ctx.fillRect(x + panelSize - 14, y + panelSize - 14, rSize, rSize);
    }
  }

  // 3. Battle Damage (Scorch Marks)
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  const seed = 42; // Constant seed for "static" marks
  for (let i = 0; i < 5; i++) {
    const sx = (i * 137) % canvas.width;
    const sy = (i * 223) % canvas.height;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 30 + i * 5, 10 + i * 2, i, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Tech-Grid (Glowing Energy Lines)
  ctx.strokeStyle = "rgba(78, 204, 163, 0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += CONFIG.GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += CONFIG.GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // 5. Border Hazard Stripes
  ctx.save();
  ctx.strokeStyle = "rgba(243, 156, 18, 0.15)";
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 10]);
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  ctx.restore();

  // 6. Intersection Highlights
  ctx.fillStyle = "rgba(78, 204, 163, 0.12)";
  for (let x = 0; x < canvas.width; x += CONFIG.GRID_SIZE) {
    for (let y = 0; y < canvas.height; y += CONFIG.GRID_SIZE) {
      if ((x + y) / CONFIG.GRID_SIZE % 4 === 0) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 7. Ambient Vignette
  const vignette = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.width / 3,
    canvas.width / 2, canvas.height / 2, canvas.width * 0.9
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.7)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function applyScreenShake() {
  let shake = getScreenShake();
  if (shake > 0) {
    const ctx = getCtx();
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake *= 0.9;
    setScreenShake(shake);
  }
}
