import React, {ReactNode, useEffect, useMemo, useRef, useState} from "react"
import {useDebounceEffect, useGetState, useMemoizedFn} from "ahooks"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {failed, info} from "@/utils/notification"
import {ExclamationIcon} from "@/assets/newIcon"
import {YakitSystem} from "@/yakitGVDefine"
import {YakitPopover} from "../yakitUI/YakitPopover/YakitPopover"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {
    ErrorIcon,
    HelpIcon,
    ShieldCheckIcon as AllShieldCheckIcon,
    SuccessIcon,
    WarningIcon,
    RocketIcon,
    RocketOffIcon
} from "./globalStateIcon"
import {showConfigSystemProxyForm,showConfigChromePathForm} from "@/utils/ConfigSystemProxy"
import {showModal} from "@/utils/showModal"
import {ConfigGlobalReverse} from "@/utils/basic"
import {YakitHint} from "../yakitUI/YakitHint/YakitHint"
import {Tooltip} from "antd"
import {isEnpriTraceAgent} from "@/utils/envfile"
import {QueryYakScriptsResponse} from "@/pages/invoker/schema"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {YakitInputNumber} from "../yakitUI/YakitInputNumber/YakitInputNumber"

import classNames from "classnames"
import styles from "./globalState.module.scss"

const {ipcRenderer} = window.require("electron")

/** 不同状态下展示的ICON */
const ShowIcon: Record<string, ReactNode> = {
    error: <ExclamationIcon className={styles["icon-style"]} />,
    warning: <ExclamationIcon className={styles["icon-style"]} />,
    success: <RocketIcon className={styles["icon-style"]} />,
    help: <RocketOffIcon className={styles["icon-style"]} />
}
/** 不同状态下组件展示的颜色 */
const ShowColorClass: Record<string, string> = {
    error: styles["error-wrapper-bgcolor"],
    warning: styles["warning-wrapper-bgcolor"],
    success: styles["success-wrapper-bgcolor"],
    help: styles["help-wrapper-bgcolor"]
}

export interface GlobalReverseStateProp {
    isEngineLink: boolean
    system: YakitSystem
}
/** 全局反连服务器配置参数 */
interface ReverseDetail {
    PublicReverseIP: string
    PublicReversePort: number
    LocalReverseAddr: string
    LocalReversePort: number
}

export const GlobalState: React.FC<GlobalReverseStateProp> = React.memo((props) => {
    const {isEngineLink, system} = props

    /** 自启全局反连配置(默认指定为本地) */
    useEffect(() => {
        if (isEngineLink) {
            getRemoteValue(RemoteGV.GlobalBridgeAddr).then((addr) => {
                getRemoteValue(RemoteGV.GlobalBridgeSecret).then((secret) => {
                    ipcRenderer
                        .invoke("ConfigGlobalReverse", {
                            ConnectParams: {Addr: addr, Secret: secret},
                            LocalAddr: ""
                        })
                        .then((a: any) => console.info("自启-全局反连配置成功"))
                        .catch((e) => console.info(e))

                    getRemoteValue(RemoteGV.GlobalDNSLogBridgeInherit).then((data) => {
                        switch (`${data}`) {
                            case "true":
                                ipcRenderer
                                    .invoke("SetYakBridgeLogServer", {
                                        DNSLogAddr: addr,
                                        DNSLogSecret: `${secret}`
                                    })
                                    .then(() => info("配置全局 DNSLog 生效"))
                                    .catch((e) => failed(`配置全局 DNSLog 失败：${e}`))
                                break
                            case "false":
                                getRemoteValue(RemoteGV.GlobalDNSLogAddr).then((dnslogAddr: string) => {
                                    if (!!dnslogAddr) {
                                        getRemoteValue(RemoteGV.GlobalDNSLogSecret).then((secret: string) => {
                                            ipcRenderer
                                                .invoke("SetYakBridgeLogServer", {
                                                    DNSLogAddr: dnslogAddr,
                                                    DNSLogSecret: `${secret}`
                                                })
                                                .then(() => info("配置全局 DNSLog 生效"))
                                                .catch((e) => failed(`配置全局 DNSLog 失败：${e}`))
                                        })
                                    }
                                })
                                break
                        }
                    })
                })
            })
        }
    }, [isEngineLink])

    const [pcap, setPcap] = useState<{
        IsPrivileged: boolean
        Advice: string
        AdviceVerbose: string
    }>({Advice: "unknown", AdviceVerbose: "无法获取 PCAP 支持信息", IsPrivileged: false})
    /** 获取网卡操作权限 */
    const updatePcap = useMemoizedFn(() => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("IsPrivilegedForNetRaw", {})
                .then((res) => {
                    setPcap(res)
                    resolve("pcap")
                })
                .catch((e) => reject(`error-pcap ${e}`))
        })
    })

    const [pluginTotal, setPluginTotal] = useState<number>(0)
    /** 获取本地插件数量 */
    const updatePluginTotal = useMemoizedFn(() => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("QueryYakScript", {
                    Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"}
                })
                .then((item: QueryYakScriptsResponse) => {
                    if(isEnpriTraceAgent()&&(+item.Total)<100){
                        // 便携版由于引擎内置插件 因此判断依据为小于100个则为无插件
                        setPluginTotal(0)
                    }
                    else{
                        setPluginTotal(+item.Total || 0)
                    }
                    resolve("plugin-total")
                })
                .catch((e) => {
                    reject(`error-plugin-total ${e}`)
                })
        })
    })

    const [reverseState, setReverseState] = useState<boolean>(false)
    const [reverseDetails, setReverseDetails, getReverseDetails] = useGetState<ReverseDetail>({
        LocalReverseAddr: "",
        LocalReversePort: 0,
        PublicReverseIP: "",
        PublicReversePort: 0
    })
    const isReverseState = useMemo(() => {
        return reverseState && !!reverseDetails.PublicReverseIP && !!reverseDetails.PublicReversePort
    }, [reverseState, reverseDetails])
    /** 获取全局反连状态和配置信息 */
    const updateGlobalReverse = useMemoizedFn(() => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("get-global-reverse-server-status")
                .then((flag: boolean) => {
                    setReverseState(flag)
                    if (flag) {
                        ipcRenderer
                            .invoke("GetGlobalReverseServer", {})
                            .then((data: ReverseDetail) => {
                                if (JSON.stringify(data) !== JSON.stringify(getReverseDetails())) {
                                    setReverseDetails(data)
                                }
                                resolve("global-reverse")
                            })
                            .catch((e) => reject(`error-global-reverse ${e}`))
                    } else {
                        resolve("global-reverse")
                    }
                })
                .catch((e) => reject(`error-global-reverse ${e}`))
        })
    })

    const [systemProxy, setSystemProxy] = useState<{
        Enable: boolean
        CurrentProxy: string
    }>({Enable: false, CurrentProxy: ""})
    /** 获取系统代理 */
    const updateSystemProxy = useMemoizedFn(() => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("GetSystemProxy", {})
                .then((res: {CurrentProxy: string; Enable: boolean}) => {
                    setSystemProxy(res)
                    resolve("system-proxy")
                })
                .catch((e) => reject(`error-system-proxy ${e}`))
        })
    })
    const [showChromeWarn,setShowChromeWarn] = useState<boolean>(false)
    /** 获取Chrome启动路径 */
    const updateChromePath = useMemoizedFn(() => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("GetChromePath")
                .then((chromePath: string) => {
                    if(chromePath) return
                    else{
                        setShowChromeWarn(true)
                    }
                })
                .catch((e) => reject(`error-chrome-path ${e}`))
                .finally(() => {
                    resolve("chrome-path")
                })
        })
    })

    const [state, setState] = useState<string>("error")
    const [stateNum, setStateNum] = useState<number>(0)

    const updateState = useMemoizedFn(() => {
        let status = "success"
        let count = 0
        /**
         * @description 这里的判断顺序需要和UI上列表的上下展示顺序相反，因为状态程度有展示优先级
         * 级别顺序: 'error' > 'warning' > 'help' > 'success'
         */
        if (!isEnpriTraceAgent()) {
            if (!systemProxy.Enable) status = "help"
            if (!reverseState || !reverseDetails.PublicReverseIP || !reverseDetails.PublicReversePort) {
                status = "warning"
                count = count + 1
            }
        }
        if(showChromeWarn){
            status = "warning"
            count = count + 1
        }
        if (!pcap.IsPrivileged) {
            status = system === "Windows_NT" ? "warning" : "error"
            count = count + 1
        }
        if (pluginTotal === 0) {
            status = "error"
            count = count + 1
        }
        setState(status)
        setStateNum(count)
    })
    // 定时器内的逻辑是否在执行
    const isRunRef = useRef<boolean>(false)
    const updateAllInfo = useMemoizedFn(() => {
        if (isRunRef.current) return

        isRunRef.current = true
        Promise.allSettled([updateSystemProxy(), updateGlobalReverse(), updatePcap(), updatePluginTotal(),updateChromePath()])
            .then((values) => {
                isRunRef.current = false
                setTimeout(() => updateState(), 100)
            })
            .catch(() => {})
    })

    const [timeInterval, setTimeInterval, getTimeInterval] = useGetState<number>(5)
    const timeRef = useRef<any>(null)
    // 启动全局状态轮询定时器
    useEffect(() => {
        let timer: any = null
        if (isEngineLink) {
            getRemoteValue(RemoteGV.GlobalStateTimeInterval).then((time: any) => {
                setTimeInterval(+time || 5)
                if ((+time || 5) > 5) updateAllInfo()
            })

            if (timer) clearInterval(timer)
            timer = setInterval(() => {
                setRemoteValue(RemoteGV.GlobalStateTimeInterval, `${getTimeInterval()}`)
            }, 20000)
        } else {
            // init
            setPcap({Advice: "unknown", AdviceVerbose: "无法获取 PCAP 支持信息", IsPrivileged: false})
            setPluginTotal(0)
            setReverseState(false)
            setReverseDetails({
                LocalReverseAddr: "",
                LocalReversePort: 0,
                PublicReverseIP: "",
                PublicReversePort: 0
            })
            setSystemProxy({Enable: false, CurrentProxy: ""})

            setState("error")
            setStateNum(0)

            isRunRef.current = false
            if (timeRef.current) clearInterval(timeRef.current)
            timeRef.current = null
        }

        return () => {
            if (timer) clearInterval(timer)
            timer = null
        }
    }, [isEngineLink])
    // 修改查询间隔时间后
    useDebounceEffect(
        () => {
            if (timeRef.current) clearInterval(timeRef.current)
            timeRef.current = setInterval(updateAllInfo, timeInterval * 1000)

            return () => {
                isRunRef.current = false
                if (timeRef.current) clearInterval(timeRef.current)
                timeRef.current = null
            }
        },
        [timeInterval],
        {wait: 300}
    )

    const [show, setShow] = useState<boolean>(false)

    const [pcapHintShow, setPcapHintShow] = useState<boolean>(false)
    const [pcapResult, setPcapResult] = useState<boolean>(false)
    const [pcapHintLoading, setPcapHintLoading] = useState<boolean>(false)
    // 开启PCAP权限
    const openPcapPower = useMemoizedFn(() => {
        setPcapHintLoading(true)
        ipcRenderer
            .invoke(`PromotePermissionForUserPcap`, {})
            .then(() => {
                setPcapResult(true)
            })
            .catch((e) => {
                failed(`提升 Pcap 用户权限失败：${e}`)
            })
            .finally(() => setPcapHintLoading(false))
    })

    const [pluginShow, setPluginShow] = useState<boolean>(false)
    // 一键下载全部线上插件
    const downloadAllPlugin = useMemoizedFn(() => {
        if (pluginShow) return
        setShow(false)
        setPluginShow(true)
    })

    // 是否已经设置过Chrome启动路径
    const [isAlreadyChromePath,setAlreadyChromePath] = useState<boolean>(false)
    const setAlreadyChromePathStatus = (is:boolean) => setAlreadyChromePath(is)
    
    useEffect(()=>{
        getRemoteValue(RemoteGV.GlobalChromePath).then((setting) => {
            if (!setting) return
            const values:string = JSON.parse(setting)
            if(values.length>0){
                setAlreadyChromePath(true)
            }
        })
    },[])
    
    const content = useMemo(() => {
        return (
            <div className={styles["global-state-content-wrapper"]}>
                <div className={styles["body-header"]}>
                    <div className={styles["header-title"]}>系统检测</div>
                    <div className={styles["header-hint"]}>
                        <span className={styles["hint-title"]}>
                            {stateNum === 0 ? `暂无异常` : `检测到${stateNum}项异常`}
                        </span>
                        {ShowIcon[state]}
                    </div>
                </div>
                <div className={styles["body-wrapper"]}>
                    {/* 网卡权限修复 */}
                    {!pcap.IsPrivileged && (
                        <div className={styles["body-info"]}>
                            {system !== "Windows_NT" ? (
                                <>
                                    <div className={styles["info-left"]}>
                                        <ErrorIcon />
                                        <div className={styles["left-body"]}>
                                            <div className={styles["title-style"]}>网卡权限未修复</div>
                                            <div className={styles["subtitle-style"]}>
                                                可能会影响部分功能的使用，建议尽快修复
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles["info-right"]}>
                                        <YakitButton
                                            type='text'
                                            className={styles["btn-style"]}
                                            onClick={() => {
                                                if (pcapHintShow) return
                                                setShow(false)
                                                setPcapHintShow(true)
                                            }}
                                        >
                                            去修复
                                        </YakitButton>
                                    </div>
                                </>
                            ) : (
                                <div className={styles["info-left"]}>
                                    <WarningIcon />
                                    <div className={styles["left-body"]}>
                                        <div className={styles["title-style"]}>建议使用管理员身份运行软件</div>
                                        <div className={styles["subtitle-style"]}>普通权限可能会影响部分功能的使用</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {/* 本地插件下载 */}
                    {pluginTotal === 0 && (
                        <div className={styles["body-info"]}>
                            <div className={styles["info-left"]}>
                                <ErrorIcon />
                                <div className={styles["left-body"]}>
                                    <div className={styles["title-style"]}>暂无本地插件</div>
                                    <div className={styles["subtitle-style"]}>可一键获取官方云端插件源</div>
                                </div>
                            </div>
                            <div className={styles["info-right"]}>
                                <YakitButton type='text' className={styles["btn-style"]} onClick={downloadAllPlugin}>
                                    一键下载
                                </YakitButton>
                            </div>
                        </div>
                    )}
                    {!isEnpriTraceAgent() && (
                        <>
                            {/* 全局反连 */}
                            {!isReverseState && (
                                <div className={styles["body-info"]}>
                                    <div className={styles["info-left"]}>
                                        <WarningIcon />
                                        <div className={styles["left-body"]}>
                                            <div className={styles["title-style"]}>全局反连未配置</div>
                                            <div className={styles["subtitle-style"]}>可能会影响部分功能的使用</div>
                                        </div>
                                    </div>
                                    <div className={styles["info-right"]}>
                                        <YakitButton
                                            type='text'
                                            className={styles["btn-style"]}
                                            onClick={() => {
                                                setShow(false)
                                                showModal({
                                                    title: "配置全局反连",
                                                    width: 800,
                                                    content: (
                                                        <div style={{width: 800}}>
                                                            <ConfigGlobalReverse />
                                                        </div>
                                                    )
                                                })
                                            }}
                                        >
                                            去配置
                                        </YakitButton>
                                    </div>
                                </div>
                            )}
                            {/* Chrome启动路径 */}
                            {showChromeWarn&&<div className={styles["body-info"]}>
                                    <div className={styles["info-left"]}>
                                        {isAlreadyChromePath?<SuccessIcon/>:<WarningIcon />}
                                        <div className={styles["left-body"]}>
                                            <div className={styles["title-style"]}>Chrome启动路径</div>
                                            <div className={styles["subtitle-style"]}>如无法启动Chrome，请配置Chrome启动路径</div>
                                        </div>
                                    </div>
                                    <div className={styles["info-right"]}>
                                        <YakitButton
                                            type='text'
                                            className={styles["btn-style"]}
                                            onClick={() => {
                                                setShow(false)
                                                showConfigChromePathForm(setAlreadyChromePathStatus)
                                            }}
                                        >
                                            {isAlreadyChromePath?"已配置":"去配置"}
                                        </YakitButton>
                                    </div>
                                </div>}
                            {/* 系统代理 */}
                            <div className={styles["body-info"]}>
                                <div className={styles["info-left"]}>
                                    {systemProxy.Enable ? <SuccessIcon /> : <HelpIcon />}
                                    <div className={styles["left-body"]}>
                                        <div className={styles["system-proxy-title"]}>
                                            系统代理
                                            <div
                                                className={classNames(styles["system-proxy-tag"], {
                                                    [styles["enabled-tag"]]: systemProxy.Enable,
                                                    [styles["not-enabled-tag"]]: !systemProxy.Enable
                                                })}
                                            >
                                                {systemProxy.Enable ? "已启用" : "未启用"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles["info-right"]}>
                                    {systemProxy.Enable ? (
                                        <div className={styles["system-proxy-info"]}>
                                            {systemProxy.CurrentProxy}
                                            <YakitButton
                                                type='text'
                                                colors="danger"
                                                className={styles["btn-style"]}
                                                onClick={() => {
                                                    setShow(false)
                                                    showConfigSystemProxyForm()
                                                }}
                                            >
                                                {" "}
                                                停用
                                            </YakitButton>
                                        </div>
                                    ) : (
                                        <YakitButton
                                            type='text'
                                            className={styles["btn-style"]}
                                            onClick={() => {
                                                setShow(false)
                                                showConfigSystemProxyForm()
                                            }}
                                        >
                                            去配置
                                        </YakitButton>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                    {isEnpriTraceAgent() && state === "success" && (
                        <div className={styles["body-info"]}>
                            <div className={styles["info-left"]}>
                                <SuccessIcon />
                                <div className={styles["left-body"]}>
                                    <div className={styles["system-proxy-title"]}>所有配置均正常</div>
                                </div>
                            </div>
                            <div></div>
                        </div>
                    )}
                </div>
                <div className={styles["body-setting"]}>
                    状态刷新间隔时间
                    <YakitInputNumber
                        size='small'
                        type='horizontal'
                        wrapperClassName={styles["yakit-input-number"]}
                        min={1}
                        formatter={(value) => `${value}s`}
                        parser={(value) => value!.replace("s", "")}
                        value={timeInterval}
                        onChange={(value) => {
                            if (!value) setTimeInterval(1)
                            else {
                                if (+value !== timeInterval) setTimeInterval(+value || 5)
                            }
                        }}
                    />
                </div>
            </div>
        )
    }, [pcap, pluginTotal, reverseState, reverseDetails, systemProxy, timeInterval,isAlreadyChromePath])

    return (
        <>
            <YakitPopover
                overlayClassName={classNames(styles["global-state-popover"], ShowColorClass[state])}
                placement={system === "Darwin" ? "bottomRight" : "bottomLeft"}
                content={content}
                visible={show}
                onVisibleChange={(visible) => setShow(visible)}
            >
                <div className={classNames(styles["global-state-wrapper"], ShowColorClass[state])}>
                    <div className={classNames(styles["state-body"])}>{ShowIcon[state]}</div>
                </div>
            </YakitPopover>
            <YakitHint
                visible={pcapHintShow}
                heardIcon={pcapResult ? <AllShieldCheckIcon /> : undefined}
                title={pcapResult ? "已有网卡操作权限" : "当前引擎不具有网卡操作权限"}
                content={
                    pcapResult
                        ? "网卡修复需要时间，请耐心等待"
                        : "Linux 与 MacOS 可通过设置权限与组为用户态赋予网卡完全权限"
                }
                okButtonText='开启 PCAP 权限'
                cancelButtonText={pcapResult ? "知道了～" : "稍后再说"}
                okButtonProps={{loading: pcapHintLoading, style: pcapResult ? {display: "none"} : undefined}}
                cancelButtonProps={{loading: !pcapResult && pcapHintLoading}}
                onOk={openPcapPower}
                onCancel={() => {
                    setPcapResult(false)
                    setPcapHintShow(false)
                }}
                footerExtra={
                    pcapResult ? undefined : (
                        <Tooltip title={`${pcap.AdviceVerbose}: ${pcap.Advice}`}>
                            <YakitButton className={styles["btn-style"]} type='text' size='max'>
                                手动修复
                            </YakitButton>
                        </Tooltip>
                    )
                }
            ></YakitHint>
            <YakitGetOnlinePlugin
                visible={pluginShow}
                setVisible={(v) => {
                    setPluginShow(v)
                }}
            />
        </>
    )
})
