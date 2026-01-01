# Globe3D Implementation

## Status: Complete

This document describes the Globe3D primitive implementation for 3D geographic visualization.

## Overview

Globe3D renders flight paths, vehicle tracking, and satellite trajectories on a 3D sphere. It follows the Scatter3D pattern for WebGL context management and lazy loading.

## Component Architecture

```
src/components/primitives/Globe3D/
├── index.tsx           # Main: Canvas, WebGL slots, legend for multi-trajectory
├── GlobeScene.tsx      # Scene: lights, controls, style switching
├── GlobeMesh.tsx       # Wireframe sphere (lat/lon grid)
├── ContinentMesh.tsx   # Terrain style: Earth-like continents
├── TrajectoryLine.tsx  # 3D flight path on globe surface
├── VehicleMarker.tsx   # 3D cone vehicle marker
└── CameraController.tsx # Camera preset implementations
```

## Globe Styles

### Wireframe (default)
- `GlobeMesh.tsx`: Lat/lon grid lines
- Light grey lines on off-white background
- 12 longitude lines, 6 latitude lines (every 30°)

### Terrain
- `ContinentMesh.tsx`: Simplified Earth continent shapes
- 7 landmasses with ~15-30 coordinate points each:
  - North America (includes Alaska, Canada, USA, Mexico, Central America)
  - South America
  - Europe (merged with western Russia)
  - Africa
  - Asia (Russia, India, Southeast Asia)
  - Australia
  - Greenland
- Rendering approach:
  - Fan triangulation from polygon centroid
  - 6 concentric rings for smooth mesh fill
  - 3x edge subdivision for higher resolution
  - Elevated slightly above ocean (radius 1.008)
- Colors: Land `#e5e5e5`, Ocean `#efefef`

## Trajectory Functions

| Function | Description |
|----------|-------------|
| `greatCircle` | NYC → London arc using spherical interpolation |
| `polar` | Over-the-pole route (LA → Moscow style) |
| `equatorial` | Equator-following path with slight wobble |
| `random` | 5-8 random waypoints with great circle interpolation |
| `circuit` | Closed loop returning to origin (organic elliptical shape) |
| `custom` | User-provided `[lat, lon][]` waypoints |

### Flight Altitude

Trajectories support an `altitude` parameter (0-1) that creates a parabolic arc above the sphere surface, simulating flight paths that peak at the midpoint.

```typescript
// Parabola: peaks at t=0.5, surface at t=0 and t=1
const parabola = 1 - 4 * Math.pow(t - 0.5, 2)
elevation = 1.0 + altitude * 0.4 * parabola
```

## Multi-Trajectory Support

Globe3D supports multiple trajectories on a single globe:

```yaml
Globe3D:
  trajectories:
    - fn: greatCircle
      altitude: 0.5
      vehicle: 0.4
      label: "NYC → London"
    - fn: circuit
      altitude: 0.4
      vehicle: 0.7
      label: "Regional Route"
```

- Each trajectory can have its own function, altitude, vehicle position, and label
- Colors auto-cycle through the palette (blue, green, orange, purple, red, teal)
- Legend appears automatically when multiple trajectories are present
- Backward compatible: single `trajectory` prop still works

## Camera Presets

| Preset | Behavior |
|--------|----------|
| `overview` | Fixed position, auto-rotate at 0.3 speed, see entire globe |
| `follow` | Camera follows vehicle, offset behind and above |
| `side` | Perpendicular to trajectory plane |
| `track` | Camera above vehicle, globe rotates underneath |

## Technical Details

### Coordinate System
- `latLonToCartesian(lat, lon)` → unit sphere `{x, y, z}`
- `slerp(start, end, t)` → spherical linear interpolation for great circles
- Trajectories elevated at base radius 1.02 for visibility

### WebGL Management
Same pattern as Scatter3D:
```tsx
const [containerRef, inView] = useInView<HTMLDivElement>()
const { hasSlot, onContextCreated } = useWebGLSlot(inView)
const canRender = inView && hasSlot
```

### Tone Mapping Fix
R3F applies ACES filmic tone mapping by default, darkening light colors. Disabled:
```tsx
<Canvas gl={{ preserveDrawingBuffer: true, toneMapping: 0 }}>
```

### Vehicle Marker
- 3D cone geometry oriented along trajectory tangent
- Dark grey fill, points in direction of travel
- Position controlled by `vehicle` prop (0-1 along path)

## YAML Syntax

```yaml
# Basic usage
Globe3D:
  width: 400
  height: 300
  trajectory:
    fn: greatCircle
    altitude: 0.5
  vehicle: 0.4
  camera: overview
  style: terrain

# Multiple trajectories
Globe3D:
  trajectories:
    - fn: greatCircle
      altitude: 0.5
      vehicle: 0.4
      label: "Flight A"
    - fn: circuit
      altitude: 0.3
      label: "Route B"

# Custom waypoints
Globe3D:
  trajectory:
    waypoints:
      - [40.7, -74.0]   # NYC
      - [48.8, 2.3]     # Paris
      - [51.5, -0.1]    # London
    altitude: 0.6
  vehicle: 0.5
```

## Files Modified

### Created
- `src/components/primitives/Globe3D/index.tsx`
- `src/components/primitives/Globe3D/GlobeScene.tsx`
- `src/components/primitives/Globe3D/GlobeMesh.tsx`
- `src/components/primitives/Globe3D/ContinentMesh.tsx`
- `src/components/primitives/Globe3D/TrajectoryLine.tsx`
- `src/components/primitives/Globe3D/VehicleMarker.tsx`
- `src/components/primitives/Globe3D/CameraController.tsx`
- `specs/globe3d-stress-test.yaml`

### Modified
- `src/types.ts` - Added Globe3D types, trajectory functions, style type
- `src/parser.ts` - Added trajectory generation functions
- `src/components/NodeRenderer.tsx` - Added Globe3D routing
- `CLAUDE.md` - Documented Globe3D syntax
- `ARCHITECTURE.md` - Added Globe3D architecture details

## Stress Test Frames

`specs/globe3d-stress-test.yaml` includes:
- **MultiTrajectory**: Multiple routes on single globe with legend
- **CircuitTrajectories**: Closed-loop circuit paths
- **Globe3DAnnotations**: Annotation highlighting test
- **TrajectoryFunctions**: All trajectory function types
- **GlobeStyles**: Wireframe vs terrain comparison
- **TerrainFlights**: Flight routes on terrain globe
- **CameraPresets**: All camera angle options
- **VehiclePositions**: Vehicle at different path positions
- **FlightAltitude**: Altitude arc variations
- **SizeVariations**: Different globe sizes
- **PathOnly**: Trajectories without vehicles
- **DashboardContext**: Globe in realistic dashboard layout

## Design Decisions

1. **Terrain approach**: Embedded simplified coordinates vs external GeoJSON. Chose embedded for zero dependencies and lofi aesthetic.

2. **Continent rendering**: Fan triangulation from centroid with concentric rings. Avoids need for Delaunator or other triangulation libraries.

3. **Camera**: Perspective (natural 3D appearance) vs orthographic (used by Scatter3D).

4. **Colors**: meshBasicMaterial (unlit) + disabled tone mapping for accurate color reproduction.

5. **Multi-trajectory**: Array-based like 2D Map, with auto-legend when multiple present.
