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
    keepalive: boolean

    onReady?: () => any
    onFailed?: (failedCount: number) => any
    onKeepaliveShouldChange?: (keepalive: boolean) => any
}


export const YaklangEngineWatchDog: React.FC<YaklangEngineWatchDogProps> = React.memo((props: YaklangEngineWatchDogProps) => {
    const [__c, setCredential, getCredential] = useGetState<YaklangEngineWatchDogCredential>(props.credential);
    const [autoStartProgress, setAutoStartProgress] = useState(false);

    useEffect(() => {
        console.info(props)
        // 重置状态
        setAutoStartProgress(false)

        if (!props.mode) {
            return
        }

        if (props.credential.Port <= 0) {
            outputToWelcomeConsole("端口被设置为空，无法连接引擎")
            return;
        }

        /**
         * 认证要小心做，拿到准确的信息之后，尝试连接一次，确定连接成功之后才可以开始后续步骤
         * 当然引擎没有启动的时候无法连接成功，要准备根据引擎状态选择合适的方式启动引擎
         */
        if (props.mode === "remote") {
            outputToWelcomeConsole("远程模式")
            return
        }
        outputToWelcomeConsole("开始尝试连接 Yaklang 核心引擎")
        ipcRenderer.invoke("connect-yaklang-engine", props.credential).then(() => {
            outputToWelcomeConsole(`连接核心引擎成功！`)
            if (props.onKeepaliveShouldChange) {
                props.onKeepaliveShouldChange(true)
            }
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
        }).finally(() => {
            outputToWelcomeConsole("连接引擎完成")
        })
    }, [props.mode, props.credential])

    // 这个 hook
    useEffect(() => {
        if (!props.mode) {
            return
        }

        if (props.mode === "remote") {
            return
        }

        if (props.credential.Port <= 0) {
            return;
        }

        if (!autoStartProgress) {
            // 不启动进程的话，就直接退出
            return
        }

        // 只有普通模式和管理员模式才涉及到引擎启动的流程
        outputToWelcomeConsole(`切换 Props 模式为: ${props.mode}`)
        const isAdmin = props.credential.Sudo || props.mode === "admin";
        if (isAdmin) {
            outputToWelcomeConsole(`开始以管理员权限启动本地引擎进程，本地端口为: ${props.credential.Port}`)
        } else {
            outputToWelcomeConsole(`开始以普通权限启动本地引擎进程，本地端口为: ${props.credential.Port}`)
        }

        setTimeout(() => {
            if (props.onKeepaliveShouldChange) {
                props.onKeepaliveShouldChange(true)
            }
        }, 600)

        ipcRenderer.invoke("start-local-yaklang-engine", {
            port: props.credential.Port,
            sudo: isAdmin,
        }).then(() => {
            outputToWelcomeConsole("引擎启动成功！")
        }).catch(e => {
            console.info(e)
        })
    }, [autoStartProgress, props])

    useEffect(() => {
        const keepalive = props.keepalive;
        if (!keepalive) {
            return
        }

        let count = 0
        let failedCount = 0;
        let notified = false;
        const connect = () => {
            count++
            isEngineConnectionAlive().then(() => {
                if (!keepalive) {
                    return
                }
                if (!notified) {
                    outputToWelcomeConsole("引擎已准备好，可以进行连接")
                    notified = true;
                }
                failedCount = 0
                if (props.onReady) {
                    props.onReady()
                }
            }).catch(e => {
                failedCount++
                if (failedCount > 5) {
                    if (props.onKeepaliveShouldChange) {
                        props.onKeepaliveShouldChange(false)
                    }
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
    }, [props])

    return <></>
});