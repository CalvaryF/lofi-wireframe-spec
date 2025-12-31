import type { ResolvedNode } from '../types'
import { isEachBlock, isChildrenSlot } from '../parser'

type GalleryComponents = Record<string, { variants: Record<string, unknown[]> }>

/**
 * Resolves a raw component node for gallery preview.
 * Expands nested components and handles special blocks like $each and $children.
 */
export function resolveForGallery(node: unknown, components: GalleryComponents): ResolvedNode | null {
  if (!node || typeof node !== 'object') return null

  const obj = node as Record<string, unknown>

  if ('Box' in obj) {
    const props = obj['Box'] as Record<string, unknown>
    const rawChildren = props.children

    let children: ResolvedNode[] = []

    // Handle $each block - render 3 sample items
    if (isEachBlock(rawChildren)) {
      const sampleItems = [
        { label: 'Item 1' },
        { label: 'Item 2', variant: 'hover' },
        { label: 'Item 3' }
      ]
      for (const sampleItem of sampleItems) {
        // Substitute {{item.field}} with sample values in template
        const substituted = JSON.parse(
          JSON.stringify(rawChildren.$template)
            .replace(/\{\{item\.label\}\}/g, sampleItem.label)
            .replace(/\{\{item\.variant\}\}/g, sampleItem.variant || '')
            .replace(/\{\{item\}\}/g, sampleItem.label)
        )
        const resolved = substituted
          .map((c: unknown) => resolveForGallery(c, components))
          .filter((c: ResolvedNode | null): c is ResolvedNode => c !== null)
        children.push(...resolved)
      }
    } else if (isChildrenSlot(rawChildren)) {
      // Handle $children slot
      children = [{
        type: 'text',
        props: { content: '[children]', style: 'caption' }
      } as ResolvedNode]
    } else if (Array.isArray(rawChildren)) {
      // Normal array of children
      children = rawChildren
        .map(c => resolveForGallery(c, components))
        .filter((c): c is ResolvedNode => c !== null)
    }

    return {
      type: 'box',
      props: props as ResolvedNode['props'],
      children
    } as ResolvedNode
  }

  if ('Text' in obj) {
    return {
      type: 'text',
      props: obj['Text'] as ResolvedNode['props']
    } as ResolvedNode
  }

  if ('Icon' in obj) {
    return {
      type: 'icon',
      props: obj['Icon'] as ResolvedNode['props']
    } as ResolvedNode
  }

  if ('Cursor' in obj) {
    return {
      type: 'cursor',
      props: obj['Cursor'] as ResolvedNode['props']
    } as ResolvedNode
  }

  if ('Map' in obj) {
    const props = obj['Map'] as Record<string, unknown>
    return {
      type: 'map',
      props: props,
      trajectories: [{ points: [] }]
    } as ResolvedNode
  }

  if ('Chart' in obj) {
    const props = obj['Chart'] as Record<string, unknown>
    return {
      type: 'chart',
      props: props,
      series: []
    } as ResolvedNode
  }

  // Check for component reference (PascalCase key)
  const keys = Object.keys(obj)
  const componentName = keys.find(k => /^[A-Z]/.test(k))

  if (componentName && components[componentName]) {
    const componentDef = components[componentName]
    const instanceProps = obj[componentName] as Record<string, unknown>
    const variantName = (instanceProps?.variant as string)?.trim() || 'default'
    const variant = componentDef.variants[variantName] || componentDef.variants['default']

    if (variant && Array.isArray(variant)) {
      // Substitute props in the variant and resolve
      const substituted = JSON.parse(
        JSON.stringify(variant).replace(/\{\{(\w+)\}\}/g, (_, prop) => {
          const value = instanceProps?.[prop]
          return value !== undefined ? String(value) : `[${prop}]`
        })
      )

      // Resolve all nodes in the variant
      const resolved = substituted
        .map((n: unknown) => resolveForGallery(n, components))
        .filter((n: ResolvedNode | null): n is ResolvedNode => n !== null)

      // Return first node or wrap in box if multiple
      if (resolved.length === 1) {
        return resolved[0]
      } else if (resolved.length > 1) {
        return {
          type: 'box',
          props: { layout: 'column' },
          children: resolved
        } as ResolvedNode
      }
    }
  }

  return null
}
