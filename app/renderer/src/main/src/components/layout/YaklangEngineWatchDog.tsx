import React, {useEffect, useState} from "react";
import {useGetState} from "ahooks";
import {isEngineConnectionAlive, outputToWelcomeConsole} from "@/components/layout/WelcomeConsoleUtil";
import {YaklangEngineMode} from "@/yakitGVDefine";
import {setLocalValue} from "@/utils/kv";
import {LocalGV} from "@/yakitGV";
import {randomString} from "@/utils/randomUtil";

export interface YaklangEngineWatchDogCredential {
    Host: string
    Port: number
    Sudo: boolean

    /**
     * 高级登陆验证信息
     * */
    IsTLS?: boolean
    PemBytes?: Uint8Array
    Password?: string
}

const {ipcRenderer} = window.require("electron");

export interface YaklangEngineWatchDogProps {
    credential: YaklangEngineWatchDogCredential,
    mode?: YaklangEngineMode

    reconnectTrigger: boolean

    onReady?: () => any
    onFailed?: (failedCount: number) => any
}


export const YaklangEngineWatchDog: React.FC<YaklangEngineWatchDogProps> = React.memo((props) => {
    const [__c, setCredential, getCredential] = useGetState<YaklangEngineWatchDogCredential>(props.credential);
    const [autoStartProgress, setAutoStartProgress] = useState(false);
    const [keepalive, setKeepalive] = useState(false);

    const [reconnectTrigger, setReconnectTrigger] = useState(false);

    useEffect(() => {
        if (reconnectTrigger === props.reconnectTrigger) {
            return
        }
        setReconnectTrigger(props.reconnectTrigger)

        setKeepalive(false)
        setAutoStartProgress(false)
    }, [props.reconnectTrigger])

    useEffect(() => {
        // 重置状态
        setAutoStartProgress(false)
        setKeepalive(false)

        if (!props.mode) {
            return
        }

        if (props.credential.Port <= 0) {
            return;
        }

        /**
         * 认证要小心做，拿到准确的信息之后，尝试连接一次，确定连接成功之后才可以开始后续步骤
         * 当然引擎没有启动的时候无法连接成功，要准备根据引擎状态选择合适的方式启动引擎
         */
        if (props.mode !== "local") {
            return
        }
        outputToWelcomeConsole("开始尝试连接 Yaklang 核心引擎")
        ipcRenderer.invoke("connect-yaklang-engine", props.credential).then(() => {
            outputToWelcomeConsole(`连接核心引擎成功！`)
            setLocalValue(LocalGV.YaklangEnginePort, `${props.credential.Port}`)
        }).catch((e) => {
            outputToWelcomeConsole("未连接到引擎，尝试启动引擎进程")
            switch (props.mode) {
                case "admin":
                    outputToWelcomeConsole("尝试启动管理员进程")
                    setAutoStartProgress(true)
                    return
                case "local":
                    outputToWelcomeConsole("尝试启动本地进程")
                    setAutoStartProgress(true)
                    return
                case "remote":
                    outputToWelcomeConsole("远程模式不自动启动本地引擎")
                    return
            }
        })
    }, [props])

    // 这个 hook
    useEffect(() => {
        // 启动启动进程只有 local 和 admin 有关
        setKeepalive(false)

        if (!props.mode) {
            return
        }

        if (props.credential.Port <= 0) {
            return;
        }

        if (!autoStartProgress) {
            // 不启动进程的话，就直接退出
            return
        }

        outputToWelcomeConsole(`切换 Props 模式为: ${props.mode}`)
        if (props.credential.Sudo) {
            outputToWelcomeConsole(`开始以管理员权限启动本地引擎进程，本地端口为: ${props.credential.Port}`)
        } else {
            outputToWelcomeConsole(`开始以普通权限启动本地引擎进程，本地端口为: ${props.credential.Port}`)
        }
        setKeepalive(true)
        ipcRenderer.invoke("start-local-yaklang-engine", {
            port: props.credential.Port,
            sudo: props.mode === "admin",
        }).then(() => {
            outputToWelcomeConsole("引擎启动成功！")
        }).catch(e => {
            console.info(e)
        })
    }, [autoStartProgress, props])

    useEffect(() => {
        if (!keepalive) {
            return
        }

        let count = 0
        let failedCount = 0;
        const connect = () => {
            count++
            isEngineConnectionAlive().then(() => {
                if (!keepalive) {
                    return
                }
                outputToWelcomeConsole("引擎已准备好，可以进行连接")
                failedCount = 0
                if (props.onReady) {
                    props.onReady()
                }
            }).catch(e => {
                failedCount++
                if (failedCount > 5) {
                    setKeepalive(false)
                }
                outputToWelcomeConsole(`引擎未完全启动，无法连接，失败次数：${failedCount}`)
                if (props.onFailed) {
                    props.onFailed(failedCount)
                }
            })
        };
        connect()
        const id = setInterval(connect, 3000)
        return () => {
            clearInterval(id)
        }
    }, [keepalive])

    return <></>
});