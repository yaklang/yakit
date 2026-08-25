import React, { memo, useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { useMemoizedFn } from 'ahooks'
import { useStore } from 'zustand'
import classNames from 'classnames'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { OutlineFlagIcon, OutlineKeepLeftIcon, OutlineViewlistIcon } from '@/assets/icon/outline'
import { YakitSegmented } from '@/components/yakitUI/YakitSegmented/YakitSegmented'
import {
  YakitDockablePane,
  yakitDockablePaneSegmentedLabel,
} from '@/components/yakitUI/YakitDockablePane/YakitDockablePane'
import { SplitView } from '@/pages/yakRunner/SplitView/SplitView'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import type useMultipleHoldGRPCStream from '@/pages/KnowledgeBase/hooks/useMultipleHoldGRPCStream'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { AIForgeForm, AIToolForm } from '../../aiTriageChatTemplate/AITriageChatTemplate'
import type { AIForgeFormSubmitParamsProps } from '../../aiTriageChatTemplate/type'
import type { AIForge } from '../../type/forge'
import type { AITool } from '../../type/aiTool'
import { AIChatContent } from '../../aiChatContent/AIChatContent'
import { AIChatWorkspace } from '../../aiChatContent/AIChatWorkspace/AIChatWorkspace'
import type { AIChatContentRefProps } from '../../aiChatContent/type'
import FileTreeList from '../../aiChatWelcome/FileTreeList/FileTreeList'
import ChatSessionPane from '../../ChatSessionPane/ChatSessionPane'
import { HistoryTaskTree } from '../../chatTemplate/historyTaskTree/HistoryTaskTree'
import TimelineCard from '../../chatTemplate/TimelineCard/TimelineCard'
import { YakitAIAgentPageID } from '../../defaultConstant'
import { useChatSessionPaneStore } from '../../ChatSessionPane/useChatSessionPaneStore'
import { useMultiFuncPaneStore } from '../useMultiFuncPaneStore'
import { useChatSecondaryPaneStore } from '../useChatSecondaryPaneStore'
import type { AIAgentChatMode, HandleStartParams } from '../type'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './AIAgentChatLayout.module.scss'

const AIChatWelcome = React.lazy(() => import('../../aiChatWelcome/AIChatWelcome'))

const CHAT_SESSION_PANE_WIDTH = 320
const MULTI_FUNC_PANE_WIDTH = 320
const MIN_CHAT_CONTENT_WIDTH = 480

export interface AIAgentChatLayoutProps {
  mode: AIAgentChatMode
  onTriageSubmit: (data: HandleStartParams) => void
  onSetReAct: () => void
  api: ReturnType<typeof useMultipleHoldGRPCStream>[1]
  streams: ReturnType<typeof useMultipleHoldGRPCStream>[0]
  aiChatWelcomeRef: RefObject<AIChatContentRefProps>
  aiReActChatRef: RefObject<AIChatContentRefProps>
  onChat: () => void
  wrapperRef: RefObject<HTMLDivElement>
  activeForge?: AIForge
  activeTool?: AITool
  onClearActiveForge: () => void
  onSubmitForge: (data: AIForgeFormSubmitParamsProps) => void
  onClearActiveTool: () => void
  onSubmitTool: (question: string) => void
}

export const AIAgentChatLayout: React.FC<AIAgentChatLayoutProps> = memo((props) => {
  const {
    mode,
    onTriageSubmit,
    onSetReAct,
    api,
    streams,
    aiChatWelcomeRef,
    aiReActChatRef,
    onChat,
    wrapperRef,
    activeForge,
    activeTool,
    onClearActiveForge,
    onSubmitForge,
    onClearActiveTool,
    onSubmitTool,
  } = props

  const { t } = useI18nNamespaces(['aiAgent'])
  const chatSessionVisible = useChatSessionPaneStore((state) => state.visible)
  const setChatSessionVisible = useChatSessionPaneStore((state) => state.setVisible)
  const multiFuncVisible = useMultiFuncPaneStore((state) => state.visible)
  const setMultiFuncVisible = useMultiFuncPaneStore((state) => state.setVisible)
  const multiFuncTab = useMultiFuncPaneStore((state) => state.tab)
  const setMultiFuncTab = useMultiFuncPaneStore((state) => state.setTab)
  const workspaceVisible = useChatSecondaryPaneStore((state) => state.visible)
  const setWorkspaceVisible = useChatSecondaryPaneStore((state) => state.setVisible)

  const store = useCurrentStore()
  const taskTree = useStore(store, (state) => state.currentPlan.task_tree ?? [])
  const hasTaskTree = taskTree.length > 0

  const [filePreviewData, setFilePreviewData] = useState<FileNodeProps>()
  const [dockDisabled, setDockDisabled] = useState(false)

  useEffect(() => {
    if (!hasTaskTree && multiFuncTab === 'task-list') {
      setMultiFuncTab('timeline')
    }
  }, [hasTaskTree, multiFuncTab, setMultiFuncTab])

  useEffect(() => {
    const el = wrapperRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const update = (width: number) => {
      const occupied = (chatSessionVisible ? CHAT_SESSION_PANE_WIDTH : 0) + MULTI_FUNC_PANE_WIDTH
      const next = width - occupied < MIN_CHAT_CONTENT_WIDTH
      setDockDisabled((prev) => (prev === next ? prev : next))
    }
    update(el.getBoundingClientRect().width)
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width
      if (!width) return
      update(width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [chatSessionVisible, wrapperRef])

  const onTabsChange = useMemoizedFn((count: number) => {
    setWorkspaceVisible(count > 0)
  })

  return (
    <div className={styles['chat-wrapper']}>
      <YakitButton
        className={styles['open-expand-resources']}
        type="text2"
        icon={<OutlineKeepLeftIcon />}
        onClick={() => setChatSessionVisible(true)}
      />
      <div
        className={classNames(styles['chat-session-wrapper'], {
          [styles['chat-session-wrapper-hidden']]: !chatSessionVisible,
        })}
      >
        <SplitView
          isVertical
          elements={[
            {
              element: <ChatSessionPane />,
            },
            {
              element: <FileTreeList selected={filePreviewData} setSelected={setFilePreviewData} />,
            },
          ]}
          sashClassName={styles['split-view-line']}
        />
      </div>
      <div className={styles['chat-content-wrapper']}>
        <div
          className={classNames(styles['chat-workspace'], {
            [styles['chat-workspace-hidden']]: !workspaceVisible,
          })}
        >
          <AIChatWorkspace
            filePreviewData={filePreviewData}
            setFilePreviewData={setFilePreviewData}
            onTabsChange={onTabsChange}
          />
        </div>
        <div className={styles['chat-content']}>
          {mode === 'welcome' ? (
            <React.Suspense fallback={<div>loading...</div>}>
              <AIChatWelcome
                onTriageSubmit={onTriageSubmit}
                onSetReAct={onSetReAct}
                api={api}
                streams={streams}
                ref={aiChatWelcomeRef}
              />
            </React.Suspense>
          ) : (
            <AIChatContent ref={aiReActChatRef} onChat={onChat} />
          )}
        </div>
      </div>
      <YakitDockablePane
        open={multiFuncVisible}
        onClose={() => setMultiFuncVisible(false)}
        width={MULTI_FUNC_PANE_WIDTH}
        dockDisabled={dockDisabled}
        dockDisabledTip={t('AIAgentChatLayout.dockDisabledTip')}
        getContainer={() => document.getElementById(YakitAIAgentPageID)}
        style={{ height: '100%' }}
        overlayStyle={{ top: 8, bottom: 35, right: 10, left: 'auto' }}
        header={
          <YakitSegmented
            value={multiFuncTab}
            onChange={(v) => setMultiFuncTab(v as 'task-list' | 'timeline')}
            options={[
              {
                label: (
                  <span className={yakitDockablePaneSegmentedLabel}>
                    <OutlineFlagIcon />
                    {t('AIAgentChatTemplate.tasklist')}
                  </span>
                ),
                value: 'task-list',
                disabled: !hasTaskTree,
              },
              {
                label: (
                  <span className={yakitDockablePaneSegmentedLabel}>
                    <OutlineViewlistIcon />
                    {t('AIAgentChatTemplate.timeline')}
                  </span>
                ),
                value: 'timeline',
              },
            ]}
          />
        }
      >
        {multiFuncTab === 'task-list' ? <HistoryTaskTree /> : <TimelineCard />}
      </YakitDockablePane>
      <div className={styles['footer-forge-form']}>
        {activeForge && (
          <AIForgeForm
            wrapperRef={wrapperRef}
            info={activeForge}
            onBack={onClearActiveForge}
            onSubmit={onSubmitForge}
          />
        )}
        {activeTool && (
          <AIToolForm wrapperRef={wrapperRef} info={activeTool} onBack={onClearActiveTool} onSubmit={onSubmitTool} />
        )}
      </div>
    </div>
  )
})
