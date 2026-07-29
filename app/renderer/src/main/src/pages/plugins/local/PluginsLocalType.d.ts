import { QueryYakScriptRequest, YakScript } from '@/pages/invoker/schema'
import { API } from '@/services/swagger/resposeType'
import { ReactNode } from 'react'

export interface LocalPluginExecuteProps {
  plugin: YakScript
  headExtraNode: ReactNode
  /**插件UI联动相关参数*/
  linkPluginConfig?: HybridScanPluginConfig
  /** 隐藏插件 ID */
  isHiddenUUID?: boolean
  infoExtra?: ReactNode
  /** 隐藏更新按钮 */
  hiddenUpdateBtn?: boolean
  initExecParamsValue?: CustomPluginExecuteFormValue
  code?: string
  input?: string
  noHTTPRequestTemplate?: boolean
  autoExecute?: boolean
}

export interface ExportYakScriptStreamRequest {
  OutputFilename: string
  Password: string
  OutputPluginDir: string
  Filter: QueryYakScriptRequest
}

export interface ExportYakScriptLocalResponse {
  OutputDir: string
  Progress: number
  Message: string
  MessageType: string
}

export interface PluginDetailsTabProps {
  /** 详情页最外层元素的id */
  pageWrapId?: string
  /**显示执行模块 */
  executorShow: boolean
  /**插件数据 */
  plugin: YakScript
  headExtraNode: ReactNode
  wrapperClassName?: string
  /**插件UI联动相关参数*/
  linkPluginConfig?: HybridScanPluginConfig
  initExecParamsValue?: CustomPluginExecuteFormValue
  code?: string
  input?: string
  noHTTPRequestTemplate?: boolean
  autoExecute?: boolean
}
export interface PluginGroupList extends API.PluginsSearch {
  groupExtraOptBtn?: React.ReactElement
}
