# AI Novel Writer — 开发文档

## 项目概述

Electron + Vue 3 桌面应用，用于 AI 辅助中文网络小说创作。使用 Google Gemini API 生成内容，CodeMirror 6 提供 Markdown 编辑体验。

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Electron 33 |
| 前端框架 | Vue 3.5 + Vite 6 |
| UI 组件 | Element Plus 2.9 |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 (hash history) |
| 编辑器 | CodeMirror 6 (lang-markdown, theme-one-dark) |
| Markdown 渲染 | marked.js |
| AI 服务 | Google Gemini (@google/genai) |
| 代理支持 | undici (ProxyAgent) |

## 目录结构

```
aiNovel/
├── src/
│   ├── main/               # Electron 主进程
│   │   ├── index.js        # 入口：创建窗口、代理检测
│   │   ├── ipc-handlers.js # 所有 IPC 通道注册
│   │   ├── ai-service.js   # Google Gemini 调用封装（单例）
│   │   ├── context-builder.js # 章节上下文组装（单例）
│   │   ├── file-manager.js # 文件/目录操作（单例）
│   │   ├── project-manager.js # 项目打开/导入/最近列表
│   │   └── summarizer.js   # 章节摘要生成 + 更新卷摘要
│   ├── preload/
│   │   └── index.js        # contextBridge 暴露 window.electronAPI
│   ├── renderer/           # Vue 渲染进程 (Vite root)
│   │   ├── main.js         # Vue 应用入口
│   │   ├── App.vue
│   │   ├── router/index.js # 路由定义
│   │   ├── stores/
│   │   │   ├── ai.js       # AI 流式状态 (Pinia)
│   │   │   └── project.js  # 项目/文件状态 (Pinia)
│   │   ├── views/
│   │   │   ├── HomePage.vue    # 首页：最近项目、新建/导入
│   │   │   ├── WizardPage.vue  # 项目创建向导（多步骤）
│   │   │   └── EditorPage.vue  # 主编辑页（三栏布局）
│   │   └── components/
│   │       ├── AiPanel.vue       # 右侧 AI 助手面板
│   │       ├── MarkdownEditor.vue # CodeMirror 6 编辑器
│   │       ├── FileTree.vue       # 左侧文件树
│   │       ├── StatusBar.vue      # 底部状态栏（字数等）
│   │       └── ProjectCard.vue    # 首页项目卡片
│   └── shared/
│       └── constants.js    # 共享常量
├── scripts/
│   └── dev.js              # 并发启动 Vite + Electron
├── package.json
└── vite.config.js          # Vite root = src/renderer/，out = dist/renderer/
```

## 路由

| 路径 | 视图 | 说明 |
|---|---|---|
| `/` | HomePage | 首页，最近项目列表 |
| `/wizard` | WizardPage | 新建项目向导 |
| `/editor` | EditorPage | 主编辑器（三栏：文件树 \| 编辑器 \| AI面板）|

## IPC 通道

所有通道在 `ipc-handlers.js` 注册，通过 `window.electronAPI` 调用（preload 暴露）。

### 文件操作
| 通道 | 参数 | 说明 |
|---|---|---|
| `file:read` | filePath | 读取文件 UTF-8 内容 |
| `file:write` | filePath, content | 写入（自动创建父目录）|
| `file:create` | filePath, content | 创建新文件 |
| `file:delete` | filePath | 删除文件或目录（recursive）|
| `file:rename` | oldPath, newPath | 重命名 |
| `file:createDir` | dirPath | 创建目录 |
| `file:getTree` | projectPath | 返回文件树（只含 .md 文件）|

### 项目操作
| 通道 | 参数 | 说明 |
|---|---|---|
| `project:create` | { parentDir, projectName, volumes, genre } | 初始化项目目录结构 |
| `project:open` | projectPath | 读取 project.json |
| `project:getRecent` | — | 最近项目列表 |
| `project:import` | — | 打开目录选择框，导入现有项目 |
| `dialog:selectDir` | — | 打开目录选择框 |

### AI 操作
| 通道 | 参数 | 说明 |
|---|---|---|
| `ai:setKey` | key | 设置 Gemini API Key |
| `ai:getKey` | — | 获取当前 API Key |
| `ai:setModel` | model | 切换模型 |
| `ai:getModel` | — | 获取当前模型 |
| `ai:getAvailableModels` | — | 返回可用模型列表 |
| `ai:generateStructure` | { genre, concept, volumes } | 生成小说框架（流式）|
| `ai:generateChapter` | { projectPath, filePath, instruction } | 生成/改写章节（流式）|
| `ai:continueWriting` | { projectPath, filePath, instruction } | 续写章节（流式）|
| `ai:summarize` | { projectPath, filePath } | 生成章节摘要并更新卷摘要 |
| `ai:customPrompt` | { systemPrompt, userMessage, context } | 自定义 AI 提问 |
| `ai:detectAiContent` | content | 检测文本 AI 程度，返回评分和建议 |

### AI 流式事件（主进程 → 渲染进程）
| 事件 | 数据 | 说明 |
|---|---|---|
| `ai:stream-chunk` | string (文本片段) | 流式输出块 |
| `ai:stream-end` | string (完整内容) | 流结束 |
| `ai:stream-error` | string (错误信息) | 流错误 |

## AI 服务（ai-service.js）

- **SDK**: `@google/genai`（GoogleGenAI）
- **可用模型**: `gemini-2.5-pro`, `gemini-2.5-flash`（默认 flash）
- **maxOutputTokens**: 16000
- **流式方法**: `client.models.generateContentStream()`
- **单例导出**: `module.exports = new AiService()`
- **消息格式转换**: `assistant` → `model`，`user` → `user`

## 上下文组装（context-builder.js）

`buildContext(projectPath, volume, chapter)` 组装以下字段：

| 字段 | 来源 |
|---|---|
| `worldSetting` | `meta/world.md` |
| `characters` | `meta/characters.md` |
| `totalOutline` | `meta/outline.md` |
| `volumeOutline` | `volumes/volNN/outline.md` |
| `volumeSummary` | `volumes/volNN/summary.md` |
| `prevSummaries` | 前几卷/章的摘要拼接 |
| `recentChapters` | 前 3 章完整正文 |
| `currentContent` | 当前章节已有内容 |

`parseLocation(projectPath, filePath)` 从文件路径解析出 `volume`（如 `vol01`）和 `chapter`（如 `ch001.md`）。

## 项目磁盘结构

新建项目时 `file-manager.createProjectStructure()` 创建：

```
projectName/
├── project.json          # { name, createdAt, lastOpened, volumes, genre }
├── meta/
│   ├── world.md          # 世界观设定
│   ├── characters.md     # 人物档案
│   ├── outline.md        # 总大纲
│   └── timeline.md       # 时间线
├── context/
│   └── current.md        # 当前写作上下文（AI维护）
└── volumes/
    ├── vol01/
    │   ├── outline.md    # 卷大纲
    │   ├── summary.md    # 卷摘要（AI自动追加）
    │   └── ch001.md      # 章节文件（chNNN.md 格式）
    ├── vol02/
    └── ...
```

章节文件名规则：`ch` + 3位数字 + `.md`（如 `ch001.md`, `ch042.md`）

## Pinia Stores

### `stores/ai.js` (useAiStore)
| 状态 | 类型 | 说明 |
|---|---|---|
| `isStreaming` | bool | 是否正在生成 |
| `streamContent` | string | 累积的 AI 输出 |
| `statusMessage` | string | 状态文字提示 |
| `apiKeySet` | bool | API Key 是否已设置 |
| `selectedModel` | string | 当前选中的模型 |

### `stores/project.js` (useProjectStore)
| 状态 | 类型 | 说明 |
|---|---|---|
| `projectPath` | string | 项目根目录绝对路径 |
| `projectName` | string | 项目名 |
| `genre` | string | 题材 |
| `currentFile` | string | 当前打开的文件路径 |
| `currentContent` | string | 当前文件内容 |
| `fileTree` | array | 文件树数据 |
| `isDirty` | bool | 是否有未保存修改 |
| `wordCount` | number | 当前文件字数 |

## 命令

```bash
npm run dev:electron   # 开发模式（并发启动 Vite dev server + Electron）
npm run build          # 仅构建前端到 dist/renderer/
npm start              # 直接运行（生产，需先 build）
npm run build:electron # 完整打包（Vite build + electron-builder）
```

## 代理

启动时自动检测系统代理（`session.resolveProxy`），若存在则通过 `undici.ProxyAgent` 为 Google API 请求设置全局代理。

## 安全

- `contextIsolation: true`, `nodeIntegration: false`
- API Key 只存在主进程 `AiService` 实例中，渲染进程无法直接访问

## 主题

- 深色主题，主色 `#1a1a2e`（窗口背景）
- 强调色 `#e94560`（CSS 变量 `--accent`）

## AI 内容检测

### 功能说明
- 分析当前文章内容，识别可能由 AI 生成的部分
- 给出 0-100 的 AI 程度评分（0=完全人工，100=完全AI）
- 标注疑似 AI 生成的具体片段及判断理由
- 提供人性化改进建议

### 使用方式
- 在编辑器工具栏点击"AI 检测"按钮
- 支持任何有内容的文件（不限于章节文件）
- 检测结果以弹窗形式展示，包含评分、分析、疑似片段和建议

### 技术实现
- 调用 Gemini API 进行文本分析
- 返回 JSON 格式结果：`{ score, analysis, aiLikeParts, suggestions }`
- 前端使用 ElMessageBox 展示格式化的检测报告
