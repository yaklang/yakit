import {FolderDefault, FolderDefaultExpanded, KeyToIcon} from "@/pages/yakRunner/FileTree/icon"
import {FC, useMemo} from "react"
import styles from "./FileTreeSystemItem.module.scss"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {onOpenLocalFileByPath} from "@/pages/notepadManage/notepadManage/utils"
import {setClipboardText} from "@/utils/clipboard"
import {FileTreeSystemItemProps} from "../type"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitProtoCheckbox} from "@/components/TableVirtualResize/YakitProtoCheckbox/YakitProtoCheckbox"
import {AIMentionCommandParams} from "../../aiMilkdownInput/aiMilkdownMention/aiMentionPlugin"
import emiter from "@/utils/eventBus/eventBus"
import { customFolderStore } from "../store/useCustomFolder"

const FileTreeSystemItem: FC<FileTreeSystemItemProps> = ({
    data,
    isOpen,
    expanded,
    onResetTree,
    isShowRightMenu,
    checkable,
    checked,
    setChecked
}) => {
    // 文件图标
    const iconImage = useMemo(() => {
        if (!data.isFolder) return KeyToIcon[data.icon].iconPath
        if (expanded) return KeyToIcon[FolderDefaultExpanded].iconPath
        return KeyToIcon[FolderDefault].iconPath
    }, [data.icon, data.isFolder, expanded])

    // 菜单数据
    const menuData = useMemo(() => {
        const menu = [
            {
                key: "refreshFolder",
                label: "刷新",
                isHide: !(data.depth === 1 && isOpen)
            },
            {
                key: "sendToChat",
                label: "发送到自由对话",
                isHide: false
            },
            {
                type: "divider"
            },
            {
                key: "path",
                label: "复制路径",
                isHide: false
            },
            {
                key: "openFolder",
                label: "在文件夹中显示",
                isHide: false
            },
            {
                key: "closeFolder",
                label: "关闭文件夹",
                isHide: !(data.depth === 1 && isOpen)
            }
        ]

        return menu.filter((item) => !item.isHide) as YakitMenuItemType[]
    }, [data.depth, isOpen])

    // 菜单点击事件
    const handleDropdown = (key: string) => {
        switch (key) {
            case "closeFolder":
                // historyStore.removeHistoryItem(data.path)
                customFolderStore.removeCustomFolderItem(data.path)
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
            case "sendToChat":
                const params: AIMentionCommandParams = {
                    mentionId: data.path,
                    mentionType: data.isFolder ? "folder" : "file",
                    mentionName: data.path
                }
                emiter.emit(
                    "setAIInputByType",
                    JSON.stringify({
                        type: "mention",
                        params
                    })
                )
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
                getPopupContainer: () => document.body,
                visible: isShowRightMenu
            }}
        >
            <div className={styles["file-tree-system-item"]}>
                {checkable && (
                    <YakitProtoCheckbox
                        wrapperStyle={{marginBottom: 2}}
                        checked={checked}
                        onChange={(e) => {
                            e.stopPropagation()
                            setChecked?.(e.target.checked)
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                    />
                )}
                <img src={iconImage} alt='' />
                <span>{data.name}</span>
            </div>
        </YakitDropdownMenu>
    )
}

export default FileTreeSystemItem
