import {YakScript} from "@/pages/invoker/schema"
import {ReactNode} from "react"
import {YakParamProps} from "../../pluginsType"
import {KVPair} from "@/models/kv"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"

export interface PluginExecuteDetailHeardProps {
    token: string
    /**插件 */
    plugin: YakScript
    /**头部右侧额外dom */
    extraNode: ReactNode
    /**是否执行中 */
    isExecuting: boolean
    setIsExecuting: (b: boolean) => vid
    debugPluginStreamEvent: {
        start: () => vid
        stop: () => vid
        cancel: () => vid
        reset: () => vid
    }
    progressList: StreamResult.Progress[]
}

export interface YakExtraParamProps {
    /**组名 */
    group: string
    /**组内的参数 */
    data: YakParamProps[]
}

export interface ExecuteEnterNodeByPluginParamsProps {
    paramsList: YakParamProps[]
}

export interface OutputFormComponentsByTypeProps {
    item: YakParamProps
    extraSetting?: FormExtraSettingProps
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
    [string]: number | string | boolean | string[] | Buffer
}
