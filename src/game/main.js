import { SnakeEngine, Directions } from "./engine.js";

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const btnStart = document.getElementById("btn-start");
const btnPause = document.getElementById("btn-pause");
const wrapToggle = document.getElementById("wrap-toggle");
const speedRange = document.getElementById("speed");
const sizeSelect = document.getElementById("size");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayDesc = document.getElementById("overlay-desc");
const overlayBtn = document.getElementById("overlay-btn");
const mobilePauseBtn = document.getElementById("btn-mobile-pause");
const volumeRange = document.getElementById("volume");
const sfxToggle = document.getElementById("sfx-toggle");
const vibroToggle = document.getElementById("vibro-toggle");

let engine = null;
let running = false;
let lastTime = 0;
let acc = 0; // time accumulator
let cellSize = 24; // pixels
let margin = 2;
let bestScore = 0;

// Local storage helpers
const LS_KEY_BEST = 'snake_best_score_v1';
function loadBest() {
  try { return Math.max(0, Number(localStorage.getItem(LS_KEY_BEST)) || 0); } catch { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem(LS_KEY_BEST, String(v)); } catch { /* ignore */ }
}

// Audio FX (WebAudio, inline synth)
const AudioFX = {
  ctx: null,
  out: null,
  enabled: true,
  volume: 0.7,
  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return; // unsupported
    this.ctx = new Ctx();
    const gain = this.ctx.createGain();
    gain.gain.value = this.volume;
    gain.connect(this.ctx.destination);
    this.out = gain;
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  setEnabled(on) { this.enabled = !!on; },
  setVolume(v01) { this.volume = v01; if (this.out) this.out.gain.value = v01; },
  beep({ freq = 440, dur = 0.08, type = 'sine', vol = 1.0 }) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.out) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.out);
    osc.start(t0);
    osc.stop(t0 + dur);
  },
  // Quick patterns
  eat() {
    // two short blips
    this.beep({ freq: 660, dur: 0.06, type: 'square', vol: 0.9 });
    setTimeout(() => this.beep({ freq: 880, dur: 0.06, type: 'square', vol: 0.8 }), 60);
  },
  over() {
    // descending chirp
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.out) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, t0);
    osc.frequency.exponentialRampToValueAtTime(110, t0 + 0.4);
    g.gain.setValueAtTime(0.9, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
    osc.connect(g).connect(this.out);
    osc.start(t0);
    osc.stop(t0 + 0.45);
  }
};

// Haptics
function vibrate(pattern) {
  if (vibroToggle && !vibroToggle.checked) return;
  if (navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }
}

function initEngine() {
  const size = Number(sizeSelect.value || 20);
  engine = new SnakeEngine({ cols: size, rows: size, wrap: wrapToggle.checked, speed: Number(speedRange.value) });
  // Resize canvas for crisp grid (square)
  const maxPixels = Math.min(640, Math.min(window.innerWidth - 40, window.innerHeight - 180));
  cellSize = Math.floor(maxPixels / size);
  if (cellSize < 12) cellSize = 12;
  canvas.width = cellSize * size;
  canvas.height = cellSize * size;
  margin = Math.max(1, Math.floor(cellSize / 12));
  bestScore = loadBest();
  updateScore(engine.score);
  updateBest(bestScore);
  draw(engine._snapshot());
}

function updateScore(v) { scoreEl.textContent = String(v); }
function updateBest(v) { if (bestEl) bestEl.textContent = String(v); }

function start() {
  if (!engine) initEngine();
  running = true;
  hideOverlay();
}

function pause() {
  running = false;
  showOverlay("已暂停", "按 空格 或 点击继续。", "继续");
}

function restart() {
  engine.reset();
  running = true;
  hideOverlay();
}

function showOverlay(title, desc, btnText = "开始") {
  overlayTitle.textContent = title;
  overlayDesc.textContent = desc;
  overlayBtn.textContent = btnText;
  overlay.classList.remove("hidden");
}

function hideOverlay() { overlay.classList.add("hidden"); }

function gameOver() {
  running = false;
  AudioFX.over();
  vibrate([60, 80, 60]);
  // ensure best saved
  if (engine && engine.score > bestScore) { bestScore = engine.score; saveBest(bestScore); updateBest(bestScore); }
  showOverlay("游戏结束", `分数：${engine.score}。空格重来。`, "重来");
}

function tickAndRender(dt) {
  if (!engine) return;
  acc += dt;
  const stepMs = 1000 / Math.max(1, engine.speed);
  while (acc >= stepMs) {
    acc -= stepMs;
    const prev = engine.score;
    const state = engine.tick();
    if (engine.score > prev) {
      // ate
      AudioFX.eat();
      vibrate(20);
      if (engine.score > bestScore) { bestScore = engine.score; saveBest(bestScore); updateBest(bestScore); }
    }
    if (state.over) {
      draw(state);
      gameOver();
      return;
    }
  }
  draw(engine._snapshot());
}

function draw(state) {
  const { cols, rows, snake, food } = state;
  // Background
  ctx.fillStyle = "#12162b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid (subtle)
  ctx.strokeStyle = "#1f2340";
  ctx.lineWidth = 1;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = x * cellSize;
      const py = y * cellSize;
      ctx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
    }
  }

  // Food
  if (food) {
    drawCell(food.x, food.y, "#f59e0b");
  }

  // Snake body
  for (let i = 0; i < snake.length - 1; i++) {
    const s = 0.85 - (snake.length - 2 - i) * 0.002;
    drawCell(snake[i].x, snake[i].y, "#34d399", s);
  }
  // Head
  const head = snake[snake.length - 1];
  drawCell(head.x, head.y, "#10b981", 1);
}

function drawCell(x, y, color, scale = 1) {
  const px = x * cellSize;
  const py = y * cellSize;
  const pad = Math.floor(margin + (1 - scale) * (cellSize - margin * 2) / 2);
  ctx.fillStyle = color;
  ctx.fillRect(px + pad, py + pad, cellSize - pad * 2, cellSize - pad * 2);
}

function handleKey(e) {
  switch (e.key) {
    case "ArrowUp": case "w": case "W": engine.setDirection(Directions.Up); break;
    case "ArrowDown": case "s": case "S": engine.setDirection(Directions.Down); break;
    case "ArrowLeft": case "a": case "A": engine.setDirection(Directions.Left); break;
    case "ArrowRight": case "d": case "D": engine.setDirection(Directions.Right); break;
    case " ": // space
      e.preventDefault();
      if (!engine || overlay.classList.contains("hidden") === false) {
        start();
      } else {
        running ? pause() : start();
      }
      break;
  }
}

// UI wiring
btnStart.addEventListener("click", () => (engine ? restart() : start()));
btnPause.addEventListener("click", () => (running ? pause() : start()));
overlayBtn.addEventListener("click", () => (engine ? restart() : start()));
wrapToggle.addEventListener("change", () => { if (engine) engine.setWrap(wrapToggle.checked); });
speedRange.addEventListener("input", () => { if (engine) engine.setSpeed(Number(speedRange.value)); });
sizeSelect.addEventListener("change", () => { initEngine(); });
window.addEventListener("keydown", handleKey);
window.addEventListener("resize", () => { if (engine) initEngine(); });

// Touch controls (swipe on canvas)
let touchStart = null;
let swipeConsumed = false;
function onTouchStart(e) {
  if (e.cancelable) e.preventDefault();
  const t = e.touches && e.touches[0];
  if (!t) return;
  touchStart = { x: t.clientX, y: t.clientY };
  swipeConsumed = false;
}
function onTouchMove(e) {
  if (!touchStart) return;
  const t = e.touches && e.touches[0];
  if (!t) return;
  if (e.cancelable) e.preventDefault();
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  const TH = 24; // px threshold
  if (!swipeConsumed && (Math.abs(dx) > TH || Math.abs(dy) > TH)) {
    if (Math.abs(dx) > Math.abs(dy)) {
      engine.setDirection(dx > 0 ? Directions.Right : Directions.Left);
    } else {
      engine.setDirection(dy > 0 ? Directions.Down : Directions.Up);
    }
    swipeConsumed = true; // 只触发一次，等待下一次触摸
  }
}
function onTouchEnd() {
  touchStart = null;
  swipeConsumed = false;
}
canvas.addEventListener("touchstart", onTouchStart, { passive: false });
canvas.addEventListener("touchmove", onTouchMove, { passive: false });
canvas.addEventListener("touchend", onTouchEnd, { passive: false });
canvas.addEventListener("touchcancel", onTouchEnd, { passive: false });

// On-screen d-pad buttons
document.querySelectorAll('[data-dir]')?.forEach((btn) => {
  btn.addEventListener('click', () => {
    const d = btn.getAttribute('data-dir');
    if (d === 'up') engine.setDirection(Directions.Up);
    else if (d === 'down') engine.setDirection(Directions.Down);
    else if (d === 'left') engine.setDirection(Directions.Left);
    else if (d === 'right') engine.setDirection(Directions.Right);
  });
});
mobilePauseBtn?.addEventListener('click', () => { running ? pause() : start(); });

// SFX controls
if (volumeRange) {
  const v = Number(volumeRange.value || 70) / 100;
  AudioFX.setVolume(v);
  volumeRange.addEventListener('input', () => {
    const vv = Math.max(0, Math.min(1, Number(volumeRange.value) / 100));
    AudioFX.setVolume(vv);
  });
}
if (sfxToggle) {
  AudioFX.setEnabled(sfxToggle.checked);
  sfxToggle.addEventListener('change', () => {
    AudioFX.setEnabled(sfxToggle.checked);
    if (sfxToggle.checked) { AudioFX.init(); AudioFX.resume(); }
  });
}

// Auto-pause on background / screen off
document.addEventListener('visibilitychange', () => { if (document.hidden && running) pause(); });
window.addEventListener('blur', () => { if (running) pause(); });
window.addEventListener('pagehide', () => { if (running) pause(); });

// Ensure audio can start after first gesture (autoplay policy)
const resumeAudioOnce = () => { AudioFX.init(); AudioFX.resume(); document.removeEventListener('pointerdown', resumeAudioOnce); document.removeEventListener('keydown', resumeAudioOnce); };
document.addEventListener('pointerdown', resumeAudioOnce);
document.addEventListener('keydown', resumeAudioOnce);

// Game loop
function loop(ts) {
  if (!lastTime) lastTime = ts;
  const dt = ts - lastTime;
  lastTime = ts;
  if (running) tickAndRender(dt);
  else draw(engine ? engine._snapshot() : new SnakeEngine()._snapshot());
  updateScore(engine ? engine.score : 0);
  requestAnimationFrame(loop);
}

// Initial state and overlay
initEngine();
showOverlay("开始游戏", "按 空格 开始，方向键或 WASD 控制。", "开始");
requestAnimationFrame(loop);
