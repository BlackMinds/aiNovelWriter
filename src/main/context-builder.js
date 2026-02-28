const fs = require('fs')
const path = require('path')

class ContextBuilder {
  constructor() {
    this.fileManager = require('./file-manager')
  }

  buildContext(projectPath, currentVolume, currentChapter) {
    const context = {
      systemPrompt: this._getSystemPrompt(),
      worldSetting: this._readMeta(projectPath, 'world.md'),
      characters: this._readMeta(projectPath, 'characters.md'),
      totalOutline: this._readMeta(projectPath, 'outline.md'),
      volumeOutline: '',
      volumeSummary: '',
      prevSummaries: '',
      recentChapters: '',
      currentContent: ''
    }

    if (currentVolume) {
      const volDir = path.join(projectPath, 'volumes', currentVolume)

      // Volume outline and summary
      context.volumeOutline = this._safeRead(path.join(volDir, 'outline.md'))
      context.volumeSummary = this._safeRead(path.join(volDir, 'summary.md'))

      if (currentChapter) {
        // Get previous chapter summaries
        context.prevSummaries = this._getPrevSummaries(projectPath, currentVolume, currentChapter)

        // Get recent 2-3 chapters full text
        context.recentChapters = this._getRecentChapters(volDir, currentChapter, 3)

        // Current chapter content
        const chapterFile = path.join(volDir, currentChapter)
        context.currentContent = this._safeRead(chapterFile)
      }
    }

    return context
  }

  _getSystemPrompt() {
    return `你是一位专业的中文网络小说作家。你的任务是根据提供的世界观、人物、大纲和上下文信息，续写高质量的小说章节。

写作要求：
1. 保持角色性格一致性
2. 文笔流畅，符合网文风格
3. 注意伏笔的呼应和新伏笔的设置
4. 章节末尾适当设置悬念
5. 对话自然生动，符合角色身份
6. 描写详略得当，重要场景详写
7. 每章约 3000-5000 字`
  }

  _readMeta(projectPath, filename) {
    return this._safeRead(path.join(projectPath, 'meta', filename))
  }

  _safeRead(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8')
      }
    } catch (e) {
      console.error(`Failed to read ${filePath}:`, e)
    }
    return ''
  }

  _getPrevSummaries(projectPath, currentVolume, currentChapter) {
    const summaries = []
    const volumesDir = path.join(projectPath, 'volumes')
    if (!fs.existsSync(volumesDir)) return ''

    const volumes = fs.readdirSync(volumesDir)
      .filter(d => d.startsWith('vol'))
      .sort()

    for (const vol of volumes) {
      if (vol > currentVolume) break

      const volDir = path.join(volumesDir, vol)
      const summaryFile = path.join(volDir, 'summary.md')

      if (vol < currentVolume) {
        // Previous volumes: use volume summary
        const summary = this._safeRead(summaryFile)
        if (summary) {
          summaries.push(`### ${vol} 摘要\n${summary}`)
        }
      } else {
        // Current volume: get chapter summaries from volume summary
        const summary = this._safeRead(summaryFile)
        if (summary) {
          summaries.push(`### 当前卷已有摘要\n${summary}`)
        }
      }
    }

    return summaries.join('\n\n')
  }

  _getRecentChapters(volDir, currentChapter, count) {
    if (!fs.existsSync(volDir)) return ''

    const chapters = fs.readdirSync(volDir)
      .filter(f => f.startsWith('ch') && f.endsWith('.md'))
      .sort()

    const currentIdx = chapters.indexOf(currentChapter)
    if (currentIdx <= 0) return ''

    const start = Math.max(0, currentIdx - count)
    const recentFiles = chapters.slice(start, currentIdx)

    return recentFiles.map(ch => {
      const content = this._safeRead(path.join(volDir, ch))
      return `### ${ch}\n${content}`
    }).join('\n\n')
  }

  // Detect current volume and chapter from file path
  parseLocation(projectPath, filePath) {
    const relative = path.relative(projectPath, filePath).replace(/\\/g, '/')
    const parts = relative.split('/')

    let volume = null
    let chapter = null

    if (parts[0] === 'volumes' && parts.length >= 2) {
      volume = parts[1]
      if (parts.length >= 3 && parts[2].startsWith('ch')) {
        chapter = parts[2]
      }
    }

    return { volume, chapter }
  }
}

module.exports = new ContextBuilder()
