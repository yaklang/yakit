import {RequestYakURLResponse, YakURLResource} from "@/pages/yakURLTree/data";
import {yakitFailed} from "@/utils/notification";

const {ipcRenderer} = window.require("electron");

// export const showFile = (data : YakURLResource) => {
//     const  url = data.Url
//     url.Query = url.Query || []
//     return ipcRenderer.invoke("RequestYakURL", {
//         Url: url,
//         Method: "GET",
//     }).then((rsp: RequestYakURLResponse) => {
//         if (onResponse) {
//             onResponse(rsp)
//         }
//         return rsp
//     }).catch(e => {
//         yakitFailed(`加载失败: ${e}`)
//         if (onError) {
//             onError(e)
//         }
//         throw e
//     })
// }