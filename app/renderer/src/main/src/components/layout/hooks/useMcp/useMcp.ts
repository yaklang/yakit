import {SystemInfo} from "@/constants/hardware"
import {yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {useEffect, useState} from "react"
const {ipcRenderer} = window.require("electron")

export interface mcpStreamHooks {
    mcpStreamInfo: {
        mcpUrl: string
        mcpCurrent: StartMcpServerResponse | undefined
        mcpServerUrl: string
    }
    mcpStreamEvent: {
        onCancel: () => void
        onStart: () => void
        onSetMcpUrl: (url: string) => void
    }
}
interface StartMcpServerRequest {
    Host: string
    Port: number
    Tool?: string[]
    DisableTool?: string[]
    Resource?: string[]
    DisableResource?: string[]
    Script?: string[]
    EnableAll: boolean
}

export interface StartMcpServerResponse {
    Status: "starting" | "configured" | "running" | "heartbeat" | "stopped" | "error"
    Message: string
    ServerUrl: string
}

export const remoteMcpDefalutUrl = "0.0.0.0:11432"
export const localMcpDefalutUrl = "127.0.0.1:11432"

interface useMcpHooks {}
export default function useMcpStream(props: useMcpHooks) {
    const [mcpToken, setMcpToken] = useState<string>(randomString(40))
    const [mcpCurrent, setMcpCurrent] = useState<StartMcpServerResponse | undefined>(undefined)
    const [mcpServerUrl, setMcpServerUrl] = useState<string>("")
    const [mcpUrl, setMcpUrl] = useState<string>(
        SystemInfo.mode === "remote" ? remoteMcpDefalutUrl : localMcpDefalutUrl
    )

    useEffect(() => {
        ipcRenderer.on(`${mcpToken}-data`, async (_, data: StartMcpServerResponse) => {
            setMcpCurrent(data)
            // 后端只在running状态返回地址，此处单独存
            if (data.Status === "running" && data.ServerUrl) {
                setMcpServerUrl(data.ServerUrl)
                yakitNotify("success", `MCP 服务已启动: ${data.ServerUrl}`)
            } else if (data.Status === "error") {
                yakitNotify("error", `MCP 服务错误: ${data.Message}`)
            } else if (data.Status === "stopped") {
                yakitNotify("info", `MCP 服务已停止: ${data.Message}`)
            }
        })

        ipcRenderer.on(`${mcpToken}-error`, (_, error) => {
            setMcpServerUrl("")
            setMcpCurrent({Status: "error", Message: error + "", ServerUrl: ""})
            yakitNotify("error", `[StartMcpServer] error: ${error}`)
        })

        ipcRenderer.on(`${mcpToken}-end`, () => {
            setMcpServerUrl("")
            setMcpCurrent({Status: "stopped", Message: "服务已停止", ServerUrl: ""})
            yakitNotify("info", `[StartMcpServer] finished`)
        })
        return () => {
            if (mcpToken) {
                ipcRenderer.invoke(`cancel-StartMcpServer`, mcpToken)
                ipcRenderer.removeAllListeners(`${mcpToken}-data`)
                ipcRenderer.removeAllListeners(`${mcpToken}-error`)
                ipcRenderer.removeAllListeners(`${mcpToken}-end`)
                setMcpCurrent(undefined)
                setMcpServerUrl("")
            }
        }
    }, [mcpToken])

    const onStart = () => {
        if (mcpUrl.trim() === "") {
            yakitNotify("error", "启动地址不能为空")
            return
        }
        // 校验 host:port 格式
        const match = mcpUrl.match(/^([a-zA-Z0-9.\-]+):(\d{1,5})$/)
        if (!match) {
            yakitNotify("error", "启动地址格式错误，例如：127.0.0.1:11432")
            return
        }
        const host = match[1]
        const port = parseInt(match[2], 10)
        if (port < 1 || port > 65535) {
            yakitNotify("error", "端口号必须在1~65535之间")
            return
        }

        const params: StartMcpServerRequest = {
            Host: host,
            Port: port,
            EnableAll: true
        }

        const token = randomString(40)
        setMcpToken(token)
        ipcRenderer.invoke("StartMcpServer", params, token).catch((err) => {
            yakitNotify("error", "启用MCP失败: " + err)
        })
    }

    const onCancel = () => {
        ipcRenderer.invoke(`cancel-StartMcpServer`, mcpToken)
    }

    const onSetMcpUrl = (url: string) => {
        setMcpUrl(url)
    }

    return [
        {mcpCurrent, mcpServerUrl, mcpUrl},
        {onStart, onCancel, onSetMcpUrl}
    ] as const
}
