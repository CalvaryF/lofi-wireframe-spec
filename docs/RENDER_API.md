# Wireframe Render API

## Goal

Create an HTTP endpoint that accepts YAML wireframe specs and returns rendered PNG images. This enables autonomous design workflows where an LLM can:

1. Write a YAML spec
2. POST it to the render endpoint
3. Receive images back
4. Inspect and iterate

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Render Server                          │
│  ┌──────────┐    ┌─────────────┐    ┌──────────────────┐   │
│  │  Express │───▶│ Request     │───▶│ Playwright       │   │
│  │  Server  │    │ Queue       │    │ Browser Pool     │   │
│  └──────────┘    └─────────────┘    └──────────────────┘   │
│       │                                      │              │
│       │              ┌───────────────────────┘              │
│       │              ▼                                      │
│       │         ┌──────────┐    ┌─────────────────────┐    │
│       │         │ Vite Dev │    │ Wireframe App       │    │
│       │         │ Server   │───▶│ (existing renderer) │    │
│       │         └──────────┘    └─────────────────────┘    │
│       │                                      │              │
│       ◀──────────────────────────────────────┘              │
│                    (PNG images)                             │
└─────────────────────────────────────────────────────────────┘
```

## API Design

### `POST /render`

Render a wireframe spec and return images.

**Request:**
```json
{
  "spec": "Frame:\n  id: Login\n  size: [400, 300]\n  ...",
  "components": "Button:\n  variants:\n    ...",
  "mode": "annotated",
  "frames": ["Login", "Dashboard"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `spec` | string | Yes | YAML wireframe specification |
| `components` | string | No | YAML components definition (ephemeral, uses default if omitted) |
| `mode` | string | No | `"frame"` \| `"annotated"` \| `"selections"` (default: `"annotated"`) |
| `frames` | string[] | No | Frame IDs to render (renders all if omitted) |

**Response:**
- `Content-Type: application/zip`
- ZIP file containing PNGs

**Status Codes:**
- `200` - Success, returns ZIP
- `400` - Invalid YAML or spec error
- `503` - Server busy (queue full)

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "queue": 2,
  "browser": "ready"
}
```

## Design Principles

### Stateless & Ephemeral

Each render request is fully self-contained:
- Custom `components` only exist for the duration of that request
- No disk writes, no side effects on the repo's `components.yaml`
- Multiple agents can work with different component sets simultaneously
- Requests are fully reproducible from their inputs

### Non-Destructive

The render API runs alongside the existing app without modification:
- `npm run dev` continues to work for interactive design
- `npm run serve` adds headless API access
- The only app change is optional query param support for loading external specs

## Components

### 1. Express Server (`server/index.ts`)

- Accepts POST requests with YAML
- Validates input
- Adds to request queue
- Returns results or queues position

### 2. Request Queue (`server/queue.ts`)

- FIFO queue for render requests
- Configurable concurrency (default: 1)
- Request timeout handling
- Memory-bounded (reject if queue too long)

### 3. Browser Manager (`server/browser.ts`)

- Launches Playwright browser on startup
- Manages browser context pool
- Handles crashes/restarts
- Cleanup on shutdown

### 4. Renderer (`server/renderer.ts`)

- Writes YAML to temp file
- Navigates Playwright to app
- Waits for frames to render
- Triggers export logic
- Captures images
- Returns blobs

### 5. Vite Integration

Embedded Vite dev server started programmatically for single-process simplicity.

## File Structure

```
server/
├── index.ts          # Entry point, Express setup
├── routes/
│   └── render.ts     # POST /render handler
├── services/
│   ├── browser.ts    # Playwright browser management
│   ├── queue.ts      # Request queue
│   └── renderer.ts   # Core render logic
├── utils/
│   └── tempFiles.ts  # Temp YAML file handling
└── types.ts          # Shared types
```

## Dependencies

```bash
npm install express playwright p-queue archiver tmp
npm install -D @types/express @types/tmp
```

- **express**: HTTP server
- **playwright**: Browser automation
- **p-queue**: Promise-based queue with concurrency control
- **archiver**: ZIP file creation
- **tmp**: Temp file management with auto-cleanup

## Render Flow

```
1. Request arrives at POST /render
2. Validate YAML syntax
3. Add to queue, await turn
4. Write spec to temp file: /tmp/wireframe-{uuid}.yaml
5. Browser navigates to: http://localhost:5173/?spec={uuid}
6. App loads spec from temp file (new query param handler)
7. Wait for frames to render
8. For each frame:
   a. Scroll into view
   b. Wait for 3D components
   c. Capture via existing captureFrame()
9. Bundle PNGs into ZIP
10. Return ZIP, cleanup temp file
```

## Concurrency Model

```
┌─────────────────────────────────────────────┐
│              Request Queue                   │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐                   │
│  │ 4 │ │ 3 │ │ 2 │ │ 1 │ ──▶ Processing    │
│  └───┘ └───┘ └───┘ └───┘                   │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│           Browser Context Pool              │
│  ┌─────────┐                               │
│  │Context 1│ ◀── Currently rendering       │
│  └─────────┘                               │
│  (Can expand to multiple contexts later)    │
└─────────────────────────────────────────────┘
```

Start with concurrency=1 (serial processing). Can expand later with multiple browser contexts.

## Usage

### Starting the Server

```bash
npm run serve
```

1. Starts Vite dev server (port 5173)
2. Launches Playwright browser (headless)
3. Starts Express server (port 3001)
4. Logs: "Render API ready at http://localhost:3001"

### Example Request

```bash
curl -X POST http://localhost:3001/render \
  -H "Content-Type: application/json" \
  -d '{
    "spec": "Frame:\n  id: Login\n  size: [400, 300]\n  children:\n    - Text: { content: \"Welcome\", style: h1 }",
    "mode": "annotated"
  }' \
  --output wireframes.zip

unzip wireframes.zip -d ./output
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | API server port |
| `VITE_PORT` | 5173 | Vite dev server port |
| `CONCURRENCY` | 1 | Parallel renders |
| `QUEUE_MAX` | 10 | Max queued requests |
| `RENDER_TIMEOUT` | 30000 | Per-frame timeout (ms) |
| `HEADLESS` | true | Hide browser window |

## Error Handling

| Error | Response | Action |
|-------|----------|--------|
| Invalid YAML | 400 + parse error | Reject immediately |
| Unknown frame ID | 400 + missing frames | Reject immediately |
| Render timeout | 500 + timeout | Kill context, retry once |
| Browser crash | 503 + retry later | Restart browser, requeue |
| Queue full | 503 + queue position | Reject with retry hint |

## Implementation Phases

### Phase 1: Basic Server
- Express server with POST /render
- Single browser, no queue
- Hardcoded components.yaml
- Returns single PNG

### Phase 2: Full Render Modes
- Support all three modes (frame/annotated/selections)
- ZIP responses
- Custom components support
- Frame filtering

### Phase 3: Queue & Concurrency
- Add p-queue
- Health endpoint
- Graceful shutdown
- Error recovery

### Phase 4: Production Hardening
- Logging
- Metrics
- Docker container
- CLI wrapper

## Security Considerations

**Local use (current):**
- Binds to localhost only
- No authentication required

**Network exposure (future):**
- Rate limiting
- API key authentication
- Request size limits
- Sandboxed browser context
