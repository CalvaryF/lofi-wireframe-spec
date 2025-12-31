import YAML from 'yaml'
import type {
  ComponentsFile,
  WireframeFile,
  SpecNode,
  ResolvedNode,
  FrameNode,
  BoxNode,
  TextNode,
  IconNode,
  CursorNode,
  MapNode,
  MapTrajectoryFn,
  MapTrajectoryData,
  ChartNode,
  ChartDataPoint,
  ChartSeries,
  ChartFn,
  ChartColor
} from './types'

// Check if a string is PascalCase (component) vs lowercase (primitive)
function isPascalCase(str: string): boolean {
  return /^[A-Z]/.test(str)
}

// Check if node is a Frame
function isFrame(node: SpecNode): node is FrameNode {
  return 'Frame' in node
}

// Check if node is a Box
function isBox(node: SpecNode): node is BoxNode {
  return 'Box' in node
}

// Check if node is Text
function isText(node: SpecNode): node is TextNode {
  return 'Text' in node
}

// Check if node is Icon
function isIcon(node: SpecNode): node is IconNode {
  return 'Icon' in node
}

// Check if node is Cursor
function isCursor(node: SpecNode): node is CursorNode {
  return 'Cursor' in node
}

// Check if node is Map
function isMap(node: SpecNode): node is MapNode {
  return 'Map' in node
}

// Check if node is Chart
function isChart(node: SpecNode): node is ChartNode {
  return 'Chart' in node
}

// Generate map trajectory points from helper function
function generateTrajectory(
  fn: MapTrajectoryFn,
  width: number,
  height: number
): [number, number][] {
  const padding = 40
  const w = width - padding * 2
  const h = height - padding * 2
  const points: [number, number][] = []

  switch (fn) {
    case 'loop': {
      // Oval/circular delivery route
      const samples = 24
      for (let i = 0; i <= samples; i++) {
        const t = (i / samples) * Math.PI * 2
        const x = padding + w / 2 + (w / 2.5) * Math.cos(t)
        const y = padding + h / 2 + (h / 2.5) * Math.sin(t)
        points.push([x, y])
      }
      break
    }
    case 'linear': {
      // Straight line with slight curve
      const samples = 10
      for (let i = 0; i <= samples; i++) {
        const t = i / samples
        const x = padding + t * w
        const y = padding + h / 2 + Math.sin(t * Math.PI) * (h / 8)
        points.push([x, y])
      }
      break
    }
    case 'curved': {
      // Smooth S-curve path
      const samples = 20
      for (let i = 0; i <= samples; i++) {
        const t = i / samples
        const x = padding + t * w
        const y = padding + h / 2 + Math.sin(t * Math.PI * 2) * (h / 4)
        points.push([x, y])
      }
      break
    }
    case 'wander': {
      // Random walk, organic movement
      const samples = 16
      let x = padding + w * 0.1
      let y = padding + h / 2
      points.push([x, y])
      for (let i = 1; i <= samples; i++) {
        const t = i / samples
        x = padding + t * w * 0.9 + w * 0.1
        y = y + (Math.random() - 0.5) * (h / 4)
        y = Math.max(padding, Math.min(height - padding, y))
        points.push([x, y])
      }
      break
    }
    case 'zigzag': {
      // Back-and-forth pattern
      const samples = 8
      for (let i = 0; i <= samples; i++) {
        const t = i / samples
        const x = padding + t * w
        const y = i % 2 === 0 ? padding + h * 0.2 : padding + h * 0.8
        points.push([x, y])
      }
      break
    }
    default:
      points.push([padding, padding + h / 2], [width - padding, padding + h / 2])
  }

  return points
}

// Default color cycle for multi-line charts
const DEFAULT_COLORS: ChartColor[] = ['blue', 'green', 'orange', 'purple', 'red', 'teal']

// Sample a function over a range
function sampleFunction(
  fn: ChartFn,
  range: [number, number],
  samples: number,
  noise: number = 0
): ChartDataPoint[] {
  const [xMin, xMax] = range
  const step = (xMax - xMin) / (samples - 1)
  const data: ChartDataPoint[] = []

  // State for binary function (sticky 0/1 with contiguous blocks)
  let binaryState = Math.random() > 0.5 ? 1 : 0
  const switchProbability = 0.15 // Low probability = longer blocks

  for (let i = 0; i < samples; i++) {
    const x = xMin + i * step
    let y: number

    switch (fn) {
      case 'sin':
        y = Math.sin(x)
        break
      case 'cos':
        y = Math.cos(x)
        break
      case 'tan':
        y = Math.tan(x)
        break
      case 'square':
        y = x * x
        break
      case 'sqrt':
        y = Math.sqrt(Math.abs(x))
        break
      case 'linear':
        y = x
        break
      case 'random':
        y = Math.random() * 2 - 1
        break
      case 'binary':
        // Sticky binary: small chance to flip state each sample
        if (Math.random() < switchProbability) {
          binaryState = binaryState === 1 ? 0 : 1
        }
        y = binaryState
        break
      default:
        y = 0
    }

    // Add noise if specified
    if (noise > 0) {
      y += (Math.random() - 0.5) * 2 * noise
    }

    data.push({ x, y })
  }

  return data
}

// Check if an object is an $each iteration block
export interface EachBlock {
  $each: string
  $template: SpecNode[]
}

export function isEachBlock(obj: unknown): obj is EachBlock {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    '$each' in obj &&
    '$template' in obj
  )
}

// Check if children is a $children slot marker
export function isChildrenSlot(children: unknown): boolean {
  return children === '$children'
}

// Substitute {{prop}} and {{prop.field}} templates with actual values
function substituteProps(obj: unknown, props: Record<string, unknown>): unknown {
  if (typeof obj === 'string') {
    // Replace all {{propName}} or {{propName.field}} with actual values
    return obj.replace(/\{\{(\w+)(?:\.(\w+))?\}\}/g, (match, propName, field) => {
      const value = props[propName]
      if (value === undefined) return match
      if (field && typeof value === 'object' && value !== null) {
        const fieldValue = (value as Record<string, unknown>)[field]
        // Return empty string for undefined fields (allows fallback to defaults)
        return fieldValue !== undefined ? String(fieldValue) : ''
      }
      return String(value)
    })
  }
  if (Array.isArray(obj)) {
    return obj.map(item => substituteProps(item, props))
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteProps(value, props)
    }
    return result
  }
  return obj
}

// Resolve children, handling $each blocks and $children slots
function resolveChildren(
  children: unknown,
  components: ComponentsFile,
  instanceProps: Record<string, unknown>
): ResolvedNode[] {
  // Handle $children slot - substitute with children from instance
  if (isChildrenSlot(children)) {
    const slotChildren = instanceProps.children as SpecNode[] | undefined
    if (!slotChildren || !Array.isArray(slotChildren)) {
      return []
    }
    return slotChildren.flatMap(child => {
      const result = resolveNode(child, components, {})
      return Array.isArray(result) ? result : [result]
    })
  }

  // Handle $each iteration block
  if (isEachBlock(children)) {
    const arrayName = children.$each
    const template = children.$template
    const items = instanceProps[arrayName]

    if (!Array.isArray(items)) {
      console.warn(`$each: "${arrayName}" is not an array in props`)
      return []
    }

    return items.flatMap(rawItem => {
      // Normalize string items to objects with label property
      const item = typeof rawItem === 'string' ? { label: rawItem } : rawItem
      // Create props with 'item' bound to current iteration value
      const itemProps = { ...instanceProps, item }
      const substituted = substituteProps(template, itemProps) as SpecNode[]
      return substituted.flatMap(child => {
        const result = resolveNode(child, components, {})
        return Array.isArray(result) ? result : [result]
      })
    })
  }

  // Normal array of children
  if (!Array.isArray(children)) {
    return []
  }

  return children.flatMap(child => {
    const result = resolveNode(child, components, instanceProps)
    return Array.isArray(result) ? result : [result]
  })
}

// Resolve a single node, expanding components as needed
function resolveNode(
  node: SpecNode,
  components: ComponentsFile,
  instanceProps: Record<string, unknown> = {}
): ResolvedNode | ResolvedNode[] {
  // Handle Frame
  if (isFrame(node)) {
    const props = node.Frame
    const resolvedChildren = resolveChildren(props.children || [], components, instanceProps)
    return {
      type: 'frame',
      props,
      children: resolvedChildren
    }
  }

  // Handle Box
  if (isBox(node)) {
    const props = node.Box
    const resolvedChildren = resolveChildren(props.children || [], components, instanceProps)
    return {
      type: 'box',
      props,
      children: resolvedChildren
    }
  }

  // Handle Text
  if (isText(node)) {
    return {
      type: 'text',
      props: node.Text
    }
  }

  // Handle Icon
  if (isIcon(node)) {
    return {
      type: 'icon',
      props: node.Icon
    }
  }

  // Handle Cursor
  if (isCursor(node)) {
    return {
      type: 'cursor',
      props: node.Cursor
    }
  }

  // Handle Map
  if (isMap(node)) {
    const props = node.Map
    const width = props.width || 400
    const height = props.height || 300

    const trajectories: MapTrajectoryData[] = []

    if (props.trajectories && props.trajectories.length > 0) {
      // Multiple trajectories mode
      for (const traj of props.trajectories) {
        let points: [number, number][] = []
        if (traj.points) {
          points = traj.points
        } else if (traj.fn) {
          points = generateTrajectory(traj.fn, width, height)
        }
        trajectories.push({
          points,
          vehicle: traj.vehicle,
          markers: traj.markers
        })
      }
    } else {
      // Single trajectory mode (backward compatible)
      let points: [number, number][] = []
      if (props.trajectory?.points) {
        points = props.trajectory.points
      } else if (props.trajectory?.fn) {
        points = generateTrajectory(props.trajectory.fn, width, height)
      }
      trajectories.push({
        points,
        vehicle: props.vehicle,
        markers: props.markers
      })
    }

    return {
      type: 'map',
      props,
      trajectories
    }
  }

  // Handle Chart
  if (isChart(node)) {
    const props = node.Chart
    const range = props.range || [0, 10]
    const samples = props.samples || 20

    // Build series array
    const series: ChartSeries[] = []

    if (props.lines && props.lines.length > 0) {
      // Multi-line mode
      props.lines.forEach((line, index) => {
        const data = sampleFunction(line.fn, range, samples, line.noise || 0)
        series.push({
          data,
          label: line.label,
          color: line.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
          scatter: line.scatter
        })
      })
    } else if (props.fn) {
      // Single-line mode (backward compatible)
      const data = sampleFunction(props.fn, range, samples, props.noise || 0)
      series.push({
        data,
        color: 'blue',
        scatter: props.scatter
      })
    }

    return {
      type: 'chart',
      props,
      series
    }
  }

  // Must be a component instance
  const keys = Object.keys(node)
  const componentName = keys.find(k => isPascalCase(k))

  if (!componentName) {
    console.warn('Unknown node type:', node)
    return { type: 'box', props: {}, children: [] }
  }

  const compInstanceProps = (node as Record<string, Record<string, unknown>>)[componentName]
  const variantName = (compInstanceProps.variant as string)?.trim() || 'default'

  // Look up component definition
  const componentDef = components[componentName]
  if (!componentDef) {
    console.warn(`Component not found: ${componentName}`)
    return {
      type: 'box',
      props: { outline: 'dashed' },
      children: [{
        type: 'text',
        props: { content: `[${componentName}]`, style: 'caption' }
      }]
    }
  }

  // Get the variant
  const variant = componentDef.variants[variantName]
  if (!variant) {
    console.warn(`Variant not found: ${componentName}.${variantName}`)
    return { type: 'box', props: {}, children: [] }
  }

  // Deep clone variant to avoid mutating the original
  const variantClone = JSON.parse(JSON.stringify(variant))

  // Resolve all nodes in the variant, passing instance props for $each/$children
  const resolved = variantClone.flatMap((child: SpecNode) => {
    // Substitute simple props first
    const substituted = substituteProps(child, compInstanceProps) as SpecNode
    const result = resolveNode(substituted, components, compInstanceProps)
    return Array.isArray(result) ? result : [result]
  })

  // If there's a link on the instance, apply it to the first resolved node
  if (compInstanceProps.link && resolved.length > 0) {
    const first = resolved[0]
    if (first.type === 'box') {
      first.props = { ...first.props, link: compInstanceProps.link as { target: string } }
    }
  }

  return resolved
}

// Parse components file
export function parseComponents(yaml: string): ComponentsFile {
  return YAML.parse(yaml) as ComponentsFile
}

// Parse wireframe file
export function parseWireframe(yaml: string): WireframeFile {
  return YAML.parse(yaml) as WireframeFile
}

// Resolve all frames, expanding components
export function resolveFrames(
  wireframe: WireframeFile,
  components: ComponentsFile
): ResolvedNode[] {
  return wireframe.frames.map(frame => {
    const result = resolveNode(frame, components)
    return Array.isArray(result) ? result[0] : result
  })
}
