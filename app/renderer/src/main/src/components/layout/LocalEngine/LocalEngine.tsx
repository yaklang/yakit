import React, {forwardRef, memo, useImperativeHandle, useMemo, useRef, useState} from "react"
import {LocalEngineProps} from "./LocalEngineType"
import {LocalGVS} from "@/enums/localGlobal"
import {getLocalValue} from "@/utils/kv"
import {useMemoizedFn} from "ahooks"
import {getRandomLocalEnginePort} from "../WelcomeConsoleUtil"
import {isCommunityEdition} from "@/utils/envfile"
import {failed, info} from "@/utils/notification"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {UpdateYakitAndYaklang} from "../update/UpdateYakitAndYaklang"

const {ipcRenderer} = window.require("electron")

export const LocalEngine: React.FC<LocalEngineProps> = memo(
    forwardRef((props, ref) => {
        const {system, setLog, onLinkEngine, setYakitStatus} = props

        const [localPort, setLocalPort] = useState<number>(0)

        const [currentYakit, setCurrentYakit] = useState<string>("")
        const [latestYakit, setLatestYakit] = useState<string>("")
        const [currentYaklang, setCurrentYaklang] = useState<string>("")
        const [latestYaklang, setLatestYaklang] = useState<string>("")

        /**
         * 只在软件打开时|引擎从无到有时执行该逻辑
         * 检查本地数据库权限
         */
        const handleCheckDataBase = useMemoizedFn(() => {
            console.log("check-database")
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
                        handleLinkEnginePort()
                    }
                })
                .catch((e) => {
                    setLog([firstHint, `检查出错: ${e}`])
                    handleLinkEnginePort()
                })
        })

        /** 获取上次本地连接引擎的端口缓存 */
        const handleLinkEnginePort = useMemoizedFn(() => {
            console.log("get-port")
            getLocalValue(LocalGVS.YaklangEnginePort)
                .then((portRaw) => {
                    const port = parseInt(portRaw)
                    if (!port) {
                        getRandomLocalEnginePort((p) => {
                            onFetchLocalAndLatsVersion()
                            setLocalPort(p)
                        })
                    } else {
                        onFetchLocalAndLatsVersion()
                        setLocalPort(port)
                    }
                })
                .catch(() => {
                    getRandomLocalEnginePort((p) => {
                        onFetchLocalAndLatsVersion()
                        setLocalPort(p)
                    })
                })
        })

        const onFetchLocalAndLatsVersion = useMemoizedFn(() => {
            setTimeout(() => {
                handleFetchYakitAndYaklangLatestVersion()
                handleFetchYakitAndYaklangLocalVersion()
            }, 500)
        })

        /** 是否阻止更新弹窗出现 */
        const preventUpdateHint = useRef<boolean>(false)
        /** 检查版本后，延迟2000毫秒执行连接(如遇更新，则清除定时器) */
        const linkTimeRef = useRef<any>(null)
        const clearLinkTime = useMemoizedFn(() => {
            if (linkTimeRef.current) {
                clearTimeout(linkTimeRef.current)
                linkTimeRef.current = null
            }
        })

        const handleFetchYakitAndYaklangLocalVersion = useMemoizedFn(async () => {
            console.log("get-version")
            try {
                let localYakit = (await ipcRenderer.invoke("fetch-yakit-version")) || ""
                setCurrentYakit(localYakit)
            } catch (error) {}

            try {
                setLog(["获取引擎版本号..."])
                let localYaklang = (await ipcRenderer.invoke("get-current-yak")) || ""
                setLog(["获取引擎版本号...", `引擎版本号——${localYaklang}`, "准备开始本地连接中"])
                setCurrentYaklang(localYaklang)
                linkTimeRef.current = setTimeout(() => {
                    // 这里的2秒是判断是否有更新弹窗出现
                    handleLinkLocalEnging()
                }, 2000)
            } catch (error) {
                setLog(["获取引擎版本号...", `错误: ${error}`])
                setYakitStatus("checkError")
            }
        })

        const handleFetchYakitAndYaklangLatestVersion = useMemoizedFn(() => {
            if (!isCommunityEdition()) return
            getLocalValue(LocalGVS.NoAutobootLatestVersionCheck).then((val: boolean) => {
                ipcRenderer
                    .invoke("fetch-latest-yakit-version")
                    .then((data: string) => {
                        if (!val) {
                            if (preventUpdateHint.current) return
                            setLatestYakit(data || "")
                        }
                    })
                    .catch((err) => {})
                ipcRenderer
                    .invoke("fetch-latest-yaklang-version")
                    .then((data: string) => {
                        if (!val) {
                            if (preventUpdateHint.current) return
                            setLatestYaklang(data || "")
                        }
                    })
                    .catch((err) => {})
            })
        })

        // 初始化后的本地连接-前置项检查
        const initLink = useMemoizedFn(() => {
            preventUpdateHint.current = isCommunityEdition() ? false : true
            handleCheckDataBase()
        })
        // 检查版本后直接连接
        const toLink = useMemoizedFn(() => {
            preventUpdateHint.current = true
            handleFetchYakitAndYaklangLocalVersion()
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
            if (!preventUpdateHint.current) return
            // 开始连接本地引擎
            onLinkEngine(localPort)
            // 一旦启动本地连接了，后续就不用再检查更新情况了
            setLatestYakit("")
            setLatestYaklang("")
        })

        /** ---------- 软件自启的更新检测弹框 Start ---------- */
        const isShowUpdate = useMemo(() => {
            if (!isCommunityEdition()) return false

            if (!!currentYakit && !!latestYakit && `v${currentYakit}` !== latestYakit) {
                clearLinkTime()
                return true
            }
            if (!!currentYaklang && !!latestYaklang && currentYaklang !== latestYaklang) {
                clearLinkTime()
                return true
            }

            return false
        }, [currentYakit, latestYakit, currentYaklang, latestYaklang])

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
                        handleLinkEnginePort()
                    }, 300)
                })
        })
        /** ---------- 数据库权限逻辑 End ---------- */

        return (
            <>
                {isCommunityEdition() && (
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
            </>
        )
    })
)
