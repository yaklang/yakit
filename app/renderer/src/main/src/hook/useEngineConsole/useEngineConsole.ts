import {useEffect, useState} from "react"
import {yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {Uint8ArrayToString} from "@/utils/str"
import {ExecResult} from "@/pages/invoker/schema"

const {ipcRenderer} = window.require("electron")

export let clickEngineConsoleFlag = false
export const changeClickEngineConsoleFlag = (flag: boolean) => {
    clickEngineConsoleFlag = flag
}
export let engineConsoleWindowHash = ""
interface useEngineConsoleHooks {}
export default function useEngineConsole(props: useEngineConsoleHooks) {
    const [engineConsoleToken, setEngineConsoleToken] = useState<string>("")

    useEffect(() => {
        ipcRenderer.on("engineConsole-window-hash", (event, {hash}) => {
            clickEngineConsoleFlag = false
            engineConsoleWindowHash = hash
            if (hash) {
                onEngineConsoleStart()
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("engineConsole-window-hash")
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

        return () => {
            if (engineConsoleToken) {
                ipcRenderer.invoke(`cancel-AttachCombinedOutput`, engineConsoleToken)
                ipcRenderer.removeAllListeners(`${engineConsoleToken}-data`)
                ipcRenderer.removeAllListeners(`${engineConsoleToken}-error`)
                ipcRenderer.removeAllListeners(`${engineConsoleToken}-end`)
            }
        }
    }, [engineConsoleToken])
}
