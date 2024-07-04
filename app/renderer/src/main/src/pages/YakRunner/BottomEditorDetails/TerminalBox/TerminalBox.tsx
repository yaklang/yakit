import React, {useEffect, useMemo, useRef, useState} from "react"
import {Modal} from "antd"
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
import useStore from "../../hooks/useStore"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"

const {ipcRenderer} = window.require("electron")

export interface TerminalBoxProps {
    isShow: boolean
}
export const TerminalBox: React.FC<TerminalBoxProps> = (props) => {
    const {isShow} = props
    const {fileTree} = useStore()
    const xtermRef = useRef<any>(null)
    const [inputValue, setInputValue] = useState<string>("")
    const [defaultXterm, setDefaultXterm] = useState<string>("")
    // 是否允许输入及不允许输入的原因
    const [allowInput, setAllowInput] = useState<boolean>(true)
    const [failResult, setFailResult] = useState<string>("")
    const [showModal, setShowModal] = useState<boolean>(false)

    // 终端path为文件树根路径
    const folderPath = useMemo(() => {
        if (fileTree.length > 0) {
            return fileTree[0].path
        } else {
            return ""
        }
    }, [fileTree])

    // 写入
    const commandExec = useMemoizedFn((cmd) => {
        if (!xtermRef || !xtermRef.current) {
            return
        }
        if (cmd.startsWith(defaultXterm)) {
            cmd = cmd.replace(defaultXterm, "")
        }
        console.log("写入", cmd)

        // const str = s.charCodeAt(0) === TERMINAL_INPUT_KEY.ENTER ? String.fromCharCode(10) : s
        ipcRenderer.invoke("runner-terminal-input", folderPath, cmd)
    })

    useEffect(() => {
        if (!xtermRef) {
            return
        }
        setAllowInput(true)
        setFailResult("")
        // 启动
        ipcRenderer
            .invoke("runner-terminal", {
                path: folderPath
            })
            .then(() => {
                success("终端监听成功")
                if (folderPath.length) {
                    setDefaultXterm(`${folderPath}>`)
                    setInputValue(`${folderPath}>`)
                    writeXTerm(xtermRef, `${folderPath}>`)
                }
            })
            .catch((e: any) => {
                failed(`ERROR: ${JSON.stringify(e)}`)
            })
            .finally(() => {})

        // 接收
        const key = `client-listening-terminal-data-${folderPath}`
        ipcRenderer.on(key, (e, data) => {
            console.log("data---", data)

            if (data.control) {
                return
            }

            // if (data?.raw && xtermRef?.current && xtermRef.current?.terminal) {
            //     // let str = String.fromCharCode.apply(null, data.raw);
            //     xtermRef.current.terminal.write(data.raw)
            //     setHaveConnIn(true)
            // }

            // 先生成结果行 换行后 更改缓存新增输入行（结果行可能cd路径变化 需更改）
            // writeXTerm(xtermRef, "result")
            // writeXTerm(xtermRef, "\n")

            // setDefaultXterm(folderPath + ">")
            // setInputValue(folderPath + ">")
            // writeXTerm(xtermRef, folderPath + ">")
        })

        const successKey = `client-listening-terminal-success-${folderPath}`
        ipcRenderer.on(successKey, (e: any) => {
            console.log("client-listening-terminal-success---")
        })

        // grpc通知关闭
        const errorKey = "client-listening-terminal-end"
        ipcRenderer.on(errorKey, (e: any, data: any) => {
            setAllowInput(false)
            setFailResult(data)
            isShow&&setShowModal(true)
        })
        return () => {
            // 移除
            ipcRenderer.removeAllListeners(key)
            ipcRenderer.removeAllListeners(successKey)
            ipcRenderer.removeAllListeners(errorKey)
            // 清空
            xtermClear(xtermRef)
        }
    }, [xtermRef, folderPath])

    // xtermClear(xtermRef)
    // writeXTerm(xtermRef, defaultXterm)

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
                    convertEol: true,
                    theme: {
                        foreground: "#e5c7a9",
                        background: "#31343F",
                        cursor: "#f6f7ec",

                        black: "#121418",
                        brightBlack: "#675f54",

                        red: "#c94234",
                        brightRed: "#ff645a",

                        green: "#85c54c",
                        brightGreen: "#98e036",

                        yellow: "#f5ae2e",
                        brightYellow: "#e0d561",

                        blue: "#1398b9",
                        brightBlue: "#5fdaff",

                        magenta: "#d0633d",
                        brightMagenta: "#ff9269",

                        cyan: "#509552",
                        brightCyan: "#84f088",

                        white: "#e5c6aa",
                        brightWhite: "#f6f7ec"
                    }
                }}
                // isWrite={false}
                onData={(data) => {
                    if (!allowInput) {
                        setShowModal(true)
                        return
                    }
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
            {/* 终端关闭提示框 */}
            <YakitHint
                visible={showModal}
                title='终端警告'
                content={`终端 ${failResult} 被关闭`}
                cancelButtonProps={{style: {display: "none"}}}
                onOk={() => {
                    setShowModal(false)
                }}
                okButtonText={"知道了"}
            />
        </div>
    )
}
