import React, {useEffect, useState, useRef} from "react"
import {Button, Form, Input, Select} from "antd"
import "./index.scss"
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
    onClose: () => void
}

export const ConfigPrivateDomain: React.FC<ConfigPrivateDomainProps> = React.memo((props) => {
    const {onClose} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const [httpHistoryList, setHttpHistoryList] = useState<string[]>([])
    const defaultHttpUrl = useRef<string>("")
    const [searchValue, setSearchValue] = useState("")
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
            setSearchValue(value.BaseUrl)
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
    const onSearch = useMemoizedFn((value) => {
        if (value) {
            setSearchValue(value)
            form.setFieldsValue({
                BaseUrl: value
            })
        }
    })
    const onSelect = useMemoizedFn((value) => {
        setSearchValue(value)
        form.setFieldsValue({
            BaseUrl: value
        })
    })
    const onInputKeyDown = useMemoizedFn((e) => {
        if(e.key==="Backspace"&&searchValue.length===1){
            setSearchValue('')
            form.setFieldsValue({
                BaseUrl: ''
            })
        }
    })
    return (
        <Form {...layout} form={form} name='control-hooks' onFinish={onFinish}>
            <Form.Item name='BaseUrl' label='私有域地址' rules={[{required: true, message: "该项为必填"}]}>
                <Select
                    onInputKeyDown={onInputKeyDown}
                    placeholder='请输入你的私有域地址'
                    showArrow={false}
                    autoClearSearchValue={false}
                    showSearch
                    filterOption={false}
                    onSelect={onSelect}
                    onSearch={onSearch}
                    searchValue={searchValue}
                >
                    {httpHistoryList.map((item) => (
                        <Option value={item} key={item}>
                            {item}
                        </Option>
                    ))}
                </Select>
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






