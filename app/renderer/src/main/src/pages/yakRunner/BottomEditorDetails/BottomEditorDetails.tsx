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
    TerminalBox,
    TerminalListBox
} from "./TerminalBox/TerminalBox"
import {System, SystemInfo, handleFetchSystem} from "@/constants/hardware"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {v4 as uuidv4} from "uuid"
import {ChevronDownIcon, ChevronUpIcon, InformationCircleIcon, OutlinePlusIcon} from "@/assets/newIcon"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {
    clearTerminalMap,
    getMapAllTerminalKey,
    getTerminalMap,
    removeTerminalMap,
    setTerminalMap,
    TerminalDetailsProps
} from "./TerminalBox/TerminalMap"
import YakitXterm from "@/components/yakitUI/YakitXterm/YakitXterm"
import {RemoteGV} from "@/yakitGV"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {Uint8ArrayToString} from "@/utils/str"
import {setClipboardText} from "@/utils/clipboard"

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
                path: activeFile?.path || ""
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
        ipcRenderer.on("client-yak-error", async (e: any, data) => {
            failed(`${data}`)
        })
        return () => {
            ipcRenderer.removeAllListeners("client-yak-data")
            ipcRenderer.removeAllListeners("client-yak-error")
        }
    }, [xtermRef])

    // 终端路径
    const folderPathRef = useRef<string>("")
    // 当前终端打开项
    const [terminalIds, setTerminalIds] = useState<string[]>([])
    // 终端大小
    const terminalSizeRef = useRef<{row: number; col: number}>()
    // 终端当前展示项
    const [terminalRunnerId, setTerminalRunnerId, getTerminalRunnerId] = useGetState<string>("")
    const [refreshList, setRefreshList, getRefreshList] = useGetState<boolean>(false)
    // 是否需要重新加载终端(终端已被整体关闭)
    const [isReloadTerminal, setReloadTerminal] = useState<boolean>(false)

    // 构造xtrem列表数据
    const initTerminalListData = useMemo(() => {
        let listData: TerminalDetailsProps[] = []
        terminalIds.forEach((item) => {
            try {
                const terminalCache = getTerminalMap(item)
                const listItem: TerminalDetailsProps = JSON.parse(terminalCache)
                listData.push(listItem)
            } catch (error) {}
        })
        return listData
    }, [terminalIds, refreshList])

    useUpdateEffect(() => {
        if (isShowEditorDetails && showItem === "terminal" && isReloadTerminal) {
            setReloadTerminal(false)
            initTerminal()
        }
    }, [isShowEditorDetails, showItem, terminalRunnerId])

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.terminal.textarea.addEventListener("blur", onBlur)
            terminalRef.current.terminal.textarea.addEventListener("focus", onFocus)
            terminalRef.current.terminal.onTitleChange((path: string) => {
                // 此处路径用于终端列表名 由于需兼容mac liunx经与后端协商仅提取字符串存在\的名称其余完整展示
                let title = path
                if (path.includes("\\")) {
                    const lastSlashIndex = path.lastIndexOf("\\")
                    const fileName = path.substring(lastSlashIndex + 1)
                    const lastIndex = fileName.lastIndexOf(".")
                    if (lastIndex !== -1) {
                        title = fileName.slice(0, lastIndex)
                    } else {
                        title = fileName
                    }
                }
                const id = getTerminalRunnerId()
                const terminalCache = getTerminalMap(id)
                const obj: TerminalDetailsProps = JSON.parse(terminalCache)
                obj.title = title
                setTerminalMap(id, JSON.stringify(obj))
                setRefreshList(!getRefreshList())
            })
        }
        return () => {
            if (terminalRef.current) {
                terminalRef.current.terminal.textarea.removeEventListener("blur", onBlur)
                terminalRef.current.terminal.textarea.removeEventListener("focus", onFocus)
            }
        }
    }, [terminalRef.current])

    useEffect(() => {
        setTerminalIds(getMapAllTerminalKey())
    }, [])

    useEffect(() => {
        if (fileTree.length > 0) {
            folderPathRef.current = fileTree[0].path
        } else {
            folderPathRef.current = ""
        }
    }, [fileTree])

    const onOpenTernimalFun = useMemoizedFn((path) => {
        setEditorDetails(true)
        setShowItem("terminal")
        folderPathRef.current = path
        startTerminal()
    })

    // 在终端中打开
    useEffect(() => {
        emiter.on("onOpenTernimal", onOpenTernimalFun)
        return () => {
            emiter.off("onOpenTernimal", onOpenTernimalFun)
        }
    }, [])

    // 整体退出终端
    const onExitTernimal = useMemoizedFn(() => {
        if (terminalRef.current) {
            clearTerminalMap()
            setEditorDetails(false)
            // 重新渲染
            // setShowType(showType.filter((item) => item !== "terminal"))
            setTerminalIds([])
            setTerminalRunnerId("")
            setReloadTerminal(true)
            setRefreshList(!refreshList)
            terminalRef.current.terminal.reset()
            const main = document.getElementById("yakit-runnner-main-box-id")
            if (main) {
                main.focus()
            }
        }
    })

    // 终端初始化
    const initTerminal = useMemoizedFn(() => {
        if (!terminalRef) return
        if (!terminalSizeRef.current) return
        try {
            // 校验map存储缓存
            const terminalCache = getMapAllTerminalKey()
            if (terminalCache.length > 0) {
                // 默认展开第一项
                let runnerId: string = terminalCache[0]

                const terminalItemCache = getTerminalMap(runnerId)
                const cache: TerminalDetailsProps = JSON.parse(terminalItemCache)
                setTerminalRunnerId(runnerId)
                setTerminalIds(terminalCache)
                writeXTerm(terminalRef, cache.content)
            } else {
                startTerminal()
            }
        } catch (error) {}
    })

    // 启动终端执行
    const startTerminal = useMemoizedFn(() => {
        if (!terminalRef) return
        if (!terminalSizeRef.current) return
        xtermClear(terminalRef)
        const runnnerId = uuidv4()

        // 启动
        ipcRenderer
            .invoke("runner-terminal", {
                id: runnnerId,
                path: folderPathRef.current,
                ...terminalSizeRef.current
            })
            .then(() => {
                const cache: TerminalDetailsProps = {
                    id: runnnerId,
                    path: folderPathRef.current,
                    content: "",
                    title: ""
                }
                // 更新缓存
                setTerminalMap(runnnerId, JSON.stringify(cache))

                setTerminalRunnerId(runnnerId)
                setTerminalIds([...terminalIds, runnnerId])
                // isShowEditorDetails && success(`终端${folderPathRef.current}监听成功`)
            })
            .catch((e: any) => {
                failed(`ERROR: ${JSON.stringify(e)}`)
            })
            .finally(() => {})
    })

    // 写入
    const commandExec = useMemoizedFn((cmd: string) => {
        if (!terminalRef || !terminalRef.current) {
            return
        }

        ipcRenderer.invoke("runner-terminal-input", terminalRunnerId, cmd)
    })

    // 行列变化
    const onChangeSize = useMemoizedFn(({row, col}) => {
        if (row && col) {
            if (terminalSizeRef.current) {
                ipcRenderer.invoke("runner-terminal-size", terminalRunnerId, {
                    height: row,
                    width: col
                })
            }
            // 确保第一次执行 带入row、col
            else {
                terminalSizeRef.current = {row, col}
                initTerminal()
            }
        }
    })

    // 输出
    const onWriteXTerm = useMemoizedFn((id: string, path: string, data: Uint8Array) => {
        let outPut = Uint8ArrayToString(data)
        const terminalCache = getTerminalMap(id)
        try {
            if (terminalCache) {
                const obj: TerminalDetailsProps = JSON.parse(terminalCache)
                const cache: TerminalDetailsProps = {
                    id,
                    path,
                    content: obj.content + outPut,
                    title: obj.title
                }

                // 更新缓存
                setTerminalMap(id, JSON.stringify(cache))
                if (id === terminalRunnerId) {
                    writeXTerm(terminalRef, outPut)
                }
            }
        } catch (error) {}
    })

    const isShowTerminalList = useMemo(() => {
        return terminalIds.length > 1
    }, [terminalIds])

    const onListeningTerminalEnd = useMemoizedFn((data: {id: string; path: string}) => {
        const {id, path} = data
        if (getMapAllTerminalKey().includes(id)) {
            // isShowEditorDetails && warn(`终端${path}被关闭`)
            // 列表关闭
            if (terminalIds.length > 1) {
                if (terminalRunnerId === id) {
                    let itemIndex = terminalIds.indexOf(id)
                    let index = itemIndex === terminalIds.length - 1 ? itemIndex - 1 : itemIndex + 1
                    onSelectTerminalItem(terminalIds[index])
                }
                removeTerminalMap(id)
                setTerminalIds(terminalIds.filter((item) => item !== id))
                setRefreshList(!refreshList)
            }
            // 整体关闭
            else {
                onExitTernimal()
            }
        }
    })

    useEffect(() => {
        // 接收
        const key = `client-listening-terminal-data`
        ipcRenderer.on(key, (e, data) => {
            const {id, path, result} = data
            if (result.control) {
                return
            }
            if (result?.raw) {
                onWriteXTerm(id, path, result.raw)
            }
        })

        const successKey = `client-listening-terminal-success`
        ipcRenderer.on(successKey, (e: any, data: any) => {
            // console.log("client-listening-terminal-success---")
        })

        // grpc通知关闭
        const closeKey = "client-listening-terminal-end"
        ipcRenderer.on(closeKey, (e: any, data: {id: string; path: string}) => {
            onListeningTerminalEnd(data)
        })

        // grpc错误
        const errorKey = "client-listening-terminal-error"
        ipcRenderer.on(errorKey, (e: any, data: {id: string; path: string}) => {
            warn(`终端${data.path}错误`)
        })

        return () => {
            // 移除
            ipcRenderer.removeAllListeners(key)
            ipcRenderer.removeAllListeners(successKey)
            ipcRenderer.removeAllListeners(closeKey)
            ipcRenderer.removeAllListeners(errorKey)
            // 清空
            xtermClear(terminalRef)
        }
    }, [terminalRef])

    const onSelectTerminalItem = useMemoizedFn((id) => {
        if (terminalRunnerId === id) return
        setTerminalRunnerId(id)
        const terminalCache = getTerminalMap(id)
        try {
            if (terminalCache && terminalRef.current) {
                const cache: TerminalDetailsProps = JSON.parse(terminalCache)
                terminalRef.current.terminal.reset()
                writeXTerm(terminalRef, cache.content)
                terminalRef.current.terminal.scrollToBottom()
            }
        } catch (error) {}
    })

    const onDeleteTerminalItem = useMemoizedFn((id) => {
        ipcRenderer.invoke("runner-terminal-cancel", id).finally(() => {})
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
                    {showItem === "terminal" && (
                        <>
                            <YakitButton
                                type='text2'
                                icon={<OutlinePlusIcon />}
                                onClick={() => {
                                    startTerminal()
                                }}
                            />
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
                                                setTerminaFont({...terminaFont, fontFamily: str})
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
                            {!isShowTerminalList && (
                                <YakitButton
                                    type='text2'
                                    // danger
                                    icon={<OutlineExitIcon />}
                                    className={styles["yak-runner-terminal-close"]}
                                    onClick={() => {
                                        ipcRenderer.invoke("runner-terminal-cancel", terminalRunnerId).finally(() => {})
                                    }}
                                />
                            )}
                        </>
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
                        <YakitResizeBox
                            freeze={isShowTerminalList}
                            secondRatio={isShowTerminalList ? "225px" : "0px"}
                            secondMinSize={isShowTerminalList ? 100 : "0px"}
                            firstMinSize={500}
                            lineDirection='right'
                            lineStyle={{width: 4, backgroundColor: "rgb(49, 52, 63)"}}
                            lineInStyle={{backgroundColor: "#545663"}}
                            firstNodeStyle={isShowTerminalList ? {padding: 0} : {padding: 0, minWidth: "100%"}}
                            secondNodeStyle={isShowTerminalList ? {padding: 0} : {padding: 0, maxWidth: 0, minWidth: 0}}
                            // isShowDefaultLineStyle={false}
                            firstNode={
                                <TerminalBox
                                    xtermRef={terminalRef}
                                    commandExec={commandExec}
                                    onChangeSize={onChangeSize}
                                    defaultTerminalSetting={terminaFont}
                                />
                            }
                            secondNode={
                                <>
                                    {isShowTerminalList && (
                                        <TerminalListBox
                                            initTerminalListData={initTerminalListData}
                                            terminalRunnerId={terminalRunnerId}
                                            onSelectTerminalItem={onSelectTerminalItem}
                                            onDeleteTerminalItem={onDeleteTerminalItem}
                                        />
                                    )}
                                </>
                            }
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
                            <HelpInfoList onJumpToEditor={onJumpToEditor} />
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
            setClipboardText(content)
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
    return <YakitXterm ref={xtermRef} customKeyEventHandler={onCopy} />
}
