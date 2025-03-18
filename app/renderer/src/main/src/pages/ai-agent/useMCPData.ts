import {useEffect, useRef} from "react"
import {MCPData, MCPDataProgress} from "./mcpClient/type"
import {yakitNotify} from "@/utils/notification"
import {grpcMCPClientCancelCallTool} from "./grpc"
import {useMemoizedFn} from "ahooks"

const {ipcRenderer} = window.require("electron")

function useMCPData() {
    const pools = useRef<string[]>([])

    const onStart = useMemoizedFn(
        (
            token: string,
            onData: (data: MCPDataProgress) => void,
            onEnd: (data: MCPData) => void,
            onError: (error: any) => void
        ) => {
            if (pools.current.includes(token)) {
                yakitNotify("error", "MCP服务器正在执行中")
                return
            }
            pools.current.push(token)
            ipcRenderer.on(`mcp-${token}-progress`, (e, res: MCPDataProgress) => {
                onData(res)
            })
            ipcRenderer.on(`mcp-${token}-end`, (e, res: MCPData) => {
                yakitNotify("success", "MCP执行完")
                onEnd(res)
                onRemove(token)
            })
            ipcRenderer.on(`mcp-${token}-error`, (e, err: any) => {
                yakitNotify("error", `MCP执行失败: ${err}`)
                onError(err)
                onRemove(token)
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
