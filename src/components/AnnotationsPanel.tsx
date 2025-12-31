import { useAnnotationContext } from '../contexts/AnnotationContext'

interface CollectedAnnotation {
  number: number
  title: string
  description?: string
}

interface AnnotationsPanelProps {
  annotations: CollectedAnnotation[]
  frameId: string
}

export function AnnotationsPanel({ annotations, frameId }: AnnotationsPanelProps) {
  const { setHoveredAnnotation, isAnnotationActive, selectedAnnotation } = useAnnotationContext()

  return (
    <div className="annotations-panel">
      {annotations.map(ann => {
        const isActive = isAnnotationActive(frameId, ann.number)
        const isKeyboardSelected = selectedAnnotation?.frameId === frameId &&
                                    selectedAnnotation?.number === ann.number

        return (
          <div
            key={ann.number}
            className={`annotation-item${isActive ? ' highlighted' : ''}${isKeyboardSelected ? ' keyboard-selected' : ''}`}
            data-annotation={ann.number}
            onMouseEnter={() => setHoveredAnnotation({ frameId, number: ann.number })}
            onMouseLeave={() => setHoveredAnnotation(null)}
          >
            <span className="annotation-number">{ann.number}</span>
            <div className="annotation-content">
              <div className="annotation-title">{ann.title}</div>
              {ann.description && (
                <div className="annotation-description">{ann.description}</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
