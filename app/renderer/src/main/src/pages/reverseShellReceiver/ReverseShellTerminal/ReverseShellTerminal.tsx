import React, {useEffect, useRef} from "react"
import {useMemoizedFn} from "ahooks"
import YakitXterm, {YakitXtermRefProps} from "@/components/yakitUI/YakitXterm/YakitXterm"
import {callCopyToClipboard, getCallCopyToClipboard} from "@/utils/basic"
import {writeXTerm} from "@/utils/xtermUtils"
import {TERMINAL_INPUT_KEY} from "@/components/yakitUI/YakitCVXterm/YakitCVXterm"
import { Uint8ArrayToString } from "@/utils/str"

const {ipcRenderer} = window.require("electron")
export interface ReverseShellTerminalProps {
    echoBack: boolean
    addr: string
    setLocal: (local: string) => void
    setRemote: (remote: string) => void
}
export const ReverseShellTerminal: React.FC<ReverseShellTerminalProps> = (props) => {
    const {addr, echoBack, setLocal, setRemote} = props

    const xtermRef = useRef<YakitXtermRefProps>()

    useEffect(() => {
        const key = `client-listening-port-data-${addr}`
        ipcRenderer.on(key, (e, data) => {
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

        return () => {
            ipcRenderer.removeAllListeners(key)
        }
    }, [])

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
            isWrite={false}
            onData={(data) => {
                commandExec(data)
            }}
        />
    )
}
