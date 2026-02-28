const { spawn } = require('child_process')
const path = require('path')
const net = require('net')

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
  // Start Vite dev server
  const vite = spawn('npx', ['vite'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: 'development' }
  })

  console.log('Starting Vite dev server...')

  try {
    await waitForPort(5173)
    console.log('Vite ready, starting Electron...')

    // Start Electron
    const electron = spawn('npx', ['electron', '.'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'development' }
    })

    electron.on('close', () => {
      vite.kill()
      process.exit()
    })
  } catch (err) {
    console.error('Failed to start:', err)
    vite.kill()
    process.exit(1)
  }
}

main()
