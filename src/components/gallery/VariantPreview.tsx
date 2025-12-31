import { useMemo } from 'react'
import type { ResolvedNode } from '../../types'
import { NodeRenderer } from '../NodeRenderer'
import { resolveForGallery } from '../../utils/resolveForGallery'

type GalleryComponents = Record<string, { variants: Record<string, unknown[]> }>

interface VariantPreviewProps {
  variantName: string
  variantNodes: unknown[]
  components: GalleryComponents
}

export function VariantPreview({ variantName, variantNodes, components }: VariantPreviewProps) {
  // Process and resolve the variant nodes
  const resolvedNodes = useMemo(() => {
    // Replace template vars with placeholder text
    const processedNodes = JSON.parse(
      JSON.stringify(variantNodes).replace(/\{\{(\w+)\}\}/g, '[$1]')
    ) as unknown[]

    return processedNodes
      .map(node => resolveForGallery(node, components))
      .filter((node): node is ResolvedNode => node !== null)
  }, [variantNodes, components])

  // Create an empty annotation map (gallery doesn't use annotations)
  const annotationMap = useMemo(() => new WeakMap<object, number>(), [])

  return (
    <div className="variant-wrapper">
      <div className="variant-label">{variantName}</div>
      <div className="variant-content">
        {resolvedNodes.map((node, index) => (
          <NodeRenderer
            key={index}
            node={node}
            frameId="gallery"
            annotationMap={annotationMap}
          />
        ))}
      </div>
    </div>
  )
}
