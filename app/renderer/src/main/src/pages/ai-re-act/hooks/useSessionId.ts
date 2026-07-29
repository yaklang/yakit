import { useMemoizedFn } from 'ahooks'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import { createActiveChatSessionId } from '@/pages/ai-agent/utils'

function useSessionId() {
  const { activeChat, setting } = useAIAgentStore()
  const getSession = useMemoizedFn((sessionId?: string) => {
    const sessionID = activeChat?.SessionID || '' // 判断历史还是新建
    let session = ''
    if (!!sessionID) {
      session = sessionID
    } else if (!!setting.TimelineSessionID) {
      session = setting.TimelineSessionID
    } else {
      session = sessionId || createActiveChatSessionId()
    }
    return session
  })
  return { getSession } as const
}

export default useSessionId
