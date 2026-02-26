import {handleOpenFileSystemDialog, type OpenDialogOptions} from "@/utils/fileSystemDialog"
import {FileListTileMenu, FileTreeSystemListWapperProps, HistoryItem, PathIncludeResult} from "../type"
import {type FC, useEffect, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import styles from "./FileTreeSystemListWapper.module.scss"
import FileTreeSystemList from "../FileTreeSystemList/FileTreeSystemList"
import {OutlineChevrondownIcon, OutlineDocumentaddIcon, OutlineFolderaddIcon, OutlinePluscircleIcon} from "@/assets/icon/outline"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {checkPathIncludeRelation, mergePathArray} from "../utils"
import {yakitNotify} from "@/utils/notification"

interface OpFileNotifyParams {
    uniquePaths: HistoryItem[]
    incoming: HistoryItem
    label: string
    path?: string
}

export const opfileNotify = async ({uniquePaths, incoming, label, path}: OpFileNotifyParams) => {
    const relation = await checkPathIncludeRelation(uniquePaths, incoming)
    const pathText = path ? `：${path} ` : ""
    switch (relation) {
        case PathIncludeResult.Equal:
        case PathIncludeResult.OriginContains:
            yakitNotify("info", `所选${label}${pathText}已存在于列表中，无需重复添加。`)
            return
        case PathIncludeResult.IncomingContains:
            yakitNotify("info", `所选${label}${pathText}已包含列表中部分路径，已为您自动优化。`)
            break
        case PathIncludeResult.Error:
            yakitNotify("error", `添加${label}${pathText}时发生错误，请重试。`)
            break
        case PathIncludeResult.None:
            break
        default:
            break
    }
}

const FileTreeSystemListWapper: FC<FileTreeSystemListWapperProps> = ({
    path,
    title,
    isOpen,
    selected,
    // historyFolder,
    setOpenFolder,
    setSelected,
    onTreeDragStart,
    onTreeDragEnd
}) => {
    // 展开
    const [expanded, setExpanded] = useState(true)

    // 去重path
    const [uniquePaths, setUniquePaths, getUniquePaths] = useGetSetState<HistoryItem[]>([])
    const onOpenFileFolder = async (flag) => {
        try {
            const label = flag ? "文件夹" : "文件"
            const args: OpenDialogOptions["properties"] = flag ? ["openDirectory"] : ["openFile"]
            const {filePaths} = await handleOpenFileSystemDialog({title: `请选择${label}`, properties: args})
            if (!filePaths.length) return
            let absolutePath: string = filePaths[0].replace(/\\/g, "\\")
            await opfileNotify({uniquePaths, incoming: {path: absolutePath, isFolder: flag}, label, path: absolutePath})
            setOpenFolder?.(absolutePath, flag)
        } catch {}
    }
    const renderContent = useMemoizedFn(() => {
        if (isOpen && uniquePaths.length === 0) {
            return (
                <div>
                    <YakitEmpty />
                    <div className={styles["file-tree-system-title-btn"]}>
                        <YakitButton hidden={!isOpen} onClick={() => onOpenFileFolder(true)}>
                            打开文件夹
                        </YakitButton>
                        <YakitButton hidden={!isOpen} type='outline1' onClick={() => onOpenFileFolder(false)}>
                            打开文件
                        </YakitButton>
                    </div>
                </div>
            )
        }

        return uniquePaths.map((item) => (
            <FileTreeSystemList
                key={item.path}
                path={item.path}
                isOpen={isOpen}
                isFolder={item.isFolder}
                selected={selected}
                setSelected={setSelected}
                onTreeDragStart={onTreeDragStart}
                onTreeDragEnd={onTreeDragEnd}
            />
        ))
    })

    useEffect(() => {
        if (!path || path.length === 0) return setUniquePaths([])

        const current = getUniquePaths()
        if (path.length < current.length) return setUniquePaths(path)

        let cancelled = false

        const run = async () => {
            const next = await mergePathArray(current, path)

            if (!cancelled) {
                setUniquePaths(next)
            }
        }

        run()

        return () => {
            cancelled = true
        }
    }, [getUniquePaths, path, setUniquePaths])

    // 菜单选择
    // const menuData = useMemo(() => {
    //     if (!isOpen) return []
    //     let menu: YakitMenuItemType[] = [
    //         {
    //             key: FileListTileMenu.OpenFile,
    //             label: `打开文件`
    //         },
    //         {
    //             key: FileListTileMenu.OpenFolder,
    //             label: `打开文件夹`
    //         }
    //     ]
    //     if (historyFolder?.length) {
    //         menu.push({
    //             key: FileListTileMenu.History,
    //             label: "最近打开",
    //             children: [
    //                 ...(historyFolder?.map(({path}) => {
    //                     return {key: path, label: path}
    //                 }) || [])
    //             ]
    //         })
    //     }

    //     return menu
    // }, [historyFolder, isOpen])

    // 菜单选择事件
    const menuSelect = useMemoizedFn((key: FileListTileMenu) => {
        // let menuKey = key
        // if (keyPath.length === 2) {
        //     menuKey = keyPath[1] as FileListTileMenu
        // }
        switch (key) {
            case FileListTileMenu.OpenFile:
                onOpenFileFolder(false)
                break
            case FileListTileMenu.OpenFolder:
                onOpenFileFolder(true)
                break
            // case FileListTileMenu.History:
            //     const folderPath = keyPath[0]
            //     const isFolder = historyFolder?.find((i) => i.path === key)?.isFolder ?? true
            //     setOpenFolder?.(folderPath, isFolder)
            //     break
            default:
                break
        }
    })

    return (
        <div className={styles["file-tree-system"]}>
            <div className={styles["file-tree-system-title"]}>
                <div className={styles["file-tree-system-title-toggle"]} onClick={() => setExpanded((p) => !p)}>
                    <OutlineChevrondownIcon style={{transform: expanded ? "rotate(0deg)" : "rotate(-90deg)"}} />
                    <span style={{marginLeft: 4}}>{title}</span>
                </div>

                {/* <YakitDropdownMenu
                    menu={{
                        data: menuData,
                        onClick: ({key, keyPath}) => menuSelect(key as FileListTileMenu, keyPath)
                    }}
                    dropdown={{
                        trigger: ["click"],
                        placement: "bottomLeft"
                    }}
                >
                    <YakitButton
                        className={styles["file-tree-system-title-icon"]}
                        hidden={!isOpen}
                        type='text2'
                        title={`打开文件夹`}
                        icon={<OutlinePluscircleIcon />}
                    />
                </YakitDropdownMenu> */}
                <div className={styles["file-tree-system-title-icon"]}>
                    <YakitButton
                        hidden={!isOpen}
                        type='text2'
                        title='打开文件'
                        onClick={()=>menuSelect(FileListTileMenu.OpenFile)}
                        icon={<OutlineDocumentaddIcon />}
                    />
                    <YakitButton
                        hidden={!isOpen}
                        type='text2'
                        title='打开文件夹'
                        onClick={()=>menuSelect(FileListTileMenu.OpenFolder)}
                        icon={<OutlineFolderaddIcon />}
                    />
                    {/* <YakitButton
                        className={styles["file-tree-system-title-icon"]}
                        hidden={!isOpen}
                        type='text2'
                        title='最近打开'
                        onClick={()=>menuSelect()}
                        icon={<OutlinePluscircleIcon />}
                    /> */}
                </div>
            </div>
            <div hidden={!expanded} className={styles["file-tree-system-list"]}>
                {renderContent()}
            </div>
        </div>
    )
}

export default FileTreeSystemListWapper
