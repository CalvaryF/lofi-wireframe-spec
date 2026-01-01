import { BrowserContext, Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuid } from 'uuid'
import archiver from 'archiver'
import { createContext } from './browser'
import { getVitePort } from '../index'
import type { RenderRequest, TempSpec } from '../types'

const RENDER_TIMEOUT = parseInt(process.env.RENDER_TIMEOUT || '30000', 10)

// Temp directory for specs
const TEMP_DIR = path.join(process.cwd(), '.tmp-specs')

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true })
}

function createTempSpec(spec: string, components?: string): TempSpec {
  const id = uuid()
  const specPath = path.join(TEMP_DIR, `${id}-wireframe.yaml`)
  fs.writeFileSync(specPath, spec)

  let componentsPath: string | undefined
  if (components) {
    componentsPath = path.join(TEMP_DIR, `${id}-components.yaml`)
    fs.writeFileSync(componentsPath, components)
  }

  return {
    id,
    specPath,
    componentsPath,
    cleanup: () => {
      try {
        fs.unlinkSync(specPath)
        if (componentsPath) fs.unlinkSync(componentsPath)
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

async function waitForFrames(page: Page): Promise<void> {
  // Wait for at least one frame container to appear
  await page.waitForSelector('.frame-container', { timeout: RENDER_TIMEOUT })

  // Wait for 3D/WebGL components to initialize
  // Check for canvas elements and wait for them to render
  await page.waitForTimeout(500)

  // If there are canvases (3D components), wait longer for WebGL to initialize
  const hasCanvases = await page.evaluate(() => {
    return document.querySelectorAll('canvas').length > 0
  })

  if (hasCanvases) {
    // WebGL components need more time to initialize and render
    await page.waitForTimeout(2000)
  }
}

async function captureFrames(
  page: Page,
  mode: string,
  frameIds?: string[]
): Promise<Map<string, Buffer>> {
  const results = new Map<string, Buffer>()

  // Get all frame containers
  const containers = await page.$$('.frame-container[data-frame-id]')

  for (const container of containers) {
    const frameId = await container.getAttribute('data-frame-id')
    if (!frameId) continue

    // Skip if specific frames requested and this isn't one of them
    if (frameIds && frameIds.length > 0 && !frameIds.includes(frameId)) {
      continue
    }

    // Use app's scroll function which accounts for header height
    await page.evaluate((id) => {
      if (window.scrollToFrame) {
        window.scrollToFrame(id)
      }
    }, frameId)

    // Wait for inView polling to detect visibility (polls every 500ms)
    // This is needed for 3D components that only render when in view
    await page.waitForTimeout(700)

    // Check if this frame has canvases (3D components)
    const hasCanvases = await container.evaluate((el: Element) => {
      return el.querySelectorAll('canvas').length > 0
    })

    // If 3D components exist, wait more for WebGL to fully render
    if (hasCanvases) {
      await page.waitForTimeout(1000)
    }

    if (mode === 'frame') {
      // Capture just the .frame element
      const frame = await container.$('.frame')
      if (frame) {
        const buffer = await frame.screenshot({ type: 'png' })
        results.set(`${frameId}.png`, buffer)
      }
    } else if (mode === 'annotated') {
      // Get bounding box and add extra width to capture full annotations panel
      const box = await container.boundingBox()
      if (box) {
        const buffer = await page.screenshot({
          type: 'png',
          clip: {
            x: box.x,
            y: box.y,
            width: box.width + 150, // Extra width for annotations text overflow
            height: box.height
          }
        })
        results.set(`${frameId}_annotated.png`, buffer)
      }
    } else if (mode === 'selections') {
      // Get bounding box for expanded capture
      const box = await container.boundingBox()
      if (!box) continue

      // First capture base annotated state
      const baseBuffer = await page.screenshot({
        type: 'png',
        clip: {
          x: box.x,
          y: box.y,
          width: box.width + 150,
          height: box.height
        }
      })
      results.set(`${frameId}_annotated.png`, baseBuffer)

      // Get all annotation items
      const annotationItems = await container.$$('.annotation-item[data-annotation]')

      for (const item of annotationItems) {
        const annotationNum = await item.getAttribute('data-annotation')
        if (!annotationNum) continue

        // Click to select
        await item.click()
        await page.waitForTimeout(150)

        // Inline SVG styles for the line (same as client-side export)
        await page.evaluate(() => {
          const line = document.querySelector('svg.annotation-line line')
          if (line) {
            line.setAttribute('stroke', 'hsl(0, 50%, 50%)')
            line.setAttribute('stroke-width', '1.5')
            line.setAttribute('stroke-dasharray', '4 3')
          }
        })

        const buffer = await page.screenshot({
          type: 'png',
          clip: {
            x: box.x,
            y: box.y,
            width: box.width + 150,
            height: box.height
          }
        })
        results.set(`${frameId}_ann${annotationNum}.png`, buffer)
      }

      // Clear selection
      await page.click('#app')
    }

    // After capturing, scroll frame out of view to release WebGL contexts
    // This prevents context exhaustion when rendering many frames with 3D components
    if (hasCanvases) {
      // Scroll far down past this frame to push it out of view
      await page.evaluate((id) => {
        const el = document.querySelector(`[data-frame-id="${id}"]`)
        if (el) {
          const rect = el.getBoundingClientRect()
          window.scrollBy(0, rect.height + 200)
        }
      }, frameId)
      // Wait for inView polling to detect out-of-view state
      await page.waitForTimeout(700)
    }
  }

  return results
}

function createZipBuffer(files: Map<string, Buffer>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const archive = archiver('zip', { zlib: { level: 9 } })

    archive.on('data', chunk => chunks.push(chunk))
    archive.on('end', () => resolve(Buffer.concat(chunks)))
    archive.on('error', reject)

    for (const [name, buffer] of files) {
      archive.append(buffer, { name })
    }

    archive.finalize()
  })
}

export async function render(request: RenderRequest): Promise<Buffer> {
  const { spec, components, mode = 'annotated', frames } = request

  // Create temp files
  const tempSpec = createTempSpec(spec, components)
  let context: BrowserContext | null = null

  try {
    // Create browser context
    context = await createContext()
    const page = await context.newPage()

    // Debug: log browser console
    page.on('console', msg => console.log('Browser:', msg.text()))
    page.on('pageerror', err => console.error('Page error:', err))

    // Navigate to app with spec ID
    const url = `http://localhost:${getVitePort()}/?spec=${tempSpec.id}`
    console.log(`Navigating to: ${url}`)
    await page.goto(url)

    // Wait for frames to render
    await waitForFrames(page)

    // Capture frames
    const images = await captureFrames(page, mode, frames)

    if (images.size === 0) {
      throw new Error('No frames captured')
    }

    // Create ZIP
    const zipBuffer = await createZipBuffer(images)
    return zipBuffer

  } finally {
    // Cleanup
    if (context) {
      await context.close()
    }
    tempSpec.cleanup()
  }
}
