import React, {useEffect, useMemo, useRef, useState} from "react"
import {ReverseLinkSvgIcon, ReverseUnlinkSvgIcon} from "./icons"
import {getRemoteValue} from "@/utils/kv"
import {LocalGV} from "@/yakitGV"
import {failed, info} from "@/utils/notification"

import classnames from "classnames"
import styles from "./globalReverseState.module.scss"
import {useMemoizedFn} from "ahooks"

const {ipcRenderer} = window.require("electron")

export interface GlobalReverseStateProp {
    isEngineLink: boolean
}
/** 全局反连服务器配置参数 */
interface ReverseDetail {
    PublicReverseIP: string
    PublicReversePort: number
    LocalReverseAddr: string
    LocalReversePort: number
}

export const GlobalReverseState: React.FC<GlobalReverseStateProp> = React.memo((props) => {
    const {isEngineLink} = props

    const [status, setStatus] = useState<boolean>(false)
    const [details, setDetails] = useState<ReverseDetail>({
        LocalReverseAddr: "",
        LocalReversePort: 0,
        PublicReverseIP: "",
        PublicReversePort: 0
    })
    /** 获取全局反连状态计时器 */
    const timeRef = useRef<any>(null)

    /** 自启全局反连配置(默认指定为本地) */
    useEffect(() => {
        if (isEngineLink) {
            getRemoteValue(LocalGV.GlobalBridgeAddr).then((addr) => {
                getRemoteValue(LocalGV.GlobalBridgeSecret).then((secret) => {
                    ipcRenderer
                        .invoke("ConfigGlobalReverse", {
                            ConnectParams: {Addr: addr, Secret: secret},
                            LocalAddr: ""
                        })
                        .then((a: any) => console.info("自启-全局反连配置成功"))
                        .catch((e) => console.info(e))

                    getRemoteValue(LocalGV.GlobalDNSLogBridgeInherit).then((data) => {
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
                                getRemoteValue(LocalGV.GlobalDNSLogAddr).then((dnslogAddr: string) => {
                                    if (!!dnslogAddr) {
                                        getRemoteValue(LocalGV.GlobalDNSLogSecret).then((secret: string) => {
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

    const getGlobalReverse = useMemoizedFn(() => {
        ipcRenderer.invoke("GetGlobalReverseServer", {}).then((data: ReverseDetail) => {
            if (JSON.stringify(data) !== JSON.stringify(details)) setDetails(data)
        })
    })
    const getStatus = () => {
        ipcRenderer
            .invoke("get-global-reverse-server-status")
            .then((flag: boolean) => {
                setStatus(flag)
                if (flag) getGlobalReverse()
            })
            .catch((e: any) => console.info(e))
    }

    useEffect(() => {
        if (isEngineLink) {
            if (timeRef.current) clearInterval(timeRef.current)
            timeRef.current = setInterval(getStatus, 1000)

            return () => {
                clearInterval(timeRef.current)
            }
        } else {
            if (timeRef.current) clearInterval(timeRef.current)
            timeRef.current = null
            setStatus(false)
            setDetails({
                LocalReverseAddr: "",
                LocalReversePort: 0,
                PublicReverseIP: "",
                PublicReversePort: 0
            })
        }
    }, [isEngineLink])

    const isLink = useMemo(() => {
        return status && !!details.PublicReverseIP && !!details.PublicReversePort
    }, [status, details])

    return (
        <div
            className={classnames(
                styles["global-reserver-state-wrapper"],
                {[styles["link-state"]]: isLink},
                {[styles["unlink-stat"]]: !isLink}
            )}
        >
            {isLink ? <ReverseLinkSvgIcon /> : <ReverseUnlinkSvgIcon />}
        </div>
    )
})
