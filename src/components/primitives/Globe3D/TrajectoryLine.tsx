import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import type { Globe3DPoint } from '../../../types'

interface TrajectoryLineProps {
  points: Globe3DPoint[]
  color: string
}

// Base elevation to keep trajectory above globe surface
const BASE_ELEVATION = 1.02

export function TrajectoryLine({ points, color }: TrajectoryLineProps) {
  const linePoints = useMemo(() => {
    return points.map(p => {
      // Combine base elevation with per-point altitude
      const elevation = BASE_ELEVATION * p.elevation
      return new THREE.Vector3(
        p.x * elevation,
        p.y * elevation,
        p.z * elevation
      )
    })
  }, [points])

  if (points.length < 2) return null

  return (
    <Line
      points={linePoints}
      color={color}
      lineWidth={2}
    />
  )
}
