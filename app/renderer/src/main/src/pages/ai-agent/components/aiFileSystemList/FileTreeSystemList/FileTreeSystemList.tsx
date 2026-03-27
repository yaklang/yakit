import {OutlineChevrondownIcon} from "@/assets/icon/outline"
import {Tree} from "antd"
import FileTreeSystemItem from "../FileTreeSystemItem/FileTreeSystemIem"
import {FC, forwardRef, memo, useCallback, useImperativeHandle, useState, useTransition} from "react"
import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import useFileTree from "@/pages/ai-re-act/hooks/useFileTree"
import {cloneDeep} from "lodash"
import styles from "./FileTreeSystemList.module.scss"
import {FileTreeSystemListProps, FileTreeSystemListRef} from "../type"
import {TREE_DRAG_KEY} from "@/pages/ai-agent/aiChatWelcome/hooks/useAIChatDrop"
import {useControllableValue, useMount} from "ahooks"
import emiter from "@/utils/eventBus/eventBus"

const {ipcRenderer} = window.require("electron")

const normalizePath = (p: string) => {
    return p
        .replace(/\\/g, "/") // 全部转成 /
        .replace(/\/+/g, "/") // 去掉重复 //
        .replace(/\/$/, "") // 去掉结尾 /
}
const isAncestor = (ancestor: string, target: string) => {
    const a = normalizePath(ancestor)
    const t = normalizePath(target)
    return t === a || t.startsWith(a + "/")
}

const FileTreeSystemList = forwardRef<FileTreeSystemListRef, FileTreeSystemListProps>((props, ref) => {
    const {
        path,
        isOpen,
        isFolder = true,
        selected,
        setSelected,
        onTreeDragStart,
        onTreeDragEnd,
        isShowRightMenu,
        treeMenuData,
        handleTreeDropdown,
        checkable,
        checkedKeys,
        setCheckedKeys,
        updateWatchTokenFun,
        onTreeNodeDelFun
    } = props

    useImperativeHandle(ref, () => ({
        onResetTreeList,
        loadFolder,
        getDetailMap
    }))

    const [expandedKeys, setExpandedKeys] = useState<string[]>([])

    const [loadedKeys, setLoadedKeys] = useState<string[]>([])
    const [data, setData] = useControllableValue<FileNodeProps[]>(props, {
        defaultValue: [],
        valuePropName: "treeData",
        trigger: "setTreeData"
    })
    const [_, startTransition] = useTransition()
    const [fileTree, {onLoadFolderChildren, onResetTree, getDetailMap}] = useFileTree({
        target: {path, isFolder},
        onRefreshTreeData: () => {
            updateData()
        },
        onInitComplete: () => {
            updateWatchTokenFun?.(fileTree.watchToken.current!)
            const tree = fileTree.treeData.current
            setData(tree ? [cloneDeep(tree)] : [])
        },
        onTreeNodeDel: (path, isFolder) => {
            if (selected?.path && isAncestor(path, selected.path)) {
                if (isFolder) {
                    setSelected(undefined)
                } else {
                    setSelected({...selected, isDelete: true})
                }
            }
            if (isFolder) {
                setLoadedKeys((prev) => {
                    return prev.filter((key) => key !== path)
                })
                setExpandedKeys((prev) => {
                    return prev.filter((key) => key !== path)
                })
            }
            onTreeNodeDelFun?.(path)
        }
    })
    const updateData = useCallback(() => {
        startTransition(() => {
            const tree = fileTree.treeData.current
            setData(tree ? [cloneDeep(tree)] : [])
        })
    }, [fileTree])

    const loadData = async (nodeData) => {
        try {
            setLoadedKeys([...loadedKeys, nodeData.path])
            const path = nodeData.path
            if (!fileTree.folderChildrenSet.current.has(path)) {
                await onLoadFolderChildren(path)
            }
            updateData()
        } catch (error) {
            return Promise.reject(error)
        }
        return Promise.resolve(true)
    }

    const loadFolder = async (path: string) => {
        try {
            setExpandedKeys((prev) => Array.from(new Set([...prev, path])))
            setLoadedKeys((prev) => Array.from(new Set([...prev, path])))
            if (!fileTree.folderChildrenSet.current.has(path)) {
                await onLoadFolderChildren(path)
            }
            updateData()
        } catch (error) {
            return Promise.reject(error)
        }
        return Promise.resolve(true)
    }

    const onResetTreeList = () => {
        setExpandedKeys([])
        setSelected(undefined)
        setLoadedKeys([])
        onResetTree()
    }

    const processExpand = async (expandKey: string) => {
        if (!expandKey) return
        try {
            const relevantPaths = await ipcRenderer.invoke("get-relevant-paths", {
                targetPath: [expandKey],
                basePath: path
            })
            for (const relevant of relevantPaths) {
                if (!fileTree.folderChildrenSet.current.has(relevant)) {
                    await onLoadFolderChildren(relevant)
                }
            }
            updateData()
            if (relevantPaths.length === 0) return
            setExpandedKeys((prev) => [...prev, path, ...relevantPaths])
            setLoadedKeys((prev) => [...prev, ...relevantPaths])
            const expandMap = getDetailMap?.(expandKey)
            !isOpen && setSelected(expandMap)
        } catch {}
    }

    useMount(() => {
        emiter.on("fileSystemDefaultExpand", processExpand)
        return () => {
            emiter.off("fileSystemDefaultExpand", processExpand)
        }
    })
    return (
        <div className={styles["file-tree-system-list"]}>
            <Tree.DirectoryTree
                draggable
                switcherIcon={<OutlineChevrondownIcon />}
                expandedKeys={expandedKeys}
                fieldNames={{title: "name", key: "path", children: "children"}}
                treeData={data}
                showIcon={false}
                selectedKeys={selected?.path ? [selected.path] : []}
                onExpand={(keys) => {
                    setExpandedKeys(keys as string[])
                }}
                onSelect={(_, {node}) => {
                    setSelected(node)
                    if (node.isLeaf) {
                        const checked = !!checkedKeys?.find((ele) => ele?.path === node.path)
                        setCheckedKeys?.(!checked, node)
                    }
                }}
                onDragStart={(info) => {
                    onTreeDragStart?.()
                    const node = info.node

                    if (!info.event?.dataTransfer) return

                    info.event.dataTransfer.effectAllowed = "copy"
                    info.event.dataTransfer.setData(
                        TREE_DRAG_KEY,
                        JSON.stringify({
                            path: node.path,
                            isFolder: node.isFolder
                        })
                    )
                }}
                onDragEnd={() => {
                    onTreeDragEnd?.()
                }}
                loadedKeys={loadedKeys}
                loadData={loadData}
                titleRender={(nodeData) => (
                    <FileTreeSystemItem
                        watchToken={fileTree.watchToken.current!}
                        data={nodeData}
                        isOpen={isOpen}
                        isShowRightMenu={isShowRightMenu}
                        treeMenuData={treeMenuData}
                        handleTreeDropdown={handleTreeDropdown}
                        onResetTree={onResetTreeList}
                        expanded={expandedKeys.includes(nodeData.path)}
                        checkable={checkable}
                        checked={!!checkedKeys?.find((ele) => ele?.path === nodeData.path)}
                        setChecked={(c) => setCheckedKeys?.(c, nodeData)}
                        selected={selected}
                        setSelected={setSelected}
                    />
                )}
            />
        </div>
    )
})
export default memo(FileTreeSystemList)
