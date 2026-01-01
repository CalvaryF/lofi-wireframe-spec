import { PointCloud } from './PointCloud'
import { AxisIndicators } from './AxisIndicators'
import type { Scatter3DSeriesData } from '../../../types'

interface ScatterSceneProps {
  series: Scatter3DSeriesData[]
  pointSize: number
}

export function ScatterScene({ series, pointSize }: ScatterSceneProps) {
  return (
    <>
      {/* Ambient lighting for even illumination */}
      <ambientLight intensity={0.8} />

      {/* Axis indicators */}
      <AxisIndicators />

      {/* Render each series */}
      {series.map((s, index) => (
        <PointCloud key={index} points={s.points} color={s.color} pointSize={pointSize} />
      ))}
    </>
  )
}
