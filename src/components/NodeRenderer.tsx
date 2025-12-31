import type { ResolvedNode, Padding, Layout } from '../types'
import { Box } from './primitives/Box'
import { Text } from './primitives/Text'
import { Icon } from './primitives/Icon'
import { Cursor } from './primitives/Cursor'
import { Map } from './primitives/Map'
import { Chart } from './primitives/Chart'

// Border collapse context
interface CollapseContext {
  collapseTop: boolean
  collapseLeft: boolean
  collapseBottom: boolean
  collapseRight: boolean
}

const defaultCollapse: CollapseContext = {
  collapseTop: false,
  collapseLeft: false,
  collapseBottom: false,
  collapseRight: false
}

// Helper to get padding values
function getPadding(padding?: Padding): { top: number; right: number; bottom: number; left: number } {
  if (!padding) return { top: 0, right: 0, bottom: 0, left: 0 }
  if (typeof padding === 'number') return { top: padding, right: padding, bottom: padding, left: padding }
  return { top: padding[0], right: padding[1], bottom: padding[0], left: padding[1] }
}

// Check if a node has an outline
function hasOutline(node: ResolvedNode): boolean {
  if (node.type === 'box') {
    return node.props.outline !== undefined && node.props.outline !== 'none'
  }
  return false
}

// Check if a node grows
function hasGrow(node: ResolvedNode): boolean {
  if (node.type === 'box') {
    return node.props.grow === 1
  }
  return false
}

// Check for leading outline
function hasLeadingOutline(node: ResolvedNode, direction: 'top' | 'left'): boolean {
  if (hasOutline(node)) return true

  if (node.type === 'box' || node.type === 'frame') {
    const children = node.children
    if (children.length === 0) return false

    const pad = getPadding(node.type === 'box' ? node.props.padding : node.props.padding)
    if (direction === 'top' && pad.top > 0) return false
    if (direction === 'left' && pad.left > 0) return false

    const layout = node.type === 'box' ? node.props.layout : node.props.layout
    const isRow = layout === 'row'

    if (direction === 'top') {
      if (isRow) {
        return children.some(child => hasLeadingOutline(child, 'top'))
      } else {
        return hasLeadingOutline(children[0], 'top')
      }
    } else {
      if (isRow) {
        return hasLeadingOutline(children[0], 'left')
      } else {
        return children.some(child => hasLeadingOutline(child, 'left'))
      }
    }
  }

  return false
}

// Check for trailing outline
function hasTrailingOutline(node: ResolvedNode, direction: 'bottom' | 'right'): boolean {
  if (hasOutline(node)) return true

  if (node.type === 'box' || node.type === 'frame') {
    const children = node.children
    if (children.length === 0) return false

    const pad = getPadding(node.type === 'box' ? node.props.padding : node.props.padding)
    if (direction === 'bottom' && pad.bottom > 0) return false
    if (direction === 'right' && pad.right > 0) return false

    const layout = node.type === 'box' ? node.props.layout : node.props.layout
    const isRow = layout === 'row'

    if (direction === 'bottom') {
      if (isRow) {
        return children.some(child => hasTrailingOutline(child, 'bottom'))
      } else {
        return hasTrailingOutline(children[children.length - 1], 'bottom')
      }
    } else {
      if (isRow) {
        return hasTrailingOutline(children[children.length - 1], 'right')
      } else {
        return children.some(child => hasTrailingOutline(child, 'right'))
      }
    }
  }

  return false
}

// Compute child context for border collapse
function computeChildContext(
  child: ResolvedNode,
  index: number,
  totalChildren: number,
  parentLayout: Layout | undefined,
  parentGap: number | undefined,
  parentPadding: Padding | undefined,
  parentHasOutline: boolean,
  parentHasGrow: boolean,
  prevChild: ResolvedNode | null,
  parentContext: CollapseContext
): CollapseContext {
  const isColumn = parentLayout !== 'row'
  const hasGap = (parentGap ?? 0) > 0
  const pad = getPadding(parentPadding)
  const isFirst = index === 0
  const isLast = index === totalChildren - 1

  let collapseTop = false
  let collapseLeft = false
  let collapseBottom = false
  let collapseRight = false

  // Collapse with previous sibling
  if (!hasGap && prevChild) {
    if (isColumn) {
      if (hasTrailingOutline(prevChild, 'bottom') && hasLeadingOutline(child, 'top')) {
        collapseTop = true
      }
    } else {
      if (hasTrailingOutline(prevChild, 'right') && hasLeadingOutline(child, 'left')) {
        collapseLeft = true
      }
    }
  }

  // Collapse with parent's edges
  if (parentHasOutline) {
    if (isColumn) {
      if (isFirst && pad.top === 0 && hasLeadingOutline(child, 'top')) collapseTop = true
      const childTouchesBottom = !parentHasGrow || hasGrow(child)
      if (isLast && childTouchesBottom && pad.bottom === 0 && hasTrailingOutline(child, 'bottom')) collapseBottom = true
      if (pad.left === 0 && hasLeadingOutline(child, 'left')) collapseLeft = true
      if (pad.right === 0 && hasTrailingOutline(child, 'right')) collapseRight = true
    } else {
      if (isFirst && pad.left === 0 && hasLeadingOutline(child, 'left')) collapseLeft = true
      const childTouchesRight = !parentHasGrow || hasGrow(child)
      if (isLast && childTouchesRight && pad.right === 0 && hasTrailingOutline(child, 'right')) collapseRight = true
      if (pad.top === 0 && hasLeadingOutline(child, 'top')) collapseTop = true
      if (pad.bottom === 0 && hasTrailingOutline(child, 'bottom')) collapseBottom = true
    }
  }

  // Inherit from parent context
  if (!parentHasOutline) {
    const childTouchesTrailing = !parentHasGrow || hasGrow(child)
    if (isColumn) {
      if (isFirst && pad.top === 0 && parentContext.collapseTop) collapseTop = true
      if (isLast && childTouchesTrailing && pad.bottom === 0 && parentContext.collapseBottom) collapseBottom = true
      if (pad.left === 0 && parentContext.collapseLeft) collapseLeft = true
      if (pad.right === 0 && parentContext.collapseRight) collapseRight = true
    } else {
      if (isFirst && pad.left === 0 && parentContext.collapseLeft) collapseLeft = true
      if (isLast && childTouchesTrailing && pad.right === 0 && parentContext.collapseRight) collapseRight = true
      if (pad.top === 0 && parentContext.collapseTop) collapseTop = true
      if (pad.bottom === 0 && parentContext.collapseBottom) collapseBottom = true
    }
  }

  return { collapseTop, collapseLeft, collapseBottom, collapseRight }
}

interface NodeRendererProps {
  node: ResolvedNode
  frameId: string
  collapseContext?: CollapseContext
  annotationMap: WeakMap<object, number>
}

export function NodeRenderer({
  node,
  frameId,
  collapseContext = defaultCollapse,
  annotationMap,
}: NodeRendererProps) {
  if (node.type === 'box') {
    const nodeHasOutline = hasOutline(node)
    const nodeHasGrow = hasGrow(node)
    const annotationNumber = node.props.annotation ? annotationMap.get(node.props.annotation) : undefined

    // Render children with collapse context
    let prevChild: ResolvedNode | null = null
    const childElements = node.children.map((child, index) => {
      const childContext = computeChildContext(
        child,
        index,
        node.children.length,
        node.props.layout,
        node.props.gap,
        node.props.padding,
        nodeHasOutline,
        nodeHasGrow,
        prevChild,
        nodeHasOutline ? defaultCollapse : collapseContext
      )
      prevChild = child

      return (
        <NodeRenderer
          key={index}
          node={child}
          frameId={frameId}
          collapseContext={childContext}
          annotationMap={annotationMap}
        />
      )
    })

    return (
      <Box
        id={node.props.id}
        layout={node.props.layout}
        gap={node.props.gap}
        padding={node.props.padding}
        align={node.props.align}
        justify={node.props.justify}
        wrap={node.props.wrap}
        grow={node.props.grow}
        outline={node.props.outline}
        background={node.props.background}
        shadow={node.props.shadow}
        position={node.props.position}
        link={node.props.link}
        annotation={node.props.annotation}
        annotationNumber={annotationNumber}
        frameId={frameId}
        collapseTop={collapseContext.collapseTop}
        collapseLeft={collapseContext.collapseLeft}
        collapseBottom={collapseContext.collapseBottom}
        collapseRight={collapseContext.collapseRight}
      >
        {childElements}
      </Box>
    )
  }

  if (node.type === 'text') {
    const annotationNumber = node.props.annotation ? annotationMap.get(node.props.annotation) : undefined
    return (
      <Text
        content={node.props.content}
        style={node.props.style}
        align={node.props.align}
        annotation={node.props.annotation}
        annotationNumber={annotationNumber}
        frameId={frameId}
      />
    )
  }

  if (node.type === 'icon') {
    const annotationNumber = node.props.annotation ? annotationMap.get(node.props.annotation) : undefined
    return (
      <Icon
        name={node.props.name}
        annotation={node.props.annotation}
        annotationNumber={annotationNumber}
        frameId={frameId}
      />
    )
  }

  if (node.type === 'cursor') {
    return (
      <Cursor
        type={node.props.type}
        anchor={node.props.anchor}
        position={node.props.position}
        offset={node.props.offset}
        tooltip={node.props.tooltip}
        from={node.props.from}
      />
    )
  }

  if (node.type === 'map') {
    return (
      <Map
        width={node.props.width}
        height={node.props.height}
        trajectories={node.trajectories}
      />
    )
  }

  if (node.type === 'chart') {
    return (
      <Chart
        width={node.props.width}
        height={node.props.height}
        series={node.series}
      />
    )
  }

  // Fallback
  return <div>[unknown: {node.type}]</div>
}
