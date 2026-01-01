import { createElement, useMemo } from 'react'
import { icons } from 'lucide'
import type { MapTrajectoryData, MapMarker } from '../../types'

// Simple seeded random for consistent terrain
function seededRandom(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

interface MapProps {
  width?: number
  height?: number
  trajectories: MapTrajectoryData[]
}

const trajectoryColors = [
  'hsl(210, 50%, 40%)',
  'hsl(150, 40%, 35%)',
  'hsl(30, 60%, 45%)',
  'hsl(270, 40%, 45%)',
  'hsl(0, 50%, 45%)',
  'hsl(180, 40%, 35%)'
]

function getPositionOnPath(points: [number, number][], t: number): { x: number; y: number; angle: number } {
  if (points.length < 2) return { x: 0, y: 0, angle: 0 }

  const totalSegments = points.length - 1
  const segmentFloat = t * totalSegments
  const segmentIndex = Math.min(Math.floor(segmentFloat), totalSegments - 1)
  const segmentT = segmentFloat - segmentIndex

  const p1 = points[segmentIndex]
  const p2 = points[Math.min(segmentIndex + 1, points.length - 1)]

  const x = p1[0] + (p2[0] - p1[0]) * segmentT
  const y = p1[1] + (p2[1] - p1[1]) * segmentT
  const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * (180 / Math.PI)

  return { x, y, angle }
}

// Generate terrain blobs with seeded random for consistency
function generateTerrainBlobs(width: number, height: number, random: () => number): string[] {
  const blobs: string[] = []
  for (let b = 0; b < 3; b++) {
    const cx = width * (0.2 + random() * 0.6)
    const cy = height * (0.2 + random() * 0.6)
    const baseRadius = Math.min(width, height) * (0.15 + random() * 0.2)

    const points = 12
    let blobPath = ''
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2
      const noise = 0.7 + random() * 0.6
      const r = baseRadius * noise
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      blobPath += (i === 0 ? 'M' : 'L') + `${x},${y} `
    }
    blobPath += 'Z'
    blobs.push(blobPath)
  }
  return blobs
}

export function Map({ width = 400, height = 300, trajectories }: MapProps) {
  const flagIconData = icons['Flag' as keyof typeof icons]

  // Memoize terrain blobs with seeded random for consistent rendering
  const terrainBlobs = useMemo(() => {
    const random = seededRandom(width * 1000 + height)
    return generateTerrainBlobs(width, height, random)
  }, [width, height])

  return (
    <div
      className="map"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: '#fafafa'
      }}
    >
      <svg width={width} height={height} style={{ display: 'block' }}>
        {/* Terrain */}
        <g fill="#f0f0f0" stroke="none">
          {terrainBlobs.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>

        {/* Trajectories */}
        {trajectories.map((traj, trajIndex) => {
          const points = traj.points
          const color = trajectoryColors[trajIndex % trajectoryColors.length]

          return (
            <g key={trajIndex}>
              {/* Path */}
              {points.length > 1 && (
                <path
                  d={points.map((p: [number, number], i: number) => (i === 0 ? 'M' : 'L') + `${p[0]},${p[1]}`).join(' ')}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Markers */}
              {(traj.markers || []).map((marker: MapMarker, markerIndex: number) => {
                let t: number
                if (marker.position === 'start') t = 0
                else if (marker.position === 'end') t = 1
                else t = marker.position

                const pos = getPositionOnPath(points, t)

                return (
                  <g key={markerIndex} transform={`translate(${pos.x - 12}, ${pos.y - 24})`}>
                    {flagIconData && (
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="hsl(0, 0%, 35%)"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {flagIconData.map((pathData, idx) => {
                          const [tagName, attrs] = pathData as [string, Record<string, string | number>]
                          return createElement(tagName, { key: idx, ...attrs })
                        })}
                      </svg>
                    )}
                    {marker.label && (
                      <>
                        <rect
                          x={26 - 3}
                          y={16 - 10 - 2}
                          width={marker.label.length * 6 + 6}
                          height={16}
                          fill="white"
                          rx={2}
                        />
                        <text
                          x={26}
                          y={16}
                          fontSize={10}
                          fontFamily="JetBrains Mono, monospace"
                          fill="hsl(0, 0%, 30%)"
                        >
                          {marker.label}
                        </text>
                      </>
                    )}
                  </g>
                )
              })}

              {/* Vehicle */}
              {traj.vehicle !== undefined && points.length > 1 && (() => {
                const vehiclePos = getPositionOnPath(points, traj.vehicle)
                return (
                  <g transform={`translate(${vehiclePos.x}, ${vehiclePos.y}) rotate(${vehiclePos.angle})`}>
                    <polygon
                      points="12,0 -8,-8 -8,8"
                      fill="hsl(0, 0%, 20%)"
                      stroke="white"
                      strokeWidth={1.5}
                      strokeLinejoin="round"
                    />
                  </g>
                )
              })()}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
