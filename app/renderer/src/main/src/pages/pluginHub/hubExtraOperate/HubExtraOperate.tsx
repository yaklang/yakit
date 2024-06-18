import React, {ForwardedRef, forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {
    OutlineClouddownloadIcon,
    OutlineClouduploadIcon,
    OutlineDotshorizontalIcon,
    OutlineLockopenIcon,
    OutlinePencilaltIcon,
    OutlineShareIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {CodeScoreModule, FuncFilterPopover} from "@/pages/plugins/funcTemplate"
import {API} from "@/services/swagger/resposeType"
import {YakScript} from "@/pages/invoker/schema"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {yakitNotify} from "@/utils/notification"
import {AddPluginMenuContent, HubButton, HubOperateHint, RemovePluginMenuContent} from "./funcTemplate"
import {getRemoteValue} from "@/utils/kv"
import {RemotePluginGV} from "@/enums/plugin"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {
    apiDeletePluginMine,
    apiDeleteYakScriptByIds,
    apiUpdatePluginPrivateMine,
    onToEditPlugin
} from "@/pages/plugins/utils"
import {YakitPluginOnlineDetail} from "@/pages/plugins/online/PluginsOnlineType"
import {useStore} from "@/store"
import {PluginLocalUploadSingle} from "@/pages/plugins/local/PluginLocalUpload"
import useListenWidth from "../hooks/useListenWidth"
import {PluginLocalExport} from "@/pages/plugins/local/PluginLocalExportProps"
import {ExportParamsProps} from "@/pages/plugins/local/PluginsLocalType"
import {DefaultExportRequest, PluginOperateHint} from "../defaultConstant"
import {NoPromptHint} from "../utilsUI/UtilsTemplate"

import classNames from "classnames"
import styles from "./HubExtraOperate.module.scss"

const {ipcRenderer} = window.require("electron")

export interface HubExtraOperateRef {
    downloadedNext: (flag: boolean) => void
}

export interface HubExtraOperateProps {
    ref?: ForwardedRef<HubExtraOperateRef>
    /** 上层元素的id */
    getContainer?: string
    online?: YakitPluginOnlineDetail
    local?: YakScript
    /** 下载loading状态 */
    downloadLoading?: boolean
    /** 激活下载 */
    onDownload: () => void
    /** 插件操作完成后的回调事件 */
    onCallback?: (type: string) => void
}

export const HubExtraOperate: React.FC<HubExtraOperateProps> = memo(
    forwardRef((props, ref) => {
        const {getContainer, online, local, downloadLoading, onDownload, onCallback} = props

        useImperativeHandle(
            ref,
            () => ({
                downloadedNext: onDownloadedNext
            }),
            []
        )

        const userInfo = useStore((s) => s.userInfo)

        const wrapperWidth = useListenWidth(getContainer || "")

        // 是否是内置插件
        const isCorePlugin = useMemo(() => {
            if (!local) return false
            return !!local.IsCorePlugin
        }, [local])
        // 本地是否存在更新
        const isUpdate = useMemo(() => {
            if (!online || !local) return false
            return Number(online.updated_at || 0) > Number(local.UpdatedAt || 0)
        }, [online, local])

        const menuData = useMemo(() => {
            // 内置插件功能
            if (isCorePlugin) {
                const menus: YakitMenuItemType[] = [
                    {
                        key: "addMenu",
                        label: "添加到菜单栏",
                        itemIcon: <OutlineTrashIcon />,
                        type: !!local ? undefined : "info"
                    },
                    {
                        key: "removeMenu",
                        label: "移出菜单栏",
                        itemIcon: <OutlineTrashIcon />,
                        type: !!local ? undefined : "info"
                    },
                    {
                        key: "export",
                        label: "导出",
                        itemIcon: <OutlineTrashIcon />,
                        type: !!local ? undefined : "info"
                    }
                ]
                return [...menus]
            }

            // 非内置插件
            const isAuth = online ? online.isAuthor : false
            let first: YakitMenuItemType[] = []
            let second: YakitMenuItemType[] = []

            if (isAuth) {
                first.push({
                    key: "status",
                    label: online?.is_private ? "改为公开" : "改为私密",
                    itemIcon: <OutlineLockopenIcon />
                })
                second.push({
                    key: "delOnline",
                    label: "删除线上",
                    itemIcon: <OutlineTrashIcon />,
                    type: "danger"
                })
            }

            const isLocal = !!local
            first = first.concat([
                {
                    key: "addMenu",
                    label: "添加到菜单栏",
                    itemIcon: <OutlineTrashIcon />,
                    type: isLocal ? undefined : "info"
                },
                {
                    key: "removeMenu",
                    label: "移出菜单栏",
                    itemIcon: <OutlineTrashIcon />,
                    type: isLocal ? undefined : "info"
                },
                {
                    key: "export",
                    label: "导出",
                    itemIcon: <OutlineTrashIcon />,
                    type: isLocal ? undefined : "info"
                }
            ])

            if (isLocal) {
                second.push({
                    key: "delLocal",
                    label: "删除本地",
                    itemIcon: <OutlineTrashIcon />,
                    type: "danger"
                })
            }

            let menus: YakitMenuItemType[] = [...first]
            if (second.length > 0) menus = [...menus, {type: "divider"}, ...second]

            return menus
        }, [isCorePlugin, online, local])

        useEffect(() => {
            getRemoteValue(RemotePluginGV.AutoDownloadPlugin)
                .then((res) => {
                    if (res === "true") autoDownloadCache.current = true
                })
                .catch(() => {})
            getRemoteValue(RemotePluginGV.UserPluginRemoveCheck)
                .then((res) => {
                    if (res === "true") delOnlineHintCache.current = true
                })
                .catch(() => {})
            getRemoteValue(RemotePluginGV.LocalPluginRemoveCheck)
                .then((res) => {
                    if (res === "true") delLocalHintCache.current = true
                })
                .catch(() => {})
        }, [])

        /** ---------- 自动下载插件弹框 Start ---------- */
        const autoDownloadCache = useRef<boolean>(false)
        const [autoDownloadHint, setAutoDownloadHint] = useState<boolean>(false)
        const handleAutoDownload = useMemoizedFn(() => {
            if (autoDownloadHint) return
            setAutoDownloadHint(true)
        })
        const autoDownloadCallback = useMemoizedFn((cache: boolean) => {
            if (downloadLoading) {
                yakitNotify("info", "插件下载中，请稍后")
                return
            }
            yakitNotify("info", "下载插件中...")
            autoDownloadCache.current = cache
            onDownload()
            setAutoDownloadHint(false)
        })
        /** ---------- 自动下载插件弹框 End ---------- */

        /** ---------- 删除插件的二次确认 Start ---------- */
        // 本地删除二次提示是否展示
        const delLocalHintCache = useRef<boolean>(false)
        // 线上删除二次提示是否展示
        const delOnlineHintCache = useRef<boolean>(false)
        // 来源
        const delSource = useRef<string>("")
        // 缓存的 remote-key 值
        const delHintCacheKey = useRef<string>("")
        const [delHint, setDelHint] = useState<boolean>(false)
        const handleDelPlugin = useMemoizedFn((source: string) => {
            if (delHint) return
            delSource.current = source
            delHintCacheKey.current = ""
            if (delSource.current === "delLocal") delHintCacheKey.current = RemotePluginGV.LocalPluginRemoveCheck
            if (delSource.current === "delOnline") delHintCacheKey.current = RemotePluginGV.UserPluginRemoveCheck
            setDelHint(true)
        })
        const delHintCallback = useMemoizedFn((isOK: boolean, cache: boolean) => {
            if (isOK) {
                if (delSource.current === "delLocal") {
                    delLocalHintCache.current = cache
                    handleDelLocal()
                }
                if (delSource.current === "delOnline") {
                    delOnlineHintCache.current = cache
                    handleDelOnline()
                }
            } else {
                activeOperate.current = ""
            }
            delSource.current = ""
            delHintCacheKey.current = ""
            setDelHint(false)
        })
        /** ---------- 删除插件的二次确认 End ---------- */

        /** ---------- 按钮操作逻辑 Start ---------- */
        const onDownloadedNext = useMemoizedFn((flag: boolean) => {
            if (flag) {
                handleOperates(activeOperate.current)
            } else {
                activeOperate.current = ""
            }
        })

        const activeOperate = useRef<string>("")
        const handleOperates = useMemoizedFn((type: string) => {
            const isOnline = !!online
            const isLocal = !!local
            activeOperate.current = type
            // 上传
            if (type === "upload") {
                if (isOnline) {
                    yakitNotify("error", "非纯本地插件，暂不支持上传")
                } else {
                    handleUpload()
                }
            }
            // 删除本地
            if (type === "delLocal") {
                if (isLocal) {
                    delLocalHintCache.current ? handleDelLocal() : handleDelPlugin("delLocal")
                } else {
                    yakitNotify("error", "本地不存在该插件，无法删除")
                }
            }
            // 删除线上
            if (type === "delOnline") {
                if (isOnline && online.isAuthor) {
                    delOnlineHintCache.current ? handleDelOnline() : handleDelPlugin("delOnline")
                } else {
                    yakitNotify("error", "无法删除，插件无权限或不存在")
                }
            }
            // 改为公开|私密
            if (type === "status") {
                if (isOnline && online.isAuthor) {
                    handleChangePrivate()
                } else {
                    yakitNotify("error", "无法更改，插件无权限")
                }
            }
            // 编辑|添加菜单栏|移出菜单栏|导出
            if (["edit", "addMenu", "removeMenu", "export"].includes(type)) {
                if (isLocal) {
                    if (type === "edit") handleEdit()
                    if (type === "addMenu") handleAddMenu()
                    if (type === "removeMenu") handleRemoveMenu()
                    if (type === "export") handleExport()
                } else {
                    if (autoDownloadCache.current) {
                        if (downloadLoading) {
                            yakitNotify("info", "插件下载中，请稍后")
                            return
                        }
                        yakitNotify("info", "开始下载插件")
                        onDownload()
                    } else {
                        handleAutoDownload()
                    }
                }
            }
            // 分享
            if (type === "share") {
                if (isOnline) {
                    if (!online.uuid) {
                        yakitNotify("error", "未获取到插件的UUID，请切换不同插件详情后重试")
                        return
                    }
                    handleShare()
                } else {
                    yakitNotify("error", "无法分享，线上不存在该插件")
                }
            }
            // 下载
            if (type === "download") {
                if (isOnline) {
                    yakitNotify("info", "开始下载插件")
                    handleDownload()
                } else {
                    yakitNotify("error", "无法下载/更新，该插件是纯本地插件")
                }
            }
        })

        // 插件编辑
        const handleEdit = useMemoizedFn(() => {
            activeOperate.current = ""
            if (!local) return
            onToEditPlugin(local)
        })
        // 插件分享
        const handleShare = useMemoizedFn(() => {
            activeOperate.current = ""
            if (!online) return
            ipcRenderer
                .invoke("copy-clipboard", online.uuid || "")
                .then(() => {
                    yakitNotify("success", "插件UUID已复制到剪切板")
                })
                .catch(() => {})
        })
        // 插件上传
        const handleUpload = useMemoizedFn(() => {
            activeOperate.current = ""
            if (!local) return
            if (!local.ScriptName) {
                yakitNotify("error", "插件信息缺失，请切换插件后重试")
                return
            }
            if (!userInfo.isLogin) {
                yakitNotify("error", "登录后才可上传插件")
                return
            }

            const m = showYakitModal({
                type: "white",
                title: "上传插件",
                content: (
                    <PluginLocalUploadSingle
                        plugin={local}
                        onUploadSuccess={() => {
                            if (onCallback) onCallback("upload")
                        }}
                        onClose={() => {
                            m.destroy()
                        }}
                    />
                ),
                footer: null
            })
        })
        // 插件下载|更新
        const handleDownload = useMemoizedFn(() => {
            activeOperate.current = ""
            if (downloadLoading) {
                yakitNotify("info", "插件下载中，请稍后")
                return
            }
            onDownload()
        })
        // 改为公开|私密
        const handleChangePrivate = useMemoizedFn(() => {
            activeOperate.current = ""
            if (!online) return
            if (online.is_private) {
                const m = showYakitModal({
                    title: "插件基础检测",
                    type: "white",
                    width: 506,
                    centered: true,
                    maskClosable: false,
                    closable: true,
                    footer: null,
                    mask: false,
                    destroyOnClose: true,
                    bodyStyle: {padding: 0},
                    content: (
                        <CodeScoreModule
                            type={online.type || ""}
                            code={online.content || ""}
                            isStart={true}
                            callback={async (isPass: boolean) => {
                                if (isPass) {
                                    await onUpdatePrivate(online)
                                    m.destroy()
                                } else {
                                    m.destroy()
                                }
                            }}
                        />
                    ),
                    onCancel: () => {
                        m.destroy()
                    }
                })
            } else {
                onUpdatePrivate(online)
            }
        })
        // 添加到菜单
        const handleAddMenu = useMemoizedFn(() => {
            activeOperate.current = ""
            if (!local) return
            const m = showYakitModal({
                title: `添加到菜单栏中[${local.Id}]`,
                content: <AddPluginMenuContent onCancel={() => m.destroy()} script={local} />,
                onCancel: () => {
                    m.destroy()
                },
                footer: null
            })
        })
        // 移出菜单
        const handleRemoveMenu = useMemoizedFn(async () => {
            activeOperate.current = ""
            if (!local) return
            const m = showYakitModal({
                title: "移除菜单栏",
                footer: null,
                content: <RemovePluginMenuContent pluginName={local.ScriptName} />,
                onCancel: () => {
                    m.destroy()
                }
            })
        })

        /** ---------- 导出插件 Start ---------- */
        // 导出插件的选择位置框是否展示
        const isShowExportDialog = useRef<boolean>(false)
        // 导出本地插件
        const [exportModal, setExportModal] = useState<boolean>(false)
        const exportParams = useRef<ExportParamsProps>({...DefaultExportRequest})

        const handleExport = useMemoizedFn(async () => {
            if (!local) return
            if (isShowExportDialog.current) {
                yakitNotify("error", "正在选择导出地址中...")
                return
            }

            const ids = Number(local.Id) ? [Number(local.Id)] : []
            openExportModal(ids)
        })
        const openExportModal = useMemoizedFn(async (ids: number[]) => {
            if (exportModal) return
            try {
                isShowExportDialog.current = true
                const showSaveDialogRes = await ipcRenderer.invoke("openDialog", {properties: ["openDirectory"]})
                isShowExportDialog.current = false
                if (showSaveDialogRes.canceled) return

                const params: ExportParamsProps = {
                    OutputDir: showSaveDialogRes.filePaths[0],
                    YakScriptIds: ids,
                    Keywords: "",
                    Type: "",
                    UserName: "",
                    Tags: ""
                }
                exportParams.current = params
                setExportModal(true)
            } catch (error) {
                yakitNotify("error", error + "")
            }
        })
        const closeExportModal = useMemoizedFn(() => {
            exportParams.current = {...DefaultExportRequest}
            setExportModal(false)
        })
        /** ---------- 导出插件 End ---------- */

        // 删除线上插件
        const handleDelOnline = useMemoizedFn(() => {
            activeOperate.current = ""
            if (!online || !online?.isAuthor) return
            apiDeletePluginMine({uuid: [online.uuid]}, true)
                .then(() => {
                    if (onCallback) onCallback("delOnline")
                })
                .catch((err) => {
                    yakitNotify("error", "线上删除失败: " + err)
                })
        })
        // 删除本地插件
        const handleDelLocal = useMemoizedFn(() => {
            activeOperate.current = ""
            if (!local) return
            if (!local.Id || !Number(local.Id)) return
            apiDeleteYakScriptByIds({Ids: [Number(local.Id)]}, true)
                .then(() => {
                    if (onCallback) onCallback("delLocal")
                })
                .catch((err) => {
                    yakitNotify("error", "本地删除失败: " + err)
                })
        })
        /** ---------- 按钮操作逻辑 End ---------- */

        /** 更改插件私有状态 */
        const onUpdatePrivate = useMemoizedFn((data: YakitPluginOnlineDetail) => {
            const updateItem: API.UpPluginsPrivateRequest = {
                uuid: data.uuid,
                is_private: !data.is_private
            }
            apiUpdatePluginPrivateMine(updateItem)
                .then(() => {
                    if (onCallback) onCallback("status")
                })
                .catch(() => {})
        })

        return (
            <div className={styles["hub-extra-operate"]}>
                {!isCorePlugin && (
                    <div className={styles["btn-group"]}>
                        <HubButton
                            width={wrapperWidth}
                            iconWidth={900}
                            icon={<OutlinePencilaltIcon />}
                            type='text2'
                            name={"编辑"}
                            className={classNames({[styles["share-disabled-btn"]]: !local})}
                            onClick={() => handleOperates("edit")}
                        />
                        <div className={styles["divider-style"]}></div>
                        <HubButton
                            width={wrapperWidth}
                            iconWidth={900}
                            icon={<OutlineShareIcon />}
                            type='text2'
                            name={"分享"}
                            className={classNames({[styles["share-disabled-btn"]]: !online})}
                            disabled={!online}
                            hint={!online ? PluginOperateHint["banOnlineOP"] : ""}
                            onClick={() => {
                                if (!online) return
                                handleOperates("share")
                            }}
                        />
                    </div>
                )}
                {!online && !!local && !isCorePlugin && (
                    <HubButton
                        width={wrapperWidth}
                        iconWidth={900}
                        icon={<OutlineClouduploadIcon />}
                        type='outline2'
                        name={"上传"}
                        onClick={() => handleOperates("upload")}
                    />
                )}
                {!isCorePlugin && (
                    <HubButton
                        width={wrapperWidth}
                        iconWidth={900}
                        icon={<OutlineClouddownloadIcon />}
                        name={isUpdate ? "更新" : "下载"}
                        className={classNames({[styles["download-disabled-btn"]]: !online})}
                        disabled={!online}
                        hint={!online ? PluginOperateHint["banOnlineOP"] : ""}
                        onClick={() => {
                            if (!online) return
                            handleOperates("download")
                        }}
                    />
                )}
                <FuncFilterPopover
                    icon={<OutlineDotshorizontalIcon />}
                    button={{type: "text2"}}
                    menu={{
                        type: "primary",
                        data: [...menuData],
                        onClick: ({key}) => handleOperates(key)
                    }}
                    placement='bottomRight'
                />

                <HubOperateHint visible={autoDownloadHint} onOk={autoDownloadCallback} />

                {/* 删除插件 */}
                <NoPromptHint
                    visible={delHint}
                    title='是否要删除插件'
                    content={PluginOperateHint[delSource.current]}
                    cacheKey={delHintCacheKey.current}
                    onCallback={delHintCallback}
                />

                {/* 导出插件 */}
                <PluginLocalExport
                    visible={exportModal}
                    getContainer={document.getElementById(getContainer || "") || document.body}
                    exportLocalParams={exportParams.current}
                    onClose={closeExportModal}
                />
            </div>
        )
    })
)
