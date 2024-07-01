import React, {useEffect, useRef, useState} from "react"
import {} from "antd"
import {} from "@ant-design/icons"
import {useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./TerminalBox.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import ReactResizeDetector from "react-resize-detector"
import {writeXTerm, xtermClear, xtermFit} from "@/utils/xtermUtils"
import {TERMINAL_INPUT_KEY, YakitCVXterm} from "@/components/yakitUI/YakitCVXterm/YakitCVXterm"

const {ipcRenderer} = window.require("electron")

export interface TerminalBoxProps {}
export const TerminalBox: React.FC<TerminalBoxProps> = (props) => {
    const xtermRef = useRef<any>(null)
    const [inputValue, setInputValue] = useState<string>("")
    const [defaultXterm, setDefaultXterm] = useState<string>("")

    useEffect(() => {
        if (!xtermRef) {
            return
        }
        const params = {}
        ipcRenderer
            .invoke("runner-terminal-port", params)
            .then(() => {
                success("终端监听成功")
            })
            .catch((e: any) => {
                failed(`ERROR: ${JSON.stringify(e)}`)
            })
            .finally(() => {})
    }, [xtermRef])

    // xtermClear(xtermRef)
    // writeXTerm(xtermRef, defaultXterm)

    const commandExec = useMemoizedFn((cmd: string) => {})

    return (
        <div className={styles["terminal-box"]}>
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
            <YakitCVXterm
                maxHeight={0}
                ref={xtermRef}
                options={{
                    convertEol: true
                }}
                isWrite={false}
                onData={(data) => {
                    if (data.replace(/[\x7F]/g, "").length > 0) {
                        writeXTerm(xtermRef, data)
                        // 处理用户输入的数据
                        setInputValue((prevInput) => prevInput + data)
                    }
                }}
                onKey={(e) => {
                    const {key} = e
                    const {keyCode} = e.domEvent
                    // 删除
                    if (keyCode === TERMINAL_INPUT_KEY.BACK && xtermRef?.current) {
                        // 如只剩初始值则不删除
                        if (inputValue === defaultXterm) {
                            return
                        }
                        setInputValue((prevInput) => prevInput.replace(/.$/, "").replace(/[\x7F]/g, ""))
                        // 发送 backspace 字符
                        xtermRef.current.terminal.write("\b \b")
                        return
                    }
                    // 回车
                    if (keyCode === TERMINAL_INPUT_KEY.ENTER && xtermRef?.current) {
                        // 此处调用接口
                        commandExec(inputValue)
                        xtermRef.current.terminal.write("\n")
                        setInputValue("")
                        return
                    }
                }}
            />
        </div>
    )
}
