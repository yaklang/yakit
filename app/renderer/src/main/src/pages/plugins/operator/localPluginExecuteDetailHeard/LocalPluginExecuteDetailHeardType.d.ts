import {YakScript} from "@/pages/invoker/schema"
import {ReactNode} from "react"
import {YakParamProps} from "../../pluginsType"
import {KVPair} from "@/models/kv"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {FormInstance} from "antd"
import {ExpandAndRetractExcessiveState} from "../expandAndRetract/ExpandAndRetract"
import { JsonFormSchemaListWrapper } from "@/components/JsonFormWrapper/JsonFormWrapper"
export interface PluginExecuteDetailHeardProps {
    token: string
    /**插件 */
    plugin: YakScript
    /**头部右侧额外dom */
    extraNode: ReactNode
    debugPluginStreamEvent: {
        start: () => void
        stop: () => void
        cancel: () => void
        reset: () => void
    }
    progressList: StreamResult.Progress[]
    runtimeId: string
    setRuntimeId: (b: string) => void
    executeStatus: ExpandAndRetractExcessiveState
    setExecuteStatus: (b: ExpandAndRetractExcessiveState) => void
    /**插件UI联动相关参数*/
    linkPluginConfig?: HybridScanPluginConfig
    onDownPlugin: () => void
    /** 隐藏插件 ID */
    isHiddenUUID?: boolean
    infoExtra?: ReactNode
    /** 隐藏更新按钮 */
    hiddenUpdateBtn?: boolean
}

export interface YakExtraParamProps {
    /**组名 */
    group: string
    /**组内的参数 */
    data: YakParamProps[]
}

export interface ExecuteEnterNodeByPluginParamsProps extends JsonFormSchemaListWrapper{
    paramsList: YakParamProps[]
    pluginType?: string
    isExecuting: boolean
}

export interface OutputFormComponentsByTypeProps extends JsonFormSchemaListWrapper{
    item: YakParamProps
    extraSetting?: FormExtraSettingProps
    /**根据插件类型出编辑器类型/或者自己输入对应的编辑器类型 */
    codeType?: string
    disabled?: boolean
    /** 插件类型 */
    pluginType?: string
}

export interface FormExtraSettingProps {
    double: boolean
    data: {key: string; label: string; value: string}[]
}

export interface PluginExecuteProgressProps {
    percent: number
    name: string
}

export interface PluginExecuteExtraFormValue extends HTTPRequestBuilderParams {
    /**前端使用，请求类型的选择 */
    requestType: RequestType
    /**前端使用，请求类型》原始请求:数据包 */
    rawHTTPRequest: string
}
/**表单的key value类型 */
export interface CustomPluginExecuteFormValue {
    [key: string]: number | string | boolean | string[] | Uint8Array | KVPair[] | number[]
}

export interface FormContentItemByTypeProps extends JsonFormSchemaListWrapper{
    item: YakParamProps
    pluginType?: string
    disabled?: boolean
}

export interface PluginFixFormParamsProps {
    type?: "single" | "batch"
    form: FormInstance<any>
    disabled: boolean
    /**原始请求中的数据包数据 */
    rawHTTPRequest?: string
    inputType?: "content" | "path"
    setInputType?: (v: "content" | "path") => void
}

export type RequestType = "original" | "input" | "httpFlowId"