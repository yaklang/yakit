import {memo, useEffect} from "react"
import {StartupPage} from "./pages/StartupPage"
import "./theme/ThemeClass.scss"
import {getReleaseEditionName, isCommunityEdition, isIRify} from "./utils/envfile"
import {ipcEventPre} from "./utils/ipcEventPre"

import styles from "./App.module.scss"
const {ipcRenderer} = window.require("electron")

const App: React.FC = memo(() => {
    useEffect(() => {
        const titleElement = document.getElementById("app-html-title")
        if (titleElement) {
            titleElement.textContent = getReleaseEditionName()
        }

        // 解压命令执行引擎脚本压缩包
        ipcRenderer.invoke(ipcEventPre + "generate-start-engine")
        // 告诉主进程软件的版本(CE|EE)
        ipcRenderer.invoke(ipcEventPre + "is-enpritrace-to-domain", !isCommunityEdition())

        // 通知应用退出
        ipcRenderer.on("close-engineLinkWin-renderer", async (e, res: any) => {
            ipcRenderer.invoke("app-exit", {showCloseMessageBox: true, isIRify: isIRify(), isEngineLinkWin: true})
        })
        return () => {
            ipcRenderer.removeAllListeners("close-engineLinkWin-renderer")
        }
    }, [])

    return (
        <div className={styles["app"]}>
            <StartupPage />
        </div>
    )
})

export default App
