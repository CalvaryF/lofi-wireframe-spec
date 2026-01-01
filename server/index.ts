import express from 'express'
import { spawn, ChildProcess } from 'child_process'
import { getBrowser, closeBrowser, getBrowserStatus } from './services/browser'
import renderRouter from './routes/render'
import specsRouter from './routes/specs'

const PORT = parseInt(process.env.PORT || '3001', 10)
const VITE_PORT = process.env.VITE_PORT || '5173'

let viteProcess: ChildProcess | null = null
let actualVitePort: string = VITE_PORT

export function getVitePort(): string {
  return actualVitePort
}

async function startVite(): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log('Starting Vite dev server...')

    viteProcess = spawn('npx', ['vite', '--port', VITE_PORT], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    })

    let resolved = false

    viteProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()
      process.stdout.write(output)

      // Vite is ready when it shows the local URL - parse the actual port
      if (!resolved && output.includes('Local:')) {
        const portMatch = output.match(/localhost:(\d+)/)
        const port = portMatch ? portMatch[1] : VITE_PORT
        resolved = true
        // Give it a moment to fully initialize
        setTimeout(() => resolve(port), 500)
      }
    })

    viteProcess.stderr?.on('data', (data: Buffer) => {
      process.stderr.write(data)
    })

    viteProcess.on('error', (err) => {
      if (!resolved) {
        reject(err)
      }
    })

    viteProcess.on('exit', (code) => {
      if (!resolved) {
        reject(new Error(`Vite exited with code ${code}`))
      }
      viteProcess = null
    })

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!resolved) {
        reject(new Error('Vite startup timeout'))
      }
    }, 30000)
  })
}

async function main() {
  try {
    // Start Vite
    actualVitePort = await startVite()
    console.log(`Vite ready at http://localhost:${actualVitePort}`)

    // Pre-launch browser
    await getBrowser()

    // Create Express app
    const app = express()
    app.use(express.json({ limit: '10mb' }))

    // Routes
    app.use('/render', renderRouter)
    app.use('/api/specs', specsRouter)

    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        queue: 0, // TODO: implement queue tracking
        browser: getBrowserStatus(),
      })
    })

    // Start server
    const server = app.listen(PORT, 'localhost', () => {
      console.log(`\nRender API ready at http://localhost:${PORT}`)
      console.log(`  POST /render - Render wireframe spec`)
      console.log(`  GET /health  - Health check\n`)
    })

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\nShutting down...')

      server.close()
      await closeBrowser()

      if (viteProcess) {
        viteProcess.kill()
      }

      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)

  } catch (err) {
    console.error('Failed to start server:', err)
    if (viteProcess) {
      viteProcess.kill()
    }
    process.exit(1)
  }
}

main()
