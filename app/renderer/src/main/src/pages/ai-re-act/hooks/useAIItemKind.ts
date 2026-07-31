import { useMemoizedFn } from 'ahooks'
import { useCurrentStore } from './useCurrentDataBySession'
import { ReActChatItemMeta, ReActChatGroupMeta, ReActChatTaskMeta } from './aiRender'

function useAIItemKind() {
  const store = useCurrentStore()

  const getKind = useMemoizedFn((token: string) => {
    const state = store.getState()
    return getAIItemKind(state, token)
  })
  return getKind
}

export default useAIItemKind

export type AIItemKind = 'item' | 'group' | 'task'

export function getAIItemKind(
  state: {
    items: Record<string, ReActChatItemMeta>
    groups: Record<string, ReActChatGroupMeta>
    tasks: Record<string, ReActChatTaskMeta>
  },
  token: string,
): AIItemKind | null {
  if (state.items[token]) return 'item'
  if (state.groups[token]) return 'group'
  if (state.tasks[token]) return 'task'
  return null
}
