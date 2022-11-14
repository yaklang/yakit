import {UserInfoProps} from "@/store"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {setRemoteValue} from "./kv"
import {ENTERPRISE_STATUS, getJuageEnvFile} from "@/utils/envfile"
const IsEnterprise:boolean = ENTERPRISE_STATUS.IS_ENTERPRISE_STATUS === getJuageEnvFile()
const {ipcRenderer} = window.require("electron")

export const loginOut = (userInfo: UserInfoProps) => {
    if (!userInfo.isLogin) return
    NetWorkApi<null, API.ActionSucceeded>({
        method: "get",
        url: "logout/online"
    })
        .then((res) => {
            loginOutLocal(userInfo)
        })
        .catch((e) => {})
        .finally(() => {
            IsEnterprise?setRemoteValue("token-online-enterprise", ""):setRemoteValue("token-online", "")
        })
}

export const loginOutLocal = (userInfo: UserInfoProps) => {
    if (!userInfo.isLogin) return
    ipcRenderer
        .invoke("DeletePluginByUserID", {
            UserID: userInfo.user_id
        })
        .finally(() => {
            ipcRenderer.send("user-sign-out")
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
