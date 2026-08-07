import { type StreamResult } from '@/hook/useHoldGRPCStream/useHoldGRPCStreamType'
import { type PluginFilterParams, type PluginSearchParams } from '@/pages/plugins/baseTemplateType'
import { type ExpandAndRetractExcessiveState } from '@/pages/plugins/operator/expandAndRetract/ExpandAndRetract'
import { type PortScanParams } from '@/pages/portscan/PortScanPage'
import { type ScanPortPageInfoProps } from '@/store/pageInfo'
import type { FormInstance } from 'antd'

export interface NewPortScanProps {
  id: string
}

interface PluginListSearchInfoProps {
  search: PluginSearchParams
  filters: PluginFilterParams
}
export interface NewPortScanExecuteProps {
  selectNum: number
  hidden: boolean
  setHidden: (b: boolean) => void
  selectList: string[]
  setSelectList: (s: string[]) => void
  pluginListSearchInfo: PluginListSearchInfoProps
  allCheck: boolean
  pageId: string
}
export interface NewPortScanExecuteContentProps {
  ref?: React.ForwardedRef<NewPortScanExecuteContentRefProps>
  isExpand: boolean
  setIsExpand: (b: boolean) => void
  executeStatus: ExpandAndRetractExcessiveState
  setExecuteStatus: (b: ExpandAndRetractExcessiveState) => void
  selectNum: number
  pluginListSearchInfo: PluginListSearchInfoProps
  selectList: string[]
  setProgressList: (s: StreamResult.Progress[]) => void
  allCheck: boolean
  pageInfo: ScanPortPageInfoProps
}

export interface NewPortScanExecuteContentRefProps {
  onStopExecute: () => void
  onStartExecute: () => void
  onCreateReport: () => void
}

export interface NewPortScanExecuteFormProps {
  inViewport: boolean
  form: FormInstance<any>
  disabled: boolean
  extraParamsValue: PortScanExecuteExtraFormValue
  inputType: 'content' | 'path'
  setInputType: (v: 'content' | 'path') => void
}

export interface PortScanExecuteExtraFormValue extends PortScanParams {
  /**扫描协议,前端使用 */
  scanProtocol: 'tcp' | 'udp'
  /**简易版 安全检测页面的额外参数 预设端口 */
  presetPort?: string[]
  /**简易版 扫描模式选中的插件组 */
  pluginGroup?: string[]
}
