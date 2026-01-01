import { useEffect, useRef, useMemo, useState } from 'react'
import type { ResolvedNode } from '../types'
import { NodeRenderer } from './NodeRenderer'
import { AnnotationsPanel } from './AnnotationsPanel'
import { CommentInputModal } from './CommentInputModal'
import { useAnnotationContext } from '../contexts/AnnotationContext'
import { useCommentContext } from '../contexts/CommentContext'

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
  const commentOverlayRef = useRef<HTMLDivElement>(null)
  const canvasAnimationRef = useRef<number | null>(null)
  const { selectedAnnotation, hoveredAnnotation, isAnnotationHovered, isAnnotationSelected } = useAnnotationContext()
  const {
    commentMode,
    pendingComment,
    setPendingComment,
    getCommentsForFrame,
    addComment,
    deleteComment,
    isCommentHovered,
    hoveredComment,
    isCommentSelected,
    selectedComment,
    setSelectedComment,
  } = useCommentContext()

  const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | null>(null)
  const comments = getCommentsForFrame(frameId)

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

  // Handle click in comment mode
  const handleFrameClick = (e: React.MouseEvent) => {
    if (!commentMode) return

    // Find nearest element with data-path (all elements should have this now)
    const target = e.target as HTMLElement
    const elementWithPath = target.closest('[data-path]') as HTMLElement | null

    if (elementWithPath) {
      const path = elementWithPath.getAttribute('data-path')
      const existingId = elementWithPath.getAttribute('data-id')
      const elementType = elementWithPath.getAttribute('data-element-type') || 'box'

      if (path) {
        // Calculate modal position near the clicked element
        const rect = elementWithPath.getBoundingClientRect()
        const frameRect = frameRef.current?.getBoundingClientRect()
        if (frameRect) {
          setModalPosition({
            x: rect.right - frameRect.left + 10,
            y: rect.top - frameRect.top,
          })
        }
        // Pass path, existingId, and elementType for ID generation
        setPendingComment({ frameId, path, existingId: existingId || undefined, elementType })
        e.stopPropagation()
      }
    }
  }

  // Handle saving a comment
  const handleSaveComment = (text: string) => {
    if (pendingComment) {
      addComment(
        pendingComment.frameId,
        pendingComment.path,
        pendingComment.elementType,
        text,
        pendingComment.existingId
      )
      setPendingComment(null)
      setModalPosition(null)
    }
  }

  // Handle canceling comment
  const handleCancelComment = () => {
    setPendingComment(null)
    setModalPosition(null)
  }

  // Position comment markers after DOM is rendered
  useEffect(() => {
    if (!frameRef.current || !commentOverlayRef.current) return

    const frame = frameRef.current
    const overlay = commentOverlayRef.current
    overlay.innerHTML = ''

    if (comments.length === 0) return

    const frameRect = frame.getBoundingClientRect()

    comments.forEach(comment => {
      // Try to find element by path first (for new comments), then by ID (for loaded comments)
      let el: HTMLElement | null = null
      if (comment.path) {
        el = frame.querySelector(`[data-path="${comment.path}"]`) as HTMLElement
      }
      if (!el) {
        el = frame.querySelector(`[data-id="${comment.elementId}"]`) as HTMLElement
      }
      if (!el) return

      const elRect = el.getBoundingClientRect()
      const isSelected = isCommentSelected(frameId, comment.elementId)

      // Create marker container
      const markerContainer = document.createElement('div')
      markerContainer.className = `comment-marker-container ${isSelected ? 'expanded' : ''}`

      const marker = document.createElement('span')
      marker.className = 'comment-marker'
      marker.dataset.elementId = comment.elementId
      marker.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`

      // Click handler to toggle selection
      marker.addEventListener('click', (e) => {
        e.stopPropagation()
        if (isCommentSelected(frameId, comment.elementId)) {
          setSelectedComment(null)
        } else {
          setSelectedComment({ frameId, elementId: comment.elementId })
        }
      })

      markerContainer.appendChild(marker)

      // If selected, show the comment popover
      if (isSelected) {
        const popover = document.createElement('div')
        popover.className = 'comment-popover'
        popover.innerHTML = `
          <div class="comment-popover-text">${comment.text}</div>
          <button class="comment-popover-delete" title="Delete comment">×</button>
        `
        // Delete handler
        const deleteBtn = popover.querySelector('.comment-popover-delete')
        deleteBtn?.addEventListener('click', (e) => {
          e.stopPropagation()
          deleteComment(frameId, comment.elementId)
        })
        markerContainer.appendChild(popover)
      }

      // Position top-right of element
      const top = (elRect.top - frameRect.top) - 8
      const left = (elRect.right - frameRect.left) - 8

      markerContainer.style.position = 'absolute'
      markerContainer.style.top = `${top}px`
      markerContainer.style.left = `${left}px`

      overlay.appendChild(markerContainer)
    })
  }, [comments, frameId, isCommentHovered, hoveredComment, isCommentSelected, selectedComment, setSelectedComment, deleteComment])

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
            <div
              className={`frame ${commentMode ? 'comment-mode' : ''}`}
              style={frameStyle}
              ref={frameRef}
              onClick={handleFrameClick}
            >
              <NodeRenderer
                node={wrapperNode}
                frameId={frameId}
                annotationMap={annotationMap}
              />
            </div>
            <div className="annotation-markers-overlay" ref={overlayRef} />
            <div className="comment-markers-overlay" ref={commentOverlayRef} />

            {/* Comment input */}
            {pendingComment && pendingComment.frameId === frameId && modalPosition && (
              <CommentInputModal
                position={modalPosition}
                onSave={handleSaveComment}
                onCancel={handleCancelComment}
              />
            )}
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
