import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

const GRID_COLOR = '#d4d4d4' // Light grey
const RADIUS = 1.0

// Number of lines in each direction
const LAT_LINES = 6   // Every 30 degrees
const LON_LINES = 12  // Every 30 degrees

export function GlobeMesh() {
  // Generate latitude lines (horizontal circles at different heights)
  const latLines = useMemo(() => {
    const lines: THREE.Vector3[][] = []

    for (let i = 1; i < LAT_LINES; i++) {
      const lat = (i / LAT_LINES) * Math.PI - Math.PI / 2 // -90 to 90
      const y = Math.sin(lat) * RADIUS
      const r = Math.cos(lat) * RADIUS

      const points: THREE.Vector3[] = []
      const segments = 48
      for (let j = 0; j <= segments; j++) {
        const lon = (j / segments) * Math.PI * 2
        const x = Math.cos(lon) * r
        const z = Math.sin(lon) * r
        points.push(new THREE.Vector3(x, y, z))
      }
      lines.push(points)
    }

    return lines
  }, [])

  // Generate longitude lines (vertical semicircles)
  const lonLines = useMemo(() => {
    const lines: THREE.Vector3[][] = []

    for (let i = 0; i < LON_LINES; i++) {
      const lon = (i / LON_LINES) * Math.PI * 2

      const points: THREE.Vector3[] = []
      const segments = 24
      for (let j = 0; j <= segments; j++) {
        const lat = (j / segments) * Math.PI - Math.PI / 2 // -90 to 90
        const y = Math.sin(lat) * RADIUS
        const r = Math.cos(lat) * RADIUS
        const x = Math.cos(lon) * r
        const z = Math.sin(lon) * r
        points.push(new THREE.Vector3(x, y, z))
      }
      lines.push(points)
    }

    return lines
  }, [])

  return (
    <group>
      {/* Latitude lines */}
      {latLines.map((points, i) => (
        <Line
          key={`lat-${i}`}
          points={points}
          color={GRID_COLOR}
          lineWidth={1}
        />
      ))}

      {/* Longitude lines */}
      {lonLines.map((points, i) => (
        <Line
          key={`lon-${i}`}
          points={points}
          color={GRID_COLOR}
          lineWidth={1}
        />
      ))}

      {/* Equator - slightly thicker */}
      <Line
        points={(() => {
          const points: THREE.Vector3[] = []
          const segments = 48
          for (let j = 0; j <= segments; j++) {
            const lon = (j / segments) * Math.PI * 2
            points.push(new THREE.Vector3(Math.cos(lon) * RADIUS, 0, Math.sin(lon) * RADIUS))
          }
          return points
        })()}
        color={GRID_COLOR}
        lineWidth={1.5}
      />
    </group>
  )
}
