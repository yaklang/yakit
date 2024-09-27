import React, {forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {LocalEngineProps} from "./LocalEngineType"
import {LocalGVS} from "@/enums/localGlobal"
import {getLocalValue} from "@/utils/kv"
import {useMemoizedFn} from "ahooks"
import {getRandomLocalEnginePort} from "../WelcomeConsoleUtil"
import {isEnpriTraceAgent} from "@/utils/envfile"
import {failed, info, yakitNotify} from "@/utils/notification"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {UpdateYakitAndYaklang} from "../update/UpdateYakitAndYaklang"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import emiter from "@/utils/eventBus/eventBus"
import {handleFetchIsDev, SystemInfo} from "@/constants/hardware"
import {
    grpcFetchLatestYakitVersion,
    grpcFetchLatestYakVersion,
    grpcFetchLocalYakitVersion,
    grpcFetchLocalYakVersion
} from "@/apiUtils/grpc"

const {ipcRenderer} = window.require("electron")

export const LocalEngine: React.FC<LocalEngineProps> = memo(
    forwardRef((props, ref) => {
        const {system, setLog, onLinkEngine, setYakitStatus, checkEngineDownloadLatestVersion} = props

        const isDevRef = useRef<boolean | undefined>(SystemInfo.isDev)
        useEffect(() => {
            if (isDevRef.current === undefined) {
                handleFetchIsDev(() => (isDevRef.current = SystemInfo.isDev))
            }
        }, [])

        const [localPort, setLocalPort] = useState<number>(0)

        const [currentYakit, setCurrentYakit] = useState<string>("")
        const [latestYakit, setLatestYakit] = useState<string>("")
        const [currentYaklang, setCurrentYaklang] = useState<string>("")
        const [latestYaklang, setLatestYaklang] = useState<string>("")
        const [moreYaklangVersionList, setMoreYaklangVersionList] = useState<string[]>([]) // 更多引擎版本list

        /**
         * 只在软件打开时|引擎从无到有时执行该逻辑
         * 检查本地数据库权限
         */
        const handleCheckDataBase = useMemoizedFn(() => {
            const firstHint = "开始检查数据库权限是否正常"
            setLog([firstHint])
            let isError: boolean = false
            ipcRenderer
                .invoke("check-local-database")
                .then((e) => {
                    isError = e === "not allow to write" && system !== "Windows_NT"
                    if (isError) {
                        setLog([firstHint, "数据库权限错误，开始进行调整操作(非WIN系统检查)"])
                        setDatabaseErrorVisible(true)
                    } else {
                        setLog([firstHint, "数据库权限无问题"])
                        handleLinkEnginePort(true)
                    }
                })
                .catch((e) => {
                    setLog([firstHint, `检查出错: ${e}`])
                    handleLinkEnginePort(true)
                })
        })

        /** 获取上次本地连接引擎的端口缓存 */
        const handleLinkEnginePort = useMemoizedFn((isInit: boolean) => {
            getLocalValue(LocalGVS.YaklangEnginePort)
                .then((portRaw) => {
                    const port = parseInt(portRaw)
                    if (!port) {
                        getRandomLocalEnginePort((p) => {
                            if (isInit) {
                                onFetchLocalAndLatsVersion()
                            } else {
                                handleFetchYakitAndYaklangLocalVersion(() => {}, false)
                            }
                            setLocalPort(p)
                        })
                    } else {
                        if (isInit) {
                            onFetchLocalAndLatsVersion()
                        } else {
                            handleFetchYakitAndYaklangLocalVersion(() => {}, false)
                        }
                        setLocalPort(port)
                    }
                })
                .catch(() => {
                    getRandomLocalEnginePort((p) => {
                        if (isInit) {
                            onFetchLocalAndLatsVersion()
                        } else {
                            handleFetchYakitAndYaklangLocalVersion(() => {}, false)
                        }
                        setLocalPort(p)
                    })
                })
        })

        const onFetchLocalAndLatsVersion = useMemoizedFn(() => {
            setTimeout(() => {
                // 开发环境不做版本检测和 hash 检测
                handleFetchYakitAndYaklangLocalVersion(undefined, false)
            }, 500)
        })

        /** 是否阻止更新弹窗出现 */
        const preventUpdateHint = useRef<boolean>(false)
        /** 是否已弹出更新框 */
        const isShowedUpdateHint = useRef<boolean>(false)
        /** 校验引擎来源 主要作用是是否直接连引擎（校验弹窗的出现和这个变量的值不一定是一致的） */
        const checkEngineSourcePreventLinkLocalEnging = useRef<boolean>(false)

        // 2秒判断是否有更新 - 校验弹窗出现，没有则进入连接引擎
        const timingLinkLocalEnging = () => {
            setTimeout(() => {
                if (checkEngineSourcePreventLinkLocalEnging.current) return
                if (isShowedUpdateHint.current) return
                preventUpdateHint.current = true
                handleLinkLocalEnging()
            }, 2000)
        }

        const handleFetchYakitAndYaklangLocalVersion = useMemoizedFn(
            async (callback?: () => any, checkEngine?: boolean) => {
                try {
                    let localYakit = (await grpcFetchLocalYakitVersion(true)) || ""
                    setCurrentYakit(localYakit)
                } catch (error) {}

                try {
                    setLog(["获取引擎版本号..."])
                    let localYaklang = (await grpcFetchLocalYakVersion(true)) || ""
                    localYaklang = localYaklang.startsWith("v") ? localYaklang.slice(1) : localYaklang
                    setLog(["获取引擎版本号...", `引擎版本号——${localYaklang}`, "准备开始本地连接中"])
                    setCurrentYaklang(localYaklang)
                    if (checkEngine) {
                        await checkEngineSource(localYaklang)
                    } else {
                        if (callback) callback()
                    }
                    timingLinkLocalEnging()
                } catch (error) {
                    setLog(["获取引擎版本号...", `错误: ${error}`])
                    setYakitStatus("checkError")
                    if (callback) callback()
                }
            }
        )

        // 校验引擎是否来源正确
        const [versionAbnormalVisible, setVersionAbnormalVisible] = useState<boolean>(false)
        const [versionAbnormalLoading, setVersionAbnormalLoading] = useState<boolean>(false)
        const timeout = (ms: number) =>
            new Promise((_, reject) => setTimeout(() => reject(new Error("Check engine source request timed out")), ms))
        const checkEngineSource = async (localYaklang: string) => {
            try {
                setLog([`本地引擎版本${localYaklang}，校验引擎正确性中`])
                const [res1, res2] = await Promise.all([
                    Promise.race([ipcRenderer.invoke("fetch-check-yaklang-source", localYaklang), timeout(3000)]),
                    ipcRenderer.invoke("CalcEngineSha265")
                ])
                // 校验结果值判断比较
                if (res1 === res2) {
                    setLog(["引擎来源正确"])
                    handleFetchYakitAndYaklangLatestVersion()
                } else {
                    checkEngineSourcePreventLinkLocalEnging.current = true
                    setVersionAbnormalVisible(true)
                }
            } catch (error) {
                setLog(["引擎校验已结束"])
                handleFetchYakitAndYaklangLatestVersion()
            }
        }

        const onUseCurrentEngine = () => {
            setLog(["引擎校验已结束"])
            setVersionAbnormalVisible(false)
            checkEngineSourcePreventLinkLocalEnging.current = false
            handleFetchYakitAndYaklangLatestVersion()
            timingLinkLocalEnging()
        }

        const onUseOfficialEngine = async () => {
            try {
                const res = await ipcRenderer.invoke("GetBuildInEngineVersion")
                if (res !== "") {
                    initBuildInEngine()
                } else {
                    installEngine()
                }
            } catch (error) {
                installEngine()
            }
        }

        const initBuildInEngine = () => {
            setVersionAbnormalLoading(true)
            ipcRenderer
                .invoke("InitBuildInEngine", {})
                .then(() => {
                    yakitNotify("info", "解压内置引擎成功")
                    setVersionAbnormalVisible(false)
                    showYakitModal({
                        closable: false,
                        maskClosable: false,
                        keyboard: false,
                        type: "white",
                        title: "引擎解压成功，需要重启",
                        content: (
                            <div style={{height: 80, padding: 24, display: "flex", alignItems: "center"}}>
                                <YakitButton
                                    onClick={() => {
                                        ipcRenderer
                                            .invoke("relaunch")
                                            .then(() => {})
                                            .catch((e) => {
                                                failed(`重启失败: ${e}`)
                                            })
                                    }}
                                >
                                    点此立即重启
                                </YakitButton>
                            </div>
                        ),
                        footer: null
                    })
                })
                .catch((e) => {
                    yakitNotify("error", `初始化内置引擎失败：${e}`)
                })
                .finally(() => setTimeout(() => setVersionAbnormalLoading(false), 300))
        }

        useEffect(() => {
            emiter.on("execLocalEngineInitBuildInEngine", initBuildInEngine)
            return () => {
                emiter.off("execLocalEngineInitBuildInEngine", initBuildInEngine)
            }
        }, [])

        // 下载最新引擎并安装
        const installEngine = () => {
            setVersionAbnormalVisible(false)
            checkEngineDownloadLatestVersion()
        }

        const checkEngineDownloadLatestVersionCancel = () => {
            checkEngineSourcePreventLinkLocalEnging.current = true
            setVersionAbnormalVisible(true)
        }
        useEffect(() => {
            emiter.on("checkEngineDownloadLatestVersionCancel", checkEngineDownloadLatestVersionCancel)
            return () => {
                emiter.off("checkEngineDownloadLatestVersionCancel", checkEngineDownloadLatestVersionCancel)
            }
        }, [])

        const handleFetchYakitAndYaklangLatestVersion = useMemoizedFn(() => {
            if (isEnpriTraceAgent()) {
                // SE版本不检查更新
                preventUpdateHint.current = true
                return
            }
            getLocalValue(LocalGVS.NoAutobootLatestVersionCheck).then((val: boolean) => {
                if (val) preventUpdateHint.current = true

                if (!val) {
                    grpcFetchLatestYakitVersion(true)
                        .then((data) => {
                            if (preventUpdateHint.current) return
                            setLatestYakit(data || "")
                        })
                        .catch((err) => {})
                    grpcFetchLatestYakVersion(true)
                        .then((data: string) => {
                            if (preventUpdateHint.current) return
                            setLatestYaklang(data)
                        })
                        .catch((err) => {})

                    ipcRenderer
                        .invoke("fetch-yaklang-version-list")
                        .then((data: string) => {
                            if (preventUpdateHint.current) return
                            const arr = data.split("\n").filter((v) => v)
                            let devPrefix: string[] = []
                            let noPrefix: string[] = []
                            arr.forEach((item) => {
                                if (item.startsWith("dev")) {
                                    devPrefix.push(item)
                                } else {
                                    noPrefix.push(item)
                                }
                            })
                            setMoreYaklangVersionList(noPrefix.concat(devPrefix))
                        })
                        .catch((err) => {})
                }
            })
        })

        // 初始化后的本地连接-前置项检查
        const initLink = useMemoizedFn(() => {
            isShowedUpdateHint.current = false
            preventUpdateHint.current = true // !isEnpriTraceAgent() ? false : true
            checkEngineSourcePreventLinkLocalEnging.current = false
            handleCheckDataBase()
        })
        // 检查版本后直接连接
        const toLink = useMemoizedFn(() => {
            isShowedUpdateHint.current = false
            preventUpdateHint.current = true
            checkEngineSourcePreventLinkLocalEnging.current = false
            handleLinkEnginePort(false)
        })

        useImperativeHandle(
            ref,
            () => ({
                init: initLink,
                link: toLink
            }),
            []
        )

        // 开始进行本地引擎连接
        const handleLinkLocalEnging = useMemoizedFn(() => {
            // 开始连接本地引擎
            onLinkEngine(localPort)
            // 一旦启动本地连接了，后续就不用再检查更新情况了
            setLatestYakit("")
            setLatestYaklang("")
            setMoreYaklangVersionList([])
        })

        /** ---------- 软件自启的更新检测弹框 Start ---------- */
        const isShowUpdate = useMemo(() => {
            if (isEnpriTraceAgent()) return false
            if (!!currentYakit && !!latestYakit && `v${currentYakit}` !== latestYakit) {
                isShowedUpdateHint.current = true
                return true
            }

            const lowerYaklangLastVersion =
                moreYaklangVersionList.indexOf(currentYaklang) === -1 ||
                moreYaklangVersionList.indexOf(currentYaklang) > moreYaklangVersionList.indexOf(latestYaklang)
            if (!!currentYaklang && !!latestYaklang && moreYaklangVersionList.length && lowerYaklangLastVersion) {
                isShowedUpdateHint.current = true
                return true
            }

            return false
        }, [currentYakit, latestYakit, currentYaklang, moreYaklangVersionList, latestYaklang])

        const onCancelUpdateHint = useMemoizedFn(() => {
            preventUpdateHint.current = true
            handleLinkLocalEnging()
        })
        /** ---------- 软件自启的更新检测弹框 End ---------- */

        /** ---------- 数据库权限逻辑 Start ---------- */
        const [databaseErrorVisible, setDatabaseErrorVisible] = useState<boolean>(false)
        const [databaseErrorLoading, setDatabaseErrorLoading] = useState<boolean>(false)
        const onFixDatabaseError = useMemoizedFn(() => {
            setDatabaseErrorLoading(true)
            ipcRenderer
                .invoke("fix-local-database")
                .then((e) => {
                    info("修复成功")
                })
                .catch((e) => {
                    failed(`修复数据库权限错误：${e}`)
                })
                .finally(() => {
                    setTimeout(() => {
                        setDatabaseErrorVisible(false)
                        setDatabaseErrorLoading(false)
                        handleLinkEnginePort(true)
                    }, 300)
                })
        })
        /** ---------- 数据库权限逻辑 End ---------- */

        return (
            <>
                {!isEnpriTraceAgent() && isShowUpdate && (
                    <UpdateYakitAndYaklang
                        currentYakit={currentYakit}
                        latestYakit={latestYakit}
                        setLatestYakit={setLatestYakit}
                        currentYaklang={currentYaklang}
                        latestYaklang={latestYaklang}
                        setLatestYaklang={setLatestYaklang}
                        isShow={isShowUpdate}
                        onCancel={onCancelUpdateHint}
                    />
                )}
                {databaseErrorVisible && (
                    <YakitHint
                        getContainer={document.getElementById("yakit-uilayout-body") || undefined}
                        mask={false}
                        isDrag={true}
                        visible={databaseErrorVisible}
                        title='yaklang 数据库错误'
                        content='尝试修复数据库写权限（可能要求 ROOT 权限）'
                        okButtonText='立即修复'
                        okButtonProps={{loading: databaseErrorLoading}}
                        cancelButtonProps={{style: {display: "none"}}}
                        onOk={onFixDatabaseError}
                    />
                )}
                {versionAbnormalVisible && (
                    <YakitHint
                        getContainer={document.getElementById("yakit-uilayout-body") || undefined}
                        mask={true}
                        isDrag={false}
                        visible={versionAbnormalVisible}
                        title='引擎版本异常'
                        content='当前引擎非官方发布版本，为避免出现问题，不建议使用'
                        okButtonText='使用官方引擎'
                        cancelButtonText='使用当前引擎'
                        okButtonProps={{loading: versionAbnormalLoading}}
                        cancelButtonProps={{loading: versionAbnormalLoading}}
                        onOk={onUseOfficialEngine}
                        onCancel={onUseCurrentEngine}
                    />
                )}
            </>
        )
    })
)
