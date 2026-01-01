// Layout types
export type Layout = 'row' | 'column' | 'absolute'
export type Align = 'start' | 'center' | 'end' | 'stretch'
export type Justify = 'start' | 'center' | 'end' | 'between'
export type Outline = 'none' | 'thin' | 'dashed' | 'thick'
export type TextStyle = 'h1' | 'h2' | 'body' | 'caption' | 'mono'
export type TextAlign = 'left' | 'center' | 'right'

// Padding can be a single number or [vertical, horizontal]
export type Padding = number | [number, number]

// Absolute position
export interface Position {
  x: number
  y: number
  w?: number | 'auto'
  h?: number | 'auto'
}

// Link to another frame
export interface Link {
  target: string
}

// Annotation for documenting design decisions
export interface Annotation {
  title: string
  description?: string
}

// Base node that all nodes extend
export interface BaseNode {
  id?: string
  link?: Link
}

// Frame - a screen/canvas
export interface FrameNode extends BaseNode {
  Frame: {
    id: string
    description?: string
    size?: [number, number | 'hug']
    layout?: Layout
    gap?: number
    padding?: Padding
    children?: SpecNode[]
  }
}

// Box - container with layout
export interface BoxNode extends BaseNode {
  Box: {
    id?: string
    layout?: Layout
    gap?: number
    padding?: Padding
    align?: Align
    justify?: Justify
    wrap?: boolean
    grow?: 0 | 1
    outline?: Outline
    background?: 'grey'
    shadow?: boolean
    position?: Position
    children?: SpecNode[]
    link?: Link
    annotation?: Annotation
  }
}

// Text node
export interface TextNode extends BaseNode {
  Text: {
    content: string
    style?: TextStyle
    align?: TextAlign
    annotation?: Annotation
  }
}

// Icon node (Lucide icons)
export interface IconNode extends BaseNode {
  Icon: {
    name: string  // Lucide icon name (e.g., "settings", "user", "home")
    annotation?: Annotation
  }
}

// Cursor types
export type CursorType = 'pointer' | 'hand' | 'grab' | 'grabbing' | 'text' | 'crosshair' | 'move' | 'not-allowed' | 'click'

// Cursor anchor positions (relative to parent element)
export type CursorAnchor = 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right'

// Cursor node - shows a cursor indicator pointing at an element
export interface CursorNode extends BaseNode {
  Cursor: {
    type: CursorType
    anchor?: CursorAnchor           // Position relative to parent (default: center)
    position?: { x: number; y: number }  // Absolute position (alternative to anchor)
    offset?: { x: number; y: number }    // Fine-tune offset from anchor point
    tooltip?: string                // Optional label above cursor
    from?: string                   // Source element ID for drag arrow
  }
}

// Component instance (when used)
export interface ComponentInstance {
  [componentName: string]: {
    variant?: string
    link?: Link
    [prop: string]: unknown
  }
}

// Map trajectory function types
export type MapTrajectoryFn = 'loop' | 'linear' | 'curved' | 'wander' | 'zigzag'

// Map marker
export interface MapMarker {
  position: number | 'start' | 'end'  // 0-1 along path, or 'start'/'end'
  label?: string
}

// Single trajectory definition (used in trajectories array)
export interface MapTrajectoryDef {
  fn?: MapTrajectoryFn           // helper function to generate path
  points?: [number, number][]    // explicit coordinates
  vehicle?: number               // position along path (0-1)
  markers?: MapMarker[]          // waypoints with flag icons
}

// Map node - geographical map with vehicle trajectory
export interface MapNode extends BaseNode {
  Map: {
    width?: number
    height?: number
    // Single trajectory (backward compatible)
    trajectory?: {
      fn?: MapTrajectoryFn      // helper function to generate path
      points?: [number, number][]  // explicit coordinates
    }
    vehicle?: number            // position along path (0-1)
    markers?: MapMarker[]       // waypoints with flag icons
    // Multiple trajectories
    trajectories?: MapTrajectoryDef[]
  }
}

// Chart function types
export type ChartFn = 'sin' | 'cos' | 'tan' | 'square' | 'linear' | 'random' | 'sqrt' | 'binary'

// Chart line colors (muted palette)
export type ChartColor = 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'teal'

// Single line definition for multi-line charts
export interface ChartLine {
  fn: ChartFn
  label?: string
  color?: ChartColor
  noise?: number
  scatter?: boolean
}

// Chart node for data visualization
export interface ChartNode extends BaseNode {
  Chart: {
    // Single line mode (backward compatible)
    fn?: ChartFn
    noise?: number
    scatter?: boolean
    // Multi-line mode
    lines?: ChartLine[]
    // Shared properties
    range?: [number, number]  // x range, default [0, 10]
    samples?: number          // number of points, default 20
    width?: number
    height?: number
  }
}

// A spec node can be Frame, Box, Text, Icon, Cursor, Map, Chart, Globe3D, Scatter3D, or a component instance
export type SpecNode = FrameNode | BoxNode | TextNode | IconNode | CursorNode | MapNode | ChartNode | Globe3DNode | Scatter3DNode | ComponentInstance

// Component definition
export interface ComponentVariant {
  [variantName: string]: SpecNode[]
}

export interface ComponentDefinition {
  variants: ComponentVariant
}

// Components file structure
export interface ComponentsFile {
  [componentName: string]: ComponentDefinition
}

// Wireframe file structure
export interface WireframeFile {
  frames: FrameNode[]
}

// Chart data point
export interface ChartDataPoint {
  x: number
  y: number
}

// ============ Globe3D Types ============

// Trajectory function types for globe
export type Globe3DTrajectoryFn = 'greatCircle' | 'polar' | 'equatorial' | 'random' | 'circuit' | 'custom'

// Camera preset types
export type Globe3DCameraPreset = 'follow' | 'side' | 'track' | 'overview'

// Globe style types
export type Globe3DStyle = 'wireframe' | 'terrain'

// Marker on globe trajectory
export interface Globe3DMarker {
  position: number | 'start' | 'end'
  label?: string
}

// Single trajectory definition for Globe3D (used in trajectories array)
export interface Globe3DTrajectoryDef {
  fn?: Globe3DTrajectoryFn
  waypoints?: [number, number][]  // [lat, lon] pairs
  altitude?: number  // 0-1 arc height above sphere (0 = surface, 1 = max arc)
  vehicle?: number
  markers?: Globe3DMarker[]
  label?: string
}

// Globe3D node definition
export interface Globe3DNode extends BaseNode {
  Globe3D: {
    width?: number
    height?: number
    style?: Globe3DStyle  // 'wireframe' (default) or 'terrain'
    // Single trajectory (backward compatible)
    trajectory?: {
      fn?: Globe3DTrajectoryFn
      waypoints?: [number, number][]  // [lat, lon] pairs
      altitude?: number  // 0-1 arc height above sphere (0 = surface, 1 = max arc)
    }
    vehicle?: number
    markers?: Globe3DMarker[]
    // Multiple trajectories
    trajectories?: Globe3DTrajectoryDef[]
    camera?: Globe3DCameraPreset
    rotation?: number
  }
}

// 3D point for trajectory (resolved)
export interface Globe3DPoint {
  lat: number
  lon: number
  x: number
  y: number
  z: number
  elevation: number  // Radius multiplier (1.0 = surface, higher = above surface)
}

// Resolved trajectory data for Globe3D
export interface Globe3DTrajectoryData {
  points: Globe3DPoint[]
  vehicle?: number
  markers?: Globe3DMarker[]
  label?: string
}

// ============ Scatter3D Types ============

// Scatter function types
export type Scatter3DFn = 'random' | 'sphere' | 'helix' | 'cube' | 'cluster' | 'plane'

// Scatter3D series definition
export interface Scatter3DSeries {
  fn: Scatter3DFn
  label?: string
  color?: ChartColor
  noise?: number
}

// Scatter3D node definition
export interface Scatter3DNode extends BaseNode {
  Scatter3D: {
    width?: number
    height?: number
    fn?: Scatter3DFn
    samples?: number
    noise?: number
    series?: Scatter3DSeries[]
  }
}

// 3D point data
export interface Scatter3DPoint {
  x: number
  y: number
  z: number
}

// Resolved series data for Scatter3D
export interface Scatter3DSeriesData {
  points: Scatter3DPoint[]
  label?: string
  color: ChartColor
}

// Chart data series (resolved line with data)
export interface ChartSeries {
  data: ChartDataPoint[]
  label?: string
  color: ChartColor
  scatter?: boolean
}

// Map trajectory data (resolved points for a single trajectory)
export interface MapTrajectoryData {
  points: [number, number][]
  vehicle?: number
  markers?: MapMarker[]
}

// Parsed and resolved node (after component expansion)
export type ResolvedNode =
  | { type: 'frame'; props: FrameNode['Frame']; children: ResolvedNode[] }
  | { type: 'box'; props: BoxNode['Box']; children: ResolvedNode[] }
  | { type: 'text'; props: TextNode['Text'] }
  | { type: 'icon'; props: IconNode['Icon'] }
  | { type: 'cursor'; props: CursorNode['Cursor'] }
  | { type: 'map'; props: MapNode['Map']; trajectories: MapTrajectoryData[] }
  | { type: 'chart'; props: ChartNode['Chart']; series: ChartSeries[] }
  | { type: 'globe3d'; props: Globe3DNode['Globe3D']; trajectories: Globe3DTrajectoryData[] }
  | { type: 'scatter3d'; props: Scatter3DNode['Scatter3D']; series: Scatter3DSeriesData[] }
