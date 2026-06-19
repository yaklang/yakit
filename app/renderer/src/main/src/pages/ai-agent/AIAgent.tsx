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
import cloneDeep from 'lodash/cloneDeep'
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
import { AIBottomSideBar } from './aiBottomSideBar/AIBottomSideBar'
import { SplitView } from '../yakRunner/SplitView/SplitView'
import { AIBottomDetails } from './aiBottomDetails/AIBottomDetails'

import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { omit } from 'lodash'
import { grpcDeleteAISession } from './grpc'

/** 清空用户缓存的固定值 */
export const AIAgentCacheClearValue = '20260113'

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
            // DeleteAll: true,
            Filter: {
              Source: ['ai', ''],
            },
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
    const cache = omit(getSetting(), ['AIService', 'AIModelName'])
    setRemoteValue(RemoteAIAgentGV.AIAgentChatSetting, JSON.stringify(cache))
  }, [setting])

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
              const newCache = omit(cache, ['AIService', 'AIModelName'])
              setSetting({
                ...AIAgentSettingDefault,
                ...newCache,
                SyncPerceptionTrigger: false,
                EnablePlan: false,
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

  const [isShowAIBottomDetails, setShowAIBottomDetails] = useState(false)

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
              defaultSizes={isShowAIBottomDetails ? [undefined, 220] : []}
              elements={[
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
              ]}
            />
          </div>
        </div>
        <AIBottomSideBar setShowAIBottomDetails={setShowAIBottomDetails} />
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
