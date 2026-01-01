import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import type { Comment } from '../types'

// Extended comment with path info for generated IDs
export interface CommentWithPath extends Comment {
  path: string  // e.g., "0-1-2"
  isGenerated: boolean  // true if ID was auto-generated
}

interface PendingComment {
  frameId: string
  path: string
  existingId?: string
  elementType: string
}

interface CommentContextValue {
  // Comment mode toggle
  commentMode: boolean
  setCommentMode: (mode: boolean) => void

  // Pending comment (element clicked, waiting for text input)
  pendingComment: PendingComment | null
  setPendingComment: (pending: PendingComment | null) => void

  // Hovered comment (for highlighting)
  hoveredComment: { frameId: string; elementId: string } | null
  setHoveredComment: (comment: { frameId: string; elementId: string } | null) => void

  // Selected comment
  selectedComment: { frameId: string; elementId: string } | null
  setSelectedComment: (comment: { frameId: string; elementId: string } | null) => void

  // Comments data per frame (with path info)
  comments: Map<string, CommentWithPath[]>

  // Get comments for a specific frame
  getCommentsForFrame: (frameId: string) => CommentWithPath[]

  // Get comment for a specific element
  getCommentForElement: (frameId: string, elementId: string) => CommentWithPath | undefined

  // Get comment by path
  getCommentByPath: (frameId: string, path: string) => CommentWithPath | undefined

  // Check if element has a comment
  hasComment: (frameId: string, elementId: string) => boolean

  // Check if comment is hovered
  isCommentHovered: (frameId: string, elementId: string) => boolean

  // Check if comment is selected
  isCommentSelected: (frameId: string, elementId: string) => boolean

  // Mutations - updated signature for path-based comments
  addComment: (frameId: string, path: string, elementType: string, text: string, existingId?: string) => void
  updateComment: (frameId: string, elementId: string, text: string) => void
  deleteComment: (frameId: string, elementId: string) => void

  // Initialize comments from parsed frames
  initializeComments: (frameComments: Map<string, Comment[]>) => void

  // Get all comments as a map (for saving)
  getAllComments: () => Map<string, CommentWithPath[]>

  // Get generated IDs mapping (path -> generatedId) for YAML injection
  getGeneratedIds: (frameId: string) => Map<string, string>

  // Mark as dirty (unsaved changes)
  isDirty: boolean
  setDirty: (dirty: boolean) => void
}

const CommentContext = createContext<CommentContextValue | null>(null)

export function CommentProvider({ children }: { children: ReactNode }) {
  const [commentMode, setCommentMode] = useState(false)
  const [pendingComment, setPendingComment] = useState<PendingComment | null>(null)
  const [hoveredComment, setHoveredComment] = useState<{ frameId: string; elementId: string } | null>(null)
  const [selectedComment, setSelectedComment] = useState<{ frameId: string; elementId: string } | null>(null)
  const [comments, setComments] = useState<Map<string, CommentWithPath[]>>(new Map())
  const [isDirty, setDirty] = useState(false)

  // Counter for generating unique IDs
  const idCounterRef = useRef(1)

  // Generate a unique ID for an element
  const generateId = useCallback((elementType: string): string => {
    const id = `${elementType}-${idCounterRef.current}`
    idCounterRef.current++
    return id
  }, [])

  const getCommentsForFrame = useCallback(
    (frameId: string): CommentWithPath[] => {
      return comments.get(frameId) || []
    },
    [comments]
  )

  const getCommentForElement = useCallback(
    (frameId: string, elementId: string): CommentWithPath | undefined => {
      const frameComments = comments.get(frameId) || []
      return frameComments.find(c => c.elementId === elementId)
    },
    [comments]
  )

  const getCommentByPath = useCallback(
    (frameId: string, path: string): CommentWithPath | undefined => {
      const frameComments = comments.get(frameId) || []
      return frameComments.find(c => c.path === path)
    },
    [comments]
  )

  const hasComment = useCallback(
    (frameId: string, elementId: string): boolean => {
      const frameComments = comments.get(frameId) || []
      return frameComments.some(c => c.elementId === elementId)
    },
    [comments]
  )

  const isCommentHovered = useCallback(
    (frameId: string, elementId: string): boolean => {
      if (!hoveredComment) return false
      return hoveredComment.frameId === frameId && hoveredComment.elementId === elementId
    },
    [hoveredComment]
  )

  const isCommentSelected = useCallback(
    (frameId: string, elementId: string): boolean => {
      if (!selectedComment) return false
      return selectedComment.frameId === frameId && selectedComment.elementId === elementId
    },
    [selectedComment]
  )

  const addComment = useCallback(
    (frameId: string, path: string, elementType: string, text: string, existingId?: string) => {
      setComments(prev => {
        const next = new Map(prev)
        const frameComments = [...(next.get(frameId) || [])]

        // Check if comment already exists for this path
        const existingIndex = frameComments.findIndex(c => c.path === path)
        if (existingIndex >= 0) {
          // Update existing comment
          frameComments[existingIndex] = {
            ...frameComments[existingIndex],
            text
          }
        } else {
          // Generate ID if not provided
          const elementId = existingId || generateId(elementType)
          const isGenerated = !existingId

          frameComments.push({
            elementId,
            text,
            path,
            isGenerated
          })
        }
        next.set(frameId, frameComments)
        return next
      })
      setDirty(true)
    },
    [generateId]
  )

  const updateComment = useCallback(
    (frameId: string, elementId: string, text: string) => {
      setComments(prev => {
        const next = new Map(prev)
        const frameComments = [...(next.get(frameId) || [])]
        const index = frameComments.findIndex(c => c.elementId === elementId)
        if (index >= 0) {
          frameComments[index] = { ...frameComments[index], text }
          next.set(frameId, frameComments)
        }
        return next
      })
      setDirty(true)
    },
    []
  )

  const deleteComment = useCallback(
    (frameId: string, elementId: string) => {
      setComments(prev => {
        const next = new Map(prev)
        const frameComments = (next.get(frameId) || []).filter(c => c.elementId !== elementId)
        if (frameComments.length > 0) {
          next.set(frameId, frameComments)
        } else {
          next.delete(frameId)
        }
        return next
      })
      setDirty(true)
      // Clear selection if deleting selected comment
      if (selectedComment?.frameId === frameId && selectedComment?.elementId === elementId) {
        setSelectedComment(null)
      }
    },
    [selectedComment]
  )

  const initializeComments = useCallback(
    (frameComments: Map<string, Comment[]>) => {
      // Convert Comment[] to CommentWithPath[] - for loaded comments, we don't have path info
      // They will be matched by elementId instead
      const converted = new Map<string, CommentWithPath[]>()
      frameComments.forEach((comments, frameId) => {
        converted.set(frameId, comments.map(c => ({
          ...c,
          path: '', // Empty path for loaded comments - they'll be matched by elementId
          isGenerated: false // Loaded comments have existing IDs
        })))
      })
      setComments(converted)
      setDirty(false)
    },
    []
  )

  const getAllComments = useCallback(
    (): Map<string, CommentWithPath[]> => {
      return new Map(comments)
    },
    [comments]
  )

  const getGeneratedIds = useCallback(
    (frameId: string): Map<string, string> => {
      const result = new Map<string, string>()
      const frameComments = comments.get(frameId) || []
      frameComments.forEach(c => {
        if (c.isGenerated && c.path) {
          result.set(c.path, c.elementId)
        }
      })
      return result
    },
    [comments]
  )

  return (
    <CommentContext.Provider
      value={{
        commentMode,
        setCommentMode,
        pendingComment,
        setPendingComment,
        hoveredComment,
        setHoveredComment,
        selectedComment,
        setSelectedComment,
        comments,
        getCommentsForFrame,
        getCommentForElement,
        getCommentByPath,
        hasComment,
        isCommentHovered,
        isCommentSelected,
        addComment,
        updateComment,
        deleteComment,
        initializeComments,
        getAllComments,
        getGeneratedIds,
        isDirty,
        setDirty,
      }}
    >
      {children}
    </CommentContext.Provider>
  )
}

export function useCommentContext() {
  const context = useContext(CommentContext)
  if (!context) {
    throw new Error('useCommentContext must be used within CommentProvider')
  }
  return context
}
