import { useState, useRef, useEffect } from 'react'
import type { CaptureMode } from '../utils/export'

export interface ExportOptions {
  mode: CaptureMode
  asZip?: boolean
  batch?: boolean  // Export all frames
}

interface ExportDropdownProps {
  onExport: (options: ExportOptions) => void
  disabled?: boolean
}

export function ExportDropdown({ onExport, disabled }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close dropdown on escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleExport = (options: ExportOptions) => {
    setIsOpen(false)
    onExport(options)
  }

  return (
    <div className="export-dropdown-container" ref={dropdownRef}>
      <button
        className={`toolbar-button ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        title="Export frame (E)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>

      {isOpen && (
        <div className="export-dropdown">
          <button onClick={() => handleExport({ mode: 'frame' })}>
            Export frame
          </button>
          <button onClick={() => handleExport({ mode: 'annotated' })}>
            Export with annotations
          </button>
          <button onClick={() => handleExport({ mode: 'selections', asZip: true })}>
            Export with selections (ZIP)
          </button>
          <div className="export-dropdown-divider" />
          <button onClick={() => handleExport({ mode: 'frame', batch: true })}>
            Export all frames (ZIP)
          </button>
          <button onClick={() => handleExport({ mode: 'annotated', batch: true })}>
            Export all annotated (ZIP)
          </button>
          <button onClick={() => handleExport({ mode: 'selections', batch: true })}>
            Export all with selections (ZIP)
          </button>
        </div>
      )}
    </div>
  )
}
