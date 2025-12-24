import {handleOpenFileSystemDialog, type OpenDialogOptions} from "@/utils/fileSystemDialog"
import {FileListTileMenu, FileTreeSystemListWapperProps} from "../type"
import {type FC, useMemo} from "react"
import {useMemoizedFn} from "ahooks"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import styles from "./FileTreeSystemListWapper.module.scss"
import FileTreeSystemList from "../FileTreeSystemList/FileTreeSystemList"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {OutlinePluscircleIcon} from "@/assets/icon/outline"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"

const FileTreeSystemListWapper: FC<FileTreeSystemListWapperProps> = ({
    path,
    title,
    isOpen,
    selected,
    historyFolder,
    setOpenFolder,
    setSelected,
    onTreeDragStart,
    onTreeDragEnd
}) => {
    const onOpenFileFolder = async (flag) => {
        try {
            const label = flag ? "文件夹" : "文件"
            const args: OpenDialogOptions["properties"] = flag ? ["openDirectory"] : ["openFile"]
            const {filePaths} = await handleOpenFileSystemDialog({title: `请选择${label}`, properties: args})
            if (!filePaths.length) return
            let absolutePath: string = filePaths[0].replace(/\\/g, "\\")
            setOpenFolder?.(absolutePath, flag)
        } catch {}
    }
    const renderContent = useMemoizedFn(() => {
        if (isOpen && path.length === 0) {
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
        return path.map((item) => (
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
    console.log("renderContent:", renderContent)
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
                const isFolder = historyFolder?.find((i) => i.path === key)?.isFolder ?? true
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
                </YakitDropdownMenu>
            </div>
            {renderContent()}
        </div>
    )
}

export default FileTreeSystemListWapper
