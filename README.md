# MusicGame

四轨节奏对战游戏与可发布谱面的编曲工坊。当前开发基线使用 Phaser、TypeScript、Vite、Express、Zod、Vitest 与 Playwright。

## 快速开始

要求 Node.js 22+ 与 npm 10+。

```bash
npm install
npm run dev
```

启动后可访问：

- 游戏：`http://localhost:5173`
- 编曲工坊：`http://localhost:5174`
- 本地 API：`http://localhost:3001/api/health`

编曲工坊导入音频、制作谱面并点击“发布”后，返回游戏刷新曲目列表即可游玩，不需要在游戏中分别上传音频和 Chart。

## 工作区

```text
apps/game/          Phaser 游戏前端
apps/editor/        Phaser + DOM 编曲工坊
apps/mock-api/      Express 文件系统曲谱库
packages/chart-core/ 共享协议、校验与判定逻辑
prototypes/         只读的原始 HTML 原型
```

曲谱库数据默认保存在 `apps/mock-api/data/songs/`。`signal-drift` 是可直接游玩的合成种子歌曲。

## 命令

```bash
npm run dev       # 同时启动 API、游戏和编曲工坊
npm run lint      # 全工作区 TypeScript 检查
npm test          # Vitest 与 Supertest 测试
npm run build     # 全工作区生产构建
npm run test:e2e  # Playwright 完整发布与游玩闭环
```

首次执行端到端测试前安装 Chromium：

```bash
npx playwright install chromium
```

## API

- `GET /api/songs`
- `GET /api/songs/:id`
- `GET /api/songs/:id/charts/:difficulty`
- `GET /api/songs/:id/audio`
- `POST /api/songs`，multipart 字段为 `audio`、`manifest` 和 `charts`

发布时后端重新计算音频 SHA-256、大小和时长，再使用共享协议验证谱面。前端的音频元数据不作为可信输入。

## 原型归档

原始 `note-chart-editor.html` 与 `rhythm-battle-prototype.html` 保留在 `prototypes/`，只作为视觉和行为参考；正式功能在 workspace 工程中继续开发。

远端仓库：`https://github.com/superrman1290/MusicGame.git`
