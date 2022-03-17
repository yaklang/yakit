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
        <div style={{width: "100%", height: "100%", maxHeight: maxHeight, overflow: "auto"}}>
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
                onKey={({key, domEvent}) => {
                    if (!loading) {
                        const code = key.charCodeAt(0)
                        if (code === 127 && xtermRef?.current) {
                            //Backspace
                            if (isWrite) xtermRef.current.terminal.write("\x1b[D \x1b[D")
                        }

                        if (isWrite) rewrite ? rewrite(key) : write(key)
                    }
                }}
                customKeyEventHandler={(e) => {
                    if (e.keyCode === 86 && (e.ctrlKey || e.metaKey)) {
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
                    if (e.keyCode === 67 && (e.ctrlKey || e.metaKey)) {
                        const str = xtermRef.current.terminal.getSelection()
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
