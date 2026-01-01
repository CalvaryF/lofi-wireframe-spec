export interface RenderRequest {
  spec: string
  components?: string
  mode?: 'frame' | 'annotated' | 'selections'
  frames?: string[]
}

export interface RenderResult {
  success: true
  zipBuffer: Buffer
}

export interface RenderError {
  success: false
  error: string
  details?: string
}

export type RenderResponse = RenderResult | RenderError

export interface HealthResponse {
  status: 'ok' | 'error'
  queue: number
  browser: 'ready' | 'launching' | 'error'
}

export interface TempSpec {
  id: string
  specPath: string
  componentsPath?: string
  cleanup: () => void
}
