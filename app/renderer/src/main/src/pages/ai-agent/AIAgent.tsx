import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { AIAgentProps, AIAgentSetting } from './aiAgentType'
import { AIAgentSideList } from './AIAgentSideList'
import AIAgentContext, { type AIAgentContextDispatcher, type AIAgentContextStore } from './useContext/AIAgentContext'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import useGetSetState from '../pluginHub/hooks/useGetSetState'
import type { AISession } from './type/aiChat'
import { useDebounceFn, useInViewport, useMemoizedFn, useRequest, useUpdateEffect } from 'ahooks'
import { AIAgentSettingDefault, SwitchAIAgentTabEventEnum, YakitAIAgentPageID } from './defaultConstant'
import cloneDeep from 'lodash/cloneDeep'
import { AIAgentChat } from './aiAgentChat/AIAgentChat'
import { loadRemoteHistory } from './components/aiFileSystemList/store/useHistoryFolder'
import { initCustomFolderStore } from './components/aiFileSystemList/store/useCustomFolder'
import type { KnowledgeBaseContentProps } from '../KnowledgeBase/TKnowledgeBase'
import { useKnowledgeBase } from '../KnowledgeBase/hooks/useKnowledgeBase'
import { failed } from '@/utils/notification'
import { mergeKnowledgeBaseList } from '../KnowledgeBase/utils'

import emiter from '@/utils/eventBus/eventBus'
import classNames from 'classnames'
import styles from './AIAgent.module.scss'
import { AIBottomSideBar } from './aiBottomSideBar/AIBottomSideBar'
import { SplitView } from '../yakRunner/SplitView/SplitView'
import { AIBottomDetails } from './aiBottomDetails/AIBottomDetails'

import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { omit } from 'lodash'
import { useChatIPC } from '../ai-re-act/hooks/useChatIPC'
import { AISourceEnum } from '../ai-re-act/hooks/grpcApi'
import { YakitRoute } from '@/enums/yakitRoute'
import { globalSessionEngine } from '../ai-re-act/hooks/ChatMultiSessionController'

const { ipcRenderer } = window.require('electron')

export const AIAgent: React.FC<AIAgentProps> = (props) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  // #region ai-agent页面全局缓存
  // ai-agent-chat 全局配置
  const [setting, setSetting, getSetting] = useGetSetState<AIAgentSetting>(cloneDeep(AIAgentSettingDefault))
  // 当前展示对话
  const [activeChat, setActiveChat] = useState<AISession>()

  const [show, setShow] = useState<boolean>(false)

  const sideHiddenModeRef = useRef<string>()

  const { initialize, knowledgeBases } = useKnowledgeBase()
  const agentRef = useRef<HTMLDivElement>(null)
  const [inViewPort = true] = useInViewport(agentRef)

  // 只在宽度跌破阈值时收起侧栏，避免 useSize 每帧 setState 把整页（含会话列表）打满重渲染
  useEffect(() => {
    const el = agentRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    let skipFirst = true
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width
      if (!width) return
      if (skipFirst) {
        skipFirst = false
        return
      }
      if (width < 1230) setShow((prev) => (prev ? false : prev))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 缓存全局配置数据
  useUpdateEffect(() => {
    const cache = omit(getSetting(), ['AIService', 'AIModelName'])
    // 只有配置变化了才更新，SessionID不管
    if (activeChat?.SessionID) globalSessionEngine.updateSessionConfig(activeChat?.SessionID, getSetting())
    setRemoteValue(RemoteAIAgentGV.AIAgentChatSetting, JSON.stringify(cache))
  }, [setting])

  const { onStart, onSend, onClose, onUpdatePageId } = useChatIPC(YakitRoute.AI_Agent, YakitRoute.AI_Agent)

  const store: AIAgentContextStore = useMemo(() => {
    return {
      setting: setting,
      activeChat: activeChat,
    }
  }, [setting, activeChat])
  const dispatcher: AIAgentContextDispatcher = useMemo(() => {
    return {
      getSetting: getSetting,
      setSetting: setSetting,
      setActiveChat: setActiveChat,
      onStart,
      onSend,
      onClose,
      onUpdatePageId,
    }
  }, [])

  /**
   * 读取缓存并设置数据
   * 读取全局配置 setting
   */
  const initToCacheData = useMemoizedFn(async () => {
    try {
      const res = await getRemoteValue(RemoteAIAgentGV.AIAgentChatSetting)
      if (!res) return
      const cache = JSON.parse(res) as AIAgentSetting
      if (typeof cache !== 'object') return
      const newCache = omit(cache, ['AIService', 'AIModelName'])
      setSetting({
        ...AIAgentSettingDefault,
        ...newCache,
        SyncPerceptionTrigger: false,
        EnablePlan: false,
        Strategy: {
          EnableMultiAgent: false,
          EnableGoalMode: false,
          GoalMinIterations: AIAgentSettingDefault.Strategy?.GoalMinIterations,
          MaxSubAgents: AIAgentSettingDefault.Strategy?.MaxSubAgents,
        },
        Source: AISourceEnum.aiAgent,
      })
    } catch (error) {}
  })

  useEffect(() => {
    initToCacheData().catch(() => {})

    // 加载历史文件数据
    const bootstrap = async () => {
      await loadRemoteHistory()
      await initCustomFolderStore()
    }
    bootstrap().catch(() => {})

    return () => {}
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
        sideHiddenModeRef.current = data
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
          initialize(initKnowledgeBase)
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
          <div className={classNames(styles['ai-agent-chat'])} onClick={onSendSwitchAIAgentTab}>
            <AIAgentChat />
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
    [isShowAIBottomDetails, onSendSwitchAIAgentTab],
  )

  return (
    <AIAgentContext.Provider value={{ store, dispatcher }}>
      <div id={YakitAIAgentPageID} className={styles['ai-agent']} ref={agentRef}>
        <div className={styles['ai-agent-wrapper']}>
          <div className={classNames(styles['ai-side-list'])}>
            <AIAgentSideList show={show} setShow={setShow} />
          </div>
          <div className={styles['split-wrapper']}>
            <SplitView
              isVertical={true}
              isLastHidden={!isShowAIBottomDetails}
              defaultSizes={splitDefaultSizes}
              elements={splitElements}
            />
          </div>
        </div>
        <AIBottomSideBar setShowAIBottomDetails={setShowAIBottomDetails} />
      </div>
    </AIAgentContext.Provider>
  )
}
