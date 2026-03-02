const { app, BrowserWindow, ipcMain, session } = require('electron')
const path = require('path')
const { registerIpcHandlers } = require('./ipc-handlers')

async function setupProxy() {
  try {
    const proxy = await session.defaultSession.resolveProxy('https://generativelanguage.googleapis.com')
    if (proxy && !proxy.includes('DIRECT')) {
      const match = proxy.match(/PROXY\s+(\S+)/)
      if (match) {
        const proxyUrl = `http://${match[1]}`
        const { setGlobalDispatcher, ProxyAgent } = require('undici')
        setGlobalDispatcher(new ProxyAgent(proxyUrl))
        console.log('[Proxy] 已启用系统代理:', proxyUrl)
      }
    } else {
      console.log('[Proxy] 未检测到系统代理，直连')
    }
  } catch (e) {
    console.warn('[Proxy] 代理检测失败:', e.message)
  }
}

let mainWindow = null

function createWindow() {
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
    mainWindow.loadURL(`http://127.0.0.1:${port}`)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'))
  }

  mainWindow.on('closed', () => {
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
