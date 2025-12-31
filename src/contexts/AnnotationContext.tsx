import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface AnnotationContextValue {
  // Hovered annotation (from mouse)
  hoveredAnnotation: { frameId: string; number: number } | null
  setHoveredAnnotation: (annotation: { frameId: string; number: number } | null) => void

  // Selected annotation (from keyboard)
  selectedAnnotation: { frameId: string; number: number } | null
  setSelectedAnnotation: (annotation: { frameId: string; number: number } | null) => void

  // Combined "active" annotation (hovered takes precedence over selected)
  activeAnnotation: { frameId: string; number: number } | null

  // Check if a specific annotation is active
  isAnnotationActive: (frameId: string, number: number) => boolean
}

const AnnotationContext = createContext<AnnotationContextValue | null>(null)

export function AnnotationProvider({ children }: { children: ReactNode }) {
  const [hoveredAnnotation, setHoveredAnnotation] = useState<{ frameId: string; number: number } | null>(null)
  const [selectedAnnotation, setSelectedAnnotation] = useState<{ frameId: string; number: number } | null>(null)

  // Hovered takes precedence over selected for visual highlighting
  const activeAnnotation = hoveredAnnotation ?? selectedAnnotation

  const isAnnotationActive = useCallback(
    (frameId: string, number: number) => {
      if (!activeAnnotation) return false
      return activeAnnotation.frameId === frameId && activeAnnotation.number === number
    },
    [activeAnnotation]
  )

  return (
    <AnnotationContext.Provider
      value={{
        hoveredAnnotation,
        setHoveredAnnotation,
        selectedAnnotation,
        setSelectedAnnotation,
        activeAnnotation,
        isAnnotationActive,
      }}
    >
      {children}
    </AnnotationContext.Provider>
  )
}

export function useAnnotationContext() {
  const context = useContext(AnnotationContext)
  if (!context) {
    throw new Error('useAnnotationContext must be used within AnnotationProvider')
  }
  return context
}
