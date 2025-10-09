import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useInViewport, useMemoizedFn, useSize, useUpdateEffect} from "ahooks"
import {FileTreeNodeProps, FileTreeProps, FileNodeProps} from "./FileTreeType"
import {Tree} from "antd"
import {OutlineChevronrightIcon} from "@/assets/icon/outline"
import {FolderDefault, FolderDefaultExpanded, KeyToIcon} from "../../yakRunner/FileTree/icon"
import {LoadingOutlined} from "@ant-design/icons"

import classNames from "classnames"
import styles from "./FileTree.module.scss"
import {getMapFileDetail} from "../FileTreeMap/FileMap"
import emiter from "@/utils/eventBus/eventBus"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"

export const FileTree: React.FC<FileTreeProps> = memo((props) => {
    const {data, onLoadData, onSelect, onExpand, foucsedKey, setFoucsedKey, expandedKeys, setExpandedKeys} = props
    // const {fileTree} = useStore()
    const treeRef = useRef<any>(null)
    const wrapper = useRef<HTMLDivElement>(null)
    const size = useSize(wrapper)

    useEffect(() => {
        // 滚动文件树
        emiter.on("onCodeAuditScrollToFileTree", onScrollToFileTreeFun)
        return () => {
            emiter.off("onCodeAuditScrollToFileTree", onScrollToFileTreeFun)
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

    // 缓存tree展开项 用于关闭后打开(YakRunner移植功能目前未使用，使用时注意区分树来源)
    const onSaveYakRunnerLastExpanded = useMemoizedFn((value: string[]) => {
        return
    })

    const onScrollToFileTreeFun = useMemoizedFn((path) => {
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
            const newSelectedNodes = selectedNodes.filter((item) => !item.path.startsWith(path))
            const newExpandedKeys = expandedKeys.filter((item) => !item.startsWith(path))
            setSelectedNodes(newSelectedNodes)
            onSaveYakRunnerLastExpanded(newExpandedKeys)
            setExpandedKeys(newExpandedKeys)
        } else {
            setFoucsedKey("")
            setSelectedNodes([])
            onSaveYakRunnerLastExpanded([])
            setExpandedKeys([])
        }
    })

    useEffect(() => {
        // 重置文件树
        emiter.on("onCodeAuditResetFileTree", onResetFileTreeFun)
        return () => {
            emiter.off("onCodeAuditResetFileTree", onResetFileTreeFun)
        }
    }, [])

    // 数组去重
    const filter = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

    const onExpandedFileTreeFun = useMemoizedFn((path) => {
        const newExpandedKeys = filter([...expandedKeys, path])
        onSaveYakRunnerLastExpanded(newExpandedKeys)
        setExpandedKeys(newExpandedKeys)
    })

    useEffect(() => {
        // 展开文件树
        emiter.on("onCodeAuditExpandedFileTree", onExpandedFileTreeFun)
        return () => {
            emiter.off("onCodeAuditExpandedFileTree", onExpandedFileTreeFun)
        }
    }, [])

    const handleSelect = useMemoizedFn((selected: boolean, node: FileNodeProps) => {
        let arr = [...selectedNodes]
        let isSelect = selected
        arr = [node]
        isSelect = true
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
                            info={nodeData}
                            foucsedKey={foucsedKey}
                            selectedKeys={selectedKeys}
                            expandedKeys={expandedKeys}
                            onSelected={handleSelect}
                            onExpanded={handleExpand}
                        />
                    )
                }}
            />
        </div>
    )
})

const FileTreeNode: React.FC<FileTreeNodeProps> = (props) => {
    const {info, foucsedKey, selectedKeys, expandedKeys, onSelected, onExpanded} = props

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
            handleExpand()
        }
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
                // 特殊树的可展开结构并不想展示文件夹
                if (info.icon !== "_fd_default") {
                    return KeyToIcon[info.icon].iconPath
                } else if (isExpanded) {
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
                            {info.line && <span className={styles["line"]}>{info.line}</span>}
                        </div>
                        <div className={classNames(styles["content-body"], "yakit-content-single-ellipsis")}>
                            <div
                                className={classNames(styles["name"], "yakit-content-single-ellipsis")}
                                title={info.name}
                            >
                                {info.name}
                                {info.count && (
                                    <YakitTag className={styles["detail-tag"]} size='small' color='info'>
                                        {info.count}
                                    </YakitTag>
                                )}
                            </div>
                            {info.description && (
                                <div
                                    className={classNames("yakit-content-single-ellipsis", styles["description"])}
                                    title={info.description}
                                >
                                    {info.description}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
