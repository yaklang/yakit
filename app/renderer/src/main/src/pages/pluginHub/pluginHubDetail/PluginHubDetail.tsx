import React, {ForwardedRef, forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import PluginTabs from "@/components/businessUI/PluginTabs/PluginTabs"
import {
    PluginStarsRequest,
    apiFetchLocalPluginInfo,
    apiFetchOnlinePluginInfo,
    apiGetYakScriptById,
    apiPluginStars
} from "@/pages/plugins/utils"
import {API} from "@/services/swagger/resposeType"
import {YakScript} from "@/pages/invoker/schema"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineClouddownloadIcon, OutlineRefreshIcon, OutlineReplyIcon, OutlineThumbupIcon} from "@/assets/icon/outline"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {PluginLogs} from "@/pages/plugins/log/PluginLog"
import {yakitNotify} from "@/utils/notification"
import {Tooltip} from "antd"
import {SolidPluscircleIcon, SolidThumbupIcon} from "@/assets/icon/solid"
import {HubExtraOperate, HubExtraOperateRef} from "../hubExtraOperate/HubExtraOperate"
import {v4 as uuidv4} from "uuid"
import {grpcDownloadOnlinePlugin, grpcFetchLocalPluginDetail} from "../utils/grpc"
import {YakitRoute} from "@/enums/yakitRoute"
import {PluginToDetailInfo} from "../type"
import {thousandthConversion} from "@/pages/plugins/pluginReducer"
import {YakitPluginOnlineDetail} from "@/pages/plugins/online/PluginsOnlineType"
import {PluginOperateHint} from "../defaultConstant"
import emiter from "@/utils/eventBus/eventBus"
import {getRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {useStore} from "@/store"
import {HubDetailHeader} from "../hubExtraOperate/funcTemplate"
import {FooterExtraBtn} from "../pluginHubList/funcTemplate"
import {PluginComment} from "@/pages/plugins/baseComment"
import {LocalPluginExecute} from "@/pages/plugins/local/LocalPluginExecute"
import {ModifyPluginCallback} from "@/pages/pluginEditor/pluginEditor/PluginEditor"
import {ModifyYakitPlugin} from "@/pages/pluginEditor/modifyYakitPlugin/ModifyYakitPlugin"

import classNames from "classnames"
import styles from "./PluginHubDetail.module.scss"

const {ipcRenderer} = window.require("electron")
const {TabPane} = PluginTabs

/**
 * @description 该组件在yakit中只能出现一次，否则元素id将会重复
 */
const wrapperId = `plugin-hub-detail${uuidv4()}`

export interface PluginHubDetailRefProps {
    /** 设置需要展示的插件详情 */
    handleSetPlugin: (info: PluginToDetailInfo) => any
}

interface PluginHubDetailProps {
    ref?: ForwardedRef<PluginHubDetailRefProps>
    rootElementId?: string
    onBack: () => void
}

export const PluginHubDetail: React.FC<PluginHubDetailProps> = memo(
    forwardRef((props, ref) => {
        const {rootElementId, onBack} = props

        const userinfo = useStore((s) => s.userInfo)
        const isLogin = useMemo(() => userinfo.isLogin, [userinfo])

        /** ---------- 基础全局功能 Start ---------- */
        // 新建插件
        const onNewPlugin = useMemoizedFn(() => {
            emiter.emit(
                "openPage",
                JSON.stringify({route: YakitRoute.AddYakitScript, params: {source: YakitRoute.Plugin_Hub}})
            )
        })

        // 私有域
        const privateDomain = useRef<string>("")
        const fetchPrivateDomain = useMemoizedFn(() => {
            getRemoteValue(RemoteGV.HttpSetting)
                .then((res) => {
                    if (res) {
                        try {
                            const value = JSON.parse(res)
                            privateDomain.current = value.BaseUrl
                        } catch (error) {}
                    }
                })
                .catch(() => {})
        })
        useEffect(() => {
            fetchPrivateDomain()
            emiter.on("onSwitchPrivateDomain", fetchPrivateDomain)
            emiter.on("editorLocalSaveToDetail", handleUpdateLocalPlugin)
            return () => {
                emiter.off("onSwitchPrivateDomain", fetchPrivateDomain)
                emiter.off("editorLocalSaveToDetail", handleUpdateLocalPlugin)
            }
        }, [])

        // 通过本地 ID 更新本地插件信息
        const handleUpdateLocalPlugin = useMemoizedFn((id: string) => {
            if (!localPlugin) return
            const ID = Number(id) || 0
            if (!ID) return
            if (Number(localPlugin.Id) === ID) {
                apiGetYakScriptById(ID, true)
                    .then((res) => {
                        setLocalPlugin({...res})
                    })
                    .catch((err) => {
                        yakitNotify("error", "更新本地插件信息失败: " + err)
                    })
            }
        })
        /** ---------- 基础全局功能 End ---------- */

        useImperativeHandle(
            ref,
            () => ({
                handleSetPlugin: handleSetPlugin
            }),
            []
        )

        const [activeKey, setActiveKey] = useState<string>("")
        const onTabChange = useMemoizedFn((key: string) => {
            setActiveKey(key)
        })

        /** ---------- 意外情况的错误信息展示 Start ---------- */
        // 是否显示错误页面
        const [isError, setIsError] = useState<boolean>(false)
        // 是否显示错误页面上的刷新按钮
        const isRefresh = useRef<boolean>(false)
        // 错误页面的提示信息
        const errorInfo = useRef<string>("")
        const onError = useMemoizedFn((flag: boolean, refresh?: boolean, hint?: string) => {
            errorInfo.current = hint || ""
            isRefresh.current = !!refresh
            setIsError(flag)
        })
        // 刷新
        const onRefresh = useMemoizedFn(() => {
            onFetchPlugin()
        })
        /** ---------- 意外情况的错误信息展示 End ---------- */

        const [loading, setLoading] = useState<boolean>(false)
        const currentRequest = useRef<PluginToDetailInfo | undefined>()
        const [onlinePlugin, setOnlinePlugin] = useState<YakitPluginOnlineDetail | undefined>()
        const hasOnline = useMemo(() => !!onlinePlugin, [onlinePlugin])
        const [localPlugin, setLocalPlugin] = useState<YakScript | undefined>()
        const hasLocal = useMemo(() => !!localPlugin, [localPlugin])

        // 是否是内置插件
        const isCorePlugin = useMemo(() => {
            if (!localPlugin) return false
            return !!localPlugin.IsCorePlugin
        }, [localPlugin])

        // 复制来源插件(必须是自己的插件)
        const copySourcePlugin = useMemo(() => {
            if (onlinePlugin?.isAuthor) {
                return onlinePlugin.base_script_name || undefined
            }
            return undefined
        }, [onlinePlugin])

        /** ---------- 获取插件信息逻辑 Start ---------- */
        const handleSetPlugin = useDebounceFn(
            useMemoizedFn((info: PluginToDetailInfo) => {
                const isOnline = ["online", "own"].includes(info.type)
                const error = isOnline ? !info.name || !info.uuid : !info.name
                if (error) {
                    if (currentRequest.current) {
                        yakitNotify("error", "未获取到插件的关键信息，请重试!")
                        return
                    } else {
                        currentRequest.current = {...info}
                        onError(true, false, "未获取到插件的关键信息，请重试!")
                        return
                    }
                }
                currentRequest.current = {...info}
                onFetchPlugin()
            }),
            {wait: 300}
        ).run

        // 获取插件线上信息
        const fetchOnlinePlugin: () => Promise<API.PluginsDetail> = useMemoizedFn(() => {
            return new Promise((resolve, reject) => {
                if (!currentRequest.current || !currentRequest.current.uuid) return reject("false")
                apiFetchOnlinePluginInfo({uuid: currentRequest.current.uuid}, true).then(resolve).catch(reject)
            })
        })
        // 获取插件本地信息
        const fetchLocalPlugin: () => Promise<YakScript> = useMemoizedFn(() => {
            return new Promise((resolve, reject) => {
                if (!currentRequest.current || !currentRequest.current.name) return reject("false")
                apiFetchLocalPluginInfo(currentRequest.current.name, true).then(resolve).catch(reject)
            })
        })

        /**
         * @param banUpdateActiveTab 禁止更新变量activeKey
         */
        const onFetchPlugin = useMemoizedFn((banUpdateActiveTab?: boolean) => {
            if (!currentRequest.current) {
                onError(true, false, "插件请求信息异常，请重新选择插件!")
                return
            }
            const {name, uuid} = currentRequest.current
            if (!name && !uuid) {
                onError(true, false, "未获取到插件的关键信息，请重新选择插件!")
                return
            }

            setLoading(true)
            const promises: Promise<any>[] = [fetchOnlinePlugin(), fetchLocalPlugin()]
            Promise.allSettled(promises)
                .then((res) => {
                    if (name !== currentRequest.current?.name) return
                    const [online, local] = res
                    let activeTab = ""

                    if (online.status === "fulfilled") {
                        activeTab = "online"
                        setOnlinePlugin({
                            ...online.value,
                            starsCountString: thousandthConversion(online.value.stars),
                            commentCountString: thousandthConversion(online.value.comment_num),
                            downloadedTotalString: thousandthConversion(online.value.downloaded_total)
                        })
                    }
                    if (online.status === "rejected") {
                        setOnlinePlugin(undefined)
                        // const {reason} = online as PromiseRejectedResult
                        // if (reason !== "false") yakitNotify("error", `获取线上插件错误: ${reason}`)
                    }

                    if (local.status === "fulfilled") {
                        activeTab = "exectue"
                        setLocalPlugin({...local.value})
                    }
                    if (local.status === "rejected") {
                        setLocalPlugin(undefined)
                        // const {reason} = local as PromiseRejectedResult
                        // if (reason !== "false") yakitNotify("error", `获取本地插件错误: ${reason}`)
                    }

                    if (activeTab) {
                        if (!banUpdateActiveTab) setActiveKey(activeTab)
                        onError(false)
                    } else {
                        onError(true, true, "未获取到插件信息，请刷新重试!")
                    }
                })
                .catch((err) => {
                    onError(true, true, `获取信息异常，请刷新重试\n${err}`)
                })
                .finally(() => {
                    if (name !== currentRequest.current?.name) return
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                })
        })
        /** ---------- 获取插件信息逻辑 End ---------- */

        /** ---------- 插件操作逻辑 Start ---------- */
        const operateRef = useRef<HubExtraOperateRef>(null)
        const [downloadLoading, setDownloadLoading] = useState<boolean>(false)
        // 下载插件
        const onDownload = useMemoizedFn(() => {
            if (!onlinePlugin) {
                if (operateRef && operateRef.current) operateRef.current.downloadedNext(false)
                return
            }
            if (downloadLoading) return
            setDownloadLoading(true)

            let flag: boolean = false
            const currentUUID = onlinePlugin.uuid
            grpcDownloadOnlinePlugin({uuid: onlinePlugin.uuid})
                .then((res) => {
                    if (onlinePlugin.uuid !== currentUUID) return
                    setLocalPlugin({...res})
                    flag = true
                    setOnlinePlugin((plugin) => {
                        if (!plugin) return undefined
                        return {
                            ...plugin,
                            downloaded_total: plugin.downloaded_total + 1,
                            downloadedTotalString: thousandthConversion(plugin.downloaded_total + 1)
                        }
                    })
                    yakitNotify("success", "下载插件成功")
                })
                .catch((err) => {
                    if (onlinePlugin.uuid !== currentUUID) return
                    yakitNotify("error", `下载插件失败: ${err}`)
                    flag = false
                })
                .finally(() => {
                    if (onlinePlugin.uuid !== currentUUID) return
                    setTimeout(() => {
                        if (operateRef && operateRef.current) operateRef.current.downloadedNext(flag)
                        setDownloadLoading(false)
                    }, 200)
                })
        })

        const operateCallback = useMemoizedFn((type: string) => {
            // 删除后通知本地列表的更新
            if (type === "delLocal") {
                const info = localPlugin ? {name: localPlugin.ScriptName, id: `${localPlugin.Id}`} : undefined
                setLocalPlugin(undefined)
                if (["exectue", "local"].includes(activeKey)) {
                    if (!!onlinePlugin) onTabChange("online")
                    else onError(true, false, "请选择插件查看详情")
                }
                try {
                    if (info) emiter.emit("detailDeleteLocalPlugin", JSON.stringify(info))
                } catch (error) {}
            }
            // 删除后通知我的列表的更新
            if (type === "delOnline") {
                const info = onlinePlugin ? {name: onlinePlugin.script_name, uuid: onlinePlugin.uuid} : undefined
                setOnlinePlugin(undefined)
                if (["online", "comment", "log"].includes(activeKey)) {
                    if (!!localPlugin) onTabChange("exectue")
                    else onError(true, false, "请选择插件查看详情")
                }
                try {
                    if (info) emiter.emit("detailDeleteOwnPlugin", JSON.stringify(info))
                } catch (error) {}
            }
            // 上传后的更新
            if (type === "upload") {
                if (!localPlugin) return
                // 获取最新的本地信息
                ipcRenderer
                    .invoke("GetYakScriptByName", {Name: localPlugin.ScriptName})
                    .then((i: YakScript) => {
                        setLocalPlugin({...i, isLocalPlugin: privateDomain.current !== i.OnlineBaseUrl})
                        // 刷新本地列表
                        emiter.emit("onRefLocalPluginList", "")
                    })
                    .catch((e) => {
                        yakitNotify("error", "查询插件最新数据失败: " + e)
                    })
                // 获取最新的线上信息
                apiFetchOnlinePluginInfo({scriptName: localPlugin.ScriptName})
                    .then((res) => {
                        setOnlinePlugin({
                            ...res,
                            starsCountString: thousandthConversion(res.stars),
                            commentCountString: thousandthConversion(res.comment_num),
                            downloadedTotalString: thousandthConversion(res.downloaded_total)
                        })
                        // 刷新我的列表
                        emiter.emit("onRefUserPluginList", "")
                    })
                    .catch((err) => {})
            }
            // 更改公开|私密
            if (type === "status") {
                if (!onlinePlugin) return
                const info = onlinePlugin
                    ? {
                          name: onlinePlugin.script_name,
                          uuid: onlinePlugin.uuid,
                          is_private: onlinePlugin.is_private,
                          status: onlinePlugin.status
                      }
                    : undefined
                let status: number = 0
                setOnlinePlugin((plugin) => {
                    if (!plugin) return undefined
                    if (userinfo.role === "ordinary") {
                        // 为待审核
                        status = 0
                    } else {
                        // 为审核通过
                        if (plugin.is_private) status = 1
                    }
                    return {...plugin, is_private: !plugin.is_private, status: status}
                })
                if (info) info.status = status
                try {
                    if (info) emiter.emit("detailChangeStatusOwnPlugin", JSON.stringify(info))
                } catch (error) {}
            }
        })

        const [starLoading, setStarLoading] = useState<boolean>(false)
        const onStar = useMemoizedFn((e) => {
            e.stopPropagation()
            if (starLoading) return
            if (!onlinePlugin) return
            if (!onlinePlugin.uuid) {
                yakitNotify("error", "插件信息错误，无法进行点赞操作")
                return
            }
            if (!isLogin) {
                yakitNotify("error", "登录后才可以进行点赞")
                return
            }

            const request: PluginStarsRequest = {
                uuid: onlinePlugin.uuid,
                operation: onlinePlugin.is_stars ? "remove" : "add"
            }
            setStarLoading(true)
            apiPluginStars(request)
                .then(() => {
                    setOnlinePlugin((plugin) => {
                        if (!plugin) return undefined
                        const isStar = plugin.is_stars
                        const starsTotal = isStar ? (plugin.stars === 0 ? 0 : plugin.stars - 1) : plugin.stars + 1
                        return {
                            ...plugin,
                            is_stars: !isStar,
                            stars: starsTotal,
                            starsCountString: thousandthConversion(starsTotal)
                        }
                    })
                })
                .catch(() => {})
                .finally(() =>
                    setTimeout(() => {
                        setStarLoading(false)
                    }, 200)
                )
        })

        /** ---------- 插件操作逻辑 End ---------- */

        /** ---------- 编辑插件 Start ---------- */
        const [editHint, setEditHint] = useState<boolean>(false)
        const handleOpenEditHint = useMemoizedFn(() => {
            if (editHint) return
            if (!localPlugin) return
            setEditHint(true)
        })
        const handleEditHintCallback = useMemoizedFn(async (isSuccess: boolean, data?: ModifyPluginCallback) => {
            if (isSuccess && data) {
                const {opType, info} = data

                if (opType === "save" || opType === "saveAndExit") {
                    const plugin: YakScript = await grpcFetchLocalPluginDetail({
                        Name: info.name,
                        UUID: info.uuid || undefined
                    })
                    setLocalPlugin({...plugin})
                }
                if (opType === "upload" || opType === "submit") {
                    if (currentRequest.current) {
                        currentRequest.current = {...currentRequest.current, name: info.name, uuid: info.uuid}
                        onFetchPlugin(true)
                    }
                }
                if (opType === "copy") {
                }

                // 关闭编辑插件弹窗
                if (opType !== "save") {
                    setEditHint(false)
                }
            } else {
                setEditHint(false)
            }
        })
        /** ---------- 编辑插件 End ---------- */

        const bar = (props: any, TabBarDefault: any) => {
            return (
                <TabBarDefault
                    {...props}
                    children={(barNode: React.ReactElement) => {
                        const {
                            key,
                            props: {className}
                        } = barNode

                        if (!key) return barNode

                        try {
                            const isDisable = className.indexOf("disabled") > -1
                            if (!isDisable) return barNode

                            let hint = ""
                            if (["online", "comment", "log"].includes(key as string)) {
                                hint = isCorePlugin
                                    ? PluginOperateHint["banCorePluginOP"]
                                    : PluginOperateHint["banOnlineOP"]
                            } else {
                                hint = PluginOperateHint["banLocalOP"]
                            }

                            return (
                                <Tooltip overlayStyle={{paddingRight: 4}} placement='left' title={hint}>
                                    {barNode}
                                </Tooltip>
                            )
                        } catch (error) {
                            return barNode
                        }
                    }}
                />
            )
        }

        const extraNode = useMemo(() => {
            return (
                <HubExtraOperate
                    ref={operateRef}
                    getContainer={wrapperId}
                    online={onlinePlugin}
                    local={localPlugin}
                    onDownload={onDownload}
                    onEdit={handleOpenEditHint}
                    onCallback={operateCallback}
                />
            )
        }, [operateRef.current, wrapperId, onlinePlugin, localPlugin])

        const infoExtraNode = useMemo(() => {
            if (!onlinePlugin) return null
            return (
                <div className={styles["info-extra-node"]}>
                    <FooterExtraBtn
                        loading={starLoading}
                        icon={
                            onlinePlugin.is_stars ? (
                                <SolidThumbupIcon className={styles["stared-icon"]} />
                            ) : (
                                <OutlineThumbupIcon />
                            )
                        }
                        title={onlinePlugin.starsCountString || ""}
                        onClick={onStar}
                    />
                    <FooterExtraBtn
                        loading={downloadLoading}
                        icon={<OutlineClouddownloadIcon />}
                        title={onlinePlugin.downloadedTotalString || ""}
                        onClick={onDownload}
                    />
                </div>
            )
        }, [starLoading, downloadLoading, onlinePlugin])

        return (
            <div
                id={wrapperId}
                className={classNames(styles["plugin-hub-detail"], {[styles["plugin-hub-detail-error"]]: isError})}
            >
                <div className={styles["detail-header"]}>
                    <div className={styles["header-title"]}>插件详情</div>
                    <div className={styles["header-btn"]}>
                        <YakitButton size='large' icon={<SolidPluscircleIcon />} onClick={onNewPlugin}>
                            新建插件
                        </YakitButton>
                        <YakitButton size='large' type='outline2' icon={<OutlineReplyIcon />} onClick={onBack}>
                            返回
                        </YakitButton>
                    </div>
                </div>

                <div className={styles["detail-body"]}>
                    <YakitSpin spinning={loading} tip='获取插件中...'>
                        <PluginTabs
                            wrapperClassName={styles["plugin-hub-container"]}
                            tabPosition='right'
                            activeKey={activeKey}
                            onChange={onTabChange}
                            renderTabBar={bar}
                        >
                            <TabPane tab='线上' key='online' disabled={!hasOnline}>
                                {!!onlinePlugin ? (
                                    <div className={styles["tab-pane-wrapper"]}>
                                        <HubDetailHeader
                                            pluginName={onlinePlugin?.script_name || "-"}
                                            help={onlinePlugin?.help || "-"}
                                            type={onlinePlugin?.type || "yak"}
                                            tags={onlinePlugin?.tags || ""}
                                            extraNode={extraNode}
                                            img={onlinePlugin?.head_img || ""}
                                            user={onlinePlugin?.authors || "-"}
                                            prImgs={(onlinePlugin?.collaborator || []).map((ele) => ({
                                                headImg: ele.head_img,
                                                userName: ele.user_name
                                            }))}
                                            updated_at={onlinePlugin?.updated_at || 0}
                                            basePluginName={copySourcePlugin}
                                            infoExtra={infoExtraNode}
                                        />
                                        <div className={styles["detail-content"]}>
                                            <div className={styles["editer-body"]}>
                                                <YakitEditor
                                                    type={onlinePlugin?.type || "plaintext"}
                                                    value={onlinePlugin?.content || ""}
                                                    readOnly={true}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles["tab-pane-empty"]}>
                                        <YakitEmpty title='暂无插件信息' />
                                    </div>
                                )}
                            </TabPane>
                            <TabPane tab='执行' key='exectue' disabled={!hasLocal}>
                                <div className={styles["tab-pane-exectue"]}>
                                    {!loading ? (
                                        <>
                                            {!!localPlugin ? (
                                                <LocalPluginExecute
                                                    plugin={localPlugin}
                                                    headExtraNode={extraNode}
                                                    isHiddenUUID={true}
                                                    infoExtra={infoExtraNode}
                                                    hiddenUpdateBtn={true}
                                                />
                                            ) : (
                                                <div className={styles["tab-pane-empty"]}>
                                                    <YakitEmpty title='暂无插件信息' />
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className={styles["tab-pane-empty"]}>
                                            <YakitEmpty title='暂无插件信息' />
                                        </div>
                                    )}
                                </div>
                            </TabPane>
                            <TabPane tab='本地' key='local' disabled={!hasLocal}>
                                {!!localPlugin ? (
                                    <div className={styles["tab-pane-wrapper"]}>
                                        <HubDetailHeader
                                            pluginName={localPlugin?.ScriptName || "-"}
                                            help={localPlugin?.Help || "-"}
                                            type={localPlugin?.Type || "yak"}
                                            tags={localPlugin?.Tags || ""}
                                            extraNode={extraNode}
                                            img={localPlugin?.HeadImg || ""}
                                            user={localPlugin?.Author || "-"}
                                            prImgs={(localPlugin?.CollaboratorInfo || []).map((ele) => ({
                                                headImg: ele.HeadImg,
                                                userName: ele.UserName
                                            }))}
                                            updated_at={localPlugin?.UpdatedAt || 0}
                                            basePluginName={copySourcePlugin}
                                            infoExtra={infoExtraNode}
                                        />
                                        <div className={styles["detail-content"]}>
                                            <div className={styles["editer-body"]}>
                                                <YakitEditor
                                                    type={localPlugin?.Type || "yak"}
                                                    value={localPlugin?.Content || ""}
                                                    readOnly={true}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles["tab-pane-empty"]}>
                                        <YakitEmpty title='暂无插件信息' />
                                    </div>
                                )}
                            </TabPane>
                            <TabPane tab='评论' key='comment' disabled={!hasOnline}>
                                <div className={styles["tab-pane-wrapper"]}>
                                    <HubDetailHeader
                                        pluginName={onlinePlugin?.script_name || "-"}
                                        help={onlinePlugin?.help || "-"}
                                        type={onlinePlugin?.type || "yak"}
                                        tags={onlinePlugin?.tags || ""}
                                        extraNode={extraNode}
                                        img={onlinePlugin?.head_img || ""}
                                        user={onlinePlugin?.authors || "-"}
                                        prImgs={(onlinePlugin?.collaborator || []).map((ele) => ({
                                            headImg: ele.head_img,
                                            userName: ele.user_name
                                        }))}
                                        updated_at={onlinePlugin?.updated_at || 0}
                                        basePluginName={copySourcePlugin}
                                        infoExtra={infoExtraNode}
                                    />
                                    {!!onlinePlugin ? (
                                        <PluginComment isLogin={isLogin} plugin={{...onlinePlugin}} />
                                    ) : (
                                        <div className={styles["tab-pane-empty"]}>
                                            <YakitEmpty title='暂无插件信息' />
                                        </div>
                                    )}
                                </div>
                            </TabPane>
                            <TabPane tab='日志' key='log' disabled={!hasOnline}>
                                <div className={styles["tab-pane-wrapper"]}>
                                    <HubDetailHeader
                                        pluginName={onlinePlugin?.script_name || "-"}
                                        help={onlinePlugin?.help || "-"}
                                        type={onlinePlugin?.type || "yak"}
                                        tags={onlinePlugin?.tags || ""}
                                        extraNode={extraNode}
                                        img={onlinePlugin?.head_img || ""}
                                        user={onlinePlugin?.authors || "-"}
                                        prImgs={(onlinePlugin?.collaborator || []).map((ele) => ({
                                            headImg: ele.head_img,
                                            userName: ele.user_name
                                        }))}
                                        updated_at={onlinePlugin?.updated_at || 0}
                                        basePluginName={copySourcePlugin}
                                        infoExtra={infoExtraNode}
                                    />
                                    <PluginLogs uuid={onlinePlugin?.uuid || ""} getContainer={wrapperId} />
                                </div>
                            </TabPane>
                        </PluginTabs>

                        <div className={styles["plugin-hub-detail-empty"]}>
                            <YakitEmpty
                                title={errorInfo.current || "未获取到插件信息"}
                                titleClassName={styles["hint-style"]}
                            />
                            {isRefresh.current && (
                                <div className={styles["refresh-buttons"]}>
                                    <YakitButton type='outline1' icon={<OutlineRefreshIcon />} onClick={onRefresh}>
                                        刷新
                                    </YakitButton>
                                </div>
                            )}
                        </div>
                    </YakitSpin>
                </div>

                {localPlugin && editHint && (
                    <ModifyYakitPlugin
                        getContainer={document.getElementById(rootElementId || "") || document.body}
                        plugin={localPlugin}
                        visible={editHint}
                        onCallback={handleEditHintCallback}
                    />
                )}
            </div>
        )
    })
)
