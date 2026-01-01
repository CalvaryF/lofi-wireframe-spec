import type { TextStyle, TextAlign, Annotation } from '../../types'

interface TextProps {
  id?: string
  content: string
  style?: TextStyle
  align?: TextAlign
  annotation?: Annotation
  annotationNumber?: number
  frameId?: string
  path?: number[]  // Tracks position in tree for comment targeting
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

export function Text({ id, content, style, align, annotation, annotationNumber, path }: TextProps) {
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
      data-id={id}
      data-path={path?.join('-')}
      data-element-type="text"
      data-annotation-number={annotation ? annotationNumber : undefined}
    >
      {content}
    </span>
  )
}
