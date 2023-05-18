import {forwardRef, useImperativeHandle, useRef, useState} from "react"
import {IProps} from "xterm-for-react/dist/src/XTerm"
import {XTerm} from "xterm-for-react"
import ReactResizeDetector from "react-resize-detector"
import {xtermFit} from "../utils/xtermUtils"

const {ipcRenderer} = window.require("electron")

export interface CVXtermProps extends IProps {
    isWrite?: boolean
    write?: (s: string) => any
    maxHeight?: number
}

export const TERMINAL_INPUT_KEY = {
    BACK: 8, // 退格删除键
    ENTER: 13, // 回车键
    UP: 38, // 方向盘上键
    DOWN: 40, // 方向盘键
    LEFT: 37, // 方向盘左键
    RIGHT: 39, // 方向盘右键
    CHAR_C: 67 // 字符C
}

/**
 * @deprecated 建议使用 YakitCVXterm 调试
 */
export const CVXterm = forwardRef((props: CVXtermProps, ref) => {
    const {isWrite = false, write: rewrite, maxHeight = 400, ...rest} = props

    const [loading, setLoading] = useState<boolean>(false)
    const xtermRef = useRef<any>(null)
    const timer = useRef<any>(null)

    useImperativeHandle(ref, () => ({
        ...xtermRef.current
    }))

    const write = (s: string) => {
        if (!xtermRef || !xtermRef.current) {
            return
        }
        const str = s.charCodeAt(0) === 13 ? String.fromCharCode(10) : s
        if (xtermRef.current?.terminal) xtermRef.current.terminal.write(str)
    }

    return (
        <div style={{width: "100%", height: "100%", maxHeight: maxHeight > 0 ? maxHeight : "none", overflow: "auto"}}>
            <ReactResizeDetector
                onResize={(width, height) => {
                    if (!width || !height) return
                    const row = Math.floor(height / 18.5)
                    const col = Math.floor(width / 10)
                    if (xtermRef) xtermFit(xtermRef, col, row)
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <XTerm
                ref={xtermRef}
                onKey={(e) => {
                    if (!loading) {
                        const {key} = e
                        const {keyCode} = e.domEvent
                        if (keyCode === TERMINAL_INPUT_KEY.BACK && xtermRef?.current) {
                            //Backspace
                            if (isWrite) {
                                xtermRef.current.terminal.write("\x1b[D \x1b[D")
                            } else {
                                xtermRef.current.terminal.write(" \x1b[D")
                            }
                        }
                        rewrite ? rewrite(key) : write(key)
                    }
                }}
                customKeyEventHandler={(e) => {
                    if (e.code === "KeyV" && (e.ctrlKey || e.metaKey)) {
                        setLoading(true)

                        if (timer.current) {
                            clearTimeout(timer.current)
                            timer.current = null
                        }
                        timer.current = setTimeout(() => {
                            navigator.clipboard.readText().then((res) => {
                                if (isWrite) rewrite ? rewrite(res) : write(res)
                                timer.current = null
                                setLoading(false)
                            })
                        }, 200)
                    }
                    if (e.code === "KeyC" && (e.ctrlKey || e.metaKey)) {
                        const str = xtermRef.current.terminal.getSelection()
                        if (!str) return true
                        setLoading(true)

                        if (timer.current) {
                            clearTimeout(timer.current)
                            timer.current = null
                        }
                        timer.current = setTimeout(() => {
                            ipcRenderer.invoke("copy-clipboard", str).finally(() => {
                                timer.current = null
                                setLoading(false)
                            })
                        }, 300)
                    }
                    return true
                }}
                {...rest}
                onResize={(r) => {
                    xtermFit(xtermRef, r.cols, r.rows)
                }}
            />
        </div>
    )
})
