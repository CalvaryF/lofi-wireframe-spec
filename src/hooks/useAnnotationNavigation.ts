import { useState, useRef, useCallback } from 'react'

export function useAnnotationNavigation() {
  const [selectedAnnotation, setSelectedAnnotation] = useState<number | null>(null)
  const annotationCursorRef = useRef<number | null>(null)
  const frameChangeFromAnnotationRef = useRef(false)

  const setCursor = useCallback((index: number | null) => {
    annotationCursorRef.current = index
  }, [])

  const getCursor = useCallback(() => annotationCursorRef.current, [])

  const markFrameChangeFromAnnotation = useCallback(() => {
    frameChangeFromAnnotationRef.current = true
  }, [])

  const shouldSkipFrameReset = useCallback((): boolean => {
    if (frameChangeFromAnnotationRef.current) {
      frameChangeFromAnnotationRef.current = false
      return true
    }
    return false
  }, [])

  const navigateAnnotation = useCallback((
    direction: 'up' | 'down',
    totalAnnotations: number,
    frameLastIndex?: number
  ) => {
    setSelectedAnnotation(prev => {
      let next: number

      if (prev === null) {
        // Starting navigation - pick first or last based on direction
        if (direction === 'up' && frameLastIndex !== undefined) {
          next = frameLastIndex
        } else {
          next = annotationCursorRef.current ?? 0
        }
      } else {
        // Navigate from current selection
        if (direction === 'down') {
          next = Math.min(prev + 1, totalAnnotations - 1)
        } else {
          next = Math.max(prev - 1, 0)
        }
      }

      // Keep cursor in sync
      annotationCursorRef.current = next
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedAnnotation(null)
  }, [])

  return {
    selectedAnnotation,
    setSelectedAnnotation,
    setCursor,
    getCursor,
    navigateAnnotation,
    clearSelection,
    markFrameChangeFromAnnotation,
    shouldSkipFrameReset,
  }
}
