# Globe3D Implementation Plan

## Goal

Create a 3D geographic globe primitive that shows flight paths, vehicle tracking, and satellite trajectories. Visual style should match the existing 2D Map primitive but rendered on a 3D sphere. Technical implementation follows the Scatter3D pattern (WebGL context management, lazy loading).

## What Already Exists

### Types (src/types.ts:210-254)
- `Globe3DTrajectoryFn`: `'greatCircle' | 'polar' | 'equatorial' | 'random' | 'custom'`
- `Globe3DCameraPreset`: `'follow' | 'side' | 'track' | 'overview'`
- `Globe3DMarker`: `{ position: number | 'start' | 'end', label?: string }`
- `Globe3DNode`: Full node definition with width, height, trajectory, vehicle, markers, camera, rotation
- `Globe3DPoint`: `{ lat, lon, x, y, z }` - lat/lon + cartesian coords
- `Globe3DTrajectoryData`: Resolved trajectory data

### Parser (src/parser.ts:224-350)
- `latLonToCartesian()`: Convert lat/lon to unit sphere coords
- `slerp()`: Spherical linear interpolation for great circle paths
- `generateGlobeTrajectory()`: Generate points for all trajectory functions
  - `greatCircle`: NYC → London arc (30 samples)
  - `polar`: North pole orbit
  - `equatorial`: Equator circuit
  - `random`: Random waypoints with great circle interpolation
  - `custom`: User-provided waypoints

### What's Missing
- React component: `src/components/primitives/Globe3D/`
- NodeRenderer integration
- Wireframe examples

---

## Component Architecture

Following the Scatter3D pattern:

```
src/components/primitives/Globe3D/
├── index.tsx        # Main component: Canvas, visibility, WebGL slots, legend
├── GlobeScene.tsx   # Scene setup: lights, controls, camera
├── GlobeMesh.tsx    # Wireframe sphere (lat/lon grid, no continents for MVP)
├── TrajectoryLine.tsx  # 3D path on globe surface
└── VehicleMarker.tsx   # 3D cone vehicle + flag markers
```

---

## Visual Design

### Globe Sphere (GlobeMesh.tsx)
- **Wireframe sphere** - simple lat/lon grid lines (no textures)
- **Color**: Light grey lines (`hsl(0, 0%, 85%)`) on white/off-white background
- **Grid density**: 12 longitude lines, 6 latitude lines (every 30°)
- **Radius**: 1.0 unit sphere
- **No continents for MVP** - can add later

### Trajectory Lines (TrajectoryLine.tsx)
- **Match 2D Map style**:
  - Line width: 2px equivalent (use `<Line>` from drei with lineWidth)
  - Colors: Same HSL palette as 2D Map
    - Blue: `hsl(210, 50%, 40%)`
    - Green: `hsl(150, 40%, 35%)`
    - Orange: `hsl(30, 60%, 45%)`
    - Purple: `hsl(270, 40%, 45%)`
    - Red: `hsl(0, 50%, 45%)`
    - Teal: `hsl(180, 40%, 35%)`
  - Rounded line caps/joins
- **Rendering**: Points connected along sphere surface (slightly elevated: radius 1.01)
- **Multi-trajectory**: Support multiple trajectories with color cycling

### Vehicle (VehicleMarker.tsx)
- **3D cone geometry** oriented along trajectory
- **Dark grey fill**: `hsl(0, 0%, 20%)`
- **Oriented tangent** to sphere surface, pointing in direction of travel

### Markers (Flag icons)
- **Position**: At waypoints on trajectory
- **Style**: Small flag icon or pin (simplified 3D or billboard)
- **Labels**: Text sprites with white background (like 2D Map)

---

## Camera Presets

### `overview` (default)
- Fixed position looking at globe from distance
- Auto-rotate slowly (like Scatter3D)
- See entire globe

### `follow`
- Camera follows vehicle position
- Offset behind and above vehicle
- Globe rotates as vehicle moves

### `side`
- Camera positioned perpendicular to trajectory plane
- Good for polar/equatorial routes

### `track`
- Camera looks down at vehicle from above
- Globe rotates under fixed camera

---

## Technical Implementation

### WebGL Management (same as Scatter3D)
```tsx
const [containerRef, inView] = useInView<HTMLDivElement>()
const { hasSlot, onContextCreated } = useWebGLSlot(inView)
const canRender = inView && hasSlot
```

### Canvas Configuration
```tsx
<Canvas
  gl={{ preserveDrawingBuffer: true }}
  onCreated={({ gl }) => {
    const ctx = gl.getContext()
    if (ctx) onContextCreated(ctx)
  }}
>
  <PerspectiveCamera makeDefault position={[0, 0, 3]} />
  ...
</Canvas>
```

**Decision**: Use **perspective camera** for globe (more natural 3D appearance), unlike Scatter3D which uses orthographic.

### OrbitControls
```tsx
<OrbitControls
  enablePan={false}
  enableZoom={false}
  autoRotate={camera === 'overview'}
  autoRotateSpeed={0.3}
/>
```

---

## Implementation Steps

### Step 1: Create Globe3D directory and index.tsx
- Copy Scatter3D pattern for lazy loading, WebGL slots
- Placeholder content initially
- Wire up to NodeRenderer

### Step 2: Create GlobeMesh.tsx
- Wireframe sphere with lat/lon grid
- Simple aesthetic, no textures

### Step 3: Create TrajectoryLine.tsx
- Render trajectory points as 3D line
- Use drei `<Line>` component
- Match 2D Map colors

### Step 4: Create VehicleMarker.tsx
- 3D cone vehicle at position along path
- Oriented in direction of travel

### Step 5: Create GlobeScene.tsx
- Compose all elements
- Add lighting (ambient + directional)
- Add OrbitControls

### Step 6: Implement camera presets
- `overview`: default auto-rotate
- `follow`/`side`/`track`: animated camera positions

### Step 7: Add markers with labels
- Flag icons at waypoints
- Text labels with backgrounds

### Step 8: Add wireframe example
- New frame in wireframe.yaml showcasing Globe3D
- Multiple trajectory types

### Step 9: Update documentation
- Add Globe3D to CLAUDE.md
- Add to ARCHITECTURE.md

---

## Files to Create/Modify

### Create
- `src/components/primitives/Globe3D/index.tsx`
- `src/components/primitives/Globe3D/GlobeScene.tsx`
- `src/components/primitives/Globe3D/GlobeMesh.tsx`
- `src/components/primitives/Globe3D/TrajectoryLine.tsx`
- `src/components/primitives/Globe3D/VehicleMarker.tsx`

### Modify
- `src/components/NodeRenderer.tsx` - Add Globe3D case
- `specs/wireframe.yaml` - Add Globe3D showcase frame
- `CLAUDE.md` - Add Globe3D documentation
- `ARCHITECTURE.md` - Reference Globe3D

---

## Decisions Made

1. **Continents**: Skip for MVP - just lat/lon grid lines. Can add later.
2. **Camera**: Perspective (more natural 3D globe appearance)
3. **Vehicle style**: 3D cone geometry oriented along trajectory
4. **Multi-trajectory**: Yes, support multiple trajectories with color cycling (like 2D Map)
