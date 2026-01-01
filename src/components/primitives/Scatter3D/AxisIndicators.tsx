import { Line } from '@react-three/drei'

export function AxisIndicators() {
  const size = 1.2
  const edgeColor = '#c0c0c0'
  const gridColor = '#e8e8e8'

  // Corner at (-size, -size, -size), extends to (+size, +size, +size)
  // We draw the back three faces (like MATLAB corner view)
  const min = -size
  const max = size

  return (
    <group>
      {/* Back wall (XY plane at z=min) */}
      <Line points={[[min, min, min], [max, min, min]]} color={edgeColor} lineWidth={1} />
      <Line points={[[min, min, min], [min, max, min]]} color={edgeColor} lineWidth={1} />
      <Line points={[[max, min, min], [max, max, min]]} color={edgeColor} lineWidth={1} />
      <Line points={[[min, max, min], [max, max, min]]} color={edgeColor} lineWidth={1} />

      {/* Left wall (YZ plane at x=min) */}
      <Line points={[[min, min, min], [min, min, max]]} color={edgeColor} lineWidth={1} />
      <Line points={[[min, max, min], [min, max, max]]} color={edgeColor} lineWidth={1} />
      <Line points={[[min, min, max], [min, max, max]]} color={edgeColor} lineWidth={1} />

      {/* Bottom wall (XZ plane at y=min) */}
      <Line points={[[max, min, min], [max, min, max]]} color={edgeColor} lineWidth={1} />
      <Line points={[[min, min, max], [max, min, max]]} color={edgeColor} lineWidth={1} />

      {/* Grid lines on back wall */}
      {[-0.6, 0, 0.6].map(v => (
        <group key={`back-${v}`}>
          <Line points={[[v, min, min], [v, max, min]]} color={gridColor} lineWidth={0.5} />
          <Line points={[[min, v, min], [max, v, min]]} color={gridColor} lineWidth={0.5} />
        </group>
      ))}

      {/* Grid lines on left wall */}
      {[-0.6, 0, 0.6].map(v => (
        <group key={`left-${v}`}>
          <Line points={[[min, v, min], [min, v, max]]} color={gridColor} lineWidth={0.5} />
          <Line points={[[min, min, v], [min, max, v]]} color={gridColor} lineWidth={0.5} />
        </group>
      ))}

      {/* Grid lines on bottom wall */}
      {[-0.6, 0, 0.6].map(v => (
        <group key={`bottom-${v}`}>
          <Line points={[[v, min, min], [v, min, max]]} color={gridColor} lineWidth={0.5} />
          <Line points={[[min, min, v], [max, min, v]]} color={gridColor} lineWidth={0.5} />
        </group>
      ))}
    </group>
  )
}
