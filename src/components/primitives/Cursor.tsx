import { createElement } from 'react'
import { icons } from 'lucide'
import type { CursorType, CursorAnchor } from '../../types'

interface CursorProps {
  type: CursorType
  anchor?: CursorAnchor
  position?: { x: number; y: number }
  offset?: { x: number; y: number }
  tooltip?: string
  from?: string
}

const cursorIconMap: Record<CursorType, string> = {
  'pointer': 'MousePointer2',
  'hand': 'Pointer',
  'grab': 'Hand',
  'grabbing': 'Grab',
  'text': 'Type',
  'crosshair': 'Crosshair',
  'move': 'Move',
  'not-allowed': 'MousePointerBan',
  'click': 'MousePointerClick'
}

const anchorStyles: Record<CursorAnchor, { left: string; top: string; transform: string }> = {
  'top-left': { left: '0', top: '0', transform: 'translate(-20%, -20%)' },
  'top-right': { left: '100%', top: '0', transform: 'translate(-80%, -20%)' },
  'center': { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' },
  'bottom-left': { left: '0', top: '100%', transform: 'translate(-20%, -80%)' },
  'bottom-right': { left: '100%', top: '100%', transform: 'translate(-80%, -80%)' }
}

export function Cursor({ type, anchor, position, offset, tooltip, from }: CursorProps) {
  const iconName = cursorIconMap[type] || 'MousePointer2'
  const iconData = icons[iconName as keyof typeof icons]

  // Position styles
  const style: React.CSSProperties = {}

  if (position) {
    style.left = `${position.x}px`
    style.top = `${position.y}px`
  } else {
    const anchorStyle = anchorStyles[anchor || 'center']
    style.left = anchorStyle.left
    style.top = anchorStyle.top
    style.transform = anchorStyle.transform
  }

  // Apply offset
  if (offset) {
    const currentTransform = style.transform || ''
    style.transform = `${currentTransform} translate(${offset.x}px, ${offset.y}px)`
  }

  return (
    <div className="cursor" style={style} data-from={from}>
      {tooltip && <div className="cursor-tooltip">{tooltip}</div>}
      {iconData && (
        <div className="cursor-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {iconData.map((pathData, index) => {
              const [tagName, attrs] = pathData as [string, Record<string, string | number>]
              return createElement(tagName, { key: index, ...attrs })
            })}
          </svg>
        </div>
      )}
    </div>
  )
}
