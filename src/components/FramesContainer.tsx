import { useEffect, useRef, useMemo, useCallback } from 'react'
import type { ResolvedNode } from '../types'
import { Frame } from './Frame'
import { AnnotationProvider, useAnnotationContext } from '../contexts/AnnotationContext'

interface FramesContainerProps {
  frames: ResolvedNode[]
  selectedAnnotationIndex: number | null
  onAnnotationClick?: (globalIndex: number) => void
}

// Collect all annotations from frames for index mapping
function collectAllAnnotations(frames: ResolvedNode[]): Array<{ frameId: string; number: number }> {
  const all: Array<{ frameId: string; number: number }> = []

  function collectFromNode(node: ResolvedNode, frameId: string, counter: { current: number }): void {
    if (node.type === 'box' && node.props.annotation) {
      all.push({ frameId, number: counter.current++ })
    }
    if (node.type === 'text' && node.props.annotation) {
      all.push({ frameId, number: counter.current++ })
    }
    if (node.type === 'icon' && node.props.annotation) {
      all.push({ frameId, number: counter.current++ })
    }
    if ('children' in node && node.children) {
      for (const child of node.children) {
        collectFromNode(child, frameId, counter)
      }
    }
  }

  for (const frame of frames) {
    if (frame.type !== 'frame') continue
    const frameId = frame.props.id || 'Untitled'
    const counter = { current: 1 }
    for (const child of frame.children) {
      collectFromNode(child, frameId, counter)
    }
  }

  return all
}

// Inner component that can access context
function FramesContainerInner({
  frames,
  selectedAnnotationIndex,
  allAnnotations,
  onAnnotationClick
}: {
  frames: ResolvedNode[]
  selectedAnnotationIndex: number | null
  allAnnotations: Array<{ frameId: string; number: number }>
  onAnnotationClick?: (globalIndex: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { setSelectedAnnotation } = useAnnotationContext()

  // Convert (frameId, number) click to global index and bubble up
  const handleAnnotationClick = useCallback((frameId: string, number: number) => {
    const globalIndex = allAnnotations.findIndex(
      a => a.frameId === frameId && a.number === number
    )
    if (globalIndex !== -1) {
      onAnnotationClick?.(globalIndex)
    }
  }, [allAnnotations, onAnnotationClick])

  // Sync selectedAnnotationIndex with context
  useEffect(() => {
    if (selectedAnnotationIndex === null || selectedAnnotationIndex >= allAnnotations.length) {
      setSelectedAnnotation(null)
    } else {
      setSelectedAnnotation(allAnnotations[selectedAnnotationIndex])
    }
  }, [selectedAnnotationIndex, allAnnotations, setSelectedAnnotation])

  // Render drag arrows after DOM is ready
  useEffect(() => {
    if (!containerRef.current) return

    // Remove existing arrows first
    containerRef.current.querySelectorAll('.drag-arrow').forEach(arrow => arrow.remove())

    const allFrames = containerRef.current.querySelectorAll('.frame')
    allFrames.forEach(frameEl => {
      const cursorsWithFrom = frameEl.querySelectorAll('.cursor[data-from]')
      cursorsWithFrom.forEach(cursorEl => {
        const fromId = cursorEl.getAttribute('data-from')
        const fromEl = frameEl.querySelector(`[data-id="${fromId}"]`)
        if (!fromEl) {
          console.warn(`Cursor references unknown element: ${fromId}`)
          return
        }
        const contentWrapper = frameEl.querySelector('.box')
        if (contentWrapper) {
          const arrow = drawArrowBetweenElements(
            contentWrapper as HTMLElement,
            fromEl as HTMLElement,
            cursorEl as HTMLElement
          )
          contentWrapper.appendChild(arrow)
        }
      })
    })
  }, [frames])

  return (
    <div className="frames-container" ref={containerRef}>
      {frames.map((frame, index) => {
        if (frame.type !== 'frame') return null
        return (
          <Frame
            key={frame.props.id || index}
            node={frame as ResolvedNode & { type: 'frame' }}
            onAnnotationClick={handleAnnotationClick}
          />
        )
      })}
    </div>
  )
}

// Draw a curved arrow between two elements
function drawArrowBetweenElements(
  container: HTMLElement,
  fromEl: HTMLElement,
  toEl: HTMLElement
): SVGSVGElement {
  const containerRect = container.getBoundingClientRect()
  const fromRect = fromEl.getBoundingClientRect()
  const toRect = toEl.getBoundingClientRect()

  const fromX = fromRect.left + fromRect.width / 2 - containerRect.left
  const fromY = fromRect.top + fromRect.height / 2 - containerRect.top
  const toX = toRect.left + toRect.width / 2 - containerRect.left
  const toY = toRect.top + toRect.height / 2 - containerRect.top

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.classList.add('drag-arrow')
  svg.setAttribute('width', '100%')
  svg.setAttribute('height', '100%')

  const midX = (fromX + toX) / 2
  const midY = (fromY + toY) / 2
  const dx = toX - fromX
  const dy = toY - fromY
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist === 0) return svg

  const offset = Math.min(30, dist * 0.2)
  const ctrlX = midX - (dy / dist) * offset
  const ctrlY = midY + (dx / dist) * offset

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.classList.add('arrow-line')
  path.setAttribute('d', `M ${fromX},${fromY} Q ${ctrlX},${ctrlY} ${toX},${toY}`)
  svg.appendChild(path)

  const t = 0.95
  const tangentX = 2 * (1 - t) * (ctrlX - fromX) + 2 * t * (toX - ctrlX)
  const tangentY = 2 * (1 - t) * (ctrlY - fromY) + 2 * t * (toY - ctrlY)
  const angle = Math.atan2(tangentY, tangentX)

  const headSize = 8
  const head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
  head.classList.add('arrow-head')
  const p1x = toX - headSize * Math.cos(angle - Math.PI / 6)
  const p1y = toY - headSize * Math.sin(angle - Math.PI / 6)
  const p2x = toX - headSize * Math.cos(angle + Math.PI / 6)
  const p2y = toY - headSize * Math.sin(angle + Math.PI / 6)
  head.setAttribute('points', `${toX},${toY} ${p1x},${p1y} ${p2x},${p2y}`)
  svg.appendChild(head)

  return svg
}

export function FramesContainer({ frames, selectedAnnotationIndex, onAnnotationClick }: FramesContainerProps) {
  // Memoize annotation collection to avoid recalculating on every render
  const allAnnotations = useMemo(() => collectAllAnnotations(frames), [frames])

  return (
    <AnnotationProvider>
      <FramesContainerInner
        frames={frames}
        selectedAnnotationIndex={selectedAnnotationIndex}
        allAnnotations={allAnnotations}
        onAnnotationClick={onAnnotationClick}
      />
    </AnnotationProvider>
  )
}
