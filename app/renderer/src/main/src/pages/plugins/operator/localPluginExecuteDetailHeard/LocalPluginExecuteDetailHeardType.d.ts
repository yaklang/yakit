import {YakScript} from "@/pages/invoker/schema"
import {ReactNode} from "react"
import {YakParamProps} from "../../pluginsType"

export interface PluginExecuteDetailHeardProps {
    /**插件 */
    plugin: YakScript
    /**头部右侧额外dom */
    extraNode: ReactNode
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
