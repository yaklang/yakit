import React, {memo, useEffect, useMemo, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {OpenedFileProps, RunnerFileTreeProps} from "./RunnerFileTreeType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePluscircleIcon, OutlineXIcon} from "@/assets/icon/outline"
import {CollapseList} from "../CollapseList/CollapseList"
import {FileNodeProps, FileTreeListProps} from "../FileTree/FileTreeType"
import {FileDefault, FileSuffix, KeyToIcon} from "../FileTree/icon"
import useStore from "../hooks/useStore"
import useDispatcher from "../hooks/useDispatcher"
import {FileTree} from "../FileTree/FileTree"

import classNames from "classnames"
import styles from "./RunnerFileTree.module.scss"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {FileDetailInfo} from "../RunnerTabs/RunnerTabsType"
import {
    addAreaFileInfo,
    getCodeByPath,
    getDefaultActiveFile,
    getOpenFileInfo,
    getYakRunnerHistory,
    judgeAreaExistFilePath,
    removeAreaFileInfo,
    setAreaFileActive,
    setYakRunnerHistory,
    updateAreaFileInfo
} from "../utils"
import moment from "moment"
import {YakRunnerHistoryProps} from "../YakRunnerType"
import emiter from "@/utils/eventBus/eventBus"
import { getMapAllFileValue, getMapFileDetail } from "../FileTreeMap/FileMap"

const {ipcRenderer} = window.require("electron")

export const RunnerFileTree: React.FC<RunnerFileTreeProps> = (props) => {
    const {fileTree, areaInfo, activeFile} = useStore()
    const {handleFileLoadData, setAreaInfo, setActiveFile} = useDispatcher()

    const [historyList, setHistoryList] = useState<YakRunnerHistoryProps[]>([])

    // 将文件详情注入文件树结构中
    const initFileTree = useMemoizedFn((data: FileTreeListProps[])=>{
        return data.map((item)=>{
            const itemDetail = getMapFileDetail(item.path)
            let obj:FileNodeProps = {...itemDetail}
            if(item.children){
                obj.children = initFileTree(item.children)
            }
            return obj
        })
    })

    const [refreshTree,setRefreshTree] = useState<boolean>(false)
    const onRefreshFileTreeFun = useMemoizedFn(()=>{
        console.log("刷新文件树");
        setRefreshTree(!refreshTree)
    })

    useEffect(() => {
        // 刷新文件树
        emiter.on("onRefreshFileTree", onRefreshFileTreeFun)
        return () => {
            emiter.off("onRefreshFileTree", onRefreshFileTreeFun)
        }
    }, [])

    const fileDetailTree = useMemo(()=>{
        return initFileTree(fileTree)
    },[fileTree,refreshTree])

    const getHistoryList = useMemoizedFn(async (data?: string) => {
        try {
            if (data) {
                const historyData: YakRunnerHistoryProps[] = JSON.parse(data)
                setHistoryList(historyData)
            } else {
                const list = await getYakRunnerHistory()
                setHistoryList(list)
            }
        } catch (error) {}
    })

    useEffect(() => {
        getHistoryList()
        // 通知历史记录发生改变
        emiter.on("onRefreshRunnerHistory", getHistoryList)
        return () => {
            emiter.off("onRefreshRunnerHistory", getHistoryList)
        }
    }, [])

    const onLoadData = useMemoizedFn((node: FileNodeProps) => {
        if (handleFileLoadData) return handleFileLoadData(node.path)
        return Promise.reject()
    })

    const menuData: YakitMenuItemType[] = useMemo(() => {
        let newMenu: YakitMenuItemType[] = [
            {
                key: "createFile",
                label: "新建文件"
            },
            {
                key: "createFolder",
                label: "新建文件夹"
            },
            {
                type: "divider"
            },
            {
                key: "openFile",
                label: "打开文件"
            },
            {
                key: "openFolder",
                label: "打开文件夹"
            }
        ]
        if (historyList.length > 0) {
            newMenu.push({
                key: "history",
                label: "最近打开",
                children: [...historyList.map((item) => ({key: item.path, label: item.name}))]
            })
        }
        return newMenu
    }, [historyList])

    // 通过路径打开文件
    const openFileByPath = useMemoizedFn(async (path: string, name: string) => {
        // 校验是否已存在 如若存在则不创建只定位
        const file = await judgeAreaExistFilePath(areaInfo, path)
        if (file) {
            const newAreaInfo = setAreaFileActive(areaInfo, path)
            setAreaInfo && setAreaInfo(newAreaInfo)
            setActiveFile && setActiveFile(file)
        } else {
            const code = await getCodeByPath(path)
            const suffix = name.indexOf(".") > -1 ? name.split(".").pop() : ""
            const scratchFile: FileDetailInfo = {
                name,
                code,
                icon: suffix ? FileSuffix[suffix] || FileDefault : FileDefault,
                isActive: true,
                openTimestamp: moment().unix(),
                // 此处赋值 path 用于拖拽 分割布局等UI标识符操作
                path,
                language: name.split(".").pop() === "yak" ? "yak" : "http"
            }
            // 注入语法检测
            const syntaxActiveFile = {...(await getDefaultActiveFile(scratchFile))}
            const {newAreaInfo, newActiveFile} = addAreaFileInfo(areaInfo, syntaxActiveFile, activeFile)
            setAreaInfo && setAreaInfo(newAreaInfo)
            setActiveFile && setActiveFile(newActiveFile)

            // 打开文件时接入历史记录
            const history: YakRunnerHistoryProps = {
                isFile: true,
                name,
                path
            }
            setYakRunnerHistory(history)
        }
    })

    // 打开文件
    const openFile = useMemoizedFn(async () => {
        try {
            const openFileInfo = await getOpenFileInfo()
            if (openFileInfo) {
                const {path, name} = openFileInfo
                openFileByPath(path, name)
            }
        } catch (error) {}
    })

    // 打开文件夹
    const openFolder = useMemoizedFn(() => {
        ipcRenderer
            .invoke("openDialog", {
                title: "请选择文件夹",
                properties: ["openDirectory"]
            })
            .then((data: any) => {
                if (data.filePaths.length) {
                    let absolutePath: string = data.filePaths[0].replace(/\\/g, "\\")
                    emiter.emit("onOpenFolderList",absolutePath)
                }
            })
    })

    // 打开历史
    const openHistory = useMemoizedFn((key) => {
        const filterArr = historyList.filter((item) => item.path === key)
        if (filterArr.length > 0) {
            const item = filterArr[0]
            // 打开文件
            if (item.isFile) {
                openFileByPath(item.path, item.name)
            }
            // 打开文件夹
            else {
                emiter.emit("onOpenFolderList",item.path)
            }
        }
    })

    const menuSelect = useMemoizedFn((key) => {
        switch (key) {
            case "createFile":
                break
            case "createFolder":
                break
            case "openFile":
                openFile()
                break
            case "openFolder":
                openFolder()
                break
            default:
                openHistory(key)
                break
        }
    })

    // 文件树选中
    const onSelectFileTree = useMemoizedFn((
        selectedKeys: string[],
        e: {selected: boolean; selectedNodes: FileNodeProps[]; node: FileNodeProps}
    )=>{
        console.log("onSelectFileTree",selectedKeys,e);
        if(e.selected){
            const {path, name} = e.node
            openFileByPath(path, name)
        }
    })

    return (
        <div className={styles["runner-file-tree"]}>
            <div className={styles["container"]}>
                <OpenedFile />

                <div className={styles["file-tree"]}>
                    <div className={styles["file-tree-container"]}>
                        <div className={styles["file-tree-header"]}>
                            <div className={styles["title-style"]}>文件列表</div>
                            <YakitDropdownMenu
                                menu={{
                                    data: menuData,
                                    onClick: ({key}) => menuSelect(key)
                                }}
                                dropdown={{
                                    trigger: ["click"],
                                    placement: "bottomLeft"
                                }}
                            >
                                <YakitButton type='text2' icon={<OutlinePluscircleIcon />} />
                            </YakitDropdownMenu>
                        </div>

                        <div className={styles["file-tree-tree"]}>
                            <div className={styles["tree-body"]}>
                                <FileTree data={fileDetailTree} onLoadData={onLoadData} onSelect={onSelectFileTree}/>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export const OpenedFile: React.FC<OpenedFileProps> = memo((props) => {
    const {} = props
    const {areaInfo, activeFile} = useStore()
    const {setAreaInfo, setActiveFile} = useDispatcher()
    const titleRender = () => {
        return <div className={styles["opened-file-header"]}>打开的编辑器</div>
    }

    const removeItem = useMemoizedFn((e, data: FileDetailInfo) => {
        e.stopPropagation()
        // 如若删除项为当前焦点聚集项
        if (activeFile?.path === data.path) {
            setActiveFile && setActiveFile(undefined)
        }
        const newAreaInfo = removeAreaFileInfo(areaInfo, data)
        setAreaInfo && setAreaInfo(newAreaInfo)
    })

    const openItem = useMemoizedFn(async (data: FileDetailInfo) => {
        // 注入语法检测 由于点击项必为激活项默认给true
        const newActiveFile = {...(await getDefaultActiveFile(data)), isActive: true}
        // 更改当前tabs active
        const activeAreaInfo = setAreaFileActive(areaInfo, data.path)
        // 将新的语法检测注入areaInfo
        const newAreaInfo = updateAreaFileInfo(activeAreaInfo, newActiveFile, newActiveFile.path)
        setAreaInfo && setAreaInfo(newAreaInfo)
        setActiveFile && setActiveFile(newActiveFile)
    })

    const renderItem = (info: FileDetailInfo[]) => {
        return (
            <div className={styles["opened-file-body"]}>
                {info.map((item) => {
                    return (
                        <div key={item.path} className={styles["file-item"]} onClick={() => openItem(item)}>
                            <div className={styles["del-btn"]} onClick={(e) => removeItem(e, item)}>
                                <OutlineXIcon />
                            </div>
                            <img src={KeyToIcon[item.icon].iconPath} />
                            <div
                                className={classNames(styles["file-name"], "yakit-content-single-ellipsis")}
                                title={item.name}
                            >
                                {item.name}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    const getOpenFileList = useMemo(() => {
        let list: FileDetailInfo[] = []
        areaInfo.forEach((item) => {
            item.elements.forEach((itemIn) => {
                list = [...list, ...itemIn.files]
            })
        })
        list.sort((a, b) => {
            const nameA = a.openTimestamp
            const nameB = b.openTimestamp

            if (nameA < nameB) {
                return -1 // 如果 a 在 b 前面，返回负数
            }
            if (nameA > nameB) {
                return 1 // 如果 a 在 b 后面，返回正数
            }
            return 0 // 如果名称相同，返回 0
        })
        return list
    }, [areaInfo])

    return (
        <>
            {getOpenFileList.length !== 0 ? (
                <div className={styles["open-file"]}>
                    <CollapseList
                        onlyKey='key'
                        list={[[...getOpenFileList]]}
                        titleRender={titleRender}
                        renderItem={renderItem}
                    />
                </div>
            ) : (
                <></>
            )}
        </>
    )
})
