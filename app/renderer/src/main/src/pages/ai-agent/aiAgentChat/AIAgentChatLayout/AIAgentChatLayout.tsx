import React, { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useInViewport, useMemoizedFn } from 'ahooks'
import { FlagOutlined, ViewListOutlined } from '@yakit-libs/yakit-ui-icons/outline'
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
import { useHttpFlowSelection } from '@/components/useHttpFlowSelection'
import useAIAgentStore from '../../useContext/useStore'
import type { AIChatContentRefProps } from '../../aiChatContent/type'
import { TaskListPane } from '../../chatTemplate/historyTaskTree/TaskListPane'
import { useHasTaskTree } from '../../chatTemplate/historyTaskTree/useHasTaskTree'
import TimelineCard from '../../chatTemplate/TimelineCard/TimelineCard'
import { YakitAIAgentPageID } from '../../defaultConstant'
import { useMultiFuncPaneStore } from '../useMultiFuncPaneStore'
import type { AIAgentChatMode, AIChatSubmitParams } from '../type'
import type { AIChatInputDraft, AIResourceIds } from '../../template/type'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { AIRightPanel } from '@/pages/ai-re-act/aiRightPanel/AIRightPanel'
import { useRiskSelection } from './useRiskSelection'
import { ChatContentWidthContext } from './ChatContentWidthContext'
import type { ChatContentWidthMode } from './ChatContentWidthContext'
import styles from './AIAgentChatLayout.module.scss'

const AIChatWelcome = React.lazy(() => import('../../aiChatWelcome/AIChatWelcome'))

// 多功能面板停靠时占用的宽度（px）。
const MULTI_FUNC_PANE_WIDTH = 320
// 聊天内容区的最小宽度（px），停靠后剩余空间不足时禁用停靠。
const MIN_CHAT_CONTENT_WIDTH = 400
// 聊天内容区宽度低于此值（px）时，合并展示资料标签。
const GROUP_MATERIALS_BELOW_WIDTH = 450
// 聊天内容区宽度超过此值（px）时，在左侧展示摘要。
const LEFT_SUMMARY_ABOVE_WIDTH = 1152

export interface AIAgentChatLayoutProps {
  mode: AIAgentChatMode
  onTriageSubmit: (data: AIChatSubmitParams, draft?: AIChatInputDraft) => boolean
  initialDraft?: AIChatInputDraft
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
    initialDraft,
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
  const welcome = mode === 'welcome'
  const [showFreeChat, setShowFreeChat] = useState(true)
  const chatWrapperRef = useRef<HTMLDivElement>(null)
  const [inViewPort = true] = useInViewport(chatWrapperRef)
  const chatContentRef = useRef<HTMLDivElement>(null)
  const [chatContentWidthMode, setChatContentWidthMode] = useState<ChatContentWidthMode>('standard')
  const panelLayoutRef = useRef<HTMLDivElement>(null)
  const [chatLayoutElement, setChatLayoutElement] = useState<HTMLDivElement | null>(null)
  const [panelFrame, setPanelFrame] = useState<React.CSSProperties>()
  const panelVisible = welcome || showFreeChat
  const { activeChat } = useAIAgentStore()
  const { selectionScope, selectedHttpFlowIds, onSetSelectedHttpFlowIds, clearHttpFlowSelection, onHttpFlowRemove } =
    useHttpFlowSelection(inViewPort, activeChat?.SessionID)
  const { selectedRiskIds, onRiskSelectionChange, clearRiskSelection, setSelectedRiskIds } = useRiskSelection(
    inViewPort,
    activeChat?.SessionID,
  )
  const restoredDraft = useRef<AIChatInputDraft>()
  useLayoutEffect(() => {
    if (!initialDraft || !inViewPort || restoredDraft.current === initialDraft) return
    restoredDraft.current = initialDraft
    onSetSelectedHttpFlowIds(initialDraft.selectedResourceIds.http)
    setSelectedRiskIds(initialDraft.selectedResourceIds.risk)
  }, [initialDraft, inViewPort, onSetSelectedHttpFlowIds, setSelectedRiskIds])

  const clearDraftSelection = (type?: keyof AIResourceIds) => {
    if (!type || type === 'http') clearHttpFlowSelection()
    if (!type || type === 'risk') clearRiskSelection()
  }

  useEffect(() => {
    if (welcome) setShowFreeChat(true)
  }, [welcome])

  useLayoutEffect(() => {
    const container = chatContentRef.current
    const target = welcome ? container : chatLayoutElement
    if (!container) return

    const updateFrame = () => {
      const containerRect = container.getBoundingClientRect()
      // 隐藏页尺寸为零，恢复可见时再更新资料分组及浮层位置。
      if (containerRect.width <= 0) return
      setChatContentWidthMode(
        containerRect.width < GROUP_MATERIALS_BELOW_WIDTH
          ? 'narrow'
          : containerRect.width > LEFT_SUMMARY_ABOVE_WIDTH
            ? 'wide'
            : 'standard',
      )
      const targetRect = target === container ? containerRect : target?.getBoundingClientRect()
      if (!targetRect || targetRect.width <= 0) return
      const next = {
        left: targetRect.left - containerRect.left,
        top: targetRect.top - containerRect.top,
        width: targetRect.width,
        height: targetRect.height,
      }
      setPanelFrame((previous) =>
        previous?.left === next.left &&
        previous.top === next.top &&
        previous.width === next.width &&
        previous.height === next.height
          ? previous
          : next,
      )
    }

    updateFrame()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateFrame)
    observer.observe(container)
    if (target && target !== container) observer.observe(target)
    return () => observer.disconnect()
  }, [welcome, chatLayoutElement])

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
    <div ref={chatWrapperRef} className={styles['chat-wrapper']}>
      <div className={styles['chat-content-wrapper']}>
        <YakitResizeBox
          freeze={workspaceVisible}
          lineSize={1}
          firstRatio={workspaceVisible ? '70%' : '0px'}
          firstMinSize={workspaceVisible ? 280 : 0}
          secondRatio={workspaceVisible ? '30%' : '100%'}
          secondMinSize={MIN_CHAT_CONTENT_WIDTH}
          firstNodeStyle={workspaceVisible ? undefined : { display: 'none', padding: 0 }}
          secondNodeStyle={workspaceVisible ? { padding: 0 } : { padding: 0, flex: 1, width: '100%', minWidth: 0 }}
          lineStyle={workspaceVisible ? undefined : { display: 'none' }}
          lineDirection="right"
          firstNode={
            <div className={styles['chat-workspace']}>
              <AIChatWorkspace
                inViewPort={inViewPort}
                welcome={mode === 'welcome'}
                filePreviewData={filePreviewData}
                setFilePreviewData={setFilePreviewData}
                onTabsChange={onTabsChange}
                selectionScope={selectionScope}
                selectedHttpFlowIds={selectedHttpFlowIds}
                onSetSelectedHttpFlowIds={onSetSelectedHttpFlowIds}
                riskSelection={{
                  ids: selectedRiskIds,
                  onChange: onRiskSelectionChange,
                }}
              />
            </div>
          }
          secondNode={
            <div ref={chatContentRef} className={styles['chat-content']} data-ai-shared-right-panel={panelVisible}>
              <ChatContentWidthContext.Provider value={chatContentWidthMode}>
                {mode === 'welcome' ? (
                  <React.Suspense fallback={<div>loading...</div>}>
                    <AIChatWelcome
                      key={`${activeChat?.SessionID ?? ''}:${initialDraft ? 'recovered' : 'welcome'}`}
                      initialDraft={initialDraft}
                      onTriageSubmit={(data, draft) => {
                        if (!onTriageSubmit(data, draft)) return false
                        clearDraftSelection()
                        return true
                      }}
                      onHttpFlowRemove={onHttpFlowRemove}
                      onClearSelectedResources={clearDraftSelection}
                      selectedHttpFlowIds={selectedHttpFlowIds}
                      selectedRiskIds={selectedRiskIds}
                      onSetReAct={onSetReAct}
                      ref={aiChatWelcomeRef}
                    />
                  </React.Suspense>
                ) : (
                  <AIChatContent
                    ref={aiReActChatRef}
                    onChat={onChat}
                    showFreeChat={showFreeChat}
                    setShowFreeChat={setShowFreeChat}
                    rightPanelLayoutRef={setChatLayoutElement}
                    onHttpFlowRemove={onHttpFlowRemove}
                    selectedHttpFlowIds={selectedHttpFlowIds}
                    selectedRiskIds={selectedRiskIds}
                    onAfterSubmit={clearDraftSelection}
                    onClearSelectedResources={clearDraftSelection}
                  />
                )}
              </ChatContentWidthContext.Provider>
              <div
                ref={panelLayoutRef}
                className={styles['right-panel-frame']}
                style={panelFrame}
                hidden={!panelVisible}
              >
                <AIRightPanel welcome={welcome} layoutRef={panelLayoutRef} />
              </div>
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
                    <FlagOutlined color="currentColor" />
                    {t('AIAgentChatTemplate.tasklist')}
                  </span>
                ),
                value: 'task-list',
                disabled: !hasTaskTree,
              },
              {
                label: (
                  <span className={yakitDockablePaneSegmentedLabel}>
                    <ViewListOutlined color="currentColor" />
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
