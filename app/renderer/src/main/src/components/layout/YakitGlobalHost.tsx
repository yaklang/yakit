import {useGetState, useMemoizedFn} from "ahooks"
import React, {useEffect, useState} from "react"

import styles from "./yakitGlobalHost.module.scss"

const {ipcRenderer} = window.require("electron")

export interface YakitGlobalHostProp {}

export const YakitGlobalHost: React.FC<YakitGlobalHostProp> = (props) => {
    const [host, setHost, getHost] = useGetState<{addr: string; port: string}>({addr: "??", port: "??"})

    const getGlobalHost = useMemoizedFn(() => {
        console.log("getHost")

        ipcRenderer
            .invoke("yakit-connect-status")
            .then((data) => {
                console.log(111, data)
                const hosts: string[] = (data.addr as string).split(":")
                if (hosts.length !== 2) return
                setHost({addr: hosts[0], port: hosts[1]})
            })
            .catch(() => {
                console.log("1111erroe")
            })
    })

    useEffect(() => {
        ipcRenderer.on("client-engine-status-ok", (e, reason) => {
            console.log("ok")
            getGlobalHost()
        })
        ipcRenderer.on("client-engine-status-error", (e, reason) => {
            console.log("error")
            if (getHost().addr === "??") return
            setHost({addr: "??", port: "??"})
        })

        const updateEngineStatus = () => {
            console.log(123)
            ipcRenderer.invoke("engine-status").catch((e: any) => {
                if (getHost().addr === "??") return
                setHost({addr: "??", port: "??"})
            })
        }
        // let id = setInterval(updateEngineStatus, 500)
        return () => {
            ipcRenderer.removeAllListeners("client-engine-status-error")
            ipcRenderer.removeAllListeners("client-engine-status-ok")
            // clearInterval(id)
        }
    }, [])

    return (
        <div className={styles["yakit-global-host-wrapper"]}>
            <div className={styles["yakit-global-host-body"]}>
                <span className={styles["addr-ip"]}>{`${host.addr} `}</span>
                <span className={styles["addr-port"]}>{host.port}</span>
            </div>
        </div>
    )
}
