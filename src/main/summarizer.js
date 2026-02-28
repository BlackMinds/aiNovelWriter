const fs = require('fs')
const path = require('path')
const aiService = require('./ai-service')

class Summarizer {
  async summarizeChapter(chapterPath, webContents) {
    const content = fs.readFileSync(chapterPath, 'utf-8')

    // Skip if content is too short
    if (content.length < 500) {
      return null
    }

    const summary = await aiService.summarizeChapter(content, webContents)
    return summary
  }

  async updateVolumeSummary(projectPath, volumeName, chapterName, chapterSummary) {
    const summaryPath = path.join(projectPath, 'volumes', volumeName, 'summary.md')

    let existing = ''
    if (fs.existsSync(summaryPath)) {
      existing = fs.readFileSync(summaryPath, 'utf-8')
    }

    // Append chapter summary
    const chapterNum = chapterName.replace('ch', '').replace('.md', '')
    const updatedSummary = `${existing}\n\n### 第${parseInt(chapterNum)}章 摘要\n${chapterSummary}`

    fs.writeFileSync(summaryPath, updatedSummary, 'utf-8')
    return updatedSummary
  }
}

module.exports = new Summarizer()
