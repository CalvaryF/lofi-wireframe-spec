# Architecture Guide

This document explains the internals of the wireframe renderer. For YAML spec syntax and usage, see [CLAUDE.md](./CLAUDE.md).

## Project Structure

```
src/
├── main.tsx              # Entry point, mounts App
├── App.tsx               # Main app: file loading, navigation, hot reload
├── parser.ts             # YAML → resolved nodes pipeline
├── types.ts              # All TypeScript type definitions
├── styles.css            # Global styles
│
├── components/
│   ├── NodeRenderer.tsx  # Routes resolved nodes to primitives
│   ├── Frame.tsx         # Frame wrapper with annotations panel
│   ├── FramesContainer.tsx
│   ├── AnnotationsPanel.tsx
│   │
│   ├── primitives/       # Renderable primitives
│   │   ├── Box.tsx
│   │   ├── Text.tsx
│   │   ├── Icon.tsx
│   │   ├── Cursor.tsx
│   │   ├── Chart.tsx
│   │   ├── Map.tsx
│   │   ├── Scatter3D/    # 3D primitives are folders
│   │   │   ├── index.tsx
│   │   │   ├── ScatterScene.tsx
│   │   │   ├── PointCloud.tsx
│   │   │   └── AxisIndicators.tsx
│   │   └── Globe3D/
│   │       ├── index.tsx         # Main: Canvas, WebGL slots, legend
│   │       ├── GlobeScene.tsx    # Scene composition
│   │       ├── GlobeMesh.tsx     # Wireframe lat/lon grid
│   │       ├── ContinentMesh.tsx # Terrain style: Earth continents
│   │       ├── TrajectoryLine.tsx
│   │       ├── VehicleMarker.tsx
│   │       └── CameraController.tsx
│   │
│   └── gallery/          # Component gallery (components.yaml view)
│       ├── ComponentGallery.tsx
│       ├── ComponentSection.tsx
│       └── VariantPreview.tsx
│
├── hooks/
│   ├── useInView.ts              # Viewport visibility detection
│   ├── useWebGLSlot.ts           # WebGL context pool management
│   └── useAnnotationNavigation.ts
│
├── contexts/
│   ├── FrameContext.tsx          # Frame change notifications
│   └── AnnotationContext.tsx
│
└── utils/
    └── resolveForGallery.ts
```

## Data Flow Pipeline

```
YAML Files                    Parser                      React Components
┌─────────────┐         ┌─────────────────┐         ┌──────────────────┐
│components.yaml│───────▶│ parseComponents │         │                  │
└─────────────┘         └────────┬────────┘         │                  │
                                 │                   │   NodeRenderer   │
┌─────────────┐         ┌────────▼────────┐         │        │         │
│wireframe.yaml│───────▶│ parseWireframe  │         │   ┌────▼────┐    │
└─────────────┘         └────────┬────────┘         │   │ Box     │    │
                                 │                   │   │ Text    │    │
                        ┌────────▼────────┐         │   │ Chart   │    │
                        │  resolveFrames  │────────▶│   │ Map     │    │
                        │                 │         │   │Scatter3D│    │
                        │ - Expand comps  │         │   │ ...     │    │
                        │ - Substitute {} │         │   └─────────┘    │
                        │ - Generate data │         │                  │
                        └─────────────────┘         └──────────────────┘
                               │
                               ▼
                        ResolvedNode[]
```

### 1. Parsing (`parser.ts`)

**`parseComponents(yaml)`** → `ComponentsFile`
- Parses components.yaml into component definitions with variants

**`parseWireframe(yaml)`** → `WireframeFile`
- Parses wireframe.yaml into frame definitions

**`resolveFrames(wireframe, components)`** → `ResolvedNode[]`
- Expands component instances into their variant definitions
- Substitutes `{{prop}}` templates with actual values
- Handles `$each` iteration and `$children` slots
- Generates data for Chart, Map, Scatter3D, Globe3D

### 2. Node Resolution

The `resolveNode()` function transforms `SpecNode` → `ResolvedNode`:

| Input (SpecNode) | Output (ResolvedNode) |
|------------------|----------------------|
| `{ Box: {...} }` | `{ type: 'box', props, children }` |
| `{ Text: {...} }` | `{ type: 'text', props }` |
| `{ Chart: {...} }` | `{ type: 'chart', props, series }` |
| `{ MyComponent: {...} }` | Expanded variant nodes |

**Data generation happens during resolution:**
- `Chart` → samples mathematical functions → `series: ChartSeries[]`
- `Map` → generates trajectory points → `trajectories: MapTrajectoryData[]`
- `Scatter3D` → generates 3D points → `series: Scatter3DSeriesData[]`
- `Globe3D` → generates lat/lon paths → `trajectories: Globe3DTrajectoryData[]`

### 3. Rendering (`NodeRenderer.tsx`)

Routes `ResolvedNode` to the appropriate React component:

```tsx
function NodeRenderer({ node }) {
  switch (node.type) {
    case 'box': return <Box {...node.props}>{children}</Box>
    case 'text': return <Text {...node.props} />
    case 'chart': return <Chart series={node.series} {...node.props} />
    case 'scatter3d': return <Scatter3D series={node.series} {...node.props} />
    // ...
  }
}
```

## Type System (`types.ts`)

### Node Types

**Spec nodes** (YAML input):
```typescript
interface BoxNode { Box: { layout?, gap?, padding?, children?, ... } }
interface ChartNode { Chart: { fn?, range?, samples?, ... } }
```

**Resolved nodes** (after parsing):
```typescript
type ResolvedNode =
  | { type: 'box'; props: BoxNode['Box']; children: ResolvedNode[] }
  | { type: 'chart'; props: ChartNode['Chart']; series: ChartSeries[] }
  // ...
```

### Adding a New Type

1. Define the node interface in `types.ts`:
```typescript
interface MyPrimitiveNode extends BaseNode {
  MyPrimitive: {
    width?: number
    height?: number
    // ... properties
  }
}
```

2. Add to `SpecNode` union:
```typescript
export type SpecNode = ... | MyPrimitiveNode | ...
```

3. Add resolved type to `ResolvedNode` union:
```typescript
export type ResolvedNode = ...
  | { type: 'myprimitive'; props: MyPrimitiveNode['MyPrimitive']; data: MyData }
```

## Adding a New Primitive

### Step 1: Types (`types.ts`)

```typescript
// Node definition (YAML input)
export interface NewPrimitiveNode extends BaseNode {
  NewPrimitive: {
    width?: number
    height?: number
    fn?: 'option1' | 'option2'
  }
}

// Generated data structure
export interface NewPrimitiveData {
  points: { x: number; y: number }[]
}

// Add to unions
export type SpecNode = ... | NewPrimitiveNode | ...
export type ResolvedNode = ...
  | { type: 'newprimitive'; props: NewPrimitiveNode['NewPrimitive']; data: NewPrimitiveData }
```

### Step 2: Parser (`parser.ts`)

```typescript
// Type guard
function isNewPrimitive(node: SpecNode): node is NewPrimitiveNode {
  return 'NewPrimitive' in node
}

// Data generation (if needed)
function generateNewPrimitiveData(fn: string): NewPrimitiveData {
  // Generate placeholder data based on fn type
  return { points: [...] }
}

// In resolveNode():
if (isNewPrimitive(node)) {
  const props = node.NewPrimitive
  return {
    type: 'newprimitive',
    props,
    data: generateNewPrimitiveData(props.fn || 'option1')
  }
}
```

### Step 3: Component (`components/primitives/NewPrimitive.tsx`)

```tsx
import type { NewPrimitiveData } from '../../types'

interface NewPrimitiveProps {
  width?: number
  height?: number
  data: NewPrimitiveData
}

export function NewPrimitive({ width = 400, height = 300, data }: NewPrimitiveProps) {
  return (
    <div style={{ width, height, border: '1px solid var(--border)' }}>
      {/* Render data */}
    </div>
  )
}
```

### Step 4: NodeRenderer (`components/NodeRenderer.tsx`)

```tsx
import { NewPrimitive } from './primitives/NewPrimitive'

// In NodeRenderer function:
if (node.type === 'newprimitive') {
  return (
    <NewPrimitive
      width={node.props.width}
      height={node.props.height}
      data={node.data}
    />
  )
}
```

### Step 5: Documentation (`CLAUDE.md`)

Add YAML syntax and examples to CLAUDE.md.

## Hooks

### `useInView`

Detects if an element is visible in the viewport. Uses polling (500ms) for reliability.

```tsx
const [ref, inView] = useInView<HTMLDivElement>()
return <div ref={ref}>{inView ? <Heavy /> : <Placeholder />}</div>
```

### `useWebGLSlot`

Manages a pool of WebGL contexts to stay within browser limits (typically 8-16).

```tsx
const { hasSlot, onContextCreated } = useWebGLSlot(inView)
const canRender = inView && hasSlot

return canRender ? (
  <Canvas onCreated={({ gl }) => {
    const ctx = gl.getContext()
    if (ctx) onContextCreated(ctx)
  }}>
    ...
  </Canvas>
) : <Placeholder />
```

**How it works:**
- Tracks `activeSlots` (mounted contexts) and `pendingReleases` (being cleaned up)
- Only grants new slots when `activeSlots + pendingReleases < MAX_CONTEXTS`
- Forces context cleanup with `WEBGL_lose_context` extension
- Each release is tracked individually for deterministic cleanup

### `useAnnotationNavigation`

Handles keyboard navigation between annotations (Shift+Up/Down).

## Component Resolution

### Props Substitution

`{{propName}}` in component definitions gets replaced with instance values:

```yaml
# Definition
Button:
  variants:
    default:
      - Box:
          children:
            - Text: { content: "{{label}}" }

# Usage
- Button: { label: "Save" }

# Resolved
- Box:
    children:
      - Text: { content: "Save" }
```

### `$each` Iteration

Renders arrays of items:

```yaml
# Definition
List:
  variants:
    default:
      - Box:
          children:
            $each: items
            $template:
              - Text: { content: "{{item.name}}" }

# Usage
- List:
    items:
      - { name: "Item 1" }
      - { name: "Item 2" }
```

### `$children` Slots

Allows arbitrary children:

```yaml
# Definition
Card:
  variants:
    default:
      - Box:
          children: $children

# Usage
- Card:
    children:
      - Text: { content: "Anything here" }
```

## Border Collapse

The `NodeRenderer` implements CSS-like border collapse for adjacent outlined boxes. The algorithm:

1. `hasLeadingOutline(node, direction)` - checks if node has outline on top/left
2. `hasTrailingOutline(node, direction)` - checks if node has outline on bottom/right
3. `computeChildContext()` - determines which borders to collapse based on siblings and parent

This prevents double borders when outlined boxes are adjacent.

## 3D Primitives Pattern

3D primitives (Scatter3D, Globe3D) follow this structure:

```
Scatter3D/                          Globe3D/
├── index.tsx        # Main         ├── index.tsx         # Main + legend
├── ScatterScene.tsx # Scene        ├── GlobeScene.tsx    # Scene
├── PointCloud.tsx   # Instanced    ├── GlobeMesh.tsx     # Wireframe sphere
└── AxisIndicators.tsx              ├── ContinentMesh.tsx # Terrain continents
                                    ├── TrajectoryLine.tsx
                                    ├── VehicleMarker.tsx
                                    └── CameraController.tsx
```

**Key patterns:**
- Use `useInView` + `useWebGLSlot` for virtualization
- Pass `onContextCreated` to Canvas for context tracking
- Use instanced rendering for many objects (InstancedMesh)
- Calculate zoom/size responsively based on container dimensions

### Globe3D Implementation Details

**Trajectory Functions** (`parser.ts`):
| Function | Description |
|----------|-------------|
| `greatCircle` | NYC → London arc (slerp interpolation) |
| `polar` | Over-the-pole route (LA → Moscow style) |
| `equatorial` | Equator-following path |
| `random` | Random waypoints with great circle interpolation |
| `circuit` | Closed loop returning to origin (organic shape) |
| `custom` | User-provided `[lat, lon][]` waypoints |

**Coordinate System**:
- `latLonToCartesian(lat, lon)` → unit sphere `{x, y, z}`
- `slerp(start, end, t)` → spherical linear interpolation for great circles
- Trajectories elevated slightly above sphere (radius 1.02) for visibility

**Flight Altitude Arc**:
```typescript
// Parabolic arc for flight paths (peaks at midpoint)
function calculateFlightElevation(t: number, altitude: number): number {
  const maxHeight = 0.4
  const parabola = 1 - 4 * Math.pow(t - 0.5, 2)
  return 1.0 + altitude * maxHeight * parabola
}
```

**Globe Styles**:
- `wireframe` (default): Lat/lon grid lines via `GlobeMesh.tsx`
- `terrain`: Earth-like continents via `ContinentMesh.tsx`

**ContinentMesh.tsx** (Terrain Style):
- Manually crafted simplified continent coordinates (~15-30 points each)
- 7 landmasses: North America, South America, Europe, Africa, Asia, Australia, Greenland
- Uses fan triangulation from centroid with concentric rings for smooth fill
- Edge subdivision (3x) for higher resolution mesh
- Slightly elevated above ocean sphere (radius 1.008)

**Tone Mapping Fix**:
React Three Fiber applies ACES filmic tone mapping by default, which darkens whites. Disabled with:
```tsx
<Canvas gl={{ preserveDrawingBuffer: true, toneMapping: 0 }}>
```

**Multi-Trajectory Support**:
```yaml
# Single trajectory (backward compatible)
Globe3D:
  trajectory:
    fn: greatCircle
  vehicle: 0.5

# Multiple trajectories with legend
Globe3D:
  trajectories:
    - fn: greatCircle
      altitude: 0.5
      vehicle: 0.4
      label: "NYC → London"
    - fn: circuit
      altitude: 0.4
      vehicle: 0.7
      label: "Regional"
```

**Camera Presets**:
- `overview`: Fixed position, auto-rotate, see entire globe
- `follow`: Camera follows vehicle position
- `side`: Perpendicular to trajectory plane
- `track`: Camera above vehicle, globe rotates underneath

## Hot Reload

`App.tsx` polls spec files every 500ms during development:

```typescript
useEffect(() => {
  const checkForChanges = async () => {
    const yaml = await fetch(`/specs/${specFile}?t=${Date.now()}`)
    if (yaml !== lastRef.current) {
      lastRef.current = yaml
      loadAndRender()
    }
  }
  const interval = setInterval(checkForChanges, 500)
  return () => clearInterval(interval)
}, [specFile])
```

## Testing

Run tests with:
```bash
npm test
```

Tests are in `*.test.ts` files alongside source files.
