import { useState, useEffect, useRef, useCallback } from 'react'
import { parseComponents, parseWireframe, resolveFrames } from './parser'
import { useAnnotationNavigation } from './hooks/useAnnotationNavigation'
import { FramesContainer } from './components/FramesContainer'
import { ComponentGallery } from './components/gallery/ComponentGallery'
import { FrameProvider, useNotifyFrameChange } from './contexts/FrameContext'
import { captureFrame, captureAllFrames, downloadBlob, generateFilename } from './utils/export'
import { ExportDropdown } from './components/ExportDropdown'
import type { ExportOptions } from './components/ExportDropdown'
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

// Expose scroll function for headless renderer
declare global {
  interface Window {
    scrollToFrame?: (frameId: string) => boolean
  }
}

window.scrollToFrame = (frameId: string): boolean => {
  const el = document.querySelector(`[data-frame-id="${frameId}"]`)
  if (!el) return false
  const rect = el.getBoundingClientRect()
  const targetTop = HEADER_HEIGHT + SCROLL_PADDING
  const top = window.scrollY + rect.top - targetTop
  window.scrollTo({ top: Math.max(0, top), behavior: 'instant' })
  return true
}

interface NavItem {
  id: string
  element: Element
}

// Check for external spec ID from query param (used by render API)
function getExternalSpecId(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('spec')
}

function AppContent() {
  const [externalSpecId] = useState(getExternalSpecId)
  const [specFile, setSpecFile] = useState(() => {
    if (externalSpecId) return 'external' // Don't use localStorage when external
    const saved = localStorage.getItem('specFile')
    return saved && SPEC_FILES.includes(saved) ? saved : 'wireframe.yaml'
  })
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
  const isScrollingProgrammatically = useRef(false)
  const indexChangeSource = useRef<'scroll' | 'nav'>('nav')
  const notifyFrameChange = useNotifyFrameChange()

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

  // Handle frame export
  const handleExportFrame = useCallback(async (options: ExportOptions = { mode: 'frame' }) => {
    if (isComponentGallery) return

    try {
      if (options.batch) {
        // Batch export all frames
        const result = await captureAllFrames({
          mode: options.mode,
          onProgress: (current, total, frameId) => {
            console.log(`Exporting ${current}/${total}: ${frameId}`)
          }
        })
        const filename = `wireframes_${options.mode}.zip`
        downloadBlob(result.blob, filename)
      } else {
        // Single frame export
        const currentFrame = navItems[activeIndex]
        if (!currentFrame) return

        const results = await captureFrame({
          frameId: currentFrame.id,
          mode: options.mode,
          asZip: options.asZip
        })

        for (const result of results) {
          const filename = generateFilename(currentFrame.id, result.suffix, result.isZip)
          downloadBlob(result.blob, filename)
        }
      }
    } catch (err) {
      console.error('Export failed:', err)
    }
  }, [navItems, activeIndex, isComponentGallery])

  // Persist spec file selection
  useEffect(() => {
    localStorage.setItem('specFile', specFile)
  }, [specFile])

  const loadAndRender = useCallback(async () => {
    try {
      setError(null)
      setCursor(null)

      let componentsYaml: string
      let wireframeYaml: string

      if (externalSpecId) {
        // Load from render API (external spec)
        const [compRes, specRes] = await Promise.all([
          fetch(`/api/specs/${externalSpecId}?type=components`).catch(() => null),
          fetch(`/api/specs/${externalSpecId}?type=wireframe`),
        ])

        if (!specRes.ok) {
          throw new Error(`Failed to load external spec: ${specRes.status}`)
        }
        wireframeYaml = await specRes.text()

        // Use external components if provided, otherwise fall back to default
        if (compRes && compRes.ok) {
          componentsYaml = await compRes.text()
        } else {
          const defaultCompRes = await fetch('/specs/components.yaml')
          if (!defaultCompRes.ok) {
            throw new Error(`Failed to load components.yaml: ${defaultCompRes.status}`)
          }
          componentsYaml = await defaultCompRes.text()
        }

        const components = parseComponents(componentsYaml)
        const wireframe = parseWireframe(wireframeYaml)
        const resolvedFrames = resolveFrames(wireframe, components)

        setIsComponentGallery(false)
        setFrames(resolvedFrames)
        setNavTitle('External Spec')
        setActiveIndex(0)
        return
      }

      // Normal mode: fetch from /specs/
      const componentsRes = await fetch('/specs/components.yaml')
      if (!componentsRes.ok) {
        throw new Error(`Failed to load components.yaml: ${componentsRes.status}`)
      }
      componentsYaml = await componentsRes.text()
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
        wireframeYaml = await wireframeRes.text()

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
  }, [specFile, externalSpecId, setCursor])

  // Initial load and when spec changes
  useEffect(() => {
    loadAndRender()
  }, [loadAndRender])

  // Notify 3D components to re-check visibility when frame changes
  useEffect(() => {
    notifyFrameChange()
  }, [activeIndex, notifyFrameChange])

  // Scroll to active item and set implicit annotation cursor
  useEffect(() => {
    if (!navItems[activeIndex]) return

    const fromAnnotation = shouldSkipFrameReset()

    // Only scroll if the index change came from nav (keyboard/click), not from scrolling
    if (indexChangeSource.current === 'nav') {
      const el = navItems[activeIndex].element
      const rect = el.getBoundingClientRect()
      const targetTop = HEADER_HEIGHT + SCROLL_PADDING

      // Only scroll if frame isn't already at the target position (within tolerance)
      const isAlreadyAtTarget = Math.abs(rect.top - targetTop) < 5
      if (!isAlreadyAtTarget) {
        const top = window.scrollY + rect.top - targetTop

        // Mark as programmatic scroll to prevent scroll handler from fighting
        isScrollingProgrammatically.current = true

        window.scrollTo({ top, behavior: fromAnnotation ? 'smooth' : 'instant' })

        // Reset flag after scroll completes (use timeout for smooth scroll)
        setTimeout(() => {
          isScrollingProgrammatically.current = false
        }, fromAnnotation ? 500 : 50)
      }
    }

    // Reset source for next change
    indexChangeSource.current = 'nav'

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
        setShowAnnotations(prev => {
          if (prev) clearSelection() // Clear selection when hiding
          return !prev
        })
        return
      }

      // Export current frame
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        handleExportFrame({ mode: 'frame' })
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
  }, [navItems.length, specFile, showAnnotations, selectedAnnotation, navigateAnnotation, clearSelection, handleExportFrame])

  // Update activeIndex based on scroll position (user-initiated scroll only)
  useEffect(() => {
    if (navItems.length === 0) return

    let ticking = false
    const handleScroll = () => {
      // Skip if this is a programmatic scroll
      if (isScrollingProgrammatically.current) return
      if (ticking) return
      ticking = true

      requestAnimationFrame(() => {
        ticking = false
        // Double-check in case flag changed during frame
        if (isScrollingProgrammatically.current) return

        const targetTop = HEADER_HEIGHT + SCROLL_PADDING

        // Find which frame is closest to the target position
        let closestIndex = 0
        let closestDistance = Infinity

        navItems.forEach((item, index) => {
          const rect = item.element.getBoundingClientRect()
          const distance = Math.abs(rect.top - targetTop)

          if (distance < closestDistance) {
            closestDistance = distance
            closestIndex = index
          }
        })

        setActiveIndex(prev => {
          if (prev !== closestIndex) {
            // Mark that this change came from scrolling, not nav
            indexChangeSource.current = 'scroll'
            return closestIndex
          }
          return prev
        })
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [navItems])

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

  // Hot reload polling (disabled in external spec mode)
  useEffect(() => {
    if (!import.meta.hot || externalSpecId) return

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
  }, [specFile, externalSpecId, loadAndRender])

  return (
    <>
      <div className="toolbar">
        <label htmlFor="spec-select">Spec file:</label>
        <select
          id="spec-select"
          value={specFile}
          onChange={(e) => {
            setSpecFile(e.target.value)
            e.target.blur()
          }}
        >
          {SPEC_FILES.map(file => (
            <option key={file} value={file}>{file}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <button
            className={`toolbar-button ${showAnnotations ? 'active' : ''}`}
            onClick={() => {
              if (showAnnotations) clearSelection()
              setShowAnnotations(!showAnnotations)
            }}
            title="Toggle annotations (A)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <ExportDropdown
            onExport={handleExportFrame}
            disabled={isComponentGallery || navItems.length === 0}
          />
        </div>
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

        <div id="app" ref={containerRef} className={showAnnotations ? '' : 'hide-annotations'} onClick={clearSelection}>
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

export default function App() {
  return (
    <FrameProvider>
      <AppContent />
    </FrameProvider>
  )
}
