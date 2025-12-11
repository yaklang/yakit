import {OutlineChevrondownIcon, OutlineFolderopenIcon} from "@/assets/icon/outline"
import {Tree} from "antd"
import FileTreeSystemItem from "../FileTreeSystemItem/FileTreeSystemIem"
import {FC, useCallback, useMemo, useState, useTransition} from "react"
import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import useFileTree from "@/pages/ai-re-act/hooks/useFileTree"
import {cloneDeep} from "lodash"
import styles from "./FileTreeSystemList.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {handleOpenFileSystemDialog} from "@/utils/fileSystemDialog"
import {useMemoizedFn} from "ahooks"

interface FileTreeSystemListWapperProps {
    path: string[]
    title: string
    isOpen?: boolean
    selected?: FileNodeProps
    setSelected: (v?: FileNodeProps) => void
    setOpenFolder?: (v: string) => void
}
const FileTreeSystemListWapper: FC<FileTreeSystemListWapperProps> = ({
    path,
    title,
    isOpen,
    selected,
    setOpenFolder,
    setSelected
}) => {
    const onOpenFileFolder = async () => {
        const {filePaths} = await handleOpenFileSystemDialog({title: "请选择文件夹", properties: ["openDirectory"]})
        if (!filePaths.length) return
        let absolutePath: string = filePaths[0].replace(/\\/g, "\\")
        setOpenFolder?.(absolutePath)
    }

    const renderContent = useMemoizedFn(() => {
        if (isOpen && path.length === 0) {
            return (
                <YakitButton onClick={onOpenFileFolder} style={{width: "100%"}} type='outline2'>
                    点击打开文件夹
                </YakitButton>
            )
        }
        return path.map((item) => (
            <FileTreeSystemList key={item} path={item} isOpen={isOpen} selected={selected} setSelected={setSelected} />
        ))
    })
    return (
        <div className={styles["file-tree-system"]}>
            <div className={styles["file-tree-system-title"]}>
                {title}

                <YakitButton
                    className={styles["file-tree-system-title-icon"]}
                    hidden={!isOpen}
                    type='text2'
                    title='打开文件夹'
                    icon={<OutlineFolderopenIcon />}
                    onClick={onOpenFileFolder}
                />
            </div>
            {renderContent()}
        </div>
    )
}

interface FileTreeSystemListProps {
    path: string
    isOpen?: boolean
    selected?: FileTreeSystemListWapperProps["selected"]
    setSelected: FileTreeSystemListWapperProps["setSelected"]
}
const FileTreeSystemList: FC<FileTreeSystemListProps> = ({path, isOpen,selected, setSelected}) => {
    const [expandedKeys, setExpandedKeys] = useState<string[]>([])
    const [loadedKeys, setLoadedKeys] = useState<string[]>([])
    const [data, setData] = useState<FileNodeProps[]>([])
    const [_, startTransition] = useTransition()
    const [fileTree, {onLoadFolderChildren, onResetTree}] = useFileTree({
        target:{path, isFolder: true},
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
    return (
        <Tree.DirectoryTree
            switcherIcon={<OutlineChevrondownIcon />}
            expandedKeys={expandedKeys}
            fieldNames={{title: "name", key: "path", children: "children"}}
            treeData={data}
            showIcon={false}
            selectedKeys={selected?.path?[selected?.path]:[]}
            onExpand={(keys) => {
                setExpandedKeys(keys as string[])
            }}
            onSelect={(_, {node}) => {
                setSelected(node)
            }}
            loadedKeys={loadedKeys}
            loadData={loadData}
            titleRender={(nodeData) => (
                <FileTreeSystemItem
                    data={nodeData}
                    isOpen={isOpen}
                    onResetTree={onResetTreeList}
                    expanded={expandedKeys.includes(nodeData.path)}
                />
            )}
        />
    )
}
export default FileTreeSystemListWapper
