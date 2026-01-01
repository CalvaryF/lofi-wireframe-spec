import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Globe3DPoint } from '../../../types'

interface VehicleMarkerProps {
  points: Globe3DPoint[]
  position: number // 0-1 along trajectory
  color?: string
}

// Base elevation to keep above globe surface
const BASE_ELEVATION = 1.02

export function VehicleMarker({
  points,
  position,
  color = 'hsl(0, 0%, 20%)'
}: VehicleMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  // Calculate position and direction along path
  const { pos, direction } = useMemo(() => {
    if (points.length < 2) {
      return {
        pos: new THREE.Vector3(0, BASE_ELEVATION, 0),
        direction: new THREE.Vector3(1, 0, 0)
      }
    }

    // Find the segment and interpolate
    const totalSegments = points.length - 1
    const exactIndex = position * totalSegments
    const segmentIndex = Math.min(Math.floor(exactIndex), totalSegments - 1)
    const t = exactIndex - segmentIndex

    const p1 = points[segmentIndex]
    const p2 = points[Math.min(segmentIndex + 1, points.length - 1)]

    // Interpolate elevation between points
    const elevation = BASE_ELEVATION * (p1.elevation + (p2.elevation - p1.elevation) * t)

    // Interpolate position
    const pos = new THREE.Vector3(
      (p1.x + (p2.x - p1.x) * t) * elevation,
      (p1.y + (p2.y - p1.y) * t) * elevation,
      (p1.z + (p2.z - p1.z) * t) * elevation
    )

    // Direction along trajectory
    const direction = new THREE.Vector3(
      p2.x - p1.x,
      p2.y - p1.y,
      p2.z - p1.z
    ).normalize()

    return { pos, direction }
  }, [points, position])

  // Orient cone to point along trajectory and stand on sphere surface
  useFrame(() => {
    if (!meshRef.current) return

    // Radial direction (outward from center)
    const radial = pos.clone().normalize()

    // Make direction tangent to sphere surface
    const tangent = direction.clone()
      .sub(radial.clone().multiplyScalar(direction.dot(radial)))
      .normalize()

    // Cone geometry is centered at origin with height 0.08
    // Offset position so base of cone sits on trajectory (move forward by half height)
    const coneHeight = 0.08
    const offsetPos = pos.clone().add(tangent.clone().multiplyScalar(coneHeight / 2))
    meshRef.current.position.copy(offsetPos)

    // Cone geometry points along +Y by default (tip at top)
    // We want the tip to point in the direction of travel (tangent)
    // Use quaternion to rotate from default +Y to tangent direction
    const defaultDir = new THREE.Vector3(0, 1, 0)
    meshRef.current.quaternion.setFromUnitVectors(defaultDir, tangent)
  })

  return (
    <mesh ref={meshRef}>
      <coneGeometry args={[0.03, 0.08, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}
