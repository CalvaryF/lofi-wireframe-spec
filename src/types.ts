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

// Base node that all nodes extend
export interface BaseNode {
  id?: string
  link?: Link
}

// Frame - a screen/canvas
export interface FrameNode extends BaseNode {
  Frame: {
    id: string
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
  }
}

// Text node
export interface TextNode extends BaseNode {
  Text: {
    content: string
    style?: TextStyle
    align?: TextAlign
  }
}

// Icon node (Lucide icons)
export interface IconNode extends BaseNode {
  Icon: {
    name: string  // Lucide icon name (e.g., "settings", "user", "home")
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

// A spec node can be Frame, Box, Text, Icon, Cursor, Map, Chart, or a component instance
export type SpecNode = FrameNode | BoxNode | TextNode | IconNode | CursorNode | MapNode | ChartNode | ComponentInstance

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
