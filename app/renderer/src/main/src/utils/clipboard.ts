import {yakitNotify} from "./notification"

const {ipcRenderer} = window.require("electron")

interface SetClipboardTextExtraParams {
    /** 是否隐藏复制成功提示 */
    hiddenHint?: boolean
    /** 复制成功提示信息(默认: 复制成功) */
    hintText?: string
    /** 复制成功后的回调 */
    successCallback?: () => void
    /** 复制失败后的回调 */
    failedCallback?: () => void
    /** 执行完后的回调 */
    finalCallback?: () => void
}
/**
 * @name 设置剪切板文本信息
 * @param text 复制到剪切板的文本信息
 * @param extra 复制功能的额外配置
 */
export const setClipboardText = (text?: string, extra?: SetClipboardTextExtraParams) => {
    const {hiddenHint, hintText, successCallback, failedCallback, finalCallback} = extra || {}
    if (text) {
        ipcRenderer
            .invoke("set-clipboard-text", text)
            .then(() => {
                if (!hiddenHint) yakitNotify("success", hintText || "复制成功")
                successCallback && successCallback()
            })
            .catch(() => {
                failedCallback && failedCallback()
            })
            .finally(() => {
                finalCallback && finalCallback()
            })
    } else {
        finalCallback && finalCallback()
    }
}

/** 获取剪切板文本信息 */
export const getClipboardText = async () => {
    try {
        return ((await ipcRenderer.invoke("get-clipboard-text")) || "") as string
    } catch (error) {
        return ""
    }
}
