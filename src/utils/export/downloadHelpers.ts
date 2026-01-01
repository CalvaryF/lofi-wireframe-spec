import { saveAs } from 'file-saver'

/**
 * Download a blob as a file.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  saveAs(blob, filename)
}

/**
 * Generate a safe filename from a frame ID.
 * Replaces spaces and special characters with underscores.
 */
export function sanitizeFilename(frameId: string): string {
  return frameId.replace(/[^a-zA-Z0-9-_]/g, '_')
}

/**
 * Generate a filename for a frame export.
 */
export function generateFilename(frameId: string, suffix?: string, isZip?: boolean): string {
  const sanitized = sanitizeFilename(frameId)
  const suffixPart = suffix ? `_${suffix}` : ''
  const extension = isZip ? '.zip' : '.png'
  return `${sanitized}${suffixPart}${extension}`
}
