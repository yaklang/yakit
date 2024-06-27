import React, {useEffect, useMemo, useRef, useState} from "react"
import {useInViewport, useMemoizedFn, useSize} from "ahooks"
import {FileTreeNodeProps, FileTreeProps, FileNodeProps, FileNodeMapProps} from "./FileTreeType"
import {System, SystemInfo, handleFetchSystem} from "@/constants/hardware"
import {Tree} from "antd"
import {OutlineChevronrightIcon} from "@/assets/icon/outline"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {YakitMenuItemProps, YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {FolderDefault, FolderDefaultExpanded, KeyToIcon} from "./icon"
import {LoadingOutlined} from "@ant-design/icons"

import classNames from "classnames"
import styles from "./FileTree.module.scss"
import {openABSFileLocated} from "@/utils/openWebsite"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {
    clearMapFileDetail,
    getMapAllFileKey,
    getMapAllFileValue,
    getMapFileDetail,
    removeMapFileDetail,
    setMapFileDetail
} from "../FileTreeMap/FileMap"
import emiter from "@/utils/eventBus/eventBus"
import {
    getCodeByPath,
    grpcFetchCreateFile,
    grpcFetchCreateFolder,
    grpcFetchDeleteFile,
    grpcFetchRenameFileTree,
    isResetActiveFile,
    judgeAreaExistFilePath,
    judgeAreaExistFilesPath,
    removeAreaFileInfo,
    removeAreaFilesInfo,
    updateActiveFile,
    updateAreaFileInfo,
    updateAreaFilesPathInfo
} from "../utils"
import useStore from "../hooks/useStore"
import useDispatcher from "../hooks/useDispatcher"
import {
    clearMapFolderDetail,
    getMapAllFolderKey,
    getMapFolderDetail,
    removeMapFolderDetail,
    setMapFolderDetail
} from "../FileTreeMap/ChildMap"
import {failed, success} from "@/utils/notification"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import cloneDeep from "lodash/cloneDeep"

const {ipcRenderer} = window.require("electron")

const FolderMenu: YakitMenuItemProps[] = [
    {label: "新建文件", key: "newFile"},
    {label: "新建文件夹", key: "newFolder"},
    {label: "在文件夹中显示", key: "openFileSystem"},
    {label: "在终端打开", key: "openTernimal"}
]

export const FileTree: React.FC<FileTreeProps> = (props) => {
    const {data, onLoadData, onSelect, onExpand, foucsedKey, setFoucsedKey} = props

    const systemRef = useRef<System | undefined>(SystemInfo.system)
    useEffect(() => {
        if (!systemRef.current) {
            handleFetchSystem(() => (systemRef.current = SystemInfo.system))
        }
    }, [])
    const treeRef = useRef<any>(null)
    const wrapper = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(wrapper)
    const size = useSize(wrapper)
    const getInViewport = useMemoizedFn(() => inViewport)

    const [isDownCtrlCmd, setIsDownCtrlCmd] = useState<boolean>(false)

    // 复制 粘贴
    const [copyPath, setCopyPath] = useState<string>("")

    useEffect(() => {
        // 滚动文件树
        emiter.on("onScrollToFileTree", onScrollToFileTreeFun)
        return () => {
            emiter.off("onScrollToFileTree", onScrollToFileTreeFun)
        }
    }, [])

    useEffect(() => {
        let system = SystemInfo.system
        if (!system) {
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (!getInViewport()) {
                setIsDownCtrlCmd(false)
                return
            }
            // console.log("down", e, SystemInfo)
            setIsDownCtrlCmd(true)
        }
        const handleKeyUp = (e: KeyboardEvent) => {
            // console.log("up", e, SystemInfo)
            if (!getInViewport()) {
                setIsDownCtrlCmd(false)
                return
            }
            setIsDownCtrlCmd(false)
        }

        document.addEventListener("keydown", handleKeyDown)
        document.addEventListener("keyup", handleKeyUp)
        return () => {
            document.removeEventListener("keydown", handleKeyDown)
            document.removeEventListener("keyup", handleKeyUp)
        }
    }, [])

    const [selectedNodes, setSelectedNodes] = React.useState<FileNodeProps[]>([])

    const selectedKeys = useMemo(() => {
        return selectedNodes.map((node) => node.path)
    }, [selectedNodes])
    const [expandedKeys, setExpandedKeys] = React.useState<string[]>([])

    const scrollExpandedKeys = useRef<string[]>([])
    const scrollExpandedKeysFun = useMemoizedFn((path)=>{
        const fileDetail = getMapFileDetail(path)
        if(fileDetail.parent!==null){
            scrollExpandedKeys.current = [...scrollExpandedKeys.current,fileDetail.parent]
            scrollExpandedKeysFun(fileDetail.parent)
        }
    })

    const onScrollToFileTreeFun = useMemoizedFn((path)=>{
        scrollExpandedKeys.current = []
        // 获取 Tree 组件的实例
        const treeInstance = treeRef.current;
        // 如果 Tree 实例存在且有 scrollTo 方法
        if (treeInstance && treeInstance.scrollTo) {
            // 打开扩展项
            scrollExpandedKeysFun(path)
            setExpandedKeys(filter([...expandedKeys,...scrollExpandedKeys.current]))
            setFoucsedKey(path)
            // 调用 scrollTo 方法滚动到指定节点
            setTimeout(()=>{
                treeInstance.scrollTo({ key: path, align: 'middle' });
            },200)
            
        }
    })

    const onResetFileTreeFun = useMemoizedFn((path?: string) => {
        if (path) {
            if (foucsedKey === path) {
                setFoucsedKey("")
            }
            if (copyPath.length !== 0 && copyPath.startsWith(path)) {
                setCopyPath("")
            }
            const newSelectedNodes = selectedNodes.filter((item) => !item.path.startsWith(path))
            const newExpandedKeys = expandedKeys.filter((item) => !item.startsWith(path))
            setSelectedNodes(newSelectedNodes)
            setExpandedKeys(newExpandedKeys)
        } else {
            // 全部清空
            setCopyPath("")
            setFoucsedKey("")
            setSelectedNodes([])
            setExpandedKeys([])
        }
    })

    useEffect(() => {
        // 重置文件树
        emiter.on("onResetFileTree", onResetFileTreeFun)
        return () => {
            emiter.off("onResetFileTree", onResetFileTreeFun)
        }
    }, [])

    // 数组去重
    const filter = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

    const onExpandedFileTreeFun = useMemoizedFn((path) => {
        setExpandedKeys(filter([...expandedKeys, path]))
    })

    useEffect(() => {
        // 展开文件树
        emiter.on("onExpandedFileTree", onExpandedFileTreeFun)
        return () => {
            emiter.off("onExpandedFileTree", onExpandedFileTreeFun)
        }
    }, [])

    const handleSelect = useMemoizedFn((selected: boolean, node: FileNodeProps) => {
        let arr = [...selectedNodes]
        let isSelect = selected
        if (isDownCtrlCmd) {
            if (selected) {
                arr = arr.filter((item) => item.path !== node.path)
            } else {
                arr = [...arr, node]
            }
            isSelect = !isSelect
        } else {
            arr = [node]
            isSelect = true
        }
        setFoucsedKey(node.path)
        setSelectedNodes([...arr])
        if (onSelect) {
            onSelect(
                arr.map((item) => item.path),
                {selected: isSelect, selectedNodes: [...arr], node}
            )
        }
    })

    const handleExpand = useMemoizedFn((expanded: boolean, node: FileNodeProps) => {
        let arr = [...expandedKeys]
        if (expanded) {
            arr = arr.filter((item) => item !== node.path)
        } else {
            arr = [...arr, node.path]
        }
        if (selectedNodes.length > 0) setSelectedNodes([selectedNodes[selectedNodes.length - 1]])
        setFoucsedKey(node.path)
        setExpandedKeys([...arr])
        if (onExpand) {
            onExpand(arr, {expanded: !expanded, node})
        }
    })

    return (
        <div ref={wrapper} className={styles["file-tree"]}>
            <Tree
                // virtual={false}
                ref={treeRef}
                height={size?.height}
                fieldNames={{title: "name", key: "path", children: "children"}}
                treeData={data}
                blockNode={true}
                switcherIcon={<></>}
                multiple={true}
                expandedKeys={expandedKeys}
                loadData={onLoadData}
                // 解决重复打开同一个项目时 能加载
                loadedKeys={[]}
                titleRender={(nodeData) => {
                    return (
                        <FileTreeNode
                            isDownCtrlCmd={isDownCtrlCmd}
                            info={nodeData}
                            foucsedKey={foucsedKey}
                            selectedKeys={selectedKeys}
                            expandedKeys={expandedKeys}
                            onSelected={handleSelect}
                            onExpanded={handleExpand}
                            copyPath={copyPath}
                            setCopyPath={setCopyPath}
                        />
                    )
                }}
            />
        </div>
    )
}

const FileTreeNode: React.FC<FileTreeNodeProps> = (props) => {
    const {isDownCtrlCmd, info, foucsedKey, selectedKeys, expandedKeys, onSelected, onExpanded, copyPath, setCopyPath} =
        props
    const {areaInfo, activeFile} = useStore()
    const {setAreaInfo, setActiveFile, setFileTree} = useDispatcher()
    // 是否为编辑模式
    const [isEdit, setEdit] = useState<boolean>(false)
    const [value, setValue] = useState<string>(info.name)

    const [removeCheckVisible, setRemoveCheckVisible] = useState<boolean>(false)

    const isFoucsed = useMemo(() => {
        return foucsedKey === info.path
    }, [foucsedKey, info.path])

    const isSelected = useMemo(() => {
        return selectedKeys.includes(info.path)
    }, [selectedKeys, info.path])

    const isExpanded = useMemo(() => {
        return expandedKeys.includes(info.path)
    }, [expandedKeys, info.path])

    const handleSelect = useMemoizedFn(() => {
        onSelected(isSelected, info)
    })

    const handleExpand = useMemoizedFn(() => {
        onExpanded(isExpanded, info)
    })

    const handleClick = useMemoizedFn(() => {
        if (isEdit) return
        if (info.isLeaf) {
            handleSelect()
        } else {
            console.log("isDownCtrlCmd", isDownCtrlCmd)
            if (isDownCtrlCmd) handleSelect()
            else handleExpand()
        }
    })

    // 复制
    const onCopy = useMemoizedFn(() => {
        setCopyPath(info.path)
    })

    // 粘贴
    const onPaste = useMemoizedFn(async () => {
        try {
            console.log("粘贴", info.path, copyPath)
            const fileDetail = getMapFileDetail(copyPath)
            const code = await getCodeByPath(copyPath)
            const newPath = `${info.path}\\${fileDetail.name}`
            const result = await grpcFetchCreateFile(newPath, code)
            console.log("粘贴---",result);
            
            if (result.length === 0) return
            const {path, name, parent} = result[0]

            setMapFileDetail(path, result[0])
            const folderDetail = getMapFolderDetail(info.path)
            const newFolderDetail: string[] = cloneDeep(folderDetail)
            // 如若为空文件夹 则可点击打开
            if (newFolderDetail.length === 0) {
                const fileDetail = getMapFileDetail(info.path)
                setMapFileDetail(info.path, {...fileDetail, isLeaf: false})
            }
            // 新增文件时其位置应处于文件夹后
            let insert: number = 0
            newFolderDetail.some((item, index) => {
                const {isFolder} = getMapFileDetail(item)
                if (isFolder) insert += 1
                return !isFolder
            })
            newFolderDetail.splice(insert, 0, path)
            setMapFolderDetail(info.path, newFolderDetail)
            setCopyPath("")
            emiter.emit("onExpandedFileTree", info.path)
            emiter.emit("onRefreshFileTree")
        } catch (error) {
            setCopyPath("")
            failed(`粘贴失败${error}`)
        }
    })

    const onRename = useMemoizedFn(() => {
        setEdit(true)
    })

    const onRenameFun = useMemoizedFn(async () => {
        try {
            if (value.length !== 0 && value !== info.name) {
                // 重命名 调用接口成功后更新tree
                const result = await grpcFetchRenameFileTree(info.path, value, info.parent)
                console.log("更新", result)
                if (result.length === 0) return
                const {path, name} = result[0]
                // 文件夹重命名
                if (info.isFolder) {
                    if (info.parent) {
                        // 移除文件夹下所有文件详细信息
                        const removeFileArr = getMapAllFileKey().filter((item) => item.startsWith(info.path))
                        removeFileArr.forEach((item) => {
                            removeMapFileDetail(item)
                        })
                        // 移除文件夹下的所有文件夹结构及其父结构下的此项
                        const newFolderDetail = getMapFolderDetail(info.parent).map((item) => {
                            if (item === info.path) return path
                            return item
                        })
                        setMapFolderDetail(info.parent, newFolderDetail)

                        const removeFolderArr = getMapAllFolderKey().filter((item) => item.startsWith(info.path))
                        removeFolderArr.forEach((item) => {
                            removeMapFolderDetail(item)
                        })
                        // 注入新详情Map
                        setMapFileDetail(path, result[0])

                        // 此处更改布局信息
                        const updatePath = (await judgeAreaExistFilesPath(areaInfo, removeFileArr)).map(
                            (item) => item.path
                        )
                        const newAreaInfo = updateAreaFilesPathInfo(areaInfo, updatePath, info.path, path)
                        // 更新当前激活展示文件
                        if (activeFile?.path.startsWith(info.path)) {
                            const newActiveFile = updateActiveFile(activeFile, {
                                path: activeFile.path.replace(info.path, path),
                                parent: activeFile.parent ? activeFile.parent.replace(info.path, path) : null
                            })
                            setActiveFile && setActiveFile(newActiveFile)
                        }
                        setAreaInfo && setAreaInfo(newAreaInfo)
                    } else {
                        emiter.emit("onOpenFolderList", path)
                        // 此处更改布局信息
                        const updatePath = (await judgeAreaExistFilesPath(areaInfo, getMapAllFileKey())).map(
                            (item) => item.path
                        )
                        const newAreaInfo = updateAreaFilesPathInfo(areaInfo, updatePath, info.path, path)
                        // 更新当前激活展示文件
                        if (activeFile?.path.startsWith(info.path)) {
                            const newActiveFile = updateActiveFile(activeFile, {
                                path: activeFile.path.replace(info.path, path),
                                parent: activeFile.parent ? activeFile.parent.replace(info.path, path) : null
                            })
                            setActiveFile && setActiveFile(newActiveFile)
                        }
                        setAreaInfo && setAreaInfo(newAreaInfo)
                    }
                }
                // 文件重命名
                else {
                    // 存在则更改
                    const fileMap = getMapFileDetail(info.path)
                    if (fileMap.name !== "读取文件失败" && !fileMap.path.endsWith("-fail")) {
                        // 移除原有文件数据
                        removeMapFileDetail(info.path)
                        // 新增文件树数据
                        setMapFileDetail(path, result[0])
                    }
                    const folderMap = getMapFolderDetail(info.parent || "")
                    // 获取重命名文件所在存储结构
                    if (info.parent && folderMap.includes(info.path)) {
                        const newFolderMap = folderMap.map((item) => {
                            if (item === info.path) return path
                            return item
                        })
                        setMapFolderDetail(info.parent, newFolderMap)
                    }

                    // 修改分栏数据
                    const newAreaInfo = updateAreaFileInfo(areaInfo, {name, path}, info.path)
                    // 更名后重置激活元素
                    const newActiveFile = isResetActiveFile([info], activeFile)
                    setActiveFile && setActiveFile(newActiveFile)
                    setAreaInfo && setAreaInfo(newAreaInfo)
                }
                emiter.emit("onResetFileTree", info.path)
                emiter.emit("onRefreshFileTree")
            }
            setEdit(false)
        } catch (error) {
            failed("保存失败")
        }
    })

    // 移除新建项
    const resetCreate = useMemoizedFn(() => {
        removeMapFileDetail(info.path)
        if (info.parent) {
            const newFolderDetail = getMapFolderDetail(info.parent).filter((item) => item !== info.path)
            // 如若没有子项 将文件夹收起
            if (newFolderDetail.length === 0) {
                const fileDetail = getMapFileDetail(info.parent)
                setMapFileDetail(info.parent, {...fileDetail, isLeaf: true})
                emiter.emit("onResetFileTree", info.parent)
            }
            setMapFolderDetail(info.parent, newFolderDetail)
        }
        emiter.emit("onRefreshFileTree")
    })

    const onCreateFun = useMemoizedFn(async () => {
        if (value.length > 0) {
            try {
                const newPath = `${info.parent}\\${value}`
                // 区分新建文件夹 新建文件接口
                const result = info.isFolder
                    ? await grpcFetchCreateFolder(newPath, info.parent)
                    : await grpcFetchCreateFile(newPath, null, info.parent)
                console.log("新建----", result)
                if (result.length === 0) return
                const {path, name, parent} = result[0]
                removeMapFileDetail(info.path)
                setMapFileDetail(path, result[0])
                if (parent) {
                    const newFolderDetail = getMapFolderDetail(parent).map((item) => {
                        if (item === info.path) return path
                        return item
                    })
                    setMapFolderDetail(parent, newFolderDetail)
                }
                emiter.emit("onRefreshFileTree")
            } catch (error) {
                resetCreate()
                failed("新建失败")
            }
        }
        // 没有内容 新建失效
        else {
            resetCreate()
        }
    })

    // 输入框回车 或 失焦
    const onSave = useMemoizedFn(async () => {
        // 新建
        if (info.isCreate) {
            onCreateFun()
        }
        // 重命名
        else {
            onRenameFun()
        }
    })

    // 删除
    const onDelete = useMemoizedFn(async () => {
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
                console.log("移除的newAreaInfo", newAreaInfo)
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
            setRemoveCheckVisible(false)
            success(`${info.name} 删除成功`)
        } catch (error) {
            failed("删除失败")
        }
    })

    useEffect(() => {
        if (info.isCreate) {
            setEdit(true)
        }
    }, [])

    // 新建文件
    const onNewFile = useMemoizedFn((path: string) => {
        emiter.emit("onNewFileInFileTree", path)
    })

    // 新建文件夹
    const onNewFolder = useMemoizedFn((path: string) => {
        emiter.emit("onNewFolderInFileTree", path)
    })

    const menuData: YakitMenuItemType[] = useMemo(() => {
        const base: YakitMenuItemType[] = [
            {
                label: "删除",
                key: "delete",
                type: "danger"
            },
            {
                label: "重命名",
                key: "rename"
            }
        ]
        if (info.isFolder) {
            return [
                ...FolderMenu,
                {type: "divider"},
                // {label: "复制", key: "copy"},
                {label: "粘贴", key: "paste", disabled: copyPath.length === 0},
                {type: "divider"},
                ...base
            ]
        } else {
            return [
                {label: "在文件夹中显示", key: "openFileSystem"},
                {type: "divider"},
                {label: "复制", key: "copy"},
                {type: "divider"},
                ...base
            ]
        }
    }, [info.isFolder, copyPath])

    const handleContextMenu = useMemoizedFn(() => {
        showByRightContext({
            width: 180,
            type: "grey",
            data: [...menuData],
            onClick: ({key, keyPath}) => {
                console.log("handleContextMenu", key, keyPath)
                switch (key) {
                    case "newFile":
                        onNewFile(info.path)
                        break
                    case "newFolder":
                        onNewFolder(info.path)
                        break
                    case "openFileSystem":
                        console.log("文件夹中显示", info.path)
                        openABSFileLocated(info.path)
                        break
                    case "copy":
                        onCopy()
                        break
                    case "paste":
                        onPaste()
                        break
                    case "rename":
                        onRename()
                        break
                    case "delete":
                        setRemoveCheckVisible(true)
                        break
                    default:
                        break
                }
            }
        })
    })

    const isFolder = useMemo(() => {
        return info.isFolder
    }, [info.isFolder])

    const iconImage = useMemo(() => {
        if (isFolder) {
            if (isExpanded) {
                return KeyToIcon[FolderDefaultExpanded].iconPath
            } else {
                return KeyToIcon[FolderDefault].iconPath
            }
        } else {
            return KeyToIcon[info.icon].iconPath
        }
    }, [info.icon, isFolder, isExpanded])

    return (
        <>
            <div
                className={classNames(styles["file-tree-node"], {
                    // [styles["node-selected"]]: isSelected,
                    [styles["node-foucsed"]]: isFoucsed
                })}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
            >
                {!info.isLeaf && (
                    <div className={classNames(styles["node-switcher"], {[styles["expanded"]]: isExpanded})}>
                        <OutlineChevronrightIcon />
                    </div>
                )}

                <div className={styles["node-loading"]}>
                    <LoadingOutlined />
                </div>

                <div className={styles["node-content"]}>
                    <div className={styles["content-icon"]}>
                        <img src={iconImage} />
                    </div>
                    <div
                        className={classNames(styles["content-body"], "yakit-content-single-ellipsis")}
                        title={info.name}
                    >
                        {isEdit ? (
                            <YakitInput
                                wrapperClassName={styles["file-tree-input-wrapper"]}
                                className={styles["file-tree-input"]}
                                value={value}
                                onChange={(e) => {
                                    setValue(e.target.value)
                                }}
                                autoFocus
                                onBlur={onSave}
                                onPressEnter={onSave}
                                size='small'
                            />
                        ) : (
                            info.name
                        )}
                    </div>
                </div>
            </div>
            <YakitHint
                visible={removeCheckVisible}
                title={`是否要删除${info.name}`}
                content='确认删除后将会彻底删除'
                onOk={onDelete}
                onCancel={() => setRemoveCheckVisible(false)}
            />
        </>
    )
}