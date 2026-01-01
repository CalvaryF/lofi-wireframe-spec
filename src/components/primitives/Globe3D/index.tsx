import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera, OrbitControls } from '@react-three/drei'
import { GlobeScene } from './GlobeScene'
import { useInView } from '../../../hooks/useInView'
import { useWebGLSlot } from '../../../hooks/useWebGLSlot'
import type { Globe3DTrajectoryData, Globe3DCameraPreset } from '../../../types'

const colorMap: Record<string, string> = {
  blue: 'hsl(210, 50%, 40%)',
  green: 'hsl(150, 40%, 35%)',
  orange: 'hsl(30, 60%, 45%)',
  purple: 'hsl(270, 40%, 45%)',
  red: 'hsl(0, 50%, 45%)',
  teal: 'hsl(180, 40%, 35%)'
}

const trajectoryColors = Object.values(colorMap)

interface Globe3DProps {
  width?: number
  height?: number
  trajectories: Globe3DTrajectoryData[]
  camera?: Globe3DCameraPreset
}

export function Globe3D({
  width = 400,
  height = 300,
  trajectories,
  camera = 'overview'
}: Globe3DProps) {
  const [containerRef, inView] = useInView<HTMLDivElement>()
  const { hasSlot, onContextCreated } = useWebGLSlot(inView)
  const canRender = inView && hasSlot

  // Calculate camera distance based on container size
  const minDimension = Math.min(width, height)
  const baseDist = 2.8
  const cameraDistance = baseDist * (300 / minDimension) * (minDimension / 300)

  return (
    <div
      className="globe3d"
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
            gl={{ preserveDrawingBuffer: true }}
            onCreated={({ gl }) => {
              const ctx = gl.getContext()
              if (ctx) onContextCreated(ctx)
            }}
          >
            <PerspectiveCamera makeDefault position={[0, 0, cameraDistance]} fov={50} />
            <GlobeScene
              trajectories={trajectories}
              colors={trajectoryColors}
              camera={camera}
            />
            <OrbitControls
              enablePan={false}
              enableZoom={false}
              autoRotate={camera === 'overview'}
              autoRotateSpeed={0.3}
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

      {/* Legend for multi-trajectory */}
      {trajectories.length > 1 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          paddingTop: '4px'
        }}>
          {trajectories.map((traj, i) => {
            const label = traj.label || `Route ${i + 1}`
            const color = trajectoryColors[i % trajectoryColors.length]
            return (
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
                  width: '12px',
                  height: '2px',
                  background: color
                }} />
                <span>{label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
