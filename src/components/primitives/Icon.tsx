import { createElement } from 'react'
import { icons } from 'lucide'
import type { Annotation } from '../../types'

interface IconProps {
  id?: string
  name: string
  annotation?: Annotation
  annotationNumber?: number
  frameId?: string // kept for interface consistency
  path?: number[]  // Tracks position in tree for comment targeting
}

export function Icon({ id, name, annotation, annotationNumber, path }: IconProps) {
  // If name is empty, render nothing
  const trimmedName = name?.trim()
  if (!trimmedName) {
    return <span className="icon" style={{ display: 'none' }} />
  }

  // Convert name to PascalCase for Lucide lookup (e.g., "arrow-right" -> "ArrowRight")
  const pascalName = trimmedName
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

  const iconData = icons[pascalName as keyof typeof icons]
  const resolvedIconData = iconData || icons['Circle']

  return (
    <span
      className="icon"
      data-id={id}
      data-path={path?.join('-')}
      data-element-type="icon"
      data-annotation-number={annotation ? annotationNumber : undefined}
    >
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
        {resolvedIconData.map((pathData, index) => {
          const [tagName, attrs] = pathData as [string, Record<string, string | number>]
          return createElement(tagName, { key: index, ...attrs })
        })}
      </svg>
    </span>
  )
}
