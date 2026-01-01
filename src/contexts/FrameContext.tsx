import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface FrameContextValue {
  revision: number
  notifyFrameChange: () => void
}

const FrameContext = createContext<FrameContextValue>({
  revision: 0,
  notifyFrameChange: () => {}
})

export function FrameProvider({ children }: { children: ReactNode }) {
  const [revision, setRevision] = useState(0)

  const notifyFrameChange = useCallback(() => {
    setRevision(r => r + 1)
  }, [])

  return (
    <FrameContext.Provider value={{ revision, notifyFrameChange }}>
      {children}
    </FrameContext.Provider>
  )
}

export function useFrameRevision() {
  return useContext(FrameContext).revision
}

export function useNotifyFrameChange() {
  return useContext(FrameContext).notifyFrameChange
}
