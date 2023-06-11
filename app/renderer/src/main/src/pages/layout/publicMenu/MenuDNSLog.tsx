import React, {useEffect, useMemo, useState} from "react"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {ArrowNarrowRightIcon, ChevronDownIcon, ChevronUpIcon} from "@/assets/newIcon"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {DNSLogEvent} from "@/pages/dnslog/DNSLogPage"
import {yakitNotify} from "@/utils/notification"
import {formatTimestamp} from "@/utils/timeUtil"
import {useGetState, useMemoizedFn} from "ahooks"

import classNames from "classnames"
import styles from "./MenuDNSLog.module.scss"

const {ipcRenderer} = window.require("electron")

interface MenuDNSLogProps {}

export const MenuDNSLog: React.FC<MenuDNSLogProps> = React.memo((props) => {
    const [token, setToken, getToken] = useGetState("")
    const [domain, setDomain, getDomain] = useGetState("")
    const [lastRecords, setLastRecords] = useState<DNSLogEvent[]>([])
    const [records, setRecords] = useState<DNSLogEvent[]>([])
    const [total, setTotal] = useState<number>(0)
    const [onlyARecord, setOnlyARecord, getOnlyARecord] = useGetState(true)

    // 生成传递给页面的配置信息
    const generateData = useMemoizedFn(() => {
        return {
            token,
            domain,
            onlyARecord
        }
    })
    // 同步给页面里dnslog新的参数
    const sendPageDnslog = useMemoizedFn((data: {token: string; domain: string; onlyARecord: boolean}) => {
        ipcRenderer.invoke("dnslog-menu-to-page", data)
    })

    useEffect(() => {
        // 接收dnslog页面发送的请求获取参数请求
        ipcRenderer.on("dnslog-page-to-menu-callback", () => {
            sendPageDnslog(generateData())
        })
        // 接收dnslog页面改变参数后的新参数
        ipcRenderer.on(
            "dnslog-page-change-menu-callback",
            (e, data: {token: string; domain: string; onlyARecord: boolean}) => {
                setOnlyARecord(data.onlyARecord)
                if (getToken() !== data.token || getDomain() !== data.domain) {
                    setToken(data.token || "")
                    setDomain(data.domain || "")
                    setLastRecords([])
                    setRecords([])
                    setTotal(0)
                }
            }
        )

        return () => {
            ipcRenderer.removeAllListeners("dnslog-page-to-menu-callback")
        }
    }, [])

    const updateToken = useMemoizedFn(() => {
        ipcRenderer
            .invoke("RequireDNSLogDomain", {Addr: ""})
            .then((rsp: {Domain: string; Token: string}) => {
                setToken(rsp.Token)
                setDomain(rsp.Domain)
                setLastRecords([])
                sendPageDnslog({token: rsp.Token, domain: rsp.Domain, onlyARecord})
            })
            .catch((e) => {
                yakitNotify("error", `error: ${e}`)
                setToken("")
                setDomain("")
            })
    })

    useEffect(() => {
        if (!token) {
            return
        }

        const id = setInterval(() => {
            ipcRenderer.invoke("QueryDNSLogByToken", {Token: token}).then((rsp: {Events: DNSLogEvent[]}) => {
                setTotal(rsp.Events.length)

                const lists = rsp.Events.filter((i) => {
                    if (getOnlyARecord()) {
                        return i.DNSType === "A"
                    }
                    return true
                }).map((i, index) => {
                    return {...i, Index: index}
                })

                if (lists.length <= 3) {
                    setLastRecords(lists.slice(0, 3))
                } else {
                    setLastRecords(lists.slice(lists.length - 3, lists.length))
                }
                setRecords(lists)
            })
        }, 5000)
        return () => {
            clearInterval(id)
        }
    }, [token])

    const onInfoDetails = useMemoizedFn((info: DNSLogEvent) => {
        ipcRenderer.invoke("dnslog-info-details", info)
    })

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
                                sendPageDnslog({token, domain, onlyARecord: val})
                            }}
                        />
                    </div>
                </div>

                <div className={styles["list-body"]}>
                    <div className={styles["body-header"]}>
                        <div className={classNames(styles["opt-style"], styles["opt-type"])}>DNS类型</div>
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
                                            {formatTimestamp(item.Timestamp)}
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
        <div className={styles["menu-dnslog-wrapper"]}>
            <div className={styles["dnslog-generate-host"]}>
                <div className={!!domain ? styles["generated-wrapper"] : styles["generate-wrapper"]}>
                    <div className={styles["title-style"]}>使用 Yakit 自带 DNSLog 反连服务</div>
                    <YakitButton size='small' onClick={updateToken}>
                        生成域名
                    </YakitButton>
                </div>
                {!!domain && (
                    <YakitTag color='info' copyText={domain} enableCopy={true}>
                        {domain}
                    </YakitTag>
                )}
            </div>

            <div className={styles["dnslog-arrow-right-wrapper"]}>
                <div className={styles["dnslog-arrow-right-body"]}>
                    <div className={styles["title-style"]}>访问记录</div>
                    <div className={styles["icon-style"]}>
                        <ArrowNarrowRightIcon />
                    </div>
                </div>
            </div>

            <div className={styles["dnslog-list-wrapper"]}>
                <div className={styles["dnslog-list-body"]}>
                    {lastRecords.map((item) => {
                        return (
                            <div key={`${item.RemoteAddr}-${item.Timestamp}`} className={styles["list-opt-wrapper"]}>
                                <div className={classNames(styles["opt-style"], styles["opt-type"])}>
                                    {item.DNSType}
                                </div>
                                <div className={classNames(styles["opt-style"], styles["opt-ip"])}>{item.RemoteIP}</div>
                                <div className={classNames(styles["opt-style"], styles["opt-time"])}>
                                    {formatTimestamp(item.Timestamp)}
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
                <YakitPopover
                    overlayClassName={styles["dnslog-list-popover"]}
                    overlayStyle={{paddingTop: 2}}
                    placement='bottomRight'
                    trigger={"click"}
                    content={listDom}
                    visible={listShow}
                    onVisibleChange={(visible) => setListShow(visible)}
                >
                    <div
                        className={classNames(styles["expand-func-wrapper"], {
                            [styles["active-expand-style"]]: listShow
                        })}
                    >
                        {listShow ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    </div>
                </YakitPopover>
            </div>
        </div>
    )
})
