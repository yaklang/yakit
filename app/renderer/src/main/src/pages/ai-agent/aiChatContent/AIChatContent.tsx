import React, { forwardRef, ReactNode, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { AIAgentTabPayload, AIChatContentProps } from './type'
import styles from './AIChatContent.module.scss'
import { useCreation, useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { YakitSideTab } from '@/components/yakitSideTab/YakitSideTab'
import { AITabs, AITabsEnum } from '../defaultConstant'
import { AITabsEnumType } from '../aiAgentType'
import { YakitSideTabProps, YakitTabsProps } from '@/components/yakitSideTab/YakitSideTabType'
import { AIReActChat } from '@/pages/ai-re-act/aiReActChat/AIReActChat'
import { AIFileSystemList } from '../components/aiFileSystemList/AIFileSystemList'
import {
  PluginExecuteHttpFlow,
  VulnerabilitiesRisksTable,
} from '@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import AIReActTaskChat from '@/pages/ai-re-act/aiReActTaskChat/AIReActTaskChat'
import emiter from '@/utils/eventBus/eventBus'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
// import {SideSettingButton} from "../aiChatWelcome/AIChatWelcome"
import useAIAgentStore from '../useContext/useStore'
import { useAIChatResizeBox } from './hooks/useAIChatResizeBox'
import {
  AIHandleStartParams,
  AIHandleStartResProps,
  AIReActChatRefProps,
} from '@/pages/ai-re-act/aiReActChat/AIReActChatType'
import OperationLog from '../components/aiFileSystemList/OperationLog/OperationLog'
import AIGlobalLoading from '../aiGlobalLoading/AIGlobalLoading'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import { AIHorizontalScrollCard } from './aiHorizontalScrollCard/AIHorizontalScrollCard'

export const AIChatContent: React.FC<AIChatContentProps> = React.memo(
  forwardRef((props, ref) => {
    const { onChat, onChatFromHistory } = props
    const { t, i18n } = useI18nNamespaces(['aiAgent', 'yakitUi', 'yakitRoute'])

    const store = useCurrentStore()
    const rawData = useCurrentRawData()
    const taskChatElementLength = useStore(store, (state) => state.taskChat.elements.length)
    const execFileRecord = useStore(store, (state) => state.execFileRecord)
    const grpcFolders = useStore(store, (state) => state.grpcFolders)

    const httpTabShow = useStore(store, (state) => state.httpTabShow)
    const httpTabUpdate = useStore(store, (state) => state.httpTabUpdate)
    const riskTabShow = useStore(store, (state) => state.riskTabShow)
    const riskTabUpdate = useStore(store, (state) => state.riskTabUpdate)
    const requestHistoryState = useStore(store, (state) => state.requestHistoryState)

    const { activeChat } = useAIAgentStore()

    const [activeKey, setActiveKey] = useState<AITabsEnumType | undefined>(AITabsEnum.Task_Content)

    const [showFreeChat, setShowFreeChat] = useState<boolean>(true) //自由对话展开收起
    const [timeLine, setTimeLine] = useState<boolean>(true)
    const [runTimeId, setRunTimeId] = useState<string>() // 工具卡片跳转自带runTimeID

    const RelatedRuntimeIDs = useMemo(() => {
      return activeChat?.RelatedRuntimeIDs ?? []
    }, [activeChat?.RelatedRuntimeIDs])

    const aiReActChatRef = useRef<AIReActChatRefProps>({
      handleStart: () => {},
      setMention: () => {},
      setValue: () => {},
      setHttpFlow: () => {},
      getValue: () => {},
    })

    useImperativeHandle(ref, () => {
      return {
        ...aiReActChatRef.current,
      }
    }, [])

    // #region 问题相关逻辑

    const handleTabStateChange = useMemoizedFn((key: AITabsEnumType, value: AIAgentTabPayload['value']) => {
      setActiveKey(key)
      if (!value) {
        setRunTimeId(undefined)
        return
      }
      setRunTimeId(value)
    })

    const onSwitchAIAgentTab = useMemoizedFn((data) => {
      if (data === undefined) return setActiveKey(data)
      let payload: AIAgentTabPayload
      try {
        payload = JSON.parse(data)
      } catch (error) {
        setActiveKey(undefined)
        return
      }
      const { key, value } = payload

      if (key === AITabsEnum.HTTP && !httpTabShow && RelatedRuntimeIDs.length === 0) return
      if (key === AITabsEnum.Risk && !riskTabShow && RelatedRuntimeIDs.length === 0) return
      handleTabStateChange(key, value)
    })

    useEffect(() => {
      emiter.on('switchAIActTab', onSwitchAIAgentTab)
      return () => {
        emiter.off('switchAIActTab', onSwitchAIAgentTab)
      }
    }, [onSwitchAIAgentTab])

    const filterTagDom = useMemo(() => {
      if (!runTimeId) return null
      // 超过20字符截取，显示...
      const showId = runTimeId.slice(0, 30) + '…'
      return (
        <YakitTag color="info" closable onClose={() => setRunTimeId(undefined)}>
          {showId}
        </YakitTag>
      )
    }, [runTimeId])

    const yakitTabs = useCreation(() => {
      let tab: YakitSideTabProps['yakitTabs'] = [AITabs[AITabsEnum.Task_Content], AITabs[AITabsEnum.File_System]]

      if (httpTabShow || !!RelatedRuntimeIDs.length) {
        tab.push(AITabs[AITabsEnum.HTTP])
      }
      if (riskTabUpdate || !!RelatedRuntimeIDs.length) {
        tab.push(AITabs[AITabsEnum.Risk])
      }
      if (execFileRecord.size > 0) {
        tab.push(AITabs[AITabsEnum.Operation_Log])
      }
      return tab
    }, [httpTabShow, riskTabUpdate, execFileRecord.size, taskChatElementLength])

    const [showHot, setShowHot] = useState(false)
    const prevRef = useRef<{
      chatId?: string
      foldersLen: number
    }>({
      chatId: activeChat?.Id,
      foldersLen: grpcFolders.length,
    })

    useEffect(() => {
      const prev = prevRef.current
      const currentChatId = activeChat?.Id
      const currentLen = grpcFolders.length
      let nextShowHot = false

      if (activeKey === AITabsEnum.File_System) {
        nextShowHot = false
      } else if (prev.chatId === currentChatId && currentLen > prev.foldersLen) {
        nextShowHot = true
      }
      setShowHot(nextShowHot)
      prevRef.current = {
        chatId: currentChatId,
        foldersLen: currentLen,
      }
    }, [grpcFolders.length, activeChat?.Id, activeKey])

    const tabBarRender = useMemoizedFn((tab: YakitTabsProps, node: ReactNode[]) => {
      const [label] = node
      const finalLabel = label ?? (typeof tab.label === 'function' ? tab.label() : tab.label)
      if (tab.value === AITabsEnum.Risk) {
        return <>{finalLabel}</>
      }
      if (tab.value === AITabsEnum.File_System) {
        const isShow = activeKey !== AITabsEnum.File_System && showHot
        return (
          <div className={styles['file-system-label']}>
            {t('AIChatContent.fileSystem')}
            <span hidden={!isShow} />
          </div>
        )
      }

      return finalLabel
    })

    const OperationLogList = useCreation(() => {
      return Array.from(execFileRecord.values())
        .flat()
        .sort((a, b) => b.order - a.order)
    }, [execFileRecord])

    const tabContent = useMemo(() => {
      if (!activeKey) return null
      const runTimeIds = [...new Set(!!runTimeId ? [runTimeId] : rawData.httpRunTimeIDs.concat(RelatedRuntimeIDs))]
      const riskRunTimeIds = [...new Set(!!runTimeId ? [runTimeId] : rawData.riskRunTimeIDs.concat(RelatedRuntimeIDs))]
      switch (activeKey) {
        case AITabsEnum.Task_Content:
          return <AIReActTaskChat setTimeLine={setTimeLine} setShowFreeChat={setShowFreeChat} />
        case AITabsEnum.File_System:
          return <AIFileSystemList />
        case AITabsEnum.Risk:
          return !!riskRunTimeIds.length ? (
            <VulnerabilitiesRisksTable filterTagDom={filterTagDom} runTimeIDs={riskRunTimeIds} />
          ) : (
            <>
              <YakitEmpty style={{ paddingTop: 48 }} />
            </>
          )
        case AITabsEnum.HTTP:
          return !!runTimeIds.length ? (
            <PluginExecuteHttpFlow filterTagDom={filterTagDom} runtimeId={runTimeIds.join(',')} website={true} />
          ) : (
            <>
              <YakitEmpty style={{ paddingTop: 48 }} />
            </>
          )
        case AITabsEnum.Operation_Log:
          return <OperationLog loading={false} list={OperationLogList} />
        default:
          return null
      }
    }, [activeKey, runTimeId, httpTabUpdate, riskTabUpdate, RelatedRuntimeIDs, filterTagDom, OperationLogList])

    const onActiveKey = useMemoizedFn((key: AITabsEnumType) => {
      if (activeKey === key) {
        setShowFreeChat(true)
        setActiveKey(undefined)
      } else {
        setActiveKey(key)
      }
      setRunTimeId(undefined)
    })

    const { resizeBoxProps } = useAIChatResizeBox({
      activeKey,
      showFreeChat,
      timeLine,
      taskChatElementLength,
    })

    const startRequest = useMemoizedFn((data: AIHandleStartParams) => {
      return new Promise<AIHandleStartResProps>((resolve) => {
        resolve({
          params: data.params,
          onChat,
          onChatFromHistory,
        })
      })
    })

    return (
      <div className={styles['ai-chat-content-wrapper']}>
        <AIGlobalLoading loopAnimationMode="sequential" loading={requestHistoryState.initLoading}>
          <AIHorizontalScrollCard />
          <div className={styles['ai-chat-tab-wrapper']}>
            <YakitSideTab
              key={i18n.language}
              type="horizontal"
              yakitTabs={yakitTabs}
              activeKey={activeKey}
              onActiveKey={(key) => onActiveKey(key as AITabsEnumType)}
              onTabPaneRender={(ele, node) => tabBarRender(ele, node)}
              className={styles['tab-wrap']}
              t={t}
            >
              <div className={styles['ai-chat-content']}>
                <YakitResizeBox
                  firstNode={
                    activeKey && (
                      <div
                        className={classNames(styles['tab-content'], {
                          [styles['tab-content-right']]: !showFreeChat,
                        })}
                      >
                        {tabContent}
                      </div>
                    )
                  }
                  secondNode={
                    <AIReActChat
                      chatContainerHeaderClassName={classNames({
                        [styles['re-act-chat-container-header']]: !activeKey,
                      })}
                      showFreeChat={showFreeChat}
                      setShowFreeChat={setShowFreeChat}
                      startRequest={startRequest}
                      ref={aiReActChatRef}
                    />
                  }
                  {...resizeBoxProps}
                />
              </div>
            </YakitSideTab>
          </div>
        </AIGlobalLoading>
      </div>
    )
  }),
)
