# AI Novel Writer

AI 辅助中文网络小说创作桌面应用。使用 Google Gemini API 生成内容，CodeMirror 6 提供 Markdown 编辑体验。

## 技术栈

- **桌面框架** — Electron 33
- **前端** — Vue 3.5 + Vite 6 + Element Plus 2.9
- **状态管理** — Pinia
- **编辑器** — CodeMirror 6 (Markdown + One Dark 主题)
- **AI 服务** — Google Gemini (@google/genai)
- **代理支持** — undici (ProxyAgent)

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（Vite dev server + Electron 并发启动）
npm run dev:electron

# 构建前端
npm run build

# 运行已构建的应用
npm start

# 完整打包（Vite build + electron-builder）
npm run build:electron
```

## 功能

- 项目创建向导 — 设定题材、卷数，自动生成目录结构
- 三栏编辑器 — 文件树 | Markdown 编辑器 | AI 助手面板
- AI 续写/改写 — 流式输出，支持自定义指令
- 上下文感知 — 自动组装世界观、人物、大纲、前文摘要作为 AI 上下文
- 章节摘要 — AI 自动生成章节摘要并更新卷摘要
- 深色主题

## 项目结构

```
src/
├── main/               # Electron 主进程
│   ├── index.js        # 入口：创建窗口、代理检测
│   ├── ipc-handlers.js # IPC 通道注册
│   ├── ai-service.js   # Gemini API 封装
│   ├── context-builder.js # 章节上下文组装
│   ├── file-manager.js # 文件/目录操作
│   ├── project-manager.js # 项目管理
│   └── summarizer.js   # 摘要生成
├── preload/
│   └── index.js        # contextBridge → window.electronAPI
└── renderer/           # Vue 渲染进程
    ├── views/          # HomePage, WizardPage, EditorPage
    ├── components/     # AiPanel, FileTree, MarkdownEditor 等
    └── stores/         # Pinia stores (ai, project)
```

## 小说项目目录

应用创建的小说项目结构：

```
小说名/
├── project.json
├── meta/
│   ├── world.md        # 世界观设定
│   ├── characters.md   # 人物档案
│   ├── outline.md      # 总大纲
│   └── timeline.md     # 时间线
└── volumes/
    ├── vol01/
    │   ├── outline.md  # 卷大纲
    │   ├── summary.md  # 卷摘要
    │   └── ch001.md    # 章节
    └── ...
```

## 许可

MIT
