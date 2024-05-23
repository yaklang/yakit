import React, {useEffect, useState, useRef} from "react"
import {AutoComplete, Button, Form, Input, Select, Tooltip} from "antd"
import "./ConfigPrivateDomain.scss"
import {NetWorkApi} from "@/services/fetch"
import {failed, success, yakitFailed} from "@/utils/notification"
import {loginOut, aboutLoginUpload, loginHTTPFlowsToOnline} from "@/utils/login"
import {useDebounceFn, useMemoizedFn, useGetState} from "ahooks"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {useStore} from "@/store"
import yakitImg from "@/assets/yakit.jpg"
import {API} from "@/services/swagger/resposeType"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitAutoComplete, defYakitAutoCompleteRef} from "../yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {InformationCircleIcon} from "@/assets/newIcon"
import {CacheDropDownGV, RemoteGV} from "@/yakitGV"
import emiter from "@/utils/eventBus/eventBus"
import {YakitAutoCompleteRefProps} from "../yakitUI/YakitAutoComplete/YakitAutoCompleteType"
const {ipcRenderer} = window.require("electron")

interface OnlineProfileProps {
    BaseUrl: string
    Proxy: string
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
    // 是否展示跳过
    skipShow?: boolean
}

export const ConfigPrivateDomain: React.FC<ConfigPrivateDomainProps> = React.memo((props) => {
    const {onClose, onSuccee, enterpriseLogin = false, skipShow = false} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const httpHistoryRef: React.MutableRefObject<YakitAutoCompleteRefProps> = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })
    const [defaultHttpUrl, setDefaultHttpUrl] = useState<string>("")
    const httpProxyRef: React.MutableRefObject<YakitAutoCompleteRefProps> = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })
    const [formValue, setFormValue, getFormValue] = useGetState<OnlineProfileProps>({
        BaseUrl: "",
        Proxy: "",
        user_name: "",
        pwd: ""
    })
    useEffect(() => {
        getHttpSetting()
    }, [])
    // 全局监听登录状态
    const {userInfo, setStoreUserInfo} = useStore()

    const syncLoginOut = async () => {
        try {
            await loginOut(userInfo)
        } catch (error) {}
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
                ipcRenderer.invoke("company-sign-in", {...res}).then((data) => {
                    const user = {
                        isLogin: true,
                        platform: res.from_platform,
                        githubName: res.from_platform === "github" ? res.name : null,
                        githubHeadImg: res.from_platform === "github" ? res.head_img : null,
                        wechatName: res.from_platform === "wechat" ? res.name : null,
                        wechatHeadImg: res.from_platform === "wechat" ? res.head_img : null,
                        qqName: res.from_platform === "qq" ? res.name : null,
                        qqHeadImg: res.from_platform === "qq" ? res.head_img : null,
                        companyName: res.from_platform === "company" ? res.name : null,
                        companyHeadImg: res.from_platform === "company" ? res.head_img : null,
                        role: res.role,
                        user_id: res.user_id,
                        token: res.token,
                    }
                    setStoreUserInfo(user)
                    if (data?.next) {
                        aboutLoginUpload(res.token)
                        loginHTTPFlowsToOnline(res.token)
                        success("企业登录成功")
                        onClose && onClose()
                        onSuccee && onSuccee()
                    }
                    // 首次登录强制修改密码
                    if (!res.loginTime) {
                        ipcRenderer.invoke("reset-password", {...res})
                    }
                })
            })
            .catch((err) => {
                setTimeout(() => setLoading(false), 300)
                failed("企业登录失败：" + err)
            })
            .finally(() => {})
    })

    const onFinish = useMemoizedFn((v: OnlineProfileProps) => {
        setLoading(true)
        const values = {
            ...formValue,
            ...v,
            IsCompany: enterpriseLogin
        }
        ipcRenderer
            .invoke("SetOnlineProfile", {
                ...values
            })
            .then((data) => {
                addHttpHistoryList(values.BaseUrl)
                if (values.Proxy) {
                    addProxyList(values.Proxy)
                }
                setFormValue(values)
                if (!enterpriseLogin) {
                    ipcRenderer.invoke("ipc-sign-out")
                    success("私有域设置成功")
                    syncLoginOut()
                    onClose && onClose()
                }
                ipcRenderer.send("edit-baseUrl", {baseUrl: values.BaseUrl})
                if (v?.pwd) {
                    // 加密
                    ipcRenderer
                        .invoke("Codec", {Type: "base64", Text: v.pwd, Params: [], ScriptName: ""})
                        .then((res) => {
                            setRemoteValue(RemoteGV.HttpSetting, JSON.stringify({...values, pwd: res.Result}))
                        })
                        .catch(() => {})
                } else {
                    setRemoteValue(RemoteGV.HttpSetting, JSON.stringify(values))
                }
            })
            .catch((e: any) => {
                // !enterpriseLogin && setTimeout(() => setLoading(false), 300)
                failed("设置私有域失败:" + e)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 300)
            })
    })
    useEffect(() => {
        ipcRenderer.on("edit-baseUrl-status", (e, res: any) => {
            enterpriseLogin && loginUser()
            emiter.emit("onSwitchPrivateDomain", "") // 修改私有域成功后发送的信号
        })
        return () => {
            ipcRenderer.removeAllListeners("edit-baseUrl-status")
        }
    }, [])
    const addHttpHistoryList = useMemoizedFn((url) => {
        httpHistoryRef.current.onSetRemoteValues(url)
    })
    const getHttpSetting = useMemoizedFn(() => {
        getRemoteValue(RemoteGV.HttpSetting).then((setting) => {
            if (!setting) return
            const value = JSON.parse(setting)
            setDefaultHttpUrl(value.BaseUrl)
            if (value?.pwd && value.pwd.length > 0) {
                // 解密
                ipcRenderer
                    .invoke("Codec", {Type: "base64-decode", Text: value.pwd, Params: [], ScriptName: ""})
                    .then((res) => {
                        form.setFieldsValue({
                            ...value,
                            pwd: res.Result
                        })
                        setFormValue({...value, pwd: res.Result})
                    })
                    .catch(() => {})
            } else {
                form.setFieldsValue({
                    ...value
                })
                setFormValue({...value})
            }
        })
    })
    /**@description 增加代理list历史 */
    const addProxyList = useMemoizedFn((url) => {
        httpProxyRef.current.onSetRemoteValues(url)
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
                if (/\s/.test(value)) {
                    return Promise.reject("私有域地址存在空格")
                } else if (re.test(value)) {
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
                        <img src={yakitImg} className='type-icon-img' />
                    </div>
                    <div className='title-box'>企业登录</div>
                </div>
            )}
            <Form {...layout} form={form} name='control-hooks' onFinish={(v) => onFinish(v)} size='small'>
                <Form.Item
                    name='BaseUrl'
                    label='私有域地址'
                    rules={[{required: true, message: "该项为必填"}, ...judgeUrl()]}
                >
                    <YakitAutoComplete
                        ref={httpHistoryRef}
                        cacheHistoryDataKey={CacheDropDownGV.ConfigBaseUrl}
                        initValue={defaultHttpUrl}
                        placeholder='请输入你的私有域地址'
                        defaultOpen={!enterpriseLogin}
                    />
                </Form.Item>
                {!enterpriseLogin && (
                    <Form.Item
                        name='Proxy'
                        label={
                            <span className='form-label'>
                                设置代理
                                <Tooltip
                                    title='特殊情况无法访问插件商店时，可设置代理进行访问'
                                    overlayStyle={{width: 150}}
                                >
                                    <InformationCircleIcon className='info-icon' />
                                </Tooltip>
                            </span>
                        }
                    >
                        <YakitAutoComplete
                            ref={httpProxyRef}
                            cacheHistoryDataKey={CacheDropDownGV.ConfigProxy}
                            placeholder='设置代理'
                        />
                    </Form.Item>
                )}
                {enterpriseLogin && (
                    <Form.Item name='user_name' label='用户名' rules={[{required: true, message: "该项为必填"}]}>
                        <YakitInput placeholder='请输入你的用户名' allowClear />
                    </Form.Item>
                )}
                {enterpriseLogin && (
                    <Form.Item
                        name='pwd'
                        label='密码'
                        rules={[{required: true, message: "该项为必填"}, ...judgePass()]}
                    >
                        <YakitInput.Password placeholder='请输入你的密码' allowClear />
                    </Form.Item>
                )}
                {enterpriseLogin ? (
                    <Form.Item label={" "} colon={false} className='form-item-submit'>
                        {skipShow && (
                            <YakitButton
                                style={{width: 165, marginRight: 12}}
                                onClick={() => {
                                    onSuccee && onSuccee()
                                }}
                                size='large'
                            >
                                跳过
                            </YakitButton>
                        )}
                        <YakitButton
                            size='large'
                            type='primary'
                            htmlType='submit'
                            style={{width: 165, marginLeft: skipShow ? 0 : 43}}
                            loading={loading}
                        >
                            登录
                        </YakitButton>
                    </Form.Item>
                ) : (
                    <div className='form-btns'>
                        <YakitButton type='outline2' onClick={(e) => onClose && onClose()}>
                            取消
                        </YakitButton>
                        <YakitButton type='primary' htmlType='submit' loading={loading}>
                            确定
                        </YakitButton>
                    </div>
                )}
            </Form>
        </div>
    )
})
