import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Globe3DCameraPreset, Globe3DPoint } from '../../../types'

interface CameraControllerProps {
  preset: Globe3DCameraPreset
  points: Globe3DPoint[]
  vehiclePosition?: number
}

// Base elevation to keep above globe surface
const BASE_ELEVATION = 1.02

export function CameraController({ preset, points, vehiclePosition = 0.5 }: CameraControllerProps) {
  const { camera } = useThree()
  const targetRef = useRef(new THREE.Vector3())

  useFrame(() => {
    if (preset === 'overview' || points.length < 2) return

    // Calculate vehicle position on trajectory
    const totalSegments = points.length - 1
    const exactIndex = vehiclePosition * totalSegments
    const segmentIndex = Math.min(Math.floor(exactIndex), totalSegments - 1)
    const t = exactIndex - segmentIndex

    const p1 = points[segmentIndex]
    const p2 = points[Math.min(segmentIndex + 1, points.length - 1)]

    // Interpolate elevation between points
    const elevation = BASE_ELEVATION * (p1.elevation + (p2.elevation - p1.elevation) * t)

    // Interpolate position
    const vehiclePos = new THREE.Vector3(
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

    // Radial direction (outward from center)
    const radial = vehiclePos.clone().normalize()

    // Tangent direction (perpendicular to radial, along trajectory)
    const tangent = direction.clone().sub(radial.clone().multiplyScalar(direction.dot(radial))).normalize()

    // Right vector (perpendicular to both radial and tangent)
    const right = new THREE.Vector3().crossVectors(radial, tangent).normalize()

    let cameraPos: THREE.Vector3
    let lookAt: THREE.Vector3

    switch (preset) {
      case 'follow':
        // Camera behind and above vehicle
        cameraPos = vehiclePos.clone()
          .add(tangent.clone().multiplyScalar(-0.8)) // Behind
          .add(radial.clone().multiplyScalar(0.5))   // Above
        lookAt = vehiclePos.clone().add(tangent.clone().multiplyScalar(0.5))
        break

      case 'side':
        // Camera to the side of the trajectory
        cameraPos = vehiclePos.clone()
          .add(right.clone().multiplyScalar(2.5))
        lookAt = vehiclePos
        break

      case 'track':
        // Camera looking down from above
        cameraPos = radial.clone().multiplyScalar(2.5)
        lookAt = vehiclePos
        break

      default:
        return
    }

    // Smoothly interpolate camera position
    camera.position.lerp(cameraPos, 0.05)
    targetRef.current.lerp(lookAt, 0.05)
    camera.lookAt(targetRef.current)
  })

  return null
}
