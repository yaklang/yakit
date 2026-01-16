import {UserInfoProps} from "@/store"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {getLocalValue, getRemoteValue} from "./kv"
import {globalUserLogout, isEnpriTraceAgent, isEnpriTrace, getRemoteHttpSettingGV} from "@/utils/envfile"
import {NowProjectDescription} from "@/pages/globalVariable"
import emiter from "./eventBus/eventBus"
import {LocalGVS} from "@/enums/localGlobal"
import { JSONParseLog } from "./tool"
const {ipcRenderer} = window.require("electron")

export const loginOut = async (userInfo: UserInfoProps) => {
    if (!userInfo.isLogin) return
    // 此处会导致退出接口异常时间调用
    // await aboutLoginUpload(userInfo.token)
    NetWorkApi<null, API.ActionSucceeded>({
        method: "get",
        url: "logout/online",
        headers: {
            Authorization: userInfo.token
        }
    })
        .then((res) => {
            loginOutLocal(userInfo)
        })
        .catch((e) => {})
        .finally(globalUserLogout)
}

export const loginOutLocal = (userInfo: UserInfoProps) => {
    if (!userInfo.isLogin) return
    getRemoteValue(getRemoteHttpSettingGV()).then(async (setting) => {
        if (!setting) return
        const values = JSONParseLog(setting,{page: "login", fun: "loginOutLocal"})
        const OnlineBaseUrl: string = values.BaseUrl

        let isDelPrivate: boolean = false
        try {
            isDelPrivate = !!(await getLocalValue(LocalGVS.IsDeletePrivatePluginsOnLogout))
        } catch (error) {}

        if (isDelPrivate) {
            ipcRenderer
                .invoke("DeletePluginByUserID", {
                    UserID: userInfo.user_id,
                    OnlineBaseUrl
                })
                .finally(() => {
                    ipcRenderer.send("user-sign-out")
                    emiter.emit("onRefreshLocalPluginList")
                })
        } else {
            ipcRenderer.send("user-sign-out")
        }
    })
}

export const refreshToken = (userInfo: UserInfoProps) => {
    if (!userInfo.isLogin) return
    NetWorkApi<null, API.ActionSucceeded>({
        method: "get",
        url: "refresh/token/online"
    })
        .then((res) => {})
        .catch((e) => {})
}

// 企业/简易版 登录前时调用同步
export const aboutLoginUpload = (Token: string) => {
    if ((isEnpriTraceAgent() || isEnpriTrace()) && NowProjectDescription) {
        const {ProjectName, ExternalModule, ExternalProjectCode} = NowProjectDescription
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("upload-risk-to-online", {Token, ProjectName, ExternalModule, ExternalProjectCode})
                .then((res) => {})
                .finally(() => {
                    resolve(true)
                })
        })
    }
}

export interface HTTPFlowsToOnlineRequest {
    Token: string
    ProjectName: string
    ProjectDescription: string
    ExternalModule: string
    ExternalProjectCode: string
}

// 企业/简易版 登录前时调用同步
export const loginHTTPFlowsToOnline = (Token: string) => {
    if ((isEnpriTraceAgent() || isEnpriTrace()) && NowProjectDescription) {
        const {ProjectName, Description, ExternalModule, ExternalProjectCode} = NowProjectDescription
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("HTTPFlowsToOnline", {
                    Token,
                    ProjectName,
                    ProjectDescription: Description,
                    ExternalModule,
                    ExternalProjectCode
                } as HTTPFlowsToOnlineRequest)
                .then((res) => {})
                .finally(() => {})
        })
    }
}
