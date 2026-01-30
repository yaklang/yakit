import {OutlineChevrondownIcon} from "@/assets/icon/outline"
import {Tree} from "antd"
import FileTreeSystemItem from "../FileTreeSystemItem/FileTreeSystemIem"
import {FC, memo, useCallback, useState, useTransition} from "react"
import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import useFileTree from "@/pages/ai-re-act/hooks/useFileTree"
import {cloneDeep} from "lodash"
import styles from "./FileTreeSystemList.module.scss"
import {FileTreeSystemListProps} from "../type"
import {TREE_DRAG_KEY} from "@/pages/ai-agent/aiChatWelcome/hooks/useAIChatDrop"
import {useMount} from "ahooks"
import emiter from "@/utils/eventBus/eventBus"

const {ipcRenderer} = window.require("electron")

const FileTreeSystemList: FC<FileTreeSystemListProps> = ({
    path,
    isOpen,
    isFolder = true,
    selected,
    setSelected,
    onTreeDragStart,
    onTreeDragEnd,
    isShowRightMenu,
    checkable,
    checkedKeys,
    setCheckedKeys
}) => {
    const [expandedKeys, setExpandedKeys] = useState<string[]>([])

    const [loadedKeys, setLoadedKeys] = useState<string[]>([])
    const [data, setData] = useState<FileNodeProps[]>([])
    const [_, startTransition] = useTransition()
    const [fileTree, {onLoadFolderChildren, onResetTree, getDetailMap}] = useFileTree({
        target: {path, isFolder},
        onRefreshTreeData: () => {
            updateData()
        },
        onInitComplete: () => {
            const tree = fileTree.treeData.current
            setData(tree ? [cloneDeep(tree)] : [])
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
            setExpandedKeys((prev) => [...prev, ...relevantPaths])
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
        <Tree.DirectoryTree
            draggable
            className={styles["file-tree-system-list"]}
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
                    data={nodeData}
                    isOpen={isOpen}
                    isShowRightMenu={isShowRightMenu}
                    onResetTree={onResetTreeList}
                    expanded={expandedKeys.includes(nodeData.path)}
                    checkable={checkable}
                    checked={!!checkedKeys?.find((ele) => ele?.path === nodeData.path)}
                    setChecked={(c) => setCheckedKeys?.(c, nodeData)}
                />
            )}
        />
    )
}
export default memo(FileTreeSystemList)
