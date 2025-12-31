# Lofi Wireframe Specification

A YAML-based format for low-fidelity wireframes optimized for AI-human collaboration.

## Why This Exists

Current UI design tools have problems:
- **Images**: High bandwidth, slow AI I/O
- **Code (HTML/CSS/React)**: Too concrete, collapses design space prematurely
- **Figma**: Great canvas but implicit spec, painful diffs, AI can't reason efficiently
- **UML/BPMN**: Non-executable or too heavyweight

This spec is text-first, diff-friendly, and optimized for spatial reasoning over premature state modeling.

## Core Philosophy

**Formalize Drawing, Not State**: Flows emerge from drawings rather than being declared upfront. This mirrors how humans design and enables productive ambiguity early in the process.

## Quick Start

```bash
cd renderer
npm run dev
```

Edit wireframes in `renderer/specs/`:
- `components.yaml` - Reusable components with variants
- `wireframe.yaml` - Screens/frames using those components

## The Seven Primitives

### Frame
A screen that contains all other elements.

```yaml
Frame:
  id: AssetList              # required, unique
  size: [1440, 900]          # [width, height] or [width, hug] to fit content
  layout: column             # column | row | absolute
  gap: 16                    # spacing between children
  padding: 24                # inner padding
  children: [...]
```

### Box
A container for layout or visual grouping.

```yaml
Box:
  id: Header                 # optional
  layout: row | column | absolute
  gap: 8
  padding: 12                # single value or [vertical, horizontal]
  align: start | center | end | stretch      # cross-axis
  justify: start | center | end | between    # main-axis
  wrap: false                # allow wrapping
  grow: 0 | 1                # flex grow factor
  outline: none | thin | dashed | thick      # visual only, no semantic meaning
  background: grey           # subtle emphasis (optional)
  shadow: true               # floating element indicator (optional)
  position: { x: 0, y: 40 }  # absolute offset from parent (optional)
  children: [...]
```

**Key**: `outline` is purely visual - a drawing aid with zero semantic meaning.

**Background & Shadow**: Use `background: grey` to draw attention to an element (hover states, emphasis). Use `shadow: true` for floating elements (dropdowns, modals, dialogs) to distinguish them from underlying UI.

**Position**: Use `position: { x, y }` to offset a box from its parent's top-left corner. Useful for floating menus, tooltips, and overlays. Parent boxes are automatically `position: relative`.

### Text

```yaml
Text:
  content: "Assets"
  style: h1 | h2 | body | caption | mono
  align: left | center | right
```

### Icon

Lucide icons for visual elements. Fixed size (24px) and line style.

```yaml
Icon:
  name: "settings"    # Lucide icon name (kebab-case)
```

**Examples:**

```yaml
# Standalone icon
- Icon: { name: "user" }

# Icon with text in a row
- Box:
    layout: row
    gap: 8
    align: center
    children:
      - Icon: { name: "settings" }
      - Text: { content: "Settings", style: body }

# In a component with prop substitution
IconButton:
  variants:
    default:
      - Box:
          layout: row
          gap: 8
          padding: [8, 12]
          outline: thin
          align: center
          children:
            - Icon: { name: "{{icon}}" }
            - Text: { content: "{{label}}", style: body }

# Usage
- IconButton: { icon: "download", label: "Export" }
```

**Icon names** use kebab-case: `arrow-right`, `chevron-down`, `user-plus`, `settings`, `home`, `search`, etc.

Full icon list: https://lucide.dev/icons

### Cursor

Shows a cursor indicator pointing at an element. Useful for documenting interactions and user flows.

```yaml
Cursor:
  type: pointer | hand | grab | grabbing | text | crosshair | move | not-allowed | click
  anchor: top-left | top-right | center | bottom-left | bottom-right  # relative to parent
  position: { x: 100, y: 200 }   # absolute position (alternative to anchor)
  offset: { x: 5, y: 5 }         # fine-tune from anchor point
  tooltip: "Click here"          # optional label above cursor
  from: SourceElementId          # draws arrow from source element to cursor (for drag flows)
```

**Positioning**: Use `anchor` (preferred) to position relative to parent element, or `position` for absolute coordinates.

**Drag arrows**: Use `from` to draw a dashed arrow from a source element (referenced by its `id`) to the cursor position. Useful for documenting drag-and-drop workflows.

**Examples:**

```yaml
# Anchored to parent element (cursor as child)
- Box:
    padding: [8, 16]
    outline: thin
    children:
      - Text: { content: "Submit", style: body }
      - Cursor: { type: pointer, anchor: center, tooltip: "Click to submit" }

# Different cursor types
- Cursor: { type: hand, anchor: top-right }           # pointing hand (links)
- Cursor: { type: grab, anchor: center }              # open hand (draggable)
- Cursor: { type: text, anchor: center }              # I-beam (text input)
- Cursor: { type: move, anchor: center }              # move arrows
- Cursor: { type: click, anchor: center }             # pointer with click indicator

# Absolute position (escape hatch)
- Cursor: { type: pointer, position: { x: 200, y: 150 } }

# With offset for fine-tuning
- Cursor: { type: pointer, anchor: bottom-right, offset: { x: -5, y: -5 } }

# Drag-and-drop workflow with arrow
- Box:
    layout: row
    gap: 24
    children:
      # Source element (must have id)
      - Box:
          id: TaskCard
          padding: 12
          outline: thin
          children:
            - Text: { content: "Task #1", style: body }
      # Drop zone with cursor showing drag in progress
      - Box:
          padding: 24
          outline: dashed
          background: grey
          children:
            - Text: { content: "Drop here", style: caption }
            - Cursor: { type: grabbing, anchor: center, from: TaskCard }
```

### Map

Geographical map with vehicle trajectory. Useful for fleet tracking, delivery routes, and navigation UI.

```yaml
Map:
  width: 400
  height: 300
  trajectory:
    fn: loop | linear | curved | wander | zigzag  # helper function
    # OR
    points: [[50, 80], [120, 40], [200, 90]]       # explicit coordinates
  vehicle: 0.7                    # position along path (0-1)
  markers:                        # waypoints with flag icons
    - { position: start, label: "Origin" }
    - { position: 0.5, label: "Depot" }
    - { position: end, label: "Destination" }
```

**Trajectory functions:**

| Function | Description |
|----------|-------------|
| `loop` | Circular/oval delivery route |
| `linear` | Point A to B with slight curve |
| `curved` | Smooth S-curve path |
| `wander` | Random walk, organic movement |
| `zigzag` | Back-and-forth pattern |

**Examples:**

```yaml
# Simple delivery route
- Map:
    width: 400
    height: 250
    trajectory: { fn: loop }
    vehicle: 0.3
    markers:
      - { position: start, label: "Warehouse" }

# Multi-stop route with explicit points
- Map:
    width: 500
    height: 300
    trajectory:
      points: [[40, 150], [150, 80], [250, 180], [350, 100], [450, 160]]
    vehicle: 0.6
    markers:
      - { position: start, label: "Start" }
      - { position: 0.5 }
      - { position: end, label: "End" }
```

**Visual elements:**
- Subtle terrain blobs in background (auto-generated)
- Blue trajectory line
- Triangle vehicle pointing in direction of travel
- Red flag markers at waypoints

### Chart

For data visualization in dashboards. Charts sample mathematical functions to generate placeholder data.

#### Single-line mode

```yaml
Chart:
  fn: sin | cos | tan | square | sqrt | linear | random | binary
  range: [0, 10]           # x-axis range [min, max]
  samples: 20              # number of data points
  width: 200               # chart width in pixels
  height: 100              # chart height in pixels
  noise: 0                 # random noise (0-1 scale)
  scatter: false           # dots instead of connected line
```

**Examples:**

```yaml
# Simple line chart
- Chart: { fn: sin, range: [0, 6.28], samples: 30, width: 180, height: 100 }

# With noise (simulates real data)
- Chart: { fn: linear, range: [0, 10], samples: 25, noise: 0.3, width: 200, height: 100 }

# Scatter plot
- Chart: { fn: square, range: [-2, 2], samples: 20, scatter: true, width: 180, height: 100 }
```

#### Multi-line mode

Overlay multiple data series with a legend:

```yaml
Chart:
  range: [0, 6.28]
  samples: 40
  width: 350
  height: 150
  lines:
    - { fn: sin, label: "Temperature", color: blue }
    - { fn: cos, label: "Humidity", color: green }
    - { fn: linear, label: "Trend", color: orange, noise: 0.1 }
```

Each line can have its own `fn`, `label`, `color`, `noise`, and `scatter` properties. Colors auto-cycle if not specified.

**Available colors:** `blue`, `green`, `orange`, `purple`, `red`, `teal` (muted palette)

#### Available functions

| `fn` | Description |
|------|-------------|
| `sin` | Sine wave (-1 to 1) |
| `cos` | Cosine wave (-1 to 1) |
| `tan` | Tangent (can spike) |
| `square` | x² parabola |
| `sqrt` | Square root |
| `linear` | y = x diagonal |
| `random` | Random values (-1 to 1) |
| `binary` | Sticky 0/1 with contiguous blocks (uptime, on/off) |

#### In context (dashboard card)

```yaml
- Box:
    layout: column
    padding: 16
    outline: thin
    gap: 8
    children:
      - Text: { content: "Power Output", style: caption }
      - Chart: { fn: sin, range: [0, 12], samples: 40, noise: 0.15, width: 250, height: 80 }
```

## Layout System

Flexbox-based autolayout is primary. Absolute positioning is the escape hatch.

### The Spacer Pattern

Instead of a dedicated Spacer primitive, use a growing Box:

```yaml
Box:
  layout: row
  align: center
  children:
    - Text: { content: "Assets", style: h1 }
    - Box: { grow: 1 }           # spacer
    - Button: { label: "New" }
```

### Common Patterns

**Sidebar layout**:
```yaml
Box:
  layout: row
  grow: 1
  children:
    - Box:
        layout: column
        padding: 16
        outline: thin
        children: [...]   # sidebar
    - Box:
        grow: 1
        padding: 24
        children: [...]   # main content
```

**List**:
```yaml
Box:
  layout: column
  gap: 8
  children:
    - ItemRow: { name: "Item 1" }
    - ItemRow: { name: "Item 2" }
```

## Components & Variants

Components enable reuse. Variants handle "state-ish" differences without modeling actual state.

**Define** in `components.yaml`:
```yaml
Button:
  variants:
    default:
      - Box:
          padding: [8, 12]
          outline: thin
          children:
            - Text: { content: "{{label}}", style: body }
    disabled:
      - Box:
          padding: [8, 12]
          outline: dashed
          children:
            - Text: { content: "{{label}}", style: body }
```

**Use** in `wireframe.yaml`:
```yaml
- Button: { label: "Save" }
- Button: { label: "Cancel", variant: disabled }
```

Props use `{{propName}}` substitution. Nested field access is supported: `{{item.label}}`.

### Dynamic Children

Components support two patterns for dynamic content:

#### Array Iteration (`$each` / `$template`)

For rendering lists of similar items from data:

```yaml
# Definition
Dropdown:
  variants:
    expanded:
      - Box:
          layout: column
          children:
            - DropdownTrigger: { label: "{{label}}" }
            - Box:
                outline: thin
                children:
                  $each: options          # array prop name
                  $template:              # repeated for each item
                    - DropdownItem: { label: "{{item}}" }

# Usage - pass array of strings
- Dropdown:
    label: "Status"
    variant: expanded
    options: ["Active", "Pending", "Closed"]
```

The `$each` block iterates over the named prop. Inside `$template`, `{{item}}` refers to each array element. For objects, use `{{item.field}}`.

#### Children Slots (`$children`)

For flexible composition where the caller provides arbitrary children:

```yaml
# Definition
Modal:
  variants:
    default:
      - Box:
          outline: thick
          padding: 24
          layout: column
          gap: 16
          children:
            - Text: { content: "{{title}}", style: h2 }
            - Box:
                children: $children       # slot marker
            - Button: { label: "Close" }

# Usage - pass arbitrary children
- Modal:
    title: "Confirm"
    children:
      - Text: { content: "Are you sure?", style: body }
      - Box:
          layout: row
          gap: 8
          children:
            - Button: { label: "Yes", variant: primary }
            - Button: { label: "No" }
```

**When to use which:**
| Pattern | Use case | Example |
|---------|----------|---------|
| `$each` | Homogeneous lists from data | Dropdown options, nav items, table rows |
| `$children` | Flexible arbitrary content | Modal body, card content, form fields |

## Links & Navigation

Optional links document navigation flow:

```yaml
- Button:
    label: "View Details"
    link: { target: AssetDetail }
```

Flow is a **projection** of drawings, not a constraint. After wireframes stabilize, derive:
- Navigation graph from Frame links
- State variants from Component variants
- Information architecture from repeated layouts

## Constraints

Explicitly excluded to maintain lofi fidelity:

| Excluded | Why |
|----------|-----|
| Arbitrary colors | Use `background: grey` for emphasis; charts have fixed muted palette |
| Multiple fonts | One font, multiple sizes only |
| Custom icon sizes | Icons are fixed at 24px |
| Opacity | Styling concern |
| Border radius | Styling concern |
| Conditional rendering | Use variants instead |

**Exceptions**: `background: grey`, `shadow: true`, Lucide icons, and chart line colors are allowed for structural communication.

### Outline Styles

The only visual variation:
- `none` - invisible container (pure layout)
- `thin` - standard border
- `dashed` - disabled/inactive
- `thick` - emphasis

## Full Example

```yaml
Frame:
  id: AssetList
  size: [1440, 900]
  layout: column
  gap: 24
  padding: 24
  children:
    # Header
    - Box:
        layout: row
        align: center
        children:
          - Text: { content: "Assets", style: h1 }
          - Box: { grow: 1 }
          - Button: { label: "New Asset" }

    # Filters
    - Box:
        layout: row
        gap: 8
        outline: thin
        padding: 12
        children:
          - Text: { content: "Filters", style: body }
          - Button: { label: "Status: Any" }
          - Button: { label: "Type: All" }

    # List
    - Box:
        layout: column
        gap: 8
        children:
          - AssetRow: { name: "Battery Pack A", status: ok }
          - AssetRow: { name: "Battery Pack B", status: warn }
          - AssetRow:
              name: "Battery Pack C"
              status: fail
              link: { target: AssetDetail }
```

## AI Collaboration Model

### AI Excels At
- Spatial edits in symbolic form
- Local rewrites ("make this denser", "add empty state")
- Refactoring (extract component, introduce variant)
- Consistency passes ("headers are inconsistent")

### AI Struggles With
- Premature correctness
- Over-formal state graphs
- Deeply nested behavioral specs

This spec meets AI where it's strong.

### Iteration Patterns

**Edge-case farming**: You provide happy-path screen → AI expands into empty/error/loading variants → You pick which matter

**Consistency linting**: AI checks for inconsistent headers, missing empty states, unreachable frames, layout inconsistencies

**Component extraction**: AI identifies repeated structures and proposes components

**Flow inference**: After drawings stabilize, Frame links → navigation graph, Component variants → implied states

## Development Workflow

1. Read existing wireframe files to understand patterns
2. Edit YAML in `renderer/specs/`
3. Preview changes with `npm run dev`
4. Prefer autolayout over absolute positioning
5. Extract components when patterns repeat
6. Use variants for state differences (empty, error, loading, disabled)

## AI Assistant Guidelines

- Always read existing wireframe files before suggesting changes
- Use the seven primitives (Frame, Box, Text, Icon, Cursor, Map, Chart) and components - no custom elements
- Keep `outline` semantic-free (visual aid only)
- Preserve `{{propName}}` substitution pattern in components
- Suggest variants for state differences, not conditional logic
- Maintain minimalist philosophy - don't add unnecessary complexity
- Prefer autolayout, use absolute positioning only when necessary
- Use Chart with `noise` and `scatter` for realistic placeholder data in dashboards
- Use Icon with Lucide names (kebab-case) for visual elements
- Use Cursor to indicate interaction points and document user flows
- Use Map with trajectory functions for fleet/vehicle tracking interfaces

## Summary

This spec is essentially: **Figma Auto Layout + React flexbox + Lucide icons + function-sampled charts - colors - styling - state**

The right level of abstraction for rapid lofi iteration with AI assistance.
