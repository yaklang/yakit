import React, {useEffect, useState} from "react"
import {Button, Form, Input, Row} from "antd"
import "./index.scss"
import {NetWorkApi} from "@/services/fetch"
import {failed, success} from "@/utils/notification"
import {useMemoizedFn} from "ahooks"

const {ipcRenderer} = window.require("electron")

interface OnlineProfileProps {
    BaseUrl: string
    Password: string
}

const layout = {
    labelCol: {span: 5},
    wrapperCol: {span: 19}
}
const tailLayout = {
    wrapperCol: {offset: 5, span: 16}
}

export const ConfigPrivateDomain = React.memo(() => {
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const onFinish = useMemoizedFn((values: OnlineProfileProps) => {
        setLoading(true)
        ipcRenderer
            .invoke("SetOnlineProfile", {
                ...values
            } as OnlineProfileProps)
            .then((data) => {
                success('设置成功')
            })
            .catch((e: any) => failed("设置私有域失败:" + e))
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    useEffect(() => {
        ipcRenderer
            .invoke("GetOnlineProfile", {})
            .then((data: OnlineProfileProps) => {
                form.setFieldsValue({
                    ...data
                })
            })
            .catch((e) => {
                failed(`获取失败:${e}`)
            })
    }, [])
    return (
        <Form {...layout} form={form} name='control-hooks' onFinish={onFinish}>
            {/* rules={[{required: true, message: "该项为必填"}]} */}
            <Form.Item name='BaseUrl' label='私有域地址'>
                <Input placeholder='请输入你的私有域地址' allowClear />
            </Form.Item>
            {/* rules={[{required: true, message: "该项为必填"}]} */}
            <Form.Item name='Password' label='密码'>
                <Input placeholder='请输入你的密码' allowClear />
            </Form.Item>
            <Form.Item {...tailLayout}>
                <Button type='primary' htmlType='submit' className='btn-sure' loading={loading}>
                    确定
                </Button>
            </Form.Item>
        </Form>
    )
})
