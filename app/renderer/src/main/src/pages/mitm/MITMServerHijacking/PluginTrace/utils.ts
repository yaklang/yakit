import {APIFunc, APINoRequestFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
import {PluginTraceRequest} from "./type"
import i18n from "@/i18n/i18n"
const {ipcRenderer} = window.require("electron")
/**开始追踪*/
export const grpcStartPluginTrace: APIFunc<PluginTraceRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `start-mitm-plugin-trace`
        ipcRenderer
            .invoke(url, params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError)
                    yakitNotify(
                        "error",
                        (i18n.language === "zh" ? "grpcStartPluginTrace 失败：" : "grpcStartPluginTrace failed: ") + e
                    )
                reject(e)
            })
    })
}
/**停止追踪 */
export const grpcStopPluginTrace: APINoRequestFunc<null> = (hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `mitm-plugin-trace-stop`
        ipcRenderer
            .invoke(url)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError)
                    yakitNotify(
                        "error",
                        (i18n.language === "zh" ? "grpcStopPluginTrace 失败：" : "grpcStopPluginTrace failed: ") + e
                    )
                reject(e)
            })
    })
}
/**取消特定Trace */
export const grpcPluginTraceIDCancel: APIFunc<string, null> = (traceID, hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `mitm-plugin-traceID-cancel`
        ipcRenderer
            .invoke(url, traceID)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError)
                    yakitNotify(
                        "error",
                        (i18n.language === "zh"
                            ? "grpcPluginTraceIDCancel 失败："
                            : "grpcPluginTraceIDCancel failed: ") + e
                    )
                reject(e)
            })
    })
}
