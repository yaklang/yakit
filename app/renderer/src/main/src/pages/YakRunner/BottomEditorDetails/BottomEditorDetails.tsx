import React, {useEffect, useMemo, useRef, useState} from "react"
import {Popover, Tooltip} from "antd"
import {SettingOutlined} from "@ant-design/icons"
import {useDebounceFn, useGetState, useInViewport, useMemoizedFn, useUpdateEffect} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./BottomEditorDetails.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {BottomEditorDetailsProps, JumpToEditorProps, OutputInfoProps, ShowItemType} from "./BottomEditorDetailsType"
import {HelpInfoList} from "../CollapseList/CollapseList"
import {OutlineCogIcon, OutlineExitIcon, OutlineTrashIcon, OutlineXIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SyntaxCheckList} from "./SyntaxCheckList/SyntaxCheckList"
import useStore from "../hooks/useStore"
import emiter from "@/utils/eventBus/eventBus"
import {Selection} from "../RunnerTabs/RunnerTabsType"
import {ExecResult} from "@/pages/invoker/schema"
import {writeExecResultXTerm, writeXTerm, xtermClear, xtermFit} from "@/utils/xtermUtils"
import ReactResizeDetector from "react-resize-detector"
import {
    defaultTerminaFont,
    defaultTerminalFont,
    DefaultTerminaSettingProps,
    TerminalBox
} from "./TerminalBox/TerminalBox"
import {System, SystemInfo, handleFetchSystem} from "@/constants/hardware"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {SolidCheckIcon} from "@/assets/icon/solid"
import {ChevronDownIcon, ChevronUpIcon, InformationCircleIcon} from "@/assets/newIcon"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {removeTerminalMap} from "./TerminalBox/TerminalMap"
import YakitXterm from "@/components/yakitUI/YakitXterm/YakitXterm"
import {RemoteGV} from "@/yakitGV"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
const {ipcRenderer} = window.require("electron")

// 编辑器区域 展示详情（输出/语法检查/终端/帮助信息）

export const BottomEditorDetails: React.FC<BottomEditorDetailsProps> = (props) => {
    const {isShowEditorDetails, setEditorDetails, showItem, setShowItem} = props

    const {activeFile, fileTree} = useStore()
    // 不再重新加载的元素
    const [showType, setShowType] = useState<ShowItemType[]>([])

    const [popoverVisible, setPopoverVisible] = useState<boolean>(false)

    const [terminaFont, setTerminaFont] = useState<DefaultTerminaSettingProps>(defaultTerminalFont)

    // 缓存字体设置
    useUpdateEffect(() => {
        setRemoteValue(RemoteGV.YakitXtermSetting, JSON.stringify(terminaFont))
    }, [terminaFont])

    // 更改默认值
    useEffect(() => {
        getRemoteValue(RemoteGV.YakitXtermSetting).then((value) => {
            if (!value) return
            try {
                const terminaFont = JSON.parse(value) as DefaultTerminaSettingProps
                setTerminaFont(terminaFont)
            } catch (error) {}
        })
    }, [])

    // 数组去重
    const filterItem = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

    useEffect(() => {
        if (showItem && isShowEditorDetails) {
            if (showType.includes(showItem)) return
            setShowType((arr) => filterItem([...arr, showItem]))
        }
    }, [showItem, isShowEditorDetails])

    const syntaxCheckData = useMemo(() => {
        if (activeFile?.syntaxCheck) {
            return activeFile.syntaxCheck
        }
        return []
    }, [activeFile?.syntaxCheck])

    // 跳转至编辑器并选中
    const onJumpToEditor = useMemoizedFn((selections: Selection) => {
        if (activeFile?.path) {
            const obj: JumpToEditorProps = {
                selections,
                id: activeFile?.path || ""
            }
            emiter.emit("onJumpEditorDetail", JSON.stringify(obj))
        }
    })

    const onOpenBottomDetailFun = useMemoizedFn((v: string) => {
        try {
            const {type}: {type: ShowItemType} = JSON.parse(v)
            // 执行时需要清空输出
            if (type === "output") {
                xtermClear(xtermRef)
            }
            setEditorDetails(true)
            setShowItem(type)
        } catch (error) {}
    })

    const terminalRef = useRef<any>(null)
    const terminalFocusRef = useRef<boolean>(false)
    const onOpenTerminaDetailFun = useMemoizedFn(() => {
        // 已打开
        if (isShowEditorDetails) {
            if (showItem !== "terminal") {
                setShowItem("terminal")
            }
            // 有焦点则关闭
            else if (terminalFocusRef.current) {
                terminalRef.current.terminal.blur()
                terminalFocusRef.current = false
                setEditorDetails(false)
                const main = document.getElementById("yakit-runnner-main-box-id")
                if (main) {
                    main.focus()
                }
            } else {
                // 终端焦点聚焦
                if (terminalRef.current) {
                    terminalFocusRef.current = true
                    terminalRef.current.terminal.focus()
                }
            }
        }
        // 未打开
        else {
            setEditorDetails(true)
            setShowItem("terminal")
            // 终端焦点聚焦
            if (terminalRef.current) {
                terminalFocusRef.current = true
                terminalRef.current.terminal.focus()
            }
        }
    })

    useEffect(() => {
        emiter.on("onOpenBottomDetail", onOpenBottomDetailFun)
        emiter.on("onOpenTerminaDetail", onOpenTerminaDetailFun)
        return () => {
            emiter.off("onOpenBottomDetail", onOpenBottomDetailFun)
            emiter.off("onOpenTerminaDetail", onOpenTerminaDetailFun)
        }
    }, [])

    const onBlur = useMemoizedFn(() => {
        terminalFocusRef.current = false
    })

    const onFocus = useMemoizedFn(() => {
        terminalFocusRef.current = true
    })

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.terminal.textarea.addEventListener("blur", onBlur)
            terminalRef.current.terminal.textarea.addEventListener("focus", onFocus)
        }
        return () => {
            if (terminalRef.current) {
                terminalRef.current.terminal.textarea.removeEventListener("blur", onBlur)
                terminalRef.current.terminal.textarea.removeEventListener("focus", onFocus)
            }
        }
    }, [terminalRef.current])

    // 输出缓存
    const outputCahceRef = useRef<string>("")
    // 输出流
    const xtermRef = useRef<any>(null)
    useEffect(() => {
        // xtermClear(xtermRef)
        ipcRenderer.on("client-yak-data", async (e: any, data: ExecResult) => {
            if (data.IsMessage) {
            }
            if (data?.Raw) {
                outputCahceRef.current += Buffer.from(data.Raw).toString("utf8")
                if (xtermRef.current) {
                    writeExecResultXTerm(xtermRef, data, "utf8")
                }
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("client-yak-data")
        }
    }, [xtermRef])

    // 终端路径
    const [folderPath, setFolderPath] = useState<string>("")

    useEffect(() => {
        if (fileTree.length > 0) {
            setFolderPath(fileTree[0].path)
        } else {
            setFolderPath("")
        }
    }, [fileTree])

    const onOpenTernimalFun = useMemoizedFn((path) => {
        setEditorDetails(true)
        setShowItem("terminal")
        setFolderPath(path)
    })

    // 监听终端更改
    useEffect(() => {
        emiter.on("onOpenTernimal", onOpenTernimalFun)
        return () => {
            emiter.off("onOpenTernimal", onOpenTernimalFun)
        }
    }, [])

    const onExitTernimal = useMemoizedFn((path: string) => {
        removeTerminalMap(path)
        setEditorDetails(false)
        // 重新渲染
        setShowType(showType.filter((item) => item !== "terminal"))
        const main = document.getElementById("yakit-runnner-main-box-id")
        if (main) {
            main.focus()
        }
    })

    return (
        <div className={styles["bottom-editor-details"]}>
            <div className={styles["header"]}>
                <div className={styles["select-box"]}>
                    <div
                        className={classNames(styles["item"], {
                            [styles["active-item"]]: showItem === "output",
                            [styles["no-active-item"]]: showItem !== "output"
                        })}
                        onClick={() => setShowItem("output")}
                    >
                        <div className={styles["title"]}>输出</div>
                    </div>
                    <div
                        className={classNames(styles["item"], {
                            [styles["active-item"]]: showItem === "syntaxCheck",
                            [styles["no-active-item"]]: showItem !== "syntaxCheck"
                        })}
                        onClick={() => setShowItem("syntaxCheck")}
                    >
                        <div className={styles["title"]}>语法检查</div>
                        {activeFile && <div className={styles["count"]}>{syntaxCheckData.length}</div>}
                    </div>
                    <div
                        className={classNames(styles["item"], {
                            [styles["active-item"]]: showItem === "terminal",
                            [styles["no-active-item"]]: showItem !== "terminal"
                        })}
                        onClick={() => setShowItem("terminal")}
                    >
                        <div className={styles["title"]}>终端</div>
                    </div>
                    <div
                        className={classNames(styles["item"], {
                            [styles["active-item"]]: showItem === "helpInfo",
                            [styles["no-active-item"]]: showItem !== "helpInfo"
                        })}
                        onClick={() => setShowItem("helpInfo")}
                    >
                        <div className={styles["title"]}>帮助信息</div>
                    </div>
                </div>
                <div className={styles["extra"]}>
                    {
                        <YakitPopover
                            placement='left'
                            trigger='click'
                            overlayClassName={styles["yak-runner-menu-popover"]}
                            title={<div style={{display: "flex"}}>终端字体配置</div>}
                            content={
                                <>
                                    <div className={styles["title-font"]}>
                                        控制终端的字体系列，默认为{" "}
                                        <span
                                            className={styles["default-font"]}
                                            onClick={() => {
                                                setTerminaFont({...terminaFont, fontFamily: defaultTerminaFont})
                                            }}
                                        >
                                            Termina: Font Family
                                        </span>{" "}
                                        的值。
                                    </div>
                                    <YakitInput
                                        size='small'
                                        value={terminaFont.fontFamily}
                                        onChange={(e) => {
                                            const str = e.target.value
                                            if (str.length > 0) {
                                                setTerminaFont({...terminaFont, fontFamily: str})
                                            }
                                        }}
                                        placeholder='请输入字体'
                                    />
                                    <div className={styles["title-font"]} style={{marginTop: 4}}>
                                        控制终端的字体大小，默认为{" "}
                                        <span
                                            className={styles["default-font"]}
                                            onClick={() => {
                                                setTerminaFont({...terminaFont, fontSize: 14})
                                            }}
                                        >
                                            14
                                        </span>{" "}
                                        。
                                    </div>
                                    <YakitInputNumber
                                        style={{width: "100%"}}
                                        size='small'
                                        min={1}
                                        value={terminaFont.fontSize}
                                        onChange={(v) => {
                                            setTerminaFont({...terminaFont, fontSize: v as number})
                                        }}
                                    />
                                </>
                            }
                            onVisibleChange={(v) => {
                                if (!v) {
                                    if (terminalRef.current) {
                                        terminalRef.current.terminal.options.fontFamily = terminaFont.fontFamily
                                        terminalRef.current.terminal.options.fontSize = terminaFont.fontSize
                                    }
                                }
                                setPopoverVisible(v)
                            }}
                            overlayInnerStyle={{width: 340}}
                            visible={popoverVisible}
                        >
                            <YakitButton icon={<OutlineCogIcon />} type={popoverVisible ? "text" : "text2"} />
                        </YakitPopover>
                    }
                    {showItem === "terminal" && (
                        <YakitButton
                            type='text2'
                            // danger
                            icon={<OutlineExitIcon />}
                            className={styles["yak-runner-terminal-close"]}
                            onClick={() => {
                                ipcRenderer.invoke("runner-terminal-cancel", folderPath).finally(() => {
                                    onExitTernimal(folderPath)
                                })
                            }}
                        />
                    )}
                    <YakitButton
                        type='text2'
                        icon={<OutlineXIcon />}
                        onClick={() => {
                            setEditorDetails(false)
                        }}
                    />
                </div>
            </div>
            <div className={styles["content"]}>
                {showType.includes("output") && (
                    <div
                        className={classNames(styles["render-hideen"], {
                            [styles["render-show"]]: showItem === "output"
                        })}
                    >
                        <OutputInfo outputCahceRef={outputCahceRef} xtermRef={xtermRef} />
                    </div>
                )}

                {showType.includes("syntaxCheck") && (
                    <div
                        className={classNames(styles["render-hideen"], {
                            [styles["render-show"]]: showItem === "syntaxCheck"
                        })}
                    >
                        {activeFile ? (
                            <SyntaxCheckList syntaxCheckData={syntaxCheckData} onJumpToEditor={onJumpToEditor} />
                        ) : (
                            <div className={styles["no-syntax-check"]}>请选中具体文件查看语法检查信息</div>
                        )}
                    </div>
                )}
                {showType.includes("terminal") && (
                    <div
                        className={classNames(styles["render-hideen"], {
                            [styles["render-show"]]: showItem === "terminal"
                        })}
                    >
                        <TerminalBox
                            folderPath={folderPath}
                            isShowEditorDetails={isShowEditorDetails}
                            defaultTerminalSetting={terminaFont}
                            xtermRef={terminalRef}
                            onExitTernimal={onExitTernimal}
                        />
                    </div>
                )}
                {/* 帮助信息只有yak有 */}
                {showType.includes("helpInfo") && (
                    <div
                        className={classNames(styles["render-hideen"], {
                            [styles["render-show"]]: showItem === "helpInfo"
                        })}
                    >
                        {activeFile?.language === "yak" ? (
                            <HelpInfoList />
                        ) : (
                            <div className={styles["no-syntax-check"]}>请选中yak文件查看帮助信息</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export const OutputInfo: React.FC<OutputInfoProps> = (props) => {
    const {outputCahceRef, xtermRef} = props

    useEffect(() => {
        if (outputCahceRef.current.length > 0) {
            writeXTerm(xtermRef, outputCahceRef.current)
        }
    }, [])

    const systemRef = useRef<System | undefined>(SystemInfo.system)
    useEffect(() => {
        if (!systemRef.current) {
            handleFetchSystem(() => (systemRef.current = SystemInfo.system))
        }
    }, [])

    const setCopy = useDebounceFn(
        useMemoizedFn((content: string) => {
            ipcRenderer.invoke("set-copy-clipboard", content)
        }),
        {wait: 10}
    ).run
    const onCopy = useMemoizedFn((e: KeyboardEvent) => {
        const isActiveCOrM = systemRef.current === "Darwin" ? e.metaKey : e.ctrlKey
        const isCopy = e.code === "KeyC" && isActiveCOrM
        if (isCopy) {
            const str = xtermRef.current.terminal.getSelection()
            setCopy(str || "")
            return false
        }
        return true
    })
    return (
        <div className={styles["output-info-list"]}>
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
            <YakitXterm
                ref={xtermRef}
                customKeyEventHandler={onCopy}
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
            />
        </div>
    )
}
