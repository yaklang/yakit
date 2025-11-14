import {OutlineChevrondownIcon, OutlineFolderopenIcon} from "@/assets/icon/outline"
import {Tree} from "antd"
import FileTreeSystemItem from "../FileTreeSystemItem/FileTreeSystemIem"
import {Dispatch, FC, SetStateAction, useCallback, useState, useTransition} from "react"
import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import useFileTree from "@/pages/ai-re-act/hooks/useFileTree"
import {cloneDeep} from "lodash"
import styles from "./FileTreeSystemList.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {openFolder} from "@/pages/yakRunner/RunnerFileTree/RunnerFileTree"
import emiter from "@/utils/eventBus/eventBus"
import {useMount} from "ahooks"
import {handleOpenFileSystemDialog} from "@/utils/fileSystemDialog"

interface FileTreeSystemListWapperProps {
    path: string[]
    title: string
    isOpen?: boolean
    setSelected: (v: FileNodeProps) => void
    setOpenFolder?: (v:string)=> void
}
const FileTreeSystemListWapper: FC<FileTreeSystemListWapperProps> = ({
    path,
    title,
    isOpen,
    setOpenFolder,
    setSelected
}) => {
    const onOpenFileFolder = async () => {
        const {filePaths} = await handleOpenFileSystemDialog({title: "请选择文件夹", properties: ["openDirectory"]})
        if (!filePaths.length) return
        let absolutePath: string = filePaths[0].replace(/\\/g, "\\")
        setOpenFolder?.(absolutePath)
    }

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
            {path.map((item, index) => {
                return <FileTreeSystemList key={index} path={item} setSelected={setSelected} />
            })}
        </div>
    )
}

interface FileTreeSystemListProps {
    path: string
    setSelected: (v: FileNodeProps) => void
}
const FileTreeSystemList: FC<FileTreeSystemListProps> = ({path, setSelected}) => {
    const [expandedKeys, setExpandedKeys] = useState<string[]>([])
    const [data, setData] = useState<FileNodeProps[]>([])
    const [_, startTransition] = useTransition()
    const [fileTree, {onLoadFolderChildren}] = useFileTree({
        path,
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
            if (!fileTree.folderChildrenSet.current.has(nodeData.path)) {
                await onLoadFolderChildren(nodeData.path)
            }
            updateData()
            return Promise.resolve()
        } catch {
            return Promise.reject()
        }
    }

    return (
        <Tree.DirectoryTree
            switcherIcon={<OutlineChevrondownIcon />}
            expandedKeys={expandedKeys}
            fieldNames={{title: "name", key: "path", children: "children"}}
            treeData={data}
            showIcon={false}
            onExpand={(keys) => {
                setExpandedKeys(keys as string[])
            }}
            onSelect={(_, {node}) => {
                // 过滤文件夹
                if (node.isFolder) return
                setSelected(node)
            }}
            loadData={loadData}
            titleRender={(nodeData) => (
                <FileTreeSystemItem data={nodeData} expanded={expandedKeys.includes(nodeData.path)} />
            )}
        />
    )
}
export default FileTreeSystemListWapper
