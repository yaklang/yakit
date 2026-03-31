import React, {useEffect, useMemo, useRef, useState} from "react"
import {useGetState, useMap, useMemoizedFn, useUpdateEffect, useVirtualList} from "ahooks"
import YakitXterm from "@/components/yakitUI/YakitXterm/YakitXterm"
import {OutlineTerminalIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import classNames from "classnames"
import styles from "./TerminalBox.module.scss"
import {v4 as uuidv4} from "uuid"
import {failed, warn} from "@/utils/notification"
import {writeExecResultXTerm, writeXTerm, xtermClear} from "@/utils/xtermUtils"
import {Uint8ArrayToString} from "@/utils/str"
import {ExecResult} from "@/pages/invoker/schema"
import {TerminalDetailsProps} from "./TerminalMap"
import i18n from "@/i18n/i18n"
const {ipcRenderer} = window.require("electron")

export const defaultTerminaFont = "Consolas, 'Courier New', monospace"

export const defaultTerminalFont = {
    fontFamily: "Consolas, 'Courier New', monospace",
    fontSize: 14
}

export interface DefaultTerminaSettingProps {
    fontFamily: string
    fontSize: number
}

export interface TerminalBoxProps {
    xtermRef: React.MutableRefObject<any>
    commandExec?: (v: string) => void
    onChangeSize?: (v: {row: number; col: number}) => void
    defaultTerminalSetting?: DefaultTerminaSettingProps
}
export const TerminalBox: React.FC<TerminalBoxProps> = (props) => {
    const {xtermRef, commandExec, onChangeSize, defaultTerminalSetting = defaultTerminalFont} = props

    return (
        <YakitXterm
            ref={xtermRef}
            options={{
                ...defaultTerminalSetting
            }}
            onData={(data) => {
                commandExec && commandExec(data)
            }}
            customKeyEventHandler={() => true}
            onResize={(val) => {
                const {rows, cols} = val
                const size = {
                    row: rows,
                    col: cols
                }
                onChangeSize && onChangeSize(size)
            }}
        />
    )
}

interface TerminalListBoxProps {
    initTerminalListData: TerminalDetailsProps[]
    terminalRunnerId: string
    onSelectTerminalItem: (v: string) => void
    onDeleteTerminalItem: (v: string) => void
}

/* 终端列表 */
export const TerminalListBox: React.FC<TerminalListBoxProps> = (props) => {
    const {initTerminalListData, terminalRunnerId, onSelectTerminalItem, onDeleteTerminalItem} = props
    const containerRef = useRef(null)
    const wrapperRef = useRef(null)

    const [list] = useVirtualList(initTerminalListData, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 22,
        overscan: 10
    })

    return (
        <div className={styles["terminal-list-box"]} ref={containerRef}>
            <div ref={wrapperRef}>
                {list.map((ele) => (
                    <div
                        key={ele.index}
                        className={classNames(styles["list-item"], {
                            [styles["list-item-active"]]: ele.data.id === terminalRunnerId,
                            [styles["list-item-no-active"]]: ele.data.id !== terminalRunnerId
                        })}
                        onClick={() => onSelectTerminalItem(ele.data.id)}
                    >
                        <div className={styles["content"]}>
                            <OutlineTerminalIcon />
                            <div className={classNames(styles["title"], "yakit-content-single-ellipsis")}>
                                {ele.data.title}
                            </div>
                        </div>
                        <div className={styles["extra"]}>
                            <OutlineTrashIcon
                                className={styles["delete"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onDeleteTerminalItem(ele.data.id)
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

interface useTerminalHookProps {
    type: "aiAgent" | "yakRunner"
    terminalRef: React.MutableRefObject<any>
    folderPathRef: React.MutableRefObject<string>
    terminalSizeRef: React.MutableRefObject<{row: number; col: number} | undefined>
    terminalFocusRef?: React.MutableRefObject<boolean>
    onExit: () => void
    isShowDetails?: boolean
    showItem?: string
}

/* 终端hook */
export const useTerminalHook = (props: useTerminalHookProps) => {
    const {type, terminalRef, folderPathRef, terminalSizeRef, terminalFocusRef, onExit, isShowDetails, showItem} = props
    // 当前终端打开项
    const [terminalIds, setTerminalIds] = useState<string[]>([])
    // 终端当前展示项
    const [terminalRunnerId, setTerminalRunnerId, getTerminalRunnerId] = useGetState<string>("")
    const [refreshList, setRefreshList, getRefreshList] = useGetState<boolean>(false)
    // 是否需要重新加载终端(终端已被整体关闭)
    const [isReloadTerminal, setReloadTerminal] = useState<boolean>(false)
    const [terminalMap, {get, set, remove, reset}] = useMap<string, string>()

    const getMapAllTerminalKey = useMemoizedFn(() => {
        return Array.from(terminalMap.keys())
    })

    const onBlur = useMemoizedFn(() => {
        if (terminalFocusRef) {
            terminalFocusRef.current = false
        }
    })

    const onFocus = useMemoizedFn(() => {
        if (terminalFocusRef) {
            terminalFocusRef.current = true
        }
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

    // 构造xtrem列表数据
    const initTerminalListData = useMemo(() => {
        let listData: TerminalDetailsProps[] = []
        terminalIds.forEach((item) => {
            try {
                const terminalCache = get(item)
                if (!terminalCache) return
                const listItem: TerminalDetailsProps = JSON.parse(terminalCache)
                listData.push(listItem)
            } catch (error) {}
        })
        return listData
    }, [terminalIds, refreshList])

    useUpdateEffect(() => {
        if (isShowDetails && isReloadTerminal) {
            if (showItem === undefined || (showItem && showItem === "terminal")) {
                setReloadTerminal(false)
                initTerminal()
            }
        }
    }, [isShowDetails, showItem, terminalRunnerId])

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
                const terminalCache = get(id)
                if (!terminalCache) return
                const obj: TerminalDetailsProps = JSON.parse(terminalCache)
                obj.title = title
                set(id, JSON.stringify(obj))
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

    // 整体退出终端
    const onExitTernimal = useMemoizedFn(() => {
        if (terminalRef.current) {
            reset()
            onExit()
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

                const terminalItemCache = get(runnerId)
                if (!terminalItemCache) return
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
            .invoke(`runner-terminal-${type}`, {
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
                set(runnnerId, JSON.stringify(cache))

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
        const terminalCache = get(id)
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
                set(id, JSON.stringify(cache))
                if (id === terminalRunnerId) {
                    writeXTerm(terminalRef, outPut)
                }
            }
        } catch (error) {}
    })

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
                remove(id)
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
        const key = `client-listening-terminal-data-${type}`
        const successKey = `client-listening-terminal-success-${type}`
        const closeKey = `client-listening-terminal-end-${type}`
        const errorKey = `client-listening-terminal-error-${type}`

        const onData = (e, data) => {
            const {id, path, result} = data
            if (result.control) return
            if (result?.raw) {
                onWriteXTerm(id, path, result.raw)
            }
        }

        const onSuccess = () => {}

        const onClose = (e, data) => {
            onListeningTerminalEnd(data)
        }

        const onError = (e, data) => {
            warn(i18n.t("TerminalBox.terminalError", {ns: "yakRunner", path: data.path}))
        }

        ipcRenderer.on(key, onData)
        ipcRenderer.on(successKey, onSuccess)
        ipcRenderer.on(closeKey, onClose)
        ipcRenderer.on(errorKey, onError)

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
        const terminalCache = get(id)
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

    return [
        terminalIds,
        terminalRunnerId,
        initTerminalListData,
        {startTerminal, commandExec, onChangeSize, onSelectTerminalItem, onDeleteTerminalItem, initTerminal}
    ] as const
}
