import type { ExecResult } from '@/pages/invoker/schema'
import type { YakExecutorParam } from '@/pages/invoker/YakExecutorParams'
import type { YakParamProps } from '@/pages/plugins/pluginsType'

export const ContextMenuScene = {
  HistorySingle: 'history-single',
  HistoryMulti: 'history-multi',
  HTTPPacket: 'http-packet',
} as const

export type ContextMenuScene = (typeof ContextMenuScene)[keyof typeof ContextMenuScene]

/** 执行结果展示方式 */
export const ContextMenuResultMode = {
  Auto: 'auto',
  Dialog: 'dialog',
  Drawer: 'drawer',
  Tab: 'tab',
} as const

export type ContextMenuResultMode = (typeof ContextMenuResultMode)[keyof typeof ContextMenuResultMode]

export type ContextMenuTrigger = 'context-menu' | 'shortcut'
export type ContextMenuHttpsState = 'unknown' | 'http' | 'https' | 'mixed'

/** 动作执行链路：context-menu 为新流式执行，legacy-codec-* 为旧 codec 执行路径 */
export const ContextMenuExecutionType = {
  ContextMenu: 'context-menu',
  LegacyHistory: 'legacy-codec-history',
  LegacyPacketContext: 'legacy-codec-context',
  LegacyPacketMutate: 'legacy-codec-mutate',
} as const

export type ContextMenuExecutionType = (typeof ContextMenuExecutionType)[keyof typeof ContextMenuExecutionType]

/** 一个插件可暴露多个动作，以 (PluginUUID, ActionID) 唯一标识 */
export interface ContextMenuAction {
  PluginUUID: string
  PluginName: string
  ActionID: string
  HookName: string
  Enabled: boolean
  Locked: boolean
  Sort: number
  Shortcut: string
  ResultMode: ContextMenuResultMode
  AskBeforeRun: boolean
  Params: YakParamProps[]
  IsCorePlugin: boolean
  Scene: ContextMenuScene
  PluginType: string
  ExecutionType: ContextMenuExecutionType
  Help: string
  HeadImg: string
  SupportsResultMode: boolean
  IsAIPlugin: boolean
}

export interface QueryContextMenuActionsRequest {
  /** 空为全部场景 */
  Scene?: ContextMenuScene | ''
  IncludeDisabled?: boolean
}

export interface QueryContextMenuActionsResponse {
  Actions: ContextMenuAction[]
  EnabledCustomPluginCount: number
  MaxCustomPluginCount: number
}

export interface SetContextMenuActionBindingRequest {
  PluginUUID: string
  ActionID: string
  Enabled: boolean
  Sort: number
  Shortcut: string
  ResultMode: ContextMenuResultMode
  AskBeforeRun: boolean
}

export interface ExecuteContextMenuActionRequest {
  PluginUUID: string
  ActionID: string
  Source: string
  Trigger: ContextMenuTrigger
  HttpsState: ContextMenuHttpsState
  HTTPFlowIDs: number[]
  Request?: Uint8Array
  Response?: Uint8Array
  HasRequest: boolean
  HasResponse: boolean
  Params: YakExecutorParam[]
  PacketRevision: string
}

export interface ContextMenuPacketActionResult {
  Request: Uint8Array
  Response: Uint8Array
  ReplaceRequest: boolean
  ReplaceResponse: boolean
  RequireConfirmation: boolean
  PacketRevision: string
}

export type ContextMenuActionStatus =
  | 'started'
  | 'data'
  | 'packet-result'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout'

export interface ContextMenuActionEvent {
  RuntimeID: string
  Status: ContextMenuActionStatus
  Reason: string
  ResultMode: ContextMenuResultMode
  PluginName: string
  Result?: ExecResult
  PacketResult?: ContextMenuPacketActionResult
}

export interface RunContextMenuActionOptions {
  action: ContextMenuAction // action.Params 描述表单结构
  request: Omit<ExecuteContextMenuActionRequest, 'PluginUUID' | 'ActionID' | 'Params'>
  params?: YakExecutorParam[] // 执行runContextMenuAction不需要填，该参数表示表单提交的结果
  configureParams?: boolean
  onPacketResult?: (result: ContextMenuPacketActionResult) => boolean | void
}
