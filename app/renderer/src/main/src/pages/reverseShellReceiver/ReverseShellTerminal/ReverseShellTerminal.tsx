import React, {useEffect, useRef} from "react"
import {useMemoizedFn} from "ahooks"
import YakitXterm, {YakitXtermRefProps} from "@/components/yakitUI/YakitXterm/YakitXterm"
import {callCopyToClipboard, getCallCopyToClipboard} from "@/utils/basic"
import {writeXTerm} from "@/utils/xtermUtils"
import {TERMINAL_INPUT_KEY} from "@/components/yakitUI/YakitCVXterm/YakitCVXterm"
import {Uint8ArrayToString} from "@/utils/str"

const {ipcRenderer} = window.require("electron")
export interface ReverseShellTerminalProps {
    echoBack: boolean
    addr: string
    setLocal: (local: string) => void
    setRemote: (remote: string) => void
    onCancelMonitor: () => void
}
export const ReverseShellTerminal: React.FC<ReverseShellTerminalProps> = (props) => {
    const {addr, echoBack, setLocal, setRemote, onCancelMonitor} = props

    const xtermRef = useRef<YakitXtermRefProps>()

    useEffect(() => {
        const key = `client-listening-port-data-${addr}`
        ipcRenderer.on(key, (e, data) => {
            console.log("listening-port-data", data)
            if (data.closed) {
                onCancelMonitor()
                return
            }
            if (data.control) {
                return
            }

            if (data.localAddr) {
                setLocal(data.localAddr)
            }
            if (data.remoteAddr) {
                setRemote(data.remoteAddr)
            }
            if (data?.raw && xtermRef?.current && xtermRef.current?.terminal) {
                writeXTerm(xtermRef, data.raw)
            }
        })
        const errorKey = `client-listening-port-error-${addr}`
        ipcRenderer.on(errorKey, (e: any, data: any) => {
            console.log("listening-port-error", data)
            onCancelMonitor()
        })
        const endKey = `client-listening-port-end-${addr}`
        ipcRenderer.on(endKey, (e: any, data: any) => {
            console.log("listening-port-end", data)
            onCancelMonitor()
        })
        return () => {
            ipcRenderer.removeAllListeners(key)
            ipcRenderer.removeAllListeners(errorKey)
            ipcRenderer.removeAllListeners(endKey)
        }
    }, [addr])

    // 写入
    const commandExec = useMemoizedFn((str) => {
        if (echoBack) {
            writeXTerm(xtermRef, str)
        }
        ipcRenderer.invoke("listening-port-input", addr, str)
    })
    return (
        <YakitXterm
            ref={xtermRef}
            onData={(data) => {
                commandExec(data)
            }}
        />
    )
}
