import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {info, yakitFailed, yakitNotify} from "@/utils/notification"
import {useCreation, useMemoizedFn} from "ahooks"
import React, {useEffect, useMemo, useRef, useState} from "react"
import {MITMResponse, TraceInfo} from "../MITMPage"
import styles from "./MITMServerHijacking.module.scss"
import {MITMManualHeardExtra, MITMManualEditor, dropResponse, dropRequest, ManualUrlInfo} from "./MITMManual"
import {MITMLogHeardExtra} from "./MITMLog"
import {MITMPluginLogViewer} from "../MITMPluginLogViewer"
import {ExecResultLog} from "@/pages/invoker/batch/ExecMessageViewer"
import {StatusCardProps} from "@/pages/yakitStore/viewers/base"
import ReactResizeDetector from "react-resize-detector"
import {useHotkeys} from "react-hotkeys-hook"
import {useStore} from "@/store/mitmState"
import {HTTPHistory} from "@/components/HTTPHistory"
import {MITMContentReplacerRule} from "../MITMRule/MITMRuleType"
import emiter from "@/utils/eventBus/eventBus"
import {MITMAdvancedFilter, MITMFilterData, MITMFilterSchema} from "../MITMServerStartForm/MITMFilters"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineConfiguredIcon,
    OutlineInformationcircleIcon,
    OutlineUnConfiguredIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {prettifyPacketCode} from "@/utils/prettifyPacket"
import {convertLocalMITMFilterRequest, convertMITMFilterUI} from "../MITMServerStartForm/utils"
import cloneDeep from "lodash/cloneDeep"
import {defaultMITMFilterData} from "@/defaultConstants/mitm"
import MITMFiltersModal, {getAdvancedFlag, getMitmHijackFilter} from "../MITMServerStartForm/MITMFiltersModal"
import {Tooltip} from "antd"

const {ipcRenderer} = window.require("electron")

export type MITMStatus = "hijacking" | "hijacked" | "idle"
interface MITMHijackedContentProps {
    status: MITMStatus
    setStatus: (status: MITMStatus) => any
    logs: ExecResultLog[]
    statusCards: StatusCardProps[]
    downstreamProxyStr: string
    loadedPluginLen: number
    onSelectAll: (e: boolean) => void
    setShowPluginHistoryList: (l: string[]) => void
    setTempShowPluginHistory?: (s: string) => void
    onSetRuleVisible: (v: boolean) => void
    onSetFilterVisible: (v: boolean) => void
}

const MITMHijackedContent: React.FC<MITMHijackedContentProps> = React.memo((props) => {
    const {
        status,
        setStatus,
        logs,
        statusCards,
        downstreamProxyStr,
        loadedPluginLen,
        onSelectAll,
        setShowPluginHistoryList,
        setTempShowPluginHistory,
        onSetRuleVisible,
        onSetFilterVisible
    } = props
    // 自动转发 与 劫持响应的自动设置
    const [autoForward, setAutoForward] = useState<"manual" | "log" | "passive">("log")

    const [hijackResponseType, setHijackResponseType] = useState<"all" | "never">("never") // 劫持类型

    const [forResponse, setForResponse] = useState(false)
    const [urlInfo, setUrlInfo] = useState("监听中...")
    const [ipInfo, setIpInfo] = useState("")

    // 当前正在劫持的请求/响应，是否是 Websocket
    const [currentIsWebsocket, setCurrentIsWebsocket] = useState(false)
    // 当前正在劫持的请求/响应
    const [currentIsForResponse, setCurrentIsForResponse] = useState(false)

    // 存储修改前和修改后的包！
    const [currentPacketInfo, setCurrentPacketInfo] = useState<{
        requestPacket: string
        currentPacket: string
        currentPacketId: number
        isHttp: boolean
        traceInfo: TraceInfo
    }>({
        requestPacket: "",
        currentPacketId: 0,
        currentPacket: "",
        isHttp: true,
        traceInfo: {
            AvailableDNSServers: [],
            DurationMs: 0,
            DNSDurationMs: 0,
            ConnDurationMs: 0,
            TotalDurationMs: 0
        }
    })
    const {currentPacket, currentPacketId, isHttp, requestPacket, traceInfo} = currentPacketInfo

    const [modifiedPacket, setModifiedPacket] = useState<string>("")
    useEffect(() => {
        setModifiedPacket(currentPacket)
    }, [currentPacket])

    const [width, setWidth] = useState<number>(0)
    const [height, setHeight] = useState<number>(0)

    const {setIsRefreshHistory} = useStore()

    const [calloutColor, setCalloutColor] = useState<string>("")

    const [sourceType, setSourceType] = useState<string>("mitm")
    const [tableTotal, setTableTotal] = useState<number>(0)
    const [tableSelectNum, setTableSelectNum] = useState<number>(0)

    /** 黄色提示 start */
    const [whiteListFlag, setWhiteListFlag] = useState<boolean>(false) // 是否配置过过滤器白名单文案
    const [whiteFilter, setWhiteFilter] = useState<{
        baseFilter: MITMFilterSchema
        advancedFilters: MITMAdvancedFilter[]
    }>()
    const [openRepRuleFlag, setOpenRepRuleFlag] = useState<boolean>(false) // 是否开启过替换规则
    const [curRules, setCurRules] = useState<MITMContentReplacerRule[]>([])
    const [alertVisible, setAlertVisible] = useState<boolean>(false)
    const getMITMFilter = useMemoizedFn(() => {
        ipcRenderer
            .invoke("mitm-get-filter")
            .then((res: MITMFilterSchema) => {
                const data = convertMITMFilterUI(res.FilterData || cloneDeep(defaultMITMFilterData))
                const val = data.baseFilter
                setWhiteFilter({
                    baseFilter: val,
                    advancedFilters: data.advancedFilters
                })
                const includeHostnameFlag = val?.includeHostname ? !!val?.includeHostname.length : false
                const includeUriFlag = val?.includeUri ? !!val?.includeUri.length : false
                const includeSuffixFlag = val?.includeSuffix ? !!val?.includeSuffix.length : false
                const flag =
                    includeHostnameFlag || includeUriFlag || includeSuffixFlag || getAdvancedFlag(data.advancedFilters)
                setWhiteListFlag(flag)
                if (flag) {
                    setAlertVisible(true)
                }
            })
            .catch((err) => {
                yakitFailed("获取 MITM 过滤器失败:" + err)
            })
    })
    const setFilters = useMemoizedFn(() => {
        if (whiteFilter) {
            const filter: MITMFilterData = {
                ...convertLocalMITMFilterRequest(whiteFilter),
                IncludeHostnames: [],
                IncludeSuffix: [],
                IncludeUri: []
            }
            ipcRenderer
                .invoke("mitm-set-filter", {
                    FilterData: filter
                })
                .then(() => {
                    getMITMFilter()
                })
                .catch((err) => {
                    yakitFailed("删除过滤器中包含项的所有内容失败：" + err)
                })
        }
    })
    const setRules = useMemoizedFn(() => {
        const newRules: MITMContentReplacerRule[] = []
        curRules.forEach((item) => {
            if (item.Disabled) {
                newRules.push(item)
            } else {
                newRules.push({...item, NoReplace: true})
            }
        })
        ipcRenderer
            .invoke("mitm-content-replacers", {
                replacers: newRules
            })
            .then((val) => {
                getRules()
                yakitNotify("success", "已成功开启规则“全部不替换”按钮")
            })
            .catch((e) => {
                yakitNotify("error", "关闭失败")
            })
    })
    const getRules = useMemoizedFn(() => {
        ipcRenderer
            .invoke("GetCurrentRules", {})
            .then((rsp: {Rules: MITMContentReplacerRule[]}) => {
                const newRules = rsp.Rules.map((ele) => ({...ele, Id: ele.Index}))
                setCurRules([...newRules])
                const findOpenRepRule = newRules.find(
                    (item) => !item.Disabled && (!item.NoReplace || item.Drop || item.ExtraRepeat)
                )
                const flag = findOpenRepRule !== undefined
                setOpenRepRuleFlag(flag)
                if (flag) {
                    setAlertVisible(true)
                }
            })
            .catch((e) => yakitFailed("获取规则列表失败:" + e))
    })
    useEffect(() => {
        getMITMFilter()
        getRules()
        emiter.on("onRefFilterWhiteListEvent", getMITMFilter)
        emiter.on("onRefreshRuleEvent", getRules)
        return () => {
            emiter.off("onRefFilterWhiteListEvent", getMITMFilter)
            emiter.off("onRefreshRuleEvent", getRules)
        }
    }, [])
    useEffect(() => {
        if (loadedPluginLen) setAlertVisible(true)
    }, [loadedPluginLen])
    const clearLoadedPlugins = () => {
        return (
            <YakitButton type='text' colors='danger' onClick={() => onSelectAll(false)} style={{padding: 0}}>
                清空
            </YakitButton>
        )
    }
    const openReplaceRule = () => {
        return (
            <YakitButton type='text' onClick={() => onSetRuleVisible(true)} style={{padding: 0}}>
                替换规则
            </YakitButton>
        )
    }
    const openWhiteFilter = () => {
        return (
            <YakitButton type='text' onClick={() => onSetFilterVisible(true)} style={{padding: 0}}>
                过滤器
            </YakitButton>
        )
    }
    const closeDisposition = (key: "rule" | "filter" | "all") => {
        return (
            <YakitButton
                type='text'
                colors='danger'
                onClick={() => {
                    switch (key) {
                        case "filter":
                            setFilters()
                            break
                        case "rule":
                            setRules()
                            break
                        case "all":
                            setFilters()
                            setRules()
                            break
                        default:
                            break
                    }
                }}
                style={{padding: 0}}
            >
                关闭
            </YakitButton>
        )
    }
    const alertMsg = useMemo(() => {
        if (whiteListFlag && openRepRuleFlag && loadedPluginLen) {
            return (
                <>
                    检测到配置{openReplaceRule()}和{openWhiteFilter()}白名单，如抓包有问题可先将配置
                    {closeDisposition("all")}
                    <Tooltip title='关闭则会开启规则“全部不替换”按钮，并删除过滤器中包含项的所有内容'>
                        <OutlineInformationcircleIcon className={styles["circle-icon"]} />
                    </Tooltip>
                    。检测到加载
                    {loadedPluginLen}个插件，如抓包有问题可点击
                    {clearLoadedPlugins()}
                    取消加载插件。
                </>
            )
        }
        if (whiteListFlag && openRepRuleFlag) {
            return (
                <>
                    检测到配置{openReplaceRule()}和{openWhiteFilter()}白名单，如抓包有问题可先将配置
                    {closeDisposition("all")}
                    <Tooltip title='关闭则会开启规则“全部不替换”按钮，并删除过滤器中包含项的所有内容'>
                        <OutlineInformationcircleIcon className={styles["circle-icon"]} />
                    </Tooltip>
                </>
            )
        }
        if (whiteListFlag && loadedPluginLen) {
            return (
                <>
                    检测到配置{openWhiteFilter()}白名单，如抓包有问题可先将白名单设置{closeDisposition("filter")}
                    <Tooltip title='关闭则会删除过滤器中包含项的所有内容'>
                        <OutlineInformationcircleIcon className={styles["circle-icon"]} />
                    </Tooltip>
                    。检测到加载
                    {loadedPluginLen}个插件，如抓包有问题可点击{clearLoadedPlugins()}
                    取消加载插件。
                </>
            )
        }
        if (openRepRuleFlag && loadedPluginLen) {
            return (
                <>
                    检测到配置{openReplaceRule()}，如抓包有问题可先将替换{closeDisposition("rule")}
                    <Tooltip title='关闭则会开启“全部不替换”按钮'>
                        <OutlineInformationcircleIcon className={styles["circle-icon"]} />
                    </Tooltip>
                    。检测到加载
                    {loadedPluginLen}
                    个插件，如抓包有问题可点击
                    {clearLoadedPlugins()}
                    取消加载插件。
                </>
            )
        }
        if (whiteListFlag)
            return (
                <>
                    检测到配置{openWhiteFilter()}，如抓包有问题可先将白名单设置{closeDisposition("filter")}
                    <Tooltip title='关闭则会删除过滤器中包含项的所有内容'>
                        <OutlineInformationcircleIcon className={styles["circle-icon"]} />
                    </Tooltip>
                </>
            )
        if (openRepRuleFlag)
            return (
                <>
                    检测到配置{openReplaceRule()}，如抓包有问题可先将替换{closeDisposition("rule")}
                    <Tooltip title='关闭则会开启“全部不替换”按钮'>
                        <OutlineInformationcircleIcon className={styles["circle-icon"]} />
                    </Tooltip>
                </>
            )
        if (loadedPluginLen)
            return (
                <>
                    检测到加载{loadedPluginLen}个插件，如抓包有问题可点击{clearLoadedPlugins()}取消加载插件
                </>
            )
        return ""
    }, [openRepRuleFlag, whiteListFlag, loadedPluginLen])
    useEffect(() => {
        if (alertMsg === "") {
            setAlertVisible(false)
        }
    }, [alertMsg])
    /** 黄色提示 end */

    const isManual = useCreation(() => {
        return autoForward === "manual"
    }, [autoForward])
    useEffect(() => {
        ipcRenderer.invoke("mitm-auto-forward", !isManual).finally(() => {
            console.info(`设置服务端自动转发：${!isManual}`)
        })
    }, [autoForward])

    /** 条件劫持 start */
    const [filtersVisible, setFiltersVisible] = useState<boolean>(false)
    const [hijackFilterFlag, setHijackFilterFlag] = useState<boolean>(false)
    const getMITMHijackFilter = useMemoizedFn(() => {
        ipcRenderer
            .invoke("mitm-hijack-get-filter")
            .then((res: MITMFilterSchema) => {
                const data = convertMITMFilterUI(res.FilterData || cloneDeep(defaultMITMFilterData))
                let flag = getMitmHijackFilter(data.baseFilter, data.advancedFilters)
                setHijackFilterFlag(flag)
            })
            .catch((err) => {
                yakitFailed("获取 条件劫持 过滤器失败:" + err)
            })
    })
    useEffect(() => {
        getMITMHijackFilter()
    }, [])
    /** 条件劫持 end */

    // 自动转发劫持，进行的操作
    useEffect(() => {
        ipcRenderer.on("client-mitm-hijacked", forwardHandler)
        return () => {
            ipcRenderer.removeAllListeners("client-mitm-hijacked")
        }
    }, [autoForward])
    const forwardHandler = useMemoizedFn((e: any, msg: MITMResponse) => {
        if (msg?.RemoteAddr) {
            setIpInfo(msg?.RemoteAddr)
        } else {
            setIpInfo("")
        }
        setCurrentIsWebsocket(!!msg?.isWebsocket)
        setCurrentIsForResponse(!!msg?.forResponse)

        if (msg.forResponse) {
            if (!msg.response || !msg.responseId) {
                yakitFailed("BUG: MITM 错误，未能获取到正确的 Response 或 Response ID")
                return
            }
            if (!isManual) {
                forwardResponse(msg.responseId || 0)
                if (!!currentPacket) {
                    clearCurrentPacket()
                }
            } else {
                setForResponse(true)
                setCurrentPacketInfo({
                    currentPacket: !!msg?.isWebsocket
                        ? Uint8ArrayToString(msg.Payload)
                        : Uint8ArrayToString(msg.response),
                    currentPacketId: msg.responseId,
                    isHttp: msg.isHttps,
                    requestPacket: Uint8ArrayToString(msg.request),
                    traceInfo: msg.traceInfo || {
                        AvailableDNSServers: [],
                        DurationMs: 0,
                        DNSDurationMs: 0,
                        ConnDurationMs: 0,
                        TotalDurationMs: 0
                    }
                })
                setStatus("hijacked")
            }
        } else if (msg.request) {
            const updateRequest = () => {
                setForResponse(false)
                setCurrentPacketInfo({
                    currentPacket: !!msg?.isWebsocket
                        ? Uint8ArrayToString(msg.Payload)
                        : Uint8ArrayToString(msg.request),
                    currentPacketId: msg.id,
                    isHttp: msg.isHttps,
                    requestPacket: Uint8ArrayToString(msg.request),
                    traceInfo: msg.traceInfo || {
                        AvailableDNSServers: [],
                        DurationMs: 0,
                        DNSDurationMs: 0,
                        ConnDurationMs: 0,
                        TotalDurationMs: 0
                    }
                })
                setUrlInfo(msg.url)
                setStatus("hijacked")
            }

            if (!isManual) {
                if (hijackFilterFlag) {
                    setAutoForward("manual")
                    updateRequest()
                    info("已触发 条件 劫持")
                } else {
                    forwardRequest(msg.id)
                    if (!!currentPacket) {
                        clearCurrentPacket()
                    }
                }
            } else {
                updateRequest()
            }
        }
    })
    const clearCurrentPacket = () => {
        setCurrentPacketInfo({
            currentPacketId: 0,
            currentPacket: "",
            requestPacket: "",
            isHttp: true,
            traceInfo: {
                AvailableDNSServers: [],
                DurationMs: 0,
                DNSDurationMs: 0,
                ConnDurationMs: 0,
                TotalDurationMs: 0
            }
        })
    }

    useHotkeys(
        "ctrl+t",
        () => {
            handleAutoForward(isManual ? "manual" : "log")
        },
        [autoForward, isManual]
    )
    const handleAutoForward = useMemoizedFn((e: "manual" | "log" | "passive") => {
        try {
            if (!isManual) {
                setHijackResponseType("never")
            }
            setAutoForward(e)
            if (currentPacket && currentPacketId) {
                forward(e === "manual")
            }
        } catch (e) {
            console.info(e)
        }
    })

    const hijacking = useMemoizedFn(() => {
        clearCurrentPacket()
        setStatus("hijacking")
    })

    // 美化
    const [beautifyTriggerRefresh, setBeautifyTriggerRefresh] = useState<boolean>(false) // 美化触发编辑器刷新
    const onSetBeautifyTrigger = useMemoizedFn((flag: boolean) => {
        if (modifiedPacket === "") {
            return
        }
        const encoder = new TextEncoder()
        const bytes = encoder.encode(modifiedPacket)
        const mb = bytes.length / 1024 / 1024
        if (mb > 0.5) {
            return
        } else {
            prettifyPacketCode(modifiedPacket).then((res) => {
                if (!!res) {
                    setCurrentPacketInfo((prev) => ({...prev, currentPacket: Uint8ArrayToString(res as Uint8Array)}))
                    setBeautifyTriggerRefresh(flag)
                }
            })
        }
    })

    // 切换劫持类型
    const onSetHijackResponseType = useMemoizedFn((val) => {
        switch (val) {
            case "onlyOne":
                allowHijackedResponseByRequest(currentPacketId)
                break
            case "all":
                if (currentPacketId > 0) {
                    allowHijackedResponseByRequest(currentPacketId)
                }
                info("劫持所有响应内容")
                break
            case "never":
                cancelHijackedResponseByRequest(currentPacketId)
                info("仅劫持请求")
                break
            default:
                break
        }
        setHijackResponseType(val)
    })
    useEffect(() => {
        if (hijackResponseType === "all" && currentPacketId > 0) {
            allowHijackedResponseByRequest(currentPacketId)
        }
    }, [hijackResponseType, currentPacketId])

    // 丢弃数据
    const onDiscardRequest = useMemoizedFn(() => {
        hijacking()
        if (forResponse) {
            dropResponse(currentPacketId)
        } else {
            dropRequest(currentPacketId)
        }
        setForResponse(false)
        setCalloutColor("")
        setUrlInfo("监听中...")
        setIpInfo("")
    })

    // 这个 Forward 提交数据、切换tab、编辑器右键菜单会调用
    const forward = useMemoizedFn((isManual: boolean) => {
        // ID 不存在
        if (!currentPacketId) {
            return
        }
        setStatus("hijacking")
        setIsRefreshHistory(true)
        if (hijackResponseType !== "all") {
            setHijackResponseType("never")
        }
        setForResponse(false)
        const modifiedPacketBytes = StringToUint8Array(modifiedPacket)
        if (forResponse) {
            ipcRenderer.invoke("mitm-forward-modified-response", modifiedPacketBytes, currentPacketId).finally(() => {
                clearCurrentPacket()
            })
        } else {
            ipcRenderer
                .invoke(
                    "mitm-forward-modified-request",
                    modifiedPacketBytes,
                    currentPacketId,
                    calloutColor ? [calloutColor] : [],
                    !isManual
                )
                .finally(() => {
                    clearCurrentPacket()
                    setCalloutColor("")
                })
        }
    })

    const onRenderHeardExtra = useMemoizedFn(() => {
        return (
            <>
                {/* 手动劫持 */}
                <div style={{display: autoForward === "manual" ? "block" : "none", width: "100%"}}>
                    <MITMManualHeardExtra
                        urlInfo={urlInfo}
                        ipInfo={ipInfo}
                        status={status}
                        currentIsWebsocket={currentIsWebsocket}
                        currentIsForResponse={currentIsForResponse}
                        hijackResponseType={hijackResponseType}
                        traceInfo={traceInfo}
                        setHijackResponseType={onSetHijackResponseType}
                        onDiscardRequest={onDiscardRequest}
                        onSubmitData={forward}
                        width={width}
                        calloutColor={calloutColor}
                        onSetCalloutColor={setCalloutColor}
                        beautifyTriggerRefresh={beautifyTriggerRefresh}
                        onSetBeautifyTrigger={onSetBeautifyTrigger}
                    />
                </div>

                {/* 自动放行 */}
                <div style={{display: autoForward === "log" ? "block" : "none", width: "100%"}}>
                    <MITMLogHeardExtra
                        sourceType={sourceType}
                        onSetSourceType={setSourceType}
                        setShowPluginHistoryList={setShowPluginHistoryList}
                        setTempShowPluginHistory={setTempShowPluginHistory}
                        tableTotal={tableTotal}
                        tableSelectNum={tableSelectNum}
                    />
                </div>
            </>
        )
    })
    const onRenderContent = useMemoizedFn(() => {
        return (
            <>
                {/* 手动劫持 */}
                <div
                    style={{display: autoForward === "manual" ? "block" : "none"}}
                    className={styles["mitm-hijacked-manual-content"]}
                >
                    {width < 900 && (
                        <ManualUrlInfo
                            urlInfo={urlInfo}
                            ipInfo={ipInfo}
                            status={status}
                            currentIsWebsocket={currentIsWebsocket}
                            currentIsForResponse={currentIsForResponse}
                            traceInfo={traceInfo}
                            className={styles["mitm-hijacked-manual-content-url"]}
                        />
                    )}
                    <div className={styles["mitm-hijacked-manual-content-editor"]}>
                        <MITMManualEditor
                            urlInfo={urlInfo}
                            isHttp={isHttp}
                            currentIsWebsocket={currentIsWebsocket}
                            currentPacket={currentPacket}
                            beautifyTriggerRefresh={beautifyTriggerRefresh}
                            modifiedPacket={modifiedPacket}
                            setModifiedPacket={setModifiedPacket}
                            forResponse={forResponse}
                            currentPacketId={currentPacketId}
                            handleAutoForward={handleAutoForward}
                            autoForward={autoForward}
                            forward={forward}
                            hijacking={hijacking}
                            status={status}
                            onSetHijackResponseType={onSetHijackResponseType}
                            currentIsForResponse={currentIsForResponse}
                            requestPacket={requestPacket}
                        />
                    </div>
                </div>

                {/* 自动放行 */}
                <div style={{display: autoForward === "log" ? "block" : "none", height: `calc(100% - ${height}px)`}}>
                    <HTTPHistory
                        pageType='MITM'
                        noTableTitle={true}
                        downstreamProxyStr={downstreamProxyStr}
                        params={{SourceType: sourceType}}
                        onSetTableTotal={setTableTotal}
                        onSetTableSelectNum={setTableSelectNum}
                    />
                </div>

                {/* 被动日志 */}
                <div
                    style={{display: autoForward === "passive" ? "block" : "none"}}
                    className={styles["mitm-hijacked-passive-content"]}
                >
                    <MITMPluginLogViewer messages={logs} status={statusCards} />
                </div>
            </>
        )
    })

    return (
        <div className={styles["mitm-hijacked-content"]}>
            <div>
                <ReactResizeDetector
                    onResize={(w, h) => {
                        if (w) {
                            setWidth(w)
                        }
                        if (h) {
                            setHeight(h)
                        }
                    }}
                    handleWidth={true}
                    handleHeight={true}
                    refreshMode={"debounce"}
                    refreshRate={50}
                />
                <div className={styles["mitm-hijacked-heard"]}>
                    <div className={styles["mitm-hijacked-heard-left"]}>
                        <YakitRadioButtons
                            wrapClassName={styles["mitm-hijacked-heard-tab"]}
                            buttonStyle='solid'
                            value={autoForward}
                            options={[
                                {
                                    label: "手动劫持",
                                    value: "manual"
                                },
                                {
                                    label: (
                                        <>
                                            <Tooltip title='条件劫持' align={{offset: [0, 0]}}>
                                                <div style={{display: "flex"}} onClick={() => setFiltersVisible(true)}>
                                                    {hijackFilterFlag ? (
                                                        <OutlineConfiguredIcon className={styles["configuredIcon"]} />
                                                    ) : (
                                                        <OutlineUnConfiguredIcon
                                                            className={styles["unconfiguredIcon"]}
                                                        />
                                                    )}
                                                </div>
                                            </Tooltip>
                                        </>
                                    ),
                                    value: "hijackFilter"
                                },
                                {label: "自动放行", value: "log"},
                                {label: "被动日志", value: "passive"}
                            ]}
                            onChange={(e) => {
                                if (e.target.value === "hijackFilter") return
                                handleAutoForward(e.target.value)
                            }}
                        />
                        <MITMFiltersModal
                            filterType='hijackFilter'
                            visible={filtersVisible}
                            setVisible={setFiltersVisible}
                            isStartMITM={true}
                            onSetHijackFilterFlag={setHijackFilterFlag}
                        />
                    </div>
                    <div className={styles["mitm-hijacked-heard-right"]}>{onRenderHeardExtra()}</div>
                </div>
                <div className={styles["mitm-alert-msg"]} style={{display: alertVisible ? "block" : "none"}}>
                    {alertMsg}
                    <YakitButton
                        style={{float: "right"}}
                        type='text2'
                        size={"middle"}
                        icon={<OutlineXIcon />}
                        onClick={() => setAlertVisible(false)}
                    />
                </div>
            </div>
            {onRenderContent()}
        </div>
    )
})

export default MITMHijackedContent

const forwardRequest = (id: number) => {
    return ipcRenderer.invoke("mitm-forward-request", id)
}

const forwardResponse = (id: number) => {
    return ipcRenderer.invoke("mitm-forward-response", id)
}

export const allowHijackedResponseByRequest = (id: number) => {
    return ipcRenderer.invoke("mitm-hijacked-current-response", id, true)
}
export const cancelHijackedResponseByRequest = (id: number) => {
    return ipcRenderer.invoke("mitm-hijacked-current-response", id, false)
}
