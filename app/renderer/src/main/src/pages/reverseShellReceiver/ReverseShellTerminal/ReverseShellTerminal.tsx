import React, {memo, useEffect, useRef} from "react"
import {useMemoizedFn} from "ahooks"
import YakitXterm, {TERMINAL_KEYBOARD_Map, YakitXtermRefProps} from "@/components/yakitUI/YakitXterm/YakitXterm"
import {writeXTerm} from "@/utils/xtermUtils"
import {yakitNotify} from "@/utils/notification"
import {System, SystemInfo, handleFetchSystem} from "@/constants/hardware"
import {Uint8ArrayToString} from "@/utils/str"

const {ipcRenderer} = window.require("electron")
export interface ReverseShellTerminalProps {
    /**false：前端不做任何处理，数据都是后端返回*/
    isWrite: boolean
    addr: string
    setLocal: (local: string) => void
    setRemote: (remote: string) => void
    onCancelMonitor: () => void
    onResizeXterm: (v: XTermSizeProps) => void
}
export interface XTermSizeProps {
    cols: number
    rows: number
}
export const ReverseShellTerminal: React.FC<ReverseShellTerminalProps> = memo((props) => {
    const {addr, isWrite, setLocal, setRemote, onCancelMonitor, onResizeXterm} = props

    const xtermRef = useRef<YakitXtermRefProps>()
    const systemRef = useRef<System | undefined>(SystemInfo.system)

    useEffect(() => {
        if (!systemRef.current) {
            handleFetchSystem(() => (systemRef.current = SystemInfo.system))
        }
        const key = `client-listening-port-data-${addr}`
        ipcRenderer.on(key, (e, data) => {
            console.log("data", data, Uint8ArrayToString(data?.raw || new Uint8Array()))
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
            console.log("error", data)
            yakitNotify("error", `监听报错:${data}`)
            onCancelMonitor()
        })
        const endKey = `client-listening-port-end-${addr}`
        ipcRenderer.on(endKey, (e: any, data: any) => {
            console.log("end", data)
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
        console.log("addr,str", addr, str)
        if (isWrite) {
            console.log('isWrite',isWrite)
            writeXTerm(xtermRef, str)
        }
        ipcRenderer.invoke("listening-port-input", addr, str)
    })
    const customKeyEventHandler = useMemoizedFn((e) => {
        if (!xtermRef.current) return true
        const isCtrl = systemRef.current === "Darwin" ? e.metaKey : e.ctrlKey
        if (e.type === "keydown") {
            if (isCtrl) {
                if (e.code === TERMINAL_KEYBOARD_Map.KeyC.code) {
                    const select = xtermRef.current?.terminal?.getSelection()
                    return !select
                }

                if (e.code === TERMINAL_KEYBOARD_Map.KeyV.code) {
                    return false
                }
            }
            if (isWrite && e.key === TERMINAL_KEYBOARD_Map.Backspace.key) {
                commandExec("\x1b[D \x1b[D")
                e.preventDefault()
                return false
            }
            if (isWrite && e.key === TERMINAL_KEYBOARD_Map.Enter.key) {
                commandExec(String.fromCharCode(10)) //enter 改为换行符
                e.preventDefault()
                return false
            }
        }

        return true
    })
    const onResize = useMemoizedFn((val) => {
        if (onResizeXterm) onResizeXterm(val)
    })
    return (
        <YakitXterm
            ref={xtermRef}
            onData={(data) => {
                commandExec(data)
            }}
            customKeyEventHandler={customKeyEventHandler}
            onResize={onResize}
        />
    )
})
