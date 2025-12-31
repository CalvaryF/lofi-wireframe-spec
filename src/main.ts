import './styles.css'
import { parseComponents, parseWireframe, resolveFrames } from './parser'
import { render, renderComponentGallery } from './render'

const app = document.querySelector<HTMLDivElement>('#app')!
const specSelect = document.querySelector<HTMLSelectElement>('#spec-select')!

// List of available spec files (add new files here)
const SPEC_FILES = [
  'components.yaml',  // Special: shows component gallery
  'wireframe.yaml',
  'example-app.yaml',
  'stress-test.yaml',
  'icon-stress-test.yaml'
]

let currentSpecFile = 'wireframe.yaml'

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
