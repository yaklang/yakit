import {GroupCount, QueryYakScriptGroupResponse} from "@/pages/invoker/schema"
import {yakitNotify} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

export interface QueryYakScriptGroupRequest {
    All?: boolean
    PageId: string
    /** 默认是false， 目前中有专项漏洞这里的关键词组传 true 才会返回数据，插件管理里面不传就不会返回 poc 这边的内置组 */
    IsPocBuiltIn?: boolean
}
/**poc按关键词搜索的组数据 */
export const apiFetchQueryYakScriptGroupLocalByPoc: (params: QueryYakScriptGroupRequest) => Promise<GroupCount[]> = (
    params
) => {
    return new Promise((resolve, reject) => {
        const queryParams = {
            All: false,
            IsPocBuiltIn: true,
            ...params
        }
        ipcRenderer
            .invoke("QueryYakScriptGroup", queryParams)
            .then((res: QueryYakScriptGroupResponse) => {
                console.log("queryParams", queryParams, res)
                resolve(res.Group)
            })
            .catch((e) => {
                reject(e)
                yakitNotify("error", "获取关键词组失败：" + e)
            })
    })
}
