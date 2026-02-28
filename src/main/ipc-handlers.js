const { dialog, BrowserWindow } = require('electron')
const path = require('path')
const fileManager = require('./file-manager')
const projectManager = require('./project-manager')
const aiService = require('./ai-service')
const contextBuilder = require('./context-builder')
const summarizer = require('./summarizer')

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

  ipcMain.handle('dialog:selectDir', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win, {
      title: '选择保存位置',
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // AI operations
  ipcMain.handle('ai:setKey', async (_event, key) => {
    aiService.setApiKey(key)
    return true
  })

  ipcMain.handle('ai:getKey', async () => {
    return aiService.getApiKey()
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
      return await aiService.generateChapter(context, webContents)
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
      return await aiService.generateChapter(context, webContents)
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
