import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {info, yakitFailed, yakitNotify} from "@/utils/notification"
import {useCounter, useCreation, useInterval, useMemoizedFn} from "ahooks"
import React, {useContext, useEffect, useMemo, useRef, useState} from "react"
import {MITMResponse, TraceInfo} from "../MITMPage"
import styles from "./MITMServerHijacking.module.scss"
import {MITMManualHeardExtra, MITMManualEditor, dropResponse, dropRequest, ManualUrlInfo} from "./MITMManual"
import {MITMLogHeardExtra} from "./MITMLog"
import {MITMPluginLogViewer} from "../MITMPluginLogViewer"
import {ExecResultLog} from "@/pages/invoker/batch/ExecMessageViewer"
import {StatusCardProps} from "@/pages/yakitStore/viewers/base"
import ReactResizeDetector from "react-resize-detector"
import {useStore} from "@/store/mitmState"
import {HTTPFlowRealTimeTableAndEditor, HTTPHistory} from "@/components/HTTPHistory"
import {MITMContentReplacerRule} from "../MITMRule/MITMRuleType"
import emiter from "@/utils/eventBus/eventBus"
import {MITMAdvancedFilter, MITMFilterData, MITMFilterSchema} from "../MITMServerStartForm/MITMFilters"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineConfiguredIcon,
    OutlineInformationcircleIcon,
    OutlineRefreshIcon,
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
import MITMContext, {MITMVersion} from "../Context/MITMContext"
import {
    ClientMITMHijackedResponse,
    MITMContentReplacersRequest,
    MITMForwardModifiedRequest,
    MITMForwardModifiedResponseRequest,
    MITMHijackGetFilterRequest,
    grpcClientMITMHijacked,
    grpcMITMAutoForward,
    grpcMITMCancelHijackedCurrentResponseById,
    grpcMITMContentReplacers,
    grpcMITMForwardModifiedRequest,
    grpcMITMForwardModifiedResponse,
    grpcMITMForwardRequestById,
    grpcMITMForwardResponseById,
    grpcMITMGetFilter,
    grpcMITMHijackGetFilter,
    grpcMITMHijackedCurrentResponseById,
    grpcMITMSetFilter,
    isMITMResponse,
    isMITMV2Response
} from "../MITMHacker/utils"
import {ManualHijackTypeProps, MITMManualRefProps} from "../MITMManual/MITMManualType"
import {grpcMITMV2RecoverManualHijack} from "../MITMManual/utils"
import {TableTotalAndSelectNumber} from "@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {ChevronDownIcon} from "@/assets/newIcon"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import { JSONParseLog } from "@/utils/tool"

const MITMManual = React.lazy(() => import("@/pages/mitm/MITMManual/MITMManual"))

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
    const mitmContent = useContext(MITMContext)

    const mitmVersion = useCreation(() => {
        return mitmContent.mitmStore.version
    }, [mitmContent.mitmStore.version])
    // 自动转发 与 劫持响应的自动设置
    const [autoForward, setAutoForward] = useState<ManualHijackTypeProps>("log")

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

    // 是否有新数据
    const [hasNewData, setHasNewData] = useState<boolean>(false)
    const [sourceType, setSourceType] = useState<string>("mitm")
    const [tableTotal, setTableTotal] = useState<number>(0)
    const [tableSelectNum, setTableSelectNum] = useState<number>(0)
    const [manualTableTotal, setManualTableTotal] = useState<number>(0)
    const [manualTableSelectNumber, setManualTableSelectNumber] = useState<number>(0)
    const [mitmV2PopoverVisible, setMITMV2PopoverVisible] = useState<boolean>(false)
    const [isOnlyLookResponse, setIsOnlyLookResponse] = useState<boolean>(false)
    const mitmManualRef = useRef<MITMManualRefProps>({
        onBatchDiscardData: () => {},
        onBatchSubmitData: () => {},
        onBatchHijackingResponse: () => {},
        onSubmitAllData: () => {}
    })

    /** 黄色提示 start */
    const moreRuleLimitFlagRef = useRef<boolean>(true)
    const [moreRuleLimit, setMoreRuleLimit] = useState<boolean>(false)
    const [whiteListFlag, setWhiteListFlag] = useState<boolean>(false) // 是否配置过过滤器白名单文案
    const [whiteFilter, setWhiteFilter] = useState<{
        baseFilter: MITMFilterSchema
        advancedFilters: MITMAdvancedFilter[]
    }>()
    const [openRepRuleFlag, setOpenRepRuleFlag] = useState<boolean>(false) // 是否开启过替换规则
    const [curRules, setCurRules] = useState<MITMContentReplacerRule[]>([])
    const [alertVisible, setAlertVisible] = useState<boolean>(false)
    const getMITMFilter = useMemoizedFn(() => {
        grpcMITMGetFilter()
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
            grpcMITMSetFilter({
                FilterData: filter,
                version: mitmVersion
            })
                .then(() => {
                    setTimeout(() => {
                        getMITMFilter()
                    }, 500)
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
        const value: MITMContentReplacersRequest = {
            replacers: newRules,
            version: mitmVersion
        }
        grpcMITMContentReplacers(value, true)
            .then((val) => {
                setTimeout(() => {
                    getRules()
                }, 500)
                yakitNotify("success", "已成功开启规则“全部不替换”按钮")
            })
            .catch((e) => {
                yakitNotify("error", "关闭失败")
            })
    })
    const setRulesAllDisable = useMemoizedFn(() => {
        const newRules: MITMContentReplacerRule[] = curRules.map((item) => ({...item, Disabled: true}))
        const value: MITMContentReplacersRequest = {
            replacers: newRules,
            version: mitmVersion
        }
        grpcMITMContentReplacers(value, true)
            .then((val) => {
                setTimeout(() => {
                    getRules()
                }, 500)
                yakitNotify("success", "已成功开启规则“全部禁用”按钮")
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
                const flag2 = newRules.every((item) => item.Disabled === true)
                setOpenRepRuleFlag(flag)
                if (flag2) {
                    setMoreRuleLimit(false)
                }
                if (flag) {
                    setAlertVisible(true)
                }
            })
            .catch((e) => yakitFailed("获取规则列表失败:" + e))
    })
    useEffect(() => {
        getMITMFilter()
        getRules()
        emiter.on("onRefFilterWhiteListEvent", onRefFilterWhiteListEvent)
        emiter.on("onRefreshRuleEvent", onRefreshRuleEvent)
        emiter.on("onMitmRuleMoreLimt", onMitmRuleMoreLimt)
        return () => {
            emiter.off("onRefFilterWhiteListEvent", onRefFilterWhiteListEvent)
            emiter.off("onRefreshRuleEvent", onRefreshRuleEvent)
            emiter.off("onMitmRuleMoreLimt", onMitmRuleMoreLimt)
        }
    }, [])
    useEffect(() => {
        if (loadedPluginLen) setAlertVisible(true)
    }, [loadedPluginLen])

    const onRefFilterWhiteListEvent = useMemoizedFn((version) => {
        if (version !== mitmVersion) return
        getMITMFilter()
    })
    const onRefreshRuleEvent = useMemoizedFn((version) => {
        if (version !== mitmVersion) return
        getRules()
    })
    const onMitmRuleMoreLimt = useMemoizedFn(() => {
        if (!moreRuleLimit && moreRuleLimitFlagRef.current) {
            setMoreRuleLimit(true)
            setAlertVisible(true)
            yakitNotify("info", "开启染色/匹配规则会导致性能下降，如遇风险，请谨慎操作")
        }
    })
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
    const closeDisposition = (key: "rule" | "filter" | "all" | "moreRuleLimit") => {
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
                        case "moreRuleLimit":
                            setRulesAllDisable()
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

    const whiteListMsg = useMemoizedFn(() => {
        return (
            <>
                检测到配置{openWhiteFilter()}，如抓包有问题可先将白名单设置{closeDisposition("filter")}
                <Tooltip title='关闭则会删除过滤器中包含项的所有内容'>
                    <OutlineInformationcircleIcon className={styles["circle-icon"]} />
                </Tooltip>
                。
            </>
        )
    })

    const openRepRuleMsg = useMemoizedFn(() => {
        return (
            <>
                检测到配置{openReplaceRule()}，如抓包有问题可先将替换{closeDisposition("rule")}
                <Tooltip title='关闭则会开启“全部不替换”按钮'>
                    <OutlineInformationcircleIcon className={styles["circle-icon"]} />
                </Tooltip>
                。
            </>
        )
    })

    const whiteListAndOpenRepRuleMsg = useMemoizedFn(() => {
        return (
            <>
                检测到配置{openReplaceRule()}和{openWhiteFilter()}白名单，如抓包有问题可先将配置
                {closeDisposition("all")}
                <Tooltip title='关闭则会开启规则“全部不替换”按钮，并删除过滤器中包含项的所有内容'>
                    <OutlineInformationcircleIcon className={styles["circle-icon"]} />
                </Tooltip>
                。
            </>
        )
    })

    const loadedPluginMsg = useMemoizedFn(() => {
        return (
            <>
                检测到加载{loadedPluginLen}个插件，如抓包有问题可点击{clearLoadedPlugins()}取消加载插件。
            </>
        )
    })

    const moreRuleLimitMsg = useMemoizedFn(() => {
        return (
            <>
                检测到性能下降，如配置染色/匹配规则，可先将规则{closeDisposition("moreRuleLimit")}
                <Tooltip title='关闭则禁用全部规则'>
                    <OutlineInformationcircleIcon className={styles["circle-icon"]} />
                </Tooltip>
                。
            </>
        )
    })

    const alertMsg = useMemo(() => {
        if (whiteListFlag && openRepRuleFlag && loadedPluginLen && moreRuleLimit) {
            return (
                <>
                    {whiteListAndOpenRepRuleMsg()}
                    {loadedPluginMsg()}
                    {moreRuleLimitMsg()}
                </>
            )
        }

        if (whiteListFlag && openRepRuleFlag && loadedPluginLen) {
            return (
                <>
                    {whiteListMsg()}
                    {openRepRuleMsg()}
                    {loadedPluginMsg()}
                </>
            )
        }
        if (whiteListFlag && openRepRuleFlag && moreRuleLimit) {
            return (
                <>
                    {whiteListAndOpenRepRuleMsg()}
                    {moreRuleLimitMsg()}
                </>
            )
        }
        if (whiteListFlag && loadedPluginLen && moreRuleLimit) {
            return (
                <>
                    {whiteListMsg()}
                    {loadedPluginMsg()}
                    {moreRuleLimitMsg()}
                </>
            )
        }

        if (openRepRuleFlag && loadedPluginLen && moreRuleLimit) {
            return (
                <>
                    {openRepRuleMsg()}
                    {loadedPluginMsg()}
                    {moreRuleLimitMsg()}
                </>
            )
        }

        if (whiteListFlag && openRepRuleFlag) return whiteListAndOpenRepRuleMsg()
        if (whiteListFlag && loadedPluginLen) {
            return (
                <>
                    {whiteListMsg()}
                    {loadedPluginMsg()}
                </>
            )
        }
        if (whiteListFlag && moreRuleLimit) {
            return (
                <>
                    {whiteListMsg()}
                    {moreRuleLimitMsg()}
                </>
            )
        }

        if (openRepRuleFlag && loadedPluginLen) {
            return (
                <>
                    {openRepRuleMsg()}
                    {loadedPluginMsg()}
                </>
            )
        }
        if (openRepRuleFlag && moreRuleLimit) {
            return (
                <>
                    {openRepRuleMsg()}
                    {moreRuleLimitMsg()}
                </>
            )
        }

        if (loadedPluginLen && moreRuleLimit) {
            return (
                <>
                    {loadedPluginMsg()}
                    {moreRuleLimitMsg()}
                </>
            )
        }

        if (whiteListFlag) return whiteListMsg()
        if (openRepRuleFlag) return openRepRuleMsg()
        if (loadedPluginLen) return loadedPluginMsg()
        if (moreRuleLimit) return moreRuleLimitMsg()
        return ""
    }, [openRepRuleFlag, whiteListFlag, loadedPluginLen, moreRuleLimit])
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
        const value: MITMHijackGetFilterRequest = {
            isManual: !isManual,
            version: mitmVersion
        }
        grpcMITMAutoForward(value).finally(() => {
            console.info(`设置服务端自动转发：${!isManual}`)
        })
        if (mitmVersion === MITMVersion.V2 && autoForward === "manual") {
            grpcMITMV2RecoverManualHijack()
        }
    }, [autoForward])

    /** 条件劫持 start */
    const [filtersVisible, setFiltersVisible] = useState<boolean>(false)
    const [hijackFilterFlag, setHijackFilterFlag] = useState<boolean>(false)
    const getMITMHijackFilter = useMemoizedFn(() => {
        grpcMITMHijackGetFilter()
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
        getMITMManualIsHijackResponse()
    }, [])
    /** 条件劫持 end */

    // 自动转发劫持，进行的操作
    useEffect(() => {
        // v1版本的手动劫持处理
        if (mitmVersion !== MITMVersion.V1) return
        grpcClientMITMHijacked(mitmVersion).on((data: ClientMITMHijackedResponse) => {
            if (mitmVersion === MITMVersion.V1) {
                if (!isMITMResponse(data)) return
                forwardHandler(data)
            }
        })
        return () => {
            grpcClientMITMHijacked(mitmVersion).remove()
        }
    }, [autoForward])

    const forwardHandler = useMemoizedFn((msg: MITMResponse) => {
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

    const handleAutoForward = useMemoizedFn((e: ManualHijackTypeProps) => {
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
            const value: MITMForwardModifiedResponseRequest = {
                response: modifiedPacketBytes,
                responseId: currentPacketId
            }
            grpcMITMForwardModifiedResponse(value).finally(() => {
                clearCurrentPacket()
            })
        } else {
            const value: MITMForwardModifiedRequest = {
                id: currentPacketId,
                request: modifiedPacketBytes,
                Tags: calloutColor ? [calloutColor] : [],
                autoForwardValue: !isManual
            }
            grpcMITMForwardModifiedRequest(value).finally(() => {
                clearCurrentPacket()
                setCalloutColor("")
            })
        }
    })

    /**刷新手动劫持 */
    const onRefreshManual = useMemoizedFn(() => {
        grpcMITMV2RecoverManualHijack().then(() => {
            yakitNotify("info", "刷新成功")
        })
    })
    const onSubmitAll = useMemoizedFn(() => {
        mitmManualRef.current.onSubmitAllData()
    })
    /**手动劫持批量操作 */
    const onMITMManualBatchOperate = useMemoizedFn(({key, keyPath}) => {
        switch (key) {
            case "batch-hijacking-response":
                mitmManualRef.current.onBatchHijackingResponse()
                break
            case "batch-submit-data":
                mitmManualRef.current.onBatchSubmitData()
                break
            case "batch-discard-data":
                mitmManualRef.current.onBatchDiscardData()
                break
            default:
                break
        }
        setMITMV2PopoverVisible(false)
    })
    const onHijackResponse = useMemoizedFn((e) => {
        const c = e.target.checked
        setIsOnlyLookResponse(c)
        setRemoteValue(RemoteGV.MITMManualIsOnlyLookResponse, `${c}`)
    })
    const getMITMManualIsHijackResponse = useMemoizedFn(() => {
        getRemoteValue(RemoteGV.MITMManualIsOnlyLookResponse).then((res) => {
            if (!!res) {
                setIsOnlyLookResponse(res === "true")
            }
        })
    })
    const onRenderHeardExtra = useMemoizedFn(() => {
        return (
            <>
                {/* 手动劫持 */}
                <div style={{display: autoForward === "manual" ? "block" : "none", width: "100%"}}>
                    {mitmVersion === MITMVersion.V2 ? (
                        <div className={styles["mitm-v2-hijacked-manual-heard-extra"]}>
                            <div className={styles["mitm-v2-hijacked-manual-heard-extra-left"]}>
                                <TableTotalAndSelectNumber
                                    total={manualTableTotal}
                                    selectNum={manualTableSelectNumber}
                                />
                            </div>
                            <div className={styles["mitm-v2-hijacked-manual-heard-extra-right"]}>
                                <div className={styles["mitm-v2-switch"]}>
                                    <YakitCheckbox checked={isOnlyLookResponse} onChange={onHijackResponse} />
                                    <Tooltip
                                        overlayClassName='plugins-tooltip'
                                        title='勾选以后会默认放行所有请求，劫持对应响应'
                                        placement='top'
                                    >
                                        <span className={styles["mitm-v2-switch-label"]}>只看响应</span>
                                    </Tooltip>
                                </div>
                                <YakitPopover
                                    overlayClassName={styles["mitm-v2-hijacked-manual-drop-down-popover"]}
                                    content={
                                        <YakitMenu
                                            width={150}
                                            selectedKeys={[]}
                                            data={[
                                                {
                                                    key: "batch-submit-data",
                                                    label: "批量放行"
                                                },
                                                {
                                                    key: "batch-discard-data",
                                                    label: "批量丢弃"
                                                },
                                                {
                                                    key: "batch-hijacking-response",
                                                    label: "批量劫持响应"
                                                }
                                            ]}
                                            onClick={onMITMManualBatchOperate}
                                        />
                                    }
                                    trigger='click'
                                    placement='bottomLeft'
                                    visible={mitmV2PopoverVisible}
                                    onVisibleChange={setMITMV2PopoverVisible}
                                >
                                    <YakitButton
                                        type='outline2'
                                        disabled={!manualTableSelectNumber}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                        }}
                                    >
                                        批量操作
                                        <ChevronDownIcon />
                                    </YakitButton>
                                </YakitPopover>
                                <YakitButton onClick={onSubmitAll}>全部放行</YakitButton>
                                <YakitButton type='outline1' icon={<OutlineRefreshIcon />} onClick={onRefreshManual} />
                            </div>
                        </div>
                    ) : (
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
                    )}
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
                        hasNewData={hasNewData}
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
                    {mitmVersion === MITMVersion.V2 ? (
                        <MITMManual
                            ref={mitmManualRef}
                            downstreamProxyStr={downstreamProxyStr}
                            autoForward={autoForward}
                            setAutoForward={setAutoForward}
                            handleAutoForward={handleAutoForward}
                            setManualTableTotal={setManualTableTotal}
                            setManualTableSelectNumber={setManualTableSelectNumber}
                            isOnlyLookResponse={isOnlyLookResponse}
                            hijackFilterFlag={hijackFilterFlag}
                        />
                    ) : (
                        <>
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
                        </>
                    )}
                </div>
                {/* 自动放行 */}
                <div style={{display: autoForward === "log" ? "block" : "none", height: `calc(100% - ${height}px)`}}>
                    <HTTPFlowRealTimeTableAndEditor
                        pageType='MITM'
                        noTableTitle={true}
                        downstreamProxyStr={downstreamProxyStr}
                        params={{SourceType: sourceType}}
                        onSetTableTotal={setTableTotal}
                        onSetTableSelectNum={setTableSelectNum}
                        onSetHasNewData={setHasNewData}
                        wrapperStyle={{padding: 0}}
                        onQueryParams={(queryParams) => {
                            try {
                                const processQuery = JSONParseLog(queryParams, {page: "MITMHijackedContent", fun: "onQueryParams"}) || {}
                                delete processQuery.Pagination
                                delete processQuery.AfterId
                                delete processQuery.BeforeId
                                delete processQuery.ProcessName
                                emiter.emit(
                                    "onMITMLogProcessQuery",
                                    JSON.stringify({queryStr: JSON.stringify(processQuery), version: mitmVersion})
                                )
                            } catch (error) {}
                        }}
                    />
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
                        onClick={() => {
                            if (moreRuleLimit) {
                                moreRuleLimitFlagRef.current = false
                            }
                            setAlertVisible(false)
                        }}
                    />
                </div>
            </div>
            {onRenderContent()}
            {/* 被动日志 */}
            {autoForward === "passive" && (
                <div className={styles["mitm-hijacked-passive-content"]}>
                    <MITMPluginLogViewer messages={logs} status={statusCards} />
                </div>
            )}
        </div>
    )
})

export default MITMHijackedContent

const forwardRequest = (id: number) => {
    return grpcMITMForwardRequestById(id, true)
}

const forwardResponse = (id: number) => {
    return grpcMITMForwardResponseById(id, true)
}

const allowHijackedResponseByRequest = (id: number) => {
    return grpcMITMHijackedCurrentResponseById(id, true)
}
const cancelHijackedResponseByRequest = (id: number) => {
    return grpcMITMCancelHijackedCurrentResponseById(id, true)
}
