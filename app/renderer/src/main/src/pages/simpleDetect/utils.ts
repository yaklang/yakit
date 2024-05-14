import {yakitNotify} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

export interface ExecBatchYakScriptUnfinishedTask {
    Percent: number
    CreatedAt: number
    Uid: string
    YakScriptOnlineGroup: string
    TaskName: string
}
export interface GetExecBatchYakScriptUnfinishedTaskResponse {
    Tasks: ExecBatchYakScriptUnfinishedTask[]
}
/** GetExecBatchYakScriptUnfinishedTask 简易版安全检测 获取未完成任务  */
export const apiGetExecBatchYakScriptUnfinishedTask: () => Promise<GetExecBatchYakScriptUnfinishedTaskResponse> =
    () => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("GetExecBatchYakScriptUnfinishedTask")
                .then(resolve)
                .catch((e) => {
                    yakitNotify("error", `获取未完成任务失败：${e}`)
                })
        })
    }

export interface GetExecBatchYakScriptUnfinishedTaskByUidRequest {
    Uid: string
}
/** PopExecBatchYakScriptUnfinishedTaskByUid 简易版安全检测 删除任务  */
export const apiPopExecBatchYakScriptUnfinishedTaskByUid: (
    params: GetExecBatchYakScriptUnfinishedTaskByUidRequest
) => Promise<null> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("PopExecBatchYakScriptUnfinishedTaskByUid",params)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `删除未完成任务失败：${e}`)
            })
    })
}
