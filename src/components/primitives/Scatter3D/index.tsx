import { Canvas } from '@react-three/fiber'
import { OrbitControls, OrthographicCamera } from '@react-three/drei'
import { ScatterScene } from './ScatterScene'
import { useInView } from '../../../hooks/useInView'
import { useWebGLSlot } from '../../../hooks/useWebGLSlot'
import type { Scatter3DSeriesData } from '../../../types'

const colorMap: Record<string, string> = {
  blue: 'hsl(210, 50%, 50%)',
  green: 'hsl(150, 40%, 45%)',
  orange: 'hsl(30, 60%, 50%)',
  purple: 'hsl(270, 40%, 55%)',
  red: 'hsl(0, 50%, 50%)',
  teal: 'hsl(180, 40%, 45%)'
}

interface Scatter3DProps {
  width?: number
  height?: number
  series: Scatter3DSeriesData[]
}

export function Scatter3D({
  width = 400,
  height = 300,
  series
}: Scatter3DProps) {
  const [containerRef, inView] = useInView<HTMLDivElement>()
  const { hasSlot, onContextCreated } = useWebGLSlot(inView)
  const canRender = inView && hasSlot
  const hasLabels = series.some(s => s.label)

  // Calculate zoom based on container size
  // Base zoom of 70 is calibrated for a 300px container
  const baseSize = 300
  const baseZoom = 70
  const minDimension = Math.min(width, height)
  const zoom = (minDimension / baseSize) * baseZoom

  // Scale point size inversely with zoom so points appear consistent on screen
  const basePointSize = 0.025
  const pointSize = basePointSize * (baseZoom / zoom)

  return (
    <div
      className="scatter3d"
      style={{
        width: `${width}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}
    >
      {/* 3D Canvas - lazy loaded when in view */}
      <div
        ref={containerRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          border: '1px solid var(--border)',
          background: '#fafafa'
        }}
      >
        {canRender ? (
          <Canvas
            orthographic
            gl={{ preserveDrawingBuffer: true }}
            onCreated={({ gl }) => {
              const ctx = gl.getContext()
              if (ctx) onContextCreated(ctx)
            }}
          >
            <OrthographicCamera makeDefault position={[3, 3, 3]} zoom={zoom} />
            <ScatterScene series={series} pointSize={pointSize} />
            <OrbitControls
              enablePan={false}
              enableZoom={false}
              autoRotate
              autoRotateSpeed={0.5}
            />
          </Canvas>
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--muted-foreground)',
            fontSize: '10px'
          }}>
            {inView ? '•••' : '···'}
          </div>
        )}
      </div>

      {/* Legend (matching Chart style) */}
      {hasLabels && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          paddingTop: '4px'
        }}>
          {series.filter(s => s.label).map((s, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              border: '1px solid var(--border)',
              fontSize: '10px',
              color: 'var(--muted-foreground)',
              background: 'white'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                background: colorMap[s.color] || colorMap.blue,
                borderRadius: '50%'
              }} />
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
