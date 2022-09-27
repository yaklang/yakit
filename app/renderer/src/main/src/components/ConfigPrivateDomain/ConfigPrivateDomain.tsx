import React, {useEffect, useState, useRef} from "react"
import {AutoComplete, Button, Form, Input, Select} from "antd"
import "./ConfigPrivateDomain.scss"
import {NetWorkApi} from "@/services/fetch"
import {failed, success} from "@/utils/notification"
import {loginOut} from "@/utils/login"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {useStore} from "@/store"

const {ipcRenderer} = window.require("electron")

const {Option} = Select

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
    onClose: () => void,
    enterpriseLogin?:boolean|undefined
}

export const ConfigPrivateDomain: React.FC<ConfigPrivateDomainProps> = React.memo((props) => {
    const {onClose,enterpriseLogin} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const [httpHistoryList, setHttpHistoryList] = useState<string[]>([])
    const defaultHttpUrl = useRef<string>("")
    useEffect(() => {
        getHttpSetting()
    }, [])
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
                addHttpHistoryList(values.BaseUrl)
                success("设置成功")
                onClose()
            })
            .catch((e: any) => failed("设置私有域失败:" + e))
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    const addHttpHistoryList = useMemoizedFn((url) => {
        const index = httpHistoryList.findIndex((u) => u === url)
        if (index !== -1) return
        httpHistoryList.push(url)
        setRemoteValue("httpHistoryList", JSON.stringify(httpHistoryList))
    })
    const getHttpSetting = useMemoizedFn(() => {
        getRemoteValue("httpSetting").then((setting) => {
            if (!setting) return
            const value = JSON.parse(setting)
            defaultHttpUrl.current = value.BaseUrl
            getHistoryList()
            form.setFieldsValue({
                ...value
            })
        })
    })
    const getHistoryList = useMemoizedFn(() => {
        getRemoteValue("httpHistoryList").then((listString) => {
            if (listString) {
                const list: string[] = JSON.parse(listString)
                setHttpHistoryList(list)
            } else {
                const defList: string[] = [defaultHttpUrl.current]
                setHttpHistoryList(defList)
                addHttpHistoryList(defaultHttpUrl.current)
            }
        })
    })
    return (
        <div className='private-domain'>
            <Form {...layout} form={form} name='control-hooks' onFinish={onFinish}>
                <Form.Item name='BaseUrl' label='私有域地址' rules={[{required: true, message: "该项为必填"}]}>
                    <AutoComplete
                        options={httpHistoryList.map((item) => ({value: item}))}
                        placeholder='请输入你的私有域地址'
                        defaultOpen={true}
                    />
                </Form.Item>
                {enterpriseLogin&&<Form.Item name='UserName' label='用户名' rules={[{required: true, message: "该项为必填"}]}>
                    <Input placeholder='请输入你的用户名' allowClear />
                </Form.Item>}
                {enterpriseLogin&&<Form.Item name='Password' label='密码' rules={[{required: true, message: "该项为必填"}]}>
                    <Input placeholder='请输入你的密码' allowClear />
                </Form.Item>}
                <div className="form-item-submit">
                    <Button type='primary' htmlType='submit' loading={loading}>
                        {enterpriseLogin?"登录":"确定"}
                    </Button>
                </div>
            </Form>
        </div>
    )
})
