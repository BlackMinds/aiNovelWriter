const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('file:write', filePath, content),
  getFileTree: (projectPath) => ipcRenderer.invoke('file:getTree', projectPath),
  createFile: (filePath, content) => ipcRenderer.invoke('file:create', filePath, content),
  deleteFile: (filePath) => ipcRenderer.invoke('file:delete', filePath),
  renameFile: (oldPath, newPath) => ipcRenderer.invoke('file:rename', oldPath, newPath),
  createDir: (dirPath) => ipcRenderer.invoke('file:createDir', dirPath),

  // Project operations
  createProject: (options) => ipcRenderer.invoke('project:create', options),
  addChapter: (volDirPath) => ipcRenderer.invoke('project:addChapter', volDirPath),
  openProject: (projectPath) => ipcRenderer.invoke('project:open', projectPath),
  getRecentProjects: () => ipcRenderer.invoke('project:getRecent'),
  importProject: () => ipcRenderer.invoke('project:import'),
  selectDir: () => ipcRenderer.invoke('dialog:selectDir'),
  exportTxt: (projectPath) => ipcRenderer.invoke('project:exportTxt', projectPath),
  syncCheck: (projectPath) => ipcRenderer.invoke('project:syncCheck', projectPath),

  // AI operations
  generateStructure: (options) => ipcRenderer.invoke('ai:generateStructure', options),
  generateChapter: (options) => ipcRenderer.invoke('ai:generateChapter', options),
  continueWriting: (options) => ipcRenderer.invoke('ai:continueWriting', options),
  summarize: (options) => ipcRenderer.invoke('ai:summarize', options),
  customPrompt: (options) => ipcRenderer.invoke('ai:customPrompt', options),
  setApiKey: (key) => ipcRenderer.invoke('ai:setKey', key),
  getApiKey: () => ipcRenderer.invoke('ai:getKey'),
  setModel: (model) => ipcRenderer.invoke('ai:setModel', model),
  getModel: () => ipcRenderer.invoke('ai:getModel'),
  getAvailableModels: () => ipcRenderer.invoke('ai:getAvailableModels'),
  detectAiContent: (content) => ipcRenderer.invoke('ai:detectAiContent', content),

  // AI streaming listeners
  onStreamChunk: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('ai:stream-chunk', handler)
    return () => ipcRenderer.removeListener('ai:stream-chunk', handler)
  },
  onStreamEnd: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('ai:stream-end', handler)
    return () => ipcRenderer.removeListener('ai:stream-end', handler)
  },
  onStreamError: (callback) => {
    const handler = (_event, error) => callback(error)
    ipcRenderer.on('ai:stream-error', handler)
    return () => ipcRenderer.removeListener('ai:stream-error', handler)
  },
  onBackgroundDone: (callback) => {
    const handler = (_event, msg) => callback(msg)
    ipcRenderer.on('ai:background-done', handler)
    return () => ipcRenderer.removeListener('ai:background-done', handler)
  },
})
