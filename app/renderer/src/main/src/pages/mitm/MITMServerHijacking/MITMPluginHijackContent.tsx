import {ArrowsExpandIcon, ArrowsRetractIcon} from "@/assets/newIcon"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {HotPatchTemplate} from "@/pages/invoker/data/MITMPluginTamplate"
import {YakScript, YakScriptHooks} from "@/pages/invoker/schema"
import {YakExecutorParam} from "@/pages/invoker/YakExecutorParams"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {info, yakitFailed, yakitNotify} from "@/utils/notification"
import {useCreation, useDebounceEffect, useInViewport, useMap, useMemoizedFn} from "ahooks"
import React, {ReactElement, useEffect, useRef, useState, useContext} from "react"
import {CONST_DEFAULT_ENABLE_INITIAL_PLUGIN, MitmStatus} from "../MITMPage"
import {MITMYakScriptLoader} from "../MITMYakScriptLoader"
import {
    MITMPluginLocalList,
    PluginGroup,
    PluginSearch,
    YakFilterRemoteObj,
    YakModuleListHeard
} from "./MITMPluginLocalList"
import {enableMITMPluginMode} from "./MITMServerHijacking"
import styles from "./MITMServerHijacking.module.scss"
import classNames from "classnames"
import {RemoteGV} from "@/yakitGV"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import emiter from "@/utils/eventBus/eventBus"
import {useCampare} from "@/hook/useCompare/useCompare"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {AddHotCodeTemplate, HotCodeTemplate, HotPatchTempItem} from "@/pages/fuzzer/HTTPFuzzerHotPatch"
import {cloneDeep} from "lodash"
import {MITMHotPatchTempDefault} from "@/defaultConstants/mitm"
import {SolidPlayIcon, SolidStopIcon} from "@/assets/icon/solid"
import {OutlineFileUpIcon, OutlineRefreshIcon, OutlineStoreIcon, OutlineTerminalIcon} from "@/assets/icon/outline"
import MITMContext, {MITMVersion} from "../Context/MITMContext"
import {
    grpcClientMITMHooks,
    grpcClientMITMLoading,
    grpcMITMExecScriptContent,
    grpcMITMGetCurrentHook,
    grpcMITMRemoveHook,
    MITMExecScriptContentRequest,
    MITMRemoveHookRequest
} from "../MITMHacker/utils"
import {Tooltip} from "antd"
import {openConsoleNewWindow} from "@/utils/openWebsite"
import usePluginTrace from "./PluginTrace/usePluginTrace"
import {PluginTraceRefProps} from "./PluginTrace/type"
import {pluginTraceRefFunDef} from "./PluginTrace/PluginTrace"
import {PluginTunHijack, PluginTunHijackDef} from "./PluginTunHijack/PluginTunHijack"
import {PluginTunHijackRefProps} from "./PluginTunHijack/PluginTunHijackType"
import usePluginTunHijack, { tunSessionStateDefault } from "./PluginTunHijack/usePluginTunHijack"
import {useStore} from "@/store/mitmState"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitRoute} from "@/enums/yakitRoute"
import {YakitTabsProps} from "@/components/yakitSideTab/YakitSideTabType"
import {YakitSideTab} from "@/components/yakitSideTab/YakitSideTab"
const PluginTrace = React.lazy(() => import("./PluginTrace/PluginTrace"))

const {ipcRenderer} = window.require("electron")

interface MITMPluginHijackContentProps {
    isHasParams: boolean
    onIsHasParams: (isHasParams: boolean) => void
    noParamsCheckList: string[]
    hasParamsCheckList: string[]
    setHasParamsCheckList: (s: string[]) => void
    setNoParamsCheckList: (s: string[]) => void
    onSubmitYakScriptId: (id: number, params: YakExecutorParam[]) => any
    status: MitmStatus
    isFullScreen: boolean
    setIsFullScreen: (b: boolean) => void
    onSelectAll: (e: boolean) => void
    setTotal: (b: number) => void
    total: number
    isSelectAll: boolean
    setIsSelectAll: (e: boolean) => void
    groupNames: string[]
    setGroupNames: (s: string[]) => void
    tags: string[]
    searchKeyword: string
    fieldKeywords: string
    setTags: (s: string[]) => void
    setSearchKeyword: (s: string) => void
    setFieldKeywords: (s: string) => void
    openTabsFlag: boolean
    onSetOpenTabsFlag: (s: boolean) => void
    onSetLoadedPluginLen: (s: number) => void
    showPluginHistoryList: string[]
    setShowPluginHistoryList: (l: string[]) => void
    tempShowPluginHistory?: string
    setTempShowPluginHistory?: (t: string) => void
}
const HotLoadDefaultData: YakScript = {
    Id: 0,
    Content: HotPatchTemplate,
    Type: "",
    Params: [],
    CreatedAt: 0,
    ScriptName: "",
    Help: "",
    Level: "",
    Author: "",
    Tags: "",
    IsHistory: false,
    OnlineId: 0,
    OnlineScriptName: "",
    OnlineContributors: "",
    UserId: 0,
    UUID: ""
}
const MITMHijackTab: YakitTabsProps[] = [
    {
        label: "全部",
        value: "all"
    },
    {
        label: "已启用",
        value: "loaded"
    },
    {
        label: "热加载",
        value: "hot-patch"
    },
    {
        value: "trace",
        label: "插件追踪"
    },
    {
        value: "tun-hijack",
        label: "Tun劫持"
    }
]
export const MITMPluginHijackContent: React.FC<MITMPluginHijackContentProps> = React.memo((props) => {
    const {
        isHasParams,
        onIsHasParams,
        onSubmitYakScriptId,
        status,
        noParamsCheckList,
        hasParamsCheckList,
        setHasParamsCheckList,
        setNoParamsCheckList,
        isFullScreen,
        setIsFullScreen,
        onSelectAll,
        total,
        setTotal,
        isSelectAll,
        setIsSelectAll,
        groupNames,
        setGroupNames,
        tags,
        searchKeyword,
        fieldKeywords,
        setTags,
        setSearchKeyword,
        setFieldKeywords,
        openTabsFlag,
        onSetOpenTabsFlag,
        onSetLoadedPluginLen,
        showPluginHistoryList,
        setShowPluginHistoryList,
        tempShowPluginHistory = "",
        setTempShowPluginHistory
    } = props

    const mitmContent = useContext(MITMContext)

    const mitmVersion = useCreation(() => {
        return mitmContent.mitmStore.version
    }, [mitmContent.mitmStore.version])

    // #region 左侧tab
    const hijackTabsRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(hijackTabsRef)
    const [curTabKey, setCurTabKey] = useState<string>("all")
    useEffect(() => {
        if (inViewport) {
            getRemoteValue(RemoteGV.NewMitmHijackedLeftTabs).then((setting: string) => {
                if (setting) {
                    try {
                        const tabs = JSON.parse(setting)
                        onSetOpenTabsFlag(tabs.contShow)
                        onActiveKey(tabs.curTabKey)
                    } catch (error) {}
                } else {
                    onSetOpenTabsFlag(true)
                }
            })
        }
    }, [inViewport])
    const onActiveKey = useMemoizedFn((key) => {
        setCurTabKey(key)
    })
    useEffect(() => {
        setIsFullScreen(false)
    }, [curTabKey])
    useDebounceEffect(
        () => {
            if (inViewport) {
                setRemoteValue(
                    RemoteGV.NewMitmHijackedLeftTabs,
                    JSON.stringify({contShow: openTabsFlag, curTabKey: curTabKey})
                )
            }
        },
        [openTabsFlag, curTabKey, inViewport],
        {wait: 300}
    )
    // #endregion

    const [hookScriptNameSearch, setHookScriptNameSearch] = useState<string>("")
    const [triggerSearch, setTriggerSearch] = useState<boolean>(false)
    const [isHooksSearch, setIsHooksSearch] = useState<boolean>(false)
    /**
     * 选中的插件组
     */
    const [selectGroup, setSelectGroup] = useState<YakFilterRemoteObj[]>([])

    const [script, setScript] = useState<YakScript>(HotLoadDefaultData)

    const [hooks, handlers] = useMap<string, boolean>(new Map<string, boolean>()) // 当前hooks的插件名
    const [hooksID, handlersID] = useMap<string, boolean>(new Map<string, boolean>()) // 当前hooks的插件id
    const [loading, setLoading] = useState(false)

    // 是否允许获取默认勾选值
    const isDefaultCheck = useRef<boolean>(false)

    const compareHasParamsCheckList = useCampare(hasParamsCheckList)
    useEffect(() => {
        if (hasParamsCheckList.includes(tempShowPluginHistory)) {
            setShowPluginHistoryList([tempShowPluginHistory])
            emiter.emit(
                "onHasParamsJumpHistory",
                JSON.stringify({version: mitmVersion, mitmHasParamsNames: [tempShowPluginHistory].join(",")})
            )
        }
    }, [compareHasParamsCheckList])

    // 初始化加载 hooks，设置定时更新 hooks 状态
    useEffect(() => {
        updateHooks()
        const id = setInterval(() => {
            updateHooks()
        }, 1000)
        return () => {
            clearInterval(id)
        }
    }, [])

    useEffect(() => {
        // 加载状态(从服务端加载)
        grpcClientMITMLoading(mitmVersion).on((flag: boolean) => {
            setLoading(flag)
        })
        const CHECK_CACHE_LIST_DATA = "CHECK_CACHE_LIST_DATA"
        getRemoteValue(CHECK_CACHE_LIST_DATA)
            .then((data: string) => {
                getRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN).then((is) => {
                    if (!!data && !!is) {
                        const cacheData: string[] = JSON.parse(data)
                        if (cacheData.length) {
                            multipleMitm(cacheData)
                        }
                    }
                })
            })
            .finally(() => {
                isDefaultCheck.current = true
            })

        let cacheTmp: string[] = []
        let noParamsCheckArr: string[] = []
        let hasParamsCheckArr: string[] = []
        // 用于 MITM 的 查看当前 Hooks
        grpcClientMITMHooks(mitmVersion).on((data: YakScriptHooks[]) => {
            if (isDefaultCheck.current) {
                const tmp = new Map<string, boolean>()
                const tmpID = new Map<string, boolean>()
                cacheTmp = []
                data.forEach((i) => {
                    i.Hooks.forEach((hook) => {
                        // 存的id其实没有用到
                        // console.log(hook)
                        if (hook.YakScriptName && hook.YakScriptName !== "@HotPatchCode") {
                            tmp.set(hook.YakScriptName, true)
                            tmpID.set(hook.YakScriptId + "", true)
                            cacheTmp = [...cacheTmp, hook.YakScriptName]
                        }
                    })
                })
                handlers.setAll(tmp)
                handlersID.setAll(tmpID)

                const allCheckList = [...new Set(cacheTmp)]
                setRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN, allCheckList.length ? "true" : "")
                onSetLoadedPluginLen(allCheckList.length)
                // 返回的hooks里面是真正加载成功的插件，既有带参插件又有不带参插件，通过本地缓存中带参数的插件参数值是否存在，存在则表示有参数的勾选插件，否则表示无参数的勾选插件
                let promises_1: (() => Promise<any>)[] = []
                allCheckList.forEach((scriptName) => {
                    promises_1.push(() => getRemoteValue("mitm_has_params_" + scriptName))
                })
                Promise.allSettled(promises_1.map((promiseFunc) => promiseFunc())).then((res) => {
                    noParamsCheckArr = []
                    hasParamsCheckArr = []
                    res.forEach((item, index) => {
                        if (item.status === "fulfilled") {
                            if (!item.value) {
                                noParamsCheckArr.push(allCheckList[index])
                            } else {
                                hasParamsCheckArr.push(allCheckList[index])
                            }
                        }
                    })
                    setHasParamsCheckList([...hasParamsCheckArr])
                    setNoParamsCheckList([...noParamsCheckArr])
                })
            }
        })

        updateHooks()
        return () => {
            // 组件销毁时进行本地缓存 用于后续页面进入默认选项（只缓存普通插件，不缓存带参插件）
            setRemoteValue(CHECK_CACHE_LIST_DATA, JSON.stringify(noParamsCheckArr))
            grpcClientMITMHooks(mitmVersion).remove()
            grpcClientMITMLoading(mitmVersion).remove()
        }
    }, [])
    const hooksItem: YakScript[] = useCreation(() => {
        let tmpItem: YakScript[] = []
        hooks.forEach((value, key) => {
            if (!key.includes(hookScriptNameSearch)) return
            if (value && key) {
                tmpItem.push({
                    Id: 0,
                    ScriptName: key,
                    Content: "",
                    Type: "",
                    Params: [],
                    CreatedAt: 0,
                    Help: "",
                    Level: "",
                    Author: "",
                    Tags: "",
                    IsHistory: false,
                    OnlineId: 0,
                    OnlineScriptName: "",
                    OnlineContributors: "",
                    UserId: 0,
                    UUID: ""
                })
            }
        })
        return tmpItem.sort((a, b) => a.ScriptName.localeCompare(b.ScriptName))
    }, [hooks, isHooksSearch])

    /**
     * @description 多选插件
     * @param checkList
     */
    const multipleMitm = (checkList: string[]) => {
        enableMITMPluginMode({
            initPluginNames: checkList,
            version: mitmVersion
        }).then(() => {
            info("启动 MITM 插件成功")
        })
    }
    const updateHooks = useMemoizedFn(() => {
        grpcMITMGetCurrentHook(mitmVersion).catch((e) => {
            yakitFailed(`更新 MITM 插件状态失败: ${e}`)
        })
    })

    const onSearch = useMemoizedFn(() => {
        setTriggerSearch(!triggerSearch)
    })
    /**
     * @description 发送到【热加载】中调试代码
     */
    const onSendToPatch = useMemoizedFn((s: YakScript) => {
        setScript(s)
        onSetOpenTabsFlag(true)
        onActiveKey("hot-patch")
    })
    /**@description 保存热加载代码到本地插件 */
    const onSaveHotCode = useMemoizedFn(() => {
        ipcRenderer
            .invoke("SaveYakScript", script)
            .then((data: YakScript) => {
                yakitNotify("success", `保存本地插件成功`)
            })
            .catch((e: any) => {
                yakitNotify("error", `保存插件失败:` + e)
            })
    })

    useEffect(() => {
        if (curTabKey === "hot-patch") {
            if (!script.Id) {
                getRemoteValue(RemoteGV.MITMHotPatchCodeSave).then((setting: string) => {
                    if (setting) {
                        setScript({...script, Content: setting})
                    } else {
                        setScript({...script, Content: HotPatchTemplate})
                    }
                })
            }
        }
    }, [curTabKey])

    const [hotPatchTempLocal, setHotPatchTempLocal] = useState<HotPatchTempItem[]>(cloneDeep(MITMHotPatchTempDefault))
    const [addHotCodeTemplateVisible, setAddHotCodeTemplateVisible] = useState<boolean>(false)
    const [hotStatus, setHotStatus] = useState<"success" | "failed" | "end">("end")
    const tempNameRef = useRef<string>("")
    const onUpdateTemplate = useMemoizedFn(() => {
        ipcRenderer
            .invoke("UpdateHotPatchTemplate", {
                Condition: {
                    Type: "mitm",
                    Name: [tempNameRef.current]
                },
                Data: {
                    Type: "mitm",
                    Content: script.Content,
                    Name: tempNameRef.current
                }
            })
            .then((res) => {
                yakitNotify("success", "更新模板 " + tempNameRef.current + " 成功")
            })
            .catch((error) => {
                yakitNotify("error", "更新模板 " + tempNameRef.current + " 失败：" + error)
            })
    })

    const onRenderHeardExtra = useMemoizedFn(() => {
        switch (curTabKey) {
            case "hot-patch":
                return (
                    <div className={styles["hot-patch-header-wrapper"]}>
                        <HotCodeTemplate
                            type='mitm'
                            hotPatchTempLocal={hotPatchTempLocal}
                            onSetHotPatchTempLocal={setHotPatchTempLocal}
                            onClickHotCode={(temp, tempName) => {
                                tempNameRef.current = tempName || ""
                                setScript({...HotLoadDefaultData, Content: temp})
                            }}
                            onDeleteLocalTempOk={() => {
                                tempNameRef.current = ""
                            }}
                        ></HotCodeTemplate>
                        <div className={styles["hot-patch-heard-extra"]}>
                            <Tooltip placement='bottom' title='引擎Console'>
                                <YakitButton
                                    type='text'
                                    onClick={openConsoleNewWindow}
                                    icon={<OutlineTerminalIcon className={styles["engineConsole-icon-style"]} />}
                                    style={{padding: 0}}
                                ></YakitButton>
                            </Tooltip>
                            <YakitPopconfirm
                                title={"确认重置热加载代码？"}
                                onConfirm={() => {
                                    tempNameRef.current = ""
                                    setScript(HotLoadDefaultData)
                                }}
                                placement='top'
                            >
                                <YakitButton type='text'>
                                    <OutlineRefreshIcon />
                                </YakitButton>
                            </YakitPopconfirm>
                            <Tooltip title='更新当前模板并保存' placement='top'>
                                <YakitButton
                                    disabled={!script.Content || !tempNameRef.current}
                                    type='text'
                                    onClick={onUpdateTemplate}
                                    icon={<OutlineFileUpIcon />}
                                ></YakitButton>
                            </Tooltip>
                            <Tooltip placement='top' title='另存为新模板'>
                                <YakitButton
                                    type='text'
                                    icon={<OutlineStoreIcon />}
                                    onClick={() => setAddHotCodeTemplateVisible(true)}
                                ></YakitButton>
                            </Tooltip>
                            <AddHotCodeTemplate
                                type='mitm'
                                title='另存为'
                                hotPatchTempLocal={hotPatchTempLocal}
                                hotPatchCode={script.Content}
                                visible={addHotCodeTemplateVisible}
                                onSetAddHotCodeTemplateVisible={setAddHotCodeTemplateVisible}
                                onSaveHotCodeOk={(tempName) => {
                                    tempNameRef.current = tempName || ""
                                }}
                            ></AddHotCodeTemplate>
                            {hotStatus === "success" ? (
                                <YakitButton
                                    type='outline1'
                                    colors='danger'
                                    icon={<SolidStopIcon />}
                                    onClick={() => {
                                        const value: MITMRemoveHookRequest = {
                                            HookName: [],
                                            RemoveHookID: ["@HotPatchCode"],
                                            version: mitmVersion
                                        }
                                        grpcMITMRemoveHook(value).then(() => {
                                            setHotStatus("end")
                                            info("停止成功")
                                        })
                                    }}
                                >
                                    停止
                                </YakitButton>
                            ) : (
                                <YakitButton
                                    type='outline1'
                                    icon={<SolidPlayIcon />}
                                    onClick={() => {
                                        const value: MITMExecScriptContentRequest = {
                                            YakScriptContent: script.Content,
                                            version: mitmVersion
                                        }
                                        grpcMITMExecScriptContent(value)
                                            .then(() => {
                                                setHotStatus("success")
                                                info("加载成功")
                                                if (!script.Id) {
                                                    setRemoteValue(RemoteGV.MITMHotPatchCodeSave, script.Content)
                                                }
                                            })
                                            .catch((e) => {
                                                setHotStatus("failed")
                                                yakitFailed("加载失败：" + e)
                                            })
                                    }}
                                >
                                    热加载
                                </YakitButton>
                            )}
                            {isFullScreen ? (
                                <ArrowsRetractIcon
                                    className={styles["expand-icon"]}
                                    onClick={() => setIsFullScreen(false)}
                                />
                            ) : (
                                <ArrowsExpandIcon
                                    className={styles["expand-icon"]}
                                    onClick={() => {
                                        setIsFullScreen(true)
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )
            case "loaded":
                return (
                    <>
                        <YakitInput.Search
                            placeholder='请输入插件名称搜索'
                            value={hookScriptNameSearch}
                            onChange={(e) => setHookScriptNameSearch(e.target.value)}
                            onSearch={() => setIsHooksSearch(!isHooksSearch)}
                            onPressEnter={() => setIsHooksSearch(!isHooksSearch)}
                            wrapperStyle={{flex: 1}}
                        />
                    </>
                )
            case "trace":
            case "tun-hijack":
                return <></>
            default:
                return (
                    <div style={{width: "100%"}}>
                        <div className={styles["search-plugin-hijack-content"]}>
                            <PluginSearch
                                tag={tags}
                                setTag={setTags}
                                searchKeyword={searchKeyword}
                                setSearchKeyword={setSearchKeyword}
                                fieldKeywords={fieldKeywords}
                                setFieldKeywords={setFieldKeywords}
                                onSearch={onSearch}
                                selectSize='small'
                                inputSize='middle'
                                selectModuleTypeSize='small'
                            />
                        </div>
                    </div>
                )
        }
    })

    const onSetHotPatchCode = useMemoizedFn((value) => {
        setScript({
            ...script,
            Content: value
        })
    })

    const pluginTraceRef = useRef<PluginTraceRefProps>(pluginTraceRefFunDef)
    const [puginTraceData, pluginTraceActions] = usePluginTrace({
        pluginTraceRefFun: () => pluginTraceRef.current,
        onStart: () => {},
        onError: () => {},
        onEnd: () => {}
    })
    const startPluginTrace = useMemoizedFn(() => {
        if (mitmVersion === MITMVersion.V1) {
            yakitNotify("info", "MITM 交互式劫持v1 暂不支持")
            return
        }
        pluginTraceActions.startPluginTrace()
    })

    const {tunSessionState, setTunSessionState} = useStore()
    const PluginTunHijackRef = useRef<PluginTunHijackRefProps>(PluginTunHijackDef)
    const [pluginTunHijackData, pluginTunHijackActions] = usePluginTunHijack({
        PluginName: "Tun劫持服务",
        onEnd: () => {
            onCloseTunHijackFun()
        }
    })
    const isQuitRef = useRef<boolean>(false)
    const handleDeleteRoute = useMemoizedFn((ipList?: string[]) => {
        let ExecParams = [
            {Key: "tunName", Value: tunSessionState.deviceName || ""},
            {Key: "clear", Value: true}
        ]
        if (ipList && ipList.length !== 0) {
            ExecParams = [{Key: "ipList", Value: ipList.join(",")}]
        }
        pluginTunHijackDelActions.startPluginTunHijack({
            ExecParams: ExecParams as YakExecutorParam[]
        })
    })
    const [pluginTunHijackDel, pluginTunHijackDelActions] = usePluginTunHijack({
        PluginName: "路由表删除",
        onEnd: () => {
            if (isQuitRef.current) {
                // 先行清除后再关闭Tun劫持
                pluginTunHijackActions.cancelPluginTunHijackById()
            } else {
                PluginTunHijackRef.current.updatePluginTunHijack()
            }
        }
    })

    // 关闭来源
    const formPageRef = useRef<"mitm" | "page">()
    const onCloseTunHijackConfirmModalFun = useMemoizedFn((fromPage: "mitm" | "page") => {
        formPageRef.current = fromPage
        onQuitTunHijackFun()
    })

    useEffect(() => {
        emiter.on("onCloseTunHijackConfirmModal", onCloseTunHijackConfirmModalFun)
        return () => {
            emiter.off("onCloseTunHijackConfirmModal", onCloseTunHijackConfirmModalFun)
        }
    }, [])

    // Tun劫持关闭逻辑
    const onCloseTunHijackFun = useMemoizedFn(()=>{
        isQuitRef.current = false
        setTunSessionState(tunSessionStateDefault)
        onClosePage()
    })

    // 页面关闭逻辑
    const onClosePage = useMemoizedFn(() => {
        // 如有其余操作的关闭来源 需通知其已执行Tun劫持关闭
        // 点击页面关闭时直接关闭
        if (formPageRef.current === "mitm") {
            emiter.emit("onCloseTunHijackCallback", formPageRef.current)
        } else if (formPageRef.current === "page") {
            emiter.emit("closePage", JSON.stringify({route: YakitRoute.MITMHacker}))
        }
        formPageRef.current = undefined
    })

    // 退出Tun劫持逻辑
    const onQuitFun = useMemoizedFn(() => {
        info("正在关闭Tun劫持服务，请稍后...")
        isQuitRef.current = true
        handleDeleteRoute()
        // 防止关闭流异常， 5秒后强制关闭
        PluginTunHijackRef.current.closeTunHijackError()
    })

    const [quitVisible, setQuitVisible] = useState<boolean>(false)
    const [quitNoPrompt, setQuitNoPrompt] = useState<boolean>(false)
    const TunHijackQuitHint = "TunHijackQuitHint"

    const onQuitTunHijackFun = useMemoizedFn(() => {
        if (!quitNoPrompt) {
            setQuitVisible(true)
        } else {
            onQuitFun()
        }
    })

    const handleQuitOK = useMemoizedFn(() => {
        setRemoteValue(TunHijackQuitHint, quitNoPrompt ? "true" : "false")
        setQuitVisible(false)
        onQuitFun()
    })

    const handleQuitCancel = useMemoizedFn(() => {
        isQuitRef.current = false
        formPageRef.current = undefined
        setQuitVisible(false)
    })

    useEffect(() => {
        getRemoteValue(TunHijackQuitHint)
            .then((res) => {
                const replace = res === "true"
                setQuitNoPrompt(replace)
            })
            .catch(() => {})
    }, [])

    const onRenderContent = useMemoizedFn(() => {
        switch (curTabKey) {
            case "hot-patch":
                return (
                    <div className={styles["hot-patch-code"]}>
                        {/* 用户热加载代码 */}
                        {script.Id ? (
                            <div className={styles["hot-patch-heard"]}>
                                <span>插件名称：{script.ScriptName}</span>
                                <YakitButton type='primary' onClick={() => onSaveHotCode()}>
                                    保存源码
                                </YakitButton>
                            </div>
                        ) : (
                            <></>
                        )}
                        <div className={styles["hot-patch-code-editor"]}>
                            <YakitEditor
                                type={"mitm"}
                                value={script.Content}
                                setValue={onSetHotPatchCode}
                                noMiniMap={true}
                                noWordWrap={true}
                            />
                        </div>
                    </div>
                )
            case "loaded":
                // 已启用
                return (
                    <div className={styles["plugin-loaded-list"]}>
                        <div className={styles["plugin-loaded-list-heard"]}>
                            <div className={styles["plugin-loaded-list-heard-total"]}>
                                Total<span>&nbsp;{hooksItem.length}</span>
                            </div>
                            <div
                                className={styles["plugin-loaded-list-heard-empty"]}
                                onClick={() => onSelectAll(false)}
                            >
                                清&nbsp;空
                            </div>
                        </div>
                        <div className={styles["plugin-loaded-hooks-list"]}>
                            <RollingLoadList<YakScript>
                                data={hooksItem}
                                page={1}
                                hasMore={false}
                                loadMoreData={() => {}}
                                loading={false}
                                rowKey='ScriptName'
                                defItemHeight={44}
                                renderRow={(data: YakScript, index: number) => (
                                    <MITMYakScriptLoader
                                        isHasParams={isHasParams}
                                        status={status}
                                        key={data.ScriptName}
                                        script={data}
                                        // 劫持启动后
                                        hooks={hooks}
                                        hooksID={hooksID}
                                        onSendToPatch={onSendToPatch}
                                        onSubmitYakScriptId={props.onSubmitYakScriptId}
                                        onRemoveHook={(name: string, id: string) => {
                                            if (hooks.get(name) || hooksID.get(id)) {
                                                setIsSelectAll(false)
                                            }
                                        }}
                                        showEditor={false}
                                        hasParamsCheckList={hasParamsCheckList}
                                        showPluginHistoryList={showPluginHistoryList}
                                        setShowPluginHistoryList={setShowPluginHistoryList}
                                        tempShowPluginHistory={tempShowPluginHistory}
                                        setTempShowPluginHistory={setTempShowPluginHistory}
                                        curTabKey={curTabKey}
                                    />
                                )}
                            />
                        </div>
                    </div>
                )
            case "all":
                return (
                    <div className={styles["plugin-hijack-content-list"]}>
                        <PluginGroup
                            selectGroup={selectGroup}
                            setSelectGroup={setSelectGroup}
                            excludeType={["yak", "codec", "lua", "nuclei"]}
                            wrapperClassName={styles["plugin-group"]}
                            pluginListQuery={() => {
                                return {
                                    Tag: tags,
                                    Type: "mitm,port-scan",
                                    Keyword: searchKeyword,
                                    FieldKeywords: fieldKeywords,
                                    Pagination: {
                                        Limit: 20,
                                        Order: "",
                                        Page: 1,
                                        OrderBy: "",
                                        RawOrder: "is_core_plugin desc,online_official desc,updated_at desc"
                                    },
                                    Group: {UnSetGroup: false, Group: groupNames},
                                    IsMITMParamPlugins: isHasParams ? 1 : 2,
                                    IncludedScriptNames: isHasParams
                                        ? hasParamsCheckList
                                        : isSelectAll
                                        ? []
                                        : noParamsCheckList
                                }
                            }}
                            total={total}
                            allChecked={isHasParams ? false : isSelectAll}
                            checkedPlugin={isHasParams ? hasParamsCheckList : isSelectAll ? [] : noParamsCheckList}
                        />
                        <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                            <YakitRadioButtons
                                buttonStyle='solid'
                                options={[
                                    {
                                        value: true,
                                        label: "交互插件"
                                    },
                                    {
                                        value: false,
                                        label: "被动插件"
                                    }
                                ]}
                                value={isHasParams}
                                onChange={(e) => {
                                    onIsHasParams(e.target.value)
                                }}
                            />
                            <YakModuleListHeard
                                onSelectAll={onSelectAll}
                                setIsSelectAll={setIsSelectAll}
                                isSelectAll={isSelectAll}
                                total={total}
                                length={isHasParams ? hasParamsCheckList.length : noParamsCheckList.length}
                                loading={loading}
                                isHasParams={isHasParams}
                            />
                        </div>
                        <YakitSpin spinning={loading}>
                            <MITMPluginLocalList
                                isHasParams={isHasParams}
                                onSubmitYakScriptId={onSubmitYakScriptId}
                                status={status}
                                hasParamsCheckList={hasParamsCheckList}
                                noParamsCheckList={noParamsCheckList}
                                setNoParamsCheckList={(list) => {
                                    setNoParamsCheckList(list)
                                }}
                                tags={tags}
                                setTags={setTags}
                                searchKeyword={searchKeyword}
                                fieldKeywords={fieldKeywords}
                                triggerSearch={triggerSearch}
                                setIsSelectAll={setIsSelectAll}
                                isSelectAll={isSelectAll}
                                selectGroup={selectGroup}
                                setSelectGroup={setSelectGroup}
                                total={total}
                                setTotal={setTotal}
                                hooks={hooks}
                                hooksID={hooksID}
                                onSelectAll={onSelectAll}
                                onSendToPatch={onSendToPatch}
                                groupNames={groupNames}
                                setGroupNames={setGroupNames}
                                showPluginHistoryList={showPluginHistoryList}
                                setShowPluginHistoryList={setShowPluginHistoryList}
                                curTabKey={curTabKey}
                                tempShowPluginHistory={tempShowPluginHistory}
                                setTempShowPluginHistory={setTempShowPluginHistory}
                            />
                        </YakitSpin>
                    </div>
                )
            case "trace":
                return (
                    <PluginTrace
                        ref={pluginTraceRef}
                        isInitTrace={puginTraceData.isInitTrace}
                        startLoading={puginTraceData.startLoading}
                        tracing={puginTraceData.tracing}
                        stopLoading={puginTraceData.stopLoading}
                        startPluginTrace={startPluginTrace}
                        resetPluginTrace={pluginTraceActions.resetPluginTrace}
                        stopPluginTrace={pluginTraceActions.stopPluginTrace}
                        cancelPluginTraceById={pluginTraceActions.cancelPluginTraceById}
                        pluginTraceStats={pluginTraceActions.pluginTraceStats}
                        pluginTraceList={pluginTraceActions.pluginTraceList}
                    />
                )
            default:
                return <></>
        }
    })

    return (
        <div className={styles["mitm-plugin-hijack-content"]} ref={hijackTabsRef}>
            <div className={styles["mitm-hijack-tab-wrap"]}>
                <YakitSideTab
                    yakitTabs={MITMHijackTab}
                    activeKey={curTabKey}
                    onActiveKey={onActiveKey}
                    show={openTabsFlag}
                    setShow={onSetOpenTabsFlag}
                />
                <div
                    className={classNames(styles["mitm-hijack-tab-cont-item"])}
                    style={{
                        overflowY: "hidden"
                    }}
                >
                    <div className={styles["mitm-plugin-hijack-heard"]}>{onRenderHeardExtra()}</div>
                    {onRenderContent()}
                    <PluginTunHijack
                        ref={PluginTunHijackRef}
                        hidden={curTabKey !== "tun-hijack"}
                        pluginTunHijackData={pluginTunHijackData}
                        pluginTunHijackActions={pluginTunHijackActions}
                        pluginTunHijackDel={pluginTunHijackDel}
                        onQuitTunHijackFun={onQuitTunHijackFun}
                        handleDeleteRoute={handleDeleteRoute}
                        onCloseTunHijackFun={onCloseTunHijackFun}
                    />
                </div>
            </div>
            <YakitHint
                visible={quitVisible}
                title='关闭Tun代理会清空路由表并停止全部劫持中进程'
                content={"关闭Tun代理会清空路由表并停止全部劫持中进程，防止影响正常使用"}
                footerExtra={
                    <YakitCheckbox checked={quitNoPrompt} onChange={(e) => setQuitNoPrompt(e.target.checked)}>
                        不再提醒
                    </YakitCheckbox>
                }
                okButtonText='好的'
                onOk={handleQuitOK}
                cancelButtonText='取消'
                onCancel={handleQuitCancel}
            />
        </div>
    )
})
