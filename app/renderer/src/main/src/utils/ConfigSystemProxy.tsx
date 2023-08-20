import React, {useEffect, useState} from "react"
import {showModal} from "./showModal"
import {Alert, Button, Form, Input, Space, Spin, Tag, Upload} from "antd"
import {InputItem, SwitchItem} from "./inputUtil"
import {useMemoizedFn} from "ahooks"
import {info, yakitFailed, warn} from "@/utils/notification"
import {ReloadOutlined} from "@ant-design/icons"
import {IsWindows} from "@/utils/basic"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import styles from "./ConfigSystemProxy.module.scss"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {InformationCircleIcon, RemoveIcon} from "@/assets/newIcon"
import classNames from "classnames"
import { getRemoteValue, setRemoteValue } from "./kv"
import { RemoteGV } from "@/yakitGV"

export interface ConfigSystemProxyProp {
    defaultProxy?: string
    onClose: () => void
}

const {ipcRenderer} = window.require("electron")

export const ConfigSystemProxy: React.FC<ConfigSystemProxyProp> = (props) => {
    const {onClose} = props
    const [proxy, setProxy] = useState(props.defaultProxy ? props.defaultProxy : "127.0.0.1:8083")
    const [enable, setEnable] = useState(!!props.defaultProxy)
    const [loading, setLoading] = useState(false)
    const [current, setCurrent] = useState<{
        Enable: boolean
        CurrentProxy: string
    }>({Enable: false, CurrentProxy: props.defaultProxy ? props.defaultProxy : "127.0.0.1:8083"})

    const update = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer
            .invoke("GetSystemProxy", {})
            .then((req: {CurrentProxy: string; Enable: boolean}) => {
                setCurrent(req)
                setProxy(req.CurrentProxy ? req.CurrentProxy : "127.0.0.1:8083")
                setEnable(req.Enable)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    useEffect(() => {
        update()
    }, [])
    useEffect(() => {
        setEnable(proxy === current.CurrentProxy)
    }, [proxy])
    const onSetSystemProxy = useMemoizedFn(() => {
        ipcRenderer
            .invoke("SetSystemProxy", {
                HttpProxy: proxy,
                Enable: !enable
            })
            .then((e) => {
                info("设置系统代理成功")
                onClose()
            })
            .catch((err) => {
                yakitFailed("设置系统代理失败:" + err)
            })
    })
    return (
        <YakitSpin spinning={loading}>
            <div className={styles["config-system-proxy"]}>
                <div className={styles["config-system-proxy-heard"]}>
                    <div className={styles["config-system-proxy-title"]}>配置系统代理</div>
                    <RemoveIcon className={styles["close-icon"]} onClick={() => onClose()} />
                </div>
                <div
                    className={classNames(styles["config-system-proxy-status-success"], {
                        [styles["config-system-proxy-status-danger"]]: !current.Enable
                    })}
                >
                    当前系统代理状态：
                    <span>{current.Enable ? "已启用" : "未启用"}</span>
                </div>
                <Form layout='vertical' style={{padding: "0 24px 24px"}}>
                    <Form.Item
                        label='系统代理'
                        help='系统代理能帮助用户自动代理系统所有请求，全局抓包'
                        tooltip={{
                            title: "由于操作系统与 Yak 内核限制，无法使用原生 MacOS OC/Swift 接口实现设置代理。 Yak 引擎将弹出 osascript 授权页以改动系统代理，MacOS 用户认证即可。",
                            icon: <InformationCircleIcon />
                        }}
                    >
                        <YakitInput
                            addonBefore={proxy.includes("://") ? undefined : "http(s)://"}
                            value={proxy}
                            onChange={(e) => {
                                setProxy(e.target.value)
                            }}
                            placeholder={"127.0.0.1:8083"}
                            size='large'
                        />
                    </Form.Item>
                    <div className={styles["config-system-proxy-btns"]}>
                        <YakitButton type='outline2' size='large' onClick={() => onClose()}>
                            取消
                        </YakitButton>
                        <YakitButton
                            colors={enable ? "danger" : "primary"}
                            size='large'
                            onClick={() => onSetSystemProxy()}
                        >
                            {enable ? "停用" : "启用"}
                        </YakitButton>
                    </div>
                </Form>
            </div>
        </YakitSpin>
    )
}

export const showConfigSystemProxyForm = (addr?: string) => {
    const m = showYakitModal({
        title: null,
        width: 450,
        footer: null,
        closable: false,
        centered: true,
        content: (
            <>
                <ConfigSystemProxy
                    defaultProxy={addr}
                    onClose={() => {
                        m.destroy()
                    }}
                />
            </>
        )
    })
}

interface ConfigChromePathProp {
    onClose: () => void
    submitAlreadyChromePath: (v:boolean) => void
}

export const ConfigChromePath: React.FC<ConfigChromePathProp> = (props) => {
    const {onClose,submitAlreadyChromePath} = props
    const [loading, setLoading] = useState<boolean>(true)
    const [chromePath,setChromePath] = useState<string>()

    useEffect(()=>{
        getRemoteValue(RemoteGV.GlobalChromePath).then((setting) => {
            setLoading(false)
            if (!setting) return
            const values:string = JSON.parse(setting)
            setChromePath(values)
        })
    },[])

    const onSetChromePath = useMemoizedFn(() => {
        setRemoteValue(RemoteGV.GlobalChromePath, JSON.stringify(chromePath))
        if(chromePath&&chromePath.length>0){
            submitAlreadyChromePath(true)  
        }
        else{
            submitAlreadyChromePath(false) 
        }
        info("设置Chrome启动路径成功")
        onClose()
    })

    const suffixFun = (file_name: string) => {
        let file_index = file_name.lastIndexOf(".");
        return file_name.slice(file_index, file_name.length);
    };
    return (
        <YakitSpin spinning={loading}>
            <div className={styles["config-system-proxy"]}>
                <div className={styles["config-system-proxy-heard"]}>
                    <div className={styles["config-system-proxy-title"]}>设置Chrome启动路径</div>
                    <RemoveIcon className={styles["close-icon"]} onClick={() => onClose()} />
                </div>
                <div className={classNames(styles["config-system-proxy-status-success"])}>
                    如无法启动Chrome，请配置Chrome启动路径
                </div>
                <Form layout='horizontal' style={{padding: "0 24px 24px"}}>
                    <Form.Item label='启动路径'>
                        <YakitInput value={chromePath} placeholder={"请选择启动路径"} size='large' onChange={(e)=>setChromePath(e.target.value)}/>
                        <Upload accept={".exe"} multiple={false} maxCount={1} showUploadList={false} beforeUpload={(f) => {
                            const file_name = f.name;
                            const suffix = suffixFun(file_name);
                            if (![".exe"].includes(suffix)) {
                              warn("上传文件格式错误，请重新上传");
                              return false;
                            }
                            // @ts-ignore
                            const path:string = f?.path||""
                            if(path.length>0){
                               setChromePath(path) 
                            }
                            return false
                        }}>
                            <div className={styles["config-select-path"]}>选择路径</div>
                        </Upload>
                    </Form.Item>
                    <div className={styles["config-system-proxy-btns"]}>
                        <YakitButton type='outline2' size='large' onClick={() => onClose()}>
                            取消
                        </YakitButton>
                        <YakitButton type={"primary"} size='large' onClick={() => onSetChromePath()}>
                            确定
                        </YakitButton>
                    </div>
                </Form>
            </div>
        </YakitSpin>
    )
}
export const showConfigChromePathForm = (fun) => {
    const m = showYakitModal({
        title: null,
        width: 450,
        footer: null,
        closable: false,
        centered: true,
        content: (
            <>
                <ConfigChromePath
                    onClose={() => {
                        m.destroy()
                    }}
                    submitAlreadyChromePath={fun}
                />
            </>
        )
    })
}
