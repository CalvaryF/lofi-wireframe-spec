import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface AnnotationContextValue {
  // Hovered annotation (from mouse)
  hoveredAnnotation: { frameId: string; number: number } | null
  setHoveredAnnotation: (annotation: { frameId: string; number: number } | null) => void

  // Selected annotation (from keyboard or click)
  selectedAnnotation: { frameId: string; number: number } | null
  setSelectedAnnotation: (annotation: { frameId: string; number: number } | null) => void

  // Check if a specific annotation is hovered
  isAnnotationHovered: (frameId: string, number: number) => boolean

  // Check if a specific annotation is selected
  isAnnotationSelected: (frameId: string, number: number) => boolean
}

const AnnotationContext = createContext<AnnotationContextValue | null>(null)

export function AnnotationProvider({ children }: { children: ReactNode }) {
  const [hoveredAnnotation, setHoveredAnnotation] = useState<{ frameId: string; number: number } | null>(null)
  const [selectedAnnotation, setSelectedAnnotation] = useState<{ frameId: string; number: number } | null>(null)

  const isAnnotationHovered = useCallback(
    (frameId: string, number: number) => {
      if (!hoveredAnnotation) return false
      return hoveredAnnotation.frameId === frameId && hoveredAnnotation.number === number
    },
    [hoveredAnnotation]
  )

  const isAnnotationSelected = useCallback(
    (frameId: string, number: number) => {
      if (!selectedAnnotation) return false
      return selectedAnnotation.frameId === frameId && selectedAnnotation.number === number
    },
    [selectedAnnotation]
  )

  return (
    <AnnotationContext.Provider
      value={{
        hoveredAnnotation,
        setHoveredAnnotation,
        selectedAnnotation,
        setSelectedAnnotation,
        isAnnotationHovered,
        isAnnotationSelected,
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
