import React, {useEffect, useRef, useState} from "react"
import {Button, Form, Input, InputNumber} from "antd"
import {useMemoizedFn} from "ahooks"
import {failed} from "@/utils/notification"
import "./index.scss"
import {API} from "@/services/swagger/resposeType"
import {NetWorkApi} from "@/services/fetch"

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

export const ShareImport: React.FC<ShareImportProps> = (props) => {
    const {onClose} = props
    const [loading, setLoading] = useState<boolean>(false)
    const onFinish = useMemoizedFn((value) => {
        if (isNaN(parseInt(value.share_id))) {
            failed("请输入整数")
            return
        }
        value.share_id = parseInt(value.share_id)
        console.log("value", value)
        setLoading(true)
        NetWorkApi<API.ShareResponse, string>({
            url: "module/extract",
            method: "post",
            data: value
        })
            .then((res) => {
                const shareContent = JSON.parse(res)
                ipcRenderer
                    .invoke("send-to-tab", {
                        type: "fuzzer",
                        data: {
                            isHttps: shareContent.isHttps,
                            request: shareContent.request,
                            shareContent: res
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
                <Form.Item name='extract_code' label='密码' rules={[{required: true, message: "该项为必填"}]}>
                    <Input placeholder='请输入密码' allowClear />
                </Form.Item>
                <Form.Item {...tailLayout}>
                    <Button type='primary' htmlType='submit' className='btn-sure' loading={loading}>
                        确定
                    </Button>
                </Form.Item>
            </Form>
        </>
    )
}
