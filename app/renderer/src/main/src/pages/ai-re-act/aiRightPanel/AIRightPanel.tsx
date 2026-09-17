import React, { useEffect, useRef, useState } from 'react'
import { TaskListPane } from '@/pages/ai-agent/chatTemplate/historyTaskTree/TaskListPane'
import { AIRightPanelPane } from './AIRightPanelPane'
import TimelineCard from '@/pages/ai-agent/chatTemplate/TimelineCard/TimelineCard'
import HistoryChat from '@/pages/ai-agent/historyChat/HistoryChat'
import { AI_AGENT_HISTORY_AI_SOURCES } from '../hooks/useGetChatDataStoreKey'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useCreation, useInViewport, useMemoizedFn } from 'ahooks'
import { useStore } from 'zustand'
import { useCurrentStore } from '../hooks/useCurrentDataBySession'
import useCurrentTaskExecution from '../hooks/useCurrentTaskData/useCurrentTaskExecution'
import { useWelcomePanelStats } from '@/pages/ai-agent/aiChatWelcome/hooks/useWelcomePanelStats'
import classNames from 'classnames'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { timeDiffWithMoment } from '@/utils/timeUtil'
import { AISourceEnum, type AIAgentGrpcApi } from '../hooks/grpcApi'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
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
  CogOutlined,
  FigmaIcon2017756Outlined,
  FigmaIcon348196674Outlined,
  FlagOutlined,
  FolderOpenOutlined,
  NewspaperOutlined,
  ScrollTextOutlined,
  TimelineOutlined,
  XOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { Tooltip } from 'antd'
import styles from './AIRightPanel.module.scss'
import type {
  AIRightPanelMenuKey,
  AIRightPanelPaneKey,
  AIRightPanelProps,
  AIRightPanelRiskCounts,
  AIRightPanelToolStats,
} from './type'
import { AI_RIGHT_PANEL_INPUT_MAX_WIDTH, AI_RIGHT_PANEL_NORMAL_SLOT_WIDTH } from './type'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'

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

const WELCOME_MENUS = MAIN_MENUS.filter((item) => item.key !== 'task-board' && item.key !== 'task-list')

/** 「更多」分组展开后追加显示的功能入口（收起态仅在底部显示「更多」按钮） */
const MORE_MENUS: MenuItemDef[] = [
  { key: 'ai-settings', labelKey: 'AIRightPanel.aiSettings', icon: <CogOutlined /> },
  { key: 'timeline', labelKey: 'AIRightPanel.timeline', icon: <TimelineOutlined /> },
  { key: 'export-log', labelKey: 'AIRightPanel.exportLog', icon: <FigmaIcon2017756Outlined /> },
  { key: 'view-log', labelKey: 'AIRightPanel.viewLog', icon: <NewspaperOutlined /> },
]

/** 漏洞计数角标的展示顺序；后端标准等级映射到设计稿中的五种颜色。 */
const RISK_TAG_ORDER: Array<keyof AIRightPanelRiskCounts> = ['serious', 'high', 'medium', 'low', 'info']

/** 工具调用统计的三个指标（成功/失败带专属色 tone，对应 stat-value-* 样式；总尝试次数用默认色） */
const TOOL_STATS: Array<{ field: keyof AIRightPanelToolStats; labelKey: string; tone?: 'success' | 'failed' }> = [
  { field: 'success', labelKey: 'AIRightPanel.success', tone: 'success' },
  { field: 'failed', labelKey: 'AIRightPanel.failed', tone: 'failed' },
  { field: 'total', labelKey: 'AIRightPanel.totalAttempts' },
]

/** 执行时长、工具调用统计等数据缺失时的占位符 */
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
    const tooltipDismissedRef = useRef(false)

    const handleMouseEnter = useMemoizedFn(() => {
      const paneOpened = onMouseEnter?.() ?? false
      setTooltipOpen(!!small && !paneOpened && !tooltipDismissedRef.current)
    })
    const handleMouseLeave = useMemoizedFn(() => {
      tooltipDismissedRef.current = false
      setTooltipOpen(false)
      onMouseLeave?.()
    })

    const onItemClick = useMemoizedFn(() => {
      // 点击可能让大屏切为小屏；鼠标移出前不因新入口的悬停事件重新显示提示。
      tooltipDismissedRef.current = true
      setTooltipOpen(false)
      if (onClick) {
        onClick()
      }
    })

    // 菜单容器和交互行为在两种尺寸下相同，具体内容由大小屏分支分别生成。
    const renderMenuContainer = (children: React.ReactNode, className?: string) => (
      <div
        className={classNames(styles['menu-item'], className)}
        aria-label={label}
        onClick={onItemClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
    )

    // 正常态使用独立的文案和右侧 suffix，不渲染小屏专用结构。
    const renderNormalContent = () =>
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
      )

    // 小屏态只保留图标和可选角标，不渲染正常态文案或 suffix。
    const renderSmallContent = () =>
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

// #region 面板共享内核（首页 / 会话两种模式复用）
/**
 * 两种模式共用的面板内核：
 * - 小屏测量（small 未传时监听 layoutRef 宽度）
 * - 内容面板（activePane）的打开、关闭与延时关闭
 * - 小屏悬停打开浮层的交互
 */
const usePanelShared = (props: AIRightPanelProps) => {
  const { layoutRef, small } = props

  const [chatSmall, setChatSmall] = useState(false)
  useEffect(() => {
    // 监听滚动容器的父级（.ai-re-act-chat）宽度：内容轨道避让在 Virtuoso 内部 List 上，
    // 父级保持全宽不随面板态变化，宽度稳定可安全作为小屏判断输入。
    const layoutElement = layoutRef?.current
    if (small !== undefined || !layoutElement || typeof ResizeObserver === 'undefined') return

    const getLayoutWidth = () => layoutElement.clientWidth || layoutElement.getBoundingClientRect().width
    const update = (layoutWidth: number) => {
      // 页面隐藏时宽度为 0，保留尺寸模式，避免误关当前内容面板。
      if (layoutWidth <= 0) return
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

  const [activePane, setActivePane] = useState<AIRightPanelPaneKey>()
  const closeTimer = useRef<ReturnType<typeof setTimeout>>()
  const cancelPaneClose = useMemoizedFn(() => clearTimeout(closeTimer.current))
  const closePane = useMemoizedFn(() => {
    cancelPaneClose()
    setActivePane(undefined)
  })
  const openPane = useMemoizedFn((key: AIRightPanelPaneKey) => {
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
      case 'session-history':
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
      case 'session-history':
        schedulePaneClose()
        break
      default:
        break
    }
  })

  useEffect(() => {
    closePane()
    return cancelPaneClose
  }, [isSmall])

  return {
    isSmall,
    activePane,
    setActivePane,
    closePane,
    openPane,
    cancelPaneClose,
    schedulePaneClose,
    handleMenuMouseEnter,
    handleMenuMouseLeave,
  }
}

/** 主菜单区容器：panel-top + menu-group，两种模式共用；dataCards 为菜单上方的数据卡片区 */
const MenuList: React.FC<{
  menus: MenuItemDef[]
  small: boolean
  dataCards?: React.ReactNode
  trafficTotal?: number
  riskTotal?: number
  riskCounts?: AIRightPanelRiskCounts
  onMenuClick: (key: AIRightPanelMenuKey) => void
  onMenuMouseEnter: (key: AIRightPanelMenuKey) => boolean
  onMenuMouseLeave: (key: AIRightPanelMenuKey) => void
}> = ({
  menus,
  small,
  dataCards,
  trafficTotal,
  riskTotal = 0,
  riskCounts,
  onMenuClick,
  onMenuMouseEnter,
  onMenuMouseLeave,
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const renderSmallBadge = (key: AIRightPanelMenuKey) => {
    if (!small) return undefined

    switch (key) {
      case 'risk':
        return riskTotal > 0 ? riskTotal : undefined
      default:
        return undefined
    }
  }

  const renderMenuSuffix = (key: AIRightPanelMenuKey) => {
    if (key === 'traffic' && trafficTotal) {
      return (
        <YakitTag fullRadius color="white" border={false}>
          {trafficTotal}
        </YakitTag>
      )
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
  }

  return (
    <div className={classNames(styles['panel-top'], { [styles['panel-top-small']]: small })}>
      <div className={styles['menu-group']}>
        {dataCards}
        {menus.map((item) => (
          <MenuItem
            key={item.key}
            icon={item.icon}
            label={t(item.labelKey)}
            small={small}
            suffix={renderMenuSuffix(item.key)}
            smallBadge={renderSmallBadge(item.key)}
            onClick={() => onMenuClick(item.key)}
            onMouseEnter={() => onMenuMouseEnter(item.key)}
            onMouseLeave={() => onMenuMouseLeave(item.key)}
          />
        ))}
      </div>
    </div>
  )
}

/** 内容面板浮层：按打开的面板渲染标题与内容；会话历史由 HistoryChat 自带头部，隐藏浮层头部 */
const PaneSlot: React.FC<{
  pane: AIRightPanelPaneKey
  small: boolean
  onClose: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}> = React.memo(({ pane, small, onClose, onMouseEnter, onMouseLeave }) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])

  const renderTitle = () => {
    switch (pane) {
      case 'session-history':
        return t('AIRightPanel.sessionHistory')
      case 'task-list':
        return t('AIRightPanel.taskList')
      case 'timeline':
        return t('AIRightPanel.timeline')
      default:
        return ''
    }
  }

  const renderContent = () => {
    switch (pane) {
      case 'session-history':
        return (
          <HistoryChat
            aiSource={AI_AGENT_HISTORY_AI_SOURCES}
            title={t('AIRightPanel.sessionHistory')}
            hidePinButton
            headerActionsExtra={
              <YakitButton type="text2" aria-label={t('YakitButton.close')} icon={<XOutlined />} onClick={onClose} />
            }
          />
        )
      case 'task-list':
        return <TaskListPane />
      case 'timeline':
        return <TimelineCard />
      default:
        return null
    }
  }

  return (
    <div
      className={classNames(styles['pane-slot'], { [styles['pane-slot-small']]: small })}
      onMouseEnter={small ? onMouseEnter : undefined}
      onMouseLeave={small ? onMouseLeave : undefined}
    >
      <AIRightPanelPane
        title={renderTitle()}
        hideHeader={pane === 'session-history'}
        noPadding={pane === 'session-history'}
        onClose={onClose}
      >
        {renderContent()}
      </AIRightPanelPane>
    </div>
  )
})
// #endregion

// #region 首页模式：仅文件系统、流量、漏洞、会话历史四个入口，不订阅会话与任务相关数据
type PanelState = ReturnType<typeof usePanelShared>

type WelcomeRightPanelProps = Pick<AIRightPanelProps, 'layoutRef'> & { panel: PanelState }

const WelcomeRightPanel: React.FC<WelcomeRightPanelProps> = React.memo(({ panel, layoutRef }) => {
  const [inViewport = true] = useInViewport(layoutRef)
  const welcomeStats = useWelcomePanelStats(inViewport)
  /**
   * 菜单点击：会话历史打开右侧内容面板；
   * 文件系统展开侧栏文件页，流量、漏洞切换工作区 tab。
   */
  const handleMenuClick = useMemoizedFn((key: AIRightPanelMenuKey) => {
    switch (key) {
      case 'session-history':
        panel.openPane(key)
        break
      case 'file-system':
        // 文件树位于左侧边栏的文件页，展开侧边栏并切换到该页。
        emiter.emit(
          'switchAIAgentTab',
          JSON.stringify({
            type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
            params: { active: AIAgentTabListEnum.File, show: true },
          }),
        )
        break
      case 'traffic':
        emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.HTTP }))
        break
      case 'risk':
        emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.Risk }))
        break
      default:
        break
    }
  })

  return (
    <>
      <div
        className={classNames(styles['right-panel'], {
          [styles['right-panel-small']]: panel.isSmall,
          [styles['right-panel-hidden']]: !!panel.activePane && !panel.isSmall,
        })}
      >
        <MenuList
          menus={WELCOME_MENUS}
          small={panel.isSmall}
          {...welcomeStats}
          onMenuClick={handleMenuClick}
          onMenuMouseEnter={panel.handleMenuMouseEnter}
          onMenuMouseLeave={panel.handleMenuMouseLeave}
        />
      </div>
    </>
  )
})
// #endregion

// #region 会话模式：数据卡片 + 主菜单 + 底部「更多」分组 + 任务、导出日志等会话相关交互
type ChatRightPanelProps = { panel: PanelState }

const ChatRightPanel: React.FC<ChatRightPanelProps> = React.memo((props) => {
  const { panel } = props
  const store = useCurrentStore()
  const questionID = useStore(store, (state) => state.currentChatStatus.questionID)
  const executionData = useCurrentTaskExecution(questionID)
  const levelCount = executionData?.risk_level_count
  // 快照 risk_level_count 为固定字段，直接映射展示等级；
  // 首页全量统计侧的多别名归并见 useWelcomePanelStats.getRiskCounts，两处语义不同未合并，调整归并时需同步检查。
  const riskCounts = useCreation<AIRightPanelRiskCounts | undefined>(() => {
    if (!levelCount) return undefined
    return {
      serious: levelCount.critical,
      high: levelCount.high,
      medium: levelCount.warning,
      low: levelCount.low,
      info: levelCount.info + levelCount.other,
    }
  }, [levelCount])
  const riskTotal = levelCount?.total ?? Object.values(riskCounts ?? {}).reduce((total, count) => total + count, 0)
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [moreOpen, setMoreOpen] = useState(false)
  // 菜单点击交互：打开工作区 tab / 导出与查看日志
  const { activeChat } = useAIAgentStore()
  const { getSetting } = useAIAgentDispatcher()
  const { currentChatStatusQuestionID, syncCasualTaskTab } = useCasualTaskTab()
  const { onOpenLogWindow } = useAiChatLog()
  const [exportModalVisible, setExportModalVisible] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    // 切换会话时保留会话历史浮层，其余面板关闭
    panel.cancelPaneClose()
    panel.setActivePane((pane) => (pane === 'session-history' ? pane : undefined))
  }, [activeChat?.Id])

  const mainMenus = useCreation(() => {
    // 无 questionID 或非 ai-agent 来源时不展示「任务详情」入口
    const showTaskBoard = !!currentChatStatusQuestionID && getSetting().Source === AISourceEnum.aiAgent
    if (!showTaskBoard) {
      return MAIN_MENUS.filter((item) => item.key !== 'task-board')
    }
    return MAIN_MENUS
  }, [currentChatStatusQuestionID])

  /**
   * 菜单点击：任务列表、时间线、会话历史打开右侧内容面板；
   * 任务详情、流量、漏洞切换工作区 tab；文件系统打开侧栏文件页；
   * AI 设置打开设置页，导出日志打开导出弹窗，查看日志打开日志窗口。
   */
  const handleMenuClick = useMemoizedFn((key: AIRightPanelMenuKey) => {
    switch (key) {
      case 'task-list':
      case 'timeline':
      case 'session-history':
        panel.openPane(key)
        break
      case 'task-board':
        syncCasualTaskTab()
        break
      case 'file-system':
        // 文件树位于左侧边栏的文件页，展开侧边栏并切换到该页。
        emiter.emit(
          'switchAIAgentTab',
          JSON.stringify({
            type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
            params: { active: AIAgentTabListEnum.File, show: true },
          }),
        )
        break
      case 'traffic':
        emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.HTTP }))
        break
      case 'risk':
        emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.Risk }))
        break
      case 'ai-settings':
        emiter.emit('openPage', JSON.stringify({ route: YakitRoute.Settings, params: { anchor: 'ai-config' } }))
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
    await grpcExportAILogs(
      {
        SessionID: activeChat.SessionID,
        ExportDataTypes: data.types,
        OutputPath: data.outputPath,
      },
      true,
    )
      .then(() => {
        yakitNotify('success', t('YakitNotification.exportSuccess'))
        setExportModalVisible(false)
      })
      .catch((error) => {
        failed(t('YakitNotification.exportFailed', { error: error + '' }))
      })
      .finally(() => {
        setExportLoading(false)
      })
  })

  const renderMoreToggle = () => (
    <MenuItem
      icon={moreOpen ? <ChevronDoubleUpOutlined /> : <ChevronDoubleDownOutlined />}
      label={moreOpen ? t('AIRightPanel.collapse') : t('AIRightPanel.more')}
      small={panel.isSmall}
      secondary
      onClick={() => setMoreOpen((prev) => !prev)}
    />
  )

  return (
    <>
      <div
        className={classNames(styles['right-panel'], {
          [styles['right-panel-small']]: panel.isSmall,
          [styles['right-panel-hidden']]: !!panel.activePane && !panel.isSmall,
        })}
      >
        <MenuList
          menus={mainMenus}
          small={panel.isSmall}
          dataCards={!panel.isSmall ? <DataCards executionData={executionData} /> : undefined}
          trafficTotal={executionData?.http_flow_count}
          riskTotal={riskTotal}
          riskCounts={riskCounts}
          onMenuClick={handleMenuClick}
          onMenuMouseEnter={panel.handleMenuMouseEnter}
          onMenuMouseLeave={panel.handleMenuMouseLeave}
        />
        <div className={styles['divider']} />
        <div className={styles['bottom-group']}>
          {moreOpen &&
            MORE_MENUS.map((item) => (
              <MenuItem
                key={item.key}
                icon={item.icon}
                label={t(item.labelKey)}
                small={panel.isSmall}
                onClick={() => handleMenuClick(item.key)}
                onMouseEnter={() => panel.handleMenuMouseEnter(item.key)}
                onMouseLeave={() => panel.handleMenuMouseLeave(item.key)}
              />
            ))}
          {renderMoreToggle()}
        </div>
      </div>
      <ExportAILogsModal
        visible={exportModalVisible}
        onCancel={onExportCancel}
        onOk={onExportOk}
        loading={exportLoading}
      />
    </>
  )
})
// #endregion

/**
 * Memfit AI 右侧功能面板：
 * - 首页模式（welcome）：仅文件系统、流量、漏洞、会话历史四个入口，不订阅会话与任务数据
 * - 正常态（宽 301px）：数据卡片 + 主菜单 + 底部「更多」分组，更多分组可在 展开/收起 间切换
 * - 小屏态（正常态面板会使列表可用宽度小于最大宽度时）：仅图标的窄栏（宽 41px）
 */
export const AIRightPanel: React.FC<AIRightPanelProps> = React.memo((props) => {
  const { welcome = false } = props
  const panel = usePanelShared(props)
  useEffect(() => {
    if (!welcome) return
    panel.cancelPaneClose()
    panel.setActivePane((pane) => (pane === 'session-history' ? pane : undefined))
  }, [welcome])
  return (
    <div className={styles['right-panel-wrapper']} data-ai-right-panel data-ai-right-panel-small={panel.isSmall}>
      {welcome ? <WelcomeRightPanel panel={panel} layoutRef={props.layoutRef} /> : <ChatRightPanel panel={panel} />}
      {panel.activePane && (
        <PaneSlot
          pane={panel.activePane}
          small={panel.isSmall}
          onClose={panel.closePane}
          onMouseEnter={panel.cancelPaneClose}
          onMouseLeave={panel.schedulePaneClose}
        />
      )}
    </div>
  )
})

export default AIRightPanel
