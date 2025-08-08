import React, {useEffect, useMemo, useRef, useState} from "react"
import {API} from "@/services/swagger/resposeType"
import styles from "../NewPayload.module.scss"
import {UserInfoProps, useStore} from "@/store"
import {isEnpriTrace} from "@/utils/envfile"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineClouddownloadIcon,
    OutlineDatabasebackupIcon,
    OutlineDocumentduplicateIcon,
    OutlineExportIcon,
    OutlineImportIcon,
    OutlinePencilaltIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {useControllableValue, useMemoizedFn, useUpdateEffect} from "ahooks"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import NoPermissions from "@/assets/no_permissions.png"
import Login from "../../Login"
import {
    SolidChevrondownIcon,
    SolidChevronrightIcon,
    SolidDatabaseIcon,
    SolidDocumenttextIcon,
    SolidDotsverticalIcon,
    SolidDragsortIcon,
    SolidFolderopenIcon
} from "@/assets/icon/solid"
import classNames from "classnames"
import {
    DataItem,
    DeleteConfirm,
    findFoldersById,
    findItemByGroup,
    isIncludeSpecial,
    isPayloadOperator,
    UploadOrDownloadByPayloadGrpc
} from "../newPayload"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {setClipboardText} from "@/utils/clipboard"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {failed, success, warn} from "@/utils/notification"
import {apiDeleteOnlinePayloadList, apiGetOnlinePayloadGroup, apiRenameOnlinePayload} from "../utils"
import emiter from "@/utils/eventBus/eventBus"
const {ipcRenderer} = window.require("electron")

interface OnlineFolderComponentProps {
    folder: DataItem
    selectItem?: string
    setSelectItem: (id: string) => void
    data: DataItem[]
    setData: (v: DataItem[]) => void
    // 文件夹不展开记录
    notExpandArr: string[]
    setNotExpandArr: (v: string[]) => void
    setContentType: (v?: "editor" | "table") => void
    showType: "online" | "local"
    userInfo: UserInfoProps
}

export const OnlineFolderComponent: React.FC<OnlineFolderComponentProps> = (props) => {
    const {
        folder,
        selectItem,
        setSelectItem,
        data,
        setData,
        notExpandArr,
        setNotExpandArr,
        setContentType,
        showType,
        userInfo
    } = props
    const [menuOpen, setMenuOpen] = useState<boolean>(false)
    const [isEditInput, setEditInput] = useState<boolean>(folder.isCreate === true)
    const [inputName, setInputName] = useState<string>(folder.name)
    // delete
    const [deleteVisible, setDeleteVisible] = useState<boolean>(false)
    const [downloadVisible, setDownloadVisible] = useState<boolean>(false)
    const getAllFolderName = useMemoizedFn(() => {
        return data.filter((item) => item.type === "Folder").map((item) => item.name)
    })
    const setFolderNameById = useMemoizedFn(() => {
        // 文件夹只会存在第一层 不用递归遍历
        const newData = data.map((item) => {
            if (item.id === folder.id) {
                return {...item, name: inputName}
            }
            return item
        })
        setData(newData)
    })
    // 更改文件名
    const onChangeValue = useMemoizedFn(() => {
        setEditInput(false)
        const allFolderName = getAllFolderName()
        const pass: boolean = !isIncludeSpecial(inputName)
        if (inputName.length > 0 && !allFolderName.includes(inputName) && pass) {
            apiRenameOnlinePayload({
                type: "folder",
                name: folder.name,
                newName: inputName
            })
                .then(() => {
                    success("修改成功")
                    setInputName(inputName)
                    setFolderNameById()
                })
                .catch((e: any) => {
                    setInputName(folder.name)
                    failed(`编辑失败：${e}`)
                })
        } else {
            !pass && warn("名称不允许出现/*,")
            // 创建时为空则不创建
            if (folder.isCreate) {
                setData(data.filter((item) => !item.isCreate))
                allFolderName.includes(inputName) && inputName.length !== 0 && warn("文件夹名重复，不可创建")
            }
            // 编辑时为空恢复
            else {
                // 没有修改
                setInputName(folder.name)
                folder.name !== inputName && allFolderName.includes(inputName) && warn("文件夹名重复，不可编辑")
            }
        }
    })

    const onDeleteFolderById = useMemoizedFn((id: string) => {
        // 文件夹只会存在第一层 不用递归遍历
        const newData = data.filter((item) => item.id !== id)
        setData(newData)
        // 如果删除的包含选中项 则重新选择
        const sourceFolders = findFoldersById(data, id)
        if (sourceFolders && sourceFolders?.node && showType === "online") {
            let results = sourceFolders.node.find((item) => item.id === selectItem)
            if (results) setContentType(undefined)
        }
    })

    // 删除文件夹
    const onDeleteFolder = useMemoizedFn(() => {
        apiDeleteOnlinePayloadList({
            name: folder.name
        })
            .then(() => {
                success("删除成功")
                onDeleteFolderById(folder.id)
                setDeleteVisible(false)
            })
            .catch((e: any) => {
                setDeleteVisible(false)
                failed(`删除失败：${e}`)
            })
    })

    // 右键展开菜单
    const handleRightClick = useMemoizedFn((e) => {
        e.preventDefault()
        setMenuOpen(true)
    })
    return (
        <>
            {isEditInput ? (
                <div className={styles["file-input"]} style={{paddingLeft: 8}}>
                    <YakitInput
                        value={inputName}
                        autoFocus
                        showCount
                        maxLength={50}
                        onPressEnter={() => {
                            onChangeValue()
                        }}
                        onBlur={() => {
                            onChangeValue()
                        }}
                        onChange={(e) => {
                            setInputName(e.target.value)
                        }}
                    />
                </div>
            ) : (
                <div style={{display: "flex", alignItems: "center"}}>
                    <div
                        style={{flex: 1}}
                        className={classNames(styles["folder"], {
                            [styles["folder-active"]]: folder.id === selectItem,
                            [styles["folder-no-active"]]: folder.id !== selectItem,
                            [styles["folder-menu"]]: menuOpen,
                            [styles["folder-no-combine"]]: true,
                            [styles["folder-border"]]: !menuOpen && notExpandArr.includes(folder.id)
                        })}
                        onClick={() => {
                            if (notExpandArr.includes(folder.id)) {
                                setNotExpandArr(notExpandArr.filter((item) => item !== folder.id))
                            } else {
                                setNotExpandArr([...notExpandArr, folder.id])
                            }
                        }}
                        onContextMenu={handleRightClick}
                    >
                        <div className={styles["folder-header"]}>
                            <div className={styles["is-fold-icon"]}>
                                {!notExpandArr.includes(folder.id) ? (
                                    <SolidChevrondownIcon />
                                ) : (
                                    <SolidChevronrightIcon />
                                )}
                            </div>
                            <div className={styles["folder-icon"]}>
                                <SolidFolderopenIcon />
                            </div>
                            <div className={classNames(styles["folder-name"], "yakit-content-single-ellipsis")}>
                                {inputName}
                            </div>
                        </div>
                        <div
                            className={classNames(styles["extra"], {
                                [styles["extra-dot"]]: menuOpen,
                                [styles["extra-hover"]]: !menuOpen
                            })}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={styles["file-count"]}>{folder?.node ? folder.node.length : 0}</div>

                            <YakitDropdownMenu
                                menu={{
                                    data: [
                                        {
                                            key: "copyFuzztag",
                                            label: (
                                                <div className={styles["extra-menu"]}>
                                                    <OutlineDocumentduplicateIcon />
                                                    <div className={styles["menu-name"]}>复制 Fuzztag</div>
                                                </div>
                                            )
                                        },
                                        {
                                            key: "rename",
                                            label: (
                                                <div className={styles["extra-menu"]}>
                                                    <OutlinePencilaltIcon />
                                                    <div className={styles["menu-name"]}>重命名</div>
                                                </div>
                                            ),
                                            disabled: !isPayloadOperator(userInfo)
                                        },
                                        {
                                            key: "download",
                                            label: (
                                                <div className={styles["extra-menu"]}>
                                                    <OutlineClouddownloadIcon />
                                                    <div className={styles["menu-name"]}>下载</div>
                                                </div>
                                            )
                                        },
                                        {
                                            type: "divider"
                                        },
                                        {
                                            key: "delete",
                                            label: (
                                                <div className={styles["extra-menu"]}>
                                                    <OutlineTrashIcon />
                                                    <div className={styles["menu-name"]}>删除</div>
                                                </div>
                                            ),
                                            type: "danger",
                                            disabled: !isPayloadOperator(userInfo)
                                        }
                                    ],
                                    onClick: ({key}) => {
                                        setMenuOpen(false)
                                        switch (key) {
                                            case "copyFuzztag":
                                                setClipboardText(`{{payload(${inputName}/*)}}`)
                                                break

                                            case "rename":
                                                setEditInput(true)
                                                break
                                            case "download":
                                                setDownloadVisible(true)
                                                break
                                            case "delete":
                                                setDeleteVisible(true)
                                                break
                                            default:
                                                break
                                        }
                                    }
                                }}
                                dropdown={{
                                    trigger: ["click"],
                                    placement: "bottomRight",
                                    onVisibleChange: (v) => {
                                        setMenuOpen(v)
                                    },
                                    visible: menuOpen
                                }}
                            >
                                <div className={styles["extra-icon"]}>
                                    <SolidDotsverticalIcon />
                                </div>
                            </YakitDropdownMenu>
                        </div>
                    </div>
                </div>
            )}

            <>
                {!notExpandArr.includes(folder.id) && (
                    <>
                        {Array.isArray(folder.node) &&
                            folder.node.map((file, index) => (
                                <OnlineFileComponent
                                    key={file.id}
                                    file={file}
                                    folder={folder.name}
                                    selectItem={selectItem}
                                    setSelectItem={setSelectItem}
                                    data={data}
                                    setData={setData}
                                    isInside={true}
                                    endBorder={(folder.node?.length || 0) - 1 === index}
                                    setContentType={setContentType}
                                    showType={showType}
                                    userInfo={userInfo}
                                />
                            ))}
                    </>
                )}
            </>

            {deleteVisible && (
                <DeleteConfirm visible={deleteVisible} setVisible={setDeleteVisible} onFinish={onDeleteFolder} />
            )}

            {downloadVisible && (
                <UploadOrDownloadByPayloadGrpc
                    group={""}
                    folder={folder.name}
                    setUploadOrDownloadVisible={setDownloadVisible}
                    type='download'
                    finished={() => {
                        emiter.emit("refreshListEvent")
                    }}
                />
            )}
        </>
    )
}

interface OnlineFileComponentProps {
    file: DataItem
    folder?: string
    selectItem?: string
    setSelectItem: (id: string) => void
    data: DataItem[]
    setData: (v: DataItem[]) => void
    // 是否为内层
    isInside?: boolean
    // 是否在其底部显示border
    endBorder?: boolean
    setContentType: (v?: "editor" | "table") => void
    showType: "online" | "local"
    userInfo: UserInfoProps
}
export const OnlineFileComponent: React.FC<OnlineFileComponentProps> = (props) => {
    const {
        file,
        folder,
        selectItem,
        setSelectItem,
        data,
        setData,
        isInside = true,
        endBorder,
        setContentType,
        showType,
        userInfo
    } = props
    const [menuOpen, setMenuOpen] = useState<boolean>(false)
    const [inputName, setInputName] = useState<string>(file.name)
    const [isEditInput, setEditInput] = useState<boolean>(file.isCreate === true)
    // delete
    const [deleteVisible, setDeleteVisible] = useState<boolean>(false)
    const [downloadVisible, setDownloadVisible] = useState<boolean>(false)
    // 根据Id修改文件名
    const setFileById = useMemoizedFn((id: string, newName: string) => {
        const copyData: DataItem[] = JSON.parse(JSON.stringify(data))
        const selectData = findFoldersById(copyData, id)
        if (selectData) {
            if (selectData.type === "Folder") {
                let node =
                    selectData.node?.map((item) => {
                        if (item.id === id) {
                            return {...item, name: newName}
                        }
                        return item
                    }) || []
                const newData = copyData.map((item) => {
                    if (item.id === selectData.id) {
                        return {...item, node}
                    }
                    return item
                })
                setData(newData)
            } else {
                const newData = copyData.map((item) => {
                    if (item.id === id) {
                        return {...item, name: newName}
                    }
                    return item
                })
                setData(newData)
            }
        }
    })
    // 获取所有文件名
    const getAllFileName = useMemoizedFn(() => {
        let name: string[] = []
        data.forEach((item) => {
            if (item.type !== "Folder") {
                name.push(item.name)
            }
            if (item.node) {
                item.node.forEach((itemIn) => {
                    name.push(itemIn.name)
                })
            }
        })
        return name
    })
    // 更改文件名
    const onChangeValue = useMemoizedFn(() => {
        setEditInput(false)
        const allFileName = getAllFileName()
        const pass: boolean = !isIncludeSpecial(inputName)
        if (inputName.length > 0 && !allFileName.includes(inputName) && pass) {
            apiRenameOnlinePayload({
                type: "group",
                name: file.name,
                newName: inputName
            })
                .then(() => {
                    success("修改成功")
                    setInputName(inputName)
                    setFileById(file.id, inputName)
                })
                .catch((e: any) => {
                    setInputName(file.name)
                    failed(`编辑失败：${e}`)
                })
        } else {
            file.name !== inputName && allFileName.includes(inputName) && warn("名称重复，编辑失败")
            !pass && warn("名称不允许出现/*,")
            setInputName(file.name)
        }
    })
    // 根据Id删除文件
    const onDeletePayloadById = useMemoizedFn((id: string) => {
        const copyData: DataItem[] = JSON.parse(JSON.stringify(data))
        const selectData = findFoldersById(copyData, id)
        if (selectData) {
            if (selectData.type === "Folder") {
                let node = selectData.node?.filter((item) => item.id !== id)
                const newData = copyData.map((item) => {
                    if (item.id === selectData.id && node) {
                        return {...item, node}
                    } else if (item.id === selectData.id && node === undefined) {
                        delete item.node
                        return item
                    }
                    return item
                })
                setData(newData)
                let results = selectData.node?.find((item) => item.id === selectItem)
                if (results && showType === "online") setContentType(undefined)
            } else {
                const newData = copyData.filter((item) => item.id !== id)
                setData(newData)

                if (selectItem === id && showType === "online") setContentType(undefined)
            }
        }
    })

    // 删除Payload
    const onDeletePayload = useMemoizedFn(() => {
        apiDeleteOnlinePayloadList({group: file.name})
            .then(() => {
                success("删除成功")
                onDeletePayloadById(file.id)
                setDeleteVisible(false)
            })
            .catch((e: any) => {
                setDeleteVisible(false)
                failed(`删除失败：${e}`)
            })
    })
    const fileMenuData = useMemo(() => {
        // 此处数据库导出为csv 文件导出为txt
        return [
            {
                key: "copyFuzztag",
                label: (
                    <div className={styles["extra-menu"]}>
                        <OutlineDocumentduplicateIcon />
                        <div className={styles["menu-name"]}>复制 Fuzztag</div>
                    </div>
                )
            },
            {
                key: "rename",
                label: (
                    <div className={styles["extra-menu"]}>
                        <OutlinePencilaltIcon />
                        <div className={styles["menu-name"]}>重命名</div>
                    </div>
                ),
                disabled: !isPayloadOperator(userInfo)
            },
            {
                key: "download",
                label: (
                    <div className={styles["extra-menu"]}>
                        <OutlineClouddownloadIcon />
                        <div className={styles["menu-name"]}>下载</div>
                    </div>
                )
            },
            {
                type: "divider"
            },
            {
                key: "delete",
                label: (
                    <div className={styles["extra-menu"]}>
                        <OutlineTrashIcon />
                        <div className={styles["menu-name"]}>删除</div>
                    </div>
                ),
                type: "danger",
                disabled: !isPayloadOperator(userInfo)
            }
        ]
    }, [userInfo])

    // 右键展开菜单
    const handleRightClick = useMemoizedFn((e) => {
        e.preventDefault()
        setSelectItem(file.id)
        setMenuOpen(true)
    })
    return (
        <>
            {isEditInput ? (
                <div className={styles["file-input"]} style={{paddingLeft: isInside ? 28 : 8}}>
                    <YakitInput
                        value={inputName}
                        autoFocus
                        showCount
                        maxLength={50}
                        onPressEnter={() => {
                            onChangeValue()
                        }}
                        onBlur={() => {
                            onChangeValue()
                        }}
                        onChange={(e) => {
                            setInputName(e.target.value)
                        }}
                    />
                </div>
            ) : (
                <div style={{display: "flex", alignItems: "center"}}>
                    <div
                        style={{flex: 1}}
                        className={classNames(styles["file"], {
                            [styles["file-active"]]: file.id === selectItem,
                            [styles["file-no-active"]]: file.id !== selectItem,
                            [styles["file-menu"]]: menuOpen && file.id !== selectItem,
                            [styles["file-outside"]]: !isInside,
                            [styles["file-inside"]]: isInside,
                            [styles["file-dragging"]]: !isInside,
                            [styles["file-end-border"]]: endBorder
                        })}
                        onClick={() => {
                            setSelectItem(file.id)
                        }}
                        onContextMenu={handleRightClick}
                    >
                        <div className={styles["file-header"]}>
                            {file.type === "DataBase" ? (
                                <div className={classNames(styles["file-icon"], styles["file-icon-database"])}>
                                    <SolidDatabaseIcon />
                                </div>
                            ) : (
                                <div className={classNames(styles["file-icon"], styles["file-icon-document"])}>
                                    <SolidDocumenttextIcon />
                                </div>
                            )}

                            <div className={styles["file-name"]}>{inputName}</div>
                        </div>
                        <div
                            className={classNames(styles["extra"], {
                                [styles["extra-dot"]]: menuOpen,
                                [styles["extra-hover"]]: !menuOpen
                            })}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={styles["file-count"]}>{file.type === "DataBase" ? file.number : ""}</div>
                            <YakitDropdownMenu
                                menu={{
                                    data: fileMenuData as YakitMenuItemProps[],
                                    onClick: ({key}) => {
                                        setMenuOpen(false)
                                        switch (key) {
                                            case "copyFuzztag":
                                                setClipboardText(`{{payload(${inputName})}}`)
                                                break
                                            case "rename":
                                                setEditInput(true)
                                                break
                                            case "download":
                                                setDownloadVisible(true)
                                                break
                                            case "delete":
                                                setDeleteVisible(true)
                                                break
                                            default:
                                                break
                                        }
                                    }
                                }}
                                dropdown={{
                                    overlayClassName: styles["payload-list-menu"],
                                    trigger: ["click"],
                                    placement: "bottomRight",
                                    onVisibleChange: (v) => {
                                        setMenuOpen(v)
                                    },
                                    visible: menuOpen
                                }}
                            >
                                <div className={styles["extra-icon"]}>
                                    <SolidDotsverticalIcon />
                                </div>
                            </YakitDropdownMenu>
                        </div>
                    </div>
                </div>
            )}
            {deleteVisible && (
                <DeleteConfirm visible={deleteVisible} setVisible={setDeleteVisible} onFinish={onDeletePayload} />
            )}

            {downloadVisible && (
                <UploadOrDownloadByPayloadGrpc
                    group={file.name}
                    folder={folder || ""}
                    setUploadOrDownloadVisible={setDownloadVisible}
                    type='download'
                    finished={() => {
                        emiter.emit("refreshListEvent")
                    }}
                />
            )}
        </>
    )
}

interface OnlinePayloadGroupListProps {
    userInfo: UserInfoProps
    onQueryGroup: () => void
    data: DataItem[]
    setData: (v: DataItem[]) => void
    selectItem?: string
    setSelectItem: (id: string) => void
    setContentType: (v?: "editor" | "table") => void
    loading: boolean
    showType: "online" | "local"
}

export const OnlinePayloadGroupList: React.FC<OnlinePayloadGroupListProps> = (props) => {
    const {userInfo, onQueryGroup, data, setData, selectItem, setSelectItem, setContentType, loading, showType} = props

    const [loginShow, setLoginShow] = useState<boolean>(false)
    // 用于记录不展开的文件夹(默认展开)
    const [notExpandArr, setNotExpandArr] = useState<string[]>([])
    const onLogin = useMemoizedFn(() => {
        setLoginShow(true)
    })
    const onLoadCancel = useMemoizedFn(() => {
        setLoginShow(false)
    })
    const isLoadList = useMemo(() => {
        if (isEnpriTrace()) {
            return userInfo.isLogin && userInfo.token
        } else {
            return false
        }
    }, [userInfo])

    useEffect(() => {
        if (isLoadList) {
            onQueryGroup()
        }
    }, [isLoadList])
    
    return (
        <div className={styles["new-payload-group-list"]}>
            {isLoadList ? (
                <>
                    {data.length === 0 ? (
                        <YakitSpin spinning={loading}>
                            <YakitEmpty title='暂无数据' />
                        </YakitSpin>
                    ) : (
                        <div className={styles["online-payload-group-list"]}>
                            {data.map((item, index) => {
                                return (
                                    <>
                                        {/* 渲染你的文件夹或文件组件 */}
                                        {/* 使用 item.type 来区分文件夹和文件 */}
                                        {item.type === "Folder" ? (
                                            // 渲染文件夹组件
                                            <OnlineFolderComponent
                                                key={item.id}
                                                folder={item}
                                                selectItem={selectItem}
                                                setSelectItem={setSelectItem}
                                                data={data}
                                                setData={setData}
                                                notExpandArr={notExpandArr}
                                                setNotExpandArr={setNotExpandArr}
                                                setContentType={setContentType}
                                                showType={showType}
                                                userInfo={userInfo}
                                            />
                                        ) : (
                                            // 渲染文件组件
                                            <OnlineFileComponent
                                                key={item.id}
                                                file={item}
                                                selectItem={selectItem}
                                                setSelectItem={setSelectItem}
                                                data={data}
                                                setData={setData}
                                                setContentType={setContentType}
                                                showType={showType}
                                                userInfo={userInfo}
                                                isInside={false}
                                            />
                                        )}
                                    </>
                                )
                            })}
                            <div className={styles["to-end"]}>已经到底啦～</div>
                        </div>
                    )}
                </>
            ) : (
                <>
                    <YakitEmpty
                        image={<img src={NoPermissions} alt='' />}
                        imageStyle={{width: 220, height: 150, margin: "auto"}}
                        title='暂无查看权限'
                        description='登录后即可查看'
                    />
                    <YakitButton style={{width: 200}} type='outline1' onClick={() => onLogin()}>
                        立即登录
                    </YakitButton>
                    {loginShow && <Login visible={loginShow} onCancel={onLoadCancel} />}
                </>
            )}
        </div>
    )
}

// 将后端结构数据捏成渲染数组
const onlineNodesToDataFun = (nodes: API.PayloadGroupNode[]) => {
    return nodes.map((item) => {
        const {type, name, nodes} = item
        let obj = {
            ...item,
            id: `${type}-${name}-online`
        } as DataItem
        if (nodes && nodes.length > 0) {
            return {
                ...obj,
                node: nodes.map((itemIn) => ({
                    ...itemIn,
                    id: `${itemIn.type}-${itemIn.name}-online`
                }))
            }
        }
        return obj
    })
}

export interface NewPayloadOnlineListProps {
    setGroup: (v: string) => void
    setFolder: (v: string) => void
    setContentType: (v?: "editor" | "table") => void
    showType: "local" | "online"
    setShowType: (v: "local" | "online") => void
}
export const NewPayloadOnlineList: React.FC<NewPayloadOnlineListProps> = (props) => {
    const {setContentType, setGroup, setFolder, showType, setShowType} = props

    // table/editor 筛选条件
    const [selectItem, setSelectItem] = useState<string>()
    const [data, setData] = useState<DataItem[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const userInfo = useStore((s) => s.userInfo)

    useUpdateEffect(() => {
        if (showType !== "online") {
            setSelectItem(undefined)
        }
    }, [showType])

    const eeIsLogin = useMemo(() => {
        return isEnpriTrace() && userInfo.isLogin && userInfo.token
    }, [userInfo])

    const reset = useMemoizedFn(() => {
        showType === "online" && setContentType(undefined)
        setSelectItem(undefined)
        setGroup("")
        setFolder("")
    })

    const onQueryGroup = useMemoizedFn(() => {
        setLoading(true)
        apiGetOnlinePayloadGroup()
            .then((res) => {
                let newData: DataItem[] = onlineNodesToDataFun(res.nodes || []) as DataItem[]
                setData(newData)
            })
            .catch((e: any) => {
                failed(`获取线上字典列表失败：${e}`)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 100)
            })
    })

    const onRefreshListEvent = useMemoizedFn(() => {
        onQueryGroup()
    })

    useEffect(() => {
        emiter.on("refreshOnlineListEvent", onRefreshListEvent)
        return () => {
            emiter.off("refreshOnlineListEvent", onRefreshListEvent)
        }
    }, [])

    useEffect(() => {
        if (selectItem) {
            const selectData = findFoldersById(data, selectItem)
            if (selectData) {
                if (selectData.type === "Folder") {
                    setFolder(selectData.name)
                    let item = selectData.node?.filter((item) => item.id === selectItem) || []
                    let group: string = item.length > 0 ? item[0].name : ""
                    let type: string = item.length > 0 ? item[0].type : ""
                    setGroup(group)
                    setContentType(type === "DataBase" ? "table" : "editor")
                    setShowType("online")
                } else {
                    setFolder("")
                    setGroup(selectData.name)
                    setContentType(selectData.type === "DataBase" ? "table" : "editor")
                    setShowType("online")
                }
            }
        }
    }, [selectItem])

    return (
        <>
            <div className={styles["new-payload-online-list"]}>
                <div className={styles["online-group-header"]}>
                    <span className={styles["online-group-desc"]}>
                        线上Payload
                        {eeIsLogin ? "（下载即可使用）" : "（登录即可下载使用）"}
                    </span>
                </div>
                <div className={styles["group-list"]}>
                    <OnlinePayloadGroupList
                        loading={loading}
                        userInfo={userInfo}
                        onQueryGroup={onQueryGroup}
                        data={data}
                        setData={setData}
                        selectItem={selectItem}
                        setSelectItem={setSelectItem}
                        setContentType={setContentType}
                        showType={showType}
                    />
                </div>
            </div>
        </>
    )
}
