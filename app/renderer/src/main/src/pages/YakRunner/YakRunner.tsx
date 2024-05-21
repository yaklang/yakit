import React, {useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {LeftSideBar} from "./LeftSideBar/LeftSideBar"
import {BottomSideBar} from "./BottomSideBar/BottomSideBar"
import {RightSideBar} from "./RightSideBar/RightSideBar"
import {FileNodeProps} from "./FileTree/FileTreeType"
import {grpcFetchFileTree, updateFileTree} from "./utils"
import {ViewsInfoProps, YakRunnerProps} from "./YakRunnerType"
import {getRemoteValue} from "@/utils/kv"
import {YakRunnerRemoteGV} from "@/enums/remote/yakRunner"
import {yakitNotify} from "@/utils/notification"
import YakRunnerContext, {YakRunnerContextDispatcher, YakRunnerContextStore} from "./hooks/YakRunnerContext"
import {FolderDefault} from "./FileTree/icon"
import {RunnerTabs} from "./RunnerTabs/RunnerTabs"

import classNames from "classnames"
import styles from "./YakRunner.module.scss"

const {ipcRenderer} = window.require("electron")

export const YakRunner: React.FC<YakRunnerProps> = (props) => {
    const {initCode} = props

    /** ---------- 文件树 Start ---------- */
    const fileCache = useRef<Map<string, FileNodeProps[]>>(new Map())
    const [fileTree, setFileTree] = useState<FileNodeProps[]>([])

    const currentPath = useRef<FileNodeProps | undefined>()

    const handleFetchFileList = useMemoizedFn((path: string, callback?: (value: FileNodeProps[] | null) => any) => {
        grpcFetchFileTree(path)
            .then((res) => {
                if (callback) callback(res)
            })
            .catch((error) => {
                yakitNotify("error", `获取文件列表失败: ${error}`)
                if (callback) callback(null)
            })
    })

    useEffect(() => {
        const node: FileNodeProps = {
            name: "yakit",
            path: "/Users/nonight/work/yakitVersion",
            isFolder: true,
            icon: FolderDefault
        }
        currentPath.current = {...node}
        handleFetchFileList(node.path, (value) => {
            if (value) setFileTree([{...node, children: value}])
        })
        getRemoteValue(YakRunnerRemoteGV.CurrentOpenPath)
            .then((info?: string) => {
                if (info) {
                    try {
                        const file: FileNodeProps = JSON.parse(info)
                        currentPath.current = {...file}
                        handleFetchFileList(file.path, (value) => {
                            if (value) setFileTree([{...file, children: value}])
                        })
                    } catch (error) {}
                }
            })
            .catch(() => {})
    }, [])

    // 加载下一层
    const handleFileLoadData = useMemoizedFn((node: FileNodeProps) => {
        return new Promise((resolve, reject) => {
            handleFetchFileList(node.path, (value) => {
                if (value) {
                    setTimeout(() => {
                        setFileTree((old) => {
                            return updateFileTree(old, node.path, value)
                        })
                        resolve("")
                    }, 300)
                } else {
                    reject()
                }
            })
        })
    })
    /** ---------- 文件树 End ---------- */

    /** ---------- 选中文件 Start ---------- */
    /** 新建文件 */
    const handleNewFile = useMemoizedFn(() => {})
    /** 打开文件 */
    const handleOpenFile = useMemoizedFn(() => {})
    /** 打开文件夹 */
    const handleOpenFolder = useMemoizedFn(() => {})
    /** ---------- 选中文件 End ---------- */

    /** ---------- 焦点源码相关信息 Start ---------- */
    /** ---------- 焦点源码相关信息 End ---------- */

    const store: YakRunnerContextStore = useMemo(() => {
        return {
            fileTree: fileTree
        }
    }, [fileTree])

    const dispatcher: YakRunnerContextDispatcher = useMemo(() => {
        return {
            setFileTree: setFileTree,
            handleFileLoadData: handleFileLoadData
        }
    }, [])

    return (
        <YakRunnerContext.Provider value={{store, dispatcher}}>
            <div className={styles["yak-runner"]}>
                <div className={styles["yak-runner-body"]}>
                    <LeftSideBar />
                    <div className={styles["yak-runner-code"]}>
                        <div className={styles["code-container"]}>
                            <RunnerTabs />
                        </div>
                    </div>
                    <RightSideBar />
                </div>

                <BottomSideBar />
            </div>
        </YakRunnerContext.Provider>
    )
}
