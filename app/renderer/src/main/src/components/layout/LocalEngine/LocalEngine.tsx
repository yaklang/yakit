import React, {forwardRef, memo, useEffect, useImperativeHandle, useRef, useState} from "react"
import {LocalEngineProps} from "./LocalEngineType"
import {LocalGVS} from "@/enums/localGlobal"
import {getLocalValue} from "@/utils/kv"
import {useMemoizedFn} from "ahooks"
import {getRandomLocalEnginePort} from "../WelcomeConsoleUtil"
import {isEnpriTraceAgent} from "@/utils/envfile"
import {failed, info} from "@/utils/notification"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {UpdateYakHint, UpdateYakitHint} from "../update/UpdateYakitAndYaklang"
import emiter from "@/utils/eventBus/eventBus"
import {SystemInfo} from "@/constants/hardware"
import {
    grpcFetchBuildInYakVersion,
    grpcFetchLatestYakitVersion,
    grpcFetchLocalYakitVersion,
    grpcFetchLocalYakVersion,
    grpcFetchSpecifiedYakVersionHash
} from "@/apiUtils/grpc"

const {ipcRenderer} = window.require("electron")

export const LocalEngine: React.FC<LocalEngineProps> = memo(
    forwardRef((props, ref) => {
        const {system, setLog, onLinkEngine, setYakitStatus, checkEngineDownloadLatestVersion} = props

        /**
         * 只在软件打开时|引擎从无到有时执行该逻辑
         * 检查本地数据库权限
         */
        const handleCheckDataBase = useMemoizedFn(() => {
            setLog(["检查数据库权限是否正常(非WIN系统检查)..."])
            let isError: boolean = false
            ipcRenderer
                .invoke("check-local-database")
                .then((e) => {
                    isError = e === "not allow to write" && system !== "Windows_NT"
                    if (isError) {
                        setLog((old) => old.concat(["数据库权限错误，开始进行修复操作(非WIN系统检查)"]))
                        setDatabaseErrorVisible(true)
                    } else {
                        setLog((old) => old.concat(["数据库权限无问题"]))
                        handleLinkEnginePort(true)
                    }
                })
                .catch((e) => {
                    setLog((old) => old.concat([`检查出错: ${e}`]))
                    handleLinkEnginePort(true)
                })
        })

        // 本地引擎连接端口
        const localPort = useRef<number>(0)
        /** 获取上次本地连接引擎的端口缓存 */
        const handleLinkEnginePort = useMemoizedFn((isInit: boolean) => {
            getLocalValue(LocalGVS.YaklangEnginePort)
                .then((portRaw) => {
                    const port = Number(portRaw) || 0
                    if (!port) {
                        getRandomLocalEnginePort((p) => {
                            localPort.current = p
                            if (isInit) {
                                handlePreCheckForLinkEngine()
                            } else {
                                handleFetchYakLocalVersionToLink()
                            }
                        })
                    } else {
                        localPort.current = port
                        if (isInit) {
                            handlePreCheckForLinkEngine()
                        } else {
                            handleFetchYakLocalVersionToLink()
                        }
                    }
                })
                .catch(() => {
                    getRandomLocalEnginePort((p) => {
                        localPort.current = p
                        if (isInit) {
                            handlePreCheckForLinkEngine()
                        } else {
                            handleFetchYakLocalVersionToLink()
                        }
                    })
                })
        })

        /**
         * @name 初始化启动-连接引擎的前置版本检查
         * - 开发环境直接连接引擎，不检查版本
         * - 先进行 yakit 检查，在进行引擎检查
         */
        const handlePreCheckForLinkEngine = useMemoizedFn(() => {
            if (!isEnpriTraceAgent()) setLog(["检查软件是否有更新..."])
            else setLog([])

            if (SystemInfo.isDev) {
                setLog((old) => old.concat(["开发环境，直接连接引擎"]))
                setTimeout(() => {
                    handleLinkLocalEnging()
                }, 500)
            } else {
                handleCheckYakitLatestVersion()
            }
        })

        /**
         * @name 检查yakit是否有版本更新
         * - SE 版本不进行 yakit 更新检查，直接检查引擎和内置的版本
         * - 未开启 yakit 更新检查，不进行 yakit 更新检查，直接检查引擎和内置的版本
         */
        const handleCheckYakitLatestVersion = useMemoizedFn(() => {
            if (isEnpriTraceAgent()) {
                handleCheckEngineVersion()
                return
            }

            let showUpdateYakit = false
            getLocalValue(LocalGVS.NoAutobootLatestVersionCheck)
                .then(async (val: boolean) => {
                    if (!val) {
                        try {
                            const [res1, res2] = await Promise.allSettled([
                                grpcFetchLocalYakitVersion(true),
                                grpcFetchLatestYakitVersion({timeout: 2000}, true)
                            ])
                            if (res1.status === "fulfilled") {
                                currentYakit.current = res1.value || ""
                            }
                            if (res2.status === "fulfilled") {
                                let latest = res2.value || ""
                                latestYakit.current = latest.startsWith("v") ? latest.substring(1) : latest
                            }
                            // 只要与线上的不一样就算需要更新，不需要进行版本号比较
                            showUpdateYakit =
                                !!currentYakit.current &&
                                !!latestYakit.current &&
                                currentYakit.current !== latestYakit.current
                        } catch (error) {}
                    } else {
                        setLog((old) => old.concat(["跳过检查(可在软件更新处设置启动)，开始检查引擎是否有更新..."]))
                    }
                })
                .catch(() => {})
                .finally(() => {
                    if (showUpdateYakit) {
                        setLog((old) => old.concat(["软件存在新版本, 启动更新弹框..."]))
                        setShowYakit(true)
                    } else {
                        setLog((old) => old.concat(["软件无更新"]))
                        setTimeout(() => {
                            handleCheckEngineVersion()
                        }, 500)
                    }
                })
        })

        /**
         * @name 检查引擎本地版本和内置版本
         * - 无内置版本则直接连接引擎
         * - 内置比本地版本高提示是否更新
         */
        const handleCheckEngineVersion = useMemoizedFn(async () => {
            setLog(["获取引擎版本号并检查更新..."])
            try {
                const [res1, res2] = await Promise.allSettled([
                    // 本地
                    grpcFetchLocalYakVersion(true),
                    // 内置
                    grpcFetchBuildInYakVersion(true)
                ])
                if (res2.status === "fulfilled") {
                    let buildIn = res2.value || ""
                    buildInYak.current = buildIn.startsWith("v") ? buildIn.substring(1) : buildIn
                }
                if (res1.status === "fulfilled") {
                    currentYak.current = res1.value || ""
                    setLog((old) =>
                        old.concat([
                            currentYak.current ? `本地引擎版本——${currentYak.current}` : "未获取到本地引擎版本号"
                        ])
                    )

                    if (!!currentYak.current && !!buildInYak.current && buildInYak.current > currentYak.current) {
                        setLog((old) => old.concat(["检测到引擎有更新，打开更新弹框"]))
                        setShowYak(true)
                    } else {
                        setLog((old) => old.concat(["引擎无更新"]))
                        handleCheckEngineSource(currentYak.current)
                    }
                } else {
                    setLog((old) => old.concat([`错误: ${res1.reason}`]))
                    setYakitStatus("checkError")
                }
            } catch (error) {
                setLog((old) => old.concat([`错误: ${error}`]))
                setYakitStatus("checkError")
            }
        })

        /**
         * @name 校验引擎是否来源正确
         * - 通过相同版本的线上hash和本地hash对比，判断是否一样
         */
        const handleCheckEngineSource = useMemoizedFn(async (version: string) => {
            setLog(["开始校验引擎来源..."])
            try {
                const [res1, res2] = await Promise.all([
                    // 远端
                    grpcFetchSpecifiedYakVersionHash({version: version, config: {timeout: 2000}}, true),
                    // 本地
                    ipcRenderer.invoke("CalcEngineSha265")
                ])

                if (res1 === res2) {
                    setLog((old) => old.concat(["引擎来源正确，准备连接引擎"]))
                    handleLinkLocalEnging()
                } else {
                    setLog((old) => old.concat(["引擎非官方来源，启动提示框"]))
                    setVersionAbnormalVisible(true)
                }
            } catch (error) {
                setLog((old) => old.concat(["异常情况，无法检测来源，准备连接引擎"]))
                handleLinkLocalEnging()
            }
        })

        /**
         * @name 获取本地引擎版本，并连接引擎
         */
        const handleFetchYakLocalVersionToLink = useMemoizedFn(async () => {
            try {
                setLog(["获取引擎版本号..."])
                let localYaklang = (await grpcFetchLocalYakVersion(true)) || ""
                localYaklang = localYaklang.startsWith("v") ? localYaklang.slice(1) : localYaklang
                setLog((old) => old.concat([`引擎版本号——${localYaklang}`, "准备开始本地连接中"]))
                currentYak.current = localYaklang
                setTimeout(() => {
                    handleLinkLocalEnging()
                }, 1000)
            } catch (error) {
                setLog((old) => old.concat([`错误: ${error}`]))
                setYakitStatus("checkError")
            }
        })

        /** 开始进行本地引擎连接 */
        const handleLinkLocalEnging = useMemoizedFn(() => {
            // 开始连接本地引擎
            onLinkEngine(localPort.current)
            // 启动本地连接后，重置所有检查状态，并后续不会在进行检查
            handleResetAllStatus()
        })

        /** 初始化所有引擎连接前检查状态 */
        const handleResetAllStatus = useMemoizedFn(() => {
            // 数据库权限
            setDatabaseErrorLoading(false)
            setDatabaseErrorVisible(false)
            // yakit更新
            currentYakit.current = ""
            latestYakit.current = ""
            setShowYakit(false)
            // yak更新
            currentYak.current = ""
            buildInYak.current = ""
            setShowYak(false)
            // 引擎来源验证
            setVersionAbnormalLoading(false)
            setVersionAbnormalVisible(false)
        })

        /** ---------- 暴露的外部调用方法 Start ---------- */
        // 启动 yakit 后的连接引擎
        const initLink = useMemoizedFn(() => {
            handleCheckDataBase()
        })
        // 切换引擎后的连接引擎
        const toLink = useMemoizedFn(() => {
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
        /** ---------- 暴露的外部调用方法 End ---------- */

        /** ---------- 数据库权限修复逻辑 Start ---------- */
        const [databaseErrorVisible, setDatabaseErrorVisible] = useState<boolean>(false)
        const [databaseErrorLoading, setDatabaseErrorLoading] = useState<boolean>(false)
        const onFixDatabaseError = useMemoizedFn(() => {
            if (databaseErrorLoading) return
            setDatabaseErrorLoading(true)
            ipcRenderer
                .invoke("fix-local-database")
                .then((e) => {
                    info("修复数据库权限成功")
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
        /** ---------- 数据库权限修复逻辑 End ---------- */

        /** ---------- Yakit更新弹框 Start ---------- */
        // 本地 yakit 版本
        const currentYakit = useRef<string>("")
        // 最新 yakit 版本
        const latestYakit = useRef<string>("")
        const [showYakit, setShowYakit] = useState<boolean>(false)
        const onCancelUpdateYakit = useMemoizedFn(() => {
            setShowYakit(false)
            handleCheckEngineVersion()
        })
        /** ---------- Yakit更新弹框 End ---------- */

        /** ---------- 引擎更新弹框 Start ---------- */
        // 本地引擎版本
        const currentYak = useRef<string>("")
        // 内置引擎版本
        const buildInYak = useRef<string>("")
        const [showYak, setShowYak] = useState<boolean>(false)
        const onCancelUpdateYak = useMemoizedFn((result: boolean) => {
            setShowYak(false)
            if (currentYak.current) {
                handleCheckEngineSource(result ? buildInYak.current : currentYak.current)
            } else {
                setLog((old) => old.concat(["未获取到引擎版本号，请重试!"]))
                setYakitStatus("checkError")
            }
        })
        /** ---------- 引擎更新弹框 End ---------- */

        /** ---------- 引擎非官方版本提示 Start ---------- */
        const [versionAbnormalVisible, setVersionAbnormalVisible] = useState<boolean>(false)
        const [versionAbnormalLoading, setVersionAbnormalLoading] = useState<boolean>(false)

        const handleCancelVersionAbnormal = useMemoizedFn(() => {
            setVersionAbnormalVisible(false)
            setVersionAbnormalLoading(false)
            setLog((old) => old.concat(["主动跳过，准备连接引擎"]))
            handleLinkLocalEnging()
        })
        const handleOKVersionAbnormal = useMemoizedFn(() => {
            if (versionAbnormalLoading) return

            setVersionAbnormalLoading(true)
            if (buildInYak.current) {
                ipcRenderer
                    .invoke("InitBuildInEngine", {})
                    .then(() => {
                        info(`解压内置引擎成功`)
                        setVersionAbnormalVisible(false)
                        setLog((old) => old.concat(["解压完成, 准备连接引擎"]))
                        handleLinkLocalEnging()
                    })
                    .catch((e) => {
                        failed(`初始化内置引擎失败：${e}`)
                    })
                    .finally(() => setTimeout(() => setVersionAbnormalLoading(false), 300))
            } else {
                setLog(["无内置引擎包，开始寻找本地引擎包源..."])
                setVersionAbnormalVisible(false)
                setVersionAbnormalLoading(false)
                checkEngineDownloadLatestVersion()
            }
        })

        const handleDownloadErrorOffceEngine = useMemoizedFn(() => {
            setVersionAbnormalVisible(true)
        })
        useEffect(() => {
            emiter.on("checkEngineDownloadLatestVersionCancel", handleDownloadErrorOffceEngine)
            return () => {
                emiter.off("checkEngineDownloadLatestVersionCancel", handleDownloadErrorOffceEngine)
            }
        }, [])
        /** ---------- 引擎非官方版本提示 End ---------- */

        return (
            <>
                {/* MAC 系统下数据库权限问题修复弹框 */}
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

                {/* Yakit 更新弹窗 */}
                {!isEnpriTraceAgent() && (
                    <UpdateYakitHint
                        current={currentYakit.current}
                        latest={latestYakit.current}
                        visible={showYakit}
                        onCallback={onCancelUpdateYakit}
                    />
                )}

                {/* 引擎更新为内置版本 */}
                <UpdateYakHint
                    current={currentYak.current}
                    buildIn={buildInYak.current}
                    visible={showYak}
                    onCallback={onCancelUpdateYak}
                />

                {/* 引擎非官方版本提示 */}
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
                        onOk={handleOKVersionAbnormal}
                        onCancel={handleCancelVersionAbnormal}
                    />
                )}
            </>
        )
    })
)
