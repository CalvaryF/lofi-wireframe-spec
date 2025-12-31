import type { ChartSeries } from '../../types'

interface ChartProps {
  width?: number
  height?: number
  series: ChartSeries[]
}

const colorMap: Record<string, string> = {
  blue: 'hsl(210, 50%, 50%)',
  green: 'hsl(150, 40%, 45%)',
  orange: 'hsl(30, 60%, 50%)',
  purple: 'hsl(270, 40%, 55%)',
  red: 'hsl(0, 50%, 50%)',
  teal: 'hsl(180, 40%, 45%)'
}

export function Chart({ width = 200, height = 100, series }: ChartProps) {
  // Find data bounds across ALL series for consistent scaling
  const allYs = series.flatMap(s => s.data.map(d => d.y))
  const dataYMin = Math.min(...allYs)
  const dataYMax = Math.max(...allYs)
  const dataRange = dataYMax - dataYMin || 1
  const buffer = dataRange * 0.1
  const yMin = dataYMin - buffer
  const yMax = dataYMax + buffer
  const yRange = yMax - yMin

  const labelsToShow = series.filter(s => s.label)

  return (
    <div
      className="chart"
      style={{
        width: `${width}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}
    >
      {/* Chart area */}
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          border: '1px solid var(--border)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <svg width={width} height={height} style={{ display: 'block' }}>
          {series.map((s, seriesIndex) => {
            const seriesColor = colorMap[s.color] || colorMap.blue

            if (s.scatter) {
              // Scatter plot
              const dotSize = 4
              return (
                <g key={seriesIndex}>
                  {s.data.map((d, i) => {
                    const cx = (i / (s.data.length - 1)) * width
                    const cy = height - ((d.y - yMin) / yRange) * height
                    return (
                      <rect
                        key={i}
                        x={cx - dotSize / 2}
                        y={cy - dotSize / 2}
                        width={dotSize}
                        height={dotSize}
                        fill={seriesColor}
                      />
                    )
                  })}
                </g>
              )
            } else {
              // Line chart
              const points = s.data.map((d, i) => {
                const px = (i / (s.data.length - 1)) * width
                const py = height - ((d.y - yMin) / yRange) * height
                return `${px},${py}`
              })

              return (
                <path
                  key={seriesIndex}
                  d={`M ${points.join(' L ')}`}
                  fill="none"
                  stroke={seriesColor}
                  strokeWidth={2}
                />
              )
            }
          })}
        </svg>
      </div>

      {/* Legend */}
      {labelsToShow.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {labelsToShow.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                border: '1px solid var(--border)',
                fontSize: '10px',
                color: 'var(--muted-foreground)',
                background: 'white'
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  background: colorMap[s.color] || colorMap.blue
                }}
              />
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
