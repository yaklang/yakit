import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useInViewport, useMemoizedFn, useSize, useUpdateEffect} from "ahooks"
import {FileTreeNodeProps, FileTreeProps, FileNodeProps, FileNodeMapProps} from "./FileTreeType"
import {SystemInfo} from "@/constants/hardware"
import {Tree} from "antd"
import {OutlineChevronrightIcon} from "@/assets/icon/outline"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {YakitMenuItemProps, YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {FolderDefault, FolderDefaultExpanded, KeyToIcon} from "../../yakRunner/FileTree/icon"
import {LoadingOutlined} from "@ant-design/icons"

import classNames from "classnames"
import styles from "./FileTree.module.scss"
import {openABSFileLocated} from "@/utils/openWebsite"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {getMapAllFileKey, getMapFileDetail, removeMapFileDetail, setMapFileDetail} from "../FileTreeMap/FileMap"
import emiter from "@/utils/eventBus/eventBus"
import {getRelativePath, setYakRunnerLastFolderExpanded} from "../utils"
import useStore from "../hooks/useStore"
import useDispatcher from "../hooks/useDispatcher"
import {hasMapFolderDetail} from "../FileTreeMap/ChildMap"
import {failed, success} from "@/utils/notification"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {setClipboardText} from "@/utils/clipboard"

export const FileTree: React.FC<FileTreeProps> = memo((props) => {
    const {folderPath, data, onLoadData, onSelect, onExpand, foucsedKey, setFoucsedKey, expandedKeys, setExpandedKeys} =
        props
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
        emiter.on("onScrollToDecompilerTree", onScrollToDecompilerTreeFun)
        return () => {
            emiter.off("onScrollToDecompilerTree", onScrollToDecompilerTreeFun)
        }
    }, [])

    useEffect(() => {
        let system = SystemInfo.system
        if (!system) {
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            return
        }
        const handleKeyUp = (e: KeyboardEvent) => {
            return
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

    const scrollExpandedKeys = useRef<string[]>([])
    const scrollExpandedKeysFun = useMemoizedFn((path) => {
        const fileDetail = getMapFileDetail(path)
        if (fileDetail.isFolder) {
            scrollExpandedKeys.current = [...scrollExpandedKeys.current, fileDetail.path]
        }
        if (fileDetail.parent !== null) {
            scrollExpandedKeysFun(fileDetail.parent)
        }
    })

    // 缓存tree展开项 用于关闭后打开
    const onSaveYakRunnerLastExpanded = useMemoizedFn((value: string[]) => {
        setYakRunnerLastFolderExpanded({
            folderPath,
            expandedKeys: value
        })
    })

    const onScrollToDecompilerTreeFun = useMemoizedFn((path) => {
        scrollExpandedKeys.current = []
        // 获取 Tree 组件的实例
        const treeInstance = treeRef.current
        // 如果 Tree 实例存在且有 scrollTo 方法
        if (treeInstance && treeInstance.scrollTo) {
            // 打开扩展项
            scrollExpandedKeysFun(path)
            const newExpandedKeys = filter([...expandedKeys, ...scrollExpandedKeys.current])
            setExpandedKeys(newExpandedKeys)
            onSaveYakRunnerLastExpanded(newExpandedKeys)
            setFoucsedKey(path)
            // 调用 scrollTo 方法滚动到指定节点
            setTimeout(() => {
                treeInstance.scrollTo({key: path, align: "middle"})
            }, 200)
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
            onSaveYakRunnerLastExpanded(newExpandedKeys)
            setExpandedKeys(newExpandedKeys)
        } else {
            // 全部清空
            setCopyPath("")
            setFoucsedKey("")
            setSelectedNodes([])
            onSaveYakRunnerLastExpanded([])
            setExpandedKeys([])
        }
    })

    useEffect(() => {
        // 重置文件树
        emiter.on("onResetDecompilerFileTree", onResetFileTreeFun)
        return () => {
            emiter.off("onResetDecompilerFileTree", onResetFileTreeFun)
        }
    }, [])

    // 数组去重
    const filter = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

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
        onSaveYakRunnerLastExpanded([...arr])
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
                            setFoucsedKey={setFoucsedKey}
                        />
                    )
                }}
            />
        </div>
    )
})

const FileTreeNode: React.FC<FileTreeNodeProps> = (props) => {
    const {
        isDownCtrlCmd,
        info,
        foucsedKey,
        selectedKeys,
        expandedKeys,
        onSelected,
        onExpanded,
        copyPath,
        setCopyPath,
        setFoucsedKey
    } = props
    const {fileTree} = useStore()

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
        if (info.isLeaf) {
            handleSelect()
        } else {
            if (isDownCtrlCmd) handleSelect()
            else handleExpand()
        }
    })

    // 复制绝对路径
    const onCopyAbsolutePath = useMemoizedFn(() => {
        setClipboardText(info.path)
    })

    // 复制相对路径
    const onCopyRelativePath = useMemoizedFn(async () => {
        if (fileTree.length === 0) {
            failed(`复制相对路径失败`)
            return
        }
        const basePath = fileTree[0].path
        const relativePath = await getRelativePath(basePath, info.path)
        setClipboardText(relativePath)
    })

    const menuData: YakitMenuItemType[] = useMemo(() => {
        const CloseFolder: YakitMenuItemType[] = [
            {label: "复制路径", key: "copyAbsolutePath"},
            {label: "复制相对路径", key: "copyRelativePath"}
        ]
        return CloseFolder
    }, [info, copyPath])

    const handleContextMenu = useMemoizedFn(() => {
        showByRightContext({
            width: 180,
            type: "grey",
            data: [...menuData],
            onClick: ({key, keyPath}) => {
                switch (key) {
                    case "copyAbsolutePath":
                        onCopyAbsolutePath()
                        break
                    case "copyRelativePath":
                        onCopyRelativePath()
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
        try {
            if (info.isBottom) {
                return ""
            }
            if (isFolder) {
                if (isExpanded) {
                    return KeyToIcon[FolderDefaultExpanded].iconPath
                } else {
                    return KeyToIcon[FolderDefault].iconPath
                }
            } else {
                return KeyToIcon[info.icon].iconPath
            }
        } catch (error) {
            return ""
        }
    }, [info.icon, isFolder, isExpanded, info.isBottom])

    return (
        <>
            {info.isBottom ? (
                <div className={styles["tree-bottom"]}>{info.name}</div>
            ) : (
                <div
                    className={classNames(styles["file-tree-node"], {
                        // [styles["node-selected"]]: isSelected,
                        [styles["node-foucsed"]]: isFoucsed
                    })}
                    style={{paddingLeft: (info.depth - 1) * 16 + 8}}
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
                            {info.name}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
