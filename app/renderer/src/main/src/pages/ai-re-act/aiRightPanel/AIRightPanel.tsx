import React, { useEffect, useRef, useState } from 'react'
import { TaskListPane } from '@/pages/ai-agent/chatTemplate/historyTaskTree/TaskListPane'
import { AIRightPanelPane } from './AIRightPanelPane'
import TimelineCard from '@/pages/ai-agent/chatTemplate/TimelineCard/TimelineCard'
import { useCreation, useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { timeDiffWithMoment } from '@/utils/timeUtil'
import { AISourceEnum, type AIAgentGrpcApi } from '../hooks/grpcApi'
import useCurrentTaskExecution from '../hooks/useCurrentTaskData/useCurrentTaskExecution'
import emiter from '@/utils/eventBus/eventBus'
import { failed, yakitNotify } from '@/utils/notification'
import { AIAgentTabListEnum, AITabsEnum, SwitchAIAgentTabEventEnum } from '@/pages/ai-agent/defaultConstant'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { useCasualTaskTab } from '@/pages/ai-agent/aiChatContent/hooks/useCasualTaskTab'
import useAiChatLog from '@/hook/useAiChatLog/useAiChatLog.ts'
import { ExportAILogsModal } from '@/pages/ai-agent/components/ExportAILogsModal/ExportAILogsModal'
import { grpcExportAILogs } from '@/pages/ai-agent/grpc'
import {
  BugOutlined,
  ChatAlt2Outlined,
  ChevronDoubleDownOutlined,
  ChevronDoubleUpOutlined,
  FigmaIcon2017756Outlined,
  FigmaIcon348196674Outlined,
  FlagOutlined,
  FolderOpenOutlined,
  NewspaperOutlined,
  ScrollTextOutlined,
  TimelineOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { Tooltip } from 'antd'
import styles from './AIRightPanel.module.scss'
import type { AIRightPanelMenuKey, AIRightPanelProps, AIRightPanelRiskCounts, AIRightPanelToolStats } from './type'
import { AI_RIGHT_PANEL_INPUT_MAX_WIDTH, AI_RIGHT_PANEL_NORMAL_SLOT_WIDTH } from './type'

/** 菜单项定义：key 为唯一标识（React key 用），labelKey 为 i18n 文案 key，icon 为入口图标 */
interface MenuItemDef {
  key: AIRightPanelMenuKey
  labelKey: string
  icon: React.ReactNode
}

/** 主菜单：数据卡片下方常驻展示的六个功能入口（正常态与小屏态共用，小屏态仅渲染图标） */
const MAIN_MENUS: MenuItemDef[] = [
  { key: 'task-board', labelKey: 'AIRightPanel.taskBoard', icon: <ScrollTextOutlined /> },
  { key: 'file-system', labelKey: 'AIRightPanel.fileSystem', icon: <FolderOpenOutlined /> },
  { key: 'traffic', labelKey: 'AIRightPanel.traffic', icon: <FigmaIcon348196674Outlined /> },
  { key: 'risk', labelKey: 'AIRightPanel.risk', icon: <BugOutlined /> },
  { key: 'session-history', labelKey: 'AIRightPanel.sessionHistory', icon: <ChatAlt2Outlined /> },
  { key: 'task-list', labelKey: 'AIRightPanel.taskList', icon: <FlagOutlined /> },
]

/** 「更多」分组展开后追加显示的功能入口（收起态仅在底部显示「更多」按钮） */
const MORE_MENUS: MenuItemDef[] = [
  { key: 'timeline', labelKey: 'AIRightPanel.timeline', icon: <TimelineOutlined /> },
  { key: 'export-log', labelKey: 'AIRightPanel.exportLog', icon: <FigmaIcon2017756Outlined /> },
  { key: 'view-log', labelKey: 'AIRightPanel.viewLog', icon: <NewspaperOutlined /> },
]

/** 漏洞计数角标的展示顺序；后端标准等级映射到设计稿中的五种颜色。 */
const RISK_TAG_ORDER: Array<keyof AIRightPanelRiskCounts> = ['serious', 'high', 'medium', 'low', 'info']

/** 将 session_snapshot 的六个标准等级映射为面板展示的五个等级。 */
const getRiskCounts = (execution?: AIAgentGrpcApi.SessionSnapshot['execution']): AIRightPanelRiskCounts | undefined => {
  const levelCount = execution?.risk_level_count
  if (!levelCount) return undefined
  return {
    serious: levelCount.critical,
    high: levelCount.high,
    medium: levelCount.warning,
    low: levelCount.low,
    info: levelCount.info + levelCount.other,
  }
}

/** 小屏漏洞图标显示的总数优先使用后端 total，兼容旧快照时再按展示等级求和。 */
const getRiskTotal = (execution?: AIAgentGrpcApi.SessionSnapshot['execution'], riskCounts?: AIRightPanelRiskCounts) =>
  execution?.risk_level_count?.total ?? RISK_TAG_ORDER.reduce((total, field) => total + (riskCounts?.[field] ?? 0), 0)

/** 工具调用统计的三个指标（成功/失败带专属色 tone，对应 stat-value-* 样式；总尝试次数用默认色） */
const TOOL_STATS: Array<{ field: keyof AIRightPanelToolStats; labelKey: string; tone?: 'success' | 'failed' }> = [
  { field: 'success', labelKey: 'AIRightPanel.success', tone: 'success' },
  { field: 'failed', labelKey: 'AIRightPanel.failed', tone: 'failed' },
  { field: 'total', labelKey: 'AIRightPanel.totalAttempts' },
]

/** 执行时长、工具调用统计等数据未传入时的占位符 */
const PLACEHOLDER = '—'

/** 数据卡片区：执行时长 + 工具调用统计（成功/失败/总尝试）。 */
const DataCards: React.FC<{ executionData?: AIAgentGrpcApi.SessionSnapshot['execution'] }> = React.memo(
  ({ executionData }) => {
    const { t } = useI18nNamespaces(['aiAgent'])

    const executionDuration = useCreation(() => {
      const startedAt = executionData?.started_at || 0
      const endedAt = executionData?.ended_at || 0
      if (!startedAt) return PLACEHOLDER
      if (startedAt && !endedAt) return t('AIRightPanel.running')
      return timeDiffWithMoment(startedAt, endedAt)
    }, [executionData?.started_at, executionData?.ended_at])

    const toolCallStats = useCreation(() => {
      if (!executionData) return undefined
      return {
        success: executionData.tool_call_success,
        failed: executionData.tool_call_failed,
        total: executionData.tool_call_total,
      }
    }, [executionData?.tool_call_success, executionData?.tool_call_failed, executionData?.tool_call_total])

    return (
      <div className={styles['data-cards']}>
        <div className={styles['data-card']}>
          <div className={styles['data-card-accent']} />
          <div className={styles['data-card-row']}>
            <span className={styles['data-card-label']}>{t('AIRightPanel.duration')}</span>
            <span className={styles['data-card-value']}>{executionDuration ?? PLACEHOLDER}</span>
          </div>
        </div>
        <div className={classNames(styles['data-card'], styles['data-card-stats'])}>
          <div className={classNames(styles['data-card-accent'], styles['data-card-accent-blue'])} />
          <div className={styles['data-card-body']}>
            <span className={styles['stats-title']}>{t('AIRightPanel.toolCallStats')}</span>
            <div className={styles['stats-row']}>
              {TOOL_STATS.map((stat) => (
                <div className={styles['stat']} key={stat.field}>
                  <span className={classNames(styles['stat-value'], stat.tone && styles[`stat-value-${stat.tone}`])}>
                    {toolCallStats?.[stat.field] ?? PLACEHOLDER}
                  </span>
                  <span className={styles['stat-label']}>{t(stat.labelKey)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  },
)

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  small?: boolean
  secondary?: boolean
  suffix?: React.ReactNode
  smallBadge?: React.ReactNode
  onClick?: () => void
  onMouseEnter?: () => boolean
  onMouseLeave?: () => void
}

const MenuItem: React.FC<MenuItemProps> = React.memo(
  ({ icon, label, small, secondary, suffix, smallBadge, onClick, onMouseEnter, onMouseLeave }) => {
    const [tooltipOpen, setTooltipOpen] = useState(false)

    const handleMouseEnter = useMemoizedFn(() => {
      const paneOpened = onMouseEnter?.() ?? false
      setTooltipOpen(!paneOpened)
    })
    const handleMouseLeave = useMemoizedFn(() => {
      setTooltipOpen(false)
      onMouseLeave?.()
    })

    const onItemClick = useMemoizedFn(() => {
      if (onClick) {
        onClick()
      }
      setTooltipOpen(false)
    })

    // 菜单容器和交互行为在两种尺寸下相同，具体内容由大小屏分支分别生成。
    const renderMenuContainer = useMemoizedFn((children: React.ReactNode, className?: string) => (
      <div
        className={classNames(styles['menu-item'], className)}
        aria-label={label}
        onClick={onItemClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
    ))

    // 正常态使用独立的文案和右侧 suffix，不渲染小屏专用结构。
    const renderNormalContent = useMemoizedFn(() =>
      renderMenuContainer(
        <>
          <div className={styles['menu-item-base']}>
            <span className={classNames(styles['menu-item-icon'], secondary && styles['menu-item-icon-secondary'])}>
              {icon}
            </span>
            <span className={classNames(styles['menu-item-label'], secondary && styles['menu-item-label-secondary'])}>
              {label}
            </span>
          </div>
          {suffix}
        </>,
      ),
    )

    // 小屏态只保留图标和可选角标，不渲染正常态文案或 suffix。
    const renderSmallContent = useMemoizedFn(() =>
      renderMenuContainer(
        <div className={styles['menu-item-base']}>
          <span
            className={classNames(
              styles['menu-item-icon'],
              styles['menu-item-icon-small'],
              secondary && styles['menu-item-icon-secondary'],
            )}
          >
            {icon}
            {smallBadge && (
              <span className={styles['risk-count-badge']} aria-label={`漏洞总数 ${smallBadge}`}>
                {smallBadge}
              </span>
            )}
          </span>
        </div>,
        styles['menu-item-small'],
      ),
    )

    return small ? (
      <Tooltip key={label} title={label} placement="left" open={tooltipOpen}>
        {renderSmallContent()}
      </Tooltip>
    ) : (
      renderNormalContent()
    )
  },
)

/**
 * Memfit AI 右侧功能面板：
 * - 正常态（宽 301px）：数据卡片 + 主菜单 + 底部「更多」分组，更多分组可在 展开/收起 间切换
 * - 小屏态（正常态面板会使列表可用宽度小于最大宽度时）：仅图标的窄栏（宽 41px）
 */
export const AIRightPanel: React.FC<AIRightPanelProps> = React.memo((props) => {
  const { layoutRef, small } = props
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [moreOpen, setMoreOpen] = useState(false)
  const [chatSmall, setChatSmall] = useState(false)
  // 菜单点击交互：打开工作区 tab / 导出与查看日志
  const { activeChat } = useAIAgentStore()
  const { getSetting } = useAIAgentDispatcher()
  const { currentChatStatusQuestionID, syncCasualTaskTab } = useCasualTaskTab()
  const executionData = useCurrentTaskExecution(currentChatStatusQuestionID)
  const riskCounts = useCreation(() => getRiskCounts(executionData), [executionData?.risk_level_count])
  const riskTotal = useCreation(
    () => getRiskTotal(executionData, riskCounts),
    [executionData?.risk_level_count, riskCounts],
  )
  const { onOpenLogWindow } = useAiChatLog()
  const [exportModalVisible, setExportModalVisible] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    // 监听滚动容器的父级（.ai-re-act-chat）宽度：内容轨道避让在 Virtuoso 内部 List 上，
    // 父级保持全宽不随面板态变化，宽度稳定可安全作为小屏判断输入。
    const layoutElement = layoutRef?.current
    if (small !== undefined || !layoutElement || typeof ResizeObserver === 'undefined') return

    const getLayoutWidth = () => layoutElement.clientWidth || layoutElement.getBoundingClientRect().width
    const update = (layoutWidth: number) => {
      const nextChatSmall = layoutWidth - AI_RIGHT_PANEL_NORMAL_SLOT_WIDTH < AI_RIGHT_PANEL_INPUT_MAX_WIDTH
      setChatSmall((previous) => (previous === nextChatSmall ? previous : nextChatSmall))
    }
    update(getLayoutWidth())
    const observer = new ResizeObserver((entries) => {
      update(entries?.[0]?.contentRect.width ?? getLayoutWidth())
    })
    observer.observe(layoutElement)
    return () => observer.disconnect()
  }, [layoutRef, small])

  const isSmall = small ?? chatSmall
  const [activePane, setActivePane] = useState<'task-list' | 'timeline'>()
  const closeTimer = useRef<ReturnType<typeof setTimeout>>()
  const cancelPaneClose = useMemoizedFn(() => clearTimeout(closeTimer.current))
  const closePane = useMemoizedFn(() => {
    cancelPaneClose()
    setActivePane(undefined)
  })
  const openPane = useMemoizedFn((key: 'task-list' | 'timeline') => {
    cancelPaneClose()
    setActivePane(key)
  })
  const schedulePaneClose = useMemoizedFn(() => {
    cancelPaneClose()
    // 留出从入口穿过间距移入浮层的时间。
    closeTimer.current = setTimeout(closePane, 150)
  })

  const handleMenuMouseEnter = useMemoizedFn((key: AIRightPanelMenuKey) => {
    if (!isSmall) return false
    switch (key) {
      case 'task-list':
      case 'timeline':
        openPane(key)
        return true
      default:
        return false
    }
  })

  const handleMenuMouseLeave = useMemoizedFn((key: AIRightPanelMenuKey) => {
    if (!isSmall) return
    switch (key) {
      case 'task-list':
      case 'timeline':
        schedulePaneClose()
        break
      default:
        break
    }
  })

  useEffect(() => {
    closePane()
    return cancelPaneClose
  }, [isSmall, activeChat?.Id, closePane, cancelPaneClose])

  const mainMenus = useCreation(() => {
    // 无 questionID 或非 ai-agent 来源时不展示「任务详情」入口
    const showTaskBoard = !!currentChatStatusQuestionID && getSetting().Source === AISourceEnum.aiAgent
    if (!showTaskBoard) {
      return MAIN_MENUS.filter((item) => item.key !== 'task-board')
    }
    return MAIN_MENUS
  }, [currentChatStatusQuestionID])

  // 任务详情/文件系统/流量/漏洞打开工作区对应 tab；导出/查看日志行为与 AIHorizontalScrollCard 一致
  const handleMenuClick = useMemoizedFn((key: AIRightPanelMenuKey) => {
    switch (key) {
      case 'task-list':
      case 'timeline':
        openPane(key)
        break
      case 'task-board':
        syncCasualTaskTab()
        break
      case 'file-system':
        // 文件树在左侧边栏的会话 tab 分栏内，激活侧边栏并切到该 tab（emit 协议与 AIModelSelect.onSwitchAIAgentTab 一致）
        emiter.emit(
          'switchAIAgentTab',
          JSON.stringify({
            type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
            params: { active: AIAgentTabListEnum.Session, show: true },
          }),
        )
        break
      case 'traffic':
        emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.HTTP }))
        break
      case 'risk':
        emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.Risk }))
        break
      case 'export-log':
        setExportModalVisible(true)
        break
      case 'view-log':
        onOpenLogWindow()
        break
      default:
        break
    }
  })

  const onExportCancel = useMemoizedFn(() => {
    setExportModalVisible(false)
  })

  const onExportOk = useMemoizedFn(async (data: { types: string[]; outputPath: string }) => {
    if (!activeChat?.Id) {
      failed(t('AIChatContent.noActiveChat'))
      return
    }
    setExportLoading(true)
    try {
      await grpcExportAILogs(
        {
          SessionID: activeChat.SessionID,
          ExportDataTypes: data.types,
          OutputPath: data.outputPath,
        },
        true,
      )
      yakitNotify('success', t('YakitNotification.exportSuccess'))
      setExportModalVisible(false)
    } catch (error) {
      failed(t('YakitNotification.exportFailed', { error: error + '' }))
    } finally {
      setExportLoading(false)
    }
  })

  const renderSmallBadge = useMemoizedFn((key: AIRightPanelMenuKey) => {
    if (!isSmall) return undefined

    switch (key) {
      case 'risk':
        return riskTotal > 0 ? riskTotal : undefined
      default:
        return undefined
    }
  })

  const renderMenuSuffix = useMemoizedFn((key: AIRightPanelMenuKey) => {
    if (key === 'traffic' && executionData?.http_flow_count) {
      return <span className={styles['count-tag']}>{executionData.http_flow_count}</span>
    }
    if (key === 'risk' && riskCounts) {
      const entries = RISK_TAG_ORDER.map((field) => ({ field, value: riskCounts[field] })).filter(
        (entry) => !!entry.value,
      )
      if (!entries.length) return null
      return (
        <span className={styles['risk-tag']}>
          {entries.map((entry, index) => (
            <React.Fragment key={entry.field}>
              {index > 0 && <span className={styles['risk-tag-separator']}>｜</span>}
              <span className={classNames(styles['risk-tag-value'], styles[`risk-tag-value-${entry.field}`])}>
                {entry.value}
              </span>
            </React.Fragment>
          ))}
        </span>
      )
    }
    return null
  })

  const renderPaneTitle = useMemoizedFn(() => {
    switch (activePane) {
      case 'task-list':
        return t('AIRightPanel.taskList')
      case 'timeline':
        return t('AIRightPanel.timeline')
      default:
        return ''
    }
  })

  const renderPaneContent = useMemoizedFn(() => {
    switch (activePane) {
      case 'task-list':
        return <TaskListPane />
      case 'timeline':
        return <TimelineCard />
      default:
        return null
    }
  })

  const renderMoreToggle = useMemoizedFn(() => (
    <MenuItem
      icon={moreOpen ? <ChevronDoubleUpOutlined /> : <ChevronDoubleDownOutlined />}
      label={moreOpen ? t('AIRightPanel.collapse') : t('AIRightPanel.more')}
      small={isSmall}
      secondary
      onClick={() => setMoreOpen((prev) => !prev)}
    />
  ))

  return (
    <div className={styles['right-panel-wrapper']} data-ai-right-panel data-ai-right-panel-small={isSmall}>
      <div
        className={classNames(styles['right-panel'], {
          [styles['right-panel-small']]: isSmall,
          [styles['right-panel-hidden']]: !!activePane && !isSmall,
        })}
      >
        <div
          className={classNames(styles['panel-top'], {
            [styles['panel-top-small']]: isSmall,
          })}
        >
          <div className={styles['menu-group']}>
            {!isSmall && <DataCards executionData={executionData} />}
            {mainMenus.map((item) => (
              <MenuItem
                key={item.key}
                icon={item.icon}
                label={t(item.labelKey)}
                small={isSmall}
                suffix={renderMenuSuffix(item.key)}
                smallBadge={renderSmallBadge(item.key)}
                onClick={() => handleMenuClick(item.key)}
                onMouseEnter={() => handleMenuMouseEnter(item.key)}
                onMouseLeave={() => handleMenuMouseLeave(item.key)}
              />
            ))}
          </div>
        </div>
        <div className={styles['divider']} />
        <div className={styles['bottom-group']}>
          {moreOpen &&
            MORE_MENUS.map((item) => (
              <MenuItem
                key={item.key}
                icon={item.icon}
                label={t(item.labelKey)}
                small={isSmall}
                onClick={() => handleMenuClick(item.key)}
                onMouseEnter={() => handleMenuMouseEnter(item.key)}
                onMouseLeave={() => handleMenuMouseLeave(item.key)}
              />
            ))}
          {renderMoreToggle()}
        </div>
      </div>
      {activePane && (
        <div
          className={classNames(styles['pane-slot'], { [styles['pane-slot-small']]: isSmall })}
          onMouseEnter={isSmall ? cancelPaneClose : undefined}
          onMouseLeave={isSmall ? schedulePaneClose : undefined}
        >
          <AIRightPanelPane title={renderPaneTitle()} onClose={closePane}>
            {renderPaneContent()}
          </AIRightPanelPane>
        </div>
      )}
      <ExportAILogsModal
        visible={exportModalVisible}
        onCancel={onExportCancel}
        onOk={onExportOk}
        loading={exportLoading}
      />
    </div>
  )
})

export default AIRightPanel
