import { GlobeMesh } from './GlobeMesh'
import { TrajectoryLine } from './TrajectoryLine'
import { VehicleMarker } from './VehicleMarker'
import { CameraController } from './CameraController'
import type { Globe3DTrajectoryData, Globe3DCameraPreset } from '../../../types'

interface GlobeSceneProps {
  trajectories: Globe3DTrajectoryData[]
  colors: string[]
  camera: Globe3DCameraPreset
}

export function GlobeScene({ trajectories, colors, camera }: GlobeSceneProps) {
  // Get first trajectory with a vehicle for camera tracking
  const trackingTraj = trajectories.find(t => t.vehicle !== undefined && t.points.length > 0)

  return (
    <>
      {/* Ambient light for even illumination */}
      <ambientLight intensity={0.9} />

      {/* Camera controller for non-overview modes */}
      {camera !== 'overview' && trackingTraj && (
        <CameraController
          preset={camera}
          points={trackingTraj.points}
          vehiclePosition={trackingTraj.vehicle}
        />
      )}

      {/* Globe wireframe */}
      <GlobeMesh />

      {/* Trajectories and vehicles */}
      {trajectories.map((traj, index) => {
        const color = colors[index % colors.length]
        return (
          <group key={index}>
            <TrajectoryLine
              points={traj.points}
              color={color}
            />
            {traj.vehicle !== undefined && traj.points.length > 0 && (
              <VehicleMarker
                points={traj.points}
                position={traj.vehicle}
              />
            )}
          </group>
        )
      })}
    </>
  )
}
