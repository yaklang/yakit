import React, {useEffect, useState} from "react"
import {Button, Form, Input, Row} from "antd"
import "./index.scss"
import {NetWorkApi} from "@/services/fetch"
import {failed, success} from "@/utils/notification"
import {loginOut} from "@/utils/login"
import {useMemoizedFn} from "ahooks"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {useStore} from "@/store"

const {ipcRenderer} = window.require("electron")

interface OnlineProfileProps {
    BaseUrl: string
    Password?: string
}

const layout = {
    labelCol: {span: 5},
    wrapperCol: {span: 19}
}
const tailLayout = {
    wrapperCol: {offset: 5, span: 16}
}

interface ConfigPrivateDomainProps {
    onClose: () => void
}

export const ConfigPrivateDomain: React.FC<ConfigPrivateDomainProps> = React.memo((props) => {
    const {onClose} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    // 全局监听登录状态
    const {userInfo} = useStore()
    const syncLoginOut = async () => {
        await loginOut(userInfo)
    }
    const onFinish = useMemoizedFn((values: OnlineProfileProps) => {
        setLoading(true)
        ipcRenderer
            .invoke("SetOnlineProfile", {
                ...values
            } as OnlineProfileProps)
            .then((data) => {
                syncLoginOut()
                ipcRenderer.send("edit-baseUrl", {baseUrl: values.BaseUrl})
                setRemoteValue("httpSetting", JSON.stringify(values))
                success("设置成功")
                onClose()
            })
            .catch((e: any) => failed("设置私有域失败:" + e))
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    useEffect(() => {
        getRemoteValue("httpSetting").then((setting) => {
            const value = JSON.parse(setting)
            form.setFieldsValue({
                ...value
            })
        })
    }, [])
    return (
        <Form {...layout} form={form} name='control-hooks' onFinish={onFinish}>
            <Form.Item name='BaseUrl' label='私有域地址' rules={[{required: true, message: "该项为必填"}]}>
                <Input placeholder='请输入你的私有域地址' allowClear />
            </Form.Item>
            {/* rules={[{required: true, message: "该项为必填"}]} */}
            {/* <Form.Item name='Password' label='密码'>
                <Input placeholder='请输入你的密码' allowClear />
            </Form.Item> */}
            <Form.Item {...tailLayout}>
                <Button type='primary' htmlType='submit' className='btn-sure' loading={loading}>
                    确定
                </Button>
            </Form.Item>
        </Form>
    )
})
