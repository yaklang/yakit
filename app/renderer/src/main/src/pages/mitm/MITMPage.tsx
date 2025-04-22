import React, {
    Profiler,
    ReactElement,
    forwardRef,
    useContext,
    useEffect,
    useImperativeHandle,
    useRef,
    useState
} from "react"
import {Form, notification} from "antd"
import {failed, info, success, yakitFailed, yakitNotify} from "../../utils/notification"
import {MITMFilterSchema} from "./MITMServerStartForm/MITMFilters"
import {ExecResult, QueryYakScriptRequest, YakScriptHookItem} from "../invoker/schema"
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer"
import {ExtractExecResultMessage} from "../../components/yakitLogSchema"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import style from "./MITMPage.module.scss"
import {useCreation, useDebounceEffect, useGetState, useInViewport, useLatest, useMemoizedFn} from "ahooks"
import {StatusCardProps} from "../yakitStore/viewers/base"
import {enableMITMPluginMode, MITMServerHijacking} from "@/pages/mitm/MITMServerHijacking/MITMServerHijacking"
import {Uint8ArrayToString} from "@/utils/str"
import {MITMContentReplacerRule} from "./MITMRule/MITMRuleType"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {loadNucleiPoCFromLocal, loadYakitPluginCode} from "../yakitStore/YakitStorePage"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"
import {StartExecYakCodeModal, YakScriptParam} from "@/utils/basic"
import MITMHijackedContent, {MITMStatus} from "./MITMServerHijacking/MITMHijackedContent"
import {MITMPluginHijackContent} from "./MITMServerHijacking/MITMPluginHijackContent"
import {
    MITMPluginLocalList,
    PluginGroup,
    PluginSearch,
    YakFilterRemoteObj,
    YakModuleListHeard
} from "./MITMServerHijacking/MITMPluginLocalList"
import {ClientCertificate, MITMServerStartForm} from "./MITMServerStartForm/MITMServerStartForm"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {apiDownloadPluginOther, apiQueryYakScript} from "../plugins/utils"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {MITMConsts} from "./MITMConsts"
import {onSetRemoteValuesBase} from "@/components/yakitUI/utils"
import {CacheDropDownGV, RemoteGV} from "@/yakitGV"
import classNames from "classnames"
import {useStore} from "@/store/mitmState"
import MITMContext from "./Context/MITMContext"
import {
    MITMExecScriptByIdRequest,
    MITMRemoveHookRequest,
    MITMStartCallRequest,
    grpcClientMITMError,
    grpcClientMITMMessage,
    grpcClientMITMNotification,
    grpcClientMITMStartSuccess,
    grpcMITMExecScriptById,
    grpcMITMHaveCurrentStream,
    grpcMITMRecover,
    grpcMITMRemoveHook,
    grpcMITMStartCall,
    grpcMITMStopCall
} from "./MITMHacker/utils"
import {KVPair} from "@/models/kv"
const MITMRule = React.lazy(() => import("./MITMRule/MITMRule"))

const {ipcRenderer} = window.require("electron")

type idleTabKeys = "plugin"
interface IdleTabsItem {
    key: idleTabKeys
    label: ReactElement | string
    contShow: boolean
}
export interface MITMPageProp {}

export interface TraceInfo {
    AvailableDNSServers: string[]
    DurationMs: number
    DNSDurationMs: number
    ConnDurationMs: number
    TotalDurationMs: number
}
export interface MITMResponse extends MITMFilterSchema {
    isHttps: boolean
    request: Uint8Array
    url: string
    RemoteAddr?: string
    id: number

    forResponse?: boolean
    response?: Uint8Array
    responseId?: number

    justContentReplacer?: boolean
    replacers?: MITMContentReplacerRule[]

    isWebsocket?: boolean
    Payload: Uint8Array
    traceInfo: TraceInfo
}

export const CONST_DEFAULT_ENABLE_INITIAL_PLUGIN = "CONST_DEFAULT_ENABLE_INITIAL_PLUGIN"

export type MitmStatus = "idle" | "hijacked" | "hijacking"
export const MITMPage: React.FC<MITMPageProp> = (props) => {
    const {setMitmStatus} = useStore()
    // 整体的劫持状态
    const [status, setStatus, getStatus] = useGetState<MitmStatus>("idle")
    const statusRef = useRef<MitmStatus>(status)
    const [isHasParams, setIsHasParams] = useState<boolean>(false) // mitm插件类型是否带参数
    // 通过启动表单的内容
    const [addr, setAddr] = useState("")
    const [host, setHost] = useState("127.0.0.1")
    const [port, setPort] = useState(8083)
    const [disableCACertPage, setDisableCACertPage] = useState(false)
    const [enableInitialMITMPlugin, setEnableInitialMITMPlugin] = useState(false)
    const [defaultPlugins, setDefaultPlugins] = useState<string[]>([])
    const [tip, setTip] = useState("")

    // yakit log message
    const [logs, setLogs] = useState<ExecResultLog[]>([])
    const latestLogs = useLatest<ExecResultLog[]>(logs)
    const [_, setLatestStatusHash, getLatestStatusHash] = useGetState("")
    const [statusCards, setStatusCards] = useState<StatusCardProps[]>([])
    const [downstreamProxyStr, setDownstreamProxyStr] = useState<string>("")
    const [showPluginHistoryList, setShowPluginHistoryList] = useState<string[]>([])
    const [tempShowPluginHistory, setTempShowPluginHistory] = useState<string>("")

    const mitmContent = useContext(MITMContext)

    const mitmVersion = useCreation(() => {
        return mitmContent.mitmStore.version
    }, [mitmContent.mitmStore.version])
    useEffect(() => {
        statusRef.current = status
        setMitmStatus(status)
    }, [status])

    // 检测当前劫持状态
    useEffect(() => {
        // 用于启动 MITM 开始之后，接受开始成功之后的第一个消息，如果收到，则认为说 MITM 启动成功了

        grpcClientMITMStartSuccess(mitmVersion).on(() => {
            setStatus("hijacking")
        })
        grpcClientMITMNotification(mitmVersion).on((i: Uint8Array) => {
            try {
                info(Uint8ArrayToString(i))
            } catch (e) {}
        })

        return () => {
            grpcMITMStopCall(mitmVersion)
            grpcClientMITMStartSuccess(mitmVersion).remove()
            grpcClientMITMNotification(mitmVersion).remove()
        }
    }, [])
    // 用于接受后端传回的信息
    useEffect(() => {
        // 用于前端恢复状态
        grpcMITMHaveCurrentStream(mitmVersion)
            .then((data) => {
                const {haveStream, host, port} = data
                if (haveStream) {
                    setStatus("hijacking")
                    setHost(host)
                    setPort(port)
                }
            })
            .finally(() => {
                recover()
            })

        // 用于 MITM 的 Message （YakitLog）
        let messages: ExecResultLog[] = []
        const statusMap = new Map<string, StatusCardProps>()
        let lastStatusHash = ""
        grpcClientMITMMessage(mitmVersion).on((data: ExecResult) => {
            let msg = ExtractExecResultMessage(data)
            if (msg !== undefined) {
                const currentLog = msg as ExecResultLog
                if (currentLog.level === "feature-status-card-data") {
                    lastStatusHash = `${currentLog.timestamp}-${currentLog.data}`

                    try {
                        // 解析 Object
                        const obj = JSON.parse(currentLog.data)
                        const {id, data} = obj
                        if (!data) {
                            statusMap.delete(`${id}`)
                        } else {
                            statusMap.set(`${id}`, {Data: data, Id: id, Timestamp: currentLog.timestamp})
                        }
                    } catch (e) {}
                    return
                }
                messages.push(currentLog)
                if (messages.length > 25) {
                    messages.shift()
                }
            }
        })
        grpcClientMITMError(mitmVersion).on((msg) => {
            if (!msg) {
                info("MITM 劫持服务器已关闭")
            } else {
                failed("MITM 劫持服务器异常或被关闭")
                const m = showYakitModal({
                    title: "启动 MITM 服务器 ERROR!",
                    type: "white",
                    cancelButtonProps: {style: {display: "none"}},
                    content: <div style={{padding: "12px 24px"}}>{msg}</div>,
                    onOkText: "OK",
                    onOk: () => {
                        m.destroy()
                    }
                })
            }
            grpcMITMStopCall(mitmVersion)
            setStatus("idle")
        })

        const updateLogs = () => {
            if (statusRef.current === "idle") {
                messages = []
                lastStatusHash = ""
                statusMap.clear()
            }

            try {
                if (JSON.stringify(latestLogs.current) !== JSON.stringify(messages)) {
                    const arr = [...messages]
                    setLogs(arr)
                    return
                }
            } catch (error) {}

            if (getLatestStatusHash() !== lastStatusHash) {
                setLatestStatusHash(lastStatusHash)

                const tmpCurrent: StatusCardProps[] = []
                statusMap.forEach((value, key) => {
                    tmpCurrent.push(value)
                })
                setStatusCards(tmpCurrent.sort((a, b) => a.Id.localeCompare(b.Id)))
            }
        }
        updateLogs()
        let id = setInterval(() => {
            updateLogs()
        }, 1000)

        return () => {
            clearInterval(id)
            grpcClientMITMError(mitmVersion).remove()
            grpcClientMITMMessage(mitmVersion).remove()
        }
    }, [])

    const recover = useMemoizedFn(() => {
        grpcMITMRecover(mitmVersion).then(() => {
            // success("恢复 MITM 会话成功")
        })
    })
    // 通过 gRPC 调用，启动 MITM 劫持
    const startMITMServer = useMemoizedFn(
        (
            targetHost,
            targetPort,
            downstreamProxy,
            enableHttp2,
            ForceDisableKeepAlive,
            certs: ClientCertificate[],
            extra?: ExtraMITMServerProps
        ) => {
            const params: MITMStartCallRequest = {
                host: targetHost,
                port: targetPort,
                downstreamProxy: downstreamProxy,
                enableHttp2: enableHttp2,
                ForceDisableKeepAlive: ForceDisableKeepAlive,
                certificates: certs,
                extra,
                version: mitmVersion
            }
            return grpcMITMStartCall(params, true).catch((e: any) => {
                notification["error"]({message: `启动中间人劫持失败：${e}`})
            })
        }
    )

    // 设置开始服务器处理函数
    const startMITMServerHandler = useMemoizedFn(
        (
            host,
            port,
            downstreamProxy,
            enableInitialPlugin,
            plugins,
            enableHttp2,
            ForceDisableKeepAlive,
            certs: ClientCertificate[],
            extra?: ExtraMITMServerProps
        ) => {
            setAddr(`http://${host}:${port} 或 socks5://${host}:${port}`)
            setHost(host)
            setPort(port)
            setDisableCACertPage(extra?.disableCACertPage || false)
            setDefaultPlugins(plugins)
            setEnableInitialMITMPlugin(enableInitialPlugin)
            startMITMServer(host, port, downstreamProxy, enableHttp2, ForceDisableKeepAlive, certs, extra)
            let tip = ""
            if (downstreamProxy) {
                tip += `下游代理：${downstreamProxy}`
            }
            setDownstreamProxyStr(downstreamProxy || "")
            if (extra) {
                if (extra.onlyEnableGMTLS) {
                    tip += "|仅国密 TLS"
                }
                if (extra.enableProxyAuth) {
                    tip += "|开启代理认证"
                }
            }
            setTip(tip)
        }
    )

    const [visible, setVisible] = useState<boolean>(false)
    const mitmPageRef = useRef<any>()
    const [inViewport] = useInViewport(mitmPageRef)

    const onRenderMITM = useMemoizedFn(() => {
        switch (status) {
            case "idle":
                // status === "idle" 在没有开始的时候，渲染任务表单
                return (
                    <MITMServer
                        visible={visible}
                        onStartMITMServer={startMITMServerHandler}
                        setVisible={setVisible}
                        status={status}
                        setStatus={setStatus}
                        logs={[]}
                        statusCards={[]}
                        downstreamProxyStr={downstreamProxyStr}
                        isHasParams={false}
                        onIsHasParams={setIsHasParams}
                        showPluginHistoryList={showPluginHistoryList}
                        setShowPluginHistoryList={setShowPluginHistoryList}
                    />
                )

            default:
                return (
                    <MITMServerHijacking
                        port={port}
                        addr={addr}
                        host={host}
                        disableCACertPage={disableCACertPage}
                        status={status}
                        setStatus={setStatus}
                        defaultPlugins={defaultPlugins}
                        enableInitialMITMPlugin={enableInitialMITMPlugin}
                        setVisible={setVisible}
                        logs={logs}
                        statusCards={statusCards}
                        tip={tip}
                        onSetTip={setTip}
                        downstreamProxyStr={downstreamProxyStr}
                        setDownstreamProxyStr={setDownstreamProxyStr}
                        isHasParams={isHasParams}
                        onIsHasParams={setIsHasParams}
                        showPluginHistoryList={showPluginHistoryList}
                        setShowPluginHistoryList={setShowPluginHistoryList}
                        tempShowPluginHistory={tempShowPluginHistory}
                        setTempShowPluginHistory={setTempShowPluginHistory}
                    />
                )
        }
    })

    useEffect(() => {
        const onChangeAddrAndEnableInitialPlugin = (values) => {
            try {
                const valObj = JSON.parse(values) || {}
                if (valObj.version !== mitmVersion) return
                setAddr(`http://${valObj.host}:${valObj.port} 或 socks5://${valObj.host}:${valObj.port}`)
                setHost(valObj.host)
                setPort(valObj.port)
                setEnableInitialMITMPlugin(valObj.enableInitialPlugin)
                if (!valObj.enableInitialPlugin) {
                    emiter.emit("onClearMITMHackPlugin", mitmVersion)
                }
                setRemoteValue(MITMConsts.MITMDefaultPort, `${valObj.port}`)
                onSetRemoteValuesBase({
                    cacheHistoryDataKey: CacheDropDownGV.MITMDefaultHostHistoryList,
                    newValue: valObj.host,
                    isCacheDefaultValue: true
                })
                setRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN, valObj.enableInitialPlugin ? "true" : "")
            } catch (error) {}
        }
        emiter.on("onChangeAddrAndEnableInitialPlugin", onChangeAddrAndEnableInitialPlugin)
        return () => {
            emiter.off("onChangeAddrAndEnableInitialPlugin", onChangeAddrAndEnableInitialPlugin)
        }
    }, [])

    return (
        <>
            <div
                className={style["mitm-page"]}
                ref={mitmPageRef}
                style={status === "idle" ? {padding: 0} : {padding: "8px 16px 0px 0px"}}
            >
                {onRenderMITM()}
            </div>
            <MITMRule status={status} visible={visible && !!inViewport} setVisible={setVisible} />
        </>
    )
}

const CHECK_CACHE_LIST_DATA = "CHECK_CACHE_LIST_DATA"
export interface ExtraMITMServerProps {
    /**@name 国密劫持*/
    enableGMTLS?: boolean
    /**@name 随机TLS指纹*/
    RandomJA3?: boolean
    /**@name 代理认证 */
    enableProxyAuth: boolean
    /**@name 仅国密 TLS */
    onlyEnableGMTLS: boolean
    /**@name 国密TLS优先 TLS */
    preferGMTLS: boolean
    proxyPassword: string
    proxyUsername: string
    dnsServers: string[]
    hosts: KVPair[]
    /**@name 过滤WebSocket */
    filterWebsocket: boolean
    /**禁用初始页 */
    disableCACertPage: boolean
    DisableWebsocketCompression: boolean
}

interface MITMServerProps {
    onStartMITMServer?: (
        host: string,
        port: number,
        downstreamProxy: string,
        enableInitialPlugin: boolean,
        defaultPlugins: string[],
        enableHttp2: boolean,
        ForceDisableKeepAlive: boolean,
        clientCertificates: ClientCertificate[],
        extra?: ExtraMITMServerProps
    ) => any
    visible?: boolean
    setVisible: (b: boolean) => void
    status: MitmStatus
    // 开启劫持后
    setStatus: (status: MITMStatus) => any
    logs: ExecResultLog[]
    statusCards: StatusCardProps[]
    downstreamProxyStr: string
    isHasParams: boolean
    onIsHasParams: (isHasParams: boolean) => void
    showPluginHistoryList: string[]
    setShowPluginHistoryList: (l: string[]) => void
    tempShowPluginHistory?: string
    setTempShowPluginHistory?: (t: string) => void
    setFiltersVisible?: (v: boolean) => void
}
export const MITMServer: React.FC<MITMServerProps> = React.memo((props) => {
    const {
        visible,
        setVisible,
        status,
        setStatus,
        logs,
        statusCards,
        downstreamProxyStr,
        isHasParams,
        onIsHasParams = () => {},
        showPluginHistoryList,
        tempShowPluginHistory,
        setShowPluginHistoryList,
        setTempShowPluginHistory,
        setFiltersVisible
    } = props

    const mitmContent = useContext(MITMContext)

    const mitmVersion = useCreation(() => {
        return mitmContent.mitmStore.version
    }, [mitmContent.mitmStore.version])

    const [openTabsFlag, setOpenTabsFlag] = useState<boolean>(false)

    /**
     * @description 插件勾选
     */
    const [hasParamsCheckList, setHasParamsCheckList] = useState<string[]>([])
    const [noParamsCheckList, setNoParamsCheckList] = useState<string[]>([])
    const [enableInitialPlugin, setEnableInitialPlugin] = useState<boolean>(false)
    const [isFullScreenFirstNode, setIsFullScreenFirstNode] = useState<boolean>(false)

    const [triggerSearch, setTriggerSearch] = useState<boolean>(false)
    const [isSelectAll, setIsSelectAll] = useState<boolean>(false)
    const [tags, setTags] = useState<string[]>([])
    const [searchKeyword, setSearchKeyword] = useState<string>("")
    const [fieldKeywords, setFieldKeywords] = useState<string>("")
    const [groupNames, setGroupNames] = useState<string[]>([]) // 存储的插件组里面的插件名称用于搜索

    const [total, setTotal] = useState<number>(0)
    /**
     * 选中的插件组
     */
    const [selectGroup, setSelectGroup] = useState<YakFilterRemoteObj[]>([])

    const [listNames, setListNames] = useState<string[]>([]) // 存储的 带参全部本地插件 或者 不带参本地插件 =》 由tab切换决定

    const [loadedPluginLen, setLoadedPluginLen] = useState<number>(0)
    const isFirst = useRef<boolean>(true)
    useEffect(() => {
        if (status === "idle") {
            getRemoteValue(CHECK_CACHE_LIST_DATA).then((data: string) => {
                getRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN).then((is) => {
                    if (!!data && !!is) {
                        const cacheData: string[] = JSON.parse(data)
                        if (isFirst.current) {
                            setNoParamsCheckList(cacheData)
                            isFirst.current = false
                        }
                        if (cacheData.length) {
                            onIsHasParams(false)
                        } else {
                            onIsHasParams(true)
                        }
                    } else {
                        if (noParamsCheckList.length) {
                            onIsHasParams(false)
                        } else {
                            onIsHasParams(true)
                        }
                    }
                })
            })
        }
    }, [status, noParamsCheckList])

    const onSubmitYakScriptId = useMemoizedFn((id: number, params: YakExecutorParam[]) => {
        info(`加载 MITM 插件[${id}]`)
        const value: MITMExecScriptByIdRequest = {
            id,
            params,
            version: mitmVersion
        }
        grpcMITMExecScriptById(value)
    })
    const onStartMITMServer = useMemoizedFn(
        (
            host,
            port,
            downstreamProxy,
            enableInitialPlugin,
            enableHttp2,
            ForceDisableKeepAlive,
            certs: ClientCertificate[],
            extra?: ExtraMITMServerProps
        ) => {
            if (props.onStartMITMServer) {
                setRemoteValue(CHECK_CACHE_LIST_DATA, JSON.stringify(enableInitialPlugin ? noParamsCheckList : []))
                props.onStartMITMServer(
                    host,
                    port,
                    downstreamProxy,
                    enableInitialPlugin,
                    enableInitialPlugin ? noParamsCheckList : [],
                    enableHttp2,
                    ForceDisableKeepAlive,
                    certs,
                    extra
                )
            }
        }
    )
    /**
     * @description 插件全选 启动  批量执行最多200条
     */
    const onSelectAll = useMemoizedFn((checked: boolean) => {
        switch (status) {
            case "idle":
                onSelectAllIdle(checked)
                break
            case "hijacked":
            case "hijacking":
                onSelectAllHijacking(checked)
                break
            default:
                break
        }
    })
    /**
     * @description 劫持开启前的全选
     */
    const onSelectAllIdle = useMemoizedFn((checked: boolean) => {
        if (checked) {
            setNoParamsCheckList(listNames)
        } else {
            setNoParamsCheckList([])
        }
        setIsSelectAll(checked)
        setEnableInitialPlugin(checked)
    })
    /**
     * @description 劫持开启后的全选和清空 启动插件
     */
    const onSelectAllHijacking = useMemoizedFn((checked: boolean) => {
        if (checked) {
            const value: MITMRemoveHookRequest = {
                HookName: [],
                RemoveHookID: listNames.concat(noParamsCheckList),
                version: mitmVersion
            }
            grpcMITMRemoveHook(value)
                .then(() => {
                    onEnableMITMPluginMode(checked)
                    setIsSelectAll(checked)
                })
                .catch((err) => {
                    yakitFailed("清空失败:" + err)
                })
        } else {
            // 点按钮清空
            const value: MITMRemoveHookRequest = {
                HookName: [],
                RemoveHookID: [...new Set([...listNames, ...hasParamsCheckList, ...noParamsCheckList])],
                version: mitmVersion
            }
            grpcMITMRemoveHook(value)
                .then(() => {
                    setIsSelectAll(checked)
                    emiter.emit("onMitmClearFromPlugin", mitmVersion)
                    setShowPluginHistoryList([])
                    setTempShowPluginHistory && setTempShowPluginHistory("")
                    emiter.emit(
                        "onHasParamsJumpHistory",
                        JSON.stringify({version: mitmVersion, mitmHasParamsNames: ""})
                    )
                })
                .catch((err) => {
                    yakitFailed("清空失败:" + err)
                })
        }
    })

    useEffect(() => {
        const onClearMITMHackPlugin = (version) => {
            if (version === mitmVersion) {
                onSelectAllHijacking(false)
            }
        }
        emiter.on("onClearMITMHackPlugin", onClearMITMHackPlugin)
        return () => {
            emiter.off("onClearMITMHackPlugin", onClearMITMHackPlugin)
        }
    }, [])

    const onEnableMITMPluginMode = useMemoizedFn((checked: boolean) => {
        enableMITMPluginMode({initPluginNames: listNames, version: mitmVersion})
            .then(() => {
                setIsSelectAll(checked)
                info("启动 MITM 插件成功")
            })
            .catch((err) => {
                yakitFailed("启动 MITM 插件失败:" + err)
            })
    })

    const getAllSatisfyScript = useMemoizedFn((limit: number) => {
        const query: QueryYakScriptRequest = {
            Pagination: {
                Limit: limit || 200,
                Page: 1,
                OrderBy: "",
                Order: "",
                RawOrder: "is_core_plugin desc,online_official desc,updated_at desc"
            },
            Keyword: searchKeyword,
            FieldKeywords: fieldKeywords,
            Type: isHasParams ? "mitm" : "mitm,port-scan",
            Tag: tags,
            Group: {UnSetGroup: false, Group: groupNames},
            IsMITMParamPlugins: isHasParams ? 1 : 2
        }
        apiQueryYakScript(query).then((res) => {
            const data = res.Data || []
            setListNames(data.map((i) => i.ScriptName))
        })
    })

    const idleTabsRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(idleTabsRef)
    const [curIdleTabKey, setCurIdleTabKey] = useState<idleTabKeys>("plugin")
    const [idleTabs, setIdleTabs] = useState<Array<IdleTabsItem>>([
        {
            key: "plugin",
            label: <>插件</>,
            contShow: true // 初始为true
        }
    ])
    const handleTabClick = (item: IdleTabsItem) => {
        const contShow = !item.contShow
        idleTabs.forEach((i) => {
            if (i.key === item.key) {
                i.contShow = contShow
            } else {
                i.contShow = false
            }
        })
        setRemoteValue(RemoteGV.MitmIdleLeftTabs, JSON.stringify({contShow: contShow, curTabKey: item.key}))
        setIdleTabs([...idleTabs])
        setOpenTabsFlag(idleTabs.some((item) => item.contShow))
        setCurIdleTabKey(item.key)
    }
    useEffect(() => {
        if (inViewport) {
            getRemoteValue(RemoteGV.MitmIdleLeftTabs).then((setting: string) => {
                if (setting) {
                    try {
                        const tabs = JSON.parse(setting)
                        idleTabs.forEach((i) => {
                            if (i.key === tabs.curTabKey) {
                                i.contShow = tabs.contShow
                            } else {
                                i.contShow = false
                            }
                        })
                        setIdleTabs([...idleTabs])
                        setCurIdleTabKey(tabs.curTabKey)
                    } catch (error) {
                        idleTabs.forEach((i) => {
                            if (i.key === "plugin") {
                                i.contShow = true
                            } else {
                                i.contShow = false
                            }
                        })
                        setIdleTabs([...idleTabs])
                        setCurIdleTabKey("plugin")
                    }
                }
                setOpenTabsFlag(idleTabs.some((item) => item.contShow))
            })
        }
    }, [inViewport])

    const onRenderFirstNode = useMemoizedFn(() => {
        switch (status) {
            case "idle":
                return (
                    <div className={style["mitm-idle-tab-wrap"]} ref={idleTabsRef}>
                        <div className={style["mitm-idle-tab"]}>
                            {idleTabs.map((item) => (
                                <div
                                    className={classNames(style["mitm-idle-tab-item"], {
                                        [style["mitm-idle-tab-item-active"]]: curIdleTabKey === item.key,
                                        [style["mitm-idle-tab-item-unshowCont"]]:
                                            curIdleTabKey === item.key && !item.contShow
                                    })}
                                    key={item.key}
                                    onClick={() => {
                                        handleTabClick(item)
                                    }}
                                >
                                    {item.label}
                                </div>
                            ))}
                        </div>
                        <div
                            className={style["mitm-idle-tab-cont-item"]}
                            style={{
                                overflowY: "hidden"
                            }}
                        >
                            <PluginGroup
                                selectGroup={selectGroup}
                                setSelectGroup={setSelectGroup}
                                excludeType={["yak", "codec", "lua", "nuclei"]}
                                isMITMParamPlugins={2}
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
                                        IncludedScriptNames: isSelectAll ? [] : noParamsCheckList,
                                        IsMITMParamPlugins: 2
                                    }
                                }}
                                total={total}
                                allChecked={isSelectAll}
                                checkedPlugin={isSelectAll ? [] : noParamsCheckList}
                            />
                            <div style={{paddingRight: 9}}>
                                <PluginSearch
                                    tag={tags}
                                    searchKeyword={searchKeyword}
                                    fieldKeywords={fieldKeywords}
                                    setTag={setTags}
                                    setSearchKeyword={setSearchKeyword}
                                    setFieldKeywords={setFieldKeywords}
                                    onSearch={() => {
                                        setTriggerSearch(!triggerSearch)
                                    }}
                                />
                            </div>
                            <div style={{display: "flex", justifyContent: "space-between", paddingRight: 10}}>
                                <YakModuleListHeard
                                    onSelectAll={onSelectAll}
                                    setIsSelectAll={setIsSelectAll}
                                    isSelectAll={isSelectAll}
                                    total={total}
                                    length={noParamsCheckList.length}
                                    isHasParams={false}
                                />
                                <YakitButton
                                    type='text'
                                    colors='danger'
                                    onClick={() => {
                                        if (noParamsCheckList.length > 0) onSelectAll(false)
                                    }}
                                    disabled={noParamsCheckList.length === 0}
                                    className={style["empty-button"]}
                                >
                                    清空
                                </YakitButton>
                            </div>
                            <MITMPluginLocalList
                                isHasParams={false}
                                onSubmitYakScriptId={onSubmitYakScriptId}
                                status={status}
                                hasParamsCheckList={hasParamsCheckList}
                                noParamsCheckList={noParamsCheckList}
                                setNoParamsCheckList={(list) => {
                                    if (list.length === 0) {
                                        setEnableInitialPlugin(false)
                                    } else {
                                        setEnableInitialPlugin(true)
                                    }
                                    setNoParamsCheckList(list)
                                }}
                                tags={tags}
                                setTags={setTags}
                                searchKeyword={searchKeyword}
                                fieldKeywords={fieldKeywords}
                                triggerSearch={triggerSearch}
                                selectGroup={selectGroup}
                                setSelectGroup={setSelectGroup}
                                setIsSelectAll={setIsSelectAll}
                                isSelectAll={isSelectAll}
                                total={total}
                                setTotal={(t) => {
                                    setTotal(t)
                                    getAllSatisfyScript(t)
                                }}
                                hooks={new Map<string, boolean>()}
                                hooksID={new Map<string, boolean>()}
                                onSelectAll={onSelectAll}
                                groupNames={groupNames}
                                setGroupNames={setGroupNames}
                            />
                        </div>
                    </div>
                )
            default:
                return (
                    <MITMPluginHijackContent
                        isHasParams={isHasParams}
                        onIsHasParams={onIsHasParams}
                        setTags={setTags}
                        tags={tags}
                        searchKeyword={searchKeyword}
                        setSearchKeyword={setSearchKeyword}
                        fieldKeywords={fieldKeywords}
                        setFieldKeywords={setFieldKeywords}
                        onSubmitYakScriptId={onSubmitYakScriptId}
                        status={status}
                        hasParamsCheckList={hasParamsCheckList}
                        noParamsCheckList={noParamsCheckList}
                        setHasParamsCheckList={setHasParamsCheckList}
                        setNoParamsCheckList={setNoParamsCheckList}
                        isFullScreen={isFullScreenFirstNode}
                        setIsFullScreen={setIsFullScreenFirstNode}
                        isSelectAll={isSelectAll}
                        onSelectAll={onSelectAll}
                        setIsSelectAll={setIsSelectAll}
                        total={total}
                        setTotal={(t) => {
                            setTotal(t)
                            getAllSatisfyScript(t)
                        }}
                        groupNames={groupNames}
                        setGroupNames={setGroupNames}
                        onSetOpenTabsFlag={setOpenTabsFlag}
                        onSetLoadedPluginLen={setLoadedPluginLen}
                        showPluginHistoryList={showPluginHistoryList}
                        tempShowPluginHistory={tempShowPluginHistory}
                        setShowPluginHistoryList={setShowPluginHistoryList}
                        setTempShowPluginHistory={setTempShowPluginHistory}
                    />
                )
        }
    })
    const onRenderSecondNode = useMemoizedFn(() => {
        switch (status) {
            case "idle":
                return (
                    <MITMServerStartForm
                        status={status}
                        onStartMITMServer={onStartMITMServer}
                        visible={visible || false}
                        setVisible={setVisible}
                        enableInitialPlugin={enableInitialPlugin}
                        setEnableInitialPlugin={(checked) => {
                            if (!checked) {
                                setNoParamsCheckList([])
                                setIsSelectAll(false)
                            }
                            setEnableInitialPlugin(checked)
                        }}
                    />
                )
            default:
                return (
                    <MITMHijackedContent
                        setStatus={setStatus}
                        status={status}
                        logs={logs}
                        statusCards={statusCards}
                        downstreamProxyStr={downstreamProxyStr}
                        loadedPluginLen={loadedPluginLen}
                        onSelectAll={onSelectAll}
                        setShowPluginHistoryList={setShowPluginHistoryList}
                        setTempShowPluginHistory={setTempShowPluginHistory}
                        onSetRuleVisible={setVisible}
                        onSetFilterVisible={(v) => {
                            if (setFiltersVisible) {
                                setFiltersVisible(v)
                            }
                        }}
                    />
                )
        }
    })

    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "25%",
            secondRatio: "50%"
        }

        if (openTabsFlag) {
            p.firstRatio = "25%"
        } else {
            p.firstRatio = "24px"
        }

        if (isFullScreenFirstNode) {
            p.secondRatio = "0%"
            p.firstRatio = "calc(100% + 6px)"
        }
        return p
    }, [isFullScreenFirstNode, openTabsFlag])

    return (
        <YakitResizeBox
            isVer={false}
            freeze={openTabsFlag}
            isRecalculateWH={openTabsFlag}
            firstNode={() => <div className={style["mitm-server-start-pre-first"]}>{onRenderFirstNode()}</div>}
            lineStyle={{display: isFullScreenFirstNode ? "none" : ""}}
            firstMinSize={openTabsFlag ? "400px" : "24px"}
            secondMinSize={720}
            secondNode={() => (
                <div
                    className={style["mitm-server-start-pre-second"]}
                    style={{display: isFullScreenFirstNode ? "none" : ""}}
                >
                    {onRenderSecondNode()}
                </div>
            )}
            secondNodeStyle={{
                padding: isFullScreenFirstNode ? 0 : undefined,
                display: isFullScreenFirstNode ? "none" : ""
            }}
            {...ResizeBoxProps}
        />
    )
})

export type LoadPluginMode = "giturl" | "local" | "local-nuclei" | "uploadId"
export const loadModeInfo = [
    {
        value: "giturl",
        label: "线上 Nuclei",
        width: 680
    },
    {
        value: "local",
        label: "本地插件",
        width: 680
    },
    {
        value: "local-nuclei",
        label: "本地 Nuclei",
        width: 680
    },
    {
        value: "uploadId",
        label: "插件 ID",
        width: 680
    }
]
interface ImportLocalPluginProps {
    visible: boolean
    setVisible: (b: boolean) => void
    loadPluginMode?: LoadPluginMode
    sendPluginLocal?: boolean
}
interface ImportYakScriptStreamRequest {
    Filename: string
    Password?: string
}

export const ImportLocalPlugin: React.FC<ImportLocalPluginProps> = React.memo((props) => {
    const {visible, setVisible, loadPluginMode, sendPluginLocal = false} = props
    const [form] = Form.useForm()
    const [loadMode, setLoadMode] = useState<LoadPluginMode>(loadPluginMode || "giturl")
    const [localNucleiPath, setLocalNucleiPath] = useState<string>("") // localNucleiPath
    const [localPluginPath, setLocalPluginPath] = useState<string>("") // localPluginPath
    const localPluginSuccessRef = useRef<boolean>(true)
    const [startExecYakCodeModalVisible, setStartExecYakCodeModalVisible] = useState<boolean>(false)
    const [startExecYakCodeVerbose, setStartExecYakCodeVerbose] = useState<string>("")
    const [startExecYakCodeParams, setStartExecYakCodeParams] = useState<YakScriptParam>()
    const [importLoading, setImportLoading] = useState<boolean>(false)

    useDebounceEffect(
        () => {
            if (visible) {
                form.resetFields()
                setLocalNucleiPath("")
                setLocalPluginPath("")

                if (loadMode === "local") {
                    ipcRenderer.on("import-yak-script-error", (e, data) => {
                        localPluginSuccessRef.current = false
                        yakitNotify("error", data.message)
                    })

                    ipcRenderer.on("import-yak-script-end", () => {
                        if (localPluginSuccessRef.current) {
                            onCancel()
                            handleImportLocalPluginFinish()
                        } else {
                            localPluginSuccessRef.current = true
                        }
                    })
                    return () => {
                        ipcRenderer.invoke("cancel-ImportYakScriptStream")
                        ipcRenderer.removeAllListeners("import-yak-script-error")
                        ipcRenderer.removeAllListeners("import-yak-script-end")
                    }
                }
            }
        },
        [visible, loadMode],
        {wait: 300}
    )

    useEffect(() => {
        setLoadMode(loadPluginMode || "giturl")
    }, [loadPluginMode])

    // 导入本地插件后执行操作
    const handleImportLocalPluginFinish = () => {
        setVisible(false)
        sendMsgToLocalPlugin()
        yakitNotify("success", "导入本地插件成功")
    }

    // 发送事件到本地
    const sendMsgToLocalPlugin = () => {
        // 页面路由变动，要调整
        if (sendPluginLocal) {
            emiter.emit(
                "openPage",
                JSON.stringify({
                    route: YakitRoute.Plugin_Hub,
                    params: {tabActive: "local", refeshList: true}
                })
            )
        }
    }

    const getRenderByLoadMode = useMemoizedFn((type: string) => {
        switch (type) {
            case "giturl":
                return (
                    <>
                        <Form.Item
                            labelCol={{span: 3}}
                            wrapperCol={{span: 21}}
                            name='nucleiGitUrl'
                            label='插件源'
                            rules={[{required: true, message: "该项为必填项"}]}
                            initialValue='https://github.com/projectdiscovery/nuclei-templates'
                        >
                            <YakitSelect
                                options={[
                                    {
                                        label: "https://github.com/projectdiscovery/nuclei-templates",
                                        value: "https://github.com/projectdiscovery/nuclei-templates"
                                    },
                                    {
                                        label: "https://ghproxy.com/https://github.com/projectdiscovery/nuclei-templates",
                                        value: "https://ghproxy.com/https://github.com/projectdiscovery/nuclei-templates"
                                    }
                                ]}
                            />
                        </Form.Item>
                        <Form.Item
                            labelCol={{span: 3}}
                            wrapperCol={{span: 21}}
                            name='proxy'
                            label='代理'
                            help='通过代理访问中国大陆无法访问的代码仓库：例如http://127.0.0.1:7890'
                        >
                            <YakitInput />
                        </Form.Item>
                    </>
                )
            case "local":
                return (
                    <>
                        <YakitFormDragger
                            key='localPluginPath'
                            formItemProps={{
                                name: "localPluginPath",
                                label: "本地插件路径",
                                labelCol: {span: 5},
                                wrapperCol: {span: 19},
                                rules: [{required: true, message: "请输入本地插件路径"}]
                            }}
                            multiple={false}
                            selectType='file'
                            fileExtensionIsExist={false}
                            onChange={(val) => {
                                setLocalPluginPath(val)
                                form.setFieldsValue({localPluginPath: val})
                            }}
                            value={localPluginPath}
                        />
                        <Form.Item labelCol={{span: 5}} wrapperCol={{span: 19}} name='Password' label='密码'>
                            <YakitInput />
                        </Form.Item>
                    </>
                )
            case "local-nuclei":
                return (
                    <>
                        <YakitFormDragger
                            key='localNucleiPath'
                            formItemProps={{
                                name: "localNucleiPath",
                                label: "Nuclei PoC 本地路径",
                                labelCol: {span: 5},
                                wrapperCol: {span: 19}
                            }}
                            selectType='folder'
                            // showUploadList={false}
                            onChange={(val) => {
                                setLocalNucleiPath(val)
                                form.setFieldsValue({localNucleiPath: val})
                            }}
                            value={localNucleiPath}
                        />
                    </>
                )
            case "uploadId":
                return (
                    <>
                        <Form.Item labelCol={{span: 3}} wrapperCol={{span: 21}} name='localId' label='插件ID'>
                            <YakitInput.TextArea placeholder='请输入插件ID，多个ID用”英文逗号“或”换行“分割...' />
                        </Form.Item>
                    </>
                )
            default:
                break
        }
    })

    const onOk = useMemoizedFn(() => {
        const formValue = form.getFieldsValue()
        if (loadMode === "giturl") {
            const params: YakExecutorParam[] = [
                {Key: "giturl", Value: ""},
                {Key: "nuclei-templates-giturl", Value: formValue.nucleiGitUrl}
            ]
            if (formValue.proxy?.trim() !== "") {
                params.push({Value: formValue.proxy?.trim(), Key: "proxy"})
            }

            setStartExecYakCodeModalVisible(true)
            setStartExecYakCodeVerbose("导入线上Nuclei")
            setStartExecYakCodeParams({
                Script: loadYakitPluginCode,
                Params: params
            })
        }

        if (loadMode === "local") {
            if (!formValue.localPluginPath) {
                failed(`请输入本地插件路径`)
                return
            }
            const params: ImportYakScriptStreamRequest = {
                Filename: formValue.localPluginPath,
                Password: formValue.Password || ""
            }
            ipcRenderer.invoke("ImportYakScriptStream", params)
        }

        if (loadMode === "local-nuclei") {
            if (!formValue.localNucleiPath) {
                failed(`请输入Nuclei PoC 本地路径`)
                return
            }

            setStartExecYakCodeModalVisible(true)
            setStartExecYakCodeVerbose("导入本地Nuclei")
            setStartExecYakCodeParams({
                Script: loadNucleiPoCFromLocal,
                Params: [{Key: "local-path", Value: formValue.localNucleiPath}]
            })
        }

        if (loadMode === "uploadId") {
            const UUID: string[] = formValue.localId.split(/,|\r?\n/)
            setImportLoading(true)
            apiDownloadPluginOther({
                UUID
            })
                .then(() => {
                    setVisible(false)
                    emiter.emit(
                        "openPage",
                        JSON.stringify({
                            route: YakitRoute.Plugin_Hub,
                            params: {tabActive: "local", refeshList: true}
                        })
                    )
                    success("插件导入成功")
                })
                .finally(() => {
                    setImportLoading(false)
                })
        }
    })

    const onCancel = useMemoizedFn(() => {
        setVisible(false)
    })

    const getLoadModeInfo = (key: string) => {
        const obj = loadModeInfo.find((item) => item.value === loadPluginMode)
        return obj ? obj[key] : ""
    }

    const execYakCodeReset = useMemoizedFn(() => {
        setVisible(false)
        setStartExecYakCodeModalVisible(false)
        setStartExecYakCodeVerbose("")
        setStartExecYakCodeParams(undefined)
    })

    return (
        <>
            <YakitModal
                type='white'
                visible={visible}
                onCancel={onCancel}
                width={getLoadModeInfo("width") || 680}
                closable={true}
                maskClosable={false}
                destroyOnClose={true}
                title={!loadPluginMode ? "导入插件方式" : <>导入{getLoadModeInfo("label")}</>}
                className={style["import-local-plugin-modal"]}
                subTitle={
                    loadPluginMode ? (
                        <></>
                    ) : (
                        <YakitRadioButtons
                            wrapClassName={style["import-local-plugin-subTitle"]}
                            buttonStyle='solid'
                            value={loadMode}
                            onChange={(e) => {
                                setLoadMode(e.target.value)
                            }}
                            options={loadModeInfo.map((item) => ({value: item.value, label: item.label}))}
                        ></YakitRadioButtons>
                    )
                }
                bodyStyle={{padding: 0}}
                footerStyle={{justifyContent: "flex-end"}}
                footer={
                    <>
                        <div style={{marginLeft: 12, display: "block"}}>
                            <YakitButton onClick={onOk} loading={importLoading}>
                                导入
                            </YakitButton>
                        </div>
                    </>
                }
            >
                <div className={style.infoBox}>
                    导入外部资源存在潜在风险，可能会被植入恶意代码或Payload，造成数据泄露、系统被入侵等严重后果。请务必谨慎考虑引入外部资源的必要性，并确保资源来源可信、内容安全。如果确实需要使用外部资源，建议优先选择官方发布的安全版本，或自行编写可控的数据源。同时，请保持系统和软件的最新版本，及时修复已知漏洞，做好日常安全防护。
                </div>
                <Form form={form} className={style["import-local-plugin-form"]}>
                    {getRenderByLoadMode(loadMode)}
                </Form>
            </YakitModal>
            <StartExecYakCodeModal
                visible={startExecYakCodeModalVisible}
                verbose={startExecYakCodeVerbose}
                params={startExecYakCodeParams as YakScriptParam}
                onClose={execYakCodeReset}
                noErrorsLogCallBack={sendMsgToLocalPlugin}
                successInfo={false}
            ></StartExecYakCodeModal>
        </>
    )
})
