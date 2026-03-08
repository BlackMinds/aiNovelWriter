const { app, BrowserWindow, ipcMain, session } = require('electron')
const path = require('path')
const log = require('electron-log')
const { registerIpcHandlers } = require('./ipc-handlers')

// 配置日志
log.transports.file.level = 'debug'
log.transports.console.level = 'debug'
log.info('========== App Starting ==========')
log.info('Platform:', process.platform)
log.info('Arch:', process.arch)
log.info('Electron:', process.versions.electron)
log.info('Node:', process.versions.node)
log.info('App Version:', app.getVersion())
log.info('====================================')

// 捕获未处理的异常
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

async function setupProxy() {
  try {
    const proxy = await session.defaultSession.resolveProxy('https://generativelanguage.googleapis.com')
    if (proxy && !proxy.includes('DIRECT')) {
      const match = proxy.match(/PROXY\s+(\S+)/)
      if (match) {
        const proxyUrl = `http://${match[1]}`
        const { setGlobalDispatcher, ProxyAgent } = require('undici')
        setGlobalDispatcher(new ProxyAgent(proxyUrl))
        log.info('[Proxy] 已启用系统代理:', proxyUrl)
      }
    } else {
      log.info('[Proxy] 未检测到系统代理，直连')
    }
  } catch (e) {
    log.warn('[Proxy] 代理检测失败:', e.message)
  }
}

let mainWindow = null

function createWindow() {
  log.info('Creating main window...')
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: 'AI Novel Writer',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.VITE_DEV_PORT || '5173'
    log.info('Loading dev server:', `http://127.0.0.1:${port}`)
    mainWindow.loadURL(`http://127.0.0.1:${port}`)
    mainWindow.webContents.openDevTools()
  } else {
    const indexPath = path.join(__dirname, '../../dist/renderer/index.html')
    log.info('Loading production file:', indexPath)
    mainWindow.loadFile(indexPath)
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log.error('Failed to load:', errorCode, errorDescription)
  })

  mainWindow.on('closed', () => {
    log.info('Main window closed')
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  await setupProxy()
  registerIpcHandlers(ipcMain)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
