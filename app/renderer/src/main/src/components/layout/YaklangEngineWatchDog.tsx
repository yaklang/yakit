import React, {useEffect, useState} from "react"
import {useDebounceEffect, useGetState, useMemoizedFn} from "ahooks"
import {isEngineConnectionAlive, outputToWelcomeConsole} from "@/components/layout/WelcomeConsoleUtil"
import {YaklangEngineMode} from "@/yakitGVDefine"
import {EngineModeVerbose} from "@/components/basics/YakitLoading"
import {failed} from "@/utils/notification"

export interface YaklangEngineWatchDogCredential {
    Mode?: YaklangEngineMode
    Host: string
    Port: number

    /**
     * 高级登陆验证信息
     * */
    IsTLS?: boolean
    PemBytes?: Uint8Array
    Password?: string
}

const {ipcRenderer} = window.require("electron")

export interface YaklangEngineWatchDogProps {
    credential: YaklangEngineWatchDogCredential
    keepalive: boolean
    engineLink: boolean

    onReady?: () => any
    onFailed?: (failedCount: number) => any
    onKeepaliveShouldChange?: (keepalive: boolean) => any
    onAdminPort?: () => any
}

export const YaklangEngineWatchDog: React.FC<YaklangEngineWatchDogProps> = React.memo(
    (props: YaklangEngineWatchDogProps) => {
        const [autoStartProgress, setAutoStartProgress] = useState(false)
        const [__startingUp, setIsStartingUp, getIsStartingUp] = useGetState(false)

        /** 引擎信息认证 */
        const engineTest = useMemoizedFn(() => {
            // 重置状态
            setAutoStartProgress(false)
            const mode = props.credential.Mode
            if (!mode) {
                return
            }

            if (props.credential.Port <= 0) {
                outputToWelcomeConsole("端口被设置为空，无法连接引擎")
                return
            }

            /**
             * 认证要小心做，拿到准确的信息之后，尝试连接一次，确定连接成功之后才可以开始后续步骤
             * 当然引擎没有启动的时候无法连接成功，要准备根据引擎状态选择合适的方式启动引擎
             */
            outputToWelcomeConsole("开始尝试连接 Yaklang 核心引擎")
            ipcRenderer
                .invoke("connect-yaklang-engine", props.credential)
                .then(() => {
                    outputToWelcomeConsole(`连接核心引擎成功！`)

                    if (props.onKeepaliveShouldChange) {
                        props.onKeepaliveShouldChange(true)
                    }
                })
                .catch((e) => {
                    outputToWelcomeConsole("未连接到引擎，尝试启动引擎进程")
                    switch (mode) {
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
                            failed(`${e}`)
                            return
                    }
                })
                .finally(() => {
                    outputToWelcomeConsole("连接引擎完成")
                })
        })

        /** 接受连接引擎的指令 */
        useEffect(() => {
            ipcRenderer.on("engine-ready-link-callback", async () => {
                engineTest()
            })

            return () => {
                ipcRenderer.removeAllListeners("engine-ready-link-callback")
            }
        }, [])

        // 这个 hook
        useDebounceEffect(
            () => {
                const mode = props.credential.Mode
                if (!mode) {
                    return
                }

                if (mode === "remote") {
                    return
                }

                if (props.credential.Port <= 0) {
                    return
                }

                if (!autoStartProgress) {
                    // 不启动进程的话，就直接退出
                    return
                }

                // 只有普通模式和管理员模式才涉及到引擎启动的流程
                outputToWelcomeConsole(`切换模式为: ${mode}`)
                const isAdmin = mode === "admin"
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

                ipcRenderer
                    .invoke("is-port-available", props.credential.Port)
                    .then(() => {
                        if (getIsStartingUp()) {
                            return
                        }
                        setIsStartingUp(true)
                        ipcRenderer
                            .invoke("start-local-yaklang-engine", {
                                port: props.credential.Port,
                                sudo: isAdmin
                            })
                            .then(() => {
                                outputToWelcomeConsole("引擎启动成功！")
                            })
                            .catch((e) => {
                                console.info(e)
                            })
                            .finally(() => {
                                setIsStartingUp(false)
                            })
                    })
                    .catch((e) => {
                        outputToWelcomeConsole(
                            `端口被占用，无法启动本地引擎（${EngineModeVerbose(mode as YaklangEngineMode)}）`
                        )
                        outputToWelcomeConsole(`错误原因为: ${e}`)
                        /**
                         * 管理员模式补充情况
                         * 连接的管理员进程进行关闭，然后手动触发重连，端口检测接口发出'端口不可用'信息
                         * 解决方案：进行新端口的生成，并重连
                         * 原因(猜测)：管理员进程的关闭是个过程，nodejs在kill后的30s才能检测端口可用
                         */
                        if (props.credential.Mode === "admin") {
                            if (props.onAdminPort) props.onAdminPort()
                        }
                    })
            },
            [autoStartProgress, props.onKeepaliveShouldChange, props.credential],
            {leading: false, wait: 1000}
        )

        useEffect(() => {
            if (!props.engineLink) setAutoStartProgress(false)
        }, [props.engineLink])

        useEffect(() => {
            const time = props.engineLink ? 5000 : 1000

            const keepalive = props.keepalive
            if (!keepalive) {
                if (props.onFailed) {
                    props.onFailed(10)
                }
                return
            }

            // outputToWelcomeConsole("刷新 keepalive 状态")

            let count = 0
            let failedCount = 0
            let notified = false
            const connect = () => {
                count++
                isEngineConnectionAlive()
                    .then(() => {
                        if (!keepalive) {
                            return
                        }
                        if (!notified) {
                            outputToWelcomeConsole("引擎已准备好，可以进行连接")
                            notified = true
                        }
                        failedCount = 0
                        if (props.onReady) {
                            props.onReady()
                        }
                    })
                    .catch((e) => {
                        failedCount++
                        if (
                            failedCount < 5 ||
                            (failedCount < 50 && failedCount % 10 === 0) ||
                            (failedCount < 1000 && failedCount % 30)
                        ) {
                            outputToWelcomeConsole(`引擎未完全启动，无法连接，失败次数：${failedCount}`)
                        }

                        if (props.onFailed) {
                            props.onFailed(failedCount)
                        }
                    })
            }
            connect()
            const id = setInterval(connect, time)
            return () => {
                clearInterval(id)
            }
        }, [props.keepalive, props.engineLink, props.onReady, props.onFailed])
        // outputToWelcomeConsole("刷新状态")
        return <></>
    }
)
