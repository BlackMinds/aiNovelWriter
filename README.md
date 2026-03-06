# AI Novel Writer

AI 辅助中文网络小说创作桌面应用，支持多 AI 模型（Google Gemini / 智谱 GLM），提供完整的项目管理、智能写作、自动化工具和导出功能。

## 功能特性

### 核心功能
- **多 AI 模型支持** - 支持 Google Gemini 和智谱 GLM 系列模型
- **AI 智能写作** - 基于上下文的章节生成、续写和润色
- **项目管理** - 完整的小说项目结构（卷/章节/大纲/人物/世界观）
- **Markdown 编辑** - CodeMirror 6 编辑器，支持实时预览

### 自动化工具
- 章节标题自动同步（第X卷 第Y章 标题）
- 大纲和摘要自动生成
- 写作上下文自动维护
- 并行同步检查（支持进度显示）

### AI 辅助功能
- **AI 内容检测** - 分析文本 AI 程度，提供改进建议
- **AI 润色** - 优化选中文本的文笔表达
- **自定义提示词** - 支持自定义 AI 交互

### 导出功能
- **TXT 导出** - 按章节批量导出，文件名包含卷号、章节号和标题
- **EPUB 导出** - 生成电子书格式，适合阅读器使用

### 界面定制
- **主题切换** - 支持浅色/深色主题
- **编辑器定制** - 自定义字体、字号

## 技术栈

- **桌面框架**: Electron 33
- **前端**: Vue 3.5 + Vite 6 + Element Plus 2.9
- **状态管理**: Pinia
- **编辑器**: CodeMirror 6
- **AI 服务**: Google Gemini (@google/genai) / 智谱 GLM
- **代理支持**: undici (ProxyAgent)

## 安装

```bash
# 克隆项目
git clone <repository-url>
cd aiNovel

# 安装依赖
npm install
```

## 快速开始

### 1. 启动应用

```bash
# 开发模式
npm run dev:electron

# 或使用生产版本
npm run build
npm start
```

### 2. 配置 API Key

首次使用需要配置 AI 模型的 API Key：

1. 在首页选择 AI 模型（Gemini 或 GLM 系列）
2. 输入对应的 API Key
   - **Gemini**: 需要 Google Gemini API Key
   - **GLM**: 需要智谱 AI API Key
3. 点击"保存配置"

**获取 API Key**:
- Gemini: https://aistudio.google.com/apikey
- 智谱 GLM: https://open.bigmodel.cn/

### 3. 创建项目

1. 点击"新建项目"
2. 填写项目信息：
   - 项目名称
   - 保存位置
   - 题材类型（玄幻、都市、科幻等）
   - 卷数
3. 可选：使用 AI 生成项目框架
   - 输入核心概念/卖点
   - AI 将生成世界观、人物、大纲等

## 详细使用指南

### 项目结构

创建项目后会生成以下目录结构：

```
项目名/
├── project.json          # 项目配置
├── meta/                 # 元数据
│   ├── world.md         # 世界观设定
│   ├── characters.md    # 人物档案
│   ├── outline.md       # 总大纲
│   └── timeline.md      # 时间线
├── context/
│   └── current.md       # 当前写作上下文（AI 自动维护）
└── volumes/             # 卷目录
    ├── vol01/
    │   ├── outline.md   # 卷大纲
    │   ├── summary.md   # 卷摘要（自动生成）
    │   ├── ch001.md     # 章节文件
    │   ├── ch002.md
    │   └── ...
    └── vol02/
        └── ...
```

### 编辑器使用

#### 文件树操作
- **选择文件**: 点击文件名打开
- **新建章节**: 右键卷目录 → "新建章节"
- **新建文件**: 右键目录 → "新建文件"
- **重命名**: 右键文件 → "重命名"
- **删除**: 右键文件 → "删除"

#### 编辑功能
- **保存**: Ctrl+S (Mac: Cmd+S) 或点击"保存"按钮
- **自动保存**: 每 30 秒自动保存
- **预览**: 点击"预览"按钮切换 Markdown 预览
- **字数统计**: 底部状态栏实时显示

### AI 写作功能

#### 1. AI 写作
生成新章节内容：
1. 打开章节文件（chXXX.md）
2. 点击"AI 写作"按钮
3. AI 会根据大纲和上下文生成内容
4. 生成完成后自动更新大纲和摘要

#### 2. 续写
继续当前章节：
1. 在章节中写入部分内容
2. 点击"续写"按钮
3. AI 会基于已有内容继续写作

#### 3. 优化文笔
润色复制的文本：
1. 点击"优化文笔"按钮
2. 在弹窗中粘贴要优化的文本
3. AI 会返回优化后的版本
4. 可手动复制到编辑器

#### 4. AI 检测
检测文本的 AI 生成程度：
1. 打开要检测的文件
2. 点击"AI 检测"按钮
3. 查看评分、疑似片段和改进建议

#### 5. AI 面板
右侧 AI 助手面板支持：
- 自定义提示词交互
- 查看生成历史
- 快速插入生成内容

### 同步检查

自动检查并补充缺失的大纲和摘要：

1. 点击"同步检查"按钮
2. 系统会并行检查所有章节（3 个并发）
3. 显示实时进度
4. 自动补充缺失的：
   - 章节大纲条目
   - 章节摘要
   - 写作上下文

### 导出功能

#### 导出 TXT
1. 点击"导出TXT"按钮
2. 选择保存位置
3. 生成格式：`第X卷_第Y章_标题.txt`
4. 自动去除 Markdown 格式

#### 导出 EPUB
1. 点击"导出EPUB"按钮
2. 选择保存位置和文件名
3. 生成电子书文件，包含：
   - 项目元数据
   - 所有章节内容
   - 自动目录

### 设置选项

在首页可以配置：

#### AI 模型
- **Gemini 系列**: gemini-2.5-pro, gemini-2.5-flash, gemini-3.1-pro-preview, gemini-3-flash-preview
- **GLM 系列**: glm-5, glm-5-plus, glm-5-flash, glm-5-air

#### 主题
- **浅色主题**: 适合白天使用
- **深色主题**: 适合夜间使用（默认）

#### 编辑器
- **字体大小**: 12-20px
- **字体系列**:
  - 'Consolas, Monaco, monospace'
  - 'Microsoft YaHei, sans-serif'
  - 'SimSun, serif'

## 开发

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
│   ├── main/               # Electron 主进程
│   │   ├── index.js        # 入口
│   │   ├── ipc-handlers.js # IPC 通道
│   │   ├── ai-service.js   # AI 服务
│   │   ├── context-builder.js # 上下文组装
│   │   ├── file-manager.js # 文件管理
│   │   ├── project-manager.js # 项目管理
│   │   └── summarizer.js   # 摘要生成
│   ├── preload/            # 预加载脚本
│   │   └── index.js
│   ├── renderer/           # Vue 渲染进程
│   │   ├── views/          # 页面
│   │   ├── components/     # 组件
│   │   └── stores/         # 状态管理
│   └── shared/             # 共享常量
├── scripts/                # 开发脚本
└── dist/                   # 构建输出
```

## 常见问题

### 1. Gemini API 报错 "User location is not supported"
- 原因：Gemini API 有地区限制
- 解决：切换到 GLM 模型（无地区限制）或配置代理

### 2. 代理配置
- 应用启动时自动检测系统代理
- 支持 HTTP/HTTPS 代理
- 代理设置会应用到 AI API 请求

### 3. API Key 安全
- API Key 仅存储在主进程
- 不会上传到任何服务器
- 建议定期更换 API Key

## 开发文档

详细的开发文档请查看 [CLAUDE.md](./CLAUDE.md)。

## 许可证

MIT
