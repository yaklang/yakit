import {useEffect, useRef, useState} from "react"
import {yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {Uint8ArrayToString} from "@/utils/str"
import {ExecResult} from "@/pages/invoker/schema"
import {useEngineConsoleStore} from "@/store/baseConsole"
import {useMemoizedFn} from "ahooks"
import {setClipboardText} from "@/utils/clipboard"
import {useTheme} from "@/hook/useTheme"
import {getXtermTheme} from "@/hook/useXTermOptions/useXTermOptions"

const {ipcRenderer} = window.require("electron")

export let clickEngineConsoleFlag = false
export const changeClickEngineConsoleFlag = (flag: boolean) => {
    clickEngineConsoleFlag = flag
}
export let engineConsoleWindowHash = ""
interface useEngineConsoleHooks {}
export default function useEngineConsole(props: useEngineConsoleHooks) {
    const {theme: themeGlobal} = useTheme()
    const [engineConsoleToken, setEngineConsoleToken] = useState<string>("")
    const {consoleLog, setConsoleInfo} = useEngineConsoleStore()
    const consoleLogRef = useRef<string>(consoleLog)
    useEffect(() => {
        consoleLogRef.current = consoleLog
    }, [consoleLog])

    useEffect(() => {
        if (engineConsoleWindowHash) {
            ipcRenderer.send("forward-xterm-theme", {
                xtermThemeVars: getXtermTheme()
            })
        }
    }, [themeGlobal])

    useEffect(() => {
        ipcRenderer.on("engineConsole-window-hash", (event, {hash}) => {
            clickEngineConsoleFlag = false
            engineConsoleWindowHash = hash
            // hash存在则证明引擎新窗口已打开
            if (hash) {
                ipcRenderer.send("forward-xterm-theme", {
                    xtermThemeVars: getXtermTheme()
                })
                // 此处历史记录为使用 EngineConsole 组件产生的历史记录
                if (consoleLogRef.current.length) {
                    ipcRenderer.send("forward-xterm-data", consoleLogRef.current)
                }
                onEngineConsoleStart()
            } else {
                // 引擎新窗口关闭
                setConsoleInfo("")
                cancelEngineConsole()
            }
        })

        // 监听子窗口的复制操作
        ipcRenderer.on("console-terminal-window-copy-data", (event, copyData: string) => {
            setClipboardText(copyData)
        })

        return () => {
            // 菜单常驻父组件意外或主动销毁，子窗口也需要跟着销毁
            ipcRenderer.send("close-console-new-window")

            // 状态需要重置
            clickEngineConsoleFlag = false
            engineConsoleWindowHash = ""
            setConsoleInfo("")
            cancelEngineConsole()

            ipcRenderer.removeAllListeners("engineConsole-window-hash")
            ipcRenderer.removeAllListeners("console-terminal-window-copy-data")
        }
    }, [])

    const onEngineConsoleStart = () => {
        const newToken = randomString(40)
        setEngineConsoleToken(newToken)
        ipcRenderer.invoke("AttachCombinedOutput", {}, newToken).then(() => {
            yakitNotify("info", "启动输出监控成功")
        })
    }

    useEffect(() => {
        if (!engineConsoleToken) return

        ipcRenderer.on(`${engineConsoleToken}-data`, async (_, data: ExecResult) => {
            if (engineConsoleWindowHash) {
                ipcRenderer.send("forward-xterm-data", Uint8ArrayToString(data.Raw) + "\r\n")
            }
        })

        ipcRenderer.on(`${engineConsoleToken}-error`, (_, error) => {
            yakitNotify("error", `[AttachCombinedOutput] error:  ${error}`)
        })

        ipcRenderer.on(`${engineConsoleToken}-end`, () => {
            yakitNotify("info", "[AttachCombinedOutput] finished")
        })
    }, [engineConsoleToken])

    const cancelEngineConsole = useMemoizedFn(() => {
        ipcRenderer.invoke(`cancel-AttachCombinedOutput`, engineConsoleToken)
        ipcRenderer.removeAllListeners(`${engineConsoleToken}-data`)
        ipcRenderer.removeAllListeners(`${engineConsoleToken}-error`)
        ipcRenderer.removeAllListeners(`${engineConsoleToken}-end`)
    })
}
