import {yakitNotify} from "@/utils/notification"
import {GroupCount} from "./yakPoCType"
const {ipcRenderer} = window.require("electron")

interface QueryYakScriptGroupRequest {
    All: boolean
}
export interface QueryYakScriptGroupResponse {
    Group: GroupCount[]
}

/**
 * @description 获取插件组，全部未分页
 */
export const apiQueryYakScriptGroup: (query: QueryYakScriptGroupRequest) => Promise<QueryYakScriptGroupResponse> = (
    query
) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("QueryYakScriptGroup", query)
            .then(resolve)
            .catch((e: any) => {
                yakitNotify("error", "获取插件组出错：" + e)
                reject(e)
            })
    })
}
