import {YakScript} from "@/pages/invoker/schema"
import {ReactNode} from "react"
import {YakParamProps} from "../../pluginsType"
import {KVPair} from "@/models/kv"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {FormInstance} from "antd"

export interface PluginExecuteDetailHeardProps {
    token: string
    /**插件 */
    plugin: YakScript
    /**头部右侧额外dom */
    extraNode: ReactNode
    /**是否执行中 */
    isExecuting: boolean
    setIsExecuting: (b: boolean) => void
    debugPluginStreamEvent: {
        start: () => void
        stop: () => void
        cancel: () => void
        reset: () => void
    }
    progressList: StreamResult.Progress[]
    runtimeId: string
    setRuntimeId: (b: string) => void
}

export interface YakExtraParamProps {
    /**组名 */
    group: string
    /**组内的参数 */
    data: YakParamProps[]
}

export interface ExecuteEnterNodeByPluginParamsProps {
    paramsList: YakParamProps[]
    pluginType?: string
    isExecuting: boolean
}

export interface OutputFormComponentsByTypeProps {
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
    data: {label: string; value: string}[]
}

export interface PluginExecuteProgressProps {
    percent: number
    name: string
}

export interface PluginExecuteExtraFormValue extends HTTPRequestBuilderParams {}
/**表单的key value类型 */
export interface CustomPluginExecuteFormValue {
    [key: string]: number | string | boolean | string[] | Uint8Array | KVPair[]
}

export interface FormContentItemByTypeProps {
    item: YakParamProps
    pluginType?: string
    disabled?: boolean
}

export interface PluginFixFormParamsProps {
    form: FormInstance<any>
    disabled: boolean
}
