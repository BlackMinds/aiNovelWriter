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
      const volName = path.basename(volDirPath)
      const volNum = volName.replace('vol', '').replace(/^0+/, '')

      const existing = fs.existsSync(volDirPath)
        ? fs.readdirSync(volDirPath).filter(f => /^ch\d+\.md$/.test(f)).sort()
        : []
      const nextNum = existing.length > 0
        ? parseInt(existing[existing.length - 1].replace('ch', '').replace('.md', '')) + 1
        : 1
      const chName = `ch${String(nextNum).padStart(3, '0')}.md`

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

      const heading = title ? `# 第${volNum}卷 第${nextNum}章 ${title}` : `# 第${volNum}卷 第${nextNum}章`
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

      let projectName = path.basename(projectPath)
      const configPath = path.join(projectPath, 'project.json')
      if (fs.existsSync(configPath)) {
        try { projectName = JSON.parse(fs.readFileSync(configPath, 'utf-8')).name || projectName } catch {}
      }

      const result = await dialog.showOpenDialog(win, {
        title: '选择导出目录',
        defaultPath: projectPath,
        properties: ['openDirectory', 'createDirectory']
      })
      if (result.canceled || !result.filePaths[0]) return null

      const exportDir = path.join(result.filePaths[0], `${projectName}_导出`)
      if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true })

      const volumesDir = path.join(projectPath, 'volumes')
      const volumes = fs.existsSync(volumesDir)
        ? fs.readdirSync(volumesDir).filter(d => /^vol\d+$/.test(d)).sort()
        : []

      for (const vol of volumes) {
        const volNum = vol.replace('vol', '').replace(/^0+/, '')
        const volDir = path.join(volumesDir, vol)
        const chapters = fs.readdirSync(volDir)
          .filter(f => /^ch\d+\.md$/.test(f)).sort()
        for (const ch of chapters) {
          const chNum = ch.replace('ch', '').replace('.md', '').replace(/^0+/, '')
          const content = fs.readFileSync(path.join(volDir, ch), 'utf-8')
          const title = content.match(/^#\s+(.+)$/m)?.[1] || '未命名'
          const fileName = `第${volNum}卷_第${chNum}章_${title}.txt`
          fs.writeFileSync(path.join(exportDir, fileName), stripMarkdown(content), 'utf-8')
        }
      }

      return exportDir
    } catch (error) {
      throw new Error(`导出失败: ${error.message}`)
    }
  })

  ipcMain.handle('project:exportEpub', async (event, projectPath) => {
    try {
      const win = BrowserWindow.getFocusedWindow()

      let projectName = path.basename(projectPath)
      let genre = ''
      const configPath = path.join(projectPath, 'project.json')
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
          projectName = config.name || projectName
          genre = config.genre || ''
        } catch {}
      }

      const result = await dialog.showSaveDialog(win, {
        title: '保存 EPUB 文件',
        defaultPath: `${projectName}.epub`,
        filters: [{ name: 'EPUB', extensions: ['epub'] }]
      })
      if (result.canceled || !result.filePath) return null

      const volumesDir = path.join(projectPath, 'volumes')
      const volumes = fs.existsSync(volumesDir)
        ? fs.readdirSync(volumesDir).filter(d => /^vol\d+$/.test(d)).sort()
        : []

      const chapters = []
      for (const vol of volumes) {
        const volDir = path.join(volumesDir, vol)
        const chFiles = fs.readdirSync(volDir).filter(f => /^ch\d+\.md$/.test(f)).sort()
        for (const ch of chFiles) {
          const content = fs.readFileSync(path.join(volDir, ch), 'utf-8')
          const title = content.match(/^#\s+(.+)$/m)?.[1] || '未命名'
          const body = content.replace(/^#\s+.+$/m, '').trim()
          chapters.push({ title, data: body })
        }
      }

      const option = {
        title: projectName,
        author: 'AI Novel Writer',
        content: chapters,
        description: genre || '网络小说'
      }

      // 尝试不同的导入方式
      let epubGen
      try {
        epubGen = require('epub-gen')
      } catch {
        try {
          const pkg = require('epub-gen-memory')
          epubGen = pkg.default || pkg
        } catch {
          throw new Error('未找到 EPUB 生成库，请运行: npm install epub-gen')
        }
      }

      await new epubGen(option, result.filePath).promise
      return result.filePath
    } catch (error) {
      throw new Error(`导出 EPUB 失败: ${error.message}`)
    }
  })

  ipcMain.handle('project:syncCheck', async (event, projectPath) => {
    try {
      const webContents = event.sender
      const results = { checked: 0, synced: 0, errors: [] }
      const volumesDir = path.join(projectPath, 'volumes')

      if (!fs.existsSync(volumesDir)) {
        throw new Error('项目目录不存在')
      }

      const volumes = fs.readdirSync(volumesDir).filter(d => /^vol\d+$/.test(d)).sort()

      // 收集所有需要处理的章节
      const tasks = []
      for (const vol of volumes) {
        const volDir = path.join(volumesDir, vol)
        const chapters = fs.readdirSync(volDir).filter(f => /^ch\d+\.md$/.test(f)).sort()

        for (const ch of chapters) {
          const chPath = path.join(volDir, ch)
          const content = fs.readFileSync(chPath, 'utf-8')

          if (content.length < 300) continue

          const chapterNum = parseInt(ch.replace('ch', '').replace('.md', ''))
          const outlinePath = path.join(volDir, 'outline.md')
          const summaryPath = path.join(volDir, 'summary.md')

          tasks.push({ vol, ch, chPath, content, chapterNum, outlinePath, summaryPath })
        }
      }

      results.checked = tasks.length

      // 发送总数
      if (!webContents.isDestroyed()) {
        webContents.send('sync:progress', { current: 0, total: tasks.length })
      }

      // 并行处理（限制并发数为3）
      const concurrency = 3
      let completed = 0

      for (let i = 0; i < tasks.length; i += concurrency) {
        const batch = tasks.slice(i, i + concurrency)

        await Promise.all(batch.map(async (task) => {
          try {
            const { vol, ch, content, chapterNum, outlinePath, summaryPath } = task

            // 检查大纲
            const outlineContent = fs.existsSync(outlinePath) ? fs.readFileSync(outlinePath, 'utf-8') : ''
            if (!outlineContent.includes(`### 第${chapterNum}章`)) {
              const entry = await aiService.generateChapterOutlineEntry(content, chapterNum)
              if (entry) {
                fs.writeFileSync(outlinePath, outlineContent + '\n\n' + entry, 'utf-8')
                results.synced++
              }
            }

            // 检查摘要
            const summaryContent = fs.existsSync(summaryPath) ? fs.readFileSync(summaryPath, 'utf-8') : ''
            if (!summaryContent.includes(`### 第${chapterNum}章 摘要`)) {
              const summary = await aiService.summarizeChapter(content, null)
              if (summary) {
                await summarizer.updateVolumeSummary(projectPath, vol, ch, summary)
                results.synced++
              }
            }
          } catch (e) {
            results.errors.push(`${task.vol}/${task.ch}: ${e.message}`)
          }

          completed++
          if (!webContents.isDestroyed()) {
            webContents.send('sync:progress', { current: completed, total: tasks.length })
          }
        }))
      }

      return results
    } catch (error) {
      throw new Error(`同步检查失败: ${error.message}`)
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

            const titleMatch = entry.match(/\*\*标题\*\*[：:]\s*(.+)/)
            if (titleMatch) {
              const title = titleMatch[1].trim()
              const volNum = parseInt(volume.replace('vol', ''))
              const fullTitle = `# 第${volNum}卷 第${chapterNum}章 ${title}`

              const contentWithoutTitle = fullContent.replace(/^#\s+.+$/m, '').trim()
              const updatedContent = `${fullTitle}\n\n${contentWithoutTitle}`
              fs.writeFileSync(filePath, updatedContent, 'utf-8')
            }
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

            const titleMatch = entry.match(/\*\*标题\*\*[：:]\s*(.+)/)
            if (titleMatch) {
              const title = titleMatch[1].trim()
              const volNum = parseInt(volume.replace('vol', ''))
              const fullTitle = `# 第${volNum}卷 第${chapterNum}章 ${title}`

              const contentWithoutTitle = fullContent.replace(/^#\s+.+$/m, '').trim()
              const updatedContent = `${fullTitle}\n\n${contentWithoutTitle}`
              fs.writeFileSync(filePath, updatedContent, 'utf-8')
            }
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

  ipcMain.handle('ai:detectAiContent', async (_event, content) => {
    try {
      return await aiService.detectAiContent(content)
    } catch (error) {
      throw new Error(`AI 检测失败: ${error.message}`)
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

  ipcMain.handle('ai:polishText', async (event, text) => {
    try {
      const webContents = event.sender
      return await aiService.polishText(text, webContents)
    } catch (error) {
      throw new Error(`AI 润色失败: ${error.message}`)
    }
  })
}

module.exports = { registerIpcHandlers }
