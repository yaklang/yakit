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
import {CVXterm} from "@/components/CVXterm"
import {ExecResult} from "@/pages/invoker/schema"
import {writeExecResultXTerm, writeXTerm, xtermClear, xtermFit} from "@/utils/xtermUtils"
import ReactResizeDetector from "react-resize-detector"
import {defaultXTermOptions} from "@/components/baseConsole/BaseConsole"
import {XTerm} from "xterm-for-react"
import {YakitSystem} from "@/yakitGVDefine"
import {TerminalBox} from "./TerminalBox/TerminalBox"
import {System, SystemInfo, handleFetchSystem} from "@/constants/hardware"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {SolidCheckIcon} from "@/assets/icon/solid"
import {ChevronDownIcon, ChevronUpIcon, InformationCircleIcon} from "@/assets/newIcon"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
const {ipcRenderer} = window.require("electron")

// 编辑器区域 展示详情（输出/语法检查/终端/帮助信息）

export const BottomEditorDetails: React.FC<BottomEditorDetailsProps> = (props) => {
    const {isShowEditorDetails, setEditorDetails, showItem, setShowItem} = props

    const systemRef = useRef<System | undefined>(SystemInfo.system)
    useEffect(() => {
        if (!systemRef.current) {
            handleFetchSystem(() => (systemRef.current = SystemInfo.system))
        }
    }, [])

    const {activeFile, fileTree} = useStore()
    // 不再重新加载的元素
    const [showType, setShowType] = useState<ShowItemType[]>([])

    const [popoverVisible, setPopoverVisible] = useState<boolean>(false)
    const defaultTerminaFont = "Consolas, 'Courier New', monospace"
    const [terminaFont, setTerminaFont] = useState<string>(defaultTerminaFont)

    const SetYakRunnerTerminaFont = "SetYakRunnerTerminaFont"
    // 缓存字体设置
    useUpdateEffect(() => {
        setRemoteValue(SetYakRunnerTerminaFont, terminaFont)
    }, [terminaFont])
    // 更改默认值
    useEffect(() => {
        getRemoteValue(SetYakRunnerTerminaFont).then((font) => {
            if (!font) return
            setTerminaFont(font)
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
            // 有焦点则关闭
            if (terminalFocusRef.current) {
                terminalRef.current.terminal.blur()
                terminalFocusRef.current = false
                setEditorDetails(false)
                const main = document.getElementById("yakit-runnner-main-box-id")
                if(main){
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

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.terminal.textarea.addEventListener("blur", () => {
                terminalFocusRef.current = false
            })
            terminalRef.current.terminal.textarea.addEventListener("focus", () => {
                terminalFocusRef.current = true
            })
        }
    }, [terminalRef])

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
                            title={
                                <div style={{display: "flex"}}>
                                    终端字体配置
                                    <Tooltip title='字体设置后需重启终端生效'>
                                        <InformationCircleIcon className={styles["info-icon"]} />
                                    </Tooltip>
                                </div>
                            }
                            content={
                                <>
                                    <div className={styles["title-font"]}>
                                        控制终端的字体系列，默认为{" "}
                                        <span
                                            className={styles["default-font"]}
                                            onClick={() => {
                                                setTerminaFont(defaultTerminaFont)
                                            }}
                                        >
                                            Termina: Font Family
                                        </span>{" "}
                                        的值。
                                    </div>
                                    <YakitInput
                                        size='small'
                                        value={terminaFont}
                                        onChange={(e) => {
                                            setTerminaFont(e.target.value)
                                        }}
                                        placeholder='请输入字体'
                                    />
                                </>
                            }
                            onVisibleChange={(v) => {
                                if (!v) {
                                    if (terminalRef.current) {
                                        // terminalRef.current.terminal.clearTextureAtlas()
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
                                    setEditorDetails(false)
                                    // 重新渲染
                                    setShowType(showType.filter((item) => item !== "terminal"))
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
                        {/* {systemRef.current === "Windows_NT" ? (
                            <div className={styles["no-syntax-check"]}>终端监修中</div>
                        ) : ( */}
                        <TerminalBox
                            folderPath={folderPath}
                            isShowEditorDetails={isShowEditorDetails}
                            terminaFont={terminaFont}
                            xtermRef={terminalRef}
                        />
                        {/* )} */}
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

    const systemRef = useRef<YakitSystem>("Darwin")
    useEffect(() => {
        ipcRenderer
            .invoke("fetch-system-name")
            .then((res) => (systemRef.current = res))
            .catch(() => {})
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
            <XTerm
                ref={xtermRef}
                customKeyEventHandler={onCopy}
                options={{
                    convertEol: true,
                    theme: {
                        foreground: "#536870",
                        background: "#ffffff",
                        cursor: "#536870",

                        black: "#002831",
                        brightBlack: "#001e27",

                        red: "#d11c24",
                        brightRed: "#bd3613",

                        green: "#738a05",
                        brightGreen: "#475b62",

                        yellow: "#a57706",
                        brightYellow: "#536870",

                        blue: "#2176c7",
                        brightBlue: "#708284",

                        magenta: "#c61c6f",
                        brightMagenta: "#5956ba",

                        cyan: "#259286",
                        brightCyan: "#819090",

                        white: "#eae3cb",
                        brightWhite: "#fcf4dc"
                    }
                }}
            />
        </div>
    )
}
