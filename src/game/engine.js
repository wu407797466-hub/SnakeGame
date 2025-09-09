// Minimal, deterministic-capable Snake engine (no rendering)

export class SnakeEngine {
  constructor(options = {}) {
    const {
      cols = 20,
      rows = 20,
      wrap = false,
      speed = 8, // steps per second (used by host)
      rng = Math.random,
    } = options;

    this.cols = cols;
    this.rows = rows;
    this.wrap = wrap;
    this.speed = speed;
    this._rng = rng;

    this.reset();
  }

  setWrap(enable) {
    this.wrap = !!enable;
  }

  setSpeed(stepsPerSecond) {
    this.speed = Math.max(1, Number(stepsPerSecond) || 8);
  }

  setRng(fn) {
    if (typeof fn === "function") this._rng = fn;
  }

  reset() {
    const cx = Math.floor(this.cols / 2);
    const cy = Math.floor(this.rows / 2);
    // Start with length 3 going right
    this.snake = [
      { x: cx - 1, y: cy },
      { x: cx, y: cy },
      { x: cx + 1, y: cy },
    ];
    this.dir = { x: 1, y: 0 };
    this.pendingDir = null; // to avoid instant reversal within a tick
    this.food = this._spawnFood();
    this.score = 0;
    this.over = false;
    this._justGrew = false;
  }

  // Try to set a new direction; ignores direct reversal
  setDirection(vec) {
    if (!vec || this.over) return;
    const nd = { x: Math.sign(vec.x || 0), y: Math.sign(vec.y || 0) };
    if (nd.x === 0 && nd.y === 0) return;
    const cur = this.pendingDir || this.dir;
    if (cur.x + nd.x === 0 && cur.y + nd.y === 0) return; // reverse ignored
    this.pendingDir = nd;
  }

  tick() {
    if (this.over) return this._snapshot();
    if (this.pendingDir) {
      this.dir = this.pendingDir;
      this.pendingDir = null;
    }

    const head = this.snake[this.snake.length - 1];
    let nx = head.x + this.dir.x;
    let ny = head.y + this.dir.y;

    if (this.wrap) {
      nx = (nx + this.cols) % this.cols;
      ny = (ny + this.rows) % this.rows;
    }

    // Wall collision
    if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) {
      this.over = true;
      return this._snapshot();
    }

    // Self collision
    if (this._hits(nx, ny)) {
      this.over = true;
      return this._snapshot();
    }

    // Move: push head
    this.snake.push({ x: nx, y: ny });

    // Eat?
    if (this.food && nx === this.food.x && ny === this.food.y) {
      this.score += 1;
      this._justGrew = true;
      this.food = this._spawnFood();
    } else {
      // pop tail unless grew
      this.snake.shift();
      this._justGrew = false;
    }

    return this._snapshot();
  }

  _hits(x, y) {
    // If we just grew, tail remains; but since head is not yet appended at check time, we check current body
    for (let i = 0; i < this.snake.length; i++) {
      if (this.snake[i].x === x && this.snake[i].y === y) return true;
    }
    return false;
  }

  _spawnFood() {
    // Collect empty cells count; choose random index
    const total = this.cols * this.rows;
    const occupied = new Set(
      this.snake.map((c) => `${c.x},${c.y}`)
    );
    const emptyCount = total - occupied.size;
    if (emptyCount <= 0) return null; // full board
    const r = Math.floor(this._rng() * emptyCount);
    let k = 0;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const key = `${x},${y}`;
        if (!occupied.has(key)) {
          if (k === r) return { x, y };
          k++;
        }
      }
    }
    return null;
  }

  _snapshot() {
    return {
      cols: this.cols,
      rows: this.rows,
      wrap: this.wrap,
      score: this.score,
      over: this.over,
      snake: this.snake.slice(),
      food: this.food ? { ...this.food } : null,
      dir: { ...this.dir },
    };
  }
}

export const Directions = {
  Up: { x: 0, y: -1 },
  Down: { x: 0, y: 1 },
  Left: { x: -1, y: 0 },
  Right: { x: 1, y: 0 },
};

