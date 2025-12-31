import './styles.css'
import { parseComponents, parseWireframe, resolveFrames } from './parser'
import { render, renderComponentGallery } from './render'

const app = document.querySelector<HTMLDivElement>('#app')!
const specSelect = document.querySelector<HTMLSelectElement>('#spec-select')!
const frameNav = document.querySelector<HTMLElement>('#frame-nav')!

// Dynamically get all yaml files from specs folder
const specModules = import.meta.glob('/specs/*.yaml', { query: '?raw', import: 'default' })
const SPEC_FILES = Object.keys(specModules)
  .map(path => path.replace('/specs/', ''))
  .sort((a, b) => {
    // components.yaml first, then alphabetical
    if (a === 'components.yaml') return -1
    if (b === 'components.yaml') return 1
    return a.localeCompare(b)
  })

let currentSpecFile = 'wireframe.yaml'

const HEADER_HEIGHT = 60
const SCROLL_PADDING = 24

// Populate the navigation sidebar (works for frames and components)
function populateSidebar(type: 'frames' | 'components' = 'frames'): void {
  const selector = type === 'frames'
    ? '.frame-container[data-frame-id]'
    : '.component-section[data-component-id]'
  const idAttr = type === 'frames' ? 'frameId' : 'componentId'

  const elements = document.querySelectorAll(selector)
  frameNav.innerHTML = ''

  // Add title
  const title = document.createElement('div')
  title.className = 'frame-nav-title'
  title.textContent = type === 'frames' ? 'Frames' : 'Components'
  frameNav.appendChild(title)

  elements.forEach(el => {
    const id = (el as HTMLElement).dataset[idAttr]
    const item = document.createElement('div')
    item.className = 'frame-nav-item'
    item.textContent = id || ''

    item.onclick = () => {
      // Mark as active
      document.querySelectorAll('.frame-nav-item').forEach(i => i.classList.remove('active'))
      item.classList.add('active')

      // Scroll to frame
      const rect = el.getBoundingClientRect()
      const top = window.scrollY + rect.top - HEADER_HEIGHT - SCROLL_PADDING
      window.scrollTo({ top, behavior: 'instant' })
    }

    frameNav.appendChild(item)
  })

  // Select first item by default
  const firstItem = frameNav.querySelector('.frame-nav-item') as HTMLElement
  if (firstItem) {
    firstItem.click()
  }
}

// Populate the dropdown
function populateDropdown() {
  specSelect.innerHTML = ''
  for (const file of SPEC_FILES) {
    const option = document.createElement('option')
    option.value = file
    option.textContent = file
    if (file === currentSpecFile) {
      option.selected = true
    }
    specSelect.appendChild(option)
  }
}

async function loadAndRender() {
  try {
    // Always fetch components
    const componentsRes = await fetch('/specs/components.yaml')
    if (!componentsRes.ok) {
      throw new Error(`Failed to load components.yaml: ${componentsRes.status}`)
    }
    const componentsYaml = await componentsRes.text()
    const components = parseComponents(componentsYaml)

    // If viewing components.yaml, show the gallery
    if (currentSpecFile === 'components.yaml') {
      renderComponentGallery(components, app)
      populateSidebar('components')
      return
    }

    // Otherwise, load and render the wireframe
    const wireframeRes = await fetch(`/specs/${currentSpecFile}`)
    if (!wireframeRes.ok) {
      throw new Error(`Failed to load ${currentSpecFile}: ${wireframeRes.status}`)
    }
    const wireframeYaml = await wireframeRes.text()
    const wireframe = parseWireframe(wireframeYaml)

    // Resolve components and render
    const frames = resolveFrames(wireframe, components)
    render(frames, app)
    populateSidebar()

  } catch (err) {
    console.error('Error loading specs:', err)
    app.innerHTML = `
      <div class="error">
        <div>Error loading wireframes</div>
        <pre>${err instanceof Error ? err.message : String(err)}</pre>
      </div>
    `
  }
}

// Handle dropdown change
specSelect.addEventListener('change', () => {
  currentSpecFile = specSelect.value
  loadAndRender()
})

// Initialize
populateDropdown()
loadAndRender()

// Global arrow key navigation
document.addEventListener('keydown', (e) => {
  // Don't interfere with input fields
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
  if (e.target instanceof HTMLSelectElement) return

  // Up/Down: navigate between frames in sidebar
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const items = Array.from(frameNav.querySelectorAll('.frame-nav-item')) as HTMLElement[]
    if (items.length === 0) return

    e.preventDefault()

    const activeItem = frameNav.querySelector('.frame-nav-item.active')
    const currentIndex = activeItem ? items.indexOf(activeItem as HTMLElement) : -1

    let nextIndex: number
    if (e.key === 'ArrowDown') {
      nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
    } else {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
    }

    items[nextIndex].click()
  }

  // Left/Right: navigate between spec files
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault()

    const currentIndex = SPEC_FILES.indexOf(currentSpecFile)
    let nextIndex: number

    if (e.key === 'ArrowRight') {
      nextIndex = currentIndex < SPEC_FILES.length - 1 ? currentIndex + 1 : 0
    } else {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : SPEC_FILES.length - 1
    }

    currentSpecFile = SPEC_FILES[nextIndex]
    specSelect.value = currentSpecFile
    loadAndRender()
  }
})

// Hot reload support
if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    loadAndRender()
  })

  // Poll for YAML changes
  let lastComponents = ''
  let lastWireframe = ''

  async function checkForChanges() {
    try {
      const [componentsRes, wireframeRes] = await Promise.all([
        fetch('/specs/components.yaml?t=' + Date.now()),
        fetch(`/specs/${currentSpecFile}?t=` + Date.now())
      ])

      const componentsYaml = await componentsRes.text()
      const wireframeYaml = currentSpecFile === 'components.yaml'
        ? componentsYaml
        : await wireframeRes.text()

      if (componentsYaml !== lastComponents || wireframeYaml !== lastWireframe) {
        lastComponents = componentsYaml
        lastWireframe = wireframeYaml
        loadAndRender()
      }
    } catch {
      // Ignore errors during polling
    }
  }

  setInterval(checkForChanges, 500)
}
