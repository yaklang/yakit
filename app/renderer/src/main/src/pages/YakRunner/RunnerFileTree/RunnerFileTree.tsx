import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn, useSize, useUpdateEffect} from "ahooks"
import {OpenedFileProps, RunnerFileTreeProps} from "./RunnerFileTreeType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinCompileIcon, OutlinePluscircleIcon, OutlineXIcon} from "@/assets/icon/outline"
import {CollapseList} from "../CollapseList/CollapseList"
import {FileNodeMapProps, FileNodeProps, FileTreeListProps} from "../FileTree/FileTreeType"
import {FileDefault, FileSuffix, KeyToIcon} from "../FileTree/icon"
import useStore from "../hooks/useStore"
import useDispatcher from "../hooks/useDispatcher"
import {FileTree} from "../FileTree/FileTree"

import classNames from "classnames"
import styles from "./RunnerFileTree.module.scss"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitMenuItemProps, YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {FileDetailInfo} from "../RunnerTabs/RunnerTabsType"
import {
    getDefaultActiveFile,
    getNameByPath,
    getOpenFileInfo,
    getPathJoin,
    getPathParent,
    getYakRunnerHistory,
    grpcFetchAuditTree,
    grpcFetchDeleteFile,
    judgeAreaExistFilePath,
    judgeAreaExistFilesPath,
    loadFolderDetail,
    removeAreaFileInfo,
    removeAreaFilesInfo,
    setAreaFileActive,
    setYakRunnerHistory,
    updateAreaFileInfo,
    updateAreaFileInfoToDelete
} from "../utils"
import {OpenFileByPathProps, YakRunnerHistoryProps} from "../YakRunnerType"
import emiter from "@/utils/eventBus/eventBus"
import {
    clearMapFileDetail,
    getMapAllFileKey,
    getMapFileDetail,
    removeMapFileDetail,
    setMapFileDetail
} from "../FileTreeMap/FileMap"
import {
    clearMapFolderDetail,
    getMapAllFolderKey,
    getMapFolderDetail,
    hasMapFolderDetail,
    removeMapFolderDetail,
    setMapFolderDetail
} from "../FileTreeMap/ChildMap"
import {v4 as uuidv4} from "uuid"
import cloneDeep from "lodash/cloneDeep"
import {failed, success} from "@/utils/notification"
import {FileMonitorItemProps, FileMonitorProps} from "@/utils/duplex/duplex"
import {Tooltip} from "antd"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {AuditHistoryTable} from "../AuditCode/AuditCode"

const {ipcRenderer} = window.require("electron")

export const RunnerFileTree: React.FC<RunnerFileTreeProps> = (props) => {
    const {addFileTab} = props
    const {fileTree, areaInfo, activeFile, loadTreeType} = useStore()
    const {handleFileLoadData, setAreaInfo, setActiveFile, setFileTree, setLoadTreeType} = useDispatcher()

    const [historyList, setHistoryList] = useState<YakRunnerHistoryProps[]>([])
    const [aduitList, setAduitList] = useState<{path: string; name: string}[]>([])
    // 选中的文件或文件夹
    const [foucsedKey, setFoucsedKey] = React.useState<string>("")
    // 将文件详情注入文件树结构中 并 根据foldersMap修正其子项
    const initFileTree = useMemoizedFn((data: FileTreeListProps[], depth: number) => {
        return data.map((item) => {
            const itemDetail = getMapFileDetail(item.path)
            let obj: FileNodeProps = {...itemDetail, depth}

            const childArr = getMapFolderDetail(item.path)
            if (itemDetail.isFolder) {
                const newChild = childArr.map((item) => ({path: item}))
                obj.children = initFileTree(newChild, depth + 1)
            }
            return obj
        })
    })

    const [refreshTree, setRefreshTree] = useState<boolean>(false)
    const onRefreshFileTreeFun = useMemoizedFn(() => {
        setRefreshTree(!refreshTree)
    })

    const [expandedKeys, setExpandedKeys] = React.useState<string[]>([])

    // 默认展开项
    const onDefaultExpanded = useMemoizedFn(async (data: string) => {
        try {
            const defaultExpanded: string[] = JSON.parse(data)
            setExpandedKeys(defaultExpanded)
        } catch (error) {}
    })

    useEffect(() => {
        emiter.on("onDefaultExpanded", onDefaultExpanded)
        return () => {
            emiter.off("onDefaultExpanded", onDefaultExpanded)
        }
    }, [])

    useEffect(() => {
        // 刷新文件树
        emiter.on("onRefreshFileTree", onRefreshFileTreeFun)
        return () => {
            emiter.off("onRefreshFileTree", onRefreshFileTreeFun)
        }
    }, [])

    const fileDetailTree = useMemo(() => {
        const initTree = initFileTree(fileTree, 1)
        if (initTree.length > 0) {
            initTree.push({
                parent: null,
                name: "已经到底啦~",
                path: "",
                isFolder: false,
                icon: "",
                depth: 1,
                isBottom: true
            })
        }

        return initTree
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

    const getAduitList = useMemoizedFn(async () => {
        try {
            const {res} = await grpcFetchAuditTree("/")
            console.log("getAduitList", "/", res)
            const arr = res.Resources.map(({Path, ResourceName}) => ({
                path: Path,
                name: ResourceName
            }))
            setAduitList(arr)
        } catch (error) {}
    })

    useEffect(() => {
        getHistoryList()
        getAduitList()
        // 通知历史记录发生改变
        emiter.on("onRefreshRunnerHistory", getHistoryList)
        // 通知最近编译发生改变
        emiter.on("onRefreshAduitHistory", getAduitList)
        return () => {
            emiter.off("onRefreshRunnerHistory", getHistoryList)
            emiter.off("onRefreshAduitHistory", getAduitList)
        }
    }, [])

    const onLoadData = useMemoizedFn((node: FileNodeProps) => {
        // 删除最外层文件夹时无需加载
        if (node.parent === null) return Promise.reject()
        if (handleFileLoadData) return handleFileLoadData(node.path)
        return Promise.reject()
    })

    const menuData: YakitMenuItemType[] = useMemo(() => {
        let newMenu: YakitMenuItemType[] = [
            {
                key: "closeFolder",
                label: "关闭文件夹",
                disabled: fileTree.length === 0
            },
            {
                key: "createFile",
                label: loadTreeType === "audit" ? "新建临时文件" : "新建文件"
            },
            {
                key: "createFolder",
                label: "新建文件夹",
                // 未打开文件夹或为审计树时 无法新建文件夹
                disabled: fileTree.length === 0 || loadTreeType === "audit"
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
            },
            {
                key: "auditFolder",
                label: "编译项目"
            }
        ]
        if (historyList.length > 0) {
            newMenu.push({
                key: "history",
                label: "最近打开",
                children: [
                    ...historyList.map((item) => {
                        if (item.loadTreeType === "audit") {
                            return {key: item.path, label: `${item.name}（编译）`}
                        } else {
                            return {key: item.path, label: item.name}
                        }
                    })
                ]
            })
        }
        if (aduitList.length > 0) {
            let children: any = [
                ...aduitList.slice(0, 10).map((item) => ({key: `aduit-${item.name}`, label: item.name})),
                {
                    type: "divider"
                },
                {
                    key: "aduitAllList",
                    label: "查看全部",
                    type: "text"
                }
            ]

            newMenu.push({
                key: "auditHistory",
                label: "最近编译",
                children
            })
        }

        return newMenu
    }, [historyList, aduitList, fileTree])

    // 新建文件
    const onNewFile = useMemoizedFn(async (path: string) => {
        const currentPath = await getPathJoin(path, `${uuidv4()}-create`)
        if (currentPath.length === 0) return
        const newFileNodeMap: FileNodeMapProps = {
            parent: path,
            name: "",
            path: currentPath,
            isFolder: false,
            icon: "_f_yak",
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
        // setFoucsedKey(currentPath)
        // emiter.emit("onExpandedFileTree", path)
        emiter.emit("onScrollToFileTree", currentPath)
        emiter.emit("onRefreshFileTree")
    })

    // 新建文件夹
    const onNewFolder = useMemoizedFn(async (path: string) => {
        const currentPath = await getPathJoin(path, `${uuidv4()}-create`)
        if (currentPath.length === 0) return
        const newFileNodeMap: FileNodeMapProps = {
            parent: path,
            name: "",
            path: currentPath,
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

        // setFoucsedKey(currentPath)
        // emiter.emit("onExpandedFileTree", path)
        emiter.emit("onScrollToFileTree", currentPath)
        emiter.emit("onRefreshFileTree")
    })

    // 删除文件/文件夹
    const onDeleteFun = useMemoizedFn(async (path) => {
        const info = getMapFileDetail(path)
        try {
            await grpcFetchDeleteFile(info.path)
            // 文件夹删除
            if (info.isFolder) {
                const deleteFileArr = getMapAllFileKey().filter((item) => item.startsWith(info.path))
                // 删除最外层文件夹
                if (info.parent === null) {
                    clearMapFileDetail()
                    clearMapFolderDetail()
                    setFileTree && setFileTree([])
                } else {
                    deleteFileArr.forEach((item) => {
                        removeMapFileDetail(item)
                    })
                    // 移除文件夹下的所有文件夹结构及其父结构下的此项
                    const folderDetail = getMapFolderDetail(info.parent)
                    if (folderDetail.length > 0) {
                        const newFolderDetail = folderDetail.filter((item) => item !== info.path)
                        setMapFolderDetail(info.parent, newFolderDetail)
                    }

                    const deleteFolderArr = getMapAllFolderKey().filter((item) => item.startsWith(info.path))
                    deleteFolderArr.forEach((item) => {
                        removeMapFolderDetail(item)
                    })
                }

                // 此处还需移除已经删除文件的布局信息
                const removePath = (await judgeAreaExistFilesPath(areaInfo, deleteFileArr)).map((item) => item.path)
                if (removePath.includes(activeFile?.path || "")) {
                    setActiveFile && setActiveFile(undefined)
                }
                const newAreaInfo = removeAreaFilesInfo(areaInfo, removePath)
                setAreaInfo && setAreaInfo(newAreaInfo)
            }
            // 文件删除
            else {
                if (info.parent) {
                    const newFolderDetail = getMapFolderDetail(info.parent).filter((item) => item !== info.path)
                    // 如果删除文件后变为空文件夹 则需更改其父文件夹isLeaf为true(不可展开)
                    if (newFolderDetail.length === 0) {
                        setMapFileDetail(info.parent, {...getMapFileDetail(info.parent), isLeaf: true})
                    }
                    setMapFolderDetail(info.parent, newFolderDetail)
                }
                removeMapFileDetail(info.path)
                const file = await judgeAreaExistFilePath(areaInfo, info.path)
                if (file) {
                    const newAreaInfo = removeAreaFileInfo(areaInfo, file)
                    setAreaInfo && setAreaInfo(newAreaInfo)
                }
            }
            emiter.emit("onResetFileTree", info.path)
            emiter.emit("onRefreshFileTree")
            success(`${info.name} 删除成功`)
        } catch (error) {
            failed(`${info.name} 删除失败${error}`)
        }
    })

    const eventOperateFun = useMemoizedFn((eventArr: FileMonitorItemProps[]) => {
        eventArr.forEach(async (event) => {
            const {Op, Path, IsDir} = event
            // 文件夹处理
            if (IsDir) {
                switch (Op) {
                    case "delete":
                        const info = getMapFileDetail(Path)
                        const deleteFileArr = getMapAllFileKey().filter((item) => item.startsWith(info.path))
                        // 删除最外层文件夹
                        if (info.parent === null) {
                            clearMapFileDetail()
                            clearMapFolderDetail()
                            setFileTree && setFileTree([])
                        } else {
                            deleteFileArr.forEach((item) => {
                                removeMapFileDetail(item)
                            })
                            // 移除文件夹下的所有文件夹结构及其父结构下的此项
                            const folderDetail = getMapFolderDetail(info.parent)
                            if (folderDetail.length > 0) {
                                const newFolderDetail = folderDetail.filter((item) => item !== info.path)
                                setMapFolderDetail(info.parent, newFolderDetail)
                            }

                            const deleteFolderArr = getMapAllFolderKey().filter((item) => item.startsWith(info.path))
                            deleteFolderArr.forEach((item) => {
                                removeMapFolderDetail(item)
                            })
                        }
                        const newAreaInfo = updateAreaFileInfoToDelete(areaInfo, info.path)
                        setAreaInfo && setAreaInfo(newAreaInfo)
                        emiter.emit("onResetFileTree", info.path)
                        emiter.emit("onRefreshFileTree")
                        break
                    case "create":
                        const parentPath = await getPathParent(Path)
                        const folderName = await getNameByPath(Path)
                        const newFileNodeMap: FileNodeMapProps = {
                            parent: parentPath,
                            name: folderName,
                            path: Path,
                            isFolder: true,
                            icon: "_fd_default",
                            isLeaf: true
                        }
                        setMapFileDetail(newFileNodeMap.path, newFileNodeMap)
                        const folderDetail = getMapFolderDetail(parentPath)
                        // 如若为空文件夹 则可点击打开
                        if (folderDetail.length === 0) {
                            const fileDetail = getMapFileDetail(parentPath)
                            setMapFileDetail(parentPath, {...fileDetail, isLeaf: false})
                        }
                        setMapFolderDetail(parentPath, [newFileNodeMap.path, ...folderDetail])
                        emiter.emit("onRefreshFileTree")
                        break
                    default:
                        break
                }
            }
            // 文件处理
            else {
                switch (Op) {
                    case "delete":
                        const info = getMapFileDetail(Path)
                        if (info.parent) {
                            const newFolderDetail = getMapFolderDetail(info.parent).filter((item) => item !== info.path)
                            // 如果删除文件后变为空文件夹 则需更改其父文件夹isLeaf为true(不可展开)
                            if (newFolderDetail.length === 0) {
                                setMapFileDetail(info.parent, {...getMapFileDetail(info.parent), isLeaf: true})
                            }
                            setMapFolderDetail(info.parent, newFolderDetail)
                        }
                        removeMapFileDetail(info.path)
                        const newAreaInfo = updateAreaFileInfoToDelete(areaInfo, info.path)
                        setAreaInfo && setAreaInfo(newAreaInfo)
                        emiter.emit("onResetFileTree", info.path)
                        emiter.emit("onRefreshFileTree")
                        break
                    case "create":
                        const parentPath = await getPathParent(Path)
                        const fileName = await getNameByPath(Path)
                        const suffix = fileName.indexOf(".") > -1 ? fileName.split(".").pop() : ""
                        const newFileNodeMap: FileNodeMapProps = {
                            parent: parentPath,
                            name: fileName,
                            path: Path,
                            isFolder: false,
                            icon: suffix ? FileSuffix[suffix] || FileDefault : FileDefault,
                            isLeaf: true
                        }
                        setMapFileDetail(newFileNodeMap.path, newFileNodeMap)
                        const folderDetail = getMapFolderDetail(parentPath)
                        const newFolderDetail: string[] = cloneDeep(folderDetail)
                        // 如若为空文件夹 则可点击打开
                        if (newFolderDetail.length === 0) {
                            const fileDetail = getMapFileDetail(parentPath)
                            setMapFileDetail(parentPath, {...fileDetail, isLeaf: false})
                        }
                        // 新增文件时其位置应处于文件夹后
                        let insert: number = 0
                        newFolderDetail.some((item, index) => {
                            const {isFolder} = getMapFileDetail(item)
                            if (isFolder) insert += 1
                            return !isFolder
                        })
                        newFolderDetail.splice(insert, 0, newFileNodeMap.path)
                        setMapFolderDetail(parentPath, newFolderDetail)
                        emiter.emit("onRefreshFileTree")
                        break
                    default:
                        break
                }
            }
        })
    })

    // 文件树结构监控
    const onRefreshYakRunnerFileTreeFun = useMemoizedFn((data) => {
        try {
            const event: FileMonitorProps = JSON.parse(data)
            if (event.ChangeEvents) {
                eventOperateFun(event.ChangeEvents)
            }
            if (event.CreateEvents) {
                eventOperateFun(event.CreateEvents)
            }
            if (event.DeleteEvents.length > 0) {
                eventOperateFun(event.DeleteEvents)
            }
        } catch (error) {}
    })

    useEffect(() => {
        // 监听新建文件
        emiter.on("onNewFileInFileTree", onNewFile)
        // 监听新建文件夹
        emiter.on("onNewFolderInFileTree", onNewFolder)
        // 监听删除
        emiter.on("onDeleteInFileTree", onDeleteFun)
        // 文件树结构监控（监听外部变化）
        emiter.on("onRefreshYakRunnerFileTree", onRefreshYakRunnerFileTreeFun)
        return () => {
            emiter.off("onNewFileInFileTree", onNewFile)
            emiter.off("onNewFolderInFileTree", onNewFolder)
            emiter.off("onDeleteInFileTree", onDeleteFun)
            emiter.off("onRefreshYakRunnerFileTree", onRefreshYakRunnerFileTreeFun)
        }
    }, [])

    const closeFolder = useMemoizedFn(() => {
        setLoadTreeType && setLoadTreeType("file")
        setFileTree && setFileTree([])
        emiter.emit("onResetAuditStatus")
    })

    const createFile = useMemoizedFn(async () => {
        // 未打开文件夹时 创建临时文件
        if (fileTree.length === 0 || loadTreeType === "audit") {
            addFileTab()
        } else {
            // 如若未选择则默认最顶层
            const newFoucsedKey = foucsedKey || fileTree[0].path
            const fileDetail = getMapFileDetail(newFoucsedKey)
            // 文件夹直接创建
            if (fileDetail.isFolder) {
                // 判断文件夹内文件是否加载 如若未加载则需要先行加载
                if (!hasMapFolderDetail(fileDetail.path)) {
                    await loadFolderDetail(fileDetail.path)
                }
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

    const createFolder = useMemoizedFn(async () => {
        const newFoucsedKey = foucsedKey || fileTree[0].path
        const fileDetail = getMapFileDetail(newFoucsedKey)
        // 文件夹直接创建
        if (fileDetail.isFolder) {
            // 判断文件夹内文件是否加载 如若未加载则需要先行加载
            if (!hasMapFolderDetail(fileDetail.path)) {
                await loadFolderDetail(fileDetail.path, loadTreeType)
            }
            onNewFolder(fileDetail.path)
        }
        // 文件找到其上层路径创建
        else {
            if (fileDetail.parent) {
                onNewFolder(fileDetail.parent)
            }
        }
    })

    // 打开文件
    const openFile = useMemoizedFn(async () => {
        try {
            const openFileInfo = await getOpenFileInfo()
            if (openFileInfo) {
                const {path, name} = openFileInfo
                const OpenFileByPathParams: OpenFileByPathProps = {
                    params: {
                        path,
                        name
                    },
                    isHistory: true,
                    isOutside: true
                }
                emiter.emit("onOpenFileByPath", JSON.stringify(OpenFileByPathParams))
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
                    emiter.emit("onOpenFileTree", absolutePath)
                }
            })
    })

    // 编译项目
    const auditFolder = useMemoizedFn(() => {
        emiter.emit("onOpenAuditModal")
    })

    const [visible, setVisible] = useState<boolean>(false)
    // 查看全部（编译项目）
    const aduitAllList = useMemoizedFn(() => {
        setVisible(true)
    })

    // 打开历史
    const openHistory = useMemoizedFn((key: string) => {
        const filterArr = historyList.filter((item) => item.path === key)
        console.log("打开历史---", filterArr)

        if (filterArr.length > 0) {
            const item = filterArr[0]
            // 打开文件
            if (item.isFile) {
                const OpenFileByPathParams: OpenFileByPathProps = {
                    params: {
                        path: item.path,
                        name: item.name
                    },
                    isHistory: true,
                    isOutside: true
                }
                emiter.emit("onOpenFileByPath", JSON.stringify(OpenFileByPathParams))
            }
            // 打开文件夹
            else {
                if (item.loadTreeType === "audit") {
                    emiter.emit("onOpenAuditTree", item.name)
                } else {
                    emiter.emit("onOpenFileTree", item.path)
                }
            }
        }
    })

    const openAuditHistory = useMemoizedFn((path: string) => {
        const index = path.indexOf("-")
        // 使用 substring 方法获取第一个 "-" 后的所有内容
        const rootPath = path.substring(index + 1)
        emiter.emit("onOpenAuditTree", rootPath)
    })

    const menuSelect = useMemoizedFn((key, keyPath: string[]) => {
        switch (key) {
            case "closeFolder":
                closeFolder()
                break
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
            case "auditFolder":
                auditFolder()
                break
            case "aduitAllList":
                aduitAllList()
                break
            default:
                if (keyPath.includes("auditHistory")) {
                    openAuditHistory(key)
                }
                if (keyPath.includes("history")) {
                    openHistory(key)
                }
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
                    const OpenFileByPathParams: OpenFileByPathProps = {
                        params: {
                            path,
                            name,
                            parent
                        }
                    }
                    emiter.emit("onOpenFileByPath", JSON.stringify(OpenFileByPathParams))
                }
            }
        }
    )

    const ref = useRef(null)
    const getContainerSize = useSize(ref)
    // 抽屉展示高度
    const showHeight = useMemo(() => {
        return getContainerSize?.height || 400
    }, [getContainerSize])

    // 关闭抽屉
    const onCloseDrawer = useMemoizedFn(() => {
        setVisible(false)
    })
    return (
        <div className={styles["runner-file-tree"]} ref={ref}>
            <div className={styles["container"]}>
                <OpenedFile />

                <div className={styles["file-tree"]}>
                    <div className={styles["file-tree-container"]}>
                        <div className={styles["file-tree-header"]}>
                            <div className={styles["title-style"]}>文件列表</div>
                            <div className={styles["extra"]}>
                                <Tooltip title={"编译当前项目"}>
                                    <YakitButton
                                        disabled={loadTreeType === "audit" || fileTree.length === 0}
                                        type='text2'
                                        icon={<OutlinCompileIcon />}
                                        onClick={() => emiter.emit("onOpenAuditModal", "init")}
                                    />
                                </Tooltip>
                                <YakitDropdownMenu
                                    menu={{
                                        data: menuData,
                                        onClick: ({key, keyPath}) => menuSelect(key, keyPath)
                                    }}
                                    dropdown={{
                                        trigger: ["click"],
                                        placement: "bottomLeft"
                                    }}
                                >
                                    <YakitButton type='text2' icon={<OutlinePluscircleIcon />} />
                                </YakitDropdownMenu>
                            </div>
                        </div>

                        <div className={styles["file-tree-tree"]}>
                            <div className={styles["tree-body"]}>
                                <FileTree
                                    folderPath={fileTree.length > 0 ? fileTree[0].path : ""}
                                    data={fileDetailTree}
                                    onLoadData={onLoadData}
                                    onSelect={onSelectFileTree}
                                    foucsedKey={foucsedKey}
                                    setFoucsedKey={setFoucsedKey}
                                    expandedKeys={expandedKeys}
                                    setExpandedKeys={setExpandedKeys}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <YakitDrawer
                getContainer={ref.current || undefined}
                placement='bottom'
                mask={false}
                closable={false}
                keyboard={false}
                height={showHeight + 26}
                visible={visible}
                bodyStyle={{padding: 0}}
                className={classNames(styles["audit-history-drawer"])}
                onClose={onCloseDrawer}
            >
                <AuditHistoryTable visible={visible} onClose={onCloseDrawer} />
            </YakitDrawer>
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
                        <div
                            key={item.path}
                            className={classNames(styles["file-item"], {
                                [styles["file-item-no-active"]]: activeFile?.path !== item.path,
                                [styles["file-item-active"]]: activeFile?.path === item.path
                            })}
                            onClick={() => openItem(item)}
                        >
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
                        collapseProps={{
                            defaultActiveKey: ["collapse-list-0"]
                        }}
                    />
                </div>
            ) : (
                <></>
            )}
        </>
    )
})
