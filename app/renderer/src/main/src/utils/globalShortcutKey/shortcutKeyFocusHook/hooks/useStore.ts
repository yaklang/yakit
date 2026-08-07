import { useContext } from 'react'
import ShortcutKeyFocusContext, { type ShortcutKeyFocusContextStore } from './ShortcutKeyFocusContext'

export default function useFocusContextStore(): ShortcutKeyFocusContextStore {
  const { store } = useContext(ShortcutKeyFocusContext)
  return store
}
