import {YakScript} from "@/pages/invoker/schema"
import Login from "@/pages/Login"
import {DownloadOnlinePluginProps} from "@/pages/yakitStore/YakitPluginInfoOnline/YakitPluginInfoOnline"
import {GetYakScriptByOnlineIDRequest} from "@/pages/yakitStore/YakitStorePage"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {useStore} from "@/store"
import {failed, success, warn} from "@/utils/notification"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {showModal} from "@/utils/showModal"
import {useMemoizedFn, useGetState} from "ahooks"
import {Button, Modal, Radio, Space, Form, Input,Progress} from "antd"
import React, {ReactNode, useRef, useState} from "react"
import { isEnterpriseEdition } from "@/utils/envfile"
import styles from "./SyncCloudButton.module.scss"
import { YakitRoute } from "@/routes/newRoute"

const {ipcRenderer} = window.require("electron")

export const onLocalScriptToOnlinePlugin = (params: YakScript, type?: number) => {
    const onlineParams = {
        type: params.Type,
        script_name: params.ScriptName,
        content: params.Content || "",
        tags: params.Tags && params.Tags !== "null" ? params.Tags.split(",") : undefined,
        params:
            params.Params.map((p) => ({
                field: p.Field || "",
                default_value: p.DefaultValue || "",
                type_verbose: p.TypeVerbose || "",
                field_verbose: p.FieldVerbose || "",
                help: p.Help || "",
                // value:p.Value||'',
                required: p.Required || false,
                group: p.Group || "",
                extra_setting: p.ExtraSetting || "",
                method_type: p.MethodType || ""
            })) || [],
        help: params.Help || "",
        contributors: params.OnlineContributors || params.Author || "",
        default_open: false, // 这个字段暂时无用
        //
        enable_plugin_selector: params.EnablePluginSelector,
        plugin_selector_types: params.PluginSelectorTypes,
        is_general_module: params.IsGeneralModule,
        is_private: false
    }
    if (type) {
        onlineParams.default_open = type === 1 ? false : true
        onlineParams.is_private = type === 1 ? true : false
    }
    return onlineParams
}

interface SyncCloudButtonProps {
    params: YakScript
    setParams: (s: YakScript) => void
    children: ReactNode
    uploadLoading?: (boolean) => void
    isCreate?: boolean
}

export const SyncCloudButton: React.FC<SyncCloudButtonProps> = (props) => {
    const {params, setParams, children, uploadLoading, isCreate} = props
    const {userInfo} = useStore()
    // 登录框状态
    const [loginshow, setLoginShow] = useState<boolean>(false)
    const [visibleSyncSelect, setVisibleSyncSelect] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)

    const upOnlinePlugin = useMemoizedFn((type: number) => {
        const onlineParams: API.NewYakitPlugin = onLocalScriptToOnlinePlugin(params, type)
        if (params.OnlineId) {
            onlineParams.id = parseInt(`${params.OnlineId}`)
        }
        if(isEnterpriseEdition()&&params.OnlineGroup){
            onlineParams.group = params.OnlineGroup
        }
        setLoading(true)
        if (uploadLoading) uploadLoading(true)
        NetWorkApi<API.NewYakitPlugin, API.YakitPluginResponse>({
            method: "post",
            url:"yakit/plugin",
            data: onlineParams
        })
            .then((res) => {
                ipcRenderer
                    .invoke("DownloadOnlinePluginById", {
                        OnlineID: res.id,
                        UUID: res.uuid
                    } as DownloadOnlinePluginProps)
                    .then(() => {
                        setTimeout(() => ipcRenderer.invoke("change-main-menu"), 100)
                        ipcRenderer
                            .invoke("GetYakScriptByOnlineID", {
                                OnlineID: res.id,
                                UUID: res.uuid
                            } as GetYakScriptByOnlineIDRequest)
                            .then((newSrcipt: YakScript) => {
                                setParams(newSrcipt)
                                success("同步成功")
                                setVisibleSyncSelect(false)
                                if (isCreate) {
                                    ipcRenderer
                                        .invoke("delete-yak-script", params.Id)
                                        .then(() => {})
                                        .catch((err) => {
                                            failed("删除本地失败:" + err)
                                        })
                                        .finally(() => {
                                            ipcRenderer
                                                .invoke("send-close-tab", {
                                                    router: YakitRoute.AddYakitScript
                                                })
                                                .finally(() => ipcRenderer.invoke("send-local-script-list"))
                                        })
                                }
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
                            setLoading(false)
                            if (uploadLoading) uploadLoading(false)
                        }, 200)
                    })
            })
            .catch((err) => {
                failed("插件上传失败:" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                    if (uploadLoading) uploadLoading(false)
                }, 200)
            })
    })
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
                upOnlinePlugin(1)
            } else {
                upOnlinePlugin(2)
            }
        } else {
            setVisibleSyncSelect(true)
        }
    })
    const onSyncSelect = useMemoizedFn((type) => {
        // 1 私密：个人账号 2公开：审核后同步云端
        if (type === 1) {
            upOnlinePlugin(1)
        } else {
            upOnlinePlugin(2)
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
            <div onClick={(e)=>{e.stopPropagation()}}>
              <ModalSyncSelect
                visible={visibleSyncSelect}
                handleOk={onSyncSelect}
                handleCancel={() => setVisibleSyncSelect(false)}
                loading={loading}
            />  
            </div>
            {loginshow && <Login visible={loginshow} onCancel={() => setLoginShow(false)}></Login>}
        </>
    )
}

interface ModalSyncSelect {
    visible: boolean
    handleOk: (type: number) => void
    handleCancel: () => void
    loading?: boolean
}

export const ModalSyncSelect: React.FC<ModalSyncSelect> = (props) => {
    const {visible, handleOk, handleCancel, loading=false} = props
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

export interface SyncCloudProgressProps{
    visible: boolean
    onCancle:()=>void
    nowPligin: string
    progress: number
}

export const SyncCloudProgress: React.FC<SyncCloudProgressProps> = (props) => {
    const {visible,onCancle,nowPligin,progress} = props
    return (
        <Modal
            visible={visible}
            destroyOnClose={true}
            footer={null}
            onCancel={() => onCancle()}
            title="上传进度"
        >
            <div className={styles['sync-cloud-progress']}>
                <Progress size='small' percent={progress} />
                <div className='yakit-single-line-ellipsis'>{nowPligin}</div>
                <div className={styles['btn-box']}>
                    <Button type='primary' onClick={() => onCancle()}>
                        取消上传
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
