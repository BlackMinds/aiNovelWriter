const { GoogleGenAI } = require('@google/genai')

const MODELS = {
  'gemini-2.5-pro': 'gemini-2.5-pro',
  'gemini-2.5-flash': 'gemini-2.5-flash'
}

class AiService {
  constructor() {
    this.client = null
    this.apiKey = '手工输入'
    this.model = 'gemini-2.5-flash'
    this.setApiKey(this.apiKey)
  }

  setApiKey(key) {
    this.apiKey = key
    this.client = new GoogleGenAI({ apiKey: key })
  }

  getApiKey() {
    return this.apiKey
  }

  setModel(model) {
    if (MODELS[model]) {
      this.model = model
    }
  }

  getModel() {
    return this.model
  }

  getAvailableModels() {
    return Object.keys(MODELS)
  }

  _ensureClient() {
    if (!this.client) {
      throw new Error('请先设置 API Key')
    }
  }

  // 将 Anthropic 格式的 messages 转为 Gemini 格式
  _convertMessages(messages) {
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))
  }

  async streamChat(systemPrompt, messages, webContents) {
    this._ensureClient()

    try {
      const stream = await this.client.models.generateContentStream({
        model: this.model,
        contents: this._convertMessages(messages),
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 16000,
          temperature: 1.2,
          topP: 0.95,
          topK: 60
        }
      })

      let fullContent = ''

      for await (const chunk of stream) {
        const text = chunk.text
        if (text) {
          fullContent += text
          if (webContents && !webContents.isDestroyed()) {
            webContents.send('ai:stream-chunk', text)
          }
        }
      }

      if (webContents && !webContents.isDestroyed()) {
        webContents.send('ai:stream-end', fullContent)
      }

      return fullContent
    } catch (error) {
      const errMsg = error.message || '未知错误'
      if (webContents && !webContents.isDestroyed()) {
        webContents.send('ai:stream-error', errMsg)
      }
      throw error
    }
  }

  async generateStructure(options, webContents) {
    const { genre, concept, volumes } = options

    const systemPrompt = `你是一位资深网络小说策划师。请根据用户提供的题材和核心概念，生成一个完整的小说项目框架。

请严格按照以下格式输出，使用 Markdown：

## 世界观设定

（详细的世界观设定，包含世界背景、力量体系、地理环境、社会结构）

## 人物档案

（主角、重要配角、反派的详细信息）

## 总大纲

（包含核心冲突、主线、副线、各卷概要）

## 时间线

（前史和正文时间线）

## 各卷大纲

（每卷的详细大纲，包含主题、核心剧情、关键转折、各章节规划概要）

请确保：
1. 世界观设定丰富且自洽
2. 人物形象鲜明，有成长弧线
3. 剧情有起伏节奏，伏笔和呼应
4. 全书规划为 ${volumes} 卷，每卷约 30-50 章
5. 适合中文网络小说读者的阅读习惯`

    const messages = [
      {
        role: 'user',
        content: `题材：${genre}\n核心卖点/概念：${concept}\n总卷数：${volumes} 卷\n\n请生成完整的小说项目框架。`
      }
    ]

    return this.streamChat(systemPrompt, messages, webContents)
  }

  async generateChapter(contextData, webContents) {
    const { systemPrompt, worldSetting, characters, totalOutline, currentContext,
            volumeOutline, volumeSummary, prevSummaries, recentChapters,
            currentContent, instruction } = contextData

    const contextParts = []
    if (worldSetting) contextParts.push(`## 世界观设定\n${worldSetting}`)
    if (characters) contextParts.push(`## 人物档案\n${characters}`)
    if (totalOutline) contextParts.push(`## 总大纲\n${totalOutline}`)
    if (currentContext) contextParts.push(`## 当前写作上下文\n${currentContext}`)
    if (volumeOutline) contextParts.push(`## 当前卷大纲\n${volumeOutline}`)
    if (volumeSummary) contextParts.push(`## 当前卷摘要\n${volumeSummary}`)
    if (prevSummaries) contextParts.push(`## 前几章摘要\n${prevSummaries}`)
    if (recentChapters) contextParts.push(`## 最近章节内容\n${recentChapters}`)

    const fullSystemPrompt = `${systemPrompt || '你是一位资深网络小说作家。请根据上下文信息续写小说内容。'}\n\n以下是小说的上下文信息：\n\n${contextParts.join('\n\n')}`

    const messages = [
      {
        role: 'user',
        content: currentContent
          ? `当前章节已有内容：\n${currentContent}\n\n${instruction || '请续写本章内容。'}`
          : instruction || '请根据大纲开始撰写本章内容。'
      }
    ]

    return this.streamChat(fullSystemPrompt, messages, webContents)
  }

  async summarizeChapter(chapterContent, webContents) {
    const systemPrompt = '你是一个小说内容摘要助手。请为给定的章节内容生成简洁但信息完整的摘要，包含关键情节、人物行为、重要对话和伏笔。摘要用于后续章节写作的上下文参考。'

    const messages = [
      {
        role: 'user',
        content: `请为以下章节内容生成摘要（300-500字）：\n\n${chapterContent}`
      }
    ]

    return this.streamChat(systemPrompt, messages, webContents)
  }

  async updateCurrentContext(chapterContent, volumeLabel, chapterNum, existingContext) {
    const systemPrompt = `你是一位专业的小说写作助手，负责维护写作状态追踪文档。
请根据刚刚完成的章节内容，更新"当前写作上下文"文档。
这份文档将在后续章节生成时注入 AI 提示词，帮助 AI 快速了解当前状态。
请严格按照指定 Markdown 格式输出，不要输出任何其他内容。`

    const messages = [
      {
        role: 'user',
        content: `请根据以下信息，生成更新后的写作上下文文档。

已有上下文（供参考，在此基础上更新）：
${existingContext || '（暂无）'}

刚完成章节：${volumeLabel} 第${chapterNum}章
章节内容：
${chapterContent}

请严格按照以下格式输出（不要输出任何其他内容）：

# 当前写作上下文

## 当前进度
- 当前卷：${volumeLabel}
- 最新完成章：第${chapterNum}章

## 主要角色状态
（各主要角色目前的位置、状态、目标，每人一行）

## 活跃剧情线
（当前正在推进的主线/支线，简洁列举）

## 近期关键事件
（最近2-3章的重要事件，每条一行）

## 待呼应伏笔
（已埋下但尚未揭晓的伏笔，后续章节需注意）`
      }
    ]

    return this.streamChat(systemPrompt, messages, null)
  }

  async generateChapterOutlineEntry(chapterContent, chapterNum) {
    const systemPrompt = '你是一位小说章节分析助手。请为给定的章节内容生成一个简洁的大纲条目，严格按照指定格式输出，不要输出任何其他内容。'

    const messages = [
      {
        role: 'user',
        content: `请为以下章节内容生成大纲条目，严格按照如下格式输出（不要输出任何其他内容）：

### 第${chapterNum}章（已完成）
**标题**：xxx
**概要**：xxx（2-3句话概括本章核心情节）

章节内容：
${chapterContent}`
      }
    ]

    return this.streamChat(systemPrompt, messages, null)
  }

  async customPrompt(options, webContents) {
    const { systemPrompt, userMessage, context } = options

    const fullSystem = context
      ? `${systemPrompt}\n\n参考上下文：\n${context}`
      : systemPrompt

    const messages = [
      { role: 'user', content: userMessage }
    ]

    return this.streamChat(fullSystem, messages, webContents)
  }
}

module.exports = new AiService()
