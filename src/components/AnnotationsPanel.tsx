import { useAnnotationContext } from '../contexts/AnnotationContext'

interface CollectedAnnotation {
  number: number
  title: string
  description?: string
}

interface AnnotationsPanelProps {
  annotations: CollectedAnnotation[]
  frameId: string
  onAnnotationClick?: (frameId: string, number: number) => void
}

export function AnnotationsPanel({ annotations, frameId, onAnnotationClick }: AnnotationsPanelProps) {
  const { setHoveredAnnotation, isAnnotationHovered, isAnnotationSelected } = useAnnotationContext()

  return (
    <div className="annotations-panel">
      {annotations.map(ann => {
        const isHovered = isAnnotationHovered(frameId, ann.number)
        const isSelected = isAnnotationSelected(frameId, ann.number)

        return (
          <div
            key={ann.number}
            className={`annotation-item${isHovered ? ' hovered' : ''}${isSelected ? ' selected' : ''}`}
            data-annotation={ann.number}
            onMouseEnter={() => setHoveredAnnotation({ frameId, number: ann.number })}
            onMouseLeave={() => setHoveredAnnotation(null)}
            onClick={() => onAnnotationClick?.(frameId, ann.number)}
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
