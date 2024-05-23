import {yakitNotify} from "@/utils/notification"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import {RecordPortScanRequest} from "../securityTool/newPortScan/utils"

const {ipcRenderer} = window.require("electron")

export interface UnfinishedTask {
    Percent: number
    CreatedAt: number
    RuntimeId: string
    YakScriptOnlineGroup: string
    TaskName: string
    LastRecordPtr: number
    Target: string
}
export interface QueryUnfinishedTaskResponse {
    Tasks: UnfinishedTask[]
}

export interface UnfinishedTaskFilter {
    RuntimeId?: string
    ProgressSource?: string[]
    TaskName?: string
    Target?: string
}
export interface QueryUnfinishedTaskRequest {
    Pagination: Paging
    Filter: UnfinishedTaskFilter
}

/** QuerySimpleDetectUnfinishedTask 简易版安全检测 获取未完成任务  */
export const apiQuerySimpleDetectUnfinishedTask: (
    params: QueryUnfinishedTaskRequest
) => Promise<QueryUnfinishedTaskResponse> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("QuerySimpleDetectUnfinishedTask", params)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `获取未完成任务失败：${e}`)
                reject(e)
            })
    })
}

export interface DeleteUnfinishedTaskRequest {
    Filter: UnfinishedTaskFilter
}
/** DeleteSimpleDetectUnfinishedTask 简易版安全检测 删除任务  */
export const apiDeleteSimpleDetectUnfinishedTask: (params: DeleteUnfinishedTaskRequest) => Promise<null> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("DeleteSimpleDetectUnfinishedTask", params)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `删除未完成任务失败：${e}`)
                reject(e)
            })
    })
}

export interface GetUnfinishedTaskDetailByIdRequest {
    RuntimeId: string
}

/** GetSimpleDetectRecordRequestById 简易版安全检测 获取任务详情  */
export const apiGetSimpleDetectRecordRequestById: (
    params: GetUnfinishedTaskDetailByIdRequest
) => Promise<RecordPortScanRequest> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetSimpleDetectRecordRequestById", params)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `获取任务详情失败：${e}`)
                reject(e)
            })
    })
}

/** SaveCancelSimpleDetect 简易版安全检测 保存任务  */
export const apiSaveCancelSimpleDetect: (params: RecordPortScanRequest) => Promise<null> = (params) => {
    return new Promise((resolve, reject) => {
        console.log("SaveCancelSimpleDetect", params)
        ipcRenderer
            .invoke("SaveCancelSimpleDetect", params)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `保存任务失败：${e}`)
                reject(e)
            })
    })
}
