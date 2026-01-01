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

  // Wait a bit for 3D components and animations to settle
  await page.waitForTimeout(500)
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

    // Scroll frame into view
    await container.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300) // Wait for 3D components

    if (mode === 'frame') {
      // Capture just the .frame element
      const frame = await container.$('.frame')
      if (frame) {
        const buffer = await frame.screenshot({ type: 'png' })
        results.set(`${frameId}.png`, buffer)
      }
    } else if (mode === 'annotated') {
      // Capture the full container (includes annotations + padding)
      const buffer = await container.screenshot({ type: 'png' })
      results.set(`${frameId}_annotated.png`, buffer)
    } else if (mode === 'selections') {
      // First capture base annotated state
      const baseBuffer = await container.screenshot({ type: 'png' })
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

        const buffer = await container.screenshot({ type: 'png' })
        results.set(`${frameId}_ann${annotationNum}.png`, buffer)
      }

      // Clear selection
      await page.click('#app')
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
