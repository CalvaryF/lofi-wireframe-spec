import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Deterministic WebGL context slot manager.
 * Tracks each release individually for precise cleanup confirmation.
 */
const MAX_CONTEXTS = 16

const activeSlots = new Set<symbol>()
const pendingReleases = new Set<symbol>() // Track each release individually
const waitingCallbacks = new Map<symbol, { grant: () => void; stillWants: () => boolean }>()

function getTotalInUse(): number {
  return activeSlots.size + pendingReleases.size
}

function tryAcquire(id: symbol, onGrant: () => void, stillWants: () => boolean): boolean {
  // Already have it
  if (activeSlots.has(id)) return true

  // Remove from waiting if present
  waitingCallbacks.delete(id)

  if (getTotalInUse() < MAX_CONTEXTS) {
    activeSlots.add(id)
    return true
  }

  // Queue up with a check function
  waitingCallbacks.set(id, { grant: onGrant, stillWants })
  return false
}

function release(id: symbol): symbol | null {
  const hadSlot = activeSlots.delete(id)
  waitingCallbacks.delete(id)

  if (hadSlot) {
    // Create a unique release ID to track this specific cleanup
    const releaseId = Symbol('release')
    pendingReleases.add(releaseId)
    return releaseId
  }
  return null
}

function confirmDisposed(releaseId: symbol) {
  if (pendingReleases.delete(releaseId)) {
    grantToNextWaiting()
  }
}

function grantToNextWaiting() {
  while (waitingCallbacks.size > 0 && getTotalInUse() < MAX_CONTEXTS) {
    const entry = waitingCallbacks.entries().next().value
    if (!entry) break
    const [nextId, { grant, stillWants }] = entry
    waitingCallbacks.delete(nextId)

    if (stillWants()) {
      activeSlots.add(nextId)
      grant()
      return
    }
  }
}

/**
 * Force dispose a WebGL context and confirm cleanup
 */
function disposeWebGLContext(
  gl: WebGLRenderingContext | WebGL2RenderingContext | null,
  releaseId: symbol
) {
  if (gl) {
    try {
      const ext = gl.getExtension('WEBGL_lose_context')
      if (ext) {
        ext.loseContext()
      }
    } catch {
      // Context may already be lost
    }
  }
  // Confirm this specific disposal after a microtask
  queueMicrotask(() => {
    confirmDisposed(releaseId)
  })
}

export interface WebGLSlotResult {
  hasSlot: boolean
  onContextCreated: (gl: WebGLRenderingContext | WebGL2RenderingContext) => void
}

/**
 * Hook that manages WebGL context slots with deterministic cleanup.
 */
export function useWebGLSlot(shouldMount: boolean): WebGLSlotResult {
  const [hasSlot, setHasSlot] = useState(false)
  const idRef = useRef(Symbol('webgl-slot'))
  const shouldMountRef = useRef(shouldMount)
  const glRef = useRef<WebGLRenderingContext | WebGL2RenderingContext | null>(null)

  // Keep ref in sync
  shouldMountRef.current = shouldMount

  // Callback for Canvas to report its GL context
  const onContextCreated = useCallback((gl: WebGLRenderingContext | WebGL2RenderingContext) => {
    glRef.current = gl
  }, [])

  // Acquire or release based on shouldMount
  useEffect(() => {
    const id = idRef.current

    if (shouldMount) {
      const gotSlot = tryAcquire(
        id,
        () => setHasSlot(true),
        () => shouldMountRef.current
      )
      if (gotSlot) {
        setHasSlot(true)
      }
    } else {
      const releaseId = release(id)
      if (releaseId) {
        disposeWebGLContext(glRef.current, releaseId)
        glRef.current = null
      }
      setHasSlot(false)
    }
  }, [shouldMount])

  // Cleanup on unmount only
  useEffect(() => {
    const id = idRef.current
    return () => {
      const releaseId = release(id)
      if (releaseId) {
        disposeWebGLContext(glRef.current, releaseId)
        glRef.current = null
      }
    }
  }, [])

  return { hasSlot, onContextCreated }
}
