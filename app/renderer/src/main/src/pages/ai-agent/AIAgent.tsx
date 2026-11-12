import type React from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { AIAgentProps, AIAgentSetting, ActiveChatAction } from './aiAgentType'
import { AIAgentSideList } from './AIAgentSideList'
import AIAgentContext from './useContext/AIAgentContext'
import type { AIAgentContextDispatcher, AIAgentContextStore } from './useContext/AIAgentContext'
import { getRemoteValue } from '@/utils/kv'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import useGetSetState from '../pluginHub/hooks/useGetSetState'
import type { AISession } from './type/aiChat'
import { useDebounceFn, useInViewport, useMemoizedFn, useRequest, useUpdateEffect } from 'ahooks'
import {
  AIAgentSettingDefault,
  createWelcomeChat,
  SwitchAIAgentTabEventEnum,
  YakitAIAgentPageID,
} from './defaultConstant'
import cloneDeep from 'lodash/cloneDeep'
import omit from 'lodash/omit'
import { grpcQueryAISession } from './grpc'
import {
  applyAIAgentChatSettingBroadcast,
  applyAIAgentChatSettingSessionDefaults,
  loadAIAgentChatSetting,
  persistAIAgentChatSetting,
  serializeAIAgentChatSetting,
} from './utils/aiAgentChatSettingCache'
import { AIAgentChat } from './aiAgentChat/AIAgentChat'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { loadRemoteHistory } from './components/aiFileSystemList/store/useHistoryFolder'
import { initCustomFolderStore } from './components/aiFileSystemList/store/useCustomFolder'
import type { KnowledgeBaseContentProps } from '../KnowledgeBase/TKnowledgeBase'
import { useKnowledgeBase } from '../KnowledgeBase/hooks/useKnowledgeBase'
import { failed } from '@/utils/notification'
import { mergeKnowledgeBaseList } from '../KnowledgeBase/utils'

import emiter from '@/utils/eventBus/eventBus'
import styles from './AIAgent.module.scss'
import { AIBottomSideBar } from './aiBottomSideBar/AIBottomSideBar'
import { SplitView } from '../yakRunner/SplitView/SplitView'
import { AIBottomDetails } from './aiBottomDetails/AIBottomDetails'

import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useChatIPC } from '../ai-re-act/hooks/useChatIPC'
import { YakitRoute } from '@/enums/yakitRoute'
import { globalSessionEngine } from '../ai-re-act/hooks/ChatMultiSessionController'
import { usePageInfo } from '@/store/pageInfo'
import { YakitRouteToPageInfo } from '@/routes/newRoute'
import { syncAIAgentPageInfo } from './utils/syncAIAgentPageInfo'
import { isChatSession } from './utils/isChatSession'

const { ipcRenderer } = window.require('electron')

export const AIAgent: React.FC<AIAgentProps> = (props) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const pageId = props.pageId || YakitRoute.AI_Agent
  // 当前展示对话
  const [activeChat, updateActiveChat] = useState<AISession>(() => props.initialSession || createWelcomeChat())
  const getInitialSetting = () => {
    if (!activeChat.isDraftSession || !globalSessionEngine.sessionStores.getState().has(activeChat.SessionID)) return
    return cloneDeep(globalSessionEngine.ensureSession(activeChat.SessionID).request)
  }
  // 本轮渲染读取的欢迎会话配置，用于页面初始化及跳过全局缓存覆盖。
  const initialSetting = getInitialSetting()
  // #region ai-agent页面全局缓存
  // ai-agent-chat 全局配置
  const [setting, setSetting, getSetting] = useGetSetState<AIAgentSetting>(
    initialSetting ?? cloneDeep(AIAgentSettingDefault),
  )
  const lastInitializedSettingRef = useRef<AIAgentSetting>()
  // 仅记录本页刚创建并绑定的会话，不使用缓存中可能残留的 isCreate 标记。
  const locallyCreatedSessionIdRef = useRef<string>()

  /**同步页面标签和历史列表的会话标题 */
  useEffect(() => {
    if (!isChatSession(activeChat)) return
    const sessionId = activeChat.SessionID
    globalSessionEngine.ensureSession(sessionId)
    const bindTitle = () => {
      const store = globalSessionEngine.sessionStores.getState().get(sessionId)
      // 收尾卸池后等待重连注册新实例，不创建占位 store。
      if (!store) return
      const { rawData } = globalSessionEngine.ensureSession(sessionId)
      const syncTitle = () => {
        syncAIAgentPageInfo({ sessionId, title: rawData.sessionTitle || '' })
      }
      const unsubscribe = store.subscribe((state, prevState) => {
        if (state.sessionTitleUpdate === prevState.sessionTitleUpdate) return
        syncTitle()
      })
      // 连接成功后的同步回放可能早于订阅，补齐已有标题。
      syncTitle()
      return unsubscribe
    }
    let unsubscribeTitle = bindTitle()
    const unsubscribeStores = globalSessionEngine.sessionStores.subscribe((stores, prevStores) => {
      if (stores.get(sessionId) === prevStores.get(sessionId)) return
      unsubscribeTitle?.()
      unsubscribeTitle = bindTitle()
    })
    return () => {
      unsubscribeStores()
      unsubscribeTitle?.()
    }
  }, [activeChat?.SessionID, activeChat?.isDraftSession])

  const [show, setShow] = useState<boolean>(false)
  const [sideRatio, setSideRatio] = useState('360px')
  const [pageWidth, setPageWidth] = useState(0)
  const sideMinWidth = show ? 260 : 24
  // 展开侧栏不会改变页面总宽度，按剩余空间放宽聊天区的最小宽度。
  const chatMinWidth = pageWidth > 0 ? Math.max(0, Math.min(680, pageWidth - sideMinWidth - (show ? 1 : 0))) : 680

  const sideHiddenModeRef = useRef<string>('false')

  const { initialize: initializeKnowledgeBase, knowledgeBases } = useKnowledgeBase()
  const agentRef = useRef<HTMLDivElement>(null)
  const [inViewPort = true] = useInViewport(agentRef)

  // 宽度过窄时收起侧栏，避免与主区争抢空间；与大屏共用同一套 ResizeBox 拖拽布局
  useEffect(() => {
    const el = agentRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    let skipFirstClose = true
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width
      if (!width) return
      setPageWidth(width)
      if (skipFirstClose) {
        skipFirstClose = false
        return
      }
      if (width < 1230) setShow((prev) => (prev ? false : prev))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 缓存全局配置数据
  useUpdateEffect(() => {
    // 初始化只恢复当前页面配置，不更新引擎或写回全局缓存。
    if (setting === lastInitializedSettingRef.current) return
    // 只有配置变化了才更新，SessionID不管
    if (activeChat.SessionID) {
      const { RuntimeContextSizeLimit, ...config } = getSetting()
      const sessionLimit = isChatSession(activeChat)
        ? activeChat.StartParams?.RuntimeContextSizeLimit
        : RuntimeContextSizeLimit
      globalSessionEngine.updateSessionConfig(activeChat.SessionID, {
        ...config,
        ...(sessionLimit !== undefined ? { RuntimeContextSizeLimit: sessionLimit } : {}),
      })
    }
    persistAIAgentChatSetting(getSetting())
  }, [setting, activeChat?.StartParams?.RuntimeContextSizeLimit])

  const { onStart, onSend, onClose, onUpdatePageId, pendingChat, cancelPendingChat, detachPendingChat } = useChatIPC(
    YakitRoute.AI_Agent,
    pageId,
    true,
  )

  const setActiveChatForContext = useMemoizedFn((session: ActiveChatAction) => {
    if (!session) return
    if (typeof session === 'function') {
      updateActiveChat((current) => {
        const next = session(current)
        if (!next) return current
        return next
      })
      return
    }
    // 同步绑定，确保随后回放的首个标题事件可以按 SessionID 找到页面。
    const { pages, queryPagesDataById } = usePageInfo.getState()
    const node = queryPagesDataById(YakitRoute.AI_Agent, pageId)
    const cachedSession = node?.pageParamsInfo.aiAgentPageInfo?.session
    const sameSession = cachedSession?.SessionID === session.SessionID
    // 首次建联沿用草稿的 SessionID，标签缓存仍需同步会话状态。
    const draftBound = cachedSession?.isDraftSession && !session.isDraftSession
    if (node && (!sameSession || draftBound)) {
      let title = session.Title
      // 固定入口保留菜单名，额外标签按当前 AI Tab 数量重置名称。
      if (session.isDraftSession) {
        const menuName = YakitRouteToPageInfo[YakitRoute.AI_Agent].label
        const nextIndex = pages.get(YakitRoute.AI_Agent)?.pageList.length ?? 1
        title = pageId === YakitRoute.AI_Agent ? menuName : `${menuName}-${nextIndex}`
      }
      syncAIAgentPageInfo({
        pageId,
        title,
        aiAgentPageInfo: { session: session.isDraftSession ? undefined : session },
        emitSessionData: false,
      })
    }
    detachPendingChat()
    locallyCreatedSessionIdRef.current = session.isCreate ? session.SessionID : undefined
    updateActiveChat(session)
  })

  // 本地调用禁止空值，共享 Context 仍兼容原有可空参数。
  const setActiveChat: Dispatch<SetStateAction<AISession>> = setActiveChatForContext

  const store: AIAgentContextStore = useMemo(() => {
    return {
      setting: setting,
      activeChat: activeChat,
      openChatInNewTab: true,
      pageId,
      pendingChat,
    }
  }, [setting, activeChat, pageId, pendingChat])
  const dispatcher: AIAgentContextDispatcher = useMemo(() => {
    return {
      getSetting: getSetting,
      setSetting: setSetting,
      setActiveChat: setActiveChatForContext,
      onStart,
      onSend,
      onClose,
      onUpdatePageId,
      cancelPendingChat,
    }
  }, [])

  const initializeSetting = useMemoizedFn((value: AIAgentSetting) => {
    if (activeChat.SessionID) {
      Object.assign(globalSessionEngine.ensureSession(activeChat.SessionID).request, cloneDeep(value))
    }
    lastInitializedSettingRef.current = value
    setSetting(value)
  })

  /** 读取全局配置缓存，初始化无会话页面 */
  const initToCacheData = useMemoizedFn(async (isDisposed: () => boolean) => {
    const result = await loadAIAgentChatSetting()
    if (isDisposed() || result.status !== 'success') return
    initializeSetting(applyAIAgentChatSettingSessionDefaults(result.setting))
  })

  const initialize = useMemoizedFn(async (sessionId: string | undefined, isDisposed: () => boolean) => {
    try {
      if (!sessionId) {
        await initToCacheData(isDisposed)
        return
      }

      const initialPageName = usePageInfo.getState().queryPagesDataById(YakitRoute.AI_Agent, pageId)?.pageName
      const initialSetting = getSetting()
      const result = await grpcQueryAISession({
        Pagination: { Page: 1, Limit: 1, OrderBy: 'last_used_at', Order: 'desc' },
        Filter: { SessionID: [sessionId] },
      })
      if (isDisposed()) return
      const session = result.Data.find((item) => item.SessionID === sessionId)
      if (!session) {
        setActiveChat(createWelcomeChat())
        return
      }
      // grpcQueryAISession长时间无响应： 查询期间配置已被修改时，保留当前配置。
      if (getSetting() === initialSetting) {
        const params = session.StartParams
        initializeSetting({
          ...cloneDeep(AIAgentSettingDefault),
          ...omit(params, ['CoordinatorId', 'Sequence', 'McpServers', 'UserQuery', 'TimelineContentSizeLimit']),
          Strategy: { ...AIAgentSettingDefault.Strategy, ...params?.Strategy },
        })
        updateActiveChat((current) =>
          current?.SessionID === sessionId ? { ...current, StartParams: params } : current,
        )
      }
      const { queryPagesDataById } = usePageInfo.getState()
      const node = queryPagesDataById(YakitRoute.AI_Agent, pageId)
      if (!node) return
      // 查询期间实时事件或历史刷新已更新标题时，保留新标题。
      const title = node.pageName !== initialPageName ? node.pageName : session.Title || node.pageName
      syncAIAgentPageInfo({
        pageId,
        title,
        aiAgentPageInfo: {
          session: { ...node.pageParamsInfo.aiAgentPageInfo?.session, ...session },
        },
        emitSessionData: false,
      })
    } catch {
      // 初始化失败时保留当前页面状态，不影响其他操作。
    }
  })

  useEffect(() => {
    // 复用已有会话配置，避免全局缓存覆盖本次提交的设置。
    if (initialSetting) {
      initializeSetting(initialSetting)
      return
    }
    const sessionId = isChatSession(activeChat) ? activeChat.SessionID : undefined
    // 本页新建会话已有配置和标题，跳过初始化查询。
    if (sessionId && sessionId === locallyCreatedSessionIdRef.current) return
    let disposed = false
    void initialize(sessionId, () => disposed)
    return () => {
      disposed = true
    }
  }, [activeChat?.SessionID])

  useEffect(() => {
    // 加载历史文件数据
    const bootstrap = async () => {
      await loadRemoteHistory()
      await initCustomFolderStore()
    }
    bootstrap().catch(() => {})
  }, [])

  useEffect(() => {
    const onChange = (payload?: string) => {
      if (!payload) return
      try {
        const cache = JSON.parse(payload) as AIAgentSetting
        if (typeof cache !== 'object' || !cache) return
        if (serializeAIAgentChatSetting(getSetting()) === payload) return
        setSetting((old) => applyAIAgentChatSettingBroadcast(old, cache))
      } catch (_) {}
    }
    emiter.on('onAIAgentChatSettingChange', onChange)
    return () => {
      emiter.off('onAIAgentChatSettingChange', onChange)
    }
  }, [])
  // #endregion

  useEffect(() => {
    initSideHiddenMode()
    emiter.on('switchSideHiddenMode', switchSideHiddenMode)
    return () => {
      emiter.off('switchSideHiddenMode', switchSideHiddenMode)
    }
  }, [])
  const switchSideHiddenMode = useMemoizedFn((data) => {
    sideHiddenModeRef.current = data
  })
  const initSideHiddenMode = useMemoizedFn(() => {
    getRemoteValue(RemoteAIAgentGV.AIAgentSideShowMode)
      .then((data) => {
        sideHiddenModeRef.current = data === 'true' ? 'true' : 'false'
      })
      .catch(() => {})
  })

  const onSendSwitchAIAgentTab = useDebounceFn(
    useMemoizedFn(() => {
      if (!show) return
      if (sideHiddenModeRef.current !== 'false') {
        emiter.emit(
          'switchAIAgentTab',
          JSON.stringify({
            type: SwitchAIAgentTabEventEnum.SET_TAB_SHOW,
            params: {
              show: false,
            },
          }),
        )
      }
    }),
    { wait: 200, leading: true },
  ).run

  // 获取数据库 列表数据
  const { run } = useRequest(
    async (Keyword?: string) => {
      const result: KnowledgeBaseContentProps = await ipcRenderer.invoke('GetKnowledgeBase', {
        Keyword,
        Pagination: { Limit: 9999, Page: 1, OrderBy: 'updated_at', Sort: 'desc' },
      })
      const { KnowledgeBases } = result
      return KnowledgeBases
    },
    {
      onError: (error) => {
        failed(t('AIAgent.getKnowledgeBaseFailed', { error: error + '' }))
      },
      onSuccess: (value) => {
        if (value) {
          const initKnowledgeBase = mergeKnowledgeBaseList(value, knowledgeBases)
          initializeKnowledgeBase(initKnowledgeBase)
        }
      },
    },
  )

  useEffect(() => {
    if (inViewPort) {
      run()
    }
  }, [inViewPort])

  const [isShowAIBottomDetails, setShowAIBottomDetails] = useState(false)

  const splitDefaultSizes = useMemo(() => (isShowAIBottomDetails ? [undefined, 220] : []), [isShowAIBottomDetails])
  const splitElements = useMemo(
    () => [
      {
        element: (
          <div className={styles['ai-agent-chat']} onClick={onSendSwitchAIAgentTab}>
            <AIAgentChat key={activeChat.SessionID} />
          </div>
        ),
      },
      {
        element: (
          <AIBottomDetails
            isShowAIBottomDetails={isShowAIBottomDetails}
            setShowAIBottomDetails={setShowAIBottomDetails}
          />
        ),
      },
    ],
    [isShowAIBottomDetails, onSendSwitchAIAgentTab, activeChat.SessionID],
  )

  return (
    <AIAgentContext.Provider value={{ store, dispatcher }}>
      <div id={YakitAIAgentPageID} className={styles['ai-agent']} ref={agentRef}>
        <div className={styles['ai-agent-wrapper']}>
          <YakitResizeBox
            freeze={show}
            dragResize
            isVer={false}
            isRecalculateWH={show}
            firstRatio={show ? sideRatio : '24px'}
            lineSize={1}
            firstMinSize={sideMinWidth}
            secondRatio={show ? '70%' : '100%'}
            secondMinSize={chatMinWidth}
            firstNodeStyle={{ padding: 0 }}
            secondNodeStyle={{ padding: 0 }}
            lineDirection="right"
            onMouseUp={(e) => {
              if (e.firstSizeNum > 24) setSideRatio(`${e.firstSizeNum}px`)
            }}
            firstNode={
              <div className={styles['ai-side-list']}>
                <AIAgentSideList show={show} setShow={setShow} />
              </div>
            }
            secondNode={
              <div className={styles['split-wrapper']}>
                <SplitView
                  isVertical={true}
                  isLastHidden={!isShowAIBottomDetails}
                  defaultSizes={splitDefaultSizes}
                  elements={splitElements}
                />
              </div>
            }
          />
        </div>
        <AIBottomSideBar setShowAIBottomDetails={setShowAIBottomDetails} />
      </div>
    </AIAgentContext.Provider>
  )
}
