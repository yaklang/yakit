import React, {forwardRef, memo, useEffect, useImperativeHandle, useRef, useState} from "react"
import {LocalEngineProps} from "./LocalEngineType"
import {LocalGVS} from "@/enums/localGlobal"
import {getLocalValue} from "@/utils/kv"
import {useMemoizedFn} from "ahooks"
import {isEnpriTraceAgent} from "@/utils/envfile"
import {failed, info} from "@/utils/notification"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {UpdateYakHint, UpdateYakitHint} from "../update/UpdateYakitAndYaklang"
import emiter from "@/utils/eventBus/eventBus"
import {SystemInfo} from "@/constants/hardware"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {
    grpcDetermineAdaptedVersionEngine,
    grpcFetchAvaiableProt,
    grpcFetchBuildInYakVersion,
    grpcFetchLatestYakitVersion,
    grpcFetchLocalYakitVersion,
    grpcFetchLocalYakVersion,
    grpcFetchLocalYakVersionHash,
    grpcFetchSpecifiedYakVersionHash
} from "@/apiUtils/grpc"
import {getEnginePortCacheKey} from "@/utils/localCache/engine"
import {debugToPrintLog} from "@/utils/logCollection"

const {ipcRenderer} = window.require("electron")

export const LocalEngine: React.FC<LocalEngineProps> = memo(
    forwardRef((props, ref) => {
        const {setLog, onLinkEngine, setYakitStatus, checkEngineDownloadLatestVersion, setOldLink, openEngineLinkWin} =
            props
        const {t} = useI18nNamespaces(["layout"])

        /**
         * 只在软件打开时|引擎从无到有时执行该逻辑
         * 检查本地数据库权限
         */
        const handleCheckDataBase = useMemoizedFn(() => {
            debugToPrintLog(`------ 检查数据库权限(mac) ------`)
            setLog([t("LocalEngine.checkDatabasePermission")])
            let isError: boolean = false
            ipcRenderer
                .invoke("check-local-database")
                .then((e) => {
                    isError = e === "not allow to write" && SystemInfo.system !== "Windows_NT"
                    if (isError) {
                        setLog((old) => old.concat([t("LocalEngine.databasePermissionError")]))
                        setDatabaseErrorVisible(true)
                    } else {
                        setLog((old) => old.concat([t("LocalEngine.databasePermissionOk")]))
                        handleLinkEnginePort(true)
                    }
                })
                .catch((e) => {
                    setLog((old) => old.concat([t("LocalEngine.checkFailed", {error: String(e)})]))
                    handleLinkEnginePort(true)
                })
        })

        // 本地引擎连接端口
        const localPort = useRef<number>(0)
        /** 获取上次本地连接引擎的端口缓存 */
        const handleLinkEnginePort = useMemoizedFn(async (isInit: boolean) => {
            debugToPrintLog(`------ 开始 获取本地引擎启动端口逻辑 ------`)
            let builtInVersion = ""
            try {
                builtInVersion = await grpcFetchBuildInYakVersion(true)
            } catch (error) {}

            let avaPort = 0
            let err: any
            try {
                avaPort = Number(await grpcFetchAvaiableProt(true)) || 0
            } catch (error) {
                err = error
            }

            let continueExe = true
            try {
                const cachePort = Number(await getLocalValue(getEnginePortCacheKey())) || 0
                debugToPrintLog(`------ 获取到缓存本地端口: ${cachePort} | ${avaPort} | ${builtInVersion} ------`)
                // 缓存端口和可用端口都不存在
                if (!cachePort && !avaPort) {
                    debugToPrintLog(`------ 获取到缓存本地端口逻辑-1 ------`)
                    continueExe = false
                    setLog([
                        t("LocalEngine.getPortFailed", {error: String(err)}),
                        builtInVersion ? t("LocalEngine.updateVersionRequired", {version: builtInVersion}) : ""
                    ])
                    setYakitStatus("engine-error")
                    return
                } else if (cachePort) {
                    debugToPrintLog(`------ 获取到缓存本地端口逻辑-2 ------`)
                    try {
                        const res = await grpcDetermineAdaptedVersionEngine(cachePort, true)
                        localPort.current = res ? cachePort : avaPort
                    } catch {
                        localPort.current = cachePort
                    }
                } else if (avaPort) {
                    debugToPrintLog(`------ 获取到缓存本地端口逻辑-3 ------`)
                    localPort.current = avaPort
                }

                // grpcDetermineAdaptedVersionEngine res 为 false -》取随机端口，但是随机端口没有获取到的情况
                if (localPort.current === 0) {
                    continueExe = false
                    setLog([
                        t("LocalEngine.getPortFailed", {error: String(err)}),
                        builtInVersion ? t("LocalEngine.updateVersionRequired", {version: builtInVersion}) : ""
                    ])
                    setYakitStatus("engine-error")
                }
            } catch (error) {
                debugToPrintLog(`------ 未获取到缓存本地端口: ${avaPort} | ${builtInVersion} ------`)
                if (avaPort) {
                    localPort.current = avaPort
                } else {
                    continueExe = false
                    setLog([
                        t("LocalEngine.getPortFailed", {error: String(err)}),
                        builtInVersion ? t("LocalEngine.updateVersionRequired", {version: builtInVersion}) : ""
                    ])
                    setYakitStatus("engine-error")
                }
            } finally {
                if (continueExe) {
                    if (isInit) {
                        handlePreCheckForLinkEngine()
                    } else {
                        handleFetchYakLocalVersionToLink()
                    }
                }
            }
        })

        /**
         * @name 初始化启动-连接引擎的前置版本检查
         * - 开发环境直接连接引擎，不检查版本
         * - 先进行 yakit 检查，在进行引擎检查
         */
        const handlePreCheckForLinkEngine = useMemoizedFn(() => {
            if (!isEnpriTraceAgent()) setLog([t("LocalEngine.checkSoftwareUpdate")])
            else setLog([])

            if (SystemInfo.isDev) {
                setLog((old) => old.concat([t("LocalEngine.devDirectConnect")]))
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
                        debugToPrintLog(`------ 开始检查软件版本更新逻辑 ------`)
                        try {
                            const promise = new Promise((_, reject) =>
                                setTimeout(() => reject(new Error("Check engine source request timed out")), 2100)
                            )
                            const [res1, res2] = await Promise.allSettled([
                                grpcFetchLocalYakitVersion(true),
                                Promise.race([grpcFetchLatestYakitVersion({timeout: 2000}, true), promise])
                            ])
                            if (res1.status === "fulfilled") {
                                currentYakit.current = res1.value || ""
                                debugToPrintLog(`------ 当前软件版本: ${currentYakit.current} ------`)
                            }
                            if (res2.status === "fulfilled") {
                                let latest = (res2.value || "") as string
                                latestYakit.current = latest.startsWith("v") ? latest.substring(1) : latest
                                debugToPrintLog(`------ 最新软件版本: ${latestYakit.current} ------`)
                            }
                            // 只要与线上的不一样就算需要更新，不需要进行版本号比较
                            showUpdateYakit =
                                !!currentYakit.current &&
                                !!latestYakit.current &&
                                currentYakit.current !== latestYakit.current
                        } catch (error) {}
                    } else {
                        debugToPrintLog(`------ 跳过检查软件版本更新逻辑 ------`)
                        setLog((old) => old.concat([t("LocalEngine.skipSoftwareUpdateCheck")]))
                    }
                })
                .catch(() => {})
                .finally(() => {
                    if (showUpdateYakit) {
                        setLog((old) => old.concat([t("LocalEngine.newSoftwareVersion")]))
                        setShowYakit(true)
                    } else {
                        setLog((old) => old.concat([t("LocalEngine.softwareUpToDate")]))
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
            debugToPrintLog(`------ 开始检查引擎内置版本逻辑 ------`)
            setLog([t("LocalEngine.checkEngineVersion")])
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
                    debugToPrintLog(`------ 内置版本: ${buildInYak.current} ------`)
                }
                if (res1.status === "fulfilled") {
                    currentYak.current = (res1.value as string) || ""
                    debugToPrintLog(`------ 当前版本: ${currentYak.current} ------`)
                    setLog((old) =>
                        old.concat([
                            currentYak.current ? t("LocalEngine.currentEngineVersion", {version: currentYak.current}) : t("LocalEngine.noLocalEngineVersion")
                        ])
                    )

                    if (!currentYak.current) {
                        setTimeout(() => {
                            handleLinkLocalEnging()
                        }, 500)
                        return
                    }

                    if (isResetBuiltInReason.current && !!buildInYak.current) {
                        restoreEngine()
                        return
                    }

                    if (!!currentYak.current && !!buildInYak.current && buildInYak.current > currentYak.current) {
                        setLog((old) => old.concat([t("LocalEngine.engineUpdateDetected")]))
                        setShowYak(true)
                    } else {
                        setLog((old) => old.concat([t("LocalEngine.engineUpToDate")]))
                        handleCheckEngineSource(currentYak.current)
                    }
                } else {
                    setLog((old) => old.concat([t("LocalEngine.error", {error: String(res1.reason)})]))
                    setTimeout(() => {
                        handleLinkLocalEnging()
                    }, 500)
                }
            } catch (error) {
                setLog((old) => old.concat([t("LocalEngine.error", {error: String(error)})]))
                setYakitStatus("checkError")
            }
        })

        /** 立即更新成内置引擎 */
        const restoreEngine = useMemoizedFn(async () => {
            debugToPrintLog(`------ 开始解压内置引擎包逻辑 ------`)
            ipcRenderer
                .invoke("RestoreEngineAndPlugin", {})
                .then(() => {
                    info(t("LocalEngine.unpackBuiltinEngineSuccess"))
                    ipcRenderer.invoke("write-engine-key-to-yakit-projects").finally(() => {
                        // onCancelUpdateYak(true)
                        setYakitStatus("")
                        setOldLink(false)
                        openEngineLinkWin("local")
                    })
                })
                .catch((e) => {
                    failed(t("LocalEngine.restoreEngineFailed", {error: String(e)}))
                })
        })

        /**
         * @name 校验引擎是否来源正确
         * - 通过相同版本的线上hash和本地hash对比，判断是否一样
         */
        const handleCheckEngineSource = useMemoizedFn(async (version: string) => {
            debugToPrintLog(`------ 开始校验引擎来源逻辑 ------`)
            setLog([t("LocalEngine.checkEngineSource")])
            try {
                const promise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Fetch engine online hash request timed out")), 2100)
                )
                const [res1, res2] = await Promise.all([
                    // 远端
                    Promise.race([
                        grpcFetchSpecifiedYakVersionHash({version: version, config: {timeout: 2000}}, true),
                        promise
                    ]),
                    // grpcFetchSpecifiedYakVersionHash({version: version, config: {timeout: 2000}}, true),
                    // 本地
                    grpcFetchLocalYakVersionHash()
                ])

                if (!res1 || !Array.isArray(res2) || res2.length === 0) {
                    setLog((old) => old.concat([t("LocalEngine.unknownSourcePrepareConnect")]))
                    handleLinkLocalEnging()
                } else {
                    if (res2.includes(res1 as string)) {
                        setLog((old) => old.concat([t("LocalEngine.sourceCorrectPrepareConnect")]))
                        handleLinkLocalEnging()
                    } else {
                        setLog((old) => old.concat([t("LocalEngine.nonOfficialSourcePrompt")]))
                        setVersionAbnormalVisible(true)
                    }
                }
            } catch (error) {
                setLog((old) => old.concat([t("LocalEngine.errorSourcePrepareConnect")]))
                handleLinkLocalEnging()
            }
        })

        /**
         * @name 获取本地引擎版本，并连接引擎
         */
        const handleFetchYakLocalVersionToLink = useMemoizedFn(async () => {
            try {
                setLog([t("LocalEngine.getEngineVersion")])
                let localYaklang = (await grpcFetchLocalYakVersion(true)) || ""
                localYaklang = localYaklang.startsWith("v") ? localYaklang.slice(1) : localYaklang
                setLog((old) => old.concat([t("LocalEngine.localEngineVersion", {version: localYaklang}), t("LocalEngine.prepareLocalConnect")]))
                currentYak.current = localYaklang
            } catch (error) {
                setLog((old) => old.concat([t("LocalEngine.error", {error: String(error)})]))
            }
            setTimeout(() => {
                handleLinkLocalEnging()
            }, 1000)
        })

        /** 开始进行本地引擎连接 */
        const handleLinkLocalEnging = useMemoizedFn(() => {
            if (localPort.current === 0) {
                debugToPrintLog(`------ 启动端口异常(port: ${localPort.current}) ------`)
                setLog([t("LocalEngine.zeroPortSwitch")])
                setYakitStatus("")
            } else {
                debugToPrintLog(`------ 准备开始启动引擎逻辑 ------`)
                // 开始连接本地引擎
                onLinkEngine(localPort.current)
                // 启动本地连接后，重置所有检查状态，并后续不会在进行检查
                handleResetAllStatus()
            }
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
        // 重置内置引擎的确认弹框
        const resetBuiltIn = useMemoizedFn(() => {
            isResetBuiltInReason.current = true
            handleCheckEngineVersion()
        })

        useImperativeHandle(
            ref,
            () => ({
                init: initLink,
                link: toLink,
                resetBuiltIn: resetBuiltIn
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
                    info(t("LocalEngine.fixDatabasePermissionSuccess"))
                })
                .catch((e) => {
                    failed(t("LocalEngine.fixDatabasePermissionFailed", {error: String(e)}))
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
        // 是否因为引擎文件错误导致的重置内置引擎安装
        const isResetBuiltInReason = useRef(false)
        // 本地引擎版本
        const currentYak = useRef<string>("")
        // 内置引擎版本
        const buildInYak = useRef<string>("")
        const [showYak, setShowYak] = useState<boolean>(false)
        const onCancelUpdateYak = useMemoizedFn((result: boolean) => {
            setShowYak(false)
            if (isResetBuiltInReason.current) {
                handleLinkEnginePort(true)
            } else {
                if (currentYak.current) {
                    handleCheckEngineSource(result ? buildInYak.current : currentYak.current)
                } else {
                    setLog((old) => old.concat([t("LocalEngine.noEngineVersionRetry")]))
                    setYakitStatus("checkError")
                }
            }
            isResetBuiltInReason.current = false
        })
        /** ---------- 引擎更新弹框 End ---------- */

        /** ---------- 引擎非官方版本提示 Start ---------- */
        const [versionAbnormalVisible, setVersionAbnormalVisible] = useState<boolean>(false)
        const [versionAbnormalLoading, setVersionAbnormalLoading] = useState<boolean>(false)

        const handleCancelVersionAbnormal = useMemoizedFn(() => {
            setVersionAbnormalVisible(false)
            setVersionAbnormalLoading(false)
            setLog((old) => old.concat([t("LocalEngine.skipAndConnect")]))
            handleLinkLocalEnging()
        })
        const handleOKVersionAbnormal = useMemoizedFn(() => {
            if (versionAbnormalLoading) return

            setVersionAbnormalLoading(true)
            if (buildInYak.current) {
                ipcRenderer
                    .invoke("RestoreEngineAndPlugin", {})
                    .then(() => {
                        info(t("LocalEngine.unpackBuiltinEngineSuccess"))
                        ipcRenderer.invoke("write-engine-key-to-yakit-projects").finally(() => {
                            setVersionAbnormalVisible(false)
                            setYakitStatus("")
                            setOldLink(false)
                            openEngineLinkWin("local")
                        })
                    })
                    .catch((e) => {
                        failed(t("LocalEngine.initBuiltinEngineFailed", {error: String(e)}))
                    })
                    .finally(() => setTimeout(() => setVersionAbnormalLoading(false), 300))
            } else {
                setLog([t("LocalEngine.noBuiltinEnginePackage")])
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
                        title={t("LocalEngine.databaseErrorTitle")}
                        content={t("LocalEngine.databaseErrorContent")}
                        okButtonText={t("LocalEngine.fixNow")}
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
                    setOldLink={setOldLink}
                    openEngineLinkWin={openEngineLinkWin}
                    setYakitStatus={setYakitStatus}
                />

                {/* 引擎非官方版本提示 */}
                {versionAbnormalVisible && (
                    <YakitHint
                        getContainer={document.getElementById("yakit-uilayout-body") || undefined}
                        mask={true}
                        isDrag={false}
                        visible={versionAbnormalVisible}
                        title={t("LocalEngine.versionAbnormalTitle")}
                        content={t("LocalEngine.versionAbnormalContent")}
                        okButtonText={t("LocalEngine.useOfficialEngine")}
                        cancelButtonText={t("LocalEngine.useCurrentEngine")}
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
