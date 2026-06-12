import { useEffect, useMemo } from 'react'
import useMcpStream, { localMcpDefalutUrl, mcpStreamHooks } from '@/components/layout/hooks/useMcp/useMcp'
import { bindExternalStoreHook, createExternalStore } from '@/utils/createExternalStore'

const defaultMcpStreamState: mcpStreamHooks = {
  mcpStreamInfo: {
    mcpUrl: localMcpDefalutUrl,
    mcpCurrent: undefined,
    mcpServerUrl: '',
  },
  mcpStreamEvent: {
    onCancel: () => {},
    onStart: () => {},
    onSetMcpUrl: () => {},
  },
}

const store = createExternalStore<mcpStreamHooks>(defaultMcpStreamState)

export const yakMcpStreamStore = {
  subscribe: store.subscribe,
  getSnapshot: store.getSnapshot,

  setMcpStream(mcp: mcpStreamHooks) {
    store.setSnapshot(() => mcp)
  },
}

export const useYakMcpStream = bindExternalStoreHook(store)

/** 在 UILayout 中调用，将 useMcpStream 状态同步到全局 store */
export function useSyncYakMcpStream(props: Parameters<typeof useMcpStream>[0] = {}) {
  const [mcpStreamInfo, mcpStreamEvent] = useMcpStream(props)

  useEffect(() => {
    yakMcpStreamStore.setMcpStream({ mcpStreamInfo, mcpStreamEvent })
  }, [mcpStreamInfo, mcpStreamEvent])

  return useMemo(
    () => ({
      mcpStreamInfo,
      mcpStreamEvent,
    }),
    [mcpStreamInfo, mcpStreamEvent],
  )
}
