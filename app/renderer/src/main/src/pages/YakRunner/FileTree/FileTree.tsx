import React, {useEffect, useMemo, useRef, useState} from "react"
import {useInViewport, useMemoizedFn} from "ahooks"
import {FileTreeNodeProps, FileTreeProps, FileNodeProps} from "./FileTreeType"
import {System, SystemInfo, handleFetchSystem} from "@/constants/hardware"
import {Tree} from "antd"
import {OutlineChevronrightIcon} from "@/assets/icon/outline"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {YakitMenuItemProps, YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {FolderDefault, FolderDefaultExpanded, KeyToIcon} from "./icon"
import {LoadingOutlined} from "@ant-design/icons"

import classNames from "classnames"
import styles from "./FileTree.module.scss"

const {ipcRenderer} = window.require("electron")

const FolderMenu: YakitMenuItemProps[] = [
    {label: "新建文件", key: "newFile"},
    {label: "新建文件夹", key: "newFolder"},
    {label: "在文件夹中显示", key: "openFileSystem"},
    {label: "在终端打开", key: "openTernimal"}
]

export const FileTree: React.FC<FileTreeProps> = (props) => {
    const {data, onLoadData, onSelect, onExpand} = props

    const systemRef = useRef<System | undefined>(SystemInfo.system)
    useEffect(() => {
        if (!systemRef.current) {
            handleFetchSystem(() => (systemRef.current = SystemInfo.system))
        }
    }, [])

    const wrapper = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(wrapper)
    const getInViewport = useMemoizedFn(() => inViewport)

    const [isDownCtrlCmd, setIsDownCtrlCmd] = useState<boolean>(false)
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

    const [foucsedKey, setFoucsedKey] = React.useState<string>("")
    const [selectedNodes, setSelectedNodes] = React.useState<FileNodeProps[]>([])
    const selectedKeys = useMemo(() => {
        return selectedNodes.map((node) => node.path)
    }, [selectedNodes])
    const [expandedNodes, setExpandedNodes] = React.useState<FileNodeProps[]>([])
    const expandedKeys = useMemo(() => {
        return expandedNodes.map((node) => node.path)
    }, [expandedNodes])

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
        let arr = [...expandedNodes]
        if (expanded) {
            arr = arr.filter((item) => item.path !== node.path)
        } else {
            arr = [...arr, node]
        }
        if (selectedNodes.length > 0) setSelectedNodes([selectedNodes[selectedNodes.length - 1]])
        setExpandedNodes([...arr])
        if (onExpand) {
            onExpand(
                arr.map((item) => item.path),
                {expanded: !expanded, node}
            )
        }
    })

    return (
        <div ref={wrapper} className={styles["file-tree"]}>
            <Tree
                virtual={false}
                fieldNames={{title: "name", key: "path", children: "children"}}
                treeData={data}
                blockNode={true}
                switcherIcon={<></>}
                multiple={true}
                expandedKeys={expandedKeys}
                loadData={onLoadData}
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
                        />
                    )
                }}
            />
        </div>
    )
}

const FileTreeNode: React.FC<FileTreeNodeProps> = (props) => {
    const {isDownCtrlCmd, info, foucsedKey, selectedKeys, expandedKeys, onSelected, onExpanded} = props

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
            console.log("isDownCtrlCmd", isDownCtrlCmd)
            if (isDownCtrlCmd) handleSelect()
            else handleExpand()
        }
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
        if (info.isLeaf) {
            return [
                {label: "在文件夹中显示", key: "openFileSystem"},
                {type: "divider"},
                {label: "复制", key: "copy"},
                {type: "divider"},
                ...base
            ]
        } else {
            return [
                ...FolderMenu,
                {type: "divider"},
                {label: "复制", key: "copy"},
                {label: "粘贴", key: "paste", disabled: true},
                {type: "divider"},
                ...base
            ]
        }
    }, [info.isLeaf])

    const handleContextMenu = useMemoizedFn(() => {
        showByRightContext({
            width: 180,
            type: "grey",
            data: [...menuData],
            onClick: ({key, keyPath}) => {}
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
        <div
            className={classNames(styles["file-tree-node"], {
                [styles["node-selected"]]: isSelected,
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
                <div className={classNames(styles["content-body"], "yakit-content-single-ellipsis")} title={info.name}>
                    {info.name}
                </div>
            </div>
        </div>
    )
}
