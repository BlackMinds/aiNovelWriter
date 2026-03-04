# AI Novel Writer

AI 辅助中文网络小说创作桌面应用。

## 功能特性

- **AI 智能写作** - 基于 Google Gemini API 的章节生成和续写
- **项目管理** - 完整的小说项目结构管理（卷/章节/大纲/人物/世界观）
- **自动化工具**
  - 章节标题自动同步（第X卷 第Y章 标题）
  - 大纲和摘要自动生成
  - 写作上下文自动维护
- **AI 内容检测** - 分析文本 AI 程度，提供改进建议
- **同步检查** - 一键检查并补充缺失的大纲和摘要
- **批量导出** - 按章节导出 TXT 文件，文件名包含卷号、章节号和标题
- **Markdown 编辑** - CodeMirror 6 编辑器，支持实时预览

## 技术栈

- **桌面框架**: Electron 33
- **前端**: Vue 3.5 + Vite 6 + Element Plus 2.9
- **状态管理**: Pinia
- **编辑器**: CodeMirror 6
- **AI 服务**: Google Gemini API (@google/genai)
- **代理支持**: undici (ProxyAgent)

## 安装

```bash
# 安装依赖
npm install
```

## 使用

### 开发模式

```bash
npm run dev:electron
```

### 生产构建

```bash
# 构建前端
npm run build

# 运行应用
npm start
```

### 打包

```bash
# 打包当前平台
npm run build:electron

# 打包 Windows 版本
npm run build:win

# 打包 macOS 版本（需要在 macOS 上运行）
npm run build:mac

# 打包 Linux 版本
npm run build:linux
```

打包后的文件位于 `dist/package/` 目录。

**注意**: 在 Windows 上无法打包 macOS 版本，需要在 macOS 系统上运行。

## 项目结构

```
aiNovel/
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── index.js
│   │   ├── ipc-handlers.js
│   │   ├── ai-service.js
│   │   ├── context-builder.js
│   │   ├── file-manager.js
│   │   ├── project-manager.js
│   │   └── summarizer.js
│   ├── preload/        # 预加载脚本
│   ├── renderer/       # Vue 渲染进程
│   │   ├── views/
│   │   ├── components/
│   │   └── stores/
│   └── shared/         # 共享常量
├── scripts/            # 开发脚本
└── dist/               # 构建输出
```

## 配置

### API Key

首次使用需要设置 Google Gemini API Key：
1. 打开应用
2. 在 AI 面板中输入 API Key
3. 选择模型（gemini-2.5-pro 或 gemini-2.5-flash）

### 代理

应用启动时自动检测系统代理设置。

## 开发文档

详细的开发文档请查看 [CLAUDE.md](./CLAUDE.md)。

## 许可证

MIT
