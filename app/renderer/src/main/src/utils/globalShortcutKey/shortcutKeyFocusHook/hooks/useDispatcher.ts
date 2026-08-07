import { useContext } from 'react'
import ShortcutKeyFocusContext, { type ShortcutKeyFocusContextDispatcher } from './ShortcutKeyFocusContext'

export default function useFocusDispatcher(): ShortcutKeyFocusContextDispatcher {
  const { dispatcher } = useContext(ShortcutKeyFocusContext)
  return dispatcher
}
