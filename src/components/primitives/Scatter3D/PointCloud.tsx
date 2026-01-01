import { useRef, useLayoutEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Scatter3DPoint } from '../../../types'

// Colors matched to Chart.tsx palette (converted to hex for Three.js)
const colorMap: Record<string, string> = {
  blue: '#4080bf',    // hsl(210, 50%, 50%)
  green: '#458060',   // hsl(150, 40%, 45%)
  orange: '#cc8033',  // hsl(30, 60%, 50%)
  purple: '#8866aa',  // hsl(270, 40%, 55%)
  red: '#bf4040',     // hsl(0, 50%, 50%)
  teal: '#458073'     // hsl(180, 40%, 45%)
}

interface PointCloudProps {
  points: Scatter3DPoint[]
  color: string
  pointSize: number
}

export function PointCloud({ points, color, pointSize }: PointCloudProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const initialized = useRef(false)

  // Update instance matrices
  const updateMatrices = () => {
    if (!meshRef.current) return false

    points.forEach((point, i) => {
      dummy.position.set(point.x, point.y, point.z)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
    return true
  }

  // Try to initialize on mount
  useLayoutEffect(() => {
    initialized.current = updateMatrices()
  }, [points, dummy])

  // Fallback: update on first frame if not yet initialized
  useFrame(() => {
    if (!initialized.current) {
      initialized.current = updateMatrices()
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, points.length]}>
      <sphereGeometry args={[pointSize, 8, 8]} />
      <meshBasicMaterial color={colorMap[color] || colorMap.blue} />
    </instancedMesh>
  )
}
