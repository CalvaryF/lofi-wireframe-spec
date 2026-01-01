import { useState, useRef, useEffect } from 'react'

interface CommentInputModalProps {
  position: { x: number; y: number }
  onSave: (text: string) => void
  onCancel: () => void
}

export function CommentInputModal({
  position,
  onSave,
  onCancel,
}: CommentInputModalProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (trimmed) {
      onSave(trimmed)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    }
    // Cmd/Ctrl+Enter to save
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      const trimmed = text.trim()
      if (trimmed) {
        onSave(trimmed)
      }
    }
  }

  return (
    <div
      className="comment-input-inline"
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
      }}
      onClick={e => e.stopPropagation()}
    >
      <form onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="comment-input-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add comment..."
          rows={2}
        />
        <div className="comment-input-actions">
          <button type="button" className="comment-input-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="comment-input-save" disabled={!text.trim()}>
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
