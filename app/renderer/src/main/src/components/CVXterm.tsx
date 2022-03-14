import {forwardRef, useImperativeHandle, useRef, useState} from "react"
import {IProps} from "xterm-for-react/dist/src/XTerm"
import {XTerm} from "xterm-for-react"

const {ipcRenderer} = window.require("electron")

export interface CVXtermProps extends IProps {
    write?: (s: string) => any
}

export const CVXterm = forwardRef((props: CVXtermProps, ref) => {
    const {write: rewrite, ...rest} = props

    const [loading, setLoading] = useState<boolean>(false)
    const xtermRef = useRef<any>(null)
    const timer = useRef<any>(null)

    useImperativeHandle(ref, () => ({
        xtermRef
    }))

    const write = (s: string) => {
        if (!xtermRef || !xtermRef.current) {
            return
        }
        const str = s.charCodeAt(0) === 13 ? String.fromCharCode(10) : s
        if (xtermRef.current?.terminal) xtermRef.current.terminal.write(str)
    }

    return (
        <XTerm
            ref={xtermRef}
            onKey={({key, domEvent}) => {
                if (!loading) {
                    const code = key.charCodeAt(0)
                    if (code === 127 && xtermRef?.current) {
                        //Backspace
                        xtermRef.current.terminal.write("\x1b[D \x1b[D")
                    }

                    rewrite ? rewrite(key) : write(key)
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
                            rewrite ? rewrite(res) : write(res)
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
        />
    )
})
