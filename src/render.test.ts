import { describe, it, expect } from 'vitest'
import {
  RenderContext,
  defaultContext,
  getPadding,
  hasOutline,
  hasGrow,
  hasLeadingOutline,
  hasTrailingOutline,
  computeChildContext
} from './render'
import type { ResolvedNode, BoxNode } from './types'

// Helper to create a box node
function box(props: Partial<BoxNode['Box']> = {}, children: ResolvedNode[] = []): ResolvedNode {
  return {
    type: 'box',
    props: { ...props },
    children
  } as ResolvedNode
}

// Helper to create a text node
function text(content: string): ResolvedNode {
  return {
    type: 'text',
    props: { content }
  } as ResolvedNode
}

describe('getPadding', () => {
  it('returns zeros for undefined', () => {
    expect(getPadding(undefined)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
  })

  it('expands single number to all sides', () => {
    expect(getPadding(16)).toEqual({ top: 16, right: 16, bottom: 16, left: 16 })
  })

  it('expands [vertical, horizontal] tuple', () => {
    expect(getPadding([8, 16])).toEqual({ top: 8, right: 16, bottom: 8, left: 16 })
  })
})

describe('hasOutline', () => {
  it('returns true for box with outline', () => {
    expect(hasOutline(box({ outline: 'thin' }))).toBe(true)
    expect(hasOutline(box({ outline: 'thick' }))).toBe(true)
    expect(hasOutline(box({ outline: 'dashed' }))).toBe(true)
  })

  it('returns false for box without outline', () => {
    expect(hasOutline(box({}))).toBe(false)
    expect(hasOutline(box({ outline: 'none' }))).toBe(false)
  })

  it('returns false for non-box nodes', () => {
    expect(hasOutline(text('hello'))).toBe(false)
  })
})

describe('hasGrow', () => {
  it('returns true for box with grow: 1', () => {
    expect(hasGrow(box({ grow: 1 }))).toBe(true)
  })

  it('returns false for box without grow', () => {
    expect(hasGrow(box({}))).toBe(false)
    expect(hasGrow(box({ grow: 0 }))).toBe(false)
  })

  it('returns false for non-box nodes', () => {
    expect(hasGrow(text('hello'))).toBe(false)
  })
})

describe('hasLeadingOutline', () => {
  it('returns true if node itself has outline', () => {
    expect(hasLeadingOutline(box({ outline: 'thin' }), 'top')).toBe(true)
    expect(hasLeadingOutline(box({ outline: 'thin' }), 'left')).toBe(true)
  })

  it('returns false if node has no outline and no children', () => {
    expect(hasLeadingOutline(box({}), 'top')).toBe(false)
  })

  it('checks first child for main-axis edge in column layout', () => {
    const parent = box({ layout: 'column' }, [
      box({ outline: 'thin' }),
      box({})
    ])
    expect(hasLeadingOutline(parent, 'top')).toBe(true)
  })

  it('checks all children for cross-axis edge in column layout', () => {
    const parent = box({ layout: 'column' }, [
      box({ outline: 'thin' }),
      box({})
    ])
    // Left edge - all children share it, at least one has outline
    expect(hasLeadingOutline(parent, 'left')).toBe(true)
  })

  it('respects padding blocking outline detection', () => {
    const parent = box({ layout: 'column', padding: 16 }, [
      box({ outline: 'thin' })
    ])
    // Padding blocks the outline from reaching parent's edge
    expect(hasLeadingOutline(parent, 'top')).toBe(false)
  })
})

describe('hasTrailingOutline', () => {
  it('returns true if node itself has outline', () => {
    expect(hasTrailingOutline(box({ outline: 'thin' }), 'bottom')).toBe(true)
    expect(hasTrailingOutline(box({ outline: 'thin' }), 'right')).toBe(true)
  })

  it('checks last child for main-axis edge in column layout', () => {
    const parent = box({ layout: 'column' }, [
      box({}),
      box({ outline: 'thin' })
    ])
    expect(hasTrailingOutline(parent, 'bottom')).toBe(true)
  })
})

describe('computeChildContext - sibling collapse', () => {
  it('collapses top with previous sibling in column layout', () => {
    const prevChild = box({ outline: 'thin' })
    const child = box({ outline: 'thin' })

    const ctx = computeChildContext(
      child,
      1, // second child
      2,
      'column',
      0, // no gap
      undefined, // no padding
      false, // parent has no outline
      true, // parent has grow
      prevChild,
      defaultContext
    )

    expect(ctx.collapseTop).toBe(true)
  })

  it('collapses left with previous sibling in row layout', () => {
    const prevChild = box({ outline: 'thin' })
    const child = box({ outline: 'thin' })

    const ctx = computeChildContext(
      child,
      1,
      2,
      'row',
      0,
      undefined,
      false,
      true,
      prevChild,
      defaultContext
    )

    expect(ctx.collapseLeft).toBe(true)
  })

  it('does NOT collapse when there is a gap', () => {
    const prevChild = box({ outline: 'thin' })
    const child = box({ outline: 'thin' })

    const ctx = computeChildContext(
      child,
      1,
      2,
      'column',
      8, // gap prevents collapse
      undefined,
      false,
      true,
      prevChild,
      defaultContext
    )

    expect(ctx.collapseTop).toBe(false)
  })

  it('does NOT collapse when previous sibling has no trailing outline', () => {
    const prevChild = box({}) // no outline
    const child = box({ outline: 'thin' })

    const ctx = computeChildContext(
      child,
      1,
      2,
      'column',
      0,
      undefined,
      false,
      true,
      prevChild,
      defaultContext
    )

    expect(ctx.collapseTop).toBe(false)
  })
})

describe('computeChildContext - parent-child collapse (growing parent)', () => {
  it('first child collapses top with outlined parent in column layout', () => {
    const child = box({ outline: 'thin' })

    const ctx = computeChildContext(
      child,
      0, // first child
      2,
      'column',
      0,
      undefined, // no padding
      true, // parent has outline
      true, // parent has grow
      null,
      defaultContext
    )

    expect(ctx.collapseTop).toBe(true)
  })

  it('last child with grow collapses bottom with outlined parent', () => {
    const child = box({ outline: 'thin', grow: 1 })

    const ctx = computeChildContext(
      child,
      1, // last child
      2,
      'column',
      0,
      undefined,
      true,
      true, // parent has grow
      box({}),
      defaultContext
    )

    expect(ctx.collapseBottom).toBe(true)
  })

  it('last child WITHOUT grow does NOT collapse bottom when parent has grow', () => {
    const child = box({ outline: 'thin' }) // no grow

    const ctx = computeChildContext(
      child,
      1,
      2,
      'column',
      0,
      undefined,
      true,
      true, // parent has grow
      box({}),
      defaultContext
    )

    expect(ctx.collapseBottom).toBe(false)
  })

  it('all children collapse left/right with outlined parent in column layout', () => {
    const child = box({ outline: 'thin' })

    const ctx = computeChildContext(
      child,
      1, // middle child
      3,
      'column',
      0,
      undefined,
      true,
      true,
      box({}),
      defaultContext
    )

    expect(ctx.collapseLeft).toBe(true)
    expect(ctx.collapseRight).toBe(true)
  })

  it('parent padding blocks collapse', () => {
    const child = box({ outline: 'thin' })

    const ctx = computeChildContext(
      child,
      0,
      1,
      'column',
      0,
      16, // parent has padding
      true,
      true,
      null,
      defaultContext
    )

    expect(ctx.collapseTop).toBe(false)
    expect(ctx.collapseLeft).toBe(false)
  })
})

describe('computeChildContext - parent-child collapse (content-sized parent)', () => {
  it('last child WITHOUT grow collapses bottom when parent is content-sized', () => {
    const child = box({ outline: 'thin' }) // no grow

    const ctx = computeChildContext(
      child,
      1,
      2,
      'column',
      0,
      undefined,
      true, // parent has outline
      false, // parent has NO grow (content-sized)
      box({}),
      defaultContext
    )

    expect(ctx.collapseBottom).toBe(true)
  })

  it('last child WITHOUT grow collapses right when parent is content-sized (row)', () => {
    const child = box({ outline: 'thin' }) // no grow

    const ctx = computeChildContext(
      child,
      1,
      2,
      'row',
      0,
      undefined,
      true, // parent has outline
      false, // parent has NO grow (content-sized)
      box({}),
      defaultContext
    )

    expect(ctx.collapseRight).toBe(true)
  })
})

describe('computeChildContext - inherited collapse', () => {
  it('inherits collapse from parent context through non-outlined container', () => {
    const child = box({ outline: 'thin' })
    const parentCtx: RenderContext = {
      collapseTop: true,
      collapseLeft: true,
      collapseBottom: false,
      collapseRight: false
    }

    const ctx = computeChildContext(
      child,
      0, // first child
      1,
      'column',
      0,
      undefined,
      false, // parent has NO outline - passes through context
      true,
      null,
      parentCtx
    )

    expect(ctx.collapseTop).toBe(true)
    expect(ctx.collapseLeft).toBe(true)
  })

  it('does NOT inherit bottom collapse without grow when parent has grow', () => {
    const child = box({ outline: 'thin' }) // no grow
    const parentCtx: RenderContext = {
      collapseTop: false,
      collapseLeft: false,
      collapseBottom: true,
      collapseRight: false
    }

    const ctx = computeChildContext(
      child,
      0, // only child (first and last)
      1,
      'column',
      0,
      undefined,
      false,
      true, // parent has grow
      null,
      parentCtx
    )

    expect(ctx.collapseBottom).toBe(false)
  })

  it('inherits bottom collapse WITH grow when parent has grow', () => {
    const child = box({ outline: 'thin', grow: 1 })
    const parentCtx: RenderContext = {
      collapseTop: false,
      collapseLeft: false,
      collapseBottom: true,
      collapseRight: false
    }

    const ctx = computeChildContext(
      child,
      0,
      1,
      'column',
      0,
      undefined,
      false,
      true, // parent has grow
      null,
      parentCtx
    )

    expect(ctx.collapseBottom).toBe(true)
  })

  it('inherits bottom collapse without grow when parent is content-sized', () => {
    const child = box({ outline: 'thin' }) // no grow
    const parentCtx: RenderContext = {
      collapseTop: false,
      collapseLeft: false,
      collapseBottom: true,
      collapseRight: false
    }

    const ctx = computeChildContext(
      child,
      0, // only child (first and last)
      1,
      'column',
      0,
      undefined,
      false,
      false, // parent has NO grow (content-sized)
      null,
      parentCtx
    )

    expect(ctx.collapseBottom).toBe(true)
  })
})

describe('computeChildContext - row layout specifics', () => {
  it('first child collapses left with outlined parent', () => {
    const child = box({ outline: 'thin' })

    const ctx = computeChildContext(
      child,
      0,
      2,
      'row',
      0,
      undefined,
      true,
      true,
      null,
      defaultContext
    )

    expect(ctx.collapseLeft).toBe(true)
  })

  it('last child with grow collapses right with outlined parent', () => {
    const child = box({ outline: 'thin', grow: 1 })

    const ctx = computeChildContext(
      child,
      1,
      2,
      'row',
      0,
      undefined,
      true,
      true, // parent has grow
      box({}),
      defaultContext
    )

    expect(ctx.collapseRight).toBe(true)
  })

  it('last child WITHOUT grow does NOT collapse right when parent has grow', () => {
    const child = box({ outline: 'thin' })

    const ctx = computeChildContext(
      child,
      1,
      2,
      'row',
      0,
      undefined,
      true,
      true, // parent has grow
      box({}),
      defaultContext
    )

    expect(ctx.collapseRight).toBe(false)
  })

  it('all children collapse top/bottom with outlined parent in row layout', () => {
    const child = box({ outline: 'thin' })

    const ctx = computeChildContext(
      child,
      1,
      3,
      'row',
      0,
      undefined,
      true,
      true,
      box({}),
      defaultContext
    )

    expect(ctx.collapseTop).toBe(true)
    expect(ctx.collapseBottom).toBe(true)
  })
})
