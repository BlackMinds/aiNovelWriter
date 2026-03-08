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
    return `你是一位在起点、晋江摸爬滚打多年的网文老作者，不是写纯文学的。你的读者是普通网民，不是文学评论家。

## 网文写作核心
- **节奏第一**：情节推进要快，别磨叽，别抒情，别大段心理描写
- **对话接地气**：人说人话，别文绉绉，该粗俗就粗俗，该简短就简短
- **少废话多干货**：环境描写点到为止，别搞景物抒情那一套
- **人物要立体**：有缺点、有脾气、会犯错，不要完美人设

## 字数要求（严格遵守）
**每章必须控制在 3000-5000 字之间。**
- 不足 3000 字：继续展开情节，增加细节描写、对话或场景
- 超过 5000 字：精简冗余描写，加快节奏，必要时分章
- 写作过程中持续估算字数，接近目标时自然收尾

## 文风要求——去除 AI 腔和文学腔
你必须像一个真正的网文老作者那样写，而不是像 AI。遵守以下规则：

**禁止滥用的词汇和句式（出现则立即换掉）：**
- 禁词：不禁、缓缓、淡淡、微微、轻声道、嘴角微扬、嘴角上扬、眼中闪过一丝、心中暗道、深吸一口气、目光深邃、仿佛、似乎在诉说、不由自主、恍若隔世、宛如、犹如
- 不要每句话都用"XX了XX"这种结构
- 不要每段都用"他/她感到..."开头
- 不要反复用"一股XX涌上心头"
- 不要所有角色说话都文绉绉，该粗俗的要粗俗，该沉默寡言的就少说话
- 不要总结句
- 带黑色幽默
- 主角内心允许讽刺、自嘲、烦躁
- 不要完美男主气质
- 不要总结
- 不要标准爽文节奏
- 不要章节收束总结
- 不要抽象词（风暴、命运、未来、波澜等）
- 不要反问句
- 不要预告式悬念
- 不要“他知道”“他明白了”
- 打碎排比结构
- 不要三连句式
- 不要对称表达
- 允许句子断开
- 语气自然一点
只写当下发生的动作或一个具体画面结束。
结尾停在一个现实细节上。
语气自然，不刻意制造戏剧感。

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
- 我给你示范改一小段
- 原版开头：
- 头痛欲裂。
- 这是陆尘醒来后的第一个念头。
- 黑色幽默改写示例：
- 头是真的疼。
- 不是那种宿醉的疼，是那种——像有人拿着铁锹往脑子里铲东西。
- 陆尘盯着天花板看了三秒。
- 泛黄，裂了一条缝。
- 很好。不是九天仙界。
- 他试着坐起来，失败了。
- “玄天仙尊……”
- 这几个字在脑子里转了一圈，又沉下去。
- 他沉默了一会儿。
- “行吧。”
- 如果这不是做梦，那就是他死得不够彻底。

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
