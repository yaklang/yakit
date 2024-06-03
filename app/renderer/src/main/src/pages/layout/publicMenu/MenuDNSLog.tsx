import React, {useEffect, useMemo, useRef, useState} from "react"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {ArrowNarrowRightIcon, ChevronDownIcon, ChevronUpIcon, QuitIcon, RefreshIcon} from "@/assets/newIcon"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {DNSLogEvent, DNS_LOG_PAGE_UPDATE_TOKEN, SendMenuDnslogProps} from "@/pages/dnslog/DNSLogPage"
import {yakitNotify} from "@/utils/notification"
import {formatTime} from "@/utils/timeUtil"
import {useGetState, useMemoizedFn} from "ahooks"
import ReactResizeDetector from "react-resize-detector"
import {YakitRoute} from "@/enums/yakitRoute"

import classNames from "classnames"
import styles from "./MenuDNSLog.module.scss"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {RemoteGV} from "@/yakitGV"
import {LoadingOutlined} from "@ant-design/icons"

const {ipcRenderer} = window.require("electron")

interface MenuDNSLogProps {}

interface UpdateTokenParams {
    Addr: string
    DNSMode: string
    UseLocal: boolean
}

export interface DnslogMenuToPage {
    token: string
    domain: string
    onlyARecord: boolean
    dnsMode: string
    useLocal: boolean
    isReset?: boolean
}

export const MenuDNSLog: React.FC<MenuDNSLogProps> = React.memo((props) => {
    const [token, setToken, getToken] = useGetState("")
    const [domain, setDomain, getDomain] = useGetState("")
    const [lastRecords, setLastRecords] = useState<DNSLogEvent[]>([])
    const [records, setRecords] = useState<DNSLogEvent[]>([])
    const [total, setTotal] = useState<number>(0)
    const [onlyARecord, setOnlyARecord, getOnlyARecord] = useGetState(false)
    const [dnsMode, setDNSMode, getDNSMode] = useGetState<string>("")
    const [useLocal, setUseLocal, getUseLocal] = useGetState<boolean>(true)
    const [loading, setLoading] = useState<boolean>(false)

    useEffect(() => {
        getRemoteValue(RemoteGV.GlobalDNSLogOnlyARecord).then((setting: string) => {
            setOnlyARecord(setting === "true")
        })
    }, [])

    useEffect(() => {
        setRemoteValue(RemoteGV.GlobalDNSLogOnlyARecord, onlyARecord + "")
    }, [onlyARecord])

    // 生成传递给页面的配置信息
    const generateData = useMemoizedFn(() => {
        return {
            token,
            domain,
            onlyARecord,
            dnsMode,
            useLocal
        }
    })
    // 同步给页面里dnslog新的参数
    const sendPageDnslog = useMemoizedFn((data: DnslogMenuToPage) => {
        ipcRenderer.invoke("dnslog-menu-to-page", data)
    })

    useEffect(() => {
        // 接收dnslog页面发送的请求获取参数请求
        ipcRenderer.on("dnslog-page-to-menu-callback", () => {
            sendPageDnslog(generateData())
        })
        // 接收dnslog页面改变参数后的新参数
        ipcRenderer.on("dnslog-page-change-menu-callback", (e, data: SendMenuDnslogProps) => {
            const {dnsLogType, onlyARecord, token, domain, DNSMode, UseLocal} = data
            setOnlyARecord(onlyARecord)
            if (dnsLogType === "builtIn") {
                if (getToken() === "" && token === "" && getDomain() === "" && domain === "") {
                    DNSMode && setDNSMode(DNSMode)
                    UseLocal !== undefined && setUseLocal(UseLocal)
                    return
                }
                if (getToken() && token === "" && getDomain() && domain === "") {
                    DNSMode && setDNSMode(DNSMode)
                    UseLocal !== undefined && setUseLocal(UseLocal)
                    return
                }
                if (getToken() !== token || getDomain() !== domain) {
                    setToken(token || "")
                    setDomain(domain || "")
                    DNSMode && setDNSMode(DNSMode)
                    UseLocal !== undefined && setUseLocal(UseLocal)
                    setLastRecords([])
                    setRecords([])
                    setTotal(0)
                }
            }
        })

        return () => {
            ipcRenderer.removeAllListeners("dnslog-page-to-menu-callback")
        }
    }, [])

    const [tokenLoading, setTokenLoading] = useState<boolean>(false)

    const updateToken = (params?: UpdateTokenParams) => {
        let paramsObj: any = {
            Addr: ""
        }
        if (params) {
            paramsObj.Addr = params.Addr
            paramsObj.DNSMode = params.DNSMode
            paramsObj.UseLocal = params.UseLocal
            setDNSMode(params.DNSMode)
            setUseLocal(params.UseLocal)
        }

        setTokenLoading(true)
        ipcRenderer
            .invoke("RequireDNSLogDomain", paramsObj)
            .then((rsp: {Domain: string; Token: string}) => {
                setToken(rsp.Token)
                setDomain(rsp.Domain)
                setLastRecords([])
                sendPageDnslog({
                    token: rsp.Token,
                    domain: rsp.Domain,
                    onlyARecord: getOnlyARecord(),
                    dnsMode: getDNSMode(),
                    useLocal: getUseLocal()
                })
            })
            .catch((e) => {
                yakitNotify("error", `error: ${e}`)
                setToken("")
                setDomain("")
            })
            .finally(() => {
                setTimeout(() => {
                    setTokenLoading(false)
                }, 100)
            })
    }

    const updateTokenByScript = (params) => {
        setTokenLoading(true)
        ipcRenderer
            .invoke("RequireDNSLogDomainByScript", {ScriptName: params.ScriptName})
            .then((rsp: {Domain: string; Token: string}) => {
                setToken(rsp.Token)
                setDomain(rsp.Domain)
                setLastRecords([])
                sendPageDnslog({
                    token: rsp.Token,
                    domain: rsp.Domain,
                    onlyARecord: getOnlyARecord(),
                    dnsMode: getDNSMode(),
                    useLocal: getUseLocal()
                })
            })
            .catch((e) => {
                yakitNotify("error", `error: ${e}`)
                setToken("")
                setDomain("")
            })
            .finally(() => {
                setTimeout(() => setTokenLoading(false), 100)
            })
    }

    const update = useMemoizedFn(() => {
        getRemoteValue(DNS_LOG_PAGE_UPDATE_TOKEN).then((data) => {
            if (!data) {
                // 默认内置
                updateToken()
            } else {
                let obj = JSON.parse(data)
                // 内置
                if (obj.type === "builtIn") {
                    updateToken(obj)
                }
                // 自定义
                else if (obj.type === "custom" && obj.ScriptName.length > 0) {
                    updateTokenByScript(obj)
                } else {
                    updateToken()
                }
            }
        })
    })

    const isQueryDNSLogLoad = useRef<boolean>(false)
    const getQueryDNSLogByToken = useMemoizedFn(() => {
        setLoading(true)
        isQueryDNSLogLoad.current = true
        ipcRenderer
            .invoke("QueryDNSLogByToken", {Token: token, DNSMode: getDNSMode(), UseLocal: getUseLocal()})
            .then((rsp: {Events: DNSLogEvent[]}) => {
                setTotal(rsp.Events.length)
                const lists = rsp.Events.filter((i) => {
                    if (getOnlyARecord()) {
                        return i.DNSType === "A"
                    }
                    return true
                })
                    .map((i, index) => {
                        return {...i, Index: index}
                    })
                    .reverse()

                if (lists.length <= 3) {
                    setLastRecords(lists.slice(0, 3))
                } else {
                    setLastRecords(lists.slice(lists.length - 3, lists.length))
                }
                setRecords(lists)
                lists.length > 0 && setLoading(false)
            })
            .catch(() => {
                setLoading(false)
            })
            .finally(() => {
                isQueryDNSLogLoad.current = false
            })
    })

    useEffect(() => {
        if (!token) {
            return
        }
        getQueryDNSLogByToken()
        const id = setInterval(() => {
            if (!isQueryDNSLogLoad.current) {
                getQueryDNSLogByToken()
            }
        }, 5000)
        return () => {
            clearInterval(id)
        }
    }, [token])

    const onInfoDetails = useMemoizedFn((info: DNSLogEvent) => {
        ipcRenderer.invoke("send-to-tab", {
            type: YakitRoute.DNSLog,
            data: {}
        })
        setTimeout(() => {
            ipcRenderer.invoke("dnslog-info-details", info)
        }, 200)
    })
    const onInfoAll = useMemoizedFn(() => {
        ipcRenderer.invoke("send-to-tab", {
            type: YakitRoute.DNSLog,
            data: {}
        })
    })

    // 重置
    const reset = useMemoizedFn(() => {
        setToken("")
        setDomain("")
        setLastRecords([])
        setRecords([])
        setTotal(0)
        setLoading(false)
        setTokenLoading(false)
        isQueryDNSLogLoad.current = false
        sendPageDnslog({...generateData(), isReset: true})
    })

    // 是否隐藏 dnslog 列表框
    const [isHide, setIsHide] = useState<boolean>(false)

    const [listShow, setListShow] = useState<boolean>(false)
    const listDom = useMemo(() => {
        return (
            <div className={styles["list-info-wrapper"]}>
                <div className={styles["list-header-wrapper"]}>
                    <div className={styles["header-body"]}>
                        <div className={styles["title-style"]}>访问记录</div>
                        <div className={styles["sub-title-style"]}>
                            Total <span className={styles["total-style"]}>{total}</span>
                        </div>
                    </div>
                    <div className={styles["extra-header-body"]}>
                        只看 A 记录
                        <YakitSwitch
                            wrapperClassName={styles["switch-style"]}
                            checked={onlyARecord}
                            onChange={(val: boolean) => {
                                setOnlyARecord(val)
                                sendPageDnslog({token, domain, onlyARecord: val, dnsMode, useLocal})
                            }}
                        />
                    </div>
                </div>

                <div className={styles["list-body"]}>
                    <div className={styles["body-header"]}>
                        <div className={classNames(styles["opt-style"], styles["opt-type"])}>类型</div>
                        <div className={classNames(styles["opt-style"], styles["opt-ip"])}>远端IP</div>
                        <div className={classNames(styles["opt-style"], styles["opt-time"])}>时间</div>
                        <div className={classNames(styles["opt-style"], styles["opt-btn"])}>操作</div>
                    </div>
                    <div className={styles["body-container"]}>
                        <div className={styles["container-body"]}>
                            {records.map((item) => {
                                return (
                                    <div key={`${item.RemoteAddr}-${item.Timestamp}`} className={styles["list-opt"]}>
                                        <div className={classNames(styles["opt-style"], styles["opt-type"])}>
                                            {item.DNSType}
                                        </div>
                                        <div className={classNames(styles["opt-style"], styles["opt-ip"])}>
                                            {item.RemoteIP}
                                        </div>
                                        <div className={classNames(styles["opt-style"], styles["opt-time"])}>
                                            {formatTime(item.Timestamp)}
                                        </div>
                                        <div
                                            className={classNames(styles["opt-style"], styles["opt-btn"])}
                                            onClick={() => onInfoDetails(item)}
                                        >
                                            详情
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        )
    }, [onlyARecord, records])

    return (
        <div className={classNames(styles["menu-dnslog-wrapper"], {[styles["menu-dnslog-hide-wrapper"]]: isHide})}>
            <ReactResizeDetector
                onResize={(width, height) => {
                    if (!width || !height) {
                        return
                    }
                    if (width <= 508) setIsHide(true)
                    else setIsHide(false)
                }}
                handleWidth={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />

            <div className={styles["dnslog-generate-host"]}>
                <div className={!!domain ? styles["generated-wrapper"] : styles["generate-wrapper"]}>
                    <div className={styles["title-style"]}>使用 Yakit 自带 DNSLog 反连服务</div>
                    {!!domain ? (
                        <YakitButton key={"close"} danger size='small' icon={<QuitIcon />} onClick={reset}>
                            关闭
                        </YakitButton>
                    ) : (
                        <YakitButton key={"create"} size='small' loading={tokenLoading} onClick={update}>
                            生成域名
                        </YakitButton>
                    )}
                </div>
                {!!domain && (
                    <YakitTag className={styles["dnslog-yakit-tag"]} color='info' copyText={domain} enableCopy={true}>
                        {domain}
                    </YakitTag>
                )}
                {/* 显示条件：已生成域名 & 有历史数据 & 宽度过小 */}
                {!!domain && isHide && records.length > 0 && (
                    <YakitButton type='text' onClick={onInfoAll}>
                        查看访问记录
                    </YakitButton>
                )}
            </div>

            <div className={styles["dnslog-arrow-right-wrapper"]}>
                <div className={styles["dnslog-arrow-right-body"]}>
                    <div className={styles["title-style"]}>
                        {!!domain ? (
                            <>
                                {loading ? (
                                    <>
                                        加载中&nbsp;&nbsp;<LoadingOutlined style={{color: "var(--yakit-primary-5)"}} />
                                    </>
                                ) : (
                                    <>
                                        <YakitButton
                                            type='text2'
                                            onClick={getQueryDNSLogByToken}
                                        >手动刷新<RefreshIcon /></YakitButton>
                                    </>
                                )}
                            </>
                        ) : (
                            "访问记录"
                        )}
                    </div>
                    <div className={styles["icon-style"]}>
                        <ArrowNarrowRightIcon />
                    </div>
                </div>
            </div>

            <div className={styles["dnslog-list-wrapper"]}>
                <div className={styles["dnslog-list-body"]}>
                    {lastRecords.map((item, index) => {
                        return (
                            <div
                                key={`${item.RemoteAddr}-${item.Timestamp}-${index}`}
                                className={styles["list-opt-wrapper"]}
                            >
                                <div className={classNames(styles["opt-style"], styles["opt-type"])}>
                                    {item.DNSType}
                                </div>
                                <div className={classNames(styles["opt-style"], styles["opt-ip"])}>{item.RemoteIP}</div>
                                <div className={classNames(styles["opt-style"], styles["opt-time"])}>
                                    {formatTime(item.Timestamp)}
                                </div>
                                <div
                                    className={classNames(styles["opt-style"], styles["opt-btn"])}
                                    onClick={() => onInfoDetails(item)}
                                >
                                    详情
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div
                    className={classNames(styles["expand-func-wrapper"], {
                        [styles["active-expand-style"]]: listShow
                    })}
                >
                    <YakitPopover
                        overlayClassName={styles["dnslog-list-popover"]}
                        overlayStyle={{paddingTop: 2}}
                        placement='bottomRight'
                        trigger={"click"}
                        content={listDom}
                        visible={listShow}
                        onVisibleChange={(visible) => setListShow(visible)}
                    >
                        <div className={styles["body-style"]}>{listShow ? <ChevronUpIcon /> : <ChevronDownIcon />}</div>
                    </YakitPopover>
                </div>
            </div>
        </div>
    )
})
