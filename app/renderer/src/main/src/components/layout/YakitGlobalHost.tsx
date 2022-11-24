import React, {useEffect, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"

import styles from "./yakitGlobalHost.module.scss"

const {ipcRenderer} = window.require("electron")

export interface YakitGlobalHostProp {
    isEngineLink: boolean
}

export const YakitGlobalHost: React.FC<YakitGlobalHostProp> = (props) => {
    const {isEngineLink} = props

    const [host, setHost] = useState<{addr: string; port: string}>({addr: "??", port: "??"})
    /** 获取连接引擎地址计时器 */
    const timeRef = useRef<any>(null)

    /** 获取连接引擎的地址参数 */
    const getGlobalHost = useMemoizedFn(() => {
        ipcRenderer
            .invoke("fetch-yaklang-engine-addr")
            .then((data) => {
                if (data.addr === `${host.addr}:${host.port}`) return
                const hosts: string[] = (data.addr as string).split(":")
                if (hosts.length !== 2) return
                setHost({addr: hosts[0], port: hosts[1]})
            })
            .catch(() => {})
    })

    /** 引擎连接和断开时的展示内容处理 */
    useEffect(() => {
        if (isEngineLink) {
            if (timeRef.current) clearInterval(timeRef.current)
            timeRef.current = setInterval(getGlobalHost, 1000)

            return () => {
                clearInterval(timeRef.current)
            }
        } else {
            if (timeRef.current) clearInterval(timeRef.current)
            timeRef.current = null
            setHost({addr: "??", port: "??"})
        }
    }, [isEngineLink])

    return (
        <div className={styles["yakit-global-host-wrapper"]}>
            <div className={styles["yakit-global-host-body"]}>
                <span className={styles["addr-ip"]}>{`${host.addr} `}</span>
                <span className={styles["addr-port"]}>{host.port}</span>
            </div>
        </div>
    )
}
