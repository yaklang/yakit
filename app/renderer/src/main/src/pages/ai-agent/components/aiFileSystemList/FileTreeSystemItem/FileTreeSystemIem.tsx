import {FolderDefault, FolderDefaultExpanded, KeyToIcon} from "@/pages/yakRunner/FileTree/icon"
import {FC, useEffect, useMemo, useRef, useState} from "react"
import styles from "./FileTreeSystemItem.module.scss"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {onOpenLocalFileByPath} from "@/pages/notepadManage/notepadManage/utils"
import {setClipboardText} from "@/utils/clipboard"
import {FileTreeSystemItemProps} from "../type"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitProtoCheckbox} from "@/components/TableVirtualResize/YakitProtoCheckbox/YakitProtoCheckbox"
import {AIMentionCommandParams} from "../../aiMilkdownInput/aiMilkdownMention/aiMentionPlugin"
import emiter from "@/utils/eventBus/eventBus"
import {customFolderStore} from "../store/useCustomFolder"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {InputRef} from "antd"
import {useMemoizedFn} from "ahooks"
import {
    getPathJoin,
    getPathParent,
    grpcFetchCreateFile,
    grpcFetchCreateFolder,
    grpcFetchRenameFileTree
} from "@/pages/yakRunner/utils"
import {FileMonitorProps} from "@/utils/duplex/duplex"
import {yakitNotify} from "@/utils/notification"

// 检测原始路径分隔符
const detectPathSep = (p: string) => {
    const forward = (p.match(/\//g) || []).length
    const back = (p.match(/\\/g) || []).length
    // 哪个多就用哪个
    return back > forward ? "\\" : "/"
}
// 统一内部计算使用 /
const normalizePath = (p: string) => p.replace(/\\/g, "/")
// 替换前缀路径（适用于 selected 或 tree 子节点）
const replacePathPrefix = (targetPath: string, oldPath: string, newPath: string) => {
    const t = normalizePath(targetPath)
    const o = normalizePath(oldPath)
    const n = normalizePath(newPath)
    const sep = detectPathSep(targetPath) // 保留原始分隔符
    // 完全相等
    if (t === o) {
        return n.split("/").join(sep)
    }
    // 严格子路径（加 / 防止误匹配）
    const base = o.endsWith("/") ? o : o + "/"
    if (t.startsWith(base)) {
        const suffix = t.slice(base.length)
        const result = n + "/" + suffix
        return result.split("/").join(sep)
    }
    // 不相关路径保持原样
    return targetPath
}

const FileTreeSystemItem: FC<FileTreeSystemItemProps> = ({
    watchToken,
    data,
    isOpen,
    expanded,
    onResetTree,
    isShowRightMenu,
    treeMenuData,
    handleTreeDropdown,
    checkable,
    checked,
    setChecked,
    selected,
    setSelected
}) => {
    const inputRef = useRef<InputRef>(null)
    // 是否可输入
    const [isInput, setIsInput] = useState<boolean>(false)
    const [inputVal, setInputVal] = useState<string>("")
    useEffect(() => {
        if (data.isCreate || data.isRename) {
            setIsInput(true)
            setInputVal(data.name)
            if (data.name) {
                setTimeout(() => {
                    inputRef.current?.setSelectionRange(0, data.name.lastIndexOf("."))
                }, 100)
            }
        }
    }, [data.isCreate, data.isRename, data.name])

    // input 失去焦点或回车
    const onInputOk = useMemoizedFn(() => {
        if (data.isCreate) {
            onCreateFun()
        } else if (data.isRename) {
            onRenameFun()
        }
    })

    // 创建文件夹或文件
    const onCreateFun = useMemoizedFn(async () => {
        if (!inputVal.length || !data.parent) return

        // 删除旧的临时文件夹或文件
        const event: FileMonitorProps = {
            Id: watchToken,
            CreateEvents: [],
            DeleteEvents: [
                {
                    Path: data.path,
                    Op: "delete",
                    IsDir: data.isFolder
                }
            ],
            ChangeEvents: []
        }
        emiter.emit("onRefreshYakRunnerFileTree", JSON.stringify(event))

        let fileName = inputVal
        let lastDotIndex = inputVal.lastIndexOf(".")
        // 文件路径中没有点号，即没有后缀
        if (lastDotIndex === -1 && !data.isFolder) {
            fileName = `${inputVal}.yak`
        }

        let flag = false
        let currentPath = ""
        try {
            let currentPath = await getPathJoin(data.parent, fileName)
            if (currentPath.length === 0) {
                throw new Error("路径拼接失败")
            }
            // 区分新建文件夹 新建文件接口
            const result = data.isFolder
                ? await grpcFetchCreateFolder(currentPath, data.parent)
                : await grpcFetchCreateFile(currentPath, null, data.parent)
            if (result.length === 0) {
                throw new Error("创建失败")
            }
            flag = true
        } catch (error) {
            yakitNotify("error", error + "")
        } finally {
            if (flag && currentPath.length) {
                // 新增节点数据
                const event: FileMonitorProps = {
                    Id: watchToken,
                    CreateEvents: [
                        {
                            Path: currentPath,
                            Op: "create",
                            IsDir: data.isFolder
                        }
                    ],
                    DeleteEvents: [],
                    ChangeEvents: []
                }
                emiter.emit("onRefreshYakRunnerFileTree", JSON.stringify(event))
                yakitNotify("success", "创建成功")
            }
            setTimeout(() => {
                setInputVal("")
            }, 300)
        }
    })

    // 重命名
    const onRenameFun = useMemoizedFn(async () => {
        if (!inputVal.length) return
        const oldPath = data.path
        try {
            if (inputVal === data.name) {
                throw new Error("重命名相同")
            }
            const parentPath = await getPathParent(oldPath)
            const newPath = await getPathJoin(parentPath, inputVal)
            if (!newPath) throw new Error("重命名路径拼接失败")
            // 调接口更新文件/文件夹名字
            const result = await grpcFetchRenameFileTree(oldPath, inputVal, parentPath)
            if (!result.length) throw new Error("重命名失败")
            // 更新文件树节点数据
            const event: FileMonitorProps = {
                Id: watchToken,
                CreateEvents: [],
                DeleteEvents: [],
                ChangeEvents: [{Op: "rename", Path: oldPath, NewPath: newPath, IsDir: data.isFolder}]
            }
            emiter.emit("onRefreshYakRunnerFileTree", JSON.stringify(event))
            if (selected?.path) {
                const updatedPath = replacePathPrefix(selected.path, oldPath, newPath)
                if (updatedPath !== selected.path) {
                    const name = selected.path === oldPath ? inputVal : selected.name
                    const newSelected = {...selected, path: updatedPath, name: name}
                    setSelected(newSelected)
                }
            }
            yakitNotify("success", "重命名成功")
        } catch (error) {
            // 回滚旧文件树节点
            const event: FileMonitorProps = {
                Id: watchToken,
                CreateEvents: [],
                DeleteEvents: [],
                ChangeEvents: [
                    {
                        Op: "renameRollback",
                        Path: oldPath,
                        IsDir: data.isFolder
                    }
                ]
            }
            emiter.emit("onRefreshYakRunnerFileTree", JSON.stringify(event))
            yakitNotify("error", error + "")
        } finally {
            setTimeout(() => {
                setIsInput(false)
                setInputVal("")
            }, 300)
        }
    })

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
                label: <span style={{color: "var(--Colors-Use-Error-Primary)"}}>移除</span>,
                isHide: !(data.depth === 1 && isOpen)
            }
        ]

        return menu.filter((item) => !item.isHide) as YakitMenuItemType[]
    }, [data.depth, isOpen])

    // 菜单点击事件
    const handleDropdown = (key: string) => {
        if (handleTreeDropdown) {
            handleTreeDropdown(data, key)
            return
        }
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
                data: treeMenuData?.(data) || menuData,
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
                {isInput ? (
                    <div className={styles["file-tree-input-wrapper"]}>
                        <YakitInput
                            ref={inputRef}
                            wrapperClassName={styles["file-tree-input"]}
                            className={styles["file-tree-input"]}
                            value={inputVal}
                            onChange={(e) => {
                                setInputVal(e.target.value)
                            }}
                            autoFocus
                            onBlur={onInputOk}
                            onPressEnter={onInputOk}
                            size='small'
                        />
                    </div>
                ) : (
                    <span>{data.name}</span>
                )}
            </div>
        </YakitDropdownMenu>
    )
}

export default FileTreeSystemItem
