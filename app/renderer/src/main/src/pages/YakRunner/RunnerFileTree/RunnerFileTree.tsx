import React, {memo, useEffect, useMemo, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {OpenedFileProps, RunnerFileTreeProps} from "./RunnerFileTreeType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePluscircleIcon, OutlineXIcon} from "@/assets/icon/outline"
import {CollapseList} from "../CollapseList/CollapseList"
import {FileNodeMapProps, FileNodeProps, FileTreeListProps} from "../FileTree/FileTreeType"
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
import {getMapAllFileValue, getMapFileDetail, setMapFileDetail} from "../FileTreeMap/FileMap"
import {getMapFolderDetail, setMapFolderDetail} from "../FileTreeMap/ChildMap"
import {v4 as uuidv4} from "uuid"
import cloneDeep from "lodash/cloneDeep"

const {ipcRenderer} = window.require("electron")

export const RunnerFileTree: React.FC<RunnerFileTreeProps> = (props) => {
    const {addFileTab} = props
    const {fileTree, areaInfo, activeFile} = useStore()
    const {handleFileLoadData, setAreaInfo, setActiveFile} = useDispatcher()

    const [historyList, setHistoryList] = useState<YakRunnerHistoryProps[]>([])

    // 选中的文件或文件夹
    const [foucsedKey, setFoucsedKey] = React.useState<string>("")
    // 将文件详情注入文件树结构中 并 根据foldersMap修正其子项
    const initFileTree = useMemoizedFn((data: FileTreeListProps[]) => {
        return data.map((item) => {
            const itemDetail = getMapFileDetail(item.path)
            let obj: FileNodeProps = {...itemDetail}

            const childArr = getMapFolderDetail(item.path)
            if (itemDetail.isFolder) {
                const newChild = childArr.map((item) => ({path: item}))
                obj.children = initFileTree(newChild)
            }
            return obj
        })
    })

    const [refreshTree, setRefreshTree] = useState<boolean>(false)
    const onRefreshFileTreeFun = useMemoizedFn(() => {
        console.log("刷新文件树", fileTree)
        setRefreshTree(!refreshTree)
    })

    useEffect(() => {
        // 刷新文件树
        emiter.on("onRefreshFileTree", onRefreshFileTreeFun)
        return () => {
            emiter.off("onRefreshFileTree", onRefreshFileTreeFun)
        }
    }, [])

    const fileDetailTree = useMemo(() => {
        return initFileTree(fileTree)
    }, [fileTree, refreshTree])

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
        console.log("onLoadData", node)

        // 删除最外层文件夹时无需加载
        if (node.parent === null) return Promise.reject()
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
                label: "新建文件夹",
                // 未打开文件夹时 无法新建文件夹
                disabled: fileTree.length === 0
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
    }, [historyList, fileTree])

    // 新建文件
    const onNewFile = useMemoizedFn((path: string) => {
        const newFileNodeMap: FileNodeMapProps = {
            parent: path,
            name: "",
            path: `${path}\\${uuidv4()}-create`,
            isFolder: false,
            icon: "_f_notepad",
            isCreate: true,
            isLeaf: true
        }
        setMapFileDetail(newFileNodeMap.path, newFileNodeMap)
        const folderDetail = getMapFolderDetail(path)
        const newFolderDetail: string[] = cloneDeep(folderDetail)
        // 如若为空文件夹 则可点击打开
        if (newFolderDetail.length === 0) {
            const fileDetail = getMapFileDetail(path)
            setMapFileDetail(path, {...fileDetail, isLeaf: false})
        }
        // 新增文件时其位置应处于文件夹后
        let insert: number = 0
        newFolderDetail.some((item, index) => {
            const {isFolder} = getMapFileDetail(item)
            if (isFolder) insert += 1
            return !isFolder
        })
        newFolderDetail.splice(insert, 0, newFileNodeMap.path)
        setMapFolderDetail(path, newFolderDetail)
        emiter.emit("onExpandedFileTree", path)
        emiter.emit("onRefreshFileTree")
    })

    // 新建文件夹
    const onNewFolder = useMemoizedFn((path: string) => {
        const newFileNodeMap: FileNodeMapProps = {
            parent: path,
            name: "",
            path: `${path}\\${uuidv4()}-create`,
            isFolder: true,
            icon: "_fd_default",
            isCreate: true,
            isLeaf: true
        }
        setMapFileDetail(newFileNodeMap.path, newFileNodeMap)
        const folderDetail = getMapFolderDetail(path)
        // 如若为空文件夹 则可点击打开
        if (folderDetail.length === 0) {
            const fileDetail = getMapFileDetail(path)
            setMapFileDetail(path, {...fileDetail, isLeaf: false})
        }
        setMapFolderDetail(path, [newFileNodeMap.path, ...folderDetail])
        emiter.emit("onExpandedFileTree", path)
        emiter.emit("onRefreshFileTree")
    })

    useEffect(() => {
        // 监听新建文件
        emiter.on("onNewFileInFileTree", onNewFile)
        // 监听新建文件夹
        emiter.on("onNewFolderInFileTree", onNewFolder)
        return () => {
            emiter.off("onNewFileInFileTree", onNewFile)
            emiter.off("onNewFolderInFileTree", onNewFolder)
        }
    }, [])

    const createFile = useMemoizedFn(() => {
        // 未打开文件夹时 创建临时文件
        if (fileTree.length === 0) {
            addFileTab()
        } else {
            // 如若未选择则默认最顶层
            const newFoucsedKey = foucsedKey || fileTree[0].path
            const fileDetail = getMapFileDetail(newFoucsedKey)
            // 文件夹直接创建
            if (fileDetail.isFolder) {
                onNewFile(fileDetail.path)
            }
            // 文件找到其上层路径创建
            else {
                if (fileDetail.parent) {
                    onNewFile(fileDetail.parent)
                }
            }
        }
    })

    const createFolder = useMemoizedFn(() => {
        const newFoucsedKey = foucsedKey || fileTree[0].path
        const fileDetail = getMapFileDetail(newFoucsedKey)
        // 文件夹直接创建
        if (fileDetail.isFolder) {
            onNewFolder(fileDetail.path)
        }
        // 文件找到其上层路径创建
        else {
            if (fileDetail.parent) {
                onNewFolder(fileDetail.parent)
            }
        }
    })

    // 通过路径打开文件
    const openFileByPath = useMemoizedFn(async (path: string, name: string, parent?: string | null) => {
        try {
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
                    parent: parent || null,
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
        } catch (error) {}
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
                    emiter.emit("onOpenFolderList", absolutePath)
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
                emiter.emit("onOpenFolderList", item.path)
            }
        }
    })

    const menuSelect = useMemoizedFn((key) => {
        switch (key) {
            case "createFile":
                createFile()
                break
            case "createFolder":
                createFolder()
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
    const onSelectFileTree = useMemoizedFn(
        (selectedKeys: string[], e: {selected: boolean; selectedNodes: FileNodeProps[]; node: FileNodeProps}) => {
            // console.log("onSelectFileTree", selectedKeys, e)
            if (e.selected) {
                const {path, name, parent, isFolder} = e.node
                if (!isFolder) {
                    openFileByPath(path, name, parent)
                }
            }
        }
    )

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
                                <FileTree
                                    data={fileDetailTree}
                                    onLoadData={onLoadData}
                                    onSelect={onSelectFileTree}
                                    foucsedKey={foucsedKey}
                                    setFoucsedKey={setFoucsedKey}
                                />
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
