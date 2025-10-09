import {APIFunc, APINoRequestFunc} from "@/apiUtils/type"
import {ProjectParamsProp, ProjectsResponse} from "@/pages/softwareSettings/ProjectManage"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {useEeSystemConfig, useStore} from "@/store"
import {isEnpriTrace} from "@/utils/envfile"
import emiter from "@/utils/eventBus/eventBus"
import {aboutLoginUpload, loginHTTPFlowsToOnline} from "@/utils/login"
import {yakitNotify} from "@/utils/notification"
import {DownloadingState} from "@/yakitGVDefine"
import {useMemoizedFn} from "ahooks"
import omit from "lodash/omit"

const {ipcRenderer} = window.require("electron")

/** @name 处理进度条数据(防止异常数据) */
export const safeFormatDownloadProcessState = (state: DownloadingState) => {
    try {
        // 使用可选链操作符来安全地访问深层次属性，如果不存在，则默认为0
        const total = state.size?.total || 0
        const transferred = state.size?.transferred || 0
        const elapsed = state.time?.elapsed || 0
        const remaining = state.time?.remaining || 0

        return {
            percent: state.percent || 0,
            size: {total, transferred},
            speed: state.speed || 0,
            time: {elapsed, remaining}
        }
    } catch (e) {
        return {
            percent: 0,
            size: {total: 0, transferred: 0},
            speed: 0,
            time: {elapsed: 0, remaining: 0}
        }
    }
}

export const apiSystemConfig: APINoRequestFunc<API.SystemConfigResponse> = (hiddenError) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<null, API.SystemConfigResponse>({
            method: "get",
            url: "system/config"
        })
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "apiSystemConfig 失败:" + e)
                reject(e)
            })
    })
}

export interface ExportProjectRequest {
    /**@deprecated 该字段后端已废弃,改用Id后端自己查询 */
    ProjectName?: string
    Password?: string
    Id: number
    token: string
}
export const grpcExportProject: APIFunc<ExportProjectRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const token = params.token
        const value = omit(params, "version")
        ipcRenderer
            .invoke("ExportProject", value, token)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", `grpcExportProject 失败:${e}`)
                reject(e)
            })
    })
}

export const grpcCancelExportProject: APIFunc<string, null> = (token, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("cancel-ExportProject", token)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", `grpcCancelExportProject 失败:${e}`)
                reject(e)
            })
    })
}

export const grpcGetProjects: APIFunc<ProjectParamsProp, ProjectsResponse> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetProjects", params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", `grpcGetProjects 失败:${e}`)
                reject(e)
            })
    })
}
export interface SplitUploadRequest {
    /**接口地址 */
    url: string
    /**文件路径 */
    path: string
    token: string
    /**后端给的类型 */
    type: "Project"
}

export const apiSplitUpload: APIFunc<SplitUploadRequest, ProjectsResponse> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("split-upload", params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", `apiSplitUpload 失败:${e}`)
                reject(e)
            })
    })
}

interface StartUploadProps {
    // 是否自动上传项目
    isAutoUploadProject?: boolean
    // 是否在登录前同步与HTTPFlows同步
    isUploadSyncData?: boolean
}

export const useUploadInfoByEnpriTrace = () => {
    const {userInfo} = useStore()
    const {setEeSystemConfig} = useEeSystemConfig()
    const startUpload = useMemoizedFn((params:StartUploadProps) => {
        const {isAutoUploadProject, isUploadSyncData} = params || {}
        const {isLogin, token} = userInfo
        if (isEnpriTrace()) {
            // 登录根据配置参数判断是否自动上传项目
            // 退出登录不需要去中止正在上传的项目；线上接口会抛错；因为循环跑接口，所以抛错信息很能很多(已告知产品)
            if (isLogin) {
                apiSystemConfig()
                    .then((config) => {
                        const data = config.data || []
                        setEeSystemConfig([...data])
                        let autoUploadProjectParams = {
                            isOpen: false,
                            day: 10
                        }
                        data.forEach((item) => {
                            if (isUploadSyncData && item.configName === "syncData") {
                                if (item.isOpen) {
                                    syncData(token)
                                }
                            }
                            if (item.configName === "autoUploadProject") {
                                autoUploadProjectParams = {
                                    isOpen: item.isOpen,
                                    day: !Number.isNaN(+item.content) ? +item.content : 10
                                }
                            }
                        })

                        //自动上传项目
                        if (isAutoUploadProject && autoUploadProjectParams.isOpen) {
                            emiter.emit("autoUploadProject", JSON.stringify(autoUploadProjectParams))
                        }
                    })
                    .catch(() => {
                        setEeSystemConfig([])
                    })
            }
        } else {
            isUploadSyncData && syncData(token)
        }
    })

    // 登录前同步与HTTPFlows同步
    const syncData = useMemoizedFn((token: string) => {
        aboutLoginUpload(token)
        loginHTTPFlowsToOnline(token)
    })

    return [{startUpload}] as const
}
