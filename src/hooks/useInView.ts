import { useEffect, useRef, useState, useLayoutEffect } from 'react'

/**
 * Check if element is visible in viewport
 */
function checkVisibility(element: HTMLElement | null, buffer = 200): boolean {
  if (!element) return false
  const rect = element.getBoundingClientRect()
  return rect.bottom >= -buffer && rect.top <= window.innerHeight + buffer
}

/**
 * Hook that tracks whether an element is visible in the viewport.
 * Uses polling for reliability.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  // Check visibility immediately after mount
  useLayoutEffect(() => {
    setInView(checkVisibility(ref.current))
  }, [])

  // Poll every 500ms
  useEffect(() => {
    const check = () => {
      setInView(checkVisibility(ref.current))
    }

    // Initial check
    check()

    const interval = setInterval(check, 500)
    return () => clearInterval(interval)
  }, [])

  return [ref, inView]
}
