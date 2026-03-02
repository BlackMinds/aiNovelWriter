const { dialog, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const fileManager = require('./file-manager')
const projectManager = require('./project-manager')
const aiService = require('./ai-service')
const contextBuilder = require('./context-builder')
const summarizer = require('./summarizer')

function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, '')       // # 标题
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **粗体**
    .replace(/\*(.+?)\*/g, '$1')       // *斜体*
    .replace(/`(.+?)`/g, '$1')         // `代码`
    .replace(/^>\s+/gm, '')            // > 引用
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // [链接](url)
    .trim()
}

function registerIpcHandlers(ipcMain) {
  // File operations
  ipcMain.handle('file:read', async (_event, filePath) => {
    try {
      return fileManager.readFile(filePath)
    } catch (error) {
      throw new Error(`读取文件失败: ${error.message}`)
    }
  })

  ipcMain.handle('file:write', async (_event, filePath, content) => {
    try {
      fileManager.writeFile(filePath, content)
      return true
    } catch (error) {
      throw new Error(`写入文件失败: ${error.message}`)
    }
  })

  ipcMain.handle('file:getTree', async (_event, projectPath) => {
    try {
      return fileManager.getFileTree(projectPath)
    } catch (error) {
      throw new Error(`获取文件树失败: ${error.message}`)
    }
  })

  ipcMain.handle('file:create', async (_event, filePath, content) => {
    try {
      fileManager.createFile(filePath, content)
      return true
    } catch (error) {
      throw new Error(`创建文件失败: ${error.message}`)
    }
  })

  ipcMain.handle('file:delete', async (_event, filePath) => {
    try {
      fileManager.deleteFile(filePath)
      return true
    } catch (error) {
      throw new Error(`删除文件失败: ${error.message}`)
    }
  })

  ipcMain.handle('file:rename', async (_event, oldPath, newPath) => {
    try {
      fileManager.renameFile(oldPath, newPath)
      return true
    } catch (error) {
      throw new Error(`重命名失败: ${error.message}`)
    }
  })

  ipcMain.handle('file:createDir', async (_event, dirPath) => {
    try {
      fileManager.createDir(dirPath)
      return true
    } catch (error) {
      throw new Error(`创建目录失败: ${error.message}`)
    }
  })

  // Project operations
  ipcMain.handle('project:create', async (_event, options) => {
    try {
      const { parentDir, projectName, volumes, genre } = options
      const projectPath = path.join(parentDir, projectName)
      const config = fileManager.createProjectStructure(projectPath, projectName, volumes)
      config.path = projectPath
      config.genre = genre || ''

      // Update project.json with genre
      fileManager.writeFile(
        path.join(projectPath, 'project.json'),
        JSON.stringify({ ...config, path: undefined }, null, 2)
      )

      projectManager.addRecentProject(config)
      return config
    } catch (error) {
      throw new Error(`创建项目失败: ${error.message}`)
    }
  })

  ipcMain.handle('project:open', async (_event, projectPath) => {
    try {
      return projectManager.openProject(projectPath)
    } catch (error) {
      throw new Error(`打开项目失败: ${error.message}`)
    }
  })

  ipcMain.handle('project:getRecent', async () => {
    try {
      return projectManager.getRecentProjects()
    } catch (error) {
      return []
    }
  })

  ipcMain.handle('project:import', async () => {
    try {
      const win = BrowserWindow.getFocusedWindow()
      const result = await dialog.showOpenDialog(win, {
        title: '选择小说项目目录',
        properties: ['openDirectory']
      })
      if (result.canceled || result.filePaths.length === 0) return null
      return projectManager.importProject(result.filePaths[0])
    } catch (error) {
      throw new Error(`导入项目失败: ${error.message}`)
    }
  })

  ipcMain.handle('project:addChapter', async (_event, volDirPath) => {
    try {
      const existing = fs.existsSync(volDirPath)
        ? fs.readdirSync(volDirPath).filter(f => /^ch\d+\.md$/.test(f)).sort()
        : []
      const nextNum = existing.length > 0
        ? parseInt(existing[existing.length - 1].replace('ch', '').replace('.md', '')) + 1
        : 1
      const chName = `ch${String(nextNum).padStart(3, '0')}.md`

      // Try to get planned title from outline.md
      let title = ''
      const outlinePath = path.join(volDirPath, 'outline.md')
      if (fs.existsSync(outlinePath)) {
        const lines = fs.readFileSync(outlinePath, 'utf-8').split('\n')
        for (let i = 0; i < lines.length; i++) {
          const headingMatch = lines[i].match(/^### 第(\d+)章/)
          if (headingMatch && parseInt(headingMatch[1]) === nextNum) {
            for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
              const titleMatch = lines[j].match(/\*\*标题\*\*[：:]\s*(.+)/)
              if (titleMatch) { title = titleMatch[1].trim(); break }
            }
            break
          }
        }
      }

      const heading = title ? `# 第${nextNum}章 ${title}` : `# 第${nextNum}章`
      fileManager.createFile(path.join(volDirPath, chName), `${heading}\n\n`)
      return chName
    } catch (error) {
      throw new Error(`新建章节失败: ${error.message}`)
    }
  })

  ipcMain.handle('dialog:selectDir', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win, {
      title: '选择保存位置',
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('project:exportTxt', async (event, projectPath) => {
    try {
      const win = BrowserWindow.getFocusedWindow()

      // Read project name
      let projectName = path.basename(projectPath)
      const configPath = path.join(projectPath, 'project.json')
      if (fs.existsSync(configPath)) {
        try { projectName = JSON.parse(fs.readFileSync(configPath, 'utf-8')).name || projectName } catch {}
      }

      const result = await dialog.showSaveDialog(win, {
        title: '导出 TXT',
        defaultPath: path.join(projectPath, `${projectName}.txt`),
        filters: [{ name: '文本文件', extensions: ['txt'] }]
      })
      if (result.canceled || !result.filePath) return null

      // Collect all chapters in order
      const volumesDir = path.join(projectPath, 'volumes')
      const volumes = fs.existsSync(volumesDir)
        ? fs.readdirSync(volumesDir).filter(d => /^vol\d+$/.test(d)).sort()
        : []

      const parts = []
      for (const vol of volumes) {
        const volDir = path.join(volumesDir, vol)
        const chapters = fs.readdirSync(volDir)
          .filter(f => /^ch\d+\.md$/.test(f)).sort()
        for (const ch of chapters) {
          const content = fs.readFileSync(path.join(volDir, ch), 'utf-8')
          parts.push(stripMarkdown(content))
        }
      }

      fs.writeFileSync(result.filePath, parts.join('\n\n\n'), 'utf-8')
      return result.filePath
    } catch (error) {
      throw new Error(`导出失败: ${error.message}`)
    }
  })

  // AI operations
  ipcMain.handle('ai:setKey', async (_event, key) => {
    aiService.setApiKey(key)
    return true
  })

  ipcMain.handle('ai:getKey', async () => {
    return aiService.getApiKey()
  })

  ipcMain.handle('ai:setModel', async (_event, model) => {
    aiService.setModel(model)
    return true
  })

  ipcMain.handle('ai:getModel', async () => {
    return aiService.getModel()
  })

  ipcMain.handle('ai:getAvailableModels', async () => {
    return aiService.getAvailableModels()
  })

  ipcMain.handle('ai:generateStructure', async (event, options) => {
    try {
      const webContents = event.sender
      return await aiService.generateStructure(options, webContents)
    } catch (error) {
      throw new Error(`AI 生成失败: ${error.message}`)
    }
  })

  ipcMain.handle('ai:generateChapter', async (event, options) => {
    try {
      const webContents = event.sender
      const { projectPath, filePath, instruction } = options
      const { volume, chapter } = contextBuilder.parseLocation(projectPath, filePath)
      const context = contextBuilder.buildContext(projectPath, volume, chapter)
      context.instruction = instruction
      const fullContent = await aiService.generateChapter(context, webContents)

      if (fullContent.length > 300 && volume && chapter) {
        try {
          const chapterNum = parseInt(chapter.replace('ch', '').replace('.md', ''))
          const volLabel = `第${parseInt(volume.replace('vol', ''))}卷`

          const summary = await aiService.summarizeChapter(fullContent, null)
          if (summary) {
            await summarizer.updateVolumeSummary(projectPath, volume, chapter, summary)
          }

          const entry = await aiService.generateChapterOutlineEntry(fullContent, chapterNum)
          if (entry) {
            const outlinePath = path.join(projectPath, 'volumes', volume, 'outline.md')
            const existing = fs.existsSync(outlinePath) ? fs.readFileSync(outlinePath, 'utf-8') : ''
            fs.writeFileSync(outlinePath, existing + '\n\n' + entry, 'utf-8')
          }

          const contextPath = path.join(projectPath, 'context', 'current.md')
          const existingContext = fs.existsSync(contextPath) ? fs.readFileSync(contextPath, 'utf-8') : ''
          const updatedContext = await aiService.updateCurrentContext(fullContent, volLabel, chapterNum, existingContext)
          if (updatedContext) {
            fs.writeFileSync(contextPath, updatedContext, 'utf-8')
          }

          if (!webContents.isDestroyed()) {
            webContents.send('ai:background-done', '摘要、大纲和写作上下文已自动更新')
          }
        } catch (e) {
          console.warn('[AutoTask] 失败:', e.message)
        }
      }

      return fullContent
    } catch (error) {
      throw new Error(`AI 生成章节失败: ${error.message}`)
    }
  })

  ipcMain.handle('ai:continueWriting', async (event, options) => {
    try {
      const webContents = event.sender
      const { projectPath, filePath, instruction } = options
      const { volume, chapter } = contextBuilder.parseLocation(projectPath, filePath)
      const context = contextBuilder.buildContext(projectPath, volume, chapter)
      context.instruction = instruction || '请继续写作，保持当前的节奏和风格。'
      const fullContent = await aiService.generateChapter(context, webContents)

      if (fullContent.length > 300 && volume && chapter) {
        try {
          const chapterNum = parseInt(chapter.replace('ch', '').replace('.md', ''))
          const volLabel = `第${parseInt(volume.replace('vol', ''))}卷`

          const summary = await aiService.summarizeChapter(fullContent, null)
          if (summary) {
            await summarizer.updateVolumeSummary(projectPath, volume, chapter, summary)
          }

          const entry = await aiService.generateChapterOutlineEntry(fullContent, chapterNum)
          if (entry) {
            const outlinePath = path.join(projectPath, 'volumes', volume, 'outline.md')
            const existing = fs.existsSync(outlinePath) ? fs.readFileSync(outlinePath, 'utf-8') : ''
            fs.writeFileSync(outlinePath, existing + '\n\n' + entry, 'utf-8')
          }

          const contextPath = path.join(projectPath, 'context', 'current.md')
          const existingContext = fs.existsSync(contextPath) ? fs.readFileSync(contextPath, 'utf-8') : ''
          const updatedContext = await aiService.updateCurrentContext(fullContent, volLabel, chapterNum, existingContext)
          if (updatedContext) {
            fs.writeFileSync(contextPath, updatedContext, 'utf-8')
          }

          if (!webContents.isDestroyed()) {
            webContents.send('ai:background-done', '摘要、大纲和写作上下文已自动更新')
          }
        } catch (e) {
          console.warn('[AutoTask] 失败:', e.message)
        }
      }

      return fullContent
    } catch (error) {
      throw new Error(`AI 续写失败: ${error.message}`)
    }
  })

  ipcMain.handle('ai:summarize', async (event, options) => {
    try {
      const webContents = event.sender
      const { projectPath, filePath } = options
      const { volume, chapter } = contextBuilder.parseLocation(projectPath, filePath)

      const summary = await summarizer.summarizeChapter(filePath, webContents)
      if (summary && volume && chapter) {
        await summarizer.updateVolumeSummary(projectPath, volume, chapter, summary)
      }
      return summary
    } catch (error) {
      throw new Error(`摘要生成失败: ${error.message}`)
    }
  })

  ipcMain.handle('ai:customPrompt', async (event, options) => {
    try {
      const webContents = event.sender
      return await aiService.customPrompt(options, webContents)
    } catch (error) {
      throw new Error(`AI 调用失败: ${error.message}`)
    }
  })
}

module.exports = { registerIpcHandlers }
