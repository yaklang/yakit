import React, {useEffect, useRef, useState} from "react"
import {useDebounceEffect, useMemoizedFn} from "ahooks"
import {isEngineConnectionAlive, outputToPrintLog, outputToWelcomeConsole} from "@/components/layout/WelcomeConsoleUtil"
import {EngineWatchDogCallbackType, YaklangEngineMode} from "@/yakitGVDefine"
import {EngineModeVerbose} from "@/components/basics/YakitLoading"
import {failed} from "@/utils/notification"
import {setRemoteValue} from "@/utils/kv"
import {useStore, yakitDynamicStatus} from "@/store"
import {remoteOperation} from "@/pages/dynamicControl/DynamicControl"
import {getRemoteHttpSettingGV, isEnpriTraceAgent} from "@/utils/envfile"
import emiter from "@/utils/eventBus/eventBus"

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

    failedCallback: (type: EngineWatchDogCallbackType) => any
}

export const YaklangEngineWatchDog: React.FC<YaklangEngineWatchDogProps> = React.memo(
    (props: YaklangEngineWatchDogProps) => {
        // 是否自动重启引擎进程
        const [autoStartProgress, setAutoStartProgress] = useState(false)
        // 是否正在重启引擎进程
        const startingUp = useRef<boolean>(false)
        const {dynamicStatus, setDynamicStatus} = yakitDynamicStatus()
        const {userInfo} = useStore()

        /** 引擎信息认证 */
        const engineTest = useMemoizedFn((isDynamicControl?: boolean) => {
            outputToPrintLog(
                `engineTest-start:\nmode:${props.credential.Mode}|port:${props.credential.Port}|isDynamicControl:${isDynamicControl}`
            )
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
                    outputToPrintLog(`engineTest-success: mode:${props.credential.Mode}`)
                    outputToWelcomeConsole(`连接核心引擎成功！`)
                    if (props.onKeepaliveShouldChange) {
                        props.onKeepaliveShouldChange(true)
                    }
                    // 如果为远程控制 则修改私有域为
                    if (isDynamicControl) {
                        // 远程控制生效
                        setDynamicStatus({...dynamicStatus, isDynamicStatus: true})
                        remoteOperation(true, dynamicStatus, userInfo)
                        if (dynamicStatus.baseUrl && dynamicStatus.baseUrl.length > 0) {
                            setRemoteValue(
                                getRemoteHttpSettingGV(),
                                JSON.stringify({BaseUrl: dynamicStatus.baseUrl})
                            )
                        }
                    }
                })
                .catch((e) => {
                    outputToPrintLog(`engineTest-failed: mode:${props.credential.Mode}`)
                    outputToWelcomeConsole("未连接到引擎，尝试启动引擎进程")
                    switch (mode) {
                        case "local":
                            outputToWelcomeConsole("尝试启动本地进程")
                            setAutoStartProgress(true)
                            return
                        case "remote":
                            outputToWelcomeConsole("远程模式不自动启动本地引擎")
                            if (isDynamicControl) {
                                props.failedCallback("control-remote-connect-failed")
                            } else {
                                props.failedCallback("remote-connect-failed")
                            }
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
            emiter.on("startAndCreateEngineProcess", (v?: boolean) => {
                engineTest(!!v)
            })
            return () => {
                emiter.off("startAndCreateEngineProcess")
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

                outputToPrintLog(`尝试启动新引擎进程: port:${props.credential.Port}`)

                // 只有普通模式才涉及到引擎启动的流程
                outputToWelcomeConsole(`开始以普通权限启动本地引擎进程，本地端口为: ${props.credential.Port}`)

                setTimeout(() => {
                    if (props.onKeepaliveShouldChange) {
                        props.onKeepaliveShouldChange(true)
                    }
                }, 600)

                ipcRenderer
                    .invoke("is-port-available", props.credential.Port)
                    .then(() => {
                        if (startingUp.current) {
                            return
                        }
                        startingUp.current = true
                        ipcRenderer
                            .invoke("start-local-yaklang-engine", {
                                port: props.credential.Port,
                                isEnpriTraceAgent: isEnpriTraceAgent()
                            })
                            .then(() => {
                                outputToWelcomeConsole("引擎启动成功！")
                                outputToPrintLog(`本地新引擎进程启动成功`)
                            })
                            .catch((e) => {
                                console.info(e)
                                outputToWelcomeConsole("引擎启动失败:" + e)
                                outputToPrintLog(`本地新引擎进程启动失败: ${e}`)
                            })
                            .finally(() => {
                                startingUp.current = false
                            })
                    })
                    .catch((e) => {
                        outputToWelcomeConsole(
                            `端口被占用，无法启动本地引擎（${EngineModeVerbose(mode as YaklangEngineMode)}）`
                        )
                        outputToWelcomeConsole(`错误原因为: ${e}`)
                        outputToPrintLog(`端口被占用: ${e}`)
                    })
            },
            [autoStartProgress, props.onKeepaliveShouldChange, props.credential],
            {leading: false, wait: 1000}
        )

        useEffect(() => {
            if (!props.engineLink) setAutoStartProgress(false)
        }, [props.engineLink])

        /** 未连接引擎前, 每隔1秒尝试连接一次, 连接引擎后, 每隔5秒尝试连接一次 */
        const attemptConnectTime = useMemoizedFn(() => {
            return props.engineLink ? 5000 : 1000
        })

        /**
         * 引擎连接尝试逻辑
         * 引擎连接有效尝试次数: 1-20
         */
        useEffect(() => {
            const keepalive = props.keepalive
            if (!keepalive) {
                if (props.onFailed) {
                    props.onFailed(100)
                }
                return
            }
            outputToPrintLog(`开始检测引擎进程是否启动`)

            let count = 0
            let failedCount = 0
            let notified = false
            const connect = () => {
                count++
                isEngineConnectionAlive()
                    .then(() => {
                        outputToPrintLog(`keepalive状态: ${keepalive}`)
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
                        if (failedCount > 0 && failedCount <= 20) {
                            outputToWelcomeConsole(`引擎未完全启动，无法连接，失败次数：${failedCount}`)
                        }

                        if (props.onFailed) {
                            props.onFailed(failedCount)
                        }
                    })
            }
            connect()
            const id = setInterval(connect, attemptConnectTime())
            return () => {
                clearInterval(id)
            }
        }, [props.keepalive, props.onReady, props.onFailed])
        return <></>
    }
)
