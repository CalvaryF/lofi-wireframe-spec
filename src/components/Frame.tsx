import { useEffect, useRef, useMemo } from 'react'
import type { ResolvedNode } from '../types'
import { NodeRenderer } from './NodeRenderer'
import { AnnotationsPanel } from './AnnotationsPanel'
import { useAnnotationContext } from '../contexts/AnnotationContext'

interface CollectedAnnotation {
  number: number
  title: string
  description?: string
}

interface FrameProps {
  node: ResolvedNode & { type: 'frame' }
  onAnnotationClick?: (frameId: string, number: number) => void
}

export function Frame({ node, onAnnotationClick }: FrameProps) {
  const frameId = node.props.id || 'Untitled'
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const canvasAnimationRef = useRef<number | null>(null)
  const { selectedAnnotation, hoveredAnnotation, isAnnotationHovered, isAnnotationSelected } = useAnnotationContext()

  // Collect annotations and create a lookup map (annotation object -> number)
  const { annotations, annotationMap } = useMemo(() => {
    const collected: CollectedAnnotation[] = []
    const map = new WeakMap<object, number>()
    let counter = 1

    function collectAnnotations(n: ResolvedNode): void {
      if (n.type === 'box' && n.props.annotation) {
        const num = counter++
        map.set(n.props.annotation, num)
        collected.push({
          number: num,
          title: n.props.annotation.title,
          description: n.props.annotation.description
        })
      }
      if (n.type === 'text' && n.props.annotation) {
        const num = counter++
        map.set(n.props.annotation, num)
        collected.push({
          number: num,
          title: n.props.annotation.title,
          description: n.props.annotation.description
        })
      }
      if (n.type === 'icon' && n.props.annotation) {
        const num = counter++
        map.set(n.props.annotation, num)
        collected.push({
          number: num,
          title: n.props.annotation.title,
          description: n.props.annotation.description
        })
      }
      if ('children' in n && n.children) {
        for (const child of n.children) {
          collectAnnotations(child)
        }
      }
    }

    for (const child of node.children) {
      collectAnnotations(child)
    }
    return { annotations: collected, annotationMap: map }
  }, [node.children])

  // Position annotation markers after DOM is rendered
  useEffect(() => {
    if (!frameRef.current || !overlayRef.current) return

    const frame = frameRef.current
    const overlay = overlayRef.current
    overlay.innerHTML = ''

    const annotatedElements = frame.querySelectorAll('[data-annotation-number]')
    if (annotatedElements.length === 0) {
      frame.classList.remove('dimmed')
      return
    }

    const frameRect = frame.getBoundingClientRect()
    const hasSelectionInThisFrame = selectedAnnotation?.frameId === frameId

    // Handle dimming and highlight clone
    if (hasSelectionInThisFrame && selectedAnnotation) {
      frame.classList.add('dimmed')

      // Find and clone the selected element
      const selectedEl = frame.querySelector(`[data-annotation-number="${selectedAnnotation.number}"]`) as HTMLElement
      if (selectedEl) {
        const elRect = selectedEl.getBoundingClientRect()
        const clone = selectedEl.cloneNode(true) as HTMLElement

        // Position clone absolutely over the original
        clone.style.position = 'absolute'
        clone.style.top = `${elRect.top - frameRect.top}px`
        clone.style.left = `${elRect.left - frameRect.left}px`
        clone.style.width = `${elRect.width}px`
        clone.style.height = `${elRect.height}px`
        clone.style.margin = '0'
        clone.classList.add('annotation-highlight-clone')

        overlay.appendChild(clone)

        // Cancel any existing animation loop
        if (canvasAnimationRef.current) {
          cancelAnimationFrame(canvasAnimationRef.current)
        }

        // Track current clone for potential re-cloning
        let currentClone = clone

        function copyCanvasFrames() {
          const originalCanvases = selectedEl.querySelectorAll('canvas')
          const clonedCanvases = currentClone.querySelectorAll('canvas')

          // Re-clone if original has canvases that clone doesn't (late loading)
          if (originalCanvases.length > 0 && clonedCanvases.length !== originalCanvases.length) {
            const newClone = selectedEl.cloneNode(true) as HTMLElement
            newClone.style.position = 'absolute'
            newClone.style.top = currentClone.style.top
            newClone.style.left = currentClone.style.left
            newClone.style.width = currentClone.style.width
            newClone.style.height = currentClone.style.height
            newClone.style.margin = '0'
            newClone.classList.add('annotation-highlight-clone')
            overlay.replaceChild(newClone, currentClone)
            currentClone = newClone
          }

          // Copy canvas content
          const updatedClonedCanvases = currentClone.querySelectorAll('canvas')
          originalCanvases.forEach((originalCanvas, i) => {
            const clonedCanvas = updatedClonedCanvases[i]
            if (clonedCanvas && originalCanvas.width > 0 && originalCanvas.height > 0) {
              // Sync buffer dimensions before drawing
              if (clonedCanvas.width !== originalCanvas.width || clonedCanvas.height !== originalCanvas.height) {
                clonedCanvas.width = originalCanvas.width
                clonedCanvas.height = originalCanvas.height
              }
              const ctx = clonedCanvas.getContext('2d')
              if (ctx) {
                ctx.clearRect(0, 0, clonedCanvas.width, clonedCanvas.height)
                ctx.drawImage(originalCanvas, 0, 0)
              }
            }
          })
          canvasAnimationRef.current = requestAnimationFrame(copyCanvasFrames)
        }

        // Start the animation loop
        copyCanvasFrames()
      }
    } else {
      frame.classList.remove('dimmed')

      // Cancel animation loop when deselecting
      if (canvasAnimationRef.current) {
        cancelAnimationFrame(canvasAnimationRef.current)
        canvasAnimationRef.current = null
      }
    }

    annotatedElements.forEach(el => {
      const htmlEl = el as HTMLElement
      const number = htmlEl.dataset.annotationNumber
      if (!number) return

      const elRect = htmlEl.getBoundingClientRect()

      const marker = document.createElement('span')
      marker.className = 'annotation-marker'
      marker.textContent = number
      marker.dataset.annotation = number

      const num = parseInt(number)
      if (isAnnotationSelected(frameId, num)) {
        marker.classList.add('selected')
      } else if (isAnnotationHovered(frameId, num)) {
        marker.classList.add('hovered')
      }

      // Position relative to frame (overlay is now sibling of frame in frame-content-area)
      const top = (elRect.top - frameRect.top) - 8
      const left = (elRect.right - frameRect.left) - 12

      marker.style.top = `${top}px`
      marker.style.left = `${left}px`

      overlay.appendChild(marker)
    })

    // Cleanup animation loop on effect re-run or unmount
    return () => {
      if (canvasAnimationRef.current) {
        cancelAnimationFrame(canvasAnimationRef.current)
        canvasAnimationRef.current = null
      }
    }
  }, [annotations, frameId, isAnnotationHovered, isAnnotationSelected, hoveredAnnotation, selectedAnnotation])

  // Draw connecting line only for selected annotations (not hovered)
  useEffect(() => {
    if (!containerRef.current) return

    const lineSvg = containerRef.current.querySelector('.annotation-line') as SVGSVGElement
    if (!lineSvg) return

    // Always clear the line first
    lineSvg.innerHTML = ''

    // Only draw if this frame has the selected annotation
    if (!selectedAnnotation || selectedAnnotation.frameId !== frameId) return

    const marker = containerRef.current.querySelector(
      `.annotation-marker[data-annotation="${selectedAnnotation.number}"]`
    ) as HTMLElement
    const panelItem = containerRef.current.querySelector(
      `.annotation-item[data-annotation="${selectedAnnotation.number}"] .annotation-number`
    ) as HTMLElement

    if (!marker || !panelItem) return

    const markerRect = marker.getBoundingClientRect()
    const panelRect = panelItem.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', String(markerRect.right - containerRect.left))
    line.setAttribute('y1', String(markerRect.top - containerRect.top + 10))
    line.setAttribute('x2', String(panelRect.left - containerRect.left))
    line.setAttribute('y2', String(panelRect.top - containerRect.top + 10))
    lineSvg.appendChild(line)
  }, [selectedAnnotation, frameId])

  // Create wrapper node for frame content
  const wrapperNode: ResolvedNode = {
    type: 'box',
    props: {
      layout: node.props.layout,
      gap: node.props.gap,
      padding: node.props.padding,
      outline: 'thin',
      grow: 1
    },
    children: node.children
  }

  // Frame size styles
  const frameStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column'
  }

  if (node.props.size) {
    frameStyle.width = `${node.props.size[0]}px`
    if (node.props.size[1] === 'hug') {
      frameStyle.height = 'auto'
    } else {
      frameStyle.height = `${node.props.size[1]}px`
      frameStyle.overflow = 'hidden'
    }
  }

  return (
    <div className="frame-container" data-frame-id={frameId} ref={containerRef}>
      <div className="frame-wrapper">
        <div className="frame-header">
          <div className="frame-label">{frameId}</div>
          {node.props.description && (
            <div className="frame-description">{node.props.description}</div>
          )}
        </div>
        <div className="frame-body">
          <div className="frame-content-area">
            <div className="frame" style={frameStyle} ref={frameRef}>
              <NodeRenderer
                node={wrapperNode}
                frameId={frameId}
                annotationMap={annotationMap}
              />
            </div>
            <div className="annotation-markers-overlay" ref={overlayRef} />
          </div>

          {annotations.length > 0 && (
            <AnnotationsPanel annotations={annotations} frameId={frameId} onAnnotationClick={onAnnotationClick} />
          )}
        </div>
      </div>

      <svg className="annotation-line" style={{ width: '100%', height: '100%', top: 0, left: 0 }} />
    </div>
  )
}
