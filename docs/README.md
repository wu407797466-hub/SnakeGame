## 贪吃蛇网站

一个使用 HTML5 Canvas 与原生 JavaScript 实现的简洁贪吃蛇游戏，支持穿墙模式、可调速度与棋盘尺寸，内置可在浏览器中运行的基础测试页。

### 目录结构

- `src/` 前端静态网站与游戏源码
  - `index.html` 页面入口
  - `styles.css` 基础样式
  - `game/engine.js` 核心规则引擎（无渲染）
  - `game/main.js` 画布渲染与输入控制
- `assets/` 资源（占位）
- `tests/` 基础测试
  - `test_engine.html` 直接在浏览器中验证核心逻辑

### 运行

方式一（直接打开）

1. 用浏览器打开 `src/index.html` 即可玩。

方式二（本地静态服务器）

1. Python 3：在项目根目录运行 `python -m http.server 8000`
2. 打开 `http://localhost:8000/src/index.html`

### 测试

1. 打开 `tests/test_engine.html` 查看断言结果列表。

### 操作

- 移动：方向键 或 WASD
- 开始/暂停：空格
- UI 可调：穿墙、速度、棋盘尺寸

### 说明

- 规则引擎与渲染分离，方便替换 UI 或写自动化测试。
- 食物生成基于空位均匀随机；可注入自定义 RNG 以实现可重复测试。

