import type { ResolvedNode, Padding, Align, Justify, Layout, Outline, TextStyle, CursorType, CursorAnchor } from './types'
import { isEachBlock, isChildrenSlot } from './parser'
import { icons } from 'lucide'

// Context passed down during rendering - tracks which edges should collapse
export interface RenderContext {
  collapseTop: boolean
  collapseLeft: boolean
  collapseBottom: boolean
  collapseRight: boolean
}

export const defaultContext: RenderContext = {
  collapseTop: false,
  collapseLeft: false,
  collapseBottom: false,
  collapseRight: false
}

// Helper to get padding values
export function getPadding(padding?: Padding): { top: number; right: number; bottom: number; left: number } {
  if (!padding) return { top: 0, right: 0, bottom: 0, left: 0 }
  if (typeof padding === 'number') return { top: padding, right: padding, bottom: padding, left: padding }
  // [vertical, horizontal]
  return { top: padding[0], right: padding[1], bottom: padding[0], left: padding[1] }
}

// Convert padding to CSS
function paddingToCSS(padding?: Padding): string {
  if (padding === undefined) return '0'
  if (typeof padding === 'number') return `${padding}px`
  return `${padding[0]}px ${padding[1]}px`
}

// Convert align to CSS align-items
function alignToCSS(align?: Align): string {
  switch (align) {
    case 'start': return 'flex-start'
    case 'center': return 'center'
    case 'end': return 'flex-end'
    case 'stretch': return 'stretch'
    default: return 'stretch'
  }
}

// Convert justify to CSS justify-content
function justifyToCSS(justify?: Justify): string {
  switch (justify) {
    case 'start': return 'flex-start'
    case 'center': return 'center'
    case 'end': return 'flex-end'
    case 'between': return 'space-between'
    default: return 'flex-start'
  }
}

// Convert layout to CSS flex-direction
function layoutToCSS(layout?: Layout): string {
  switch (layout) {
    case 'row': return 'row'
    case 'column': return 'column'
    case 'absolute': return 'column'
    default: return 'column'
  }
}

// Get outline class
function outlineClass(outline?: Outline): string {
  switch (outline) {
    case 'thin': return 'outline-thin'
    case 'dashed': return 'outline-dashed'
    case 'thick': return 'outline-thick'
    default: return ''
  }
}

// Check if a node has an outline
export function hasOutline(node: ResolvedNode): boolean {
  if (node.type === 'box') {
    return node.props.outline !== undefined && node.props.outline !== 'none'
  }
  return false
}

// Check if a node grows to fill available space
export function hasGrow(node: ResolvedNode): boolean {
  if (node.type === 'box') {
    return node.props.grow === 1
  }
  return false
}

// Check if a node (or its descendants) has an outline on a leading edge
// For cross-axis edges, we need to check ALL children (they all share that edge)
// For main-axis edges, we only check the first child
export function hasLeadingOutline(node: ResolvedNode, direction: 'top' | 'left'): boolean {
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
        // Row layout: ALL children share top edge, check if ANY has top outline
        return children.some(child => hasLeadingOutline(child, 'top'))
      } else {
        // Column layout: only first child touches top
        return hasLeadingOutline(children[0], 'top')
      }
    } else { // left
      if (isRow) {
        // Row layout: only first child touches left
        return hasLeadingOutline(children[0], 'left')
      } else {
        // Column layout: ALL children share left edge
        return children.some(child => hasLeadingOutline(child, 'left'))
      }
    }
  }

  return false
}

// Check if node has trailing outline
// For cross-axis edges, check ALL children
// For main-axis edges, check only the last child
export function hasTrailingOutline(node: ResolvedNode, direction: 'bottom' | 'right'): boolean {
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
        // Row layout: ALL children share bottom edge
        return children.some(child => hasTrailingOutline(child, 'bottom'))
      } else {
        // Column layout: only last child touches bottom
        return hasTrailingOutline(children[children.length - 1], 'bottom')
      }
    } else { // right
      if (isRow) {
        // Row layout: only last child touches right
        return hasTrailingOutline(children[children.length - 1], 'right')
      } else {
        // Column layout: ALL children share right edge
        return children.some(child => hasTrailingOutline(child, 'right'))
      }
    }
  }

  return false
}

// Get text style class
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

// Compute context for a child based on its position within parent
export function computeChildContext(
  child: ResolvedNode,
  index: number,
  totalChildren: number,
  parentLayout: Layout | undefined,
  parentGap: number | undefined,
  parentPadding: Padding | undefined,
  parentHasOutline: boolean,
  parentHasGrow: boolean,
  prevChild: ResolvedNode | null,
  parentContext: RenderContext
): RenderContext {
  const isColumn = parentLayout !== 'row'
  const hasGap = (parentGap ?? 0) > 0
  const pad = getPadding(parentPadding)
  const isFirst = index === 0
  const isLast = index === totalChildren - 1

  let collapseTop = false
  let collapseLeft = false
  let collapseBottom = false
  let collapseRight = false

  // --- Collapse with previous sibling ---
  if (!hasGap && prevChild) {
    if (isColumn) {
      // Previous sibling's bottom touches current's top
      if (hasTrailingOutline(prevChild, 'bottom') && hasLeadingOutline(child, 'top')) {
        collapseTop = true
      }
    } else {
      // Previous sibling's right touches current's left
      if (hasTrailingOutline(prevChild, 'right') && hasLeadingOutline(child, 'left')) {
        collapseLeft = true
      }
    }
  }

  // --- Collapse with parent's edges (parent-child collapse) ---
  if (parentHasOutline) {
    // In column layout: first child touches parent's top, last touches parent's bottom (if it grows)
    // All children touch parent's left and right
    if (isColumn) {
      if (isFirst && pad.top === 0 && hasLeadingOutline(child, 'top')) {
        collapseTop = true
      }
      // Last child touches bottom if: parent is content-sized OR child grows to fill space
      const childTouchesBottom = !parentHasGrow || hasGrow(child)
      if (isLast && childTouchesBottom && pad.bottom === 0 && hasTrailingOutline(child, 'bottom')) {
        collapseBottom = true
      }
      if (pad.left === 0 && hasLeadingOutline(child, 'left')) {
        collapseLeft = true
      }
      if (pad.right === 0 && hasTrailingOutline(child, 'right')) {
        collapseRight = true
      }
    } else {
      // In row layout: first child touches parent's left, last touches parent's right (if it grows)
      // All children touch parent's top and bottom
      if (isFirst && pad.left === 0 && hasLeadingOutline(child, 'left')) {
        collapseLeft = true
      }
      // Last child touches right if: parent is content-sized OR child grows to fill space
      const childTouchesRight = !parentHasGrow || hasGrow(child)
      if (isLast && childTouchesRight && pad.right === 0 && hasTrailingOutline(child, 'right')) {
        collapseRight = true
      }
      if (pad.top === 0 && hasLeadingOutline(child, 'top')) {
        collapseTop = true
      }
      if (pad.bottom === 0 && hasTrailingOutline(child, 'bottom')) {
        collapseBottom = true
      }
    }
  }

  // --- Inherit collapse from parent context (for nested non-outlined containers) ---
  // If parent doesn't have outline but is passing down collapse context
  if (!parentHasOutline) {
    // Last child touches trailing edge if: parent is content-sized OR child grows
    const childTouchesTrailing = !parentHasGrow || hasGrow(child)

    if (isColumn) {
      if (isFirst && pad.top === 0 && parentContext.collapseTop) {
        collapseTop = true
      }
      // Only inherit bottom collapse if child reaches the edge
      if (isLast && childTouchesTrailing && pad.bottom === 0 && parentContext.collapseBottom) {
        collapseBottom = true
      }
      if (pad.left === 0 && parentContext.collapseLeft) {
        collapseLeft = true
      }
      if (pad.right === 0 && parentContext.collapseRight) {
        collapseRight = true
      }
    } else {
      if (isFirst && pad.left === 0 && parentContext.collapseLeft) {
        collapseLeft = true
      }
      // Only inherit right collapse if child reaches the edge
      if (isLast && childTouchesTrailing && pad.right === 0 && parentContext.collapseRight) {
        collapseRight = true
      }
      if (pad.top === 0 && parentContext.collapseTop) {
        collapseTop = true
      }
      if (pad.bottom === 0 && parentContext.collapseBottom) {
        collapseBottom = true
      }
    }
  }

  return { collapseTop, collapseLeft, collapseBottom, collapseRight }
}

// Draw an arrow between two elements
// Designed for reuse with future Arrow primitive
function drawArrowBetweenElements(
  container: HTMLElement,
  fromEl: HTMLElement,
  toEl: HTMLElement,
  style: 'drag' | 'solid' = 'drag'
): SVGSVGElement {
  const containerRect = container.getBoundingClientRect()
  const fromRect = fromEl.getBoundingClientRect()
  const toRect = toEl.getBoundingClientRect()

  // Calculate centers relative to container
  const fromX = fromRect.left + fromRect.width / 2 - containerRect.left
  const fromY = fromRect.top + fromRect.height / 2 - containerRect.top
  const toX = toRect.left + toRect.width / 2 - containerRect.left
  const toY = toRect.top + toRect.height / 2 - containerRect.top

  // Create SVG
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.classList.add('drag-arrow')
  svg.setAttribute('width', '100%')
  svg.setAttribute('height', '100%')

  // Calculate control point for curve (perpendicular offset)
  const midX = (fromX + toX) / 2
  const midY = (fromY + toY) / 2
  const dx = toX - fromX
  const dy = toY - fromY
  const dist = Math.sqrt(dx * dx + dy * dy)

  // Handle zero distance edge case
  if (dist === 0) {
    return svg
  }

  const offset = Math.min(30, dist * 0.2)
  const ctrlX = midX - (dy / dist) * offset
  const ctrlY = midY + (dx / dist) * offset

  // Draw curved path
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.classList.add('arrow-line')
  path.setAttribute('d', `M ${fromX},${fromY} Q ${ctrlX},${ctrlY} ${toX},${toY}`)
  if (style === 'solid') {
    path.style.strokeDasharray = 'none'
  }
  svg.appendChild(path)

  // Calculate arrowhead direction from curve tangent at end
  const t = 0.95
  const tangentX = 2 * (1 - t) * (ctrlX - fromX) + 2 * t * (toX - ctrlX)
  const tangentY = 2 * (1 - t) * (ctrlY - fromY) + 2 * t * (toY - ctrlY)
  const angle = Math.atan2(tangentY, tangentX)

  // Draw arrowhead
  const headSize = 8
  const head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
  head.classList.add('arrow-head')
  const p1x = toX - headSize * Math.cos(angle - Math.PI / 6)
  const p1y = toY - headSize * Math.sin(angle - Math.PI / 6)
  const p2x = toX - headSize * Math.cos(angle + Math.PI / 6)
  const p2y = toY - headSize * Math.sin(angle + Math.PI / 6)
  head.setAttribute('points', `${toX},${toY} ${p1x},${p1y} ${p2x},${p2y}`)
  svg.appendChild(head)

  return svg
}

// Render children with border collapse logic
function renderChildren(
  children: ResolvedNode[],
  parentLayout: Layout | undefined,
  parentGap: number | undefined,
  parentPadding: Padding | undefined,
  parentHasOutline: boolean,
  parentHasGrow: boolean,
  parentContext: RenderContext,
  el: HTMLElement
): void {
  let prevChild: ResolvedNode | null = null

  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    const ctx = computeChildContext(
      child, i, children.length,
      parentLayout, parentGap, parentPadding,
      parentHasOutline, parentHasGrow, prevChild, parentContext
    )
    el.appendChild(renderNode(child, ctx))
    prevChild = child
  }
}

// Render a single node to DOM
function renderNode(node: ResolvedNode, ctx: RenderContext = defaultContext): HTMLElement {
  if (node.type === 'frame') {
    const el = document.createElement('div')
    el.className = 'frame'
    if (node.props.id) {
      el.dataset.frameId = node.props.id
    }

    // Size - fixed width, height can be fixed or 'hug' content
    if (node.props.size) {
      el.style.width = `${node.props.size[0]}px`
      if (node.props.size[1] === 'hug') {
        // Hug content - no fixed height, no overflow hidden
        el.style.height = 'auto'
      } else {
        el.style.height = `${node.props.size[1]}px`
        el.style.overflow = 'hidden'
      }
    }

    // Frame uses block layout so content flows naturally
    el.style.display = 'flex'
    el.style.flexDirection = 'column'

    // Frame label
    const label = document.createElement('div')
    label.className = 'frame-label'
    label.textContent = node.props.id || 'Untitled'
    el.appendChild(label)

    // Inject a wrapper box with outline that holds all frame children
    // This wrapper participates in normal border collapse logic
    const wrapper: ResolvedNode = {
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

    const wrapperEl = renderNode(wrapper, defaultContext)
    wrapperEl.style.flexShrink = '0' // Don't shrink content to fit frame
    wrapperEl.style.minHeight = 'min-content' // Allow natural height
    el.appendChild(wrapperEl)

    return el
  }

  if (node.type === 'box') {
    const el = document.createElement('div')
    el.className = 'box'

    const nodeHasOutline = hasOutline(node)

    // Outline
    const outline = outlineClass(node.props.outline)
    if (outline) el.classList.add(outline)

    // Apply border collapse if this node has an outline
    if (nodeHasOutline) {
      if (ctx.collapseTop) el.classList.add('collapse-top')
      if (ctx.collapseLeft) el.classList.add('collapse-left')
      if (ctx.collapseBottom) el.classList.add('collapse-bottom')
      if (ctx.collapseRight) el.classList.add('collapse-right')
    }

    // Background
    if (node.props.background === 'grey') {
      el.classList.add('background-grey')
    }

    // Shadow (for floating elements like dropdowns, modals)
    if (node.props.shadow) {
      el.classList.add('shadow')
    }

    // All boxes are positioning contexts for absolute children
    el.style.position = 'relative'

    // Layout
    if (node.props.layout === 'absolute') {
      // Pure absolute container - no flex, just positioning context
    } else {
      el.style.display = 'flex'
      el.style.flexDirection = layoutToCSS(node.props.layout)
      el.style.alignItems = alignToCSS(node.props.align)
      el.style.justifyContent = justifyToCSS(node.props.justify)
      el.style.flexWrap = node.props.wrap ? 'wrap' : 'nowrap'
    }

    el.style.gap = node.props.gap ? `${node.props.gap}px` : '0'
    el.style.padding = paddingToCSS(node.props.padding)

    // Grow - use flex-basis: 0 so items distribute space equally regardless of content
    if (node.props.grow === 1) {
      el.style.flexGrow = '1'
      el.style.flexBasis = '0'
    }

    // Absolute position
    if (node.props.position) {
      el.style.position = 'absolute'
      el.style.left = `${node.props.position.x}px`
      el.style.top = `${node.props.position.y}px`
      if (node.props.position.w !== undefined && node.props.position.w !== 'auto') {
        el.style.width = `${node.props.position.w}px`
      }
      if (node.props.position.h !== undefined && node.props.position.h !== 'auto') {
        el.style.height = `${node.props.position.h}px`
      }
    }

    // Link
    if (node.props.link) {
      el.classList.add('has-link')
      el.dataset.linkTarget = node.props.link.target
      el.title = `Link to: ${node.props.link.target}`
    }

    // ID
    if (node.props.id) {
      el.dataset.id = node.props.id
    }

    // Render children, passing down context for non-outlined containers
    const nodeHasGrow = !!node.props.grow
    renderChildren(
      node.children,
      node.props.layout,
      node.props.gap,
      node.props.padding,
      nodeHasOutline,
      nodeHasGrow,
      nodeHasOutline ? defaultContext : ctx, // if we have outline, don't inherit; otherwise pass through
      el
    )

    return el
  }

  if (node.type === 'text') {
    const el = document.createElement('span')
    el.className = `text ${textStyleClass(node.props.style)}`
    el.textContent = node.props.content

    // Text align
    if (node.props.align) {
      el.style.textAlign = node.props.align
      el.style.display = 'block'
    }

    return el
  }

  if (node.type === 'icon') {
    const el = document.createElement('span')
    el.className = 'icon'

    // If name is empty, render nothing (allows optional icons in components)
    const name = node.props.name?.trim()
    if (!name) {
      el.style.display = 'none'
      return el
    }

    // Convert name to PascalCase for Lucide lookup (e.g., "arrow-right" -> "ArrowRight")
    const pascalName = name
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')

    const iconData = icons[pascalName as keyof typeof icons]

    // Use requested icon or fall back to 'Circle' if not found
    const resolvedIconData = iconData || icons['Circle']

    // Create SVG element from Lucide icon data
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '24')
    svg.setAttribute('height', '24')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '2')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')

    // iconData is array of [tagName, attrs] elements
    for (const pathData of resolvedIconData) {
      const [tagName, attrs] = pathData as [string, Record<string, string | number>]
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', tagName)
      for (const [key, value] of Object.entries(attrs)) {
        pathEl.setAttribute(key, String(value))
      }
      svg.appendChild(pathEl)
    }

    el.appendChild(svg)

    return el
  }

  if (node.type === 'cursor') {
    const el = document.createElement('div')
    el.className = 'cursor'

    // Map cursor types to Lucide icon names
    const cursorIconMap: Record<CursorType, string> = {
      'pointer': 'MousePointer2',
      'hand': 'Pointer',
      'grab': 'Hand',
      'grabbing': 'Grab',
      'text': 'Type',
      'crosshair': 'Crosshair',
      'move': 'Move',
      'not-allowed': 'MousePointerBan',
      'click': 'MousePointerClick'
    }

    const iconName = cursorIconMap[node.props.type] || 'MousePointer2'
    const iconData = icons[iconName as keyof typeof icons]

    // Position the cursor
    if (node.props.position) {
      // Absolute positioning
      el.style.left = `${node.props.position.x}px`
      el.style.top = `${node.props.position.y}px`
    } else {
      // Anchor positioning (default: center)
      const anchor = node.props.anchor || 'center'
      const anchorStyles: Record<CursorAnchor, { left: string; top: string; transform: string }> = {
        'top-left': { left: '0', top: '0', transform: 'translate(-20%, -20%)' },
        'top-right': { left: '100%', top: '0', transform: 'translate(-80%, -20%)' },
        'center': { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' },
        'bottom-left': { left: '0', top: '100%', transform: 'translate(-20%, -80%)' },
        'bottom-right': { left: '100%', top: '100%', transform: 'translate(-80%, -80%)' }
      }
      const style = anchorStyles[anchor]
      el.style.left = style.left
      el.style.top = style.top
      el.style.transform = style.transform
    }

    // Apply offset if specified
    if (node.props.offset) {
      const currentTransform = el.style.transform || ''
      el.style.transform = `${currentTransform} translate(${node.props.offset.x}px, ${node.props.offset.y}px)`
    }

    // Create tooltip if specified
    if (node.props.tooltip) {
      const tooltip = document.createElement('div')
      tooltip.className = 'cursor-tooltip'
      tooltip.textContent = node.props.tooltip
      el.appendChild(tooltip)
    }

    // Create cursor icon
    if (iconData) {
      const cursorIcon = document.createElement('div')
      cursorIcon.className = 'cursor-icon'

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('width', '24')
      svg.setAttribute('height', '24')
      svg.setAttribute('viewBox', '0 0 24 24')
      svg.setAttribute('fill', 'none')
      svg.setAttribute('stroke', 'currentColor')
      svg.setAttribute('stroke-width', '2')
      svg.setAttribute('stroke-linecap', 'round')
      svg.setAttribute('stroke-linejoin', 'round')

      for (const pathData of iconData) {
        const [tagName, attrs] = pathData as [string, Record<string, string | number>]
        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', tagName)
        for (const [key, value] of Object.entries(attrs)) {
          pathEl.setAttribute(key, String(value))
        }
        svg.appendChild(pathEl)
      }

      cursorIcon.appendChild(svg)
      el.appendChild(cursorIcon)
    }

    // Store from reference for drag arrow rendering
    if (node.props.from) {
      el.dataset.from = node.props.from
    }

    return el
  }

  if (node.type === 'map') {
    const el = document.createElement('div')
    el.className = 'map'

    const width = node.props.width || 400
    const height = node.props.height || 300

    el.style.width = `${width}px`
    el.style.height = `${height}px`
    el.style.position = 'relative'
    el.style.overflow = 'hidden'
    el.style.border = '1px solid var(--border)'
    el.style.background = '#fafafa'

    // Create SVG for map content
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', String(width))
    svg.setAttribute('height', String(height))
    svg.style.display = 'block'

    // Generate terrain blobs (subtle landmass shapes)
    const terrainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    terrainGroup.setAttribute('fill', '#f0f0f0')
    terrainGroup.setAttribute('stroke', 'none')

    // Generate 2-3 random blob shapes
    for (let b = 0; b < 3; b++) {
      const cx = width * (0.2 + Math.random() * 0.6)
      const cy = height * (0.2 + Math.random() * 0.6)
      const baseRadius = Math.min(width, height) * (0.15 + Math.random() * 0.2)

      // Create blob path with noise
      const points = 12
      let blobPath = ''
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2
        const noise = 0.7 + Math.random() * 0.6
        const r = baseRadius * noise
        const x = cx + r * Math.cos(angle)
        const y = cy + r * Math.sin(angle)
        blobPath += (i === 0 ? 'M' : 'L') + `${x},${y} `
      }
      blobPath += 'Z'

      const blob = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      blob.setAttribute('d', blobPath)
      terrainGroup.appendChild(blob)
    }
    svg.appendChild(terrainGroup)

    // Trajectory colors (cycle through for multiple trajectories)
    const trajectoryColors = [
      'hsl(210, 50%, 40%)',  // blue
      'hsl(150, 40%, 35%)',  // green
      'hsl(30, 60%, 45%)',   // orange
      'hsl(270, 40%, 45%)',  // purple
      'hsl(0, 50%, 45%)',    // red
      'hsl(180, 40%, 35%)'   // teal
    ]

    const flagIconData = icons['Flag' as keyof typeof icons]

    // Helper to get position along a path
    function getPositionOnPath(points: [number, number][], t: number): { x: number; y: number; angle: number } {
      if (points.length < 2) return { x: 0, y: 0, angle: 0 }

      const totalSegments = points.length - 1
      const segmentFloat = t * totalSegments
      const segmentIndex = Math.min(Math.floor(segmentFloat), totalSegments - 1)
      const segmentT = segmentFloat - segmentIndex

      const p1 = points[segmentIndex]
      const p2 = points[Math.min(segmentIndex + 1, points.length - 1)]

      const x = p1[0] + (p2[0] - p1[0]) * segmentT
      const y = p1[1] + (p2[1] - p1[1]) * segmentT
      const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * (180 / Math.PI)

      return { x, y, angle }
    }

    // Draw each trajectory
    node.trajectories.forEach((traj, trajIndex) => {
      const points = traj.points
      const color = trajectoryColors[trajIndex % trajectoryColors.length]

      // Draw trajectory path
      if (points.length > 1) {
        const pathD = points.map((p, i) =>
          (i === 0 ? 'M' : 'L') + `${p[0]},${p[1]}`
        ).join(' ')

        const trajectoryPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        trajectoryPath.setAttribute('d', pathD)
        trajectoryPath.setAttribute('fill', 'none')
        trajectoryPath.setAttribute('stroke', color)
        trajectoryPath.setAttribute('stroke-width', '2')
        trajectoryPath.setAttribute('stroke-linecap', 'round')
        trajectoryPath.setAttribute('stroke-linejoin', 'round')
        svg.appendChild(trajectoryPath)
      }

      // Draw markers (flag icons)
      const markers = traj.markers || []

      markers.forEach(marker => {
        let t: number
        if (marker.position === 'start') t = 0
        else if (marker.position === 'end') t = 1
        else t = marker.position

        const pos = getPositionOnPath(points, t)

        // Create marker group
        const markerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        markerGroup.setAttribute('transform', `translate(${pos.x - 12}, ${pos.y - 24})`)

        // Draw flag icon
        if (flagIconData) {
          const flagSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          flagSvg.setAttribute('width', '24')
          flagSvg.setAttribute('height', '24')
          flagSvg.setAttribute('viewBox', '0 0 24 24')
          flagSvg.setAttribute('fill', 'none')
          flagSvg.setAttribute('stroke', 'hsl(0, 0%, 35%)')
          flagSvg.setAttribute('stroke-width', '2')
          flagSvg.setAttribute('stroke-linecap', 'round')
          flagSvg.setAttribute('stroke-linejoin', 'round')

          for (const pathData of flagIconData) {
            const [tagName, attrs] = pathData as [string, Record<string, string | number>]
            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', tagName)
            for (const [key, value] of Object.entries(attrs)) {
              pathEl.setAttribute(key, String(value))
            }
            flagSvg.appendChild(pathEl)
          }
          markerGroup.appendChild(flagSvg)
        }

        // Add label if present
        if (marker.label) {
          const labelText = marker.label
          const labelX = 26
          const labelY = 16
          const labelPadX = 3
          const labelPadY = 2
          const charWidth = 6  // approximate width per character at font-size 10
          const labelWidth = labelText.length * charWidth + labelPadX * 2
          const labelHeight = 12 + labelPadY * 2

          // Background rect
          const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
          labelBg.setAttribute('x', String(labelX - labelPadX))
          labelBg.setAttribute('y', String(labelY - 10 - labelPadY))
          labelBg.setAttribute('width', String(labelWidth))
          labelBg.setAttribute('height', String(labelHeight))
          labelBg.setAttribute('fill', 'white')
          labelBg.setAttribute('rx', '2')
          markerGroup.appendChild(labelBg)

          // Label text
          const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
          label.setAttribute('x', String(labelX))
          label.setAttribute('y', String(labelY))
          label.setAttribute('font-size', '10')
          label.setAttribute('font-family', 'JetBrains Mono, monospace')
          label.setAttribute('fill', 'hsl(0, 0%, 30%)')
          label.textContent = labelText
          markerGroup.appendChild(label)
        }

        svg.appendChild(markerGroup)
      })

      // Draw vehicle (triangle pointing in direction of travel)
      if (traj.vehicle !== undefined && points.length > 1) {
        const vehiclePos = getPositionOnPath(points, traj.vehicle)

        const vehicleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        vehicleGroup.setAttribute('transform',
          `translate(${vehiclePos.x}, ${vehiclePos.y}) rotate(${vehiclePos.angle})`
        )

        // Triangle pointing right (will be rotated by angle), sized to match 24px icons
        const vehicle = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
        vehicle.setAttribute('points', '12,0 -8,-8 -8,8')
        vehicle.setAttribute('fill', 'hsl(0, 0%, 20%)')
        vehicle.setAttribute('stroke', 'white')
        vehicle.setAttribute('stroke-width', '1.5')
        vehicle.setAttribute('stroke-linejoin', 'round')
        vehicleGroup.appendChild(vehicle)

        svg.appendChild(vehicleGroup)
      }
    })

    el.appendChild(svg)
    return el
  }

  if (node.type === 'chart') {
    const el = document.createElement('div')
    el.className = 'chart'

    const width = node.props.width || 200
    const height = node.props.height || 100

    // Muted color palette
    const colorMap: Record<string, string> = {
      blue: 'hsl(210, 50%, 50%)',
      green: 'hsl(150, 40%, 45%)',
      orange: 'hsl(30, 60%, 50%)',
      purple: 'hsl(270, 40%, 55%)',
      red: 'hsl(0, 50%, 50%)',
      teal: 'hsl(180, 40%, 45%)'
    }

    el.style.width = `${width}px`
    el.style.display = 'flex'
    el.style.flexDirection = 'column'
    el.style.gap = '4px'

    // Chart area wrapper
    const chartArea = document.createElement('div')
    chartArea.style.width = `${width}px`
    chartArea.style.height = `${height}px`
    chartArea.style.border = '1px solid var(--border)'
    chartArea.style.position = 'relative'
    chartArea.style.overflow = 'hidden'

    // Find data bounds across ALL series for consistent scaling
    const allYs = node.series.flatMap(s => s.data.map(d => d.y))
    const dataYMin = Math.min(...allYs)
    const dataYMax = Math.max(...allYs)
    const dataRange = dataYMax - dataYMin || 1
    const buffer = dataRange * 0.1
    const yMin = dataYMin - buffer
    const yMax = dataYMax + buffer
    const yRange = yMax - yMin

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', String(width))
    svg.setAttribute('height', String(height))
    svg.style.display = 'block'

    // Render each series
    node.series.forEach(series => {
      const seriesColor = colorMap[series.color] || colorMap.blue

      if (series.scatter) {
        // Scatter plot - draw small squares
        const dotSize = 4
        series.data.forEach((d, i) => {
          const cx = (i / (series.data.length - 1)) * width
          const cy = height - ((d.y - yMin) / yRange) * height
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
          rect.setAttribute('x', String(cx - dotSize / 2))
          rect.setAttribute('y', String(cy - dotSize / 2))
          rect.setAttribute('width', String(dotSize))
          rect.setAttribute('height', String(dotSize))
          rect.setAttribute('fill', seriesColor)
          svg.appendChild(rect)
        })
      } else {
        // Line chart - draw path
        const points = series.data.map((d, i) => {
          const px = (i / (series.data.length - 1)) * width
          const py = height - ((d.y - yMin) / yRange) * height
          return `${px},${py}`
        })

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.setAttribute('d', `M ${points.join(' L ')}`)
        path.setAttribute('fill', 'none')
        path.setAttribute('stroke', seriesColor)
        path.setAttribute('stroke-width', '2')
        svg.appendChild(path)
      }
    })
    chartArea.appendChild(svg)
    el.appendChild(chartArea)

    // Add legend if any series has a label
    const labelsToShow = node.series.filter(s => s.label)
    if (labelsToShow.length > 0) {
      const legend = document.createElement('div')
      legend.style.display = 'flex'
      legend.style.flexWrap = 'wrap'
      legend.style.gap = '6px'

      labelsToShow.forEach(series => {
        const item = document.createElement('div')
        item.style.display = 'flex'
        item.style.alignItems = 'center'
        item.style.gap = '4px'
        item.style.padding = '2px 6px'
        item.style.border = '1px solid var(--border)'
        item.style.fontSize = '10px'
        item.style.color = 'var(--muted-foreground)'
        item.style.background = 'white'

        // Color swatch
        const swatch = document.createElement('div')
        swatch.style.width = '8px'
        swatch.style.height = '8px'
        swatch.style.background = colorMap[series.color] || colorMap.blue
        item.appendChild(swatch)

        // Label text
        const text = document.createElement('span')
        text.textContent = series.label || ''
        item.appendChild(text)

        legend.appendChild(item)
      })

      el.appendChild(legend)
    }

    return el
  }

  // Fallback
  const el = document.createElement('div')
  el.textContent = '[unknown]'
  return el
}

// Render drag arrows for cursors with 'from' references
function renderDragArrows(frameEl: HTMLElement): void {
  const cursorsWithFrom = frameEl.querySelectorAll('.cursor[data-from]')
  cursorsWithFrom.forEach(cursorEl => {
    const fromId = cursorEl.getAttribute('data-from')
    const fromEl = frameEl.querySelector(`[data-id="${fromId}"]`)
    if (!fromEl) {
      console.warn(`Cursor references unknown element: ${fromId}`)
      return
    }
    // Get the frame's content wrapper (first .box child)
    const contentWrapper = frameEl.querySelector('.box')
    if (contentWrapper) {
      const arrow = drawArrowBetweenElements(
        contentWrapper as HTMLElement,
        fromEl as HTMLElement,
        cursorEl as HTMLElement,
        'drag'
      )
      contentWrapper.appendChild(arrow)
    }
  })
}

// Render all frames to the container
export function render(frames: ResolvedNode[], container: HTMLElement): void {
  container.innerHTML = ''

  const wrapper = document.createElement('div')
  wrapper.className = 'frames-container'

  for (const frame of frames) {
    const frameEl = renderNode(frame)
    wrapper.appendChild(frameEl)
  }

  container.appendChild(wrapper)

  // Draw arrows after everything is in the DOM (getBoundingClientRect needs this)
  const allFrames = wrapper.querySelectorAll('.frame')
  allFrames.forEach(frameEl => renderDragArrows(frameEl as HTMLElement))
}

// Render component gallery - shows all components with their variants
export function renderComponentGallery(
  components: Record<string, { variants: Record<string, unknown[]> }>,
  container: HTMLElement
): void {
  container.innerHTML = ''

  const wrapper = document.createElement('div')
  wrapper.className = 'frames-container component-gallery'

  for (const [componentName, componentDef] of Object.entries(components)) {
    // Component section
    const section = document.createElement('div')
    section.className = 'component-section'

    // Component name header
    const header = document.createElement('div')
    header.className = 'component-header'
    header.textContent = componentName

    section.appendChild(header)

    // Variants container
    const variantsContainer = document.createElement('div')
    variantsContainer.className = 'variants-container'

    for (const [variantName, variantNodes] of Object.entries(componentDef.variants)) {
      const variantWrapper = document.createElement('div')
      variantWrapper.className = 'variant-wrapper'

      // Variant label
      const variantLabel = document.createElement('div')
      variantLabel.className = 'variant-label'
      variantLabel.textContent = variantName

      variantWrapper.appendChild(variantLabel)

      // Render the variant content
      const variantContent = document.createElement('div')
      variantContent.className = 'variant-content'

      // Create a simple resolved node structure for rendering
      // Replace template vars with placeholder text
      const processedNodes = JSON.parse(
        JSON.stringify(variantNodes).replace(/\{\{(\w+)\}\}/g, '[$1]')
      ) as ResolvedNode[]

      for (const node of processedNodes) {
        // Wrap in a minimal resolve structure
        const resolved = resolveForGallery(node, components)
        if (resolved) {
          variantContent.appendChild(renderNode(resolved, defaultContext))
        }
      }

      variantWrapper.appendChild(variantContent)
      variantsContainer.appendChild(variantWrapper)
    }

    section.appendChild(variantsContainer)
    wrapper.appendChild(section)
  }

  container.appendChild(wrapper)
}

// Type for components passed to gallery
type GalleryComponents = Record<string, { variants: Record<string, unknown[]> }>

// Resolver for gallery preview - expands nested components
function resolveForGallery(node: unknown, components: GalleryComponents): ResolvedNode | null {
  if (!node || typeof node !== 'object') return null

  const obj = node as Record<string, unknown>

  if ('Box' in obj) {
    const props = obj['Box'] as Record<string, unknown>
    const rawChildren = props.children

    let children: ResolvedNode[] = []

    // Handle $each block - render 3 sample items
    if (isEachBlock(rawChildren)) {
      const sampleItems = [
        { label: 'Item 1' },
        { label: 'Item 2', variant: 'hover' },
        { label: 'Item 3' }
      ]
      for (const sampleItem of sampleItems) {
        // Substitute {{item.field}} with sample values in template
        const substituted = JSON.parse(
          JSON.stringify(rawChildren.$template)
            .replace(/\{\{item\.label\}\}/g, sampleItem.label)
            .replace(/\{\{item\.variant\}\}/g, sampleItem.variant || '')
            .replace(/\{\{item\}\}/g, sampleItem.label) // fallback for simple {{item}}
        )
        const resolved = substituted
          .map((c: unknown) => resolveForGallery(c, components))
          .filter((c: ResolvedNode | null): c is ResolvedNode => c !== null)
        children.push(...resolved)
      }
    } else if (isChildrenSlot(rawChildren)) {
      // Handle $children slot
      children = [{
        type: 'text',
        props: { content: '[children]', style: 'caption' }
      } as ResolvedNode]
    } else if (Array.isArray(rawChildren)) {
      // Normal array of children
      children = rawChildren
        .map(c => resolveForGallery(c, components))
        .filter((c): c is ResolvedNode => c !== null)
    }

    return {
      type: 'box',
      props: props as ResolvedNode['props'],
      children
    } as ResolvedNode
  }

  if ('Text' in obj) {
    return {
      type: 'text',
      props: obj['Text'] as ResolvedNode['props']
    } as ResolvedNode
  }

  if ('Icon' in obj) {
    return {
      type: 'icon',
      props: obj['Icon'] as ResolvedNode['props']
    } as ResolvedNode
  }

  if ('Cursor' in obj) {
    return {
      type: 'cursor',
      props: obj['Cursor'] as ResolvedNode['props']
    } as ResolvedNode
  }

  if ('Map' in obj) {
    const props = obj['Map'] as Record<string, unknown>
    return {
      type: 'map',
      props: props,
      trajectories: [{ points: [] }]
    } as ResolvedNode
  }

  // Check for component reference (PascalCase key)
  const keys = Object.keys(obj)
  const componentName = keys.find(k => /^[A-Z]/.test(k))

  if (componentName && components[componentName]) {
    const componentDef = components[componentName]
    const instanceProps = obj[componentName] as Record<string, unknown>
    const variantName = (instanceProps?.variant as string)?.trim() || 'default'
    const variant = componentDef.variants[variantName] || componentDef.variants['default']

    if (variant && Array.isArray(variant)) {
      // Substitute props in the variant and resolve
      const substituted = JSON.parse(
        JSON.stringify(variant).replace(/\{\{(\w+)\}\}/g, (_, prop) => {
          const value = instanceProps?.[prop]
          return value !== undefined ? String(value) : `[${prop}]`
        })
      )

      // Resolve all nodes in the variant
      const resolved = substituted
        .map((n: unknown) => resolveForGallery(n, components))
        .filter((n: ResolvedNode | null): n is ResolvedNode => n !== null)

      // Return first node or wrap in box if multiple
      if (resolved.length === 1) {
        return resolved[0]
      } else if (resolved.length > 1) {
        return {
          type: 'box',
          props: { layout: 'column' },
          children: resolved
        } as ResolvedNode
      }
    }
  }

  return null
}
