const { spawn } = require('child_process')
const path = require('path')
const net = require('net')
const fs = require('fs')

const logFile = path.join(__dirname, '..', 'dev-log.txt')
fs.writeFileSync(logFile, '')
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  process.stdout.write(line)
  fs.appendFileSync(logFile, line)
}

// Find a free port starting from the given port
function findFreePort(startPort) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.listen(startPort, () => {
      server.close(() => resolve(startPort))
    })
    server.on('error', () => {
      resolve(findFreePort(startPort + 1))
    })
  })
}

// Wait for port to be available
function waitForPort(port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()

    function check() {
      const socket = new net.Socket()
      socket.setTimeout(500)

      socket.on('connect', () => {
        socket.destroy()
        resolve()
      })

      socket.on('error', () => {
        socket.destroy()
        if (Date.now() - start > timeout) {
          reject(new Error('Timeout waiting for Vite'))
        } else {
          setTimeout(check, 500)
        }
      })

      socket.on('timeout', () => {
        socket.destroy()
        setTimeout(check, 500)
      })

      socket.connect(port, '127.0.0.1')
    }

    check()
  })
}

async function main() {
  const port = await findFreePort(5173)
  log(`Starting Vite dev server on port ${port}...`)

  // Start Vite dev server
  const vite = spawn('npx', ['vite', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: 'development' }
  })

  try {
    await waitForPort(port)
    log('Vite ready, starting Electron...')

    // Start Electron with the actual dev port
    const electron = spawn('npx', ['electron', '.'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'development', VITE_DEV_PORT: String(port) }
    })

    electron.on('close', () => {
      vite.kill()
      process.exit()
    })
  } catch (err) {
    log('Failed to start: ' + err.message)
    vite.kill()
    process.exit(1)
  }
}

main()
