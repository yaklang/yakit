import {API} from "@/services/swagger/resposeType"
import {useGetState, useMemoizedFn} from "ahooks"
import React, {useState, useEffect, Suspense} from "react"
import {useStore} from "@/store"
import {NetWorkApi} from "@/services/fetch"
import {failed, success, warn} from "../../../utils/notification"
import {PageHeader, Space, Tooltip, Button, Empty, Tag, Tabs, Upload, Input, List, Modal, Spin, Image} from "antd"
import {
    StarOutlined,
    StarFilled,
    DownloadOutlined,
    QuestionOutlined,
    LoadingOutlined,
} from "@ant-design/icons"
import numeral from "numeral"
import "./YakitPluginInfoOnline.scss"
import moment from "moment"
import {YakEditor} from "@/utils/editors"
import {YakScript} from "@/pages/invoker/schema"
import {GetYakScriptByOnlineIDRequest} from "../YakitStorePage"
import {isEnterpriseEdition} from "@/utils/envfile"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import { PluginComment } from "@/pages/plugins/baseComment"

const EditOnlinePluginDetails = React.lazy(() => import("./EditOnlinePluginDetails"))

const {ipcRenderer} = window.require("electron")
const {TabPane} = Tabs

interface YakitPluginInfoOnlineProps {
    // info: API.YakitPluginDetail
    pluginId: number
    pluginUUId?: string
    user?: boolean
    deletePlugin: (i: API.YakitPluginDetail) => void
    updatePlugin: (i: API.YakitPluginDetail) => void

    deletePluginLocal?: (s: YakScript) => void
}

export interface SearchPluginDetailRequest {
    uuid: string
}

export interface StarsOperation {
    id: number
    operation: string
}

export interface DownloadOnlinePluginProps {
    OnlineID?: number
    UUID: string
}

interface AuditParameters {
    id: number
    status: boolean
}

export const TagColor: {[key: string]: string} = {
    failed: "color-bgColor-red|审核不通过",
    success: "color-bgColor-green|审核通过",
    not: "color-bgColor-blue|待审核"
}
/**@deprecated */
export const YakitPluginInfoOnline: React.FC<YakitPluginInfoOnlineProps> = (props) => {
    const {pluginId, pluginUUId, user, deletePlugin, updatePlugin, deletePluginLocal} = props
    // 全局登录状态
    const {userInfo} = useStore()
    const [loading, setLoading] = useState<boolean>(false)
    const [addLoading, setAddLoading] = useState<boolean>(false)
    const [isAdmin, setIsAdmin] = useState<boolean>(["admin", "superAdmin"].includes(userInfo.role || ""))
    const [plugin, setPlugin] = useGetState<API.YakitPluginDetail>()
    const [isEdit, setIsEdit] = useState<boolean>(false)
    const [tabKey, setTabKey] = useState<string>("1")

    useEffect(() => {
        if (pluginId >= 0) getPluginDetail()
    }, [pluginId])
    useEffect(() => {
        const boolAdmin = ["admin", "superAdmin"].includes(userInfo.role || "")
        setIsAdmin(boolAdmin)
    }, [userInfo.role])
    useEffect(() => {
        if (!plugin) return
        updatePlugin(plugin)
    }, [plugin])
    const getPluginDetail = useMemoizedFn(() => {
        let url = "yakit/plugin/detail-unlogged"
        if (userInfo.isLogin) {
            url = "yakit/plugin/detail"
        }
        setLoading(true)
        NetWorkApi<SearchPluginDetailRequest, API.YakitPluginDetailResponse>({
            method: "get",
            url,
            params: {
                uuid: pluginUUId || ""
            }
        })
            .then((res) => {
                setPlugin(res.data)
            })
            .catch((err) => {
                failed("插件详情获取失败:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })
    const pluginStar = useMemoizedFn(() => {
        if (!userInfo.isLogin) {
            warn("请先登录")
            return
        }
        if (!plugin) return
        const prams: StarsOperation = {
            id: plugin?.id,
            operation: plugin.is_stars ? "remove" : "add"
        }

        NetWorkApi<StarsOperation, API.ActionSucceeded>({
            method: "post",
            url: "yakit/plugin/stars",
            params: prams
        })
            .then((res) => {
                if (!res.ok) return
                if (plugin.is_stars) {
                    plugin.is_stars = false
                    plugin.stars -= 1
                } else {
                    plugin.is_stars = true
                    plugin.stars += 1
                }
                setPlugin({...plugin})
            })
            .catch((err) => {
                failed("插件点星:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })
    const pluginAdd = useMemoizedFn(() => {
        if (!plugin) return
        setAddLoading(true)
        ipcRenderer
            .invoke("DownloadOnlinePluginById", {
                OnlineID: plugin.id,
                UUID: plugin.uuid
            } as DownloadOnlinePluginProps)
            .then(() => {
                success("添加成功")
                setPlugin({
                    ...plugin,
                    downloaded_total: plugin.downloaded_total + 1
                })
            })
            .catch((e) => {
                failed(`添加失败:${e}`)
            })
            .finally(() => {
                setTimeout(() => setAddLoading(false), 200)
            })
    })
    const pluginExamine = useMemoizedFn((status: number) => {
        const auditParams: AuditParameters = {
            id: plugin?.id || 0,
            status: status === 1
        }
        if (auditParams.id === 0) return
        setLoading(true)
        NetWorkApi<AuditParameters, API.ActionSucceeded>({
            method: "post",
            url: "yakit/plugin/audit",
            params: auditParams
        })
            .then((res) => {
                if (plugin) {
                    const newPlugin = {...plugin, status}
                    setPlugin(newPlugin)
                }
                success(`插件审核${status === 1 ? "通过" : "不通过"}`)
            })
            .catch((err) => {
                failed("审核失败:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })
    const onRemove = useMemoizedFn((isDel: boolean) => {
        if (!plugin) return
        if (["admin", "superAdmin"].includes(userInfo.role || "") || plugin?.user_id === userInfo.user_id) {
            const deletedParams: API.GetPluginWhere = {
                bind_me: false,
                recycle: false,
                delete_uuid: plugin.uuid ? [plugin.uuid] : [],
                delete_dump: isDel
            }
            setLoading(true)
            // 查询本地数据
            let currentScript: YakScript | undefined = undefined
            ipcRenderer
                .invoke("GetYakScriptByOnlineID", {
                    OnlineID: plugin.id,
                    UUID: plugin.uuid
                } as GetYakScriptByOnlineIDRequest)
                .then((newSrcipt: YakScript) => {
                    currentScript = newSrcipt
                })
                .finally(() => {
                    onRemoveOnline(plugin, deletedParams, currentScript)
                })
        }
    })
    const onRemoveOnline = useMemoizedFn((plugin, deletedParams, newSrcipt) => {
        // 删除线上的
        NetWorkApi<API.GetPluginWhere, API.ActionSucceeded>({
            method: "delete",
            url: "yakit/plugin",
            data: deletedParams
        })
            .then((res) => {
                // 删除本地的
                deletePlugin(plugin)
                if (!newSrcipt) return
                ipcRenderer
                    .invoke("delete-yak-script", newSrcipt.Id)
                    .then(() => {
                        if (deletePluginLocal) deletePluginLocal(newSrcipt)
                    })
                    .catch((err) => {
                        failed("删除本地失败:" + err)
                    })
            })
            .catch((err) => {
                failed("删除失败:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })

    /** 删除功能逻辑 */
    const [delPluginShow, setDelPluginShow] = useState<boolean>(false)

    if (!plugin) {
        return (
            <Spin spinning={loading} style={{height: "100%"}}>
                <div className='yakit-plugin-info-container'>
                    <Empty description='无插件信息' />
                </div>
            </Spin>
        )
    }
    const tags: string[] = plugin.tags ? JSON.parse(plugin.tags) : []
    const isShowAdmin = (isAdmin || userInfo.checkPlugin) && !plugin.is_private
    // 是否为企业版
    const isEnterprise = isEnterpriseEdition()
    return (
        <div className={`plugin-info`}>
            <Spin spinning={loading} style={{height: "100%"}}>
                {/* PageHeader */}
                <PageHeader
                    title={plugin?.script_name}
                    style={{marginBottom: 0, paddingBottom: 0}}
                    subTitle={
                        <Space>
                            {isShowAdmin && (
                                <div className='plugin-status vertical-center'>
                                    <div
                                        className={`${
                                            TagColor[["not", "success", "failed"][plugin.status]].split("|")[0]
                                        } title-body-admin-tag`}
                                    >
                                        {TagColor[["not", "success", "failed"][plugin.status]].split("|")[1]}
                                    </div>
                                </div>
                            )}
                            {plugin?.help && (
                                <Tooltip title={plugin.help}>
                                    <Button type={"link"} icon={<QuestionOutlined />} />
                                </Tooltip>
                            )}
                            {(tags &&
                                tags.length > 0 &&
                                tags.map((i) => (
                                    <Tag style={{marginLeft: 2, marginRight: 0}} key={`${i}`} color={"geekblue"}>
                                        {i}
                                    </Tag>
                                ))) ||
                                "No Tags"}
                        </Space>
                    }
                    extra={
                        <div className='plugin-heard-extra'>
                            <div className='preface-star-and-download'>
                                <div onClick={pluginStar}>
                                    {plugin.is_stars ? (
                                        <StarFilled className='solid-star' />
                                    ) : (
                                        <StarOutlined className='star-download-icon' />
                                    )}
                                </div>
                                <div className='vertical-center'>
                                    <span
                                        className={`star-download-num ${plugin.is_stars && `star-download-num-active`}`}
                                    >
                                        {plugin.stars > 10000000 ? "10,000,000+" : numeral(plugin.stars).format("0,0")}
                                    </span>
                                </div>
                            </div>
                            <div className='preface-star-and-download'>
                                <div className='vertical-center'>
                                    {(addLoading && <LoadingOutlined />) || (
                                        <DownloadOutlined className='star-download-icon' onClick={pluginAdd} />
                                    )}
                                </div>
                                <div className='vertical-center'>
                                    <span className='star-download-num'>{plugin.downloaded_total}</span>
                                </div>
                            </div>
                        </div>
                    }
                />
                <div className={`plugin-body ${(tabKey === "1" && "plugin-code-height") || ""}`}>
                    <Tooltip title={`插件id:${plugin?.uuid || "-"}`} placement='topLeft'>
                        <div className='plugin-author'>
                            作者:{plugin.authors}&emsp;{plugin.submitter && `协作者:${plugin.submitter}`}
                        </div>
                    </Tooltip>
                    {plugin?.base_script_name && plugin.base_script_name.length && (
                        <div style={{fontSize: 12, marginTop: 8}}>
                            复制插件 {plugin.base_script_name} 为 {plugin.script_name}
                        </div>
                    )}
                    <div className='flex-space-between'>
                        <div className='vertical-center'>
                            <div className='preface-time'>
                                <span className='time-title'>最新更新时间</span>
                                <span className='time-style'>
                                    {plugin?.updated_at && moment.unix(plugin.updated_at).format("YYYY年MM月DD日")}
                                </span>
                            </div>
                        </div>
                        {isEnterprise ? (
                            <div className='plugin-info-examine'>
                                {(isAdmin || userInfo.user_id === plugin.user_id || plugin.checkPlugin) && (
                                    <Button
                                        type='primary'
                                        danger
                                        onClick={() => {
                                            if (!delPluginShow) setDelPluginShow(true)
                                        }}
                                    >
                                        删除
                                    </Button>
                                )}
                                {(isAdmin || plugin.checkPlugin) && (
                                    <>
                                        {plugin.status === 0 && !plugin.is_private && (
                                            <>
                                                <Button onClick={() => pluginExamine(2)}>不通过</Button>
                                                <Button type='primary' onClick={() => pluginExamine(1)}>
                                                    通过
                                                </Button>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className='plugin-info-examine'>
                                {(isAdmin || userInfo.user_id === plugin.user_id) && (
                                    <>
                                        <Button
                                            type='primary'
                                            danger
                                            onClick={(e) => {
                                                if (!delPluginShow) setDelPluginShow(true)
                                            }}
                                        >
                                            删除
                                        </Button>
                                        {/* base_plugin_id存在时则为复制云端插件 不允许更改 私密/公开 */}
                                        {!plugin?.base_plugin_id && (
                                            <Button type='primary' onClick={() => setIsEdit(true)}>
                                                修改
                                            </Button>
                                        )}
                                    </>
                                )}
                                {isAdmin && !user && (
                                    <>
                                        {plugin.status === 0 && !plugin.is_private && (
                                            <>
                                                <Button onClick={() => pluginExamine(2)}>不通过</Button>
                                                <Button type='primary' onClick={() => pluginExamine(1)}>
                                                    通过
                                                </Button>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <Suspense fallback={<Spin />}>
                        <EditOnlinePluginDetails
                            userInfo={userInfo}
                            pulgin={plugin}
                            visible={isEdit}
                            handleOk={() => {
                                setIsEdit(false)
                                getPluginDetail()
                            }}
                            handleCancel={() => setIsEdit(false)}
                        />
                    </Suspense>
                    <Tabs className='no-theme-tabs' activeKey={tabKey} onChange={(e) => setTabKey(e)}>
                        <TabPane tab='源码' key='1'>
                            <YakEditor type={plugin.type} value={plugin.content} readOnly={true} />
                        </TabPane>
                        <TabPane tab='评论' key='2'>
                            <PluginComment isLogin={userInfo.isLogin} plugin={plugin} />
                        </TabPane>
                    </Tabs>
                </div>
                <YakitHint
                    visible={delPluginShow}
                    title='删除插件'
                    content='是否需要彻底删除插件'
                    okButtonText='放入回收站'
                    cancelButtonText='删除'
                    cancelButtonProps={{
                        style: plugin?.user_id === userInfo.user_id ? undefined : {display: "none"}
                    }}
                    footerExtra={
                        <YakitButton size='max' type='outline2' onClick={() => setDelPluginShow(false)}>
                            取消
                        </YakitButton>
                    }
                    onOk={() => onRemove(false)}
                    onCancel={() => onRemove(true)}
                />
            </Spin>
        </div>
    )
}
