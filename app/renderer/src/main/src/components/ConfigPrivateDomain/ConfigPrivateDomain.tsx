import React, {useEffect, useState, useRef} from "react"
import {AutoComplete, Button, Form, Input, Select} from "antd"
import "./ConfigPrivateDomain.scss"
import {NetWorkApi} from "@/services/fetch"
import {failed, success} from "@/utils/notification"
import {loginOut} from "@/utils/login"
import {useDebounceFn, useMemoizedFn, useGetState} from "ahooks"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {useStore} from "@/store"
import yakitImg from "@/assets/yakit.jpg"
import {API} from "@/services/swagger/resposeType"
import {Route} from "@/routes/routeSpec"
import TelecomSmallLogo from "@/assets/img/telecom_logo_small.png"

const {ipcRenderer} = window.require("electron")

interface OnlineProfileProps {
    BaseUrl: string
    user_name: string
    pwd: string
}

const layout = {
    labelCol: {span: 5},
    wrapperCol: {span: 19}
}

interface ConfigPrivateDomainProps {
    onClose?: () => void
    onSuccee?: () => void
    // 是否为企业登录
    enterpriseLogin?: boolean | undefined
}

export const ConfigPrivateDomain: React.FC<ConfigPrivateDomainProps> = React.memo((props) => {
    const {onClose, onSuccee, enterpriseLogin = false} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const [httpHistoryList, setHttpHistoryList] = useState<string[]>([])
    const defaultHttpUrl = useRef<string>("")
    const [formValue, setFormValue, getFormValue] = useGetState<OnlineProfileProps>({
        BaseUrl: "",
        user_name: "",
        pwd: ""
    })
    useEffect(() => {
        getHttpSetting()
    }, [])
    // 全局监听登录状态
    const {userInfo} = useStore()
    const syncLoginOut = async () => {
        await loginOut(userInfo)
    }
    // 企业登录
    const loginUser = useMemoizedFn(() => {
        const {user_name, pwd} = getFormValue()
        NetWorkApi<API.UrmLoginRequest, API.UserData>({
            method: "post",
            url: "urm/login",
            data: {
                user_name,
                pwd
            }
        })
            .then((res: API.UserData) => {
                console.log("返回结果：", res)
                ipcRenderer.invoke("company-sign-in", {...res}).then((data) => {
                    if (data?.next) {
                        success("企业登录成功")
                        onCloseTab()
                        onClose && onClose()
                        onSuccee && onSuccee()
                    }
                })
            })
            .catch((err) => {
                setTimeout(() => setLoading(false), 300)
                failed("企业登录失败：" + err)
            })
            .finally(() => {})
    })
    // 关闭 tab
    const onCloseTab = useMemoizedFn(() => {
        ipcRenderer
            .invoke("send-close-tab", {
                router: Route.YakitPluginJournalDetails,
                singleNode: true
            })
            .then(() => {})
    })
    const onFinish = useMemoizedFn((values: OnlineProfileProps) => {
        setLoading(true)
        ipcRenderer
            .invoke("SetOnlineProfile", {
                ...values
            })
            .then((data) => {
                syncLoginOut()
                ipcRenderer.send("edit-baseUrl", {baseUrl: values.BaseUrl})
                setRemoteValue("httpSetting", JSON.stringify(values))
                addHttpHistoryList(values.BaseUrl)
                setFormValue(values)
                if (!enterpriseLogin) {
                    success("私有域设置成功")
                    onCloseTab()
                    onClose && onClose()
                }
            })
            .catch((e: any) => {
                !enterpriseLogin && setTimeout(() => setLoading(false), 300)
                failed("设置私有域失败:" + e)
            })
            .finally(() => {})
    })
    useEffect(() => {
        ipcRenderer.on("edit-baseUrl-status", (e, res: any) => {
            enterpriseLogin && loginUser()
        })
        return () => {
            ipcRenderer.removeAllListeners("edit-baseUrl-status")
        }
    }, [])
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
    // 判断输入内容是否通过
    const judgePass = () => [
        {
            validator: (_, value) => {
                let re =
                    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.<>?;:\[\]{}~!@#$%^&*()_+-="])[A-Za-z\d.<>?;:\[\]{}~!@#$%^&*()_+-="]{8,20}/
                if (re.test(value)) {
                    return Promise.resolve()
                } else {
                    return Promise.reject("密码为8-20位，且必须包含大小写字母、数字及特殊字符")
                }
            }
        }
    ]
    // 判断是否为网址
    const judgeUrl = () => [
        {
            validator: (_, value) => {
                let re = /http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/
                if (re.test(value)) {
                    return Promise.resolve()
                } else {
                    return Promise.reject("请输入符合要求的私有域地址")
                }
            }
        }
    ]
    return (
        <div className='private-domain'>
            {enterpriseLogin && (
                <div className='login-title-show'>
                    <div className='icon-box'>
                        <img src={TelecomSmallLogo} className='type-icon-img' />
                    </div>
                    <div className='title-box'>企业登录</div>
                </div>
            )}
            <Form {...layout} form={form} name='control-hooks' onFinish={onFinish}>
                <Form.Item
                    name='BaseUrl'
                    label='私有域地址'
                    rules={[{required: true, message: "该项为必填"}, ...judgeUrl()]}
                >
                    <AutoComplete
                        options={httpHistoryList.map((item) => ({value: item}))}
                        placeholder='请输入你的私有域地址'
                        defaultOpen={!enterpriseLogin}
                    />
                </Form.Item>
                {enterpriseLogin && (
                    <Form.Item name='user_name' label='用户名' rules={[{required: true, message: "该项为必填"}]}>
                        <Input placeholder='请输入你的用户名' allowClear />
                    </Form.Item>
                )}
                {enterpriseLogin && (
                    <Form.Item
                        name='pwd'
                        label='密码'
                        rules={[{required: true, message: "该项为必填"}, ...judgePass()]}
                    >
                        <Input.Password placeholder='请输入你的密码' allowClear />
                    </Form.Item>
                )}
                <div className='form-item-submit'>
                    <Button type='primary' htmlType='submit' style={{width: 120}} loading={loading}>
                        {enterpriseLogin ? "登录" : "确定"}
                    </Button>
                </div>
            </Form>
        </div>
    )
})
