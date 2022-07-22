import {UserInfoProps} from "@/store"

const {ipcRenderer} = window.require("electron")

export const loginOut = (userInfo: UserInfoProps) => {
    ipcRenderer.send("user-sign-out")
    ipcRenderer.invoke("DeletePluginByUserID", {
        UserID: userInfo.user_id
    })
}
