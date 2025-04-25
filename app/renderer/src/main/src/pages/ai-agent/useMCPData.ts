import {useEffect, useRef} from "react"
import {MCPData, MCPDataProgress} from "./type/mcpClient"
import {yakitNotify} from "@/utils/notification"
import {grpcMCPClientCancelCallTool} from "./grpc"
import {useMemoizedFn} from "ahooks"

const {ipcRenderer} = window.require("electron")

function useMCPData() {
    const pools = useRef<string[]>([])

    const onStart = useMemoizedFn(
        (
            taskID: string,
            onData: (data: MCPDataProgress) => void,
            onEnd: (data: MCPData) => void,
            onError: (error: any) => void
        ) => {
            if (pools.current.includes(taskID)) {
                yakitNotify("error", "对话正在执行中")
                return
            }
            pools.current.push(taskID)
            ipcRenderer.on(`mcp-${taskID}-progress`, (e, res: MCPDataProgress) => {
                onData(res)
            })
            ipcRenderer.on(`mcp-${taskID}-end`, (e, res: MCPData) => {
                yakitNotify("success", "对话执行完")
                onEnd(res)
                onRemove(taskID)
            })
            ipcRenderer.on(`mcp-${taskID}-error`, (e, err: any) => {
                yakitNotify("error", `对话执行失败: ${err}`)
                onError(err)
                onRemove(taskID)
            })
        }
    )

    const onClose = useMemoizedFn((token: string) => {
        grpcMCPClientCancelCallTool(token).catch(() => {})
    })

    const onRemove = useMemoizedFn((token: string) => {
        ipcRenderer.removeAllListeners(`mcp-${token}-progress`)
        ipcRenderer.removeAllListeners(`mcp-${token}-end`)
        ipcRenderer.removeAllListeners(`mcp-${token}-error`)
        pools.current = pools.current.filter((item) => item !== token)
    })

    useEffect(() => {
        return () => {
            for (let token of pools.current) {
                onClose(token)
                onRemove(token)
            }
        }
    }, [])

    return {onStart, onClose}
}

export default useMCPData
