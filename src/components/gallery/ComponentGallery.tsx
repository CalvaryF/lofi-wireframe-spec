import { ComponentSection } from './ComponentSection'

type GalleryComponents = Record<string, { variants: Record<string, unknown[]> }>

interface ComponentGalleryProps {
  components: GalleryComponents
}

export function ComponentGallery({ components }: ComponentGalleryProps) {
  return (
    <div className="frames-container component-gallery">
      {Object.entries(components).map(([componentName, componentDef]) => (
        <ComponentSection
          key={componentName}
          componentName={componentName}
          variants={componentDef.variants}
          components={components}
        />
      ))}
    </div>
  )
}
