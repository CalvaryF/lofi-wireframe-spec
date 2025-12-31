import { VariantPreview } from './VariantPreview'

type GalleryComponents = Record<string, { variants: Record<string, unknown[]> }>

interface ComponentSectionProps {
  componentName: string
  variants: Record<string, unknown[]>
  components: GalleryComponents
}

export function ComponentSection({ componentName, variants, components }: ComponentSectionProps) {
  return (
    <div className="component-section" data-component-id={componentName}>
      <div className="component-header">{componentName}</div>
      <div className="variants-container">
        {Object.entries(variants).map(([variantName, variantNodes]) => (
          <VariantPreview
            key={variantName}
            variantName={variantName}
            variantNodes={variantNodes}
            components={components}
          />
        ))}
      </div>
    </div>
  )
}
