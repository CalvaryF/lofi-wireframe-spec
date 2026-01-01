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
  ChartColor,
  Globe3DNode,
  Globe3DTrajectoryFn,
  Globe3DPoint,
  Globe3DTrajectoryData,
  Scatter3DNode,
  Scatter3DFn,
  Scatter3DPoint,
  Scatter3DSeriesData
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

// Check if node is Globe3D
function isGlobe3D(node: SpecNode): node is Globe3DNode {
  return 'Globe3D' in node
}

// Check if node is Scatter3D
function isScatter3D(node: SpecNode): node is Scatter3DNode {
  return 'Scatter3D' in node
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

// ============ Globe3D Data Generation ============

// Convert lat/lon to 3D cartesian coordinates on unit sphere
function latLonToCartesian(lat: number, lon: number): { x: number; y: number; z: number } {
  const latRad = (lat * Math.PI) / 180
  const lonRad = (lon * Math.PI) / 180
  return {
    x: Math.cos(latRad) * Math.cos(lonRad),
    y: Math.sin(latRad),
    z: Math.cos(latRad) * Math.sin(lonRad)
  }
}

// Spherical linear interpolation for great circle paths
function slerp(
  start: { lat: number; lon: number },
  end: { lat: number; lon: number },
  t: number
): { lat: number; lon: number } {
  // Convert to radians
  const lat1 = (start.lat * Math.PI) / 180
  const lon1 = (start.lon * Math.PI) / 180
  const lat2 = (end.lat * Math.PI) / 180
  const lon2 = (end.lon * Math.PI) / 180

  // Convert to cartesian
  const x1 = Math.cos(lat1) * Math.cos(lon1)
  const y1 = Math.sin(lat1)
  const z1 = Math.cos(lat1) * Math.sin(lon1)

  const x2 = Math.cos(lat2) * Math.cos(lon2)
  const y2 = Math.sin(lat2)
  const z2 = Math.cos(lat2) * Math.sin(lon2)

  // Dot product for angle
  const dot = x1 * x2 + y1 * y2 + z1 * z2
  const omega = Math.acos(Math.max(-1, Math.min(1, dot)))

  if (Math.abs(omega) < 0.0001) {
    // Points are very close, linear interpolation
    return {
      lat: start.lat + (end.lat - start.lat) * t,
      lon: start.lon + (end.lon - start.lon) * t
    }
  }

  const sinOmega = Math.sin(omega)
  const a = Math.sin((1 - t) * omega) / sinOmega
  const b = Math.sin(t * omega) / sinOmega

  const x = a * x1 + b * x2
  const y = a * y1 + b * y2
  const z = a * z1 + b * z2

  // Convert back to lat/lon
  const lat = Math.asin(y) * (180 / Math.PI)
  const lon = Math.atan2(z, x) * (180 / Math.PI)

  return { lat, lon }
}

// Calculate parabolic arc elevation for flight paths
// Returns elevation multiplier (1.0 = surface, higher = above surface)
function calculateFlightElevation(t: number, altitude: number): number {
  // t is 0-1 along the path
  // Parabola: peaks at t=0.5, zero at t=0 and t=1
  // elevation = 1.0 + altitude * maxHeight * (1 - 4*(t-0.5)^2)
  const maxHeight = 0.4 // Max arc height as fraction of radius
  const parabola = 1 - 4 * Math.pow(t - 0.5, 2)
  return 1.0 + altitude * maxHeight * parabola
}

// Generate globe trajectory points from function type
function generateGlobeTrajectory(
  fn: Globe3DTrajectoryFn,
  waypoints?: [number, number][],
  altitude: number = 0
): Globe3DPoint[] {
  const points: Globe3DPoint[] = []

  switch (fn) {
    case 'greatCircle': {
      // NYC to London arc
      const start = { lat: 40.7, lon: -74.0 }
      const end = { lat: 51.5, lon: -0.1 }
      const samples = 30
      for (let i = 0; i <= samples; i++) {
        const t = i / samples
        const { lat, lon } = slerp(start, end, t)
        const cart = latLonToCartesian(lat, lon)
        const elevation = calculateFlightElevation(t, altitude)
        points.push({ lat, lon, ...cart, elevation })
      }
      break
    }
    case 'polar': {
      // Path over north pole (LAX to Moscow style)
      const waypts: [number, number][] = [
        [34.0, -118.2], // LA
        [60.0, -140.0], // Alaska area
        [80.0, -180.0], // Near pole
        [75.0, 100.0],  // Siberia
        [55.8, 37.6]    // Moscow
      ]
      return generateGlobeTrajectory('custom', waypts, altitude)
    }
    case 'equatorial': {
      // Path roughly along equator
      const samples = 36
      for (let i = 0; i <= samples; i++) {
        const t = i / samples
        const lat = 5 * Math.sin(t * Math.PI * 2) // Slight wobble
        const lon = -180 + 360 * t
        const cart = latLonToCartesian(lat, lon)
        const elevation = calculateFlightElevation(t, altitude)
        points.push({ lat, lon, ...cart, elevation })
      }
      break
    }
    case 'random': {
      // Random path with 5-8 waypoints
      const numWaypoints = 5 + Math.floor(Math.random() * 4)
      const randomWaypoints: [number, number][] = []
      for (let i = 0; i < numWaypoints; i++) {
        randomWaypoints.push([
          Math.random() * 140 - 70,  // lat: -70 to 70
          Math.random() * 360 - 180  // lon: -180 to 180
        ])
      }
      return generateGlobeTrajectory('custom', randomWaypoints, altitude)
    }
    case 'circuit': {
      // Closed loop that starts and ends at same point
      // Organic shape with 5-7 waypoints around a center
      const numWaypoints = 5 + Math.floor(Math.random() * 3)
      const centerLat = Math.random() * 60 - 30  // Center between -30 and 30 lat
      const centerLon = Math.random() * 300 - 150  // Center between -150 and 150 lon
      const baseRadius = 25 + Math.random() * 20  // 25-45 degrees radius

      const circuitWaypoints: [number, number][] = []
      for (let i = 0; i < numWaypoints; i++) {
        const angle = (i / numWaypoints) * Math.PI * 2
        // Add organic variation to radius (0.6 to 1.4 of base)
        const radiusVariation = 0.6 + Math.random() * 0.8
        const radius = baseRadius * radiusVariation
        // Add slight angle offset for organic feel
        const angleOffset = (Math.random() - 0.5) * 0.4
        const lat = centerLat + radius * Math.sin(angle + angleOffset) * 0.7  // Squish vertically
        const lon = centerLon + radius * Math.cos(angle + angleOffset)
        // Clamp lat to valid range
        circuitWaypoints.push([
          Math.max(-70, Math.min(70, lat)),
          lon
        ])
      }
      // Close the loop - add first point again
      circuitWaypoints.push([...circuitWaypoints[0]])

      return generateGlobeTrajectory('custom', circuitWaypoints, altitude)
    }
    case 'custom': {
      if (!waypoints || waypoints.length < 2) {
        return generateGlobeTrajectory('greatCircle', undefined, altitude)
      }
      // Interpolate between waypoints using great circle paths
      const samplesPerSegment = 15
      const totalSegments = waypoints.length - 1
      let pointIndex = 0
      const totalPoints = totalSegments * samplesPerSegment + 1

      for (let w = 0; w < waypoints.length - 1; w++) {
        const [lat1, lon1] = waypoints[w]
        const [lat2, lon2] = waypoints[w + 1]
        const start = { lat: lat1, lon: lon1 }
        const end = { lat: lat2, lon: lon2 }
        for (let i = 0; i <= samplesPerSegment; i++) {
          if (i === 0 && w > 0) continue // Avoid duplicate points
          const segT = i / samplesPerSegment
          const { lat, lon } = slerp(start, end, segT)
          const cart = latLonToCartesian(lat, lon)
          // Calculate global t for elevation
          const globalT = pointIndex / (totalPoints - 1)
          const elevation = calculateFlightElevation(globalT, altitude)
          points.push({ lat, lon, ...cart, elevation })
          pointIndex++
        }
      }
      break
    }
  }

  return points
}

// ============ Scatter3D Data Generation ============

// Generate 3D scatter points from function type
function generateScatterPoints(
  fn: Scatter3DFn,
  samples: number,
  noise: number = 0
): Scatter3DPoint[] {
  const points: Scatter3DPoint[] = []

  switch (fn) {
    case 'random': {
      for (let i = 0; i < samples; i++) {
        points.push({
          x: Math.random() * 2 - 1,
          y: Math.random() * 2 - 1,
          z: Math.random() * 2 - 1
        })
      }
      break
    }
    case 'sphere': {
      // Fibonacci sphere for even distribution
      const goldenRatio = (1 + Math.sqrt(5)) / 2
      for (let i = 0; i < samples; i++) {
        const theta = 2 * Math.PI * i / goldenRatio
        const phi = Math.acos(1 - 2 * (i + 0.5) / samples)
        points.push({
          x: Math.sin(phi) * Math.cos(theta),
          y: Math.cos(phi),
          z: Math.sin(phi) * Math.sin(theta)
        })
      }
      break
    }
    case 'helix': {
      const turns = 3
      for (let i = 0; i < samples; i++) {
        const t = i / (samples - 1)
        const angle = t * turns * 2 * Math.PI
        points.push({
          x: Math.cos(angle) * 0.8,
          y: t * 2 - 1,  // -1 to 1
          z: Math.sin(angle) * 0.8
        })
      }
      break
    }
    case 'cube': {
      // Points along edges of a cube
      const edges: [[number, number, number], [number, number, number]][] = [
        // Bottom face edges
        [[-1, -1, -1], [1, -1, -1]], [[1, -1, -1], [1, -1, 1]],
        [[1, -1, 1], [-1, -1, 1]], [[-1, -1, 1], [-1, -1, -1]],
        // Top face edges
        [[-1, 1, -1], [1, 1, -1]], [[1, 1, -1], [1, 1, 1]],
        [[1, 1, 1], [-1, 1, 1]], [[-1, 1, 1], [-1, 1, -1]],
        // Vertical edges
        [[-1, -1, -1], [-1, 1, -1]], [[1, -1, -1], [1, 1, -1]],
        [[1, -1, 1], [1, 1, 1]], [[-1, -1, 1], [-1, 1, 1]]
      ]
      const pointsPerEdge = Math.ceil(samples / 12)
      for (const [start, end] of edges) {
        for (let i = 0; i <= pointsPerEdge; i++) {
          const t = i / pointsPerEdge
          points.push({
            x: start[0] + (end[0] - start[0]) * t,
            y: start[1] + (end[1] - start[1]) * t,
            z: start[2] + (end[2] - start[2]) * t
          })
        }
      }
      break
    }
    case 'cluster': {
      // Gaussian cluster at random center
      const cx = Math.random() * 1.2 - 0.6
      const cy = Math.random() * 1.2 - 0.6
      const cz = Math.random() * 1.2 - 0.6
      const spread = 0.3
      for (let i = 0; i < samples; i++) {
        // Box-Muller transform for Gaussian
        const u1 = Math.random()
        const u2 = Math.random()
        const u3 = Math.random()
        const u4 = Math.random()
        points.push({
          x: cx + spread * Math.sqrt(-2 * Math.log(u1 || 0.001)) * Math.cos(2 * Math.PI * u2),
          y: cy + spread * Math.sqrt(-2 * Math.log(u1 || 0.001)) * Math.sin(2 * Math.PI * u2),
          z: cz + spread * Math.sqrt(-2 * Math.log(u3 || 0.001)) * Math.cos(2 * Math.PI * u4)
        })
      }
      break
    }
    case 'plane': {
      // z = sin(x) * cos(y) surface
      const gridSize = Math.ceil(Math.sqrt(samples))
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const x = (i / (gridSize - 1)) * 2 - 1
          const y = (j / (gridSize - 1)) * 2 - 1
          const z = Math.sin(x * Math.PI) * Math.cos(y * Math.PI) * 0.5
          points.push({ x, y, z })
        }
      }
      break
    }
  }

  // Apply noise
  if (noise > 0) {
    for (const p of points) {
      p.x += (Math.random() - 0.5) * noise * 2
      p.y += (Math.random() - 0.5) * noise * 2
      p.z += (Math.random() - 0.5) * noise * 2
    }
  }

  return points
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

  // Handle Globe3D
  if (isGlobe3D(node)) {
    const props = node.Globe3D
    const trajectories: Globe3DTrajectoryData[] = []

    if (props.trajectories && props.trajectories.length > 0) {
      // Multiple trajectories mode
      for (const traj of props.trajectories) {
        const altitude = traj.altitude ?? 0
        let points: Globe3DPoint[] = []
        if (traj.waypoints) {
          points = generateGlobeTrajectory('custom', traj.waypoints, altitude)
        } else if (traj.fn) {
          points = generateGlobeTrajectory(traj.fn, undefined, altitude)
        } else {
          points = generateGlobeTrajectory('greatCircle', undefined, altitude)
        }
        trajectories.push({
          points,
          vehicle: traj.vehicle,
          markers: traj.markers,
          label: traj.label
        })
      }
    } else {
      // Single trajectory mode (backward compatible)
      const altitude = props.trajectory?.altitude ?? 0
      let points: Globe3DPoint[] = []
      if (props.trajectory?.waypoints) {
        points = generateGlobeTrajectory('custom', props.trajectory.waypoints, altitude)
      } else if (props.trajectory?.fn) {
        points = generateGlobeTrajectory(props.trajectory.fn, undefined, altitude)
      } else {
        points = generateGlobeTrajectory('greatCircle', undefined, altitude)
      }
      trajectories.push({
        points,
        vehicle: props.vehicle,
        markers: props.markers
      })
    }

    return {
      type: 'globe3d',
      props,
      trajectories
    }
  }

  // Handle Scatter3D
  if (isScatter3D(node)) {
    const props = node.Scatter3D
    const samples = props.samples || 50

    // Build series array
    const series: Scatter3DSeriesData[] = []

    if (props.series && props.series.length > 0) {
      // Multi-series mode
      props.series.forEach((s, index) => {
        series.push({
          points: generateScatterPoints(s.fn, samples, s.noise || 0),
          label: s.label,
          color: s.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
        })
      })
    } else if (props.fn) {
      // Single series mode
      series.push({
        points: generateScatterPoints(props.fn, samples, props.noise || 0),
        color: 'blue'
      })
    }

    return {
      type: 'scatter3d',
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
