import type { ExecResult } from '@/pages/invoker/schema'
import type { YakParamProps } from '@/pages/plugins/pluginsType'
import type { YakExecutorParam } from '@/pages/invoker/YakExecutorParams'

export const CONTEXT_MENU_PLUGIN_TYPE = 'context-menu'
export const LEGACY_CONTEXT_MENU_PLUGIN_TYPE = 'codec'

export const ContextMenuScene = {
  HistorySingle: 'history-single',
  HistoryMulti: 'history-multi',
  HTTPPacket: 'http-packet',
} as const

export type ContextMenuScene = (typeof ContextMenuScene)[keyof typeof ContextMenuScene]

export const ContextMenuResultMode = {
  Auto: 'auto',
  Dialog: 'dialog',
  Drawer: 'drawer',
  Tab: 'tab',
} as const

export type ContextMenuResultMode = (typeof ContextMenuResultMode)[keyof typeof ContextMenuResultMode]

export type ContextMenuTrigger = 'context-menu' | 'shortcut'
export type ContextMenuHttpsState = 'unknown' | 'http' | 'https' | 'mixed'

export const ContextMenuExecutionType = {
  ContextMenu: 'context-menu',
  LegacyHistory: 'legacy-codec-history',
  LegacyPacketContext: 'legacy-codec-context',
  LegacyPacketMutate: 'legacy-codec-mutate',
} as const

export type ContextMenuExecutionType = (typeof ContextMenuExecutionType)[keyof typeof ContextMenuExecutionType]

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
  action: ContextMenuAction
  request: Omit<ExecuteContextMenuActionRequest, 'PluginUUID' | 'ActionID' | 'Params'>
  params?: YakExecutorParam[]
  configureParams?: boolean
  onPacketResult?: (result: ContextMenuPacketActionResult) => boolean | void
}

export const contextMenuSceneName: Record<ContextMenuScene, string> = {
  [ContextMenuScene.HistorySingle]: 'History 单选',
  [ContextMenuScene.HistoryMulti]: 'History 多选',
  [ContextMenuScene.HTTPPacket]: 'HTTP 数据包',
}

export const contextMenuResultModeName: Record<ContextMenuResultMode, string> = {
  [ContextMenuResultMode.Auto]: '自动',
  [ContextMenuResultMode.Dialog]: '弹框',
  [ContextMenuResultMode.Drawer]: '抽屉',
  [ContextMenuResultMode.Tab]: '新 TAB',
}
