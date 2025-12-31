import type { TextStyle, TextAlign, Annotation } from '../../types'

interface TextProps {
  content: string
  style?: TextStyle
  align?: TextAlign
  annotation?: Annotation
  annotationNumber?: number
  frameId?: string
}

function textStyleClass(style?: TextStyle): string {
  switch (style) {
    case 'h1': return 'text-h1'
    case 'h2': return 'text-h2'
    case 'body': return 'text-body'
    case 'caption': return 'text-caption'
    case 'mono': return 'text-mono'
    default: return 'text-body'
  }
}

export function Text({ content, style, align, annotation, annotationNumber }: TextProps) {
  const className = `text ${textStyleClass(style)}`

  const inlineStyle: React.CSSProperties = {}
  if (align) {
    inlineStyle.textAlign = align
    inlineStyle.display = 'block'
  }

  return (
    <span
      className={className}
      style={Object.keys(inlineStyle).length > 0 ? inlineStyle : undefined}
      data-annotation-number={annotation ? annotationNumber : undefined}
    >
      {content}
    </span>
  )
}
