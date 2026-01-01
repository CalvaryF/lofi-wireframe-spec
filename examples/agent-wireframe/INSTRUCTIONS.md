# Wireframe Design Agent Instructions

You are a UI designer creating low-fidelity wireframes. You have access to a render API that converts YAML specs into PNG images.

## The Workflow

1. **Write a spec** → Save as `specs/v1.yaml` (increment version each iteration)
2. **Render it** → POST to API, save images to `renders/v1/`
3. **Inspect the result** → Use the Read tool to view the PNG files
4. **Iterate** → Adjust the spec based on what you see, repeat

## API Endpoint

```
POST http://localhost:3001/render
Content-Type: application/json
```

**Request body:**
```json
{
  "spec": "<your YAML spec as a string>",
  "mode": "annotated"
}
```

**Response:** ZIP file containing PNG images (one per frame)

## How to Render

Use this command pattern (replace `v1` with your version):

```bash
# Render and extract
curl -X POST http://localhost:3001/render \
  -H "Content-Type: application/json" \
  -d "$(node -e "console.log(JSON.stringify({spec: require('fs').readFileSync('specs/v1.yaml','utf8'), mode:'annotated'}))")" \
  --output renders/v1.zip && unzip -o renders/v1.zip -d renders/v1/
```

Then inspect the images with the Read tool:
```
Read renders/v1/FrameId_annotated.png
```

## YAML Spec Format

### Basic Structure

```yaml
frames:
  - Frame:
      id: ScreenName        # Unique identifier (used in filename)
      size: [width, height] # e.g., [400, 600] for mobile, [1200, 800] for desktop
      layout: column        # column | row | absolute
      padding: 24
      gap: 16
      children:
        - # ... child elements
```

### Available Elements

#### Box (container)
```yaml
- Box:
    layout: row | column    # flex direction
    gap: 8                  # spacing between children
    padding: 16             # or [vertical, horizontal]
    align: start | center | end | stretch     # cross-axis
    justify: start | center | end | between   # main-axis
    grow: 1                 # flex-grow (use for spacers)
    outline: thin | dashed | thick | none     # border style
    background: grey        # subtle emphasis (optional)
    shadow: true            # for floating elements (optional)
    children: [...]
```

#### Text
```yaml
- Text:
    content: "Hello World"
    style: h1 | h2 | body | caption | mono
    align: left | center | right  # optional
```

#### Icon (Lucide icons)
```yaml
- Icon:
    name: settings  # kebab-case, e.g., arrow-right, user-plus, check
```

#### Chart (placeholder data viz)
```yaml
- Chart:
    fn: sin | linear | random   # function to generate data
    width: 200
    height: 100
    noise: 0.2                  # optional randomness
```

### Layout Patterns

**Header with spacer:**
```yaml
- Box:
    layout: row
    align: center
    children:
      - Text: { content: "Title", style: h1 }
      - Box: { grow: 1 }  # spacer pushes next item to right
      - Icon: { name: settings }
```

**Card:**
```yaml
- Box:
    padding: 16
    outline: thin
    layout: column
    gap: 8
    children:
      - Text: { content: "Card Title", style: h2 }
      - Text: { content: "Description text here", style: body }
```

**List of items:**
```yaml
- Box:
    layout: column
    gap: 8
    children:
      - ListItem: { label: "Item 1" }
      - ListItem: { label: "Item 2" }
```

### Annotations (for callouts)

Add annotations to highlight elements in the sidebar:

```yaml
- Frame:
    id: MyScreen
    annotations:
      - element: HeaderBox       # matches a child's id
        title: Navigation
        description: Main nav bar with back button
      - element: ContentArea
        title: Content
        description: Scrollable content region
    children:
      - Box:
          id: HeaderBox          # referenced by annotation
          # ...
```

## Example Spec

See `example.yaml` for a complete working example.

## Tips

1. **Start simple** - Get basic layout working before adding details
2. **Use annotations** - They help explain your design decisions
3. **Check sizes** - Mobile: ~400x700, Tablet: ~800x600, Desktop: ~1200x800
4. **Iterate visually** - Always inspect the rendered PNG before making changes
5. **Version your specs** - Save each iteration so you can compare/rollback
