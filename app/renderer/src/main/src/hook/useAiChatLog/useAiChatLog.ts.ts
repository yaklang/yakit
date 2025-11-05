import {getXtermTheme} from "@/hook/useXTermOptions/useXTermOptions"
import {useTheme} from "@/hook/useTheme"
import {useEffect, useState} from "react"

const {ipcRenderer} = window.require("electron")

const useAiChatLog = () => {
    const [logWinHash, setLogWinHash] = useState("")
    const {theme} = useTheme()

    useEffect(() => {
        ipcRenderer.send("forward-xterm-theme", {
            xtermThemeVars: getXtermTheme()
        })
    }, [theme])

    useEffect(() => {
        ipcRenderer.on("ai-chat-log-window-hash", (_, {hash}) => {
            setLogWinHash(hash)
            if (hash) {
                ipcRenderer.send("forward-xterm-theme", {
                    xtermThemeVars: getXtermTheme()
                })
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("ai-chat-log-window-hash")
        }
    }, [])

    const onOpenLogWindow = async () => {
        if (logWinHash === "") {
            await ipcRenderer.invoke("open-ai-chat-log-window")
        } else {
            await ipcRenderer.send("close-ai-chat-window")
        }
    }

    return {
        onOpenLogWindow
    }
}
export default useAiChatLog
