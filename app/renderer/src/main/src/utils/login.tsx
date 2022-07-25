import {UserInfoProps} from "@/store"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"

const {ipcRenderer} = window.require("electron")

export const loginOut = (userInfo: UserInfoProps) => {
    if (!userInfo.isLogin) return
    NetWorkApi<null, API.ActionSucceeded>({
        method: "get",
        url: "logout/online"
    })
        .then((res) => {
            ipcRenderer.send("user-sign-out")
            ipcRenderer.invoke("DeletePluginByUserID", {
                UserID: userInfo.user_id
            })
            console.log("退出", res)
        })
        .catch((e) => {
            console.log("退出", e)
        })
}

export const refreshToken = (userInfo: UserInfoProps) => {
    if (!userInfo.isLogin) return
    NetWorkApi<null, API.ActionSucceeded>({
        method: "get",
        url: "refresh/token/online"
    })
        .then((res) => {
            console.log("刷新", res)
        })
        .catch((e) => {
            console.log("刷新", e)
        })
}
