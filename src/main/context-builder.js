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
      currentContext: this._safeRead(path.join(projectPath, 'context', 'current.md')),
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
    return `你是一位老练的中文网络小说写手。根据提供的世界观、人物、大纲和上下文续写章节。

## 核心原则
- 保持角色性格一致性，注意伏笔呼应和新伏笔设置
- 章节末尾设置悬念，每章约 3000-5000 字

## 文风要求——去除 AI 腔
你必须像一个真正的网文老作者那样写，而不是像 AI。遵守以下规则：

**禁止滥用的词汇和句式（出现则立即换掉）：**
- 禁词：不禁、缓缓、淡淡、微微、轻声道、嘴角微扬、嘴角上扬、眼中闪过一丝、心中暗道、深吸一口气、目光深邃、仿佛、似乎在诉说、不由自主、恍若隔世、宛如、犹如
- 不要每句话都用"XX了XX"这种结构
- 不要每段都用"他/她感到..."开头
- 不要反复用"一股XX涌上心头"
- 不要所有角色说话都文绉绉，该粗俗的要粗俗，该沉默寡言的就少说话
- 不要总结句

**叙事节奏：**
- 不要每个动作都描写，挑重要的写，其他一笔带过
- 长句短句交替，不要全是长句也不要全是短句
- 对话不要太整齐——现实中人说话会打断、会省略、会词不达意
- 允许跳跃式叙事，不必事事交代清楚
- 场景转换可以突然，不需要每次都有过渡段

**情绪表达：**
- 用行为和细节暗示情绪，少用直接描述（"他很愤怒" → 他一脚踢翻了凳子）
- 不要每次情绪变化都写一大段心理活动
- 角色的内心独白要有那个角色的说话风格，不要都像文学评论

**对话：**
- 对话要有口语感，可以用省略号、破折号表示停顿和打断
- 不同角色的说话方式要有明显区分（用词、句式、口头禅）
- 不要每句对话后面都加"他XX地说"，很多时候不需要对话标签
- 允许废话和闲聊，不是每句对话都要推动剧情

**直接输出正文，不要输出任何解释、说明或元评论。**`
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
