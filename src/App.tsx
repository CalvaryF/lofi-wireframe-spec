import { useState, useEffect, useRef, useCallback } from 'react'
import { parseComponents, parseWireframe, resolveFrames } from './parser'
import { useAnnotationNavigation } from './hooks/useAnnotationNavigation'
import { FramesContainer } from './components/FramesContainer'
import { ComponentGallery } from './components/gallery/ComponentGallery'
import type { ResolvedNode } from './types'

type GalleryComponents = Record<string, { variants: Record<string, unknown[]> }>

// Dynamically get all yaml files from specs folder
const specModules = import.meta.glob('/specs/*.yaml', { query: '?raw', import: 'default' })
const SPEC_FILES = Object.keys(specModules)
  .map(path => path.replace('/specs/', ''))
  .sort((a, b) => {
    if (a === 'components.yaml') return -1
    if (b === 'components.yaml') return 1
    return a.localeCompare(b)
  })

const HEADER_HEIGHT = 60
const SCROLL_PADDING = 24

interface NavItem {
  id: string
  element: Element
}

export default function App() {
  const [specFile, setSpecFile] = useState('wireframe.yaml')
  const [navItems, setNavItems] = useState<NavItem[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [navTitle, setNavTitle] = useState('Frames')
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [frames, setFrames] = useState<ResolvedNode[]>([])
  const [isComponentGallery, setIsComponentGallery] = useState(false)
  const [galleryComponents, setGalleryComponents] = useState<GalleryComponents | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastComponentsRef = useRef('')
  const lastWireframeRef = useRef('')

  const {
    selectedAnnotation,
    setSelectedAnnotation,
    setCursor,
    navigateAnnotation,
    clearSelection,
    markFrameChangeFromAnnotation,
    shouldSkipFrameReset,
  } = useAnnotationNavigation()

  // Handle annotation click - update hook state so keyboard nav continues from here
  const handleAnnotationClick = useCallback((globalIndex: number) => {
    setSelectedAnnotation(globalIndex)
    setCursor(globalIndex)
  }, [setSelectedAnnotation, setCursor])

  const loadAndRender = useCallback(async () => {
    try {
      setError(null)
      setCursor(null)

      // Always fetch components
      const componentsRes = await fetch('/specs/components.yaml')
      if (!componentsRes.ok) {
        throw new Error(`Failed to load components.yaml: ${componentsRes.status}`)
      }
      const componentsYaml = await componentsRes.text()
      const components = parseComponents(componentsYaml)

      if (specFile === 'components.yaml') {
        // Update refs to prevent hot reload from re-triggering
        lastComponentsRef.current = componentsYaml
        lastWireframeRef.current = componentsYaml

        setIsComponentGallery(true)
        setFrames([])
        setGalleryComponents(components)
        setNavTitle('Components')
        setActiveIndex(0)
      } else {
        // Load and render wireframe
        const wireframeRes = await fetch(`/specs/${specFile}`)
        if (!wireframeRes.ok) {
          throw new Error(`Failed to load ${specFile}: ${wireframeRes.status}`)
        }
        const wireframeYaml = await wireframeRes.text()

        // Update refs to prevent hot reload from re-triggering
        lastComponentsRef.current = componentsYaml
        lastWireframeRef.current = wireframeYaml

        const wireframe = parseWireframe(wireframeYaml)
        const resolvedFrames = resolveFrames(wireframe, components)

        setIsComponentGallery(false)
        setFrames(resolvedFrames)
        setNavTitle('Frames')
        setActiveIndex(0)
      }
    } catch (err) {
      console.error('Error loading specs:', err)
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [specFile, setCursor])

  // Initial load and when spec changes
  useEffect(() => {
    loadAndRender()
  }, [loadAndRender])

  // Scroll to active item and set implicit annotation cursor
  useEffect(() => {
    if (!navItems[activeIndex]) return

    const el = navItems[activeIndex].element
    const rect = el.getBoundingClientRect()
    const top = window.scrollY + rect.top - HEADER_HEIGHT - SCROLL_PADDING

    // Smooth scroll only when navigating via annotations, instant otherwise
    const fromAnnotation = shouldSkipFrameReset()
    window.scrollTo({ top, behavior: fromAnnotation ? 'smooth' : 'instant' })

    // Skip resetting annotation if frame change was from annotation navigation
    if (fromAnnotation) {
      return
    }

    // Set implicit cursor to first annotation on this frame (no visual selection)
    if (showAnnotations && containerRef.current) {
      const allAnnotations = containerRef.current.querySelectorAll('.annotation-item[data-annotation]')
      const frameId = navItems[activeIndex].id
      const frame = containerRef.current.querySelector(`.frame-container[data-frame-id="${frameId}"]`)

      if (frame) {
        const firstAnnotation = frame.querySelector('.annotation-item[data-annotation]')
        if (firstAnnotation) {
          const globalIndex = Array.from(allAnnotations).indexOf(firstAnnotation)
          setCursor(globalIndex)
        } else {
          setCursor(null)
        }
      }
    }
    // Note: We don't call clearSelection() here to avoid re-render loops
    // The selection will be cleared naturally when navigating frames via keyboard
  }, [activeIndex, navItems, showAnnotations, shouldSkipFrameReset, setCursor])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.target instanceof HTMLSelectElement) return

      // Toggle annotations
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        setShowAnnotations(prev => !prev)
        return
      }

      // Shift+Up/Down: navigate annotations
      if (e.shiftKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        if (!showAnnotations || !containerRef.current) return
        e.preventDefault()

        const allAnnotations = containerRef.current.querySelectorAll('.annotation-item[data-annotation]')
        if (allAnnotations.length === 0) return

        // Find last annotation index of current frame for Shift+Up starting position
        const frameId = navItems[activeIndex]?.id
        const frame = containerRef.current.querySelector(`.frame-container[data-frame-id="${frameId}"]`)
        const frameAnnotations = frame?.querySelectorAll('.annotation-item[data-annotation]')
        const lastFrameAnnotation = frameAnnotations?.[frameAnnotations.length - 1]
        const frameLastIndex = lastFrameAnnotation
          ? Array.from(allAnnotations).indexOf(lastFrameAnnotation)
          : undefined

        navigateAnnotation(
          e.key === 'ArrowDown' ? 'down' : 'up',
          allAnnotations.length,
          frameLastIndex
        )
        return
      }

      // Escape: clear annotation selection
      if (e.key === 'Escape' && selectedAnnotation !== null) {
        e.preventDefault()
        clearSelection()
        return
      }

      // Up/Down: navigate frames
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (navItems.length === 0) return
        e.preventDefault()

        clearSelection() // Clear annotation selection when navigating frames
        setActiveIndex(prev => {
          if (e.key === 'ArrowDown') {
            return Math.min(prev + 1, navItems.length - 1)
          } else {
            return Math.max(prev - 1, 0)
          }
        })
      }

      // Left/Right: navigate files
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        clearSelection() // Clear annotation selection when navigating files
        const currentIndex = SPEC_FILES.indexOf(specFile)
        let nextIndex: number

        if (e.key === 'ArrowRight') {
          nextIndex = currentIndex < SPEC_FILES.length - 1 ? currentIndex + 1 : 0
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : SPEC_FILES.length - 1
        }

        setSpecFile(SPEC_FILES[nextIndex])
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [navItems.length, specFile, showAnnotations, selectedAnnotation, navigateAnnotation, clearSelection])

  // Handle annotation selection scroll (React components handle highlighting)
  useEffect(() => {
    if (!containerRef.current || selectedAnnotation === null) return

    const allAnnotations = containerRef.current.querySelectorAll('.annotation-item[data-annotation]')
    const selectedItem = allAnnotations[selectedAnnotation] as HTMLElement
    if (!selectedItem) return

    // Find the frame container for this annotation
    const frameContainer = selectedItem.closest('.frame-container') as HTMLElement
    if (!frameContainer) return

    // Scroll to frame if it's at least partially off screen
    const frameRect = frameContainer.getBoundingClientRect()
    const isFrameOffScreen = frameRect.top < HEADER_HEIGHT || frameRect.bottom > window.innerHeight

    if (isFrameOffScreen) {
      const frameId = frameContainer.dataset.frameId
      const frameIndex = navItems.findIndex(item => item.id === frameId)
      if (frameIndex !== -1) {
        markFrameChangeFromAnnotation()
        setActiveIndex(frameIndex)
      }
    }
  }, [selectedAnnotation, navItems, markFrameChangeFromAnnotation])

  // Update navItems when frames change (after React renders)
  useEffect(() => {
    if (isComponentGallery || frames.length === 0) return

    // Wait for React to render frames
    const timer = setTimeout(() => {
      if (!containerRef.current) return
      const elements = containerRef.current.querySelectorAll('.frame-container[data-frame-id]')
      const items = Array.from(elements).map(el => ({
        id: (el as HTMLElement).dataset.frameId || '',
        element: el
      }))
      setNavItems(items)
    }, 0)

    return () => clearTimeout(timer)
  }, [frames, isComponentGallery])

  // Update navItems when component gallery changes (after React renders)
  useEffect(() => {
    if (!isComponentGallery || !galleryComponents) return

    // Wait for React to render gallery
    const timer = setTimeout(() => {
      if (!containerRef.current) return
      const elements = containerRef.current.querySelectorAll('.component-section[data-component-id]')
      const items = Array.from(elements).map(el => ({
        id: (el as HTMLElement).dataset.componentId || '',
        element: el
      }))
      setNavItems(items)
    }, 0)

    return () => clearTimeout(timer)
  }, [galleryComponents, isComponentGallery])

  // Hot reload polling
  useEffect(() => {
    if (!import.meta.hot) return

    const checkForChanges = async () => {
      try {
        const [componentsRes, wireframeRes] = await Promise.all([
          fetch('/specs/components.yaml?t=' + Date.now()),
          fetch(`/specs/${specFile}?t=` + Date.now())
        ])

        const componentsYaml = await componentsRes.text()
        const wireframeYaml = specFile === 'components.yaml'
          ? componentsYaml
          : await wireframeRes.text()

        if (componentsYaml !== lastComponentsRef.current || wireframeYaml !== lastWireframeRef.current) {
          lastComponentsRef.current = componentsYaml
          lastWireframeRef.current = wireframeYaml
          loadAndRender()
        }
      } catch {
        // Ignore polling errors
      }
    }

    const interval = setInterval(checkForChanges, 500)
    return () => clearInterval(interval)
  }, [specFile, loadAndRender])

  return (
    <>
      <div className="toolbar">
        <label htmlFor="spec-select">Spec file:</label>
        <select
          id="spec-select"
          value={specFile}
          onChange={(e) => setSpecFile(e.target.value)}
        >
          {SPEC_FILES.map(file => (
            <option key={file} value={file}>{file}</option>
          ))}
        </select>
        <button
          className={`toolbar-button ${showAnnotations ? 'active' : ''}`}
          onClick={() => setShowAnnotations(!showAnnotations)}
          title="Toggle annotations (A)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      <div className="main-layout">
        <nav className="frame-nav">
          <div className="frame-nav-title">{navTitle}</div>
          {navItems.map((item, index) => (
            <div
              key={item.id}
              className={`frame-nav-item ${index === activeIndex ? 'active' : ''}`}
              onClick={() => {
                clearSelection()
                setActiveIndex(index)
              }}
            >
              {item.id}
            </div>
          ))}
        </nav>

        <div id="app" ref={containerRef} className={showAnnotations ? '' : 'hide-annotations'}>
          {error ? (
            <div className="error">
              <div>Error loading wireframes</div>
              <pre>{error}</pre>
            </div>
          ) : isComponentGallery && galleryComponents ? (
            <ComponentGallery components={galleryComponents} />
          ) : frames.length > 0 ? (
            <FramesContainer
              frames={frames}
              selectedAnnotationIndex={selectedAnnotation}
              onAnnotationClick={handleAnnotationClick}
            />
          ) : (
            <div className="loading">Loading wireframes...</div>
          )}
        </div>
      </div>
    </>
  )
}
