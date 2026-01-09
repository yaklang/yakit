import {forwardRef, memo, useEffect, useImperativeHandle, useRef} from "react"
import {AllowSecretLocalJson, LocalEngineProps} from "./LocalEngineType"
import {useMemoizedFn} from "ahooks"
import {debugToPrintLog} from "@/utils/logCollection"
import {
    grpcCheckAllowSecretLocal,
    grpcFetchBuildInYakVersion,
    grpcFetchLatestYakitVersion,
    grpcFetchLocalYakitVersion,
    grpcFetchLocalYakVersion,
    grpcFetchLocalYakVersionHash,
    grpcFetchSpecifiedYakVersionHash
} from "../../grpc"
import {FetchSoftwareVersion, getReleaseEditionName, isEnpriTraceAgent} from "@/utils/envfile"
import {yakitNotify} from "@/utils/notification"
import {outputToWelcomeConsole, SystemInfo} from "../../utils"
import {getLocalValue} from "@/utils/kv"
import {LocalGVS} from "@/enums/yakitGV"
import {UpdateYakitHint} from "../UpdateYakitHint"

const {ipcRenderer} = window.require("electron")

function compare(a: string, b: string) {
    return a.localeCompare(b, undefined, {numeric: true, sensitivity: "base"})
}

export const LocalEngine: React.FC<LocalEngineProps> = memo(
    forwardRef((props, ref) => {
        const {
            setLog,
            onLinkEngine,
            yakitStatus,
            setYakitStatus,
            buildInEngineVersion,
            setRestartLoading,
            yakitUpdate,
            setYakitUpdate
        } = props
        // check Json
        const allowSecretLocalJson = useRef<AllowSecretLocalJson>(null)
        // 本地 yakit 版本
        const currentYakit = useRef<string>("")
        // 最新 yakit 版本
        const latestYakit = useRef<string>("")
        // 内置引擎版本
        const buildInYak = useRef<string>("")
        // 本地引擎版本
        const currentYak = useRef<string>("")

        const yakitStatusRef = useRef(yakitStatus)
        useEffect(() => {
            yakitStatusRef.current = yakitStatus
        }, [yakitStatus])

        const handleAllowSecretLocal = useMemoizedFn(async (port: number, checkVersion: boolean) => {
            // 中断连接 后续不执行
            if (yakitStatusRef.current === "break") {
                debugToPrintLog(`------ 开始 check 被阻止 ------`)
                setLog([])
                return
            }

            debugToPrintLog(`------ 开始执行 check ------`)
            setLog(["开始检查随机密码模式中..."])
            try {
                const res = await grpcCheckAllowSecretLocal({port, softwareVersion: FetchSoftwareVersion()})
                setRestartLoading(false)
                if (res.ok && res.status === "success") {
                    setLog((arr) => arr.concat(["检查通过，已支持随机密码模式"]))
                    setYakitStatus("")
                    allowSecretLocalJson.current = res.json
                    handlePreCheckForLinkEngine(checkVersion)
                    return
                }
                allowSecretLocalJson.current = null
                switch (res.status) {
                    case "timeout":
                        setLog((arr) => arr.concat(["命令执行超时，可查看日志详细信息..."]))
                        setYakitStatus("check_timeout")
                        break
                    case "call_error":
                        setLog((arr) => arr.concat(["引擎连接超时，可查看日志详细信息..."]))
                        setYakitStatus("check_timeout")
                        break
                    case "old_version":
                        setLog((arr) =>
                            arr.concat([
                                `引擎版本低，可点击${buildInEngineVersion ? "重置引擎版本更新..." : "下载引擎更新..."}`
                            ])
                        )
                        setYakitStatus("old_version")
                        break
                    case "port_occupied":
                        setLog((arr) => arr.concat(["端口不可用，可查看日志报错信息进行处理..."]))
                        setYakitStatus("port_occupied_prev")
                        break
                    case "antivirus_blocked":
                        setLog((arr) => arr.concat(["被杀软拦截，可将应用加入白名单后重启..."]))
                        setYakitStatus("antivirus_blocked")
                        break
                    case "build_yak_error":
                    case "dial_error":
                        setLog((arr) => arr.concat(["连接引擎出现问题，可点击重置引擎版本更新..."]))
                        setYakitStatus("skipAgreement_Install")
                        break
                    case "database_error":
                        setLog((arr) => arr.concat(["检测到本地数据库出现错误，可点击修复进行处理..."]))
                        setYakitStatus("database_error")
                        break
                    default:
                        setLog((arr) =>
                            arr.concat([
                                "无法启动，可将日志信息发送给工作人员处理...",
                                `[Reason]：${res.status}：${res.message || "无"}`
                            ])
                        )
                        setYakitStatus("allow-secret-error")
                }
            } catch (error) {
                if (yakitStatusRef.current !== "break") {
                    // 未知意外情况则重置引擎
                    outputToWelcomeConsole(`check出现意外情况：${error}`)
                    setLog(["check出现意外情况，可查看日志详细信息..."])
                    setYakitStatus("skipAgreement_Install")
                } else {
                    setLog(["已主动断开, 请点击手动连接引擎"])
                    setYakitStatus("break")
                }
            }
        })

        /**
         * @name 初始化启动-连接引擎的前置版本检查
         * - 引擎连接断开或下载其他版本引擎，不检查版本，直接连接引擎
         * - 开发环境直接连接引擎，不检查版本
         * - 先进行 yakit 检查，在进行引擎检查
         */
        const handlePreCheckForLinkEngine = useMemoizedFn((checkVersion: boolean) => {
            // 中断连接 后续不执行
            if (yakitStatusRef.current === "break") {
                debugToPrintLog(`------ 开始连接引擎的前置版本检查 被阻止 ------`)
                setLog([])
                return
            }

            debugToPrintLog(`------ 开始执行初始化启动-连接引擎的前置版本检查 ------`)
            if (SystemInfo.isDev) {
                setLog(["开发环境，直接连接引擎"])
                startYakEngine()
            } else if (checkVersion) {
                if (!isEnpriTraceAgent()) setLog(["检查软件是否有更新..."])
                handleCheckYakitLatestVersion()
            } else {
                startYakEngine()
            }
        })

        /**
         * @name 检查yakit是否有版本更新
         * - SE 版本不进行 yakit 更新检查，直接检查引擎和内置的版本
         * - 未开启 yakit 更新检查，不进行 yakit 更新检查，直接检查引擎和内置的版本
         */
        const handleCheckYakitLatestVersion = useMemoizedFn(() => {
            // 中断连接 后续不执行
            if (yakitStatusRef.current === "break") {
                debugToPrintLog(`------ 开始检查yakit是否有版本更新 被阻止 ------`)
                setLog([])
                return
            }

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
                                setTimeout(() => reject(new Error("Check engine source request timed out")), 3100)
                            )
                            const [res1, res2] = await Promise.allSettled([
                                grpcFetchLocalYakitVersion(true),
                                Promise.race([grpcFetchLatestYakitVersion({timeout: 3000}, true), promise])
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
                        setLog((old) => old.concat(["跳过检查(可在软件更新处设置启动)"]))
                    }
                })
                .catch(() => {})
                .finally(() => {
                    if (showUpdateYakit) {
                        setLog([`检测到有新版本${getReleaseEditionName()}，是否安装...`])
                        setYakitStatus("update_yakit")
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
         * - 忽略 yak 更新检查，不进行 yak 更新检查，直接检查引擎来源
         * - 无内置版本则直接连接引擎
         * - 内置比本地版本高提示是否更新
         */

        const handleCheckEngineVersion = useMemoizedFn(async () => {
            // 中断连接 后续不执行
            if (yakitStatusRef.current === "break") {
                debugToPrintLog(`------ 开始检查引擎本地版本和内置版本 被阻止 ------`)
                setLog([])
                return
            }

            try {
                const res = await getLocalValue(LocalGVS.NoYakVersionCheck)
                if (res) {
                    setLog(["获取引擎版本号..."])
                } else {
                    debugToPrintLog(`------ 开始检查引擎内置版本逻辑 ------`)
                    setLog(["获取引擎版本号并检查更新..."])
                }
                const localVersion = allowSecretLocalJson.current.version
                const localVersionPromise = localVersion
                    ? Promise.resolve(localVersion)
                    : grpcFetchLocalYakVersion(true)
                const buildInVersionPromise = grpcFetchBuildInYakVersion(true)
                const [res1, res2] = await Promise.allSettled([localVersionPromise, buildInVersionPromise])
                if (!res && res2.status === "fulfilled") {
                    let buildIn = res2.value || ""
                    buildInYak.current = buildIn.startsWith("v") ? buildIn.substring(1) : buildIn
                    debugToPrintLog(`------ 内置版本: ${buildInYak.current} ------`)
                }

                if (res1.status === "fulfilled") {
                    currentYak.current = (res1.value as string) || ""
                    debugToPrintLog(`------ 当前版本: ${currentYak.current} ------`)

                    setLog((old) =>
                        old.concat([
                            currentYak.current ? `本地引擎版本——${currentYak.current}` : "未获取到本地引擎版本号"
                        ])
                    )

                    if (!currentYak.current) {
                        startYakEngine()
                        return
                    }

                    if (res) {
                        handleCheckEngineSource(currentYak.current)
                    } else {
                        if (
                            !!currentYak.current &&
                            !!buildInYak.current &&
                            compare(buildInYak.current, currentYak.current) > 0
                        ) {
                            setLog(["检测到有引擎版本，是否安装..."])
                            setYakitStatus("update_yak")
                        } else {
                            setLog((old) => old.concat(["引擎无更新"]))
                            handleCheckEngineSource(currentYak.current)
                        }
                    }
                } else {
                    setLog((old) => old.concat([`错误: ${res1.reason}`]))
                    startYakEngine()
                }
            } catch (error) {
                setLog((old) => old.concat([`错误: ${error}`]))
                setYakitStatus("check_yak_version_error")
            }
        })

        /**
         * @name 校验引擎是否来源正确
         * - 通过相同版本的线上hash和本地hash对比，判断是否一样
         */
        const handleCheckEngineSource = useMemoizedFn(async (version?: string) => {
            // 中断连接 后续不执行
            if (yakitStatusRef.current === "break") {
                debugToPrintLog(`------ 开始校验引擎是否来源正确 被阻止 ------`)
                setLog([])
                return
            }

            debugToPrintLog(`------ 开始校验引擎来源逻辑 ------`)
            setLog(["开始校验引擎来源..."])
            const checkVersion = version || currentYak.current
            try {
                const promise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Fetch engine online hash request timed out")), 2100)
                )
                const [res1, res2] = await Promise.all([
                    // 远端
                    Promise.race([
                        grpcFetchSpecifiedYakVersionHash({version: checkVersion, config: {timeout: 2000}}, true),
                        promise
                    ]),
                    // 本地
                    grpcFetchLocalYakVersionHash(true)
                ])

                if (!res1 || !Array.isArray(res2) || res2.length === 0) {
                    setLog((old) => old.concat(["未知异常情况，无法检测来源，准备连接引擎"]))
                } else {
                    if (res2.includes(res1 as string)) {
                        setLog((old) => old.concat(["引擎来源正确，准备连接引擎"]))
                    } else {
                        setLog((old) => old.concat(["引擎非官方来源"]))
                        yakitNotify("info", "引擎非官方来源")
                    }
                }
            } catch (error) {
                setLog((old) => old.concat(["异常情况，无法检测来源，准备连接引擎"]))
            } finally {
                startYakEngine()
            }
        })

        const startYakEngine = useMemoizedFn(async () => {
            // 中断连接 后续不执行
            if (yakitStatusRef.current === "break") {
                debugToPrintLog(`------ 准备开始启动引擎逻辑 被阻止 ------`)
                setLog([])
                return
            }

            if (allowSecretLocalJson.current) {
                debugToPrintLog(`------ 准备开始启动引擎逻辑 ------`)
                setTimeout(() => {
                    onLinkEngine({
                        port: allowSecretLocalJson.current.port,
                        secret: allowSecretLocalJson.current.secret
                    })
                    // 启动本地连接后，重置所有检查状态，并后续不会在进行检查
                    handleResetAllStatus()
                }, 1000)
            }
        })

        /** 初始化所有引擎连接前检查状态 */
        const handleResetAllStatus = useMemoizedFn(() => {
            // check Json
            allowSecretLocalJson.current = null
            // yakit更新
            currentYakit.current = ""
            latestYakit.current = ""
            // yak更新
            currentYak.current = ""
            buildInYak.current = ""
        })

        // 监听数据库初始化中
        useEffect(() => {
            ipcRenderer.on("startUp-engine-msg", (_, str: string) => {
                setLog([str])
            })
            return () => {
                ipcRenderer.removeAllListeners("startUp-engine-msg")
            }
        }, [])

        // 全部流程
        const initLink = useMemoizedFn((port: number) => {
            handleAllowSecretLocal(port, true)
        })

        // 后续不再检测更新操作
        const toLink = useMemoizedFn((port: number) => {
            handleAllowSecretLocal(port, false)
        })

        useImperativeHandle(
            ref,
            () => ({
                init: initLink,
                checkEngine: handleCheckEngineVersion,
                checkEngineSource: handleCheckEngineSource,
                link: toLink
            }),
            []
        )

        return (
            <>
                {!isEnpriTraceAgent() && (
                    <UpdateYakitHint
                        visible={yakitUpdate}
                        onCallback={() => {
                            setYakitUpdate(false)
                            setRestartLoading(false)
                            setYakitStatus("")
                            handleCheckEngineVersion()
                        }}
                        latest={latestYakit.current}
                    />
                )}
            </>
        )
    })
)
