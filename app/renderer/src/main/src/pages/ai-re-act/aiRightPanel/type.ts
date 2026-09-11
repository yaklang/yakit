import type React from 'react'
import type { AIAgentGrpcApi } from '../hooks/grpcApi'

/** 右侧可打开的内容面板标识 */
export type AIRightPanelPaneKey = 'task-list' | 'timeline' | 'session-history'

/** 右侧面板菜单项标识 */
export type AIRightPanelMenuKey =
  | 'task-board'
  | 'file-system'
  | 'traffic'
  | 'risk'
  | 'session-history'
  | 'task-list'
  | 'timeline'
  | 'ai-settings'
  | 'export-log'
  | 'view-log'

/** 工具调用统计 */
export interface AIRightPanelToolStats {
  success?: number
  failed?: number
  total?: number
}

/** 漏洞各等级计数，展示顺序为 严重/高危/中危/低危/信息，等级色走主题 Status 语义色 */
export interface AIRightPanelRiskCounts {
  serious?: number
  high?: number
  medium?: number
  low?: number
  info?: number
}

export interface AIRightPanelProps {
  /** 首页模式：仅展示文件系统、流量、漏洞、会话历史 */
  welcome?: boolean
  /** 调用方提供的流量总数 */
  trafficTotal?: number
  /** 调用方提供的漏洞总数 */
  riskTotal?: number
  /** 调用方提供的漏洞等级计数 */
  riskCounts?: AIRightPanelRiskCounts
  /** 自由对话的数据卡片内容，未提供时不展示数据卡片 */
  executionData?: AIAgentGrpcApi.SessionSnapshot['execution']
  /** AI 聊天外层容器 ref：用于计算扣除正常态面板槽位后的列表可用宽度 */
  layoutRef?: React.RefObject<HTMLElement | null>
  /** 是否使用小屏图标栏 */
  small?: boolean
}

/** AIReActChat 列表与输入框内容轨道的最大宽度（px） */
export const AI_RIGHT_PANEL_INPUT_MAX_WIDTH = 784

/** 正常态面板槽位：301px 面板 + 12px 右侧留白 + 12px 内容间距 */
export const AI_RIGHT_PANEL_NORMAL_SLOT_WIDTH = 325
