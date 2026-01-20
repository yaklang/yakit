import {memo, useEffect, useState} from "react"
import {StartupPage} from "./pages/StartupPage"
import "./theme/ThemeClass.scss"
import "./theme/yakit.scss"
import {GetMainColor, getReleaseEditionName, isCommunityEdition, isIRify, isMemfit} from "./utils/envfile"
import {ipcEventPre} from "./utils/ipcEventPre"
import {useTheme} from "./hooks/useTheme"
import {generateAllThemeColors} from "./yakit-colors-generator"
import styles from "./App.module.scss"

const {ipcRenderer} = window.require("electron")

function applyThemeColors(theme: "light" | "dark", colors: Record<string, string>) {
    const html = document.documentElement

    html.setAttribute("data-theme", theme)

    Object.entries(colors).forEach(([key, value]) => {
        html.style.setProperty(`${key}`, value)
    })
}

const App: React.FC = memo(() => {
    const {theme} = useTheme()
    const [ready, setReady] = useState(false)

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
            ipcRenderer.invoke("app-exit", {showCloseMessageBox: true, isIRify: isIRify(), isMemfit: isMemfit()})
        })
        return () => {
            ipcRenderer.removeAllListeners("close-engineLinkWin-renderer")
        }
    }, [])

    // 主题色处理
    useEffect(() => {
        const targetEditionColor = GetMainColor(theme)
        const colors = generateAllThemeColors(theme, targetEditionColor)
        applyThemeColors(theme, colors)
        setReady(true)
    }, [theme])

    return <div className={styles["app"]}>{ready && <StartupPage />}</div>
})

export default App
