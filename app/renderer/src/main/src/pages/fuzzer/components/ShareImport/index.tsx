import React, {useEffect, useRef, useState} from "react"
import {Button, Form, Input, Modal, Radio} from "antd"
import {useMemoizedFn, useHover} from "ahooks"
import {useStore} from "@/store"
import {warn, success} from "@/utils/notification"
import {ShareDataResProps} from "../ShareData/index"
import "./index.scss"

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
    const onFinish = useMemoizedFn((value: ShareDataResProps) => {
        console.log("value", value)
        const shareContent = {
            advancedConfig: true,
            advancedConfiguration: {
                actualHost: "",
                concurrent: 24,
                forceFuzz: true,
                isHttps: true,
                maxDelaySeconds: 0,
                minDelaySeconds: 0,
                noFixContentLength: true,
                proxy: "http://127.0.0.1:7890",
                timeout: 30,
                _filterMode: "match",
                getFilter: {
                    Keywords: [],
                    MaxBodySize: 0,
                    MinBodySize: 0,
                    Regexps: [],
                    StatusCode: []
                }
            },
            isHttps: true,
            request: 'POST / HTTP/1.1\nContent-Type: application/json\nHost: www.example.com\n\n{"key": "value"}'
        }
        setLoading(true)
        ipcRenderer
            .invoke("send-to-tab", {
                type: "fuzzer",
                data: {
                    isHttps:shareContent.isHttps,
                    request:shareContent.request,
                    shareContent: JSON.stringify(shareContent)
                }
            })
            .then(() => {
                setLoading(false)
                onClose()
            })
    })
    return (
        <>
            <Form {...layout} name='control-hooks' onFinish={onFinish}>
                <Form.Item name='share_id' label='分享id' rules={[{required: true, message: "该项为必填"}]}>
                    <Input placeholder='请输入分享id' allowClear />
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
