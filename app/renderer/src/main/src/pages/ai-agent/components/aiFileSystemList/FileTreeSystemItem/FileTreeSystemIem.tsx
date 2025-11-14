import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import {FolderDefault, FolderDefaultExpanded, KeyToIcon} from "@/pages/yakRunner/FileTree/icon"
import {FC, useMemo} from "react"
import styles from "./FileTreeSystemItem.module.scss"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {customFolderStore} from "../store/useCustomFolder"
import {onOpenLocalFileByPath} from "@/pages/notepadManage/notepadManage/utils"
import {setClipboardText} from "@/utils/clipboard"

const FileTreeSystemItem: FC<{
    data: FileNodeProps
    isOpen?: boolean
    expanded?: boolean
    onResetTree?: () => void
}> = ({data, isOpen, expanded, onResetTree}) => {
    // 文件图标
    const iconImage = useMemo(() => {
        if (!data.isFolder) return KeyToIcon[data.icon].iconPath
        if (expanded) return KeyToIcon[FolderDefaultExpanded].iconPath
        return KeyToIcon[FolderDefault].iconPath
    }, [data.icon, data.isFolder, expanded])

    // 菜单数据
    const menuData = useMemo(() => {
        return [
            ...(data.depth === 1 && isOpen
                ? [
                      {
                          key: "closeFolder",
                          label: "关闭文件夹"
                      },
                      {
                          key: "refreshFolder",
                          label: "刷新"
                      }
                  ]
                : []),
            {
                key: "openFolder",
                label: "在文件夹中显示"
            },
            {
                key: "path",
                label: "复制路径"
            }
        ]
    }, [])
    // 菜单点击事件
    const handleDropdown = (key: string) => {
        switch (key) {
            case "closeFolder":
                customFolderStore.removeCustomFolder(data.path)
                break
            case "openFolder":
                onOpenLocalFileByPath(data.path)
                break
            case "path":
                setClipboardText(data.path)
                break
            case "refreshFolder":
                onResetTree?.()
                break
            default:
                break
        }
    }
    return (
        <YakitDropdownMenu
            menu={{
                data: menuData,
                onClick({domEvent, key}) {
                    domEvent.preventDefault()
                    domEvent.stopPropagation()
                    handleDropdown(key)
                }
            }}
            dropdown={{
                trigger: ["contextMenu"],
                placement: "bottomRight",
                getPopupContainer: () => document.body
            }}
        >
            <div className={styles["file-tree-system-item"]}>
                <img src={iconImage} alt='' />
                <span>{data.name}</span>
            </div>
        </YakitDropdownMenu>
    )
}

export default FileTreeSystemItem
