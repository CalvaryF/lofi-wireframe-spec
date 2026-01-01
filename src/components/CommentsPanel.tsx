import type { Comment } from '../types'
import { useCommentContext } from '../contexts/CommentContext'

interface CommentsPanelProps {
  comments: Comment[]
  frameId: string
}

export function CommentsPanel({ comments, frameId }: CommentsPanelProps) {
  const {
    setHoveredComment,
    isCommentHovered,
    isCommentSelected,
    setSelectedComment,
    deleteComment,
  } = useCommentContext()

  if (comments.length === 0) return null

  return (
    <div className="comments-panel">
      <div className="comments-panel-title">Comments</div>
      {comments.map(comment => {
        const isHovered = isCommentHovered(frameId, comment.elementId)
        const isSelected = isCommentSelected(frameId, comment.elementId)

        return (
          <div
            key={comment.elementId}
            className={`comment-item ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''}`}
            onMouseEnter={() => setHoveredComment({ frameId, elementId: comment.elementId })}
            onMouseLeave={() => setHoveredComment(null)}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedComment({ frameId, elementId: comment.elementId })
            }}
          >
            <div className="comment-item-header">
              <code className="comment-item-element-id">{comment.elementId}</code>
              <button
                className="comment-item-delete"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteComment(frameId, comment.elementId)
                }}
                title="Delete comment"
              >
                ×
              </button>
            </div>
            <div className="comment-item-text">{comment.text}</div>
          </div>
        )
      })}
    </div>
  )
}
