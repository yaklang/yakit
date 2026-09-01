import React, { memo, useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { useMemoizedFn } from 'ahooks'
import { OutlineFlagIcon, OutlineViewlistIcon } from '@/assets/icon/outline'
import { YakitSegmented } from '@/components/yakitUI/YakitSegmented/YakitSegmented'
import {
  YakitDockablePane,
  yakitDockablePaneSegmentedLabel,
} from '@/components/yakitUI/YakitDockablePane/YakitDockablePane'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { AIForgeForm, AIToolForm } from '../../aiTriageChatTemplate/AITriageChatTemplate'
import type { AIForgeFormSubmitParamsProps } from '../../aiTriageChatTemplate/type'
import type { AIForge } from '../../type/forge'
import type { AITool } from '../../type/aiTool'
import { AIChatContent } from '../../aiChatContent/AIChatContent'
import { AIChatWorkspace } from '../../aiChatContent/AIChatWorkspace/AIChatWorkspace'
import type { AIChatContentRefProps } from '../../aiChatContent/type'
import { TaskListPane } from '../../chatTemplate/historyTaskTree/TaskListPane'
import { useHasTaskTree } from '../../chatTemplate/historyTaskTree/useHasTaskTree'
import TimelineCard from '../../chatTemplate/TimelineCard/TimelineCard'
import { YakitAIAgentPageID } from '../../defaultConstant'
import { useMultiFuncPaneStore } from '../useMultiFuncPaneStore'
import type { AIAgentChatMode, HandleStartParams } from '../type'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './AIAgentChatLayout.module.scss'

const AIChatWelcome = React.lazy(() => import('../../aiChatWelcome/AIChatWelcome'))

const MULTI_FUNC_PANE_WIDTH = 320
const MIN_CHAT_CONTENT_WIDTH = 400

export interface AIAgentChatLayoutProps {
  mode: AIAgentChatMode
  onTriageSubmit: (data: HandleStartParams) => void
  onSetReAct: () => void
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
  const multiFuncVisible = useMultiFuncPaneStore((state) => state.visible)
  const setMultiFuncVisible = useMultiFuncPaneStore((state) => state.setVisible)
  const multiFuncTab = useMultiFuncPaneStore((state) => state.tab)
  const setMultiFuncTab = useMultiFuncPaneStore((state) => state.setTab)

  const hasTaskTree = useHasTaskTree()

  const [filePreviewData, setFilePreviewData] = useState<FileNodeProps>()
  const [workspaceVisible, setWorkspaceVisible] = useState(false)
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
      const occupied = MULTI_FUNC_PANE_WIDTH
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
  }, [wrapperRef])

  const onTabsChange = useMemoizedFn((count: number) => {
    setWorkspaceVisible(count > 0)
  })

  return (
    <div className={styles['chat-wrapper']}>
      <div className={styles['chat-content-wrapper']}>
        <YakitResizeBox
          freeze={workspaceVisible}
          firstRatio={workspaceVisible ? '70%' : '0px'}
          firstMinSize={workspaceVisible ? 280 : 0}
          secondRatio={workspaceVisible ? '30%' : '100%'}
          secondMinSize={MIN_CHAT_CONTENT_WIDTH}
          firstNodeStyle={workspaceVisible ? undefined : { display: 'none', padding: 0 }}
          lineStyle={workspaceVisible ? undefined : { display: 'none' }}
          firstNode={
            <div className={styles['chat-workspace']}>
              <AIChatWorkspace
                filePreviewData={filePreviewData}
                setFilePreviewData={setFilePreviewData}
                onTabsChange={onTabsChange}
              />
            </div>
          }
          secondNode={
            <div className={styles['chat-content']}>
              {mode === 'welcome' ? (
                <React.Suspense fallback={<div>loading...</div>}>
                  <AIChatWelcome onTriageSubmit={onTriageSubmit} onSetReAct={onSetReAct} ref={aiChatWelcomeRef} />
                </React.Suspense>
              ) : (
                <AIChatContent ref={aiReActChatRef} onChat={onChat} />
              )}
            </div>
          }
        />
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
        {multiFuncTab === 'task-list' ? <TaskListPane /> : <TimelineCard />}
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
