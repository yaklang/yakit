const {ipcRenderer} = require("electron")

/** 判断渲染端是否崩溃白屏 */
const handleIsCrashed = () => {
    const bodyLength = document.body?.children?.length || 0
    const rootLength = document.getElementById("root")?.children?.length || 0
    if (!bodyLength || !rootLength) {
        ipcRenderer.invoke("EngineLink:render-crash-flag")
    }
}

process.on("loaded", function () {
    window.require = function (i) {
        if (i !== "electron") {
            return
        }

        return {ipcRenderer}
    }
    const unhandledrejectionError = (err) => {
        try {
            const {reason} = err || {}
            const content = reason?.stack || ""
            handleIsCrashed()
            if (content) ipcRenderer.invoke("EngineLink:render-error-log", `${content}\n`)
        } catch (error) {}
    }
    const errorLog = (err) => {
        try {
            const {message, error} = err || {}
            const content = error?.stack || ""
            handleIsCrashed()
            if (content) ipcRenderer.invoke("EngineLink:render-error-log", `${message || ""}\n${content}\n`)
        } catch (error) {}
    }
    window.addEventListener("unhandledrejection", unhandledrejectionError)
    window.addEventListener("error", errorLog)
})
