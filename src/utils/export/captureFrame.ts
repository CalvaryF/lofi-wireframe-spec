import { toBlob } from 'html-to-image'
import JSZip from 'jszip'

export type CaptureMode = 'frame' | 'annotated' | 'selections'

export interface CaptureOptions {
  frameId: string
  mode?: CaptureMode
  pixelRatio?: number
  asZip?: boolean  // Bundle results into a ZIP file
}

export interface CaptureResult {
  blob: Blob
  suffix?: string  // For naming: undefined, 'annotated', 'ann1', 'ann2', etc.
  isZip?: boolean  // True if blob is a ZIP file
}

/**
 * Wait for any canvas elements to be ready for capture.
 * WebGL canvases need preserveDrawingBuffer: true (already configured in Globe3D/Scatter3D)
 * and a render frame to complete.
 */
async function waitForCanvases(container: Element): Promise<void> {
  const canvases = container.querySelectorAll('canvas')
  if (canvases.length === 0) return

  // Wait for two animation frames to ensure WebGL content is rendered
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve()
      })
    })
  })
}

/**
 * Capture element as PNG blob.
 */
async function captureElement(element: HTMLElement, pixelRatio: number): Promise<Blob> {
  await waitForCanvases(element)

  const blob = await toBlob(element, {
    pixelRatio,
    backgroundColor: 'hsl(0, 0%, 98%)',  // Match --background CSS variable
  })

  if (!blob) {
    throw new Error('Failed to capture element')
  }

  return blob
}

/**
 * Capture a frame in the specified mode.
 * - 'frame': Just the frame content, no annotations
 * - 'annotated': Frame + annotation markers + panel
 * - 'selections': One capture per annotation, each showing that annotation selected
 */
export async function captureFrame(options: CaptureOptions): Promise<CaptureResult[]> {
  const { frameId, mode = 'frame', pixelRatio = 2, asZip = false } = options

  // Find the frame container
  const container = document.querySelector(`.frame-container[data-frame-id="${frameId}"]`) as HTMLElement
  if (!container) {
    throw new Error(`Frame not found: ${frameId}`)
  }

  if (mode === 'frame') {
    // Target just the .frame element
    const frame = container.querySelector('.frame') as HTMLElement
    if (!frame) {
      throw new Error(`Frame content not found: ${frameId}`)
    }

    const blob = await captureElement(frame, pixelRatio)
    return [{ blob }]
  }

  if (mode === 'annotated') {
    // Capture the full container (includes padding)
    const blob = await captureElement(container, pixelRatio)
    return [{ blob, suffix: 'annotated' }]
  }

  if (mode === 'selections') {
    // Get all annotation items in this frame
    const annotationItems = container.querySelectorAll('.annotation-item[data-annotation]')

    if (annotationItems.length === 0) {
      // No annotations, just capture as annotated
      const blob = await captureElement(container, pixelRatio)
      return [{ blob, suffix: 'annotated' }]
    }

    const results: CaptureResult[] = []

    // First capture with no selection (base annotated state)
    const baseBlob = await captureElement(container, pixelRatio)
    results.push({ blob: baseBlob, suffix: 'annotated' })

    for (let i = 0; i < annotationItems.length; i++) {
      const item = annotationItems[i] as HTMLElement
      const annotationNumber = item.dataset.annotation

      // Click to select this annotation
      item.click()

      // Wait for selection state to render (highlight clone, connecting line)
      await new Promise(resolve => setTimeout(resolve, 150))

      // Inline the SVG line styles so they export properly
      const lineSvg = container.querySelector('svg.annotation-line') as SVGSVGElement
      const lineElement = lineSvg?.querySelector('line') as SVGLineElement
      let originalStyles: { stroke: string | null, strokeWidth: string | null, strokeDasharray: string | null } | null = null

      if (lineElement) {
        // Save original inline styles
        originalStyles = {
          stroke: lineElement.getAttribute('stroke'),
          strokeWidth: lineElement.getAttribute('stroke-width'),
          strokeDasharray: lineElement.getAttribute('stroke-dasharray'),
        }
        // Apply inline styles for export
        lineElement.setAttribute('stroke', 'hsl(0, 50%, 50%)')
        lineElement.setAttribute('stroke-width', '1.5')
        lineElement.setAttribute('stroke-dasharray', '4 3')
      }

      // Capture the entire container which includes the line SVG
      const blob = await captureElement(container, pixelRatio)
      results.push({ blob, suffix: `ann${annotationNumber}` })

      // Restore original styles
      if (lineElement && originalStyles) {
        if (originalStyles.stroke === null) lineElement.removeAttribute('stroke')
        else lineElement.setAttribute('stroke', originalStyles.stroke)
        if (originalStyles.strokeWidth === null) lineElement.removeAttribute('stroke-width')
        else lineElement.setAttribute('stroke-width', originalStyles.strokeWidth)
        if (originalStyles.strokeDasharray === null) lineElement.removeAttribute('stroke-dasharray')
        else lineElement.setAttribute('stroke-dasharray', originalStyles.strokeDasharray)
      }
    }

    // Clear selection by clicking outside (on the container)
    const appContainer = document.getElementById('app')
    if (appContainer) {
      appContainer.click()
    }

    // Bundle into ZIP if requested
    if (asZip && results.length > 1) {
      const zip = new JSZip()
      for (const result of results) {
        const filename = `${frameId}${result.suffix ? `_${result.suffix}` : ''}.png`
        zip.file(filename, result.blob)
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      return [{ blob: zipBlob, suffix: 'selections', isZip: true }]
    }

    return results
  }

  throw new Error(`Unknown capture mode: ${mode}`)
}

export interface BatchCaptureOptions {
  mode?: CaptureMode
  pixelRatio?: number
  onProgress?: (current: number, total: number, frameId: string) => void
}

export interface BatchCaptureResult {
  blob: Blob
  isZip: true
}

/**
 * Capture all frames and bundle into a ZIP file.
 */
export async function captureAllFrames(options: BatchCaptureOptions = {}): Promise<BatchCaptureResult> {
  const { mode = 'frame', pixelRatio = 2, onProgress } = options

  // Get all frame containers
  const containers = document.querySelectorAll('.frame-container[data-frame-id]')
  if (containers.length === 0) {
    throw new Error('No frames found')
  }

  const zip = new JSZip()
  const frameIds = Array.from(containers).map(c => (c as HTMLElement).dataset.frameId!)

  for (let i = 0; i < frameIds.length; i++) {
    const frameId = frameIds[i]
    onProgress?.(i + 1, frameIds.length, frameId)

    // Scroll frame into view to trigger 3D component rendering
    const container = containers[i] as HTMLElement
    container.scrollIntoView({ behavior: 'instant', block: 'center' })

    // Wait for scroll and 3D components to render
    await new Promise(resolve => setTimeout(resolve, 300))

    // Capture this frame
    const results = await captureFrame({ frameId, mode, pixelRatio, asZip: false })

    // Add to ZIP
    for (const result of results) {
      const filename = `${frameId}${result.suffix ? `_${result.suffix}` : ''}.png`
      zip.file(filename, result.blob)
    }
  }

  // Clear any selection state
  const appContainer = document.getElementById('app')
  if (appContainer) {
    appContainer.click()
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  return { blob: zipBlob, isZip: true }
}
