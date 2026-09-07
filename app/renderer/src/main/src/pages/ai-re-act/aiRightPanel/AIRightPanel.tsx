import React, { useEffect, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
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
import styles from './AIRightPanel.module.scss'
import type { AIRightPanelMenuKey, AIRightPanelProps, AIRightPanelRiskCounts, AIRightPanelToolStats } from './type'
import { AI_RIGHT_PANEL_INPUT_MAX_WIDTH, AI_RIGHT_PANEL_NORMAL_SLOT_WIDTH } from './type'

/** 菜单项定义：key 唯一标识（回调/选中态用），labelKey 为 i18n 文案 key，icon 为入口图标 */
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

/** 漏洞计数角标的展示顺序（严重/高危/中危/低危/未知，颜色见 risk-tag-value-* 样式） */
const RISK_TAG_ORDER: Array<keyof AIRightPanelRiskCounts> = ['serious', 'high', 'medium', 'low', 'unknown']

/** 工具调用统计的三个指标（成功/失败带专属色 tone，对应 stat-value-* 样式；总尝试次数用默认色） */
const TOOL_STATS: Array<{ field: keyof AIRightPanelToolStats; labelKey: string; tone?: 'success' | 'failed' }> = [
  { field: 'success', labelKey: 'AIRightPanel.success', tone: 'success' },
  { field: 'failed', labelKey: 'AIRightPanel.failed', tone: 'failed' },
  { field: 'total', labelKey: 'AIRightPanel.totalAttempts' },
]

/** 执行时长、工具调用统计等数据未传入时的占位符 */
const PLACEHOLDER = '—'

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  small?: boolean
  secondary?: boolean
  suffix?: React.ReactNode
  onClick?: () => void
}

const MenuItem: React.FC<MenuItemProps> = React.memo(({ icon, label, active, small, secondary, suffix, onClick }) => {
  return (
    <div
      className={classNames(
        styles['menu-item'],
        small && styles['menu-item-small'],
        active && styles['menu-item-active'],
      )}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onClick}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && onClick) {
          event.preventDefault()
          onClick()
        }
      }}
    >
      <div className={styles['menu-item-base']}>
        <span
          className={classNames(
            styles['menu-item-icon'],
            small && styles['menu-item-icon-small'],
            secondary && styles['menu-item-icon-secondary'],
          )}
        >
          {icon}
        </span>
        {!small && (
          <span className={classNames(styles['menu-item-label'], secondary && styles['menu-item-label-secondary'])}>
            {label}
          </span>
        )}
      </div>
      {!small && suffix}
    </div>
  )
})

/**
 * Memfit AI 右侧功能面板：
 * - 正常态（宽 301px）：数据卡片 + 主菜单 + 底部「更多」分组，更多分组可在 展开/收起 间切换
 * - 小屏态（正常态面板会使列表可用宽度小于最大宽度时）：仅图标的窄栏（宽 41px）
 */
export const AIRightPanel: React.FC<AIRightPanelProps> = React.memo((props) => {
  const {
    layoutRef,
    small,
    activeKey,
    onMenuClick,
    executionDuration,
    toolCallStats,
    trafficCount,
    riskCounts,
    className,
    style,
  } = props
  const { t } = useI18nNamespaces(['aiAgent'])
  const [moreOpen, setMoreOpen] = useState(false)
  const [chatSmall, setChatSmall] = useState(false)

  useEffect(() => {
    // 监听面板外层宽度；chat-layout-wrapper 会随当前态改变宽度，不能把它作为判断输入，否则会形成反馈回路。
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

  const handleClick = useMemoizedFn((key: AIRightPanelMenuKey) => () => onMenuClick?.(key))

  const renderMenuSuffix = useMemoizedFn((key: AIRightPanelMenuKey) => {
    if (key === 'traffic' && trafficCount !== undefined) {
      return <span className={styles['count-tag']}>{trafficCount}</span>
    }
    if (key === 'risk' && riskCounts) {
      const entries = RISK_TAG_ORDER.map((field) => ({ field, value: riskCounts[field] })).filter(
        (entry) => entry.value !== undefined,
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

  const renderDataCards = useMemoizedFn(() => (
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
  ))

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
    <div
      className={classNames(styles['right-panel-wrapper'], className)}
      data-ai-right-panel
      data-ai-right-panel-small={isSmall}
      style={style}
    >
      <div
        className={classNames(styles['right-panel'], {
          [styles['right-panel-small']]: isSmall,
        })}
      >
        <div
          className={classNames(styles['panel-top'], {
            [styles['panel-top-small']]: isSmall,
          })}
        >
          <div className={styles['menu-group']}>
            {!isSmall && renderDataCards()}
            {MAIN_MENUS.map((item) => (
              <MenuItem
                key={item.key}
                icon={item.icon}
                label={t(item.labelKey)}
                active={activeKey === item.key}
                small={isSmall}
                suffix={renderMenuSuffix(item.key)}
                onClick={handleClick(item.key)}
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
                active={activeKey === item.key}
                small={isSmall}
                onClick={handleClick(item.key)}
              />
            ))}
          {renderMoreToggle()}
        </div>
      </div>
    </div>
  )
})

export default AIRightPanel
