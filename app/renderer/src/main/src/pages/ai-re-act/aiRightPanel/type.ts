import type React from 'react'

/** 右侧面板菜单项标识 */
export type AIRightPanelMenuKey =
  | 'task-board'
  | 'file-system'
  | 'traffic'
  | 'risk'
  | 'session-history'
  | 'task-list'
  | 'timeline'
  | 'export-log'
  | 'view-log'

/** 工具调用统计 */
export interface AIRightPanelToolStats {
  success?: number
  failed?: number
  total?: number
}

/** 漏洞各等级计数，展示顺序为 严重/高危/中危/低危/未知，等级色走主题 Status 语义色 */
export interface AIRightPanelRiskCounts {
  serious?: number
  high?: number
  medium?: number
  low?: number
  unknown?: number
}

export interface AIRightPanelProps {
  /** AI 聊天外层容器 ref：用于计算扣除正常态面板槽位后的列表可用宽度 */
  layoutRef?: React.RefObject<HTMLElement | null>
  /** 是否使用小屏图标栏 */
  small?: boolean
  /** 当前选中的菜单项 */
  activeKey?: AIRightPanelMenuKey
  onMenuClick?: (key: AIRightPanelMenuKey) => void
  /** 执行时长展示文案，如 "7s"；未传时展示占位 "—" */
  executionDuration?: string
  /** 工具调用统计，未传的数值展示占位 "—" */
  toolCallStats?: AIRightPanelToolStats
  /** 流量条目右侧计数角标，未传不展示 */
  trafficCount?: number | string
  /** 漏洞条目右侧各等级计数角标，未传不展示 */
  riskCounts?: AIRightPanelRiskCounts
  className?: string
  style?: React.CSSProperties
}

/** AIReActChat 列表与输入框内容轨道的最大宽度（px） */
export const AI_RIGHT_PANEL_INPUT_MAX_WIDTH = 784

/** 正常态面板槽位：301px 面板 + 12px 右侧留白 + 12px 内容间距 */
export const AI_RIGHT_PANEL_NORMAL_SLOT_WIDTH = 325
