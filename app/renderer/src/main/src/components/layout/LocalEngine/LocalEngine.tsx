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
                handleFetchYakitAndYaklangLocalVersion(handleFetchYakitAndYaklangLatestVersion)
            }, 500)
        })

        /** 是否阻止更新弹窗出现 */
        const preventUpdateHint = useRef<boolean>(false)
        /** 是否已弹出更新框 */
        const isShowedUpdateHint = useRef<boolean>(false)

        const handleFetchYakitAndYaklangLocalVersion = useMemoizedFn(async (callback?: () => any) => {
            try {
                let localYakit = (await ipcRenderer.invoke("fetch-yakit-version")) || ""
                setCurrentYakit(localYakit)
            } catch (error) {}

            try {
                setLog(["获取引擎版本号..."])
                let localYaklang = (await ipcRenderer.invoke("get-current-yak")) || ""
                setLog(["获取引擎版本号...", `引擎版本号——${localYaklang}`, "准备开始本地连接中"])
                setCurrentYaklang(localYaklang)
                setTimeout(() => {
                    if (isShowedUpdateHint.current) return
                    preventUpdateHint.current = true
                    // 这里的2秒是判断是否有更新弹窗出现
                    handleLinkLocalEnging()
                }, 2000)
            } catch (error) {
                setLog(["获取引擎版本号...", `错误: ${error}`])
                setYakitStatus("checkError")
            }

            if (callback) callback()
        })

        const handleFetchYakitAndYaklangLatestVersion = useMemoizedFn(() => {
            if (!isCommunityEdition()) {
                // 非CE版本不检查更新
                preventUpdateHint.current = true
                return
            }
            getLocalValue(LocalGVS.NoAutobootLatestVersionCheck).then((val: boolean) => {
                if (val) preventUpdateHint.current = true

                if (!val) {
                    ipcRenderer
                        .invoke("fetch-latest-yakit-version")
                        .then((data: string) => {
                            if (preventUpdateHint.current) return
                            setLatestYakit(data || "")
                        })
                        .catch((err) => {})

                    ipcRenderer
                        .invoke("fetch-latest-yaklang-version")
                        .then((data: string) => {
                            if (preventUpdateHint.current) return
                            setLatestYaklang(data.startsWith("v") ? data.slice(1) : data)
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
            preventUpdateHint.current = isCommunityEdition() ? false : true
            handleCheckDataBase()
        })
        // 检查版本后直接连接
        const toLink = useMemoizedFn(() => {
            isShowedUpdateHint.current = false
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
            // 开始连接本地引擎
            onLinkEngine(localPort)
            // 一旦启动本地连接了，后续就不用再检查更新情况了
            setLatestYakit("")
            setLatestYaklang("")
            setMoreYaklangVersionList([])
        })

        /** ---------- 软件自启的更新检测弹框 Start ---------- */
        const isShowUpdate = useMemo(() => {
            if (!isCommunityEdition()) return false

            if (!!currentYakit && !!latestYakit && `v${currentYakit}` !== latestYakit) {
                isShowedUpdateHint.current = true
                return true
            }

            const lowerYaklangLastVersion = moreYaklangVersionList.indexOf(currentYaklang) === -1 || moreYaklangVersionList.indexOf(currentYaklang) > moreYaklangVersionList.indexOf(latestYaklang)
            if (
                !!currentYaklang &&
                !!latestYaklang &&
                moreYaklangVersionList.length &&
                lowerYaklangLastVersion
            ) {
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
