import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AIAgentProps, AIAgentSetting } from './aiAgentType'
import { AIAgentSideList } from './AIAgentSideList'
import AIAgentContext, { AIAgentContextDispatcher, AIAgentContextStore } from './useContext/AIAgentContext'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import useGetSetState from '../pluginHub/hooks/useGetSetState'
import { AISession } from './type/aiChat'
import { useDebounceFn, useInViewport, useMemoizedFn, useRequest, useSize, useUpdateEffect } from 'ahooks'
import { AIAgentSettingDefault, SwitchAIAgentTabEventEnum, YakitAIAgentPageID } from './defaultConstant'
import { AIAgentChat } from './aiAgentChat/AIAgentChat'
import { loadRemoteHistory } from './components/aiFileSystemList/store/useHistoryFolder'
import { initCustomFolderStore } from './components/aiFileSystemList/store/useCustomFolder'
import { KnowledgeBaseContentProps } from '../KnowledgeBase/TKnowledgeBase'
import { useKnowledgeBase } from '../KnowledgeBase/hooks/useKnowledgeBase'
import { failed } from '@/utils/notification'
import { mergeKnowledgeBaseList } from '../KnowledgeBase/utils'
import { YakitHint } from '@/components/yakitUI/YakitHint/YakitHint'

import emiter from '@/utils/eventBus/eventBus'
import classNames from 'classnames'
import styles from './AIAgent.module.scss'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { DigitalEmployeeProfile, DigitalEmployeeSidebar } from '@/pages/digitalEmployee/DigitalEmployeeWorkspace'

import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import {
  mergeAIAgentChatSettingCache,
  stripAIAgentChatSettingForPersist,
  getSessionTabSetting,
} from './utils/aiAgentChatSettingCache'
import { grpcDeleteAISession } from './grpc'
import { useChatIPC } from '../ai-re-act/hooks/useChatIPC'
import { AISourceEnum } from '../ai-re-act/hooks/grpcApi'
import { YakitRoute } from '@/enums/yakitRoute'
import { globalSessionEngine } from '../ai-re-act/hooks/ChatMultiSessionController'
import { useSessionTab } from './sessionTabs/SessionTabsContext'
export { AIAgentWorkbench as AIAgent } from './sessionTabs/AIAgentWorkbench'

/** 清空用户缓存的固定值 */
export const AIAgentCacheClearValue = '20260113'

const { ipcRenderer } = window.require('electron')

export const AIAgentPane: React.FC<AIAgentProps & { initialSession?: AISession }> = (props) => {
  const tab = useSessionTab()
  const { t } = useI18nNamespaces(['aiAgent'])
  // #region ai-agent页面全局缓存
  // ai-agent-chat 全局配置
  const [setting, setSetting, getSetting] = useGetSetState<AIAgentSetting>(
    getSessionTabSetting(props.initialSession?.StartParams),
  )
  // 当前展示对话
  const [activeChat, setActiveChat] = useState<AISession | undefined>(props.initialSession)
  useEffect(() => {
    tab.onSessionChange?.(activeChat)
  }, [activeChat])

  const [show, setShow] = useState<boolean>(false)

  const sideHiddenModeRef = useRef<string>()

  const { initialize, knowledgeBases } = useKnowledgeBase()
  const agentRef = useRef<HTMLDivElement>(null)
  const [inViewPort = true] = useInViewport(agentRef)
  const agentSize = useSize(agentRef)

  useUpdateEffect(() => {
    if (agentSize?.width && agentSize?.width < 1230) {
      setShow(false)
    }
  }, [agentSize?.width])

  // #region 新版本删除缓存提示框
  const [delCacheVisible, setDelCacheVisible] = useState(false)
  const [delCacheLoading, setDelCacheLoading] = useState(false)
  const [isDelCache, setIsDelCache] = useState(false)
  const handleDelCache = useMemoizedFn(async () => {
    setDelCacheLoading(true)
    // 清空无效的用户缓存数据-全局配置数据
    setRemoteValue(RemoteAIAgentGV.AIAgentChatSetting, '')
    // 设置清空标志位
    setRemoteValue(RemoteAIAgentGV.AIAgentCacheClear, AIAgentCacheClearValue)

    try {
      if (isDelCache) {
        // 删除数据库历史记录
        await grpcDeleteAISession(
          {
            DeleteAll: true,
          },
          true,
        )
        emiter.emit('sessionData', JSON.stringify({ type: 'refresh' }))
      }
      setDelCacheVisible(false)
    } catch {
    } finally {
      setDelCacheLoading(false)
    }
  })
  // #endregion

  // 缓存全局配置数据
  useUpdateEffect(() => {
    if (!tab.active) return
    const currentSetting = getSetting()
    const cache = stripAIAgentChatSettingForPersist(currentSetting)
    if (activeChat?.SessionID) {
      globalSessionEngine.updateSessionConfig(activeChat.SessionID, {
        ...currentSetting,
        RuntimeContextSizeLimit: activeChat.StartParams?.RuntimeContextSizeLimit ?? 0,
      })
    }
    setRemoteValue(RemoteAIAgentGV.AIAgentChatSetting, JSON.stringify(cache))
  }, [setting, activeChat?.SessionID, activeChat?.StartParams?.RuntimeContextSizeLimit])

  const { onStart, onSend, onClose, onUpdatePageId, pendingChat, cancelPendingChat, detachPendingChat } = useChatIPC(
    YakitRoute.AI_Agent,
    props.pageId || YakitRoute.AI_Agent,
    true,
  )

  const store: AIAgentContextStore = useMemo(() => {
    return {
      setting: setting,
      activeChat: activeChat,
      pendingChat,
    }
  }, [setting, activeChat, pendingChat])
  const dispatcher: AIAgentContextDispatcher = useMemo(() => {
    return {
      getSetting: getSetting,
      setSetting: setSetting,
      setActiveChat: setActiveChat,
      onStart,
      onSend,
      onClose,
      onUpdatePageId,
      cancelPendingChat,
      detachPendingChat,
      openSessionTab: tab.openSession,
    }
  }, [])

  /**
   * 读取缓存并设置数据
   * 读取全局配置setting和历史会话chats
   */
  const initToCacheData = useMemoizedFn(async () => {
    try {
      const res = await getRemoteValue(RemoteAIAgentGV.AIAgentCacheClear)
      if (!res) return setRemoteValue(RemoteAIAgentGV.AIAgentCacheClear, AIAgentCacheClearValue)

      if (res >= AIAgentCacheClearValue) {
        // 获取缓存的全局配置数据
        getRemoteValue(RemoteAIAgentGV.AIAgentChatSetting)
          .then((res) => {
            if (!res) return
            try {
              const cache = JSON.parse(res) as AIAgentSetting
              if (typeof cache !== 'object') return
              if (props.initialSession?.StartParams) return
              setSetting({
                ...mergeAIAgentChatSettingCache(cache),
                SyncPerceptionTrigger: AIAgentSettingDefault.SyncPerceptionTrigger,
                EnablePlan: AIAgentSettingDefault.EnablePlan,
                Strategy: {
                  EnableMultiAgent: false,
                  EnableGoalMode: false,
                  GoalMinIterations: AIAgentSettingDefault.Strategy?.GoalMinIterations,
                  MaxSubAgents: AIAgentSettingDefault.Strategy?.MaxSubAgents,
                  GoalDurationSeconds: AIAgentSettingDefault.Strategy?.GoalDurationSeconds,
                  GoalAcceptanceCriteria: AIAgentSettingDefault.Strategy?.GoalAcceptanceCriteria,
                },
                Source: AISourceEnum.aiAgent,
              })
            } catch (error) {}
          })
          .catch(() => {})
      } else {
        setDelCacheVisible(true)
      }
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

  return (
    <AIAgentContext.Provider value={{ store, dispatcher }}>
      <div id={`${YakitAIAgentPageID}-${props.pageId}`} className={styles['ai-agent']} ref={agentRef}>
        <div className={styles['ai-agent-wrapper']}>
          <DigitalEmployeeSidebar
            detailActive={!!store.activeChat?.SessionID}
            onOpenTools={() => setShow((value) => !value)}
            toolsOpen={show}
            onSwitchEmployee={tab.newTab ? (employeeId) => tab.newTab?.({ employeeId }) : undefined}
          />
          <div
            className={classNames(styles['ai-side-list'], styles['ai-side-list-secondary'], {
              [styles['ai-side-list-secondary-hidden']]: !show,
            })}
            aria-hidden={!show}
          >
            <AIAgentSideList show={show} setShow={setShow} />
          </div>
          <div className={styles['employee-workspace']}>
            <DigitalEmployeeProfile />
            <div className={classNames(styles['ai-agent-chat'])} onClick={onSendSwitchAIAgentTab}>
              <AIAgentChat />
            </div>
          </div>
        </div>
        <YakitHint
          getContainer={agentRef.current || undefined}
          visible={delCacheVisible}
          title={t('AIAgent.tip')}
          content={
            <>
              {t('AIAgent.memfitUpdateNotice')}
              <br />
              <br />
              <YakitCheckbox checked={isDelCache} onChange={(e) => setIsDelCache(e.target.checked)}>
                <span style={{ color: 'var(--Colors-Use-Neutral-Text-4-Help-text)' }}>
                  {t('AIAgent.clearHistoryConfirm')}
                </span>
              </YakitCheckbox>
            </>
          }
          cancelButtonProps={{ style: { display: 'none' } }}
          okButtonProps={{ loading: delCacheLoading }}
          onOk={handleDelCache}
        ></YakitHint>
      </div>
    </AIAgentContext.Provider>
  )
}
