import {UserInfoProps} from "@/store"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {setRemoteValue} from "./kv"

const {ipcRenderer} = window.require("electron")

export const loginOut = (userInfo: UserInfoProps) => {
    if (!userInfo.isLogin) return
    NetWorkApi<API.UserInfoByToken, API.ActionSucceeded>({
        method: "get",
        url: "logout/online",
        data: {
            token: userInfo.token
        }
    })
        .then((res) => {
            ipcRenderer.send("user-sign-out")
            ipcRenderer.invoke("DeletePluginByUserID", {
                UserID: userInfo.user_id
            })
            setRemoteValue("token-online", "")
        })
        .catch((e) => {})
}

export const loginOutLocal = (userInfo: UserInfoProps) => {
    if (!userInfo.isLogin) return
    ipcRenderer.send("user-sign-out")
    ipcRenderer.invoke("DeletePluginByUserID", {
        UserID: userInfo.user_id
    })
    setRemoteValue("token-online", "")
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
