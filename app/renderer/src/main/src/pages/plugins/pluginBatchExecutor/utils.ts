import {HybridScanTask} from "@/models/HybridScan"
import {yakitNotify} from "@/utils/notification"
import {Paging} from "@/utils/yakQueryHTTPFlow"
const {ipcRenderer} = window.require("electron")

interface HybridScanTaskFilter {
    TaskId?: string[]
    Status?: string
    Target?: string
    FromId?: number
    UntilId?: number
}
export interface QueryHybridScanTaskRequest {
    Pagination: Paging
    Filter: HybridScanTaskFilter
}

export interface QueryHybridScanTaskResponse {
    Pagination: Paging
    Data: HybridScanTask[]
    Total: number
}

/**插件批量执行任务列表 */
export const apiQueryHybridScanTask: (query: QueryHybridScanTaskRequest) => Promise<QueryHybridScanTaskResponse> = (
    query
) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("QueryHybridScanTask", query)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", "获取任务列表失败:" + e)
                reject(e)
            })
    })
}

export interface DeleteHybridScanTaskRequest {
    /**@deprecated */
    TaskId?: string
    /**@deprecated */
    DeleteAll?: boolean
    Filter: HybridScanTaskFilter
}
/**插件批量执行任务 删除接口 */
export const apiDeleteHybridScanTask: (query: DeleteHybridScanTaskRequest) => Promise<null> = (query) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("DeleteHybridScanTask", query)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", "删除任务列表失败:" + e)
                reject(e)
            })
    })
}
