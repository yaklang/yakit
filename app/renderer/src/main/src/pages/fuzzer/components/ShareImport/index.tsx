import React, {useEffect, useRef, useState} from "react"
import {Button, Form, Input, InputNumber} from "antd"
import {useMemoizedFn} from "ahooks"
import {failed, warn} from "@/utils/notification"
import "./index.scss"
import {API} from "@/services/swagger/resposeType"
import {NetWorkApi} from "@/services/fetch"
import {useStore} from "@/store"

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
            <Form {...layout} name='control-hooks' onFinish={onFinish}>
                <Form.Item name='share_id' label='分享id' rules={[{required: true, message: "该项为必填"}]}>
                    <Input placeholder='请输入分享id' />
                </Form.Item>
                {isShowPassword && (
                    <Form.Item name='extract_code' label='密码' rules={[{required: true, message: "该项为必填"}]}>
                        <Input placeholder='请输入密码' allowClear />
                    </Form.Item>
                )}
                <Form.Item {...tailLayout}>
                    <Button type='primary' htmlType='submit' className='btn-sure' loading={loading}>
                        确定
                    </Button>
                </Form.Item>
            </Form>
        </>
    )
}
