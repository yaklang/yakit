import {YakScript} from "@/pages/invoker/schema"
import Login from "@/pages/Login"
import {DownloadOnlinePluginProps} from "@/pages/yakitStore/YakitPluginInfoOnline"
import {GetYakScriptByOnlineIDRequest} from "@/pages/yakitStore/YakitStorePage"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {useStore} from "@/store"
import {failed, success, warn} from "@/utils/notification"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {useMemoizedFn} from "ahooks"
import {Button, Modal, Radio, Space} from "antd"
import React, {ReactNode, useState} from "react"

const {ipcRenderer} = window.require("electron")

interface SyncCloudButtonProps {
    params: YakScript
    setParams: (s: YakScript) => void
    children: ReactNode
    uploadLoading?: (boolean) => void
}
export const SyncCloudButton: React.FC<SyncCloudButtonProps> = (props) => {
    const {params, setParams, children, uploadLoading} = props
    const {userInfo} = useStore()
    // 登录框状态
    const [loginshow, setLoginShow] = useState<boolean>(false)
    const [visibleSyncSelect, setVisibleSyncSelect] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    // 保存在个人账号
    const upOnlinePlugin = useMemoizedFn(() => {
        const onlineParams: API.SaveYakitPlugin = {
            type: params.Type,
            script_name: params.ScriptName,
            content: params.Content,
            tags: params.Tags && params.Tags !== "null" ? params.Tags.split(",") : undefined,
            params: params.Params.map((p) => ({
                field: p.Field,
                default_value: p.DefaultValue,
                type_verbose: p.TypeVerbose,
                field_verbose: p.FieldVerbose,
                help: p.Help,
                required: p.Required,
                group: p.Group,
                extra_setting: p.ExtraSetting
            })),
            help: params.Help,
            default_open: false,
            // contributors: params.Author
            contributors: params.OnlineContributors || ""
        }
        if (params.OnlineId) {
            onlineParams.id = parseInt(`${params.OnlineId}`)
        }
        setLoading(true)
        if (uploadLoading) uploadLoading(true)
        NetWorkApi<API.SaveYakitPlugin, API.YakitPluginResponse>({
            method: "post",
            url: "yakit/plugin/save",
            data: onlineParams
        })
            .then((res) => {
                setTimeout(() => ipcRenderer.invoke("change-main-menu"), 100)
                ipcRenderer
                    .invoke("DownloadOnlinePluginById", {
                        OnlineID: res.id,
                        UUID: res.uuid
                    } as DownloadOnlinePluginProps)
                    .then(() => {
                        ipcRenderer
                            .invoke("GetYakScriptByOnlineID", {
                                OnlineID: res.id,
                                UUID: res.uuid
                            } as GetYakScriptByOnlineIDRequest)
                            .then((newSrcipt: YakScript) => {
                                setParams(newSrcipt)
                                success("同步成功")
                                setVisibleSyncSelect(false)
                                ipcRenderer
                                    .invoke("delete-yak-script", params.Id)
                                    .then(() => {})
                                    .catch((err) => {
                                        failed("删除本地失败:" + err)
                                    })
                            })
                            .catch((e) => {
                                failed(`查询本地插件错误:${e}`)
                            })
                            .finally(() => {
                                setTimeout(() => {
                                    setLoading(false)
                                    if (uploadLoading) uploadLoading(false)
                                }, 200)
                            })
                    })
                    .catch((err) => {
                        failed("插件下载本地失败:" + err)
                        setTimeout(() => {
                            if (uploadLoading) uploadLoading(false)
                        }, 200)
                    })
            })
            .catch((err) => {
                failed("插件上传失败:" + err)
                setTimeout(() => {
                    if (uploadLoading) uploadLoading(false)
                }, 200)
            })
    })
    // 上传
    const uploadOnline = (item: YakScript) => {
        // if (!(userInfo.user_id == item.UserId || item.UserId == 0)) {
        //     warn("只能上传本人创建的插件!")
        //     return
        // }
        const params: API.NewYakitPlugin = {
            type: item.Type,
            script_name: item.ScriptName,
            content: item.Content,
            tags: item.Tags && item.Tags !== "null" ? item.Tags.split(",") : undefined,
            params: item.Params.map((p) => ({
                field: p.Field,
                default_value: p.DefaultValue,
                type_verbose: p.TypeVerbose,
                field_verbose: p.FieldVerbose,
                help: p.Help,
                required: p.Required,
                group: p.Group,
                extra_setting: p.ExtraSetting
            })),
            help: item.Help,
            default_open: false,
            // contributors: item.OnlineContributors ? item.OnlineContributors : item.Author
            contributors: item.OnlineContributors || ""
        }
        if (item.OnlineId) {
            params.id = parseInt(`${item.OnlineId}`)
        }
        setLoading(true)
        if (uploadLoading) uploadLoading(true)
        NetWorkApi<API.NewYakitPlugin, API.YakitPluginResponse>({
            method: "post",
            url: "yakit/plugin",
            data: params
        })
            .then((res) => {
                // 上传插件到商店后，需要调用下载商店插件接口，给本地保存远端插件Id DownloadOnlinePluginProps
                ipcRenderer
                    .invoke("DownloadOnlinePluginById", {
                        OnlineID: res.id,
                        UUID: res.uuid
                    } as DownloadOnlinePluginProps)
                    .then(() => {
                        ipcRenderer
                            .invoke("GetYakScriptByOnlineID", {
                                OnlineID: res.id,
                                UUID: res.uuid
                            } as GetYakScriptByOnlineIDRequest)
                            .then((newSrcipt: YakScript) => {
                                setParams(newSrcipt)
                                success("同步成功")
                                setVisibleSyncSelect(false)
                                ipcRenderer
                                    .invoke("delete-yak-script", item.Id)
                                    .then(() => {})
                                    .catch((err) => {
                                        failed("删除本地失败:" + err)
                                    })
                            })
                            .catch((e) => {
                                failed(`查询本地插件错误:${e}`)
                            })
                            .finally(() => {
                                setTimeout(() => {
                                    setLoading(false)
                                    if (uploadLoading) uploadLoading(false)
                                }, 200)
                            })
                    })
                    .catch((err) => {
                        failed("插件下载本地失败:" + err)
                        setTimeout(() => {
                            if (uploadLoading) uploadLoading(false)
                        }, 200)
                    })
                success("插件上传成功")
            })
            .catch((err) => {
                failed("插件上传失败:" + err)
                setTimeout(() => {
                    if (uploadLoading) uploadLoading(false)
                }, 200)
            })
    }
    const onSyncCloud = useMemoizedFn(() => {
        if (!userInfo.isLogin) {
            Modal.confirm({
                title: "未登录",
                icon: <ExclamationCircleOutlined />,
                content: "登录后才可同步至云端",
                cancelText: "取消",
                okText: "登录",
                onOk() {
                    setLoginShow(true)
                },
                onCancel() {}
            })
            return
        }
        if ((params.OnlineId as number) > 0) {
            if (params.OnlineIsPrivate) {
                upOnlinePlugin()
            } else {
                uploadOnline(params)
            }
        } else {
            setVisibleSyncSelect(true)
        }
    })
    const onSyncSelect = useMemoizedFn((type) => {
        // 1 私密：个人账号 2公开：审核后同步云端
        if (type === 1) {
            upOnlinePlugin()
        } else {
            uploadOnline(params)
        }
    })
    return (
        <>
            <div
                onClick={(e) => {
                    e.stopPropagation()
                    onSyncCloud()
                }}
            >
                {children}
            </div>
            <ModalSyncSelect
                visible={visibleSyncSelect}
                handleOk={onSyncSelect}
                handleCancel={() => setVisibleSyncSelect(false)}
                loading={loading}
            />
            {loginshow && <Login visible={loginshow} onCancel={() => setLoginShow(false)}></Login>}
        </>
    )
}

interface ModalSyncSelect {
    visible: boolean
    handleOk: (type: number) => void
    handleCancel: () => void
    loading: boolean
}

const ModalSyncSelect: React.FC<ModalSyncSelect> = (props) => {
    const {visible, handleOk, handleCancel, loading} = props
    const [type, setType] = useState<number>(1)
    const onChange = useMemoizedFn((e) => {
        setType(e.target.value)
    })
    return (
        <Modal
            title='同步至云端'
            visible={visible}
            onOk={() => handleOk(type)}
            onCancel={handleCancel}
            okText='确定'
            cancelText='取消'
            confirmLoading={loading}
        >
            <Radio.Group onChange={onChange} value={type}>
                <Space direction='vertical'>
                    <Radio value={1}>私密(仅自己可见)</Radio>
                    <Radio value={2}>公开(审核通过后，将上架到插件商店)</Radio>
                </Space>
            </Radio.Group>
        </Modal>
    )
}
