import type { ReactNode } from 'react'
import type { Padding, Align, Justify, Layout, Outline, Position, Link, Annotation } from '../../types'

interface BoxProps {
  id?: string
  layout?: Layout
  gap?: number
  padding?: Padding
  align?: Align
  justify?: Justify
  wrap?: boolean
  grow?: number
  outline?: Outline
  background?: 'grey'
  shadow?: boolean
  position?: Position
  link?: Link
  annotation?: Annotation
  annotationNumber?: number
  frameId?: string
  // Border collapse
  collapseTop?: boolean
  collapseLeft?: boolean
  collapseBottom?: boolean
  collapseRight?: boolean
  children?: ReactNode
}

function paddingToCSS(padding?: Padding): string {
  if (padding === undefined) return '0'
  if (typeof padding === 'number') return `${padding}px`
  return `${padding[0]}px ${padding[1]}px`
}

function alignToCSS(align?: Align): string {
  switch (align) {
    case 'start': return 'flex-start'
    case 'center': return 'center'
    case 'end': return 'flex-end'
    case 'stretch': return 'stretch'
    default: return 'stretch'
  }
}

function justifyToCSS(justify?: Justify): string {
  switch (justify) {
    case 'start': return 'flex-start'
    case 'center': return 'center'
    case 'end': return 'flex-end'
    case 'between': return 'space-between'
    default: return 'flex-start'
  }
}

function outlineClass(outline?: Outline): string {
  switch (outline) {
    case 'thin': return 'outline-thin'
    case 'dashed': return 'outline-dashed'
    case 'thick': return 'outline-thick'
    default: return ''
  }
}

export function Box({
  id,
  layout,
  gap,
  padding,
  align,
  justify,
  wrap,
  grow,
  outline,
  background,
  shadow,
  position,
  link,
  annotation,
  annotationNumber,
  collapseTop,
  collapseLeft,
  collapseBottom,
  collapseRight,
  children,
}: BoxProps) {
  const classNames = ['box']

  // Outline
  const outlineCls = outlineClass(outline)
  if (outlineCls) classNames.push(outlineCls)

  // Background
  if (background === 'grey') classNames.push('background-grey')

  // Shadow
  if (shadow) classNames.push('shadow')

  // Border collapse
  if (outline && outline !== 'none') {
    if (collapseTop) classNames.push('collapse-top')
    if (collapseLeft) classNames.push('collapse-left')
    if (collapseBottom) classNames.push('collapse-bottom')
    if (collapseRight) classNames.push('collapse-right')
  }

  // Link
  if (link) classNames.push('has-link')

  // Styles
  const style: React.CSSProperties = {
    position: 'relative',
    gap: gap ? `${gap}px` : '0',
    padding: paddingToCSS(padding),
  }

  // Layout
  if (layout === 'absolute') {
    // Pure absolute container
  } else {
    style.display = 'flex'
    style.flexDirection = layout === 'row' ? 'row' : 'column'
    style.alignItems = alignToCSS(align)
    style.justifyContent = justifyToCSS(justify)
    style.flexWrap = wrap ? 'wrap' : 'nowrap'
  }

  // Grow
  if (grow === 1) {
    style.flexGrow = 1
    style.flexBasis = 0
  }

  // Absolute position
  if (position) {
    style.position = 'absolute'
    style.left = `${position.x}px`
    style.top = `${position.y}px`
    if (position.w !== undefined && position.w !== 'auto') {
      style.width = `${position.w}px`
    }
    if (position.h !== undefined && position.h !== 'auto') {
      style.height = `${position.h}px`
    }
  }

  return (
    <div
      className={classNames.join(' ')}
      style={style}
      data-id={id}
      data-link-target={link?.target}
      data-annotation-number={annotation ? annotationNumber : undefined}
      title={link ? `Link to: ${link.target}` : undefined}
    >
      {children}
    </div>
  )
}
