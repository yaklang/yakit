import { useCallback, useEffect, useRef } from 'react'
import { useSessionTab } from './SessionTabsContext'

/** Imperative confirmations belong to the pane that opened them, never another active session. */
export function useSessionModal() {
  const { active } = useSessionTab()
  const activeRef = useRef(active)
  activeRef.current = active
  const current = useRef<{ destroy: () => void }>()
  const close = useCallback(() => {
    current.current?.destroy()
    current.current = undefined
  }, [])
  useEffect(() => {
    if (!active) close()
    return close
  }, [active, close])
  const ownDialog = useCallback(
    (dialog?: { destroy: () => void }) => {
      close()
      if (activeRef.current) current.current = dialog
      else dialog?.destroy()
    },
    [close],
  )
  return { active, ownDialog }
}
