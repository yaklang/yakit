import { useMemoizedFn } from 'ahooks'
import { useCurrentStore } from './useCurrentDataBySession'

function useAIItemKind() {
  const store = useCurrentStore()

  const getKind = useMemoizedFn((token: string) => {
    const state = store.getState()
    if (state.items[token]) return 'item'
    if (state.groups[token]) return 'group'
    if (state.tasks[token]) return 'task'
    return null
  })
  return getKind
}

export default useAIItemKind
