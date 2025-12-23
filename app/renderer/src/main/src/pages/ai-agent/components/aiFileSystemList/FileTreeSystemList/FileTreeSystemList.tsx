import {OutlineChevrondownIcon, OutlinePluscircleIcon} from "@/assets/icon/outline"
import {Tree} from "antd"
import FileTreeSystemItem from "../FileTreeSystemItem/FileTreeSystemIem"
import {FC, useCallback, useMemo, useState, useTransition} from "react"
import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import useFileTree from "@/pages/ai-re-act/hooks/useFileTree"
import {cloneDeep} from "lodash"
import styles from "./FileTreeSystemList.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {handleOpenFileSystemDialog, OpenDialogOptions} from "@/utils/fileSystemDialog"
import {useMemoizedFn} from "ahooks"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {FileListTileMenu, FileTreeSystemListWapperProps} from "../type"
import {FileToChatQuestionList} from "@/pages/ai-re-act/aiReActChat/store"

const FileTreeSystemListWapper: FC<FileTreeSystemListWapperProps> = ({
    path,
    title,
    isOpen,
    selected,
    historyFolder,
    setOpenFolder,
    setSelected
}) => {
    const onOpenFileFolder = async (flag) => {
      try {
          const label = flag ? "文件夹" : "文件"
        const args: OpenDialogOptions["properties"] = flag ? ["openDirectory"] : ["openFile"]
        const {filePaths} = await handleOpenFileSystemDialog({title: `请选择${label}`, properties: args})
        if (!filePaths.length) return
        let absolutePath: string = filePaths[0].replace(/\\/g, "\\")
        setOpenFolder?.(absolutePath, flag)
      } catch  {
        
      }
    }
    const dropdownMenu = useMemo(() => {
        return {
            data: [
                {
                    label: "打开文件",
                    key: "open-file"
                },
                {
                    label: "打开文件夹",
                    key: "open-folder"
                }
            ],
            onClick: ({key}) => {
                switch (key) {
                    case "open-file":
                        onOpenFileFolder(false)
                        break
                    case "open-folder":
                    default:
                        onOpenFileFolder(true)
                        break
                }
            }
        }
    }, [])
    const renderContent = useMemoizedFn(() => {
        if (isOpen && path.length === 0) {
            return (
                <YakitDropdownMenu
                    menu={dropdownMenu}
                    dropdown={{
                        trigger: ["click"],
                        placement: "bottomLeft",
                        overlayClassName: styles["dropdown-menu"]
                    }}
                >
                    <YakitButton style={{width: "100%"}} type='outline2'>
                        打开文件夹管理
                    </YakitButton>
                </YakitDropdownMenu>
            )
        }
        return path.map((item) => (
            <FileTreeSystemList
                key={item.path}
                path={item.path}
                isOpen={isOpen}
                isFolder={item.isFolder}
                selected={selected}
                setSelected={setSelected}
            />
        ))
    })

    // 菜单选择
    const menuData = useMemo(() => {
        if (!isOpen) return []
        let menu: YakitMenuItemType[] = [
            {
                key: FileListTileMenu.OpenFile,
                label: `打开文件`
            },
            {
                key: FileListTileMenu.OpenFolder,
                label: `打开文件夹`
            }
        ]
        if (historyFolder?.length) {
            menu.push({
                key: FileListTileMenu.History,
                label: "最近打开",
                children: [
                    ...(historyFolder?.map(({path}) => {
                        return {key: path, label: path}
                    }) || [])
                ]
            })
        }

        return menu
    }, [historyFolder, isOpen])

    // 菜单选择事件
    const menuSelect = useMemoizedFn((key: FileListTileMenu, keyPath: string[]) => {
        let menuKey = key
        if (keyPath.length === 2) {
            menuKey = keyPath[1] as FileListTileMenu
        }
        switch (menuKey) {
            case FileListTileMenu.OpenFile:
                onOpenFileFolder(false)
                break
            case FileListTileMenu.OpenFolder:
                onOpenFileFolder(true)
                break
            case FileListTileMenu.History:
                const folderPath = keyPath[0]
                const isFolder  =historyFolder?.find(i=>i.path === key)?.isFolder ?? true
                setOpenFolder?.(folderPath, isFolder)
                break
            default:
                break
        }
    })

    return (
        <div className={styles["file-tree-system"]}>
            <div className={styles["file-tree-system-title"]}>
                {title}

                <YakitDropdownMenu
                    menu={{
                        data: menuData,
                        onClick: ({key, keyPath}) => menuSelect(key as FileListTileMenu, keyPath)
                    }}
                    dropdown={{
                        trigger: ["click"],
                        placement: "bottomLeft",
                        overlayStyle: {zIndex: 10000}
                    }}
                >
                    <YakitButton
                        className={styles["file-tree-system-title-icon"]}
                        hidden={!isOpen}
                        type='text2'
                        title={`打开文件夹`}
                        icon={<OutlinePluscircleIcon />}
                    />
                </YakitDropdownMenu>
            </div>
            {renderContent()}
        </div>
    )
}
export default FileTreeSystemListWapper
interface FileTreeSystemListProps {
    path: string
    isFolder?: boolean
    isOpen?: boolean
    selected?: FileTreeSystemListWapperProps["selected"]
    setSelected: FileTreeSystemListWapperProps["setSelected"]
    checkedKeys?: FileToChatQuestionList[]
    setCheckedKeys?: (v: boolean, nodeData: FileNodeProps) => void
    isShowRightMenu?: boolean
    checkable?: boolean
}
export const FileTreeSystemList: FC<FileTreeSystemListProps> = ({
    path,
    isOpen,
    isFolder = true,
    selected,
    setSelected,
    isShowRightMenu,
    checkable,
    checkedKeys,
    setCheckedKeys
}) => {
    const [expandedKeys, setExpandedKeys] = useState<string[]>([])

    const [loadedKeys, setLoadedKeys] = useState<string[]>([])
    const [data, setData] = useState<FileNodeProps[]>([])
    const [_, startTransition] = useTransition()
    const [fileTree, {onLoadFolderChildren, onResetTree}] = useFileTree({
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
    return (
        <Tree.DirectoryTree
            switcherIcon={<OutlineChevrondownIcon />}
            expandedKeys={expandedKeys}
            fieldNames={{title: "name", key: "path", children: "children"}}
            treeData={data}
            showIcon={false}
            selectedKeys={selected?.path ? [selected?.path] : []}
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
