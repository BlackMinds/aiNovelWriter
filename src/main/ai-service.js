const Anthropic = require('@anthropic-ai/sdk')

class AiService {
  constructor() {
    this.client = null
    this.apiKey = ''
  }

  setApiKey(key) {
    this.apiKey = key
    this.client = new Anthropic({ apiKey: key })
  }

  getApiKey() {
    return this.apiKey
  }

  _ensureClient() {
    if (!this.client) {
      throw new Error('请先设置 API Key')
    }
  }

  async streamChat(systemPrompt, messages, webContents) {
    this._ensureClient()

    try {
      const stream = this.client.messages.stream({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 8192,
        system: systemPrompt,
        messages
      })

      let fullContent = ''

      stream.on('text', (text) => {
        fullContent += text
        if (webContents && !webContents.isDestroyed()) {
          webContents.send('ai:stream-chunk', text)
        }
      })

      await stream.finalMessage()

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
    const { systemPrompt, worldSetting, characters, totalOutline, volumeOutline,
            volumeSummary, prevSummaries, recentChapters, currentContent, instruction } = contextData

    const contextParts = []
    if (worldSetting) contextParts.push(`## 世界观设定\n${worldSetting}`)
    if (characters) contextParts.push(`## 人物档案\n${characters}`)
    if (totalOutline) contextParts.push(`## 总大纲\n${totalOutline}`)
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
