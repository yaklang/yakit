import { pluginTypeToName } from "@/pages/plugins/builtInData"
import {defPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/constants"
import {PluginBatchExecuteExtraFormValue} from "@/pages/plugins/pluginBatchExecutor/pluginBatchExecutor"
import {PluginBatchExecutorTaskProps} from "@/pages/plugins/utils"
import {PluginBatchExecutorPageInfoProps} from "@/store/pageInfo"
import cloneDeep from "lodash/cloneDeep"

export const defaultPluginBatchExecutorPageInfo: PluginBatchExecutorPageInfoProps = {
    runtimeId: "",
    defaultActiveKey: "",
    https: false,
    httpFlowIds: [],
    request: new Uint8Array(),
    hybridScanMode: "new"
}

export const defPluginExecuteTaskValue: PluginBatchExecutorTaskProps = {
    Proxy: "",
    Concurrent: 30,
    TotalTimeoutSecond: 7200
}
export const defPluginBatchExecuteExtraFormValue: PluginBatchExecuteExtraFormValue = {
    ...cloneDeep(defPluginExecuteFormValue),
    ...cloneDeep(defPluginExecuteTaskValue)
}
/**yakPoc/批量执行的默认查询的插件类型 */
export const batchPluginType = "mitm,port-scan,nuclei"

/**端口扫描/批量执行的默认查询的插件类型 */
export const pluginTypeFilterList = ["mitm", "port-scan", "nuclei"].map((ele) => ({
    label: pluginTypeToName[ele]?.name || "-",
    value: ele,
    count: 0
}))
