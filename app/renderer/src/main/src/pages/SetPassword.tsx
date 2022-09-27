import React, {ReactNode, useEffect, useRef, useState} from "react"
import {Form, Input, Button} from "antd"
import {warn,failed, success} from "@/utils/notification"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {} from "@ant-design/icons"

const {ipcRenderer} = window.require("electron")

export interface SetPasswordProp {
    onCancel:()=>void
}

const layout = {
    labelCol: {span: 5},
    wrapperCol: {span: 19}
}

const SetPassword: React.FC<SetPasswordProp> = (props) => {
    const [form] = Form.useForm()
    const {getFieldValue} = form;
    const [loading, setLoading] = useState<boolean>(false)
    const onFinish = useMemoizedFn((values) => {
        console.log("values",values)
        if(getFieldValue("Password")!==getFieldValue("CachePassword")){
            console.log("ppx")
            warn("新密码两次输入内容不匹配，请检查重试")
        }
    })
    // 判断输入内容是否通过
    const judgePass = () => [
        {
            validator: (_, value) => {
                let re = /^(?![A-z0-9]+$)(?![A-z~@*()_]+$)(?![0-9~@*()_]+$)([A-z0-9~@*()_]{8,20})$/
                if (re.test(value)) {
                    return Promise.resolve()
                } else {
                    return Promise.reject("密码为8-20位，且必须包含大小写字母、数字及特殊字符")
                }
            }
        }
    ]
    
    return (
        <div>
            <Form {...layout} form={form} onFinish={onFinish}>
                <Form.Item name='UserName' label='旧密码' rules={[{required: true, message: "该项为必填"}]}>
                    <Input placeholder='请输入你的旧密码' allowClear />
                </Form.Item>
                <Form.Item
                    name='CachePassword'
                    label='新密码'
                    rules={[{required: true, message: "该项为必填"}, ...judgePass()]}
                >
                    <Input.Password placeholder='请输入你的新密码' allowClear />
                </Form.Item>
                <Form.Item
                    name='Password'
                    label='确认密码'
                    rules={[{required: true, message: "该项为必填"}, ...judgePass()]}
                >
                    <Input.Password placeholder='请确认你的密码' allowClear />
                </Form.Item>
                <div style={{textAlign: "center"}}>
                    <Button type='primary' htmlType='submit' loading={loading}>
                        修改密码
                    </Button>
                </div>
            </Form>
        </div>
    )
}

export default SetPassword
