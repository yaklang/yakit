import React, {useEffect, useRef, useState} from "react"
import {Button, Form, Input, InputNumber} from "antd"
import {useMemoizedFn} from "ahooks"
import {failed, info, warn} from "@/utils/notification"
import "./index.scss"
import {API} from "@/services/swagger/resposeType"
import {NetWorkApi} from "@/services/fetch"
import {useStore} from "@/store"
import {showModal} from "@/utils/showModal"
import {LoadYakitPluginForm} from "@/pages/yakitStore/YakitStorePage"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"

const layout = {
    labelCol: {span: 5},
    wrapperCol: {span: 19}
}
const tailLayout = {
    wrapperCol: {offset: 5, span: 16}
}

const {ipcRenderer} = window.require("electron")

interface ShareImportProps {
    onClose: () => void
}

interface pwdRequestProps {
    share_id: string
}

export function onImportShare() {
    const m = showYakitModal({
        title: "导入协作资源",
        content: <ShareImport onClose={() => m.destroy()} />,
        footer: null
    })
}
export function onImportPlugin() {
    const m = showYakitModal({
        title: "导入插件ID",
        width: 800,
        footer: null,
        content: (
            <div style={{width: 780,padding:24}}>
                <LoadYakitPluginForm
                    onlyId={true}
                    onFinished={() => {
                        info("更新进程执行完毕")
                        m.destroy()
                    }}
                />
            </div>
        )
    })
}

export const ShareImport: React.FC<ShareImportProps> = (props) => {
    const {onClose} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [isShowPassword, setIsShowPassword] = useState<boolean>(false)
    // 全局监听登录状态
    const {userInfo} = useStore()
    const onFinish = useMemoizedFn((value) => {
        if (value.extract_code) {
            onShareExtract(value)
        } else {
            onExtractPwd(value)
        }
    })

    const onExtractPwd = useMemoizedFn((value) => {
        setLoading(true)
        NetWorkApi<pwdRequestProps, boolean>({
            url: "module/extract/pwd",
            method: "get",
            params: {
                share_id: value.share_id
            }
        })
            .then((pwd) => {
                if (pwd) {
                    setIsShowPassword(true)
                    warn("该分享需要输入密码!")
                } else {
                    onShareExtract(value)
                }
            })
            .catch((err) => {
                failed(err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })

    const onShareExtract = useMemoizedFn((value) => {
        if (userInfo.isLogin) {
            value.token = userInfo.token
        }
        setLoading(true)
        NetWorkApi<API.ShareResponse, API.ExtractResponse>({
            url: "module/extract",
            method: "post",
            data: value
        })
            .then((res) => {
                const shareContent = JSON.parse(res.extract_content)
                ipcRenderer
                    .invoke("send-to-tab", {
                        type: res.module,
                        data: {
                            isHttps: shareContent.isHttps,
                            isGmTLS: shareContent.isGmTLS,
                            request: shareContent.request,
                            shareContent: res.extract_content
                        }
                    })
                    .then(() => {
                        onClose()
                    })
                    .catch((err) => {
                        failed("打开web fuzzer失败:" + err)
                    })
            })
            .catch((err) => {
                failed("获取分享数据失败：" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })
    return (
        <>
            <Form {...layout} name='control-hooks' onFinish={onFinish} style={{padding: 24}}>
                <Form.Item name='share_id' label='分享id' rules={[{required: true, message: "该项为必填"}]}>
                    <YakitInput placeholder='请输入分享id' />
                </Form.Item>
                {isShowPassword && (
                    <Form.Item name='extract_code' label='密码' rules={[{required: true, message: "该项为必填"}]}>
                        <YakitInput placeholder='请输入密码' allowClear />
                    </Form.Item>
                )}
                <Form.Item {...tailLayout}>
                    <YakitButton type='primary' htmlType='submit' className='btn-sure' loading={loading}>
                        确定
                    </YakitButton>
                </Form.Item>
            </Form>
        </>
    )
}
