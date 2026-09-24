import { useMemoizedFn } from 'ahooks'
import type { HandleStartParams } from '@/pages/ai-agent/aiAgentChat/type'
import type { AISession } from '@/pages/ai-agent/type/aiChat'
import type { AIChatTextareaRefProps } from '@/pages/ai-agent/template/type'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { formatAIAgentSetting, getAIReActRequestParams } from '@/pages/ai-agent/utils'
import { AISourceEnum, type AIInputEvent, type AIStartParams } from './grpcApi'
import type { AIHandleStartResProps, AIReActChatProps } from '../aiReActChat/AIReActChatType'
import { randomString } from '@/utils/randomUtil'
import emiter from '@/utils/eventBus/eventBus'

/**
 * 欢迎页和聊天组件共用的会话启动入口，负责组装请求及处理绑定后的 UI 更新。
 * 调用时固定目标和参数，后续异步准备、绑定回调不再根据当前选中会话决定请求归属。
 * 已建联会话的自由输入由调用方的发送逻辑处理，不经过这里。
 */
export function useStartAIChat({
  startRequest,
  setMention,
}: {
  /** 各业务入口在建联前补充请求参数，并提供正式会话绑定后的回调。 */
  startRequest?: AIReActChatProps['startRequest']
  /** 聊天输入框存在时，同步本次请求的 focusMode；欢迎页直接启动时可不提供。 */
  setMention?: AIChatTextareaRefProps['setMention']
} = {}) {
  const { activeChat } = useAIAgentStore()
  const { getSetting, onStart, setActiveChat } = useAIAgentDispatcher()
  return useMemoizedFn((value: HandleStartParams) => {
    // value.sessionId 是输入草稿 ID，用于图片归档；正式业务 ID 来自下面解析出的 target。
    const { qs, sessionId, enabledCapabilities } = value
    // 优先使用调用方固定的意图；未指定时仅在本次调用开始处读取 activeChat。
    // 后续 startRequest 即使异步完成，也继续使用这里捕获的目标。
    const target =
      value.target ??
      (activeChat?.SessionID ? { kind: 'resume' as const, sessionId: activeChat.SessionID } : { kind: 'new' as const })
    const sessionID = target.kind === 'resume' ? target.sessionId : ''

    // 提交时读取最新配置并组装本次请求，避免后续切换页面改变请求参数的取值来源。
    const source = getSetting().Source ?? AISourceEnum.aiAgent
    const formattedSetting = formatAIAgentSetting(getSetting())
    const request: AIStartParams = {
      ...formattedSetting,
      UserQuery: qs,
      CoordinatorId: '',
      Sequence: 1,
      PreferSessionCachedConfig: true,
      Source: source,
      EnabledCapabilities: enabledCapabilities,
    }

    // 历史会话携带正式 ID 并优先复用会话配置；新会话清除可能残留的 ID，交由引擎分配。
    if (sessionID) request.TimelineSessionID = sessionID
    else {
      delete request.TimelineSessionID
      request.PreferSessionCachedConfig = false
    }
    const { attachedResourceInfo } = getAIReActRequestParams(value)
    // 这里只构造启动事件；Controller 在完成新会话绑定后负责发送首问。
    const aiInputEvent: AIInputEvent = {
      IsStart: true,
      Params: {
        ...request,
      },
      AttachedResourceInfo: attachedResourceInfo,
      FocusModeLoop: value.focusMode,
    }
    const onStartChat = (res: AIHandleStartResProps) => {
      const { params, extraParams, onChat, onSessionBound } = res
      // token 标识本轮 IPC/gRPC 连接，不是后端 sessionId；绑定后也作为 UI 的稳定 viewKey。
      let streamToken = ''
      if (!sessionID) onChat?.()
      setMention?.({
        mentionId: params.FocusModeLoop || randomString(8),
        mentionType: 'focusMode',
        mentionName: params.FocusModeLoop || '',
      })
      onStart({
        kind: sessionID ? 'resume' : 'new',
        sessionId: sessionID || undefined,
        draftId: sessionId,
        params,
        onLinkStart: (token) => {
          streamToken = token
        },
        onLinkSuccess: (id, foreground = true) => {
          // 新建和历史恢复都通知业务入口建立订阅；历史会话已有列表项，不重复添加。
          onSessionBound?.(id)
          if (sessionID) return
          // 正式 ID 到达后再创建列表记录，避免把临时连接 token 当作业务会话 ID。
          const newChat: AISession = {
            Id: extraParams?.chatId || id,
            SessionID: id,
            viewKey: streamToken,
            Title: qs || `AI Agent - ${new Date().toLocaleString()}`,
            question: qs,
            CreatedAt: Date.now(),
            UpdatedAt: Date.now(),
            LastUsedAt: Date.now(),
            // 保存后续恢复使用的参数，清空首问，避免恢复时把它当作新的提交。
            StartParams: { ...params.Params, TimelineSessionID: id, UserQuery: '' },
            TitleInitialized: false,
            Source: request.Source ?? 'ai',
            isCreate: true,
          }
          // 用户已切走时只更新历史列表；仍在查看本次提交时，才激活绑定后的会话。
          if (foreground) setActiveChat(newChat)
          emiter.emit(
            'sessionData',
            JSON.stringify({ type: 'prependSession', payload: { ...newChat, isCreate: false } }),
          )
        },
      })
    }
    if (startRequest) {
      // 保留 Fuzzer、History 等入口的请求加工和绑定订阅；启动目标仍使用上面捕获的值。
      startRequest({
        params: aiInputEvent,
      })
        .then((res) => {
          onStartChat(res)
        })
        .catch(() => {
          // 沿用原有回退行为：异步链路失败时尝试使用未经业务加工的启动参数。
          onStartChat({
            params: aiInputEvent,
          })
        })
    } else {
      onStartChat({
        params: aiInputEvent,
      })
    }
  })
}
