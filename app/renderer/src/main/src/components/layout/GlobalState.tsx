import React, {ReactNode, useEffect, useMemo, useRef, useState} from "react"
import {useDebounceEffect, useGetState, useMemoizedFn} from "ahooks"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {failed, info, yakitFailed, yakitNotify} from "@/utils/notification"
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
    RocketIcon
} from "./globalStateIcon"
import {showConfigSystemProxyForm, showConfigChromePathForm} from "@/utils/ConfigSystemProxy"
import {showModal} from "@/utils/showModal"
import {ConfigGlobalReverse} from "@/utils/basic"
import {YakitHint} from "../yakitUI/YakitHint/YakitHint"
import {Tooltip, Row, Col, Spin} from "antd"
import {LoadingOutlined} from "@ant-design/icons"
import {isEnpriTraceAgent, isIRify} from "@/utils/envfile"
import {QueryYakScriptsResponse} from "@/pages/invoker/schema"
import {
    IRifyApplySyntaxFlowRuleUpdate,
    YakitGetOnlinePlugin
} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {YakitInputNumber} from "../yakitUI/YakitInputNumber/YakitInputNumber"

import classNames from "classnames"
import styles from "./globalState.module.scss"
import {useRunNodeStore} from "@/store/runNode"
import {YakitTag} from "../yakitUI/YakitTag/YakitTag"
import {YakitCheckbox} from "../yakitUI/YakitCheckbox/YakitCheckbox"
import emiter from "@/utils/eventBus/eventBus"
import {serverPushStatus} from "@/utils/duplex/duplex"
import {openABSFileLocated} from "@/utils/openWebsite"
import {showYakitModal} from "../yakitUI/YakitModal/YakitModalConfirm"
import {
    grpcFetchBuildInYakVersion,
    grpcFetchLocalYakVersion,
    grpcFetchLocalYakVersionHash,
    grpcFetchSpecifiedYakVersionHash
} from "@/apiUtils/grpc"
import {OutlineShieldcheckIcon} from "@/assets/icon/outline"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const {ipcRenderer} = window.require("electron")

/** 不同状态下展示的ICON */
const ShowIcon: Record<string, ReactNode> = {
    error: <ExclamationIcon className={styles["icon-style"]} />,
    warning: <ExclamationIcon className={styles["icon-style"]} />,
    success: <RocketIcon className={styles["icon-style"]} />,
    help: <OutlineShieldcheckIcon className={styles["icon-style"]} />,
    loading: <LoadingOutlined className={styles["icon-style"]} spin />
}
/** 不同状态下组件展示的颜色 */
const ShowColorClass: Record<string, string> = {
    error: styles["error-wrapper-bgcolor"],
    warning: styles["warning-wrapper-bgcolor"],
    success: styles["success-wrapper-bgcolor"],
    help: styles["success-wrapper-bgcolor"],
    loading: styles["loading-wrapper-bgcolor"]
}

export interface GlobalReverseStateProp {
    isEngineLink: boolean
    system: YakitSystem
}

export interface CheckSyntaxFlowRuleUpdateResponse {
    NeedUpdate: boolean
    State: "empty" | "to_update"
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
    const {t, i18n} = useI18nNamespaces(["yakitRoute", "home", "yakitUi"])

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
    const updatePcap = useMemoizedFn((): Promise<string> => {
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
    const updatePluginTotal = useMemoizedFn((): Promise<string> => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("QueryYakScript", {
                    Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"}
                })
                .then((item: QueryYakScriptsResponse) => {
                    if (isEnpriTraceAgent() && +item.Total < 100) {
                        // 便携版由于引擎内置插件 因此判断依据为小于100个则为无插件
                        setPluginTotal(0)
                    } else {
                        setPluginTotal(+item.Total || 0)
                    }
                    resolve("plugin-total")
                })
                .catch((e) => {
                    reject(`error-plugin-total ${e}`)
                })
        })
    })

    // 规则管理是否更新
    const [ruleUpdate, setRuleUpdate] = useState<CheckSyntaxFlowRuleUpdateResponse>()
    // IRify在初次进入页面时如若没有规则则弹窗提示
    const isShowRuleUpdateModal = useRef<boolean>(true)
    const [openFristRuleUpdateModal, setFristRuleUpdateModal] = useState<boolean>(false)
    const onRuleUpdate = useMemoizedFn((): Promise<string> => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("CheckSyntaxFlowRuleUpdate")
                .then((result: CheckSyntaxFlowRuleUpdateResponse) => {
                    setRuleUpdate(result)
                    if (result.NeedUpdate && isShowRuleUpdateModal.current) {
                        setFristRuleUpdateModal(true)
                    }
                    isShowRuleUpdateModal.current = false
                    resolve("rule-Update")
                })
                .catch((e) => {
                    reject(`error-rule-Update ${e}`)
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
    const updateGlobalReverse = useMemoizedFn((): Promise<string> => {
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
    const updateSystemProxy = useMemoizedFn((): Promise<string> => {
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
    const [showChromeWarn, setShowChromeWarn] = useState<boolean>(false)
    /** 获取Chrome启动路径 */
    const updateChromePath = useMemoizedFn((): Promise<string> => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("GetChromePath")
                .then((chromePath: string) => {
                    if (chromePath) return
                    else {
                        setShowChromeWarn(true)
                    }
                })
                .catch((e) => reject(`error-chrome-path ${e}`))
                .finally(() => {
                    resolve("chrome-path")
                })
        })
    })
    const [showMITMCertWarn, setShowMITMCertWarn] = useState<boolean>(false)

    const updateMITMCert = useMemoizedFn((): Promise<string> => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("VerifySystemCertificate")
                .then((res) => {
                    if (res.valid) {
                        setShowMITMCertWarn(false)
                    } else {
                        setShowMITMCertWarn(true)
                    }
                    if (res.Reason != "") {
                        reject(`error-mitm-cert ${res.Reason}`)
                    }
                })
                .catch((e) => reject(`error-mitm-cert ${e}`))
                .finally(() => {
                    resolve("mitm-cert")
                })
        })
    })
    const showManualInstallGuide = useMemoizedFn(() => {
        setShow(false)
        const m = showYakitModal({
            title: t("home.cert.manualInstallTitle"),
            width: "600px",
            centered: true,
            content: (
                <div
                    style={{
                        padding: 15,
                        color: "var(--Colors-Use-Neutral-Text-1-Title)"
                    }}
                >
                    {t("home.cert.manualInstallSteps")}
                    <br />
                    <br />
                    1. {t("home.cert.manualInstallStep1")}
                    <br />
                    2. {t("home.cert.manualInstallStep2")}
                    <br />
                    3. {t("home.cert.manualInstallStep3")}
                    <br />
                    <br />
                    {t("home.cert.manualInstallSafeHint")}
                    <br />
                    {t("home.cert.manualInstallReadyHint", {name: t("YakitRoute.MITM")})}
                    <br />
                    <br />
                    {t("Home.contactForHelp")}
                </div>
            ),
            onOk: () => {
                ipcRenderer
                    .invoke("generate-install-script", {})
                    .then((p: string) => {
                        if (p) {
                            openABSFileLocated(p)
                        } else {
                            failed(t("YakitNotification.generationFailed"))
                        }
                    })
                    .catch(() => {})
                m.destroy()
            }
        })
    })

    const renderAutoInstallSuggestion = (reason?: string) => {
        if (!reason) return null
        const lower = reason.toLowerCase()
        if (lower.includes("pkexec not found")) {
            return (
                <>
                    <br />
                    {t("home.cert.autoInstallPkexecHint")}
                </>
            )
        }
        if (lower.includes("authentication agent")) {
            return (
                <>
                    <br />
                    {t("home.cert.autoInstallAuthAgentHint")}
                </>
            )
        }
        return null
    }

    const showAutoInstallFailure = useMemoizedFn((reason?: string) => {
        setShow(false)
        const modal = showYakitModal({
            title: t("home.cert.autoInstallFailedTitle"),
            width: "520px",
            centered: true,
            okText: t("home.cert.autoInstallFailedManualBtn"),
            cancelText: t("common.cancel"),
            content: (
                <div
                    style={{
                        padding: 15,
                        color: "var(--Colors-Use-Neutral-Text-1-Title)"
                    }}
                >
                    <div style={{marginBottom: 10}}>{t("home.cert.autoInstallFailedDesc")}</div>
                    <div style={{color: "var(--Colors-Use-Danger-Text)"}}>
                        {reason || t("home.cert.autoInstallUnknownError")}
                    </div>
                    {renderAutoInstallSuggestion(reason)}
                    <div style={{marginTop: 16}}>{t("home.cert.autoInstallGuideHint")}</div>
                </div>
            ),
            onOk: () => {
                modal.destroy()
                showManualInstallGuide()
            }
        })
    })

    const handleAutoInstallMITMCertificate = useMemoizedFn(() => {
        setShow(false)
        yakitNotify("info", "正在尝试一键安装 MITM 证书，请允许系统弹窗/杀毒软件的权限请求")
        ipcRenderer
            .invoke("InstallMITMCertificate", {})
            .then((res: {Ok: boolean; Reason?: string}) => {
                if (res?.Ok) {
                    yakitNotify("success", "MITM 证书安装成功")
                    updateMITMCert()
                } else {
                    const reason = res?.Reason || "未知错误"
                    yakitNotify("error", `MITM 证书安装失败：${reason}`)
                    showAutoInstallFailure(reason)
                }
            })
            .catch((e) => {
                const reason = `${e}`
                yakitNotify("error", `MITM 证书安装失败：${reason}`)
                showAutoInstallFailure(reason)
            })
    })

    // 校验引擎是否为官方发布版本
    const [showCheckEngine, setShowCheckEngine] = useState<boolean>(false)
    const getCurrentYak = async (): Promise<string> => {
        try {
            const res = await grpcFetchLocalYakVersion(true)
            if (res) {
                const v = res.startsWith("v") ? res.slice(1) : res
                await checkEngineSource(v)
            } else {
                setShowCheckEngine(false)
                throw new Error("no res")
            }
        } catch (e) {
            setShowCheckEngine(false)
            throw e
        }
        return ""
    }
    const checkEngineSource = async (localYaklang: string) => {
        try {
            const [res1, res2] = await Promise.all([
                grpcFetchSpecifiedYakVersionHash({version: localYaklang, config: {timeout: 3000}}, true),
                grpcFetchLocalYakVersionHash(true)
            ])

            if (res1 === "" || !Array.isArray(res2) || res2.length === 0) {
                setShowCheckEngine(false)
            } else {
                if (res2.includes(res1)) {
                    setShowCheckEngine(false)
                } else {
                    setShowCheckEngine(true)
                }
            }
            return ""
        } catch (error) {
            setShowCheckEngine(false)
            throw error
        }
    }
    const onUseOfficialEngine = async () => {
        try {
            const res = await grpcFetchBuildInYakVersion(true)
            if (res !== "") {
                emiter.emit("useOfficialEngineByDownloadByBuiltIn")
            } else {
                emiter.emit("useOfficialEngineByDownload")
            }
        } catch (error) {
            emiter.emit("useOfficialEngineByDownload")
        }
    }

    const [state, setState] = useState<string>("loading")
    const [stateNum, setStateNum] = useState<number>(0)
    // 是否正在检测中
    const [isChecking, setIsChecking] = useState<boolean>(true)

    const updateState = useMemoizedFn(() => {
        let status = "success"
        let count = 0
        /**
         * @description 这里的判断顺序需要和UI上列表的上下展示顺序相反，因为状态程度有展示优先级
         * 级别顺序: 'error' > 'warning' > 'help' > 'success'
         */
        if (!isEnpriTraceAgent()) {
            if (!systemProxy.Enable && !isReverseState) {
                status = "help"
            }
        }
        if (showChromeWarn) {
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
        if (showMITMCertWarn) {
            status = "warning"
            count = count + 1
        }
        if (showCheckEngine) {
            status = "warning"
            count = count + 1
        }
        setState(status)
        setStateNum(count)
    })

    const updateIRifyState = useMemoizedFn(() => {
        let status = "success"
        let count = 0
        if (ruleUpdate?.NeedUpdate && ruleUpdate.State === "to_update") {
            status = "warning"
            count = count + 1
        }
        if (ruleUpdate?.NeedUpdate && ruleUpdate.State === "empty") {
            status = "error"
            count = count + 1
        }
        if (showCheckEngine) {
            status = "warning"
            count = count + 1
        }

        setState(status)
        setStateNum(count)
    })

    // 定时器内的逻辑是否在执行
    const isRunRef = useRef<boolean>(false)
    // 是否是首次检测（仅首次检测显示"自检中..."）
    const isFirstCheckRef = useRef<boolean>(true)
    const updateAllInfo = useMemoizedFn(() => {
        if (isRunRef.current) return
        isRunRef.current = true
        let settledArr: (() => Promise<string>)[] = []
        if (isIRify()) {
            settledArr = [onRuleUpdate]
        } else {
            settledArr = [
                updateSystemProxy,
                updateGlobalReverse,
                updatePcap,
                updateChromePath,
                updateMITMCert
            ]
        }
        if (serverPushStatus) {
            settledArr.push(updatePluginTotal)
        }
        Promise.allSettled(settledArr.map((promiseFunc) => promiseFunc())).then((results) => {
            results.forEach((result) => {
                if (result.status === "rejected") {
                    // console.log("单个任务失败：", result.reason)
                }
            })
            isRunRef.current = false
            // 首次检测完成后，关闭检测中状态并标记首次检测完成
            if (isFirstCheckRef.current) {
                setIsChecking(false)
                isFirstCheckRef.current = false
            }
            setTimeout(() => (isIRify() ? updateIRifyState() : updateState()), 100)
        })
    })

    const [timeInterval, setTimeInterval, getTimeInterval] = useGetState<number>(5)
    const timeRef = useRef<any>(null)
    // 启动全局状态轮询定时器
    useEffect(() => {
        let timer: any = null
        if (isEngineLink) {
            // 仅在引擎连接时校验引擎是否为官方发布版本
            // 频繁读写将会大幅占用性能
            getCurrentYak()

            getRemoteValue(RemoteGV.GlobalStateTimeInterval).then((time: any) => {
                setTimeInterval(+time || 5)
                if ((+time || 5) > 5) updateAllInfo()
            })

            if (timer) clearInterval(timer)
            timer = setInterval(() => {
                setRemoteValue(RemoteGV.GlobalStateTimeInterval, `${getTimeInterval()}`)
            }, 20000)
            updatePluginTotal()
            isIRify() && onRuleUpdate()
            emiter.on("onRefreshQueryYakScript", updatePluginTotal)
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

            setState("loading")
            setStateNum(0)
            setIsChecking(true)
            isFirstCheckRef.current = true

            isRunRef.current = false
            if (timeRef.current) clearInterval(timeRef.current)
            timeRef.current = null
        }

        return () => {
            if (isEngineLink) emiter.off("onRefreshQueryYakScript", updatePluginTotal)
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

    const [ruleUpdateShow, setRuleUpdateShow] = useState<boolean>(false)
    const downloadRuleUpdate = useMemoizedFn(() => {
        if (ruleUpdateShow) return
        setShow(false)
        setRuleUpdateShow(true)
    })

    // 是否已经设置过Chrome启动路径
    const [isAlreadyChromePath, setAlreadyChromePath] = useState<boolean>(false)
    const setAlreadyChromePathStatus = (is: boolean) => setAlreadyChromePath(is)

    useEffect(() => {
        getRemoteValue(RemoteGV.GlobalChromePath).then((setting) => {
            if (!setting) return
            const values: string = JSON.parse(setting)
            if (values.length > 0) {
                setAlreadyChromePath(true)
            }
        })
    }, [])

    /**
     * 运行节点
     */
    const {firstRunNodeFlag, runNodeList, delRunNode, clearRunNodeList} = useRunNodeStore()
    const [closeRunNodeItemVerifyVisible, setCloseRunNodeItemVerifyVisible] = useState<boolean>(false)
    const [noPrompt, setNoPrompt] = useState<boolean>(false) // 决定确认弹窗是否需要显示
    const [delRunNodeItem, setDelRunNodeItem] = useState<{key: string; pid: string} | undefined>()

    useEffect(() => {
        // 第一次运行节点显示提示框
        if (firstRunNodeFlag) {
            setShow(true)
            setTimeout(() => {
                setShow(false)
            }, 3000)
        }
    }, [firstRunNodeFlag])

    // 点击全部关闭
    const onCloseAllRunNode = useMemoizedFn(() => {
        if (noPrompt) {
            handleKillAllRunNode()
        } else {
            setCloseRunNodeItemVerifyVisible(true)
        }
    })
    // 处理全部节点删除
    const handleKillAllRunNode = async () => {
        let promises: (() => Promise<any>)[] = []
        Array.from(runNodeList).forEach(([key, pid]) => {
            promises.push(() => ipcRenderer.invoke("kill-run-node", {pid}))
        })
        try {
            await Promise.allSettled(promises.map((promiseFunc) => promiseFunc()))
            clearRunNodeList()
            yakitNotify("success", "成功关闭全部运行节点")
        } catch (error) {
            yakitFailed(error + "")
        }
    }

    // 点击单个运行节点关闭
    const onCloseRunNodeItem = (key: string, pid: string) => {
        setDelRunNodeItem({key, pid})
        // 若确认弹窗勾选了下次不再给提示 则直接关闭运行节点
        if (noPrompt) {
            handleKillRunNodeItem(key, pid)
        } else {
            setCloseRunNodeItemVerifyVisible(true)
        }
    }
    // 处理单个节点删除
    const handleKillRunNodeItem = useMemoizedFn(async (key, pid) => {
        try {
            await ipcRenderer.invoke("kill-run-node", {pid})
            delRunNode(key)
            setDelRunNodeItem(undefined)
            yakitNotify("success", "成功关闭运行节点")
        } catch (error) {
            yakitFailed(error + "")
        }
    })

    const content = useMemo(() => {
        return (
            <div className={styles["global-state-content-wrapper"]}>
                <div className={styles["body-header"]}>
                    <div className={styles["header-title"]}>系统检测</div>
                    <div className={styles["header-hint"]}>
                        <span className={styles["hint-title"]}>
                            {isChecking ? "自检中..." : stateNum === 0 ? `暂无异常` : `检测到${stateNum}项异常`}
                        </span>
                        {isChecking ? ShowIcon["loading"] : ShowIcon[state]}
                    </div>
                </div>
                <div className={styles["body-wrapper"]}>
                    {/* 引擎是否是官方发布版本 */}
                    {showCheckEngine && (
                        <div className={styles["body-info"]}>
                            <div className={styles["info-left"]}>
                                <ErrorIcon />
                                <div className={styles["left-body"]}>
                                    <div className={styles["title-style"]}>引擎不是官方发布版本</div>
                                    <div className={styles["subtitle-style"]}>可能会造成本地使用出现问题</div>
                                </div>
                            </div>
                            <div className={styles["info-right"]}>
                                <YakitButton
                                    type='text'
                                    className={styles["btn-style"]}
                                    onClick={() => {
                                        setShow(false)
                                        onUseOfficialEngine()
                                    }}
                                >
                                    使用官方引擎
                                </YakitButton>
                            </div>
                        </div>
                    )}
                    {/* MITM 证书 */}
                    {showMITMCertWarn && (
                        <div className={styles["body-info"]}>
                            <div className={styles["info-left"]}>
                                <ErrorIcon />
                                <div className={styles["left-body"]}>
                                    <div className={styles["title-style"]}>MITM证书</div>
                                    <div className={styles["subtitle-style"]}>
                                        MITM证书不在系统信任列表中，请重新安装
                                    </div>
                                </div>
                            </div>
                            <div className={styles["info-right"]}>
                                <div style={{display: "flex", alignItems: "center", gap: 8}}>
                                    <YakitButton
                                        type='text'
                                        className={styles["btn-style"]}
                                        onClick={handleAutoInstallMITMCertificate}
                                    >
                                        {t("home.cert.autoInstallButton")}
                                    </YakitButton>
                                    <YakitButton
                                        type='text'
                                        className={styles["btn-style"]}
                                        onClick={() => showManualInstallGuide()}
                                    >
                                        {t("home.cert.manualInstallButton")}
                                    </YakitButton>
                                </div>
                            </div>
                        </div>
                    )}
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
                            <div className={styles["body-info"]}>
                                <div className={styles["info-left"]}>
                                    {isReverseState ? <SuccessIcon /> : <HelpIcon />}
                                    <div className={styles["left-body"]}>
                                        <div className={styles["title-style"]} style={{marginBottom: 2}}>
                                            全局反连未配置{" "}
                                            <YakitTag color={isReverseState ? "success" : "danger"}>
                                                {isReverseState ? "已启用" : "未启用"}
                                            </YakitTag>
                                        </div>
                                        <div className={styles["subtitle-style"]}>可能会影响部分功能的使用</div>
                                    </div>
                                </div>
                                <div className={styles["info-right"]}>
                                    {isReverseState ? (
                                        <YakitButton
                                            type='text'
                                            colors='danger'
                                            className={styles["btn-style"]}
                                            onClick={() => {
                                                setShow(false)
                                                showYakitModal({
                                                    type: "white",
                                                    title: "配置全局反连",
                                                    width: 800,
                                                    content: (
                                                        <div style={{width: 800}}>
                                                            <ConfigGlobalReverse />
                                                        </div>
                                                    ),
                                                    footer: null
                                                })
                                            }}
                                        >
                                            {" "}
                                            停用
                                        </YakitButton>
                                    ) : (
                                        <YakitButton
                                            type='text'
                                            className={styles["btn-style"]}
                                            onClick={() => {
                                                setShow(false)
                                                showYakitModal({
                                                    type: "white",
                                                    title: "配置全局反连",
                                                    width: 800,
                                                    content: (
                                                        <div style={{width: 800}}>
                                                            <ConfigGlobalReverse />
                                                        </div>
                                                    ),
                                                    footer: null
                                                })
                                            }}
                                        >
                                            去配置
                                        </YakitButton>
                                    )}
                                </div>
                            </div>
                            {/* Chrome启动路径 */}
                            {showChromeWarn && (
                                <div className={styles["body-info"]}>
                                    <div className={styles["info-left"]}>
                                        {isAlreadyChromePath ? <SuccessIcon /> : <WarningIcon />}
                                        <div className={styles["left-body"]}>
                                            <div className={styles["title-style"]}>Chrome启动路径</div>
                                            <div className={styles["subtitle-style"]}>
                                                如无法启动Chrome，请配置Chrome启动路径
                                            </div>
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
                                            {isAlreadyChromePath ? "已配置" : "去配置"}
                                        </YakitButton>
                                    </div>
                                </div>
                            )}
                            {/* 系统代理 */}
                            <div className={styles["body-info"]}>
                                <div className={styles["info-left"]}>
                                    {systemProxy.Enable ? <SuccessIcon /> : <HelpIcon />}
                                    <div className={styles["left-body"]}>
                                        <div className={styles["system-proxy-title"]}>
                                            系统代理
                                            <YakitTag color={systemProxy.Enable ? "success" : "danger"}>
                                                {systemProxy.Enable ? "已启用" : "未启用"}
                                            </YakitTag>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles["info-right"]}>
                                    {systemProxy.Enable ? (
                                        <div className={styles["system-proxy-info"]}>
                                            {systemProxy.CurrentProxy}
                                            <YakitButton
                                                type='text'
                                                colors='danger'
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
                    {/* 运行节点 */}
                    {!!Array.from(runNodeList).length && (
                        <>
                            <div className={styles["body-info"]}>
                                <div className={styles["info-left"]}>
                                    <SuccessIcon />
                                    <div className={styles["left-body"]}>
                                        <div className={styles["title-style"]}>
                                            启用节点
                                            <YakitTag color='success' style={{marginLeft: 8}}>
                                                已启用
                                            </YakitTag>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles["info-right"]}>
                                    <YakitButton
                                        type='text'
                                        colors='danger'
                                        className={styles["btn-style"]}
                                        onClick={onCloseAllRunNode}
                                    >
                                        全部关闭
                                    </YakitButton>
                                </div>
                            </div>
                            <div className={styles["run-node-list"]}>
                                {Array.from(runNodeList).map(([key, value], index) => (
                                    <div className={styles["run-node-item"]} key={key}>
                                        <Row>
                                            <Col span={6} className={styles["ellipsis"]}>
                                                {JSON.parse(key).nodename}
                                            </Col>
                                            <Col span={15} className={styles["ellipsis"]}>
                                                {JSON.parse(key).ipOrdomain}:{JSON.parse(key).port}
                                            </Col>
                                            <Col span={3} style={{textAlign: "right"}}>
                                                <YakitButton
                                                    type='text'
                                                    colors='danger'
                                                    className={styles["btn-style"]}
                                                    onClick={() => onCloseRunNodeItem(key, value)}
                                                >
                                                    关闭
                                                </YakitButton>
                                            </Col>
                                        </Row>
                                    </div>
                                ))}
                            </div>
                        </>
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
    }, [
        pcap,
        pluginTotal,
        reverseState,
        reverseDetails,
        systemProxy,
        timeInterval,
        isAlreadyChromePath,
        showMITMCertWarn,
        state,
        stateNum,
        showCheckEngine,
        isChecking,
        Array.from(runNodeList).length
    ])

    const irifyContent = useMemo(() => {
        return (
            <div className={styles["global-state-content-wrapper"]}>
                <div className={styles["body-header"]}>
                    <div className={styles["header-title"]}>系统检测</div>
                    <div className={styles["header-hint"]}>
                        <span className={styles["hint-title"]}>
                            {isChecking ? "自检中..." : stateNum === 0 ? `暂无异常` : `检测到${stateNum}项异常`}
                        </span>
                        {isChecking ? ShowIcon["loading"] : ShowIcon[state]}
                    </div>
                </div>
                {stateNum !== 0 && (
                    <div className={styles["body-wrapper"]}>
                        {/* 引擎是否是官方发布版本 */}
                        {showCheckEngine && (
                            <div className={styles["body-info"]}>
                                <div className={styles["info-left"]}>
                                    <ErrorIcon />
                                    <div className={styles["left-body"]}>
                                        <div className={styles["title-style"]}>引擎不是官方发布版本</div>
                                        <div className={styles["subtitle-style"]}>可能会造成本地使用出现问题</div>
                                    </div>
                                </div>
                                <div className={styles["info-right"]}>
                                    <YakitButton
                                        type='text'
                                        className={styles["btn-style"]}
                                        onClick={() => {
                                            setShow(false)
                                            onUseOfficialEngine()
                                        }}
                                    >
                                        使用官方引擎
                                    </YakitButton>
                                </div>
                            </div>
                        )}
                        {/* 规则管理提示更新 */}
                        {ruleUpdate?.NeedUpdate && (
                            <div className={styles["body-info"]}>
                                <div className={styles["info-left"]}>
                                    <ErrorIcon />
                                    <div className={styles["left-body"]}>
                                        <div className={styles["title-style"]}>
                                            {ruleUpdate.State === "empty" ? "暂无本地规则" : "本地规则库需要更新"}
                                        </div>
                                        <div className={styles["subtitle-style"]}>
                                            {ruleUpdate.State === "empty"
                                                ? "检测到本地规则库为空，请点击确定重置规则"
                                                : "检测到需更新本地规则库，请点击更新规则"}
                                        </div>
                                    </div>
                                </div>
                                <div className={styles["info-right"]}>
                                    <YakitButton
                                        type='text'
                                        className={styles["btn-style"]}
                                        onClick={downloadRuleUpdate}
                                    >
                                        {ruleUpdate.State === "empty" ? "一键重置" : "一键更新"}
                                    </YakitButton>
                                </div>
                            </div>
                        )}
                    </div>
                )}
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
    }, [timeInterval, state, stateNum, showCheckEngine, isChecking, ruleUpdate])

    return (
        <>
            <YakitPopover
                overlayClassName={classNames(styles["global-state-popover"], isChecking ? ShowColorClass["loading"] : ShowColorClass[state])}
                placement={system === "Darwin" ? "bottomRight" : "bottomLeft"}
                content={isIRify() ? irifyContent : content}
                visible={show}
                trigger='click'
                onVisibleChange={(visible) => setShow(visible)}
            >
                <div className={classNames(styles["global-state-wrapper"], isChecking ? ShowColorClass["loading"] : ShowColorClass[state])}>
                    <div className={classNames(styles["state-body"])}>{isChecking ? ShowIcon["loading"] : ShowIcon[state]}</div>
                </div>
            </YakitPopover>
            <YakitHint
                visible={pcapHintShow}
                heardIcon={pcapResult ? <AllShieldCheckIcon /> : undefined}
                title={pcapResult ? t("Home.netcardAccessGranted") : t("Home.netcardNoAccess")}
                width={600}
                content={
                    pcapResult ? (
                        t("Home.netcardRepairWaiting")
                    ) : (
                        <>
                            {t("Home.linuxMacosPermission")}{" "}
                            <YakitTag enableCopy={true} color='yellow' copyText={`chmod +rw /dev/bpf*`}></YakitTag>
                            {t("Home.or")}{" "}
                            <YakitTag enableCopy={true} color='purple' copyText={`sudo chmod +rw /dev/bpf*`}></YakitTag>
                            {t("Home.rwPermissionAvailable")}
                        </>
                    )
                }
                okButtonText={t("Home.pcapEnablePermission")}
                cancelButtonText={pcapResult ? t("YakitButton.ok") : t("YakitButton.remindMeLater")}
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
                                {t("YakitButton.manualFix")}
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
            <IRifyApplySyntaxFlowRuleUpdate
                visible={ruleUpdateShow}
                setVisible={(v) => {
                    setRuleUpdateShow(v)
                }}
            />
            {/* 规则更新确认弹框 */}
            <YakitHint
                visible={openFristRuleUpdateModal}
                title={ruleUpdate?.State === "empty" ? "暂无本地规则" : "本地规则库需要更新"}
                content={
                    ruleUpdate?.State === "empty"
                        ? "检测到本地规则库为空，请点击确定重置规则"
                        : "检测到需更新本地规则库，请点击更新规则"
                }
                onOk={() => {
                    setFristRuleUpdateModal(false)
                    downloadRuleUpdate()
                }}
                onCancel={() => {
                    setFristRuleUpdateModal(false)
                }}
            />
            {/* 关闭运行节点确认弹框 */}
            <YakitHint
                visible={closeRunNodeItemVerifyVisible}
                title='是否确认关闭节点'
                content='确认后节点将会关闭，运行在节点上的任务也会停止'
                footerExtra={
                    <YakitCheckbox checked={noPrompt} onChange={(e) => setNoPrompt(e.target.checked)}>
                        下次不再提醒
                    </YakitCheckbox>
                }
                onOk={() => {
                    delRunNodeItem
                        ? handleKillRunNodeItem(delRunNodeItem.key, delRunNodeItem.pid)
                        : handleKillAllRunNode()
                    setCloseRunNodeItemVerifyVisible(false)
                }}
                onCancel={() => {
                    setDelRunNodeItem(undefined)
                    setCloseRunNodeItemVerifyVisible(false)
                }}
            />
        </>
    )
})
