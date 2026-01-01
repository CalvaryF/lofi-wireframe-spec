import { useMemo } from 'react'
import * as THREE from 'three'

const BLOB_COLOR = '#c8c8c8' // Medium grey for terrain
const RADIUS = 1.0

// Continent-like blob definitions (roughly positioned like real continents)
const CONTINENT_CONFIGS = [
  { lat: 45, lon: -100, radiusLat: 35, radiusLon: 50 },   // North America
  { lat: -15, lon: -60, radiusLat: 40, radiusLon: 30 },   // South America
  { lat: 50, lon: 10, radiusLat: 25, radiusLon: 40 },     // Europe
  { lat: 5, lon: 20, radiusLat: 45, radiusLon: 35 },      // Africa
  { lat: 50, lon: 100, radiusLat: 40, radiusLon: 60 },    // Asia
  { lat: -25, lon: 135, radiusLat: 25, radiusLon: 30 },   // Australia
]

// Simple seeded random for consistent terrain
function seededRandom(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

// Convert lat/lon to 3D position on sphere
function latLonToPosition(lat: number, lon: number, radius: number = RADIUS): THREE.Vector3 {
  const latRad = (lat * Math.PI) / 180
  const lonRad = (lon * Math.PI) / 180
  return new THREE.Vector3(
    Math.cos(latRad) * Math.cos(lonRad) * radius,
    Math.sin(latRad) * radius,
    Math.cos(latRad) * Math.sin(lonRad) * radius
  )
}

// Generate a continent-like blob as mesh geometry with higher resolution
function generateContinentGeometry(
  centerLat: number,
  centerLon: number,
  radiusLat: number,
  radiusLon: number,
  random: () => number
): THREE.BufferGeometry {
  const numEdgePoints = 48 // High resolution edge
  const numRings = 8 // Concentric rings for smoother fill
  const vertices: number[] = []
  const indices: number[] = []

  // Center point
  const center = latLonToPosition(centerLat, centerLon, RADIUS * 1.002)
  vertices.push(center.x, center.y, center.z)

  // Pre-generate edge noise values for consistency
  const edgeNoise: number[] = []
  for (let i = 0; i < numEdgePoints; i++) {
    edgeNoise.push(0.5 + random() * 0.7)
  }

  // Generate concentric rings from center to edge
  for (let ring = 1; ring <= numRings; ring++) {
    const ringFactor = ring / numRings

    for (let i = 0; i < numEdgePoints; i++) {
      const angle = (i / numEdgePoints) * Math.PI * 2
      const noise = edgeNoise[i]

      // Interpolate noise - less noise near center, full noise at edge
      const effectiveNoise = 1 - (1 - noise) * ringFactor

      // Elliptical shape with noise
      const latOffset = radiusLat * Math.sin(angle) * effectiveNoise * ringFactor
      const lonOffset = radiusLon * Math.cos(angle) * effectiveNoise * ringFactor / Math.max(0.3, Math.cos((centerLat * Math.PI) / 180))

      const pos = latLonToPosition(
        centerLat + latOffset,
        centerLon + lonOffset,
        RADIUS * 1.002
      )
      vertices.push(pos.x, pos.y, pos.z)
    }
  }

  // Create triangles - center to first ring
  for (let i = 0; i < numEdgePoints; i++) {
    const next = (i + 1) % numEdgePoints
    indices.push(0, i + 1, next + 1)
  }

  // Create triangles between rings
  for (let ring = 0; ring < numRings - 1; ring++) {
    const ringStart = 1 + ring * numEdgePoints
    const nextRingStart = 1 + (ring + 1) * numEdgePoints

    for (let i = 0; i < numEdgePoints; i++) {
      const next = (i + 1) % numEdgePoints
      // Two triangles per quad
      indices.push(ringStart + i, nextRingStart + i, nextRingStart + next)
      indices.push(ringStart + i, nextRingStart + next, ringStart + next)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  return geometry
}

interface TerrainBlobsProps {
  seed?: number
}

export function TerrainBlobs({ seed = 42 }: TerrainBlobsProps) {
  const blobs = useMemo(() => {
    const random = seededRandom(seed)

    return CONTINENT_CONFIGS.map(config =>
      generateContinentGeometry(
        config.lat + (random() - 0.5) * 10,  // Slight position variation
        config.lon + (random() - 0.5) * 15,
        config.radiusLat * (0.8 + random() * 0.4),
        config.radiusLon * (0.8 + random() * 0.4),
        random
      )
    )
  }, [seed])

  return (
    <group>
      {/* Base sphere - semi-transparent so tracks show through */}
      <mesh>
        <sphereGeometry args={[RADIUS, 32, 24]} />
        <meshBasicMaterial color="#f5f5f5" transparent opacity={0.85} />
      </mesh>

      {/* Continent blobs - also transparent */}
      {blobs.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshBasicMaterial color={BLOB_COLOR} side={THREE.DoubleSide} transparent opacity={0.85} />
        </mesh>
      ))}

      {/* Subtle outline sphere */}
      <mesh>
        <sphereGeometry args={[RADIUS * 0.998, 32, 24]} />
        <meshBasicMaterial color="#d8d8d8" wireframe transparent opacity={0.4} />
      </mesh>
    </group>
  )
}
