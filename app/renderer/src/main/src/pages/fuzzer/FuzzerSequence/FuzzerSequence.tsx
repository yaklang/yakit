import React, {useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {
    ExtraSettingProps,
    FuzzerSequenceProps,
    FuzzerSequenceResponse,
    ResponseProps,
    SequenceItemProps,
    SequenceProps,
    SequenceResponseHeardProps,
    SequenceResponseProps,
    SequenceResponseRefProps,
    WebFuzzerDroppedProps
} from "./FuzzerSequenceType"
import styles from "./FuzzerSequence.module.scss"
import { useStreamConcurrency } from "@/pages/pluginHub/hooks/useStreamConcurrency"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    SolidDragsortIcon,
    SolidPlayIcon,
    SolidPlusIcon,
    SolidStopIcon,
    SolidSwitchConfigurationIcon
} from "@/assets/icon/solid"
import {DragDropContext, Droppable, Draggable, DropResult, ResponderProvided} from "@hello-pangea/dnd"
import {
    useControllableValue,
    useCreation,
    useDebounceEffect,
    useDebounceFn,
    useHover,
    useInViewport,
    useMap,
    useMemoizedFn,
    useSize,
    useThrottleEffect,
    useThrottleFn,
    useUpdateEffect
} from "ahooks"
import {
    OutlineArrowcirclerightIcon,
    OutlineCodeIcon,
    OutlineCogIcon,
    OutlinePencilaltIcon,
    OutlinePlussmIcon,
    OutlineQuestionmarkcircleIcon,
    OutlineTrashIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {Divider, Result, Tooltip} from "antd"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import classNames from "classnames"
import {LabelNodeItem, MatcherAndExtractionDrawer} from "../MatcherAndExtractionCard/MatcherAndExtractionCard"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {yakitFailed, yakitNotify} from "@/utils/notification"
import {YakitRoute} from "@/enums/yakitRoute"
import {
    FuzzerExtraShow,
    FuzzerRequestProps,
    FuzzerResponse,
    FuzzerShowSuccess,
    ResponseViewer,
    SecondNodeExtra,
    SecondNodeTitle,
    advancedConfigValueToFuzzerRequests
} from "../HTTPFuzzerPage"
import {randomString} from "@/utils/randomUtil"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {AdvancedConfigValueProps} from "../HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {HTTP_PACKET_EDITOR_Response_Info, IMonacoEditor} from "@/utils/editors"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {HTTPFuzzerPageTable, HTTPFuzzerPageTableQuery} from "../components/HTTPFuzzerPageTable/HTTPFuzzerPageTable"
import {
    MatcherValueProps,
    ExtractorValueProps,
    MatchingAndExtraction,
    MatcherAndExtractionRefProps,
    MatcherAndExtractionValueProps,
    MatcherActiveKey
} from "../MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {InheritLineIcon, InheritArrowIcon} from "./icon"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {ArrowsExpandIcon, ArrowsRetractIcon, QuestionMarkCircleIcon} from "@/assets/newIcon"
import {WebFuzzerNewEditor} from "../WebFuzzerNewEditor/WebFuzzerNewEditor"
import {shallow} from "zustand/shallow"
import {useFuzzerSequence} from "@/store/fuzzerSequence"
import {PageNodeItemProps, WebFuzzerPageInfoProps, usePageInfo} from "@/store/pageInfo"
import {compareAsc} from "@/pages/yakitStore/viewers/base"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {monacoEditorWrite} from "../fuzzerTemplates"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {HTTPFuzzerHotPatch} from "../HTTPFuzzerHotPatch"
import {ShareImportExportData} from "../components/ShareImportExportData"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import sequencemp4 from "@/assets/sequence.mp4"
import {prettifyPacketCode} from "@/utils/prettifyPacket"
import {Uint8ArrayToString} from "@/utils/str"
import {DebugProps} from "./FuzzerPageSetting"
import emiter from "@/utils/eventBus/eventBus"
import {
    DefFuzzerTableMaxData,
    defaultAdvancedConfigValue,
    defaultWebFuzzerPageInfo,
    emptyFuzzer
} from "@/defaultConstants/HTTPFuzzerPage"
import {WebsiteGV} from "@/enums/website"
import {setEditorContext} from "@/utils/monacoSpec/yakEditor"
import {FuzzerRemoteGV} from "@/enums/fuzzer"
import {filterColorTag} from "@/components/TableVirtualResize/utils"
import {FuzzerConcurrentLoad, FuzzerResChartData} from "../FuzzerConcurrentLoad/FuzzerConcurrentLoad"
import {YakitCheckableTag} from "@/components/yakitUI/YakitTag/YakitCheckableTag"
import {isEqual} from "lodash"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {useSelectionByteCount} from "@/components/yakitUI/YakitEditor/useSelectionByteCount"
import {updateConcurrentLoad} from "@/utils/duplex/duplex"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import { isEmpty } from "lodash"
import { AdvancedSet, ConcurrencyItem, initSetValue } from "./FuzzerPageConcurrency"
import { YakitDrawer } from "@/components/yakitUI/YakitDrawer/YakitDrawer"

const ResponseCard = React.lazy(() => import("./ResponseCard"))
const FuzzerPageSetting = React.lazy(() => import("./FuzzerPageSetting"))
const PluginDebugDrawer = React.lazy(() => import("../components/PluginDebugDrawer/PluginDebugDrawer"))
const HTTPHistoryAnalysis = React.lazy(() => import("@/pages/hTTPHistoryAnalysis/HTTPHistoryAnalysis").then(({HTTPHistoryAnalysis}) => ({default: HTTPHistoryAnalysis})))

const {ipcRenderer} = window.require("electron")

// 拖拽功能所需
const getItemStyle = (isDragging, draggableStyle) => {
    let transform: string = draggableStyle["transform"] || ""
    if (isDragging) {
        const number = transform.indexOf("(")
        const index = transform.indexOf(",")
        if (index !== -1 && number !== -1) {
            const pre = transform.substring(0, number + 1)
            const after = transform.substring(index + 1, transform.length)
            transform = pre + "0px," + after
        }
    }
    return {
        ...draggableStyle,
        transform
    }
}

const reorder = (list: any[], startIndex: number, endIndex: number) => {
    const result = [...list]
    const [removed] = result.splice(startIndex, 1)
    result.splice(endIndex, 0, removed)
    return result
}

const isEmptySequence = (list: SequenceProps[]) => {
    return list.findIndex((ele) => !ele.pageId) !== -1
}

const FuzzerSequence: React.FC<FuzzerSequenceProps> = React.memo((props) => {
    const {queryPagesDataById, selectGroupId, getPagesDataByGroupId, updatePagesDataCacheById} = usePageInfo(
        (state) => ({
            queryPagesDataById: state.queryPagesDataById,
            selectGroupId: state.selectGroupId.get(YakitRoute.HTTPFuzzer) || "",
            getPagesDataByGroupId: state.getPagesDataByGroupId,
            updatePagesDataCacheById: state.updatePagesDataCacheById
        }),
        shallow
    )
    const {queryFuzzerSequenceCacheDataByGroupId, updateFuzzerSequenceCacheData, addFuzzerSequenceCacheData} =
        useFuzzerSequence(
            (state) => ({
                queryFuzzerSequenceCacheDataByGroupId: state.queryFuzzerSequenceCacheDataByGroupId,
                updateFuzzerSequenceCacheData: state.updateFuzzerSequenceCacheData,
                addFuzzerSequenceCacheData: state.addFuzzerSequenceCacheData
            }),
            shallow
        )

    const {setType, groupId: propsGroupId} = props
    const {t, i18n} = useI18nNamespaces(["webFuzzer", "yakitUi"])

    const [loading, setLoading] = useState<boolean>(false)

    const [originSequenceList, setOriginSequenceList] = useState<SequenceProps[]>([])
    const [sequenceList, setSequenceList] = useState<SequenceProps[]>(
        queryFuzzerSequenceCacheDataByGroupId(propsGroupId)
    )

    const [errorIndex, setErrorIndex] = useState<number>(-1)

    const [showAllResponse, setShowAllResponse] = useState<boolean>(false)

    // 匹配器和提取器相关
    const [visibleDrawer, setVisibleDrawer] = useState<boolean>(false)
    const [activeType, setActiveType] = useState<MatchingAndExtraction>("matchers")
    const [activeKey, setActiveKey] = useState<string>("ID:0")
    const [defActiveKeyAndOrder, setDefActiveKeyAndOrder] = useState<MatcherActiveKey>({
        order: 0,
        defActiveKey: "ID:0"
    }) // 匹配器
    const [matcherAndExtractionHttpResponse, setMatcherAndExtractionHttpResponse] = useState<string>("")
    const [showMatcherAndExtraction, setShowMatcherAndExtraction] = useState<boolean>(false) // Response中显示匹配和提取器

    const [triggerPageSetting, setTriggerPageSetting] = useState<boolean>(false) // 刷新FuzzerPageSetting中的值
    const [triggerME, setTriggerME] = useState<boolean>(false) // 刷新匹配器和提取器的值
    //流量分析页面显示
    const [trafficAnalysisVisible, setTrafficAnalysisVisible] = useState<boolean>(false) // 流量分析遮罩层
    const [trafficAnalysisType, setTrafficAnalysisType] = useState<"all" | "single">("all") // 流量分析类型：全部或单个

    // Request
    const [currentSelectRequest, setCurrentSelectRequest] = useState<WebFuzzerPageInfoProps>()
    const [requestMap, {set: setRequest, get: getRequest}] = useMap<string, AdvancedConfigValueProps>(new Map())
    const [isShowSetting, setIsShowSetting] = useState<boolean>(false)

    // Response
    const [currentSequenceItem, setCurrentSequenceItem, getCurrentSequenceItem] = useGetSetState<SequenceProps>()

    const [currentSelectResponse, setCurrentSelectResponse, getCurrentSelectResponse] = useGetSetState<ResponseProps>()
    const [responseMap, {set: setResponse, get: getResponse, reset: resetResponse}] = useMap<string, ResponseProps>()
    const [droppedCountMap, {set: setDroppedCount, get: getDroppedCount, reset: resetDroppedCount}] = useMap<
        string,
        number
    >(new Map()) // 序列中每个页面丢弃的数量

    const [visiblePluginDrawer, setVisiblePluginDrawer] = useState<boolean>(false)
    const [pluginDebugCode, setPluginDebugCode] = useState<string>("")

    const fuzzTokenRef = useRef<string>(randomString(60))
    const webFuzzerNewEditorRef = useRef<any>()
    const hotPatchCodeRef = useRef<string>("")
    const hotPatchCodeWithParamGetterRef = useRef<string>("")
    const sequenceResponseRef = useRef<SequenceResponseRefProps>({
        validate: () => new Promise(() => {})
    })

    const fuzzerSequenceRef = useRef(null)
    const [inViewport] = useInViewport(fuzzerSequenceRef)
    const inViewportRef = useRef<boolean>(inViewport === true)
    const droppedSequenceIndexMapRef = useRef<Map<string, Map<string, number>>>(new Map()) //序列丢弃:中间缓存的数据用于计算最后的丢弃数

    const [extractedMap, {reset, set}] = useMap<string, Map<string, string>>()
    
    // 并发模式的数据
    const [originConcurrencyList, setOriginConcurrencyList] = useState<SequenceProps[]>([])
    const [concurrencyList, setConcurrencyList] = useState<SequenceProps[]>([])
    //高级设置抽屉显示
    const [advancedSetVisible, setAdvancedSetVisible] = useState<boolean>(false)

    // 页面显示模式
    const isConcurrency = useMemo(() => props.type === "concurrency", [props.type])
    // 记录是否已经在并发模式下初始化过
    const hasInitializedConcurrencyRef = useRef<boolean>(false)

    // 根据模式动态选择使用的列表
    const currentList = useMemo(() => isConcurrency ? concurrencyList : sequenceList, [isConcurrency, concurrencyList, sequenceList])
    const currentOriginList = useMemo(() => isConcurrency ? originConcurrencyList : originSequenceList, [isConcurrency, originConcurrencyList, originSequenceList])

    const setCurrentList = useMemoizedFn((list: SequenceProps[]) => {
        isConcurrency ? setConcurrencyList(list) :  setSequenceList(list)
    })
    const setCurrentOriginList = useMemoizedFn((list: SequenceProps[]) => {
        isConcurrency ? setOriginConcurrencyList(list) : setOriginSequenceList(list)
    })

    // pageGroupData通过订阅自动更新
    const [pageGroupData, setPageGroupData] = useState<PageNodeItemProps | undefined>(
        () => queryPagesDataById(YakitRoute.HTTPFuzzer, selectGroupId)
    )

    useEffect(() => {
        setPageGroupData(queryPagesDataById(YakitRoute.HTTPFuzzer, selectGroupId))

        const unsubscribe = usePageInfo.subscribe(
            (state) => state.queryPagesDataById(YakitRoute.HTTPFuzzer, selectGroupId),
            (newData) => {
                // 当数据变化时自动更新 state
                setPageGroupData(newData)
            }
        )

        return () => {
            unsubscribe()
        }
    }, [selectGroupId, queryPagesDataById])

    const { startConcurrency, cancelConcurrency } = useStreamConcurrency<FuzzerSequenceResponse>({
        onData: (data) => {
            const { Response, Request: { FuzzerIndex = "" } } = data

            // 成功/失败计数
            if (Response.Ok) {
                let currentSuccessCount = successCountRef.current.get(FuzzerIndex)
                successCountRef.current.set(FuzzerIndex, (currentSuccessCount || 0) + 1)
            } else {
                let currentFailedCount = failedCountRef.current.get(FuzzerIndex)
                failedCountRef.current.set(FuzzerIndex, (currentFailedCount || 0) + 1)
            }
            onSetFirstAsSelected(FuzzerIndex)

            // 数据项计数
            let count = countRef.current.get(FuzzerIndex)
            if (count !== undefined) {
                count++
                countRef.current.set(FuzzerIndex, count)
            } else {
                countRef.current.set(FuzzerIndex, 0)
            }

            // RuntimeID 收集
            if (Response.RuntimeID) {
                let runtimeId = runtimeIdBufferRef.current.get(FuzzerIndex)
                if (runtimeId) {
                    runtimeId.push(Response.RuntimeID)
                    runtimeIdBufferRef.current.set(FuzzerIndex, [...new Set(runtimeId)])
                } else {
                    runtimeIdBufferRef.current.set(FuzzerIndex, [Response.RuntimeID])
                }
            }

            // 构建响应对象
            let r = {
                ...Response,
                Headers: Response.Headers || [],
                UUID: Response.UUID,
                Count: countRef.current.get(FuzzerIndex),
                cellClassName: ""
            } as FuzzerResponse

            if (Response.MatchedByMatcher) {
                let colors = filterColorTag(Response.HitColor) || undefined
                r.cellClassName = colors
            }

            // 分类存储成功/失败响应
            if (Response.Ok) {
                let successList = successBufferRef.current.get(FuzzerIndex)
                let fuzzerTableMaxData = fuzzerTableMaxDataRef.current.get(FuzzerIndex) || DefFuzzerTableMaxData
                if (successList) {
                    successList.push(r)
                    if (successList.length > fuzzerTableMaxData) {
                        successList.shift()
                    }
                    successBufferRef.current.set(FuzzerIndex, successList)
                } else {
                    successBufferRef.current.set(FuzzerIndex, [r])
                }
            } else {
                let failedList = failedBufferRef.current.get(FuzzerIndex)
                if (failedList) {
                    failedList.push(r)
                    failedBufferRef.current.set(FuzzerIndex, failedList)
                } else {
                    failedBufferRef.current.set(FuzzerIndex, [r])
                }
            }

            if (!fuzzerIndexArr.current.includes(FuzzerIndex)) {
                fuzzerIndexArr.current.push(FuzzerIndex)
            }

            // 图表数据
            let fuzzerResChartData = fuzzerResChartDataBufferRef.current.get(FuzzerIndex)
            if (fuzzerResChartData) {
                fuzzerResChartData.push({
                    Count: (r.Count as number) + 1,
                    TLSHandshakeDurationMs: +r.TLSHandshakeDurationMs,
                    TCPDurationMs: +r.TCPDurationMs,
                    ConnectDurationMs: +r.ConnectDurationMs,
                    DurationMs: +r.DurationMs
                })
                if (fuzzerResChartData.length > 5000) {
                    fuzzerResChartData.shift()
                }
                fuzzerResChartDataBufferRef.current.set(FuzzerIndex, fuzzerResChartData)
            } else {
                fuzzerResChartDataBufferRef.current.set(FuzzerIndex, [{
                    Count: (r.Count as number) + 1,
                    TLSHandshakeDurationMs: +r.TLSHandshakeDurationMs,
                    TCPDurationMs: +r.TCPDurationMs,
                    ConnectDurationMs: +r.ConnectDurationMs,
                    DurationMs: +r.DurationMs
                }])
            }
        },
        onStreamEnd: () => {
            // 并发模式全部完成的业务逻辑
            setLoading(false)
        }
    })

    useDebounceEffect(
        () => {
            // 只有 Sequence 模式才缓存到 redux
            if (!isConcurrency) {
                const effectiveSequenceList = sequenceList.filter((ele) => ele.pageId)
                if (effectiveSequenceList.length > 0) {
                    updateFuzzerSequenceCacheData(propsGroupId, effectiveSequenceList)
                } else {
                    addFuzzerSequenceCacheData(propsGroupId, [])
                }
            }
        },
        [sequenceList, isConcurrency],
        {wait: 200}
    )
    useEffect(() => {
        ipcRenderer.on(
            "fetch-extracted-to-table",
            (e: any, data: {pageId: string; type: string; extractedMap: Map<string, string>}) => {
                if (data.type === "fuzzerSequence") {
                    setExtractedMap(data.extractedMap)
                }
            }
        )
        return () => {
            ipcRenderer.removeAllListeners("fetch-extracted-to-table")
        }
    }, [])

    useEffect(() => {
        inViewportRef.current = inViewport === true
        if (inViewport) {
            const unSubPageNode = usePageInfo.subscribe(
                (state) => {
                    const names = state.getCurrentGroupAllTabName(YakitRoute.HTTPFuzzer)
                    return names
                },
                (selectedState, previousSelectedState) => {
                    onUpdateSequence()
                }
            )
            return () => {
                unSubPageNode()
            }
        }
    }, [inViewport])

    useUpdateEffect(() => {
        if (!loading) {
            onUpdateSequence()
            const newList = currentList.map((item) => ({
                ...item,
                disabled: false
            }))
            setCurrentList([...newList])
            setTimeout(() => {
                onClearRef()
            }, 1000)
        }
    }, [loading])
    useEffect(() => {
        getPageNodeInfoByPageIdByRoute()
    }, [])
    useEffect(() => {
        if (!inViewport) return
        onUpdateSequence()
        getRemoteValue(FuzzerRemoteGV.WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE).then((remoteData) => {
            if (!!remoteData) {
                hotPatchCodeWithParamGetterRef.current = `${remoteData}`
            }
        })
        setTimeout(() => {
            if (currentSequenceItem) {
                const currentSequenceRequest = getCurrentSequenceRequest(currentSequenceItem.pageId)
                if (currentSequenceRequest?.pageParamsInfo.webFuzzerPageInfo) {
                    setCurrentSelectRequest({
                        ...currentSequenceRequest.pageParamsInfo.webFuzzerPageInfo
                    })

                    const hotPatchCode = currentSequenceRequest?.pageParamsInfo.webFuzzerPageInfo.hotPatchCode
                    setHotPatchCodeRef(hotPatchCode)
                }
            }
        }, 200)
    }, [inViewport])

    const successCountRef = useRef<Map<string, number>>(new Map())
    const failedCountRef = useRef<Map<string, number>>(new Map())
    const successBufferRef = useRef<Map<string, FuzzerResponse[]>>(new Map())
    const failedBufferRef = useRef<Map<string, FuzzerResponse[]>>(new Map())
    const countRef = useRef<Map<string, number>>(new Map())
    const runtimeIdBufferRef = useRef<Map<string, string[]>>(new Map())
    const fuzzerTableMaxDataRef = useRef<Map<string, number>>(new Map())
    const fuzzerResChartDataBufferRef = useRef<Map<string, FuzzerResChartData[]>>(new Map())

    useEffect(() => {
        if (currentSequenceItem) {
            const currentSequenceRequest = getCurrentSequenceRequest(currentSequenceItem.pageId)
            if (currentSequenceRequest?.pageParamsInfo.webFuzzerPageInfo) {
                setCurrentSelectRequest({
                    ...currentSequenceRequest.pageParamsInfo.webFuzzerPageInfo
                })

                const hotPatchCode = currentSequenceRequest?.pageParamsInfo.webFuzzerPageInfo.hotPatchCode
                setHotPatchCodeRef(hotPatchCode)
            }

            const currentResponse = responseMap.get(currentSequenceItem.id)
            if (currentResponse) {
                setCurrentSelectResponse({...currentResponse})
            } else {
                setCurrentSelectResponse(undefined)
            }
        } else {
            setCurrentSelectRequest(undefined)
            setCurrentSelectResponse(undefined)
            setIsShowSetting(false)
        }
        return () => {
            setCurrentSelectRequest(undefined)
            setCurrentSelectResponse(undefined)
        }
    }, [currentSequenceItem])
    useThrottleEffect(
        () => {
            const curSequenceItem = getCurrentSequenceItem()
            if (!curSequenceItem) return
            const currentResponse = responseMap.get(curSequenceItem.id)
            if (currentResponse && !isEqual(currentResponse, getCurrentSelectResponse())) {
                setCurrentSelectResponse({...currentResponse})
            }
        },
        [responseMap],
        {
            wait: 300
        }
    )
    const fuzzerIndexArr = useRef<string[]>([])

    useEffect(() => {
        const token = fuzzTokenRef.current
        const dataToken = `${token}-data`
        const errToken = `${token}-error`
        const endToken = `${token}-end`

        const releaseQueue: FuzzerResponse[] = []
        let releaseTimer: NodeJS.Timeout | null = null
        const scheduleRelease = (item: FuzzerResponse) => {
            releaseQueue.push(item)
            if (!releaseTimer) {
                releaseTimer = setInterval(() => {
                    if (releaseQueue.length === 0) {
                        clearInterval(releaseTimer!)
                        releaseTimer = null
                        return
                    }
                    // 每次释放 20 条旧数据
                    for (let i = 0; i < 20 && releaseQueue.length > 0; i++) {
                        const obj = releaseQueue.shift()!
                        obj.RequestRaw = null as unknown as Uint8Array
                        obj.ResponseRaw = null as unknown as Uint8Array
                    }
                }, 1000)
            }
        }

        ipcRenderer.on(dataToken, (e: any, data: FuzzerSequenceResponse) => {
            const {Response, Request} = data
            const {FuzzerIndex = ""} = Request

            if (Response.Ok) {
                // successCount++
                let currentSuccessCount = successCountRef.current.get(FuzzerIndex)
                if (currentSuccessCount) {
                    currentSuccessCount++
                    successCountRef.current.set(FuzzerIndex, currentSuccessCount)
                } else {
                    successCountRef.current.set(FuzzerIndex, 1)
                }
            } else {
                // failedCount++
                let currentFailedCount = failedCountRef.current.get(FuzzerIndex)
                if (currentFailedCount) {
                    currentFailedCount++
                    failedCountRef.current.set(FuzzerIndex, currentFailedCount)
                } else {
                    failedCountRef.current.set(FuzzerIndex, 1)
                }
            }
            onSetFirstAsSelected(FuzzerIndex)

            // 用于数据项请求字段
            let count = countRef.current.get(FuzzerIndex)
            if (count !== undefined) {
                count++
                countRef.current.set(FuzzerIndex, count)
            } else {
                countRef.current.set(FuzzerIndex, 0)
            }

            // 主要用于查看全部数据
            if (Response.RuntimeID) {
                let runtimeId = runtimeIdBufferRef.current.get(FuzzerIndex)
                if (runtimeId) {
                    runtimeId.push(Response.RuntimeID)
                    runtimeIdBufferRef.current.set(FuzzerIndex, [...new Set(runtimeId)])
                } else {
                    runtimeIdBufferRef.current.set(FuzzerIndex, [Response.RuntimeID])
                }
            }

            let r = {
                ...Response,
                Headers: Response.Headers || [],
                UUID: Response.UUID,
                Count: countRef.current.get(FuzzerIndex),
                cellClassName: ""
            } as FuzzerResponse

            if (Response.MatchedByMatcher) {
                let colors = filterColorTag(Response.HitColor) || undefined
                r.cellClassName = colors
            }

            if (Response.Ok) {
                let successList = successBufferRef.current.get(FuzzerIndex)
                let fuzzerTableMaxData = fuzzerTableMaxDataRef.current.get(FuzzerIndex) || DefFuzzerTableMaxData
                if (successList) {
                    successList.push(r)
                    // 超过最大显示 展示最新数据
                    if (successList.length > fuzzerTableMaxData) {
                        const oldest = successList.shift()
                        if (oldest) scheduleRelease(oldest)
                    }
                    successBufferRef.current.set(FuzzerIndex, successList)
                } else {
                    successBufferRef.current.set(FuzzerIndex, [r])
                }
            } else {
                let failedList = failedBufferRef.current.get(FuzzerIndex)
                if (failedList) {
                    failedList.push(r)
                    failedBufferRef.current.set(FuzzerIndex, failedList)
                } else {
                    failedBufferRef.current.set(FuzzerIndex, [r])
                }
            }

            if (!fuzzerIndexArr.current.includes(FuzzerIndex)) {
                fuzzerIndexArr.current.push(FuzzerIndex)
            }

            let fuzzerResChartData = fuzzerResChartDataBufferRef.current.get(FuzzerIndex)
            if (fuzzerResChartData) {
                fuzzerResChartData.push({
                    Count: (r.Count as number) + 1,
                    TLSHandshakeDurationMs: +r.TLSHandshakeDurationMs,
                    TCPDurationMs: +r.TCPDurationMs,
                    ConnectDurationMs: +r.ConnectDurationMs,
                    DurationMs: +r.DurationMs
                })
                // 超过最大显示 展示最新数据
                if (fuzzerResChartData.length > 5000) {
                    fuzzerResChartData.shift()
                }
                fuzzerResChartDataBufferRef.current.set(FuzzerIndex, fuzzerResChartData)
            } else {
                fuzzerResChartDataBufferRef.current.set(FuzzerIndex, [
                    {
                        Count: (r.Count as number) + 1,
                        TLSHandshakeDurationMs: +r.TLSHandshakeDurationMs,
                        TCPDurationMs: +r.TCPDurationMs,
                        ConnectDurationMs: +r.ConnectDurationMs,
                        DurationMs: +r.DurationMs
                    }
                ])
            }

            r = null as unknown as FuzzerResponse
        })
        ipcRenderer.on(endToken, () => {
            setTimeout(() => {
                setLoading(false)
            }, 300)
        })
        ipcRenderer.on(errToken, (e, details) => {
            yakitNotify("error", `${t("FuzzerSequence.fuzz_request_fail")} ${details}`)
            setTimeout(() => {
                setLoading(false)
            }, 300)
        })

        return () => {
            ipcRenderer.invoke("cancel-HTTPFuzzerSequence", token)
            ipcRenderer.removeAllListeners(errToken)
            ipcRenderer.removeAllListeners(dataToken)
            ipcRenderer.removeAllListeners(endToken)
        }
    }, [])

    useEffect(() => {
        emiter.on("onGetDiscardPackageCount", handleSetDroppedCount)
        return () => {
            emiter.off("onGetDiscardPackageCount", handleSetDroppedCount)
        }
    }, [])

    /**监听每次发送请求里的丢弃包数量,后端发送信号时做了防抖处理 */
    const handleSetDroppedCount = useMemoizedFn((content: string) => {
        try {
            const data: WebFuzzerDroppedProps = JSON.parse(content)
            const isExist = !!currentList.find((ele) => ele.id === data.fuzzer_index)
            if (isExist) {
                const current: Map<string, number> =
                    droppedSequenceIndexMapRef.current.get(data.fuzzer_index) || new Map()
                current.set(data.fuzzer_sequence_index, data.discard_count)
                const sum = [...current.values()].reduce((sum, value) => sum + value, 0)
                if (getDroppedCount(data.fuzzer_index) !== sum) {
                    setDroppedCount(data.fuzzer_index, sum)
                }
                droppedSequenceIndexMapRef.current.set(data.fuzzer_index, current)
            }
        } catch (error) {}
    })

    const getCurrentSequenceRequest = useMemoizedFn((pageId: string) => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, pageId)
        if (currentItem) {
            return currentItem
        }
    })
    const getCurrentGroupSequence = useMemoizedFn(() => {
        const pageChildrenList = getPagesDataByGroupId(YakitRoute.HTTPFuzzer, selectGroupId)
        return pageChildrenList.sort((a, b) => compareAsc(a, b, "sortFieId")) || []
    })
    const setExtractedMap = useMemoizedFn((extractedMap: Map<string, string>) => {
        if (inViewport && currentSequenceItem) set(currentSequenceItem?.id, extractedMap)
    })
    /**点击开始执行后，如果没有选中项，则设置返回的第一个为选中item */
    const onSetFirstAsSelected = useMemoizedFn((fuzzerIndex: string) => {
        if (!currentSequenceItem) {
            const current: SequenceProps | undefined = currentList.find((ele) => ele.id === fuzzerIndex)
            if (current) {
                setCurrentSequenceItem(current)
            }
        }
    })

    useEffect(() => {
        const id = setInterval(() => {
            fuzzerIndexArr.current.map((fuzzerIndex) => {
                let currentSuccessCount = successCountRef.current.get(fuzzerIndex) || 0
                let currentFailedCount = failedCountRef.current.get(fuzzerIndex) || 0
                let lastSuccessCount = getResponse(fuzzerIndex)?.successCount || 0
                let lastFailedCount = getResponse(fuzzerIndex)?.failedCount || 0
                // 判断是否有更新
                if (currentSuccessCount !== lastSuccessCount || currentFailedCount !== lastFailedCount) {
                    updateData(fuzzerIndex)
                }
            })
        }, 500)
        return () => {
            clearInterval(id)
        }
    }, [])

    const updateData = useThrottleFn(
        (fuzzerIndex: string) => {
            const successBuffer: FuzzerResponse[] = successBufferRef.current.get(fuzzerIndex) || []
            const failedBuffer: FuzzerResponse[] = failedBufferRef.current.get(fuzzerIndex) || []
            const runtimeIdBuffer = runtimeIdBufferRef.current.get(fuzzerIndex) || []
            const fuzzerTableMaxData = fuzzerTableMaxDataRef.current.get(fuzzerIndex) || DefFuzzerTableMaxData
            const fuzzerResChartDataBuffer = fuzzerResChartDataBufferRef.current.get(fuzzerIndex) || []
            if (failedBuffer.length + successBuffer.length === 0) {
                return
            }
            const newList = currentList.map((item) => {
                if (item.disabled) {
                    return {
                        ...item,
                        disabled: item.id === fuzzerIndex ? false : true
                    }
                } else {
                    return item
                }
            })

            if (!isEqual(newList, currentList)) {
                setCurrentList(newList)
            }

            let currentSuccessCount = successCountRef.current.get(fuzzerIndex) || 0
            let currentFailedCount = failedCountRef.current.get(fuzzerIndex) || 0

            if (successBuffer.length + failedBuffer.length === 1) {
                const onlyOneResponse = successBuffer.length === 1 ? successBuffer[0] : failedBuffer[0]
                // 设置第一个 response
                setResponse(fuzzerIndex, {
                    id: fuzzerIndex,
                    onlyOneResponse,
                    successCount: currentSuccessCount,
                    failedCount: currentFailedCount,
                    successFuzzer: successBuffer,
                    failedFuzzer: failedBuffer,
                    runtimeIdFuzzer: runtimeIdBuffer,
                    fuzzerTableMaxData: fuzzerTableMaxData,
                    fuzzerResChartData: fuzzerResChartDataBuffer
                })
                return
            }

            const prevResponse = getResponse(fuzzerIndex)
            const newResponse: ResponseProps = {
                id: fuzzerIndex,
                onlyOneResponse: emptyFuzzer,
                ...prevResponse,
                successCount: currentSuccessCount,
                failedCount: currentFailedCount,
                successFuzzer: [...successBuffer],
                failedFuzzer: [...failedBuffer],
                runtimeIdFuzzer: [...runtimeIdBuffer],
                fuzzerTableMaxData: fuzzerTableMaxData,
                fuzzerResChartData: []
            }
            if (inViewportRef.current) {
                newResponse.fuzzerResChartData = fuzzerResChartDataBuffer
            }
            if (!isEqual(prevResponse, newResponse)) {
                setResponse(fuzzerIndex, newResponse)
            }
        },
        {wait: 350}
    ).run
    const onClearRef = useMemoizedFn(() => {
        fuzzerIndexArr.current = []
        successCountRef.current.clear()
        failedCountRef.current.clear()
        successBufferRef.current.clear()
        failedBufferRef.current.clear()
        countRef.current.clear()
        runtimeIdBufferRef.current.clear()
        fuzzerResChartDataBufferRef.current.clear()
    })
    /**
     * 组内的webFuzzer页面高级配置或者request发生变化，或者组发生变化，
     * 则更新原始序列originSequenceListRef,选中的item内容
     */
    const onUpdateSequence = useDebounceFn(
        useMemoizedFn(() => {
            if (loading || !inViewport) return
            const pageChildrenList = getCurrentGroupSequence()
            if (pageChildrenList.length === 0) {
                if (setType) setType("config")
                return
            }

            onSetOriginSequence(pageChildrenList)
            const newList: SequenceProps[] = []
            currentList.forEach((item) => {
                const current = pageChildrenList.find((ele) => ele.pageId === item.pageId)
                if (!item.pageId) {
                    newList.push({
                        ...item
                    })
                }
                if (current) {
                    newList.push({
                        ...item
                    })
                }
            })
            if (newList.findIndex((ele) => ele.pageId === currentSequenceItem?.pageId) === -1) {
                setCurrentSequenceItem(undefined)
            }
            if (newList.length === 0) {
                const newItem: SequenceProps = {
                    id: "1",
                    name: `Step [0]`,
                    pageId: "",
                    pageGroupId: "",
                    pageName: "",
                    inheritCookies: true,
                    inheritVariables: true
                }
                newList.push(newItem)
            }
            setCurrentList([...newList])
        }),
        {wait: 200}
    ).run

    // 首次进入或切换模式时的初始化逻辑
    useEffect(() => {
        const pageChildrenList = getCurrentGroupSequence()
        onSetOriginSequence(pageChildrenList)

        if (isConcurrency) {
            // 并发模式：首次初始化时使用全部列表
            if (!hasInitializedConcurrencyRef.current) {
                hasInitializedConcurrencyRef.current = true
                const list = pageChildrenList.map(({ pageGroupId, pageId, pageName }, index) => ({
                    id: `${randomString(8)}-${index}`,
                    name: `Step [${index}]`,
                    pageId,
                    pageGroupId: pageGroupId || props.groupId,
                    pageName,
                    inheritCookies: true,
                    inheritVariables: true
                }))
                if (list.length > 0) {
                    setCurrentSequenceItem(list[0])
                    setCurrentList(list)
                }
            } else {
                // 切换回并发模式：选中第一项
                if (concurrencyList.length > 0) {
                    setCurrentSequenceItem(concurrencyList[0])
                }
            }
        } else {
            // 序列模式：首次初始化时创建空节点
            if (sequenceList.length === 0) {
                const item: SequenceProps = {
                    id: `${randomString(8)}-1`,
                    name: "Step [0]",
                    pageId: "",
                    pageGroupId: pageChildrenList[0]?.pageGroupId || props.groupId,
                    pageName: "",
                    inheritCookies: true,
                    inheritVariables: true
                }
                setCurrentSequenceItem({...item})
                setSequenceList([item])
            } else {
                // 切换回序列模式：选中第一项
                setCurrentSequenceItem(sequenceList[0])
            }
        }
    }, [isConcurrency])

    const getPageNodeInfoByPageIdByRoute = useMemoizedFn(() => {
        const pageChildrenList = getCurrentGroupSequence()
        onSetOriginSequence(pageChildrenList)
    })

    /**设置原始序列 */
    const onSetOriginSequence = useMemoizedFn((pageChildrenList: PageNodeItemProps[]) => {
        const newSequence: SequenceProps[] = pageChildrenList.map((item, index) => ({
            id: item.id,
            name: `Step [${index}]`,
            pageId: item.pageId,
            pageGroupId: item.pageGroupId,
            pageName: item.pageName,
            pageParams: item.pageParamsInfo.webFuzzerPageInfo || defaultWebFuzzerPageInfo,
            inheritCookies: true,
            inheritVariables: true
        }))
        setCurrentOriginList([...newSequence])
    })

    const onDragEnd = useMemoizedFn((result: DropResult, provided: ResponderProvided) => {
        if (!result.destination) {
            return
        }
        if (result.source.droppableId === "droppable1" && result.destination.droppableId === "droppable1") {
            const current: SequenceProps | undefined = currentList[result.source.index]
            if (current) {
                setCurrentSequenceItem(current)
            }
            const newList: SequenceProps[] = reorder(
                currentList,
                result.source.index,
                result.destination.index
            )
            setCurrentList(newList)
        }
    })
    const onUpdateItemPage = useMemoizedFn((item: SequenceProps, index: number) => {
        if (index === errorIndex && item.pageId) {
            setErrorIndex(-1)
        }
        if (!currentSequenceItem || !currentSequenceItem.pageId) {
            setIsShowSetting(true)
        }
        const originItem = currentOriginList.find((ele) => ele.pageId === item.pageId)
        if (!originItem) return
        const newList = [...currentList]
        newList[index] = {
            ...item
        }
        setCurrentSequenceItem({...item})
        setCurrentList(newList)
    })
    const onUpdateItem = useMemoizedFn((item: SequenceProps, index: number) => {
        if (item.id === currentSequenceItem?.id) {
            setCurrentSequenceItem({...item})
        }
        const newList = [...currentList]
        newList[index] = {...item}
        setCurrentList(newList)
    })
    /**
     * @description HotPatchCode和HotPatchCodeWithParamGetter一直使用缓存在数据库中的值
     * proxy,dnsServers,etcHosts使用各个页面上显示的值
     */
    const getHttpParams = useMemoizedFn(() => {
        const httpParams: FuzzerRequestProps[] = []
        const pageChildrenList = getCurrentGroupSequence()
        currentList.forEach((item) => {
            const requestItem = pageChildrenList.find((ele) => ele.pageId === item.pageId)
            const webFuzzerPageInfo = requestItem?.pageParamsInfo.webFuzzerPageInfo
            if (webFuzzerPageInfo) {
                // 用于表格显示最大数量
                fuzzerTableMaxDataRef.current.set(item.id, webFuzzerPageInfo.advancedConfigValue.resNumlimit)
                const httpParamsItem: FuzzerRequestProps = {
                    ...advancedConfigValueToFuzzerRequests(webFuzzerPageInfo.advancedConfigValue),
                    RequestRaw: Buffer.from(webFuzzerPageInfo.request, "utf8"), // StringToUint8Array(request, "utf8"),
                    HotPatchCode: webFuzzerPageInfo.hotPatchCode,
                    HotPatchCodeWithParamGetter: hotPatchCodeWithParamGetterRef.current,
                    // 并发模式下禁用继承，避免并发请求之间互相干扰
                    InheritCookies: item.inheritCookies,
                    InheritVariables: item.inheritVariables,
                    FuzzerIndex: item.id,
                    FuzzerTabIndex: item.pageId,
                    EngineDropPacket: true
                }
                setRequest(item.id, webFuzzerPageInfo.advancedConfigValue)
                httpParams.push(httpParamsItem)
            }
        })
        return httpParams
    })

    const isShowSequenceResponse = useMemo(() => {
        return currentSequenceItem && currentSequenceItem.id && currentSelectRequest
    }, [currentSequenceItem, currentSelectRequest])

    const onValidateMatcherAndExtraction = useMemoizedFn(() => {
        validateME()
            .catch(() => {})
            .finally(() => {
                onStartExecution()
            })
    })

    const onStartExecution = useMemoizedFn(() => {
        const i = currentList.findIndex((ele) => !ele.pageId)
        if (i !== -1) {
            setErrorIndex(i)
            yakitNotify("error", t(isConcurrency ?  'FuzzerConcurrency.execute_after_concurrency' : "FuzzerSequence.execute_after_sequence"))
            return
        }
        setLoading(true)
        onClearRef()
        fuzzerTableMaxDataRef.current.clear()
        resetResponse()

        updateConcurrentLoad("rps", [])
        updateConcurrentLoad("cps", [])

        resetDroppedCount()
        droppedSequenceIndexMapRef.current.clear()

        setCurrentSelectResponse(undefined)
        const newList = currentList.map((item) => ({...item, disabled: true}))
        setCurrentList([...newList])
        
        const httpParams = getHttpParams()
        if (isConcurrency) {
            const ConcurrencyAdvancedConfigValue = pageGroupData?.pageParamsInfo?.ConcurrencyAdvancedConfigValue;
            const params = {
                Requests: httpParams,
            }
            if(ConcurrencyAdvancedConfigValue){
                const { repeatTimes, disableUseConnPool, concurrent, minDelaySeconds, maxDelaySeconds } = ConcurrencyAdvancedConfigValue
                Object.assign(params, {
                    Concurrent: 0,
                    Overrides: {
                        RepeatTimes: repeatTimes,
                        Concurrent: concurrent,
                        DelayMinSeconds: +minDelaySeconds,
                        DelayMaxSeconds: +maxDelaySeconds,
                        DisableUseConnPool: disableUseConnPool,
                    }
                })
            }
            startConcurrency(params)
        } else {
            ipcRenderer.invoke("HTTPFuzzerSequence", {Requests: httpParams}, fuzzTokenRef.current)
        }
    })
    const onForcedStop = useMemoizedFn(() => {
        setLoading(false)
        if (isConcurrency) {
            cancelConcurrency()
        } else {
            ipcRenderer.invoke("cancel-HTTPFuzzerSequence", fuzzTokenRef.current)
        }
    })
    const onAddSequenceNode = useMemoizedFn(() => {
        if (isEmptySequence(currentList)) {
            yakitNotify("error", t("FuzzerSequence.configure_before_adding"))
            return
        }
        const addItem: SequenceProps = {
            id: `${randomString(8)}-${currentList.length + 1}`,
            name: `Step [${currentList.length}]`,
            pageId: "",
            pageName: "",
            pageGroupId: "",
            inheritCookies: true,
            inheritVariables: true
        }
        setCurrentSequenceItem({...addItem})
        setCurrentList([...currentList, addItem])
    })
    const onApplyOtherNodes = useMemoizedFn((extraSetting: ExtraSettingProps) => {
        const newList = currentList.map((item) => ({
            ...item,
            ...extraSetting
        }))
        setCurrentList([...newList])
        yakitNotify("success", t("FuzzerSequence.application_success"))
    })
    const onRemoveNode = useMemoizedFn((index: number) => {
        if (index === errorIndex) {
            setErrorIndex(-1)
        }
        if (currentList.length <= 1) {
            const newItem: SequenceProps = {
                id: "1",
                name: `Step [0]`,
                pageId: "",
                pageGroupId: "",
                pageName: "",
                inheritCookies: true,
                inheritVariables: true
            }
            setCurrentList([newItem])
            setCurrentSequenceItem({...newItem})
            setIsShowSetting(false)
        } else {
            if (currentSequenceItem?.id === currentList[index].id) {
                setCurrentSequenceItem(currentList[index - 1])
            }
            const newList = [...currentList]
            newList.splice(index, 1)
            setCurrentList(newList)
        }
    })
    /**单个返回Response 打开匹配器和提取器编辑，切换选中项或者点击开始执行时，需要先验证用户是否要应用最新得数据 */
    const validateME = useMemoizedFn(() => {
        return new Promise((resolve, reject) => {
            if (isShowSequenceResponse && sequenceResponseRef && sequenceResponseRef.current) {
                sequenceResponseRef.current
                    .validate()
                    .then(() => {
                        resolve(true)
                    })
                    .catch(reject)
            } else {
                resolve(true)
            }
        })
    })
    const onSelect = useMemoizedFn(async (val: SequenceProps) => {
        if (!val.pageId) {
            yakitNotify("error", t(isConcurrency ? "FuzzerConcurrency.select_after_configuring_concurrency": "FuzzerSequence.select_after_configuring_sequence"))
            return
        }
        validateME()
            .catch(() => {})
            .finally(() => {
                if (!currentSequenceItem || !currentSequenceItem.pageId) {
                    setIsShowSetting(true)
                }
                setCurrentSequenceItem({...val})
            })
    })

    /**显示页面的高级配置部分参数 */
    const onShowSetting = useMemoizedFn((val: SequenceProps) => {
        if (!val.pageId) {
            yakitNotify("error", t("FuzzerSequence.please_select_page"))
            return
        }
        onSelect(val)
        if (currentSequenceItem?.pageId !== val?.pageId) return
        if (currentSequenceItem) {
            setIsShowSetting(!isShowSetting)
        } else {
            setIsShowSetting(true)
        }
    })

    const setHotPatchCodeRef = (val) => {
        hotPatchCodeRef.current = val
        setTimeout(() => {
            if (webFuzzerNewEditorRef.current?.reqEditor) {
                setEditorContext(webFuzzerNewEditorRef.current.reqEditor, "hotPatchCode", val)
            }
        }, 500)
    }
    const setHotPatchCode = useMemoizedFn((val) => {
        setHotPatchCodeRef(val)
        if (!currentSelectRequest?.pageId) return
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(
            YakitRoute.HTTPFuzzer,
            currentSelectRequest.pageId
        )
        if (!currentItem) return
        if (currentItem.pageParamsInfo.webFuzzerPageInfo) {
            const newCurrentItem: PageNodeItemProps = {
                ...currentItem,
                pageParamsInfo: {
                    webFuzzerPageInfo: {
                        ...currentItem.pageParamsInfo.webFuzzerPageInfo,
                        hotPatchCode: val
                    }
                }
            }
            updatePagesDataCacheById(YakitRoute.HTTPFuzzer, {...newCurrentItem})
        }
    })
    const setHotPatchCodeWithParamGetter = useMemoizedFn((val) => {
        hotPatchCodeWithParamGetterRef.current = val
        setTimeout(() => {
            if (webFuzzerNewEditorRef.current?.reqEditor) {
                setEditorContext(webFuzzerNewEditorRef.current.reqEditor, "hotPatchCodeWithParam", val)
            }
        }, 500)
    })

    const allRuntimeIds = () => {
        const myArray1 = Array.from(responseMap)
        const length = myArray1.length
        const runtimeIdsFuzzer: string[] = []
        for (let index = 0; index < length; index++) {
            const element = myArray1[index][1]
            if (element) {
                runtimeIdsFuzzer.push(...element.runtimeIdFuzzer)
            }
        }
        return [...new Set(runtimeIdsFuzzer)]
    }

    const judgeMoreFuzzerTableMaxData = () => {
        const myArray1 = Array.from(responseMap)
        const length = myArray1.length
        let flag: boolean = false
        for (let index = 0; index < length; index++) {
            const element = myArray1[index][1]
            if (element) {
                if (element.successCount >= (fuzzerTableMaxDataRef.current.get(element.id) || DefFuzzerTableMaxData)) {
                    flag = true
                    return flag
                }
            }
        }
        return flag
    }
    /**调试匹配器和提取器 */
    const onDebug = useMemoizedFn((value: DebugProps) => {
        setMatcherAndExtractionHttpResponse(value.httpResponse)
        setActiveType(value.type)
        switch (value.type) {
            case "extractors":
                setActiveKey(value.activeKey)
                break
            case "matchers":
                setDefActiveKeyAndOrder({
                    order: value.order || 0,
                    defActiveKey: value.activeKey
                })
                break
            default:
                break
        }
        if (currentSelectResponse) {
            const count = currentSelectResponse.failedCount + currentSelectResponse.successCount
            if (count === 1) {
                setShowMatcherAndExtraction(true)
            } else {
                setVisibleDrawer(true)
            }
        } else {
            setVisibleDrawer(true)
        }
    })
    /**关闭匹配器或提取器 */
    const onCloseMatcherAndExtractionDrawer = useMemoizedFn(() => {
        setVisibleDrawer(false)
    })
    /**保存匹配器/提取器数据 */
    const onSaveMatcherAndExtractionDrawer = useMemoizedFn(
        (matcher: MatcherValueProps, extractor: ExtractorValueProps) => {
            if (!currentSelectRequest?.pageId) return
            const currentItem: PageNodeItemProps | undefined = queryPagesDataById(
                YakitRoute.HTTPFuzzer,
                currentSelectRequest.pageId
            )
            if (!currentItem) return
            if (
                currentItem.pageParamsInfo.webFuzzerPageInfo &&
                currentItem.pageParamsInfo.webFuzzerPageInfo.advancedConfigValue
            ) {
                const newCurrentItem: PageNodeItemProps = {
                    ...currentItem,
                    pageParamsInfo: {
                        webFuzzerPageInfo: {
                            ...currentItem.pageParamsInfo.webFuzzerPageInfo,
                            advancedConfigValue: {
                                ...currentItem.pageParamsInfo.webFuzzerPageInfo.advancedConfigValue,
                                matchers: matcher.matchersList || [],
                                extractors: extractor.extractorList || []
                            }
                        }
                    }
                }
                updatePagesDataCacheById(YakitRoute.HTTPFuzzer, {...newCurrentItem})
                setTriggerPageSetting(!triggerPageSetting)
                setShowMatcherAndExtraction(false)
            }
        }
    )
    /**保存页面数据*/
    const onSavePageAdvancedConfigValue = useMemoizedFn((configValue: AdvancedConfigValueProps) => {
        if (!currentSelectRequest?.pageId) return
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(
            YakitRoute.HTTPFuzzer,
            currentSelectRequest.pageId
        )
        if (!currentItem) return
        if (
            currentItem.pageParamsInfo.webFuzzerPageInfo &&
            currentItem.pageParamsInfo.webFuzzerPageInfo.advancedConfigValue
        ) {
            const newCurrentItem: PageNodeItemProps = {
                ...currentItem,
                pageParamsInfo: {
                    webFuzzerPageInfo: {
                        ...currentItem.pageParamsInfo.webFuzzerPageInfo,
                        advancedConfigValue: {
                            ...currentItem.pageParamsInfo.webFuzzerPageInfo.advancedConfigValue,
                            ...configValue
                        }
                    }
                }
            }
            updatePagesDataCacheById(YakitRoute.HTTPFuzzer, {...newCurrentItem})
        }
    })
    /**多条数据返回的第一条数据的ResponseRaw,一条数据就返回这一条的 ResponseRaw */
    const defaultHttpResponse: string = useMemo(() => {
        if (currentSelectResponse) {
            const {onlyOneResponse, successFuzzer} = currentSelectResponse
            if (successFuzzer.length > 1) {
                const firstSuccessResponse = successFuzzer[0]
                return Uint8ArrayToString(firstSuccessResponse.ResponseRaw || "")
            } else {
                return Uint8ArrayToString(onlyOneResponse.ResponseRaw || "")
            }
        } else {
            return Uint8ArrayToString(emptyFuzzer.ResponseRaw || "")
        }
    }, [currentSelectResponse, currentSelectRequest])
    /**提取器和匹配器的值 */
    const matcherAndExtractionValue: MatcherAndExtractionValueProps = useCreation(() => {
        const matchData: MatcherValueProps = {
            matchersList: []
        }
        const extractorData: ExtractorValueProps = {
            extractorList: []
        }
        let data = {
            matcher: {...matchData},
            extractor: {...extractorData}
        }
        if (!currentSequenceItem) {
            return data
        }
        const currentSequenceRequest = getCurrentSequenceRequest(currentSequenceItem.pageId)
        if (currentSequenceRequest?.pageParamsInfo.webFuzzerPageInfo) {
            const {advancedConfigValue} = currentSequenceRequest?.pageParamsInfo.webFuzzerPageInfo || {
                request: "",
                advancedConfigValue: {...defaultAdvancedConfigValue}
            }
            data.matcher = {
                matchersList: advancedConfigValue.matchers || []
            }
            data.extractor = {
                extractorList: advancedConfigValue.extractors || []
            }
        }
        return data
    }, [currentSelectRequest, visibleDrawer, showMatcherAndExtraction, triggerME])
    const onPluginDebugger = useMemoizedFn((yamlContent) => {
        setVisiblePluginDrawer(true)
        setPluginDebugCode(yamlContent)
    })

    const onSetAdvancedConfigValue = useMemoizedFn((configValue) => {
        setCurrentSelectRequest({
            ...currentSelectRequest,
            advancedConfigValue: configValue
        } as WebFuzzerPageInfoProps)
        onSavePageAdvancedConfigValue(configValue)
    })

    const onShowAllHeader = useMemoizedFn(() => {
        setTrafficAnalysisType("all") // 设置为查看全部
        setTrafficAnalysisVisible(true)
        // if (judgeMoreFuzzerTableMaxData()) {
        //     // let currentItem: PageNodeItemProps | undefined = undefined
        //     // if (currentSelectRequest?.pageId) {
        //     //     currentItem = queryPagesDataById(YakitRoute.HTTPFuzzer, currentSelectRequest?.pageId)
        //     // }
        //     // emiter.emit(
        //     //     "openPage",
        //     //     JSON.stringify({
        //     //         route: YakitRoute.DB_HTTPHistoryAnalysis,
        //     //         params: {
        //     //             webFuzzer: true,
        //     //             runtimeId: allRuntimeIds(),
        //     //             sourceType: "scan",
        //     //             verbose: currentItem?.pageName ? `${currentItem?.pageName}-${t("FuzzerSequence.allTraffic")}` : "",
        //     //             pageId: currentItem?.pageId || ""
        //     //         }
        //     //     })
        //     // )
        // } else {
        //     setShowAllResponse(true)
        // }
    })

    const onShowAll = useMemoizedFn(() => {
        if (!currentSequenceItem) return
        setTrafficAnalysisType("single") // 设置为查看单个序列
        setTrafficAnalysisVisible(true)
        // let currentItem: PageNodeItemProps | undefined = undefined
        // if (currentSelectRequest?.pageId) {
        //     currentItem = queryPagesDataById(YakitRoute.HTTPFuzzer, currentSelectRequest?.pageId)
        // }

        // emiter.emit(
        //     "openPage",
        //     JSON.stringify({
        //         route: YakitRoute.DB_HTTPHistoryAnalysis,
        //         params: {
        //             webFuzzer: true,
        //             runtimeId: currentSelectResponse?.runtimeIdFuzzer || [],
        //             sourceType: "scan",
        //             verbose: currentItem?.pageName
        //                 ? `${currentItem?.pageName}-${currentSequenceItem.name}-${t("FuzzerSequence.allTraffic")}`
        //                 : "",
        //             pageId: currentItem?.pageId || ""
        //         }
        //     })
        // )
    })

    const onDebugSequenceResponse = useMemoizedFn((response) => {
        onDebug({httpResponse: response, type: "matchers", activeKey: "ID:0", order: 0})
    })

    const handleAdvancedSetSave = useMemoizedFn((values) => {
        const pageData = queryPagesDataById(YakitRoute.HTTPFuzzer, selectGroupId)
        if (!pageData?.pageParamsInfo?.webFuzzerPageInfo) return
        
        const newCurrentItem: PageNodeItemProps = {
            ...pageData,
            pageParamsInfo: {
                ...pageData.pageParamsInfo,
                ConcurrencyAdvancedConfigValue: values
            }
        }
        updatePagesDataCacheById(YakitRoute.HTTPFuzzer, newCurrentItem)
    })

    const getContainerSize = useSize(fuzzerSequenceRef || document.body)
    // 抽屉展示高度
    const showHeight = useMemo(() => getContainerSize?.height || 400, [getContainerSize])

    /* 流量分析遮罩层 */
    const renderHistoryAnalysis = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = currentSelectRequest?.pageId 
            ? queryPagesDataById(YakitRoute.HTTPFuzzer, currentSelectRequest.pageId)
            : undefined
        
        if (!trafficAnalysisVisible || !currentItem) return null
        
        // 根据 trafficAnalysisType 判断是显示全部还是单个序列的流量
        const runtimeId = trafficAnalysisType === "single" && currentSequenceItem && currentSelectResponse?.runtimeIdFuzzer 
            ? currentSelectResponse.runtimeIdFuzzer 
            : allRuntimeIds()
        
        const verbose = trafficAnalysisType === "single" && currentSequenceItem 
            ? `${currentItem.pageName}-${currentSequenceItem.name}-${t("FuzzerSequence.allTraffic")}`
            : `${currentItem.pageName}-${t("FuzzerSequence.allTraffic")}`
        
        const params = {
            webFuzzer: true,
            runtimeId: runtimeId,
            sourceType: "scan",
            verbose: verbose,
            pageId: currentItem.pageId
        }
        
        return (
            <YakitDrawer
                getContainer={fuzzerSequenceRef.current || document.body}
                placement='bottom'
                mask={false}
                keyboard={false}
                height={showHeight}
                visible={true}
                onClose={() => setTrafficAnalysisVisible(false)}
                className={styles["http-traffic-analysis-overlay"]}
            >
                <React.Suspense fallback={<YakitSpin spinning={true} />}>
                    <HTTPHistoryAnalysis
                        pageId={currentItem.pageId}
                        params={params}
                        closable={false}
                    />
                </React.Suspense>
            </YakitDrawer>
        )
    })

    const emptyMap = useMemo(() => new Map(), [])

    return (
        <>
            <div
                className={styles["fuzzer-sequence"]}
                style={{display: showAllResponse ? "none" : ""}}
                ref={fuzzerSequenceRef}
            >
                <div className={styles["fuzzer-sequence-left"]} style={{width: i18n.language === "zh" ? 300 : 400}}>
                    <div className={styles["fuzzer-sequence-left-heard"]} style={{width: i18n.language === "zh" ? 300 : 400}}>
                        <span
                            className={styles["fuzzer-sequence-left-heard-text"]}
                            onClick={() => {
                                if(isConcurrency) return;
                                const m = showYakitModal({
                                    type: "white",
                                    title: (
                                        <div className={styles["sequence-animation-pop-title"]}>
                                            {t("FuzzerSequence.webfuzzer_sequence_demo")}
                                            <div
                                                className={styles["subtitle-help-wrapper"]}
                                                onClick={() =>
                                                    ipcRenderer.invoke("open-url", WebsiteGV.WebFuzzerAddress)
                                                }
                                            >
                                                <span className={styles["text-style"]}>
                                                    {t("FuzzerSequence.official_documentation")}
                                                </span>
                                                <OutlineQuestionmarkcircleIcon />
                                            </div>
                                        </div>
                                    ),
                                    width: 650,
                                    content: <SequenceAnimationAemonstration></SequenceAnimationAemonstration>,
                                    footer: null,
                                    centered: true,
                                    destroyOnClose: true
                                })
                            }}
                        >
                            {isConcurrency ? <>
                                {pageGroupData?.pageName}
                                <OutlineCogIcon 
                                    onClick={() => setAdvancedSetVisible(true)} 
                                    className={styles["fuzzer-sequence-left-heard-setting"]}
                                />
                                <AdvancedSet
                                    advancedConfigValue={pageGroupData?.pageParamsInfo.ConcurrencyAdvancedConfigValue || initSetValue}
                                    visible={advancedSetVisible}
                                    onSave={handleAdvancedSetSave}
                                    onCancel={()=> setAdvancedSetVisible(false)}
                                />
                            </> : 
                            <>
                                {t("FuzzerSequence.sequence_configuration")} 
                                <QuestionMarkCircleIcon />
                            </>
                            }
                        </span>
                        <div className={styles["fuzzer-sequence-left-heard-extra"]}>
                            <YakitButton type='text' disabled={loading} onClick={() => onAddSequenceNode()}>
                                {t(`${isConcurrency ? 'FuzzerConcurrency': 'FuzzerSequence'}.add_node`)}
                                <SolidPlusIcon className={styles["plus-icon"]} />
                            </YakitButton>
                            {loading ? (
                                <YakitButton
                                    onClick={() => onForcedStop()}
                                    icon={<SolidStopIcon className={styles["stop-icon"]} />}
                                    colors='danger'
                                    type={"primary"}
                                >
                                    {t("FuzzerSequence.force_stop")}
                                </YakitButton>
                            ) : (
                                <YakitButton
                                    onClick={onValidateMatcherAndExtraction}
                                    icon={<SolidPlayIcon className={styles["play-icon"]} />}
                                    type={"primary"}
                                >
                                    {t("YakitButton.start_execution")}
                                </YakitButton>
                            )}
                        </div>
                    </div>
                    <div className={styles["fuzzer-sequence-left-body"]}>
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId='droppable1'>
                                {(provided, snapshot) => {
                                    return (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className={styles["fuzzer-sequence-list"]}
                                        >
                                            {currentList.map((sequenceItem, index) => {
                                                return (
                                                    <Draggable
                                                        key={sequenceItem.id}
                                                        draggableId={sequenceItem.id}
                                                        index={index}
                                                        isDragDisabled={loading || isConcurrency}
                                                    >
                                                        {(providedItem, snapshotItem) => (
                                                            <div
                                                                ref={providedItem.innerRef}
                                                                {...providedItem.draggableProps}
                                                                {...providedItem.dragHandleProps}
                                                                style={getItemStyle(
                                                                    snapshotItem.isDragging,
                                                                    providedItem.draggableProps.style
                                                                )}
                                                            >
                                                                {(() => {
                                                                    const commonProps = {
                                                                        pageNodeList: currentOriginList,
                                                                        item: sequenceItem,
                                                                        isSelect: currentSequenceItem?.id === sequenceItem.id,
                                                                        index,
                                                                        errorIndex,
                                                                        isDragging: snapshotItem.isDragging,
                                                                        disabled: sequenceItem.disabled,
                                                                        isShowLine: loading && index === currentList.length - 1,
                                                                        onApplyOtherNodes,
                                                                        onUpdateItemPage: (item) => onUpdateItemPage(item, index),
                                                                        onUpdateItem: (item) => onUpdateItem(item, index),
                                                                        onRemove: () => onRemoveNode(index),
                                                                        onSelect,
                                                                        onShowSetting,
                                                                        isShowSetting,
                                                                        selectedList: currentList.map(({pageId})=>pageId)
                                                                    }
                                                                    const ItemComponent = isConcurrency ? ConcurrencyItem : SequenceItem
                                                                    return <ItemComponent {...commonProps} />
                                                                })()}
                                                                
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                )
                                            })}
                                            {provided.placeholder}
                                        </div>
                                    )
                                }}
                            </Droppable>
                        </DragDropContext>

                        {!loading && !isConcurrency &&  (
                            <div className={styles["plus-sm-icon-body"]}>
                                {currentList.length > 0 && (
                                    <div className={classNames(styles["inherit-line-icon"])}>
                                        <InheritLineIcon />
                                    </div>
                                )}
                                <OutlinePlussmIcon
                                    className={styles["plus-sm-icon"]}
                                    onClick={() => onAddSequenceNode()}
                                />
                            </div>
                        )}
                        <div className={styles["to-end"]}>{t("YakitEmpty.end_of_list")}</div>
                    </div>
                </div>
                <div
                    className={classNames(styles["fuzzer-sequence-midden"], {
                        [styles["fuzzer-sequence-midden-hidden"]]: !isShowSetting
                    })}
                >
                    <div className={styles["setting-heard"]}>
                        <span>
                            {isConcurrency ? currentSequenceItem?.pageName : 
                                currentSequenceItem?.name}&nbsp;{t("FuzzerSequence.config")
                            }
                        </span>
                        <YakitButton type='text2' icon={<OutlineXIcon />} onClick={() => setIsShowSetting(false)} />
                    </div>
                    {currentSequenceItem && !!currentSequenceItem.pageId && (
                        <React.Suspense fallback={<>loading...</>}>
                            <FuzzerPageSetting
                                pageId={currentSequenceItem.pageId}
                                defaultHttpResponse={defaultHttpResponse}
                                triggerIn={triggerPageSetting}
                                triggerOut={triggerME}
                                setTriggerOut={setTriggerME}
                                onDebug={onDebug}
                            />
                        </React.Suspense>
                    )}
                </div>
                <div className={classNames(styles["fuzzer-sequence-content"])}>
                    {currentSequenceItem && isShowSequenceResponse ? (
                        <>
                            <SequenceResponseHeard
                                currentSequenceItemName={currentSequenceItem.name}
                                currentSequenceItemPageName={currentSequenceItem.pageName}
                                disabled={responseMap.size === 0 || loading}
                                responseInfo={currentSelectResponse}
                                advancedConfigValue={currentSelectRequest?.advancedConfigValue}
                                setAdvancedConfigValue={onSetAdvancedConfigValue}
                                droppedCount={getDroppedCount(currentSequenceItem.id) || 0}
                                onShowAll={onShowAllHeader}
                                getHttpParams={getHttpParams}
                                onPluginDebugger={onPluginDebugger}
                                isConcurrency={isConcurrency}
                            />
                            <SequenceResponse
                                ref={sequenceResponseRef}
                                requestInfo={currentSelectRequest}
                                responseInfo={currentSelectResponse}
                                loading={loading}
                                extractedMap={extractedMap.get(currentSequenceItem.id) || emptyMap}
                                hotPatchCode={hotPatchCodeRef.current}
                                hotPatchCodeWithParamGetter={hotPatchCodeWithParamGetterRef.current}
                                setHotPatchCode={setHotPatchCode}
                                setHotPatchCodeWithParamGetter={setHotPatchCodeWithParamGetter}
                                onShowAll={onShowAll}
                                onDebug={onDebugSequenceResponse}
                                matcherValue={matcherAndExtractionValue.matcher}
                                extractorValue={matcherAndExtractionValue.extractor}
                                showMatcherAndExtraction={showMatcherAndExtraction}
                                setShowMatcherAndExtraction={setShowMatcherAndExtraction}
                                onSaveMatcherAndExtractionDrawer={onSaveMatcherAndExtractionDrawer}
                                activeType={activeType}
                                activeKey={activeKey}
                                defActiveKeyAndOrder={defActiveKeyAndOrder}
                                webFuzzerNewEditorRef={webFuzzerNewEditorRef}
                                inViewport={inViewport === true}
                                isConcurrency={isConcurrency}
                            />
                        </>
                    ) : (
                        <YakitEmpty title={t(isConcurrency ? "FuzzerConcurrency.select_webfuzzer_with_concurrency_tip":"FuzzerSequence.select_webfuzzer_with_sequence_tip")} />
                    )}
                </div>
            </div>

            <React.Suspense fallback={<>loading...</>}>
                <ResponseCard
                    showAllResponse={showAllResponse}
                    responseMap={responseMap}
                    setShowAllResponse={() => setShowAllResponse(false)}
                ></ResponseCard>
                <PluginDebugDrawer
                    getContainer={fuzzerSequenceRef.current}
                    route={YakitRoute.HTTPFuzzer}
                    defaultCode={pluginDebugCode}
                    visible={visiblePluginDrawer}
                    setVisible={setVisiblePluginDrawer}
                />
            </React.Suspense>
            <MatcherAndExtractionDrawer
                visibleDrawer={visibleDrawer}
                defActiveType={activeType}
                httpResponse={matcherAndExtractionHttpResponse}
                defActiveKey={activeKey}
                matcherValue={matcherAndExtractionValue.matcher}
                extractorValue={matcherAndExtractionValue.extractor}
                onClose={onCloseMatcherAndExtractionDrawer}
                onSave={onSaveMatcherAndExtractionDrawer}
                defActiveKeyAndOrder={defActiveKeyAndOrder}
            />
            {renderHistoryAnalysis()}
        </>
    )
})

export default FuzzerSequence

const SequenceItem: React.FC<SequenceItemProps> = React.memo((props) => {
    const {
        item,
        pageNodeList,
        index,
        isDragging,
        disabled,
        errorIndex,
        isSelect,
        onUpdateItemPage,
        onUpdateItem,
        onApplyOtherNodes,
        onRemove,
        onSelect,
        onShowSetting,
        isShowSetting
    } = props
    const {t, i18n} = useI18nNamespaces(["webFuzzer"])
    const [selectVisible, setSelectVisible] = useState<boolean>(false)
    const [visible, setVisible] = useState<boolean>(false)
    const [editNameVisible, setEditNameVisible] = useState<boolean>(false)
    const [name, setName] = useState<string>(item.name)

    const selectRef = useRef(null)
    const isHovering = useHover(selectRef)

    const options = useCreation(() => {
        return pageNodeList.map((ele) => ({
            value: ele.pageId,
            label: ele.pageName
        }))
    }, [pageNodeList])
    const tipText = useMemo(() => {
        const tArr: string[] = []
        if (item?.inheritVariables) tArr.push(t("SequenceItem.variable"))
        if (item?.inheritCookies) tArr.push("Cookie")
        return tArr.join("  ,  ")
    }, [item?.inheritVariables, item?.inheritCookies, i18n.language])
    const onSelectSubMenuById = useMemoizedFn((pageId: string) => {
        emiter.emit("switchSubMenuItem", JSON.stringify({pageId}))
    })
    const isActive = useCreation(() => {
        return isShowSetting && isSelect
    }, [isShowSetting, isSelect])

    const selectValue = useMemo(
        () => ({
            value: item.pageId,
            label: item.pageName
        }),
        [item.pageId, item.pageName]
    )

    return (
        <>
            {index > 0 && (
                <div
                    className={styles["fuzzer-sequence-list-item-footer"]}
                    style={{
                        opacity: isDragging ? 0 : 1
                    }}
                >
                    <div
                        className={classNames(styles["fuzzer-sequence-list-item-footer-line"], {
                            [styles["fuzzer-sequence-list-item-footer-line-primary"]]:
                                item?.inheritVariables || item?.inheritCookies
                        })}
                    >
                        <InheritLineIcon />
                    </div>
                    {(item?.inheritVariables || item?.inheritCookies) && (
                        <>
                            <div className={styles["fuzzer-sequence-list-item-footer-tag"]}>{tipText}</div>
                            <InheritArrowIcon />
                        </>
                    )}
                </div>
            )}
            <div
                className={styles["fuzzer-sequence-list-item-body"]}
                onClick={() => {
                    if (disabled) return
                    onSelect(item)
                }}
            >
                <div
                    className={classNames(styles["fuzzer-sequence-list-item"], {
                        [styles["fuzzer-sequence-list-item-hover"]]: visible,
                        [styles["fuzzer-sequence-list-item-hover-none"]]: disabled || isHovering,
                        [styles["fuzzer-sequence-list-item-disabled"]]: disabled,
                        [styles["fuzzer-sequence-list-item-isDragging"]]: isDragging,
                        [styles["fuzzer-sequence-list-item-isSelect"]]: isSelect,
                        [styles["fuzzer-sequence-list-item-errorIndex"]]: errorIndex === index
                    })}
                >
                    <div className={styles["fuzzer-sequence-list-item-heard"]}>
                        <div className={styles["fuzzer-sequence-list-item-heard-title"]}>
                            <SolidDragsortIcon
                                className={classNames(styles["drag-sort-icon"], {
                                    [styles["drag-sort-disabled-icon"]]: disabled
                                })}
                            />
                            <Tooltip title={item.name}>
                                <span className='content-ellipsis'>{item.name}</span>
                            </Tooltip>
                            <YakitPopover
                                overlayClassName={styles["edit-name-popover"]}
                                content={
                                    <div
                                        className={styles["edit-name-popover-content"]}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                        }}
                                    >
                                        <div style={{color: "var(--Colors-Use-Neutral-Text-1-Title)"}}>
                                            {t("SequenceItem.edit_name")}
                                        </div>
                                        <YakitInput
                                            defaultValue={item.name}
                                            value={name}
                                            showCount
                                            maxLength={20}
                                            onChange={(e) => {
                                                const {value} = e.target
                                                setName(value)
                                            }}
                                            onBlur={(e) => {
                                                const {value} = e.target
                                                if (!value) {
                                                    yakitNotify("error", t("SequenceItem.name_cannot_be_empty"))
                                                    return
                                                }
                                                if (value.length > 20) {
                                                    yakitNotify("error", t("SequenceItem.max_20_characters"))
                                                    return
                                                }
                                                onUpdateItem({...item, name: value})
                                            }}
                                        />
                                    </div>
                                }
                                placement='top'
                                trigger={["click"]}
                                visible={editNameVisible}
                                onVisibleChange={setEditNameVisible}
                            >
                                <YakitButton
                                    icon={<OutlinePencilaltIcon />}
                                    isActive={editNameVisible}
                                    type='text2'
                                    disabled={disabled}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                    }}
                                />
                            </YakitPopover>
                        </div>
                        <div className={styles["fuzzer-sequence-list-item-heard-extra"]}>
                            <YakitButton
                                icon={<OutlineTrashIcon />}
                                type='text2'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onRemove(item)
                                }}
                                disabled={disabled}
                            />
                            <Divider type='vertical' style={{margin: 0}} />
                            <YakitButton
                                icon={<OutlineCogIcon />}
                                type='text2'
                                isActive={isActive}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onShowSetting(item)
                                }}
                                disabled={disabled}
                            />

                            {index > 0 && (
                                <>
                                    <Divider type='vertical' style={{margin: 0}} />
                                    <YakitPopover
                                        title={
                                            <div className={styles["cog-popover-heard"]}>
                                                <span className={styles["cog-popover-heard-title"]}>
                                                    {t("SequenceItem.node_configuration")}
                                                </span>
                                                <span
                                                    className={styles["cog-popover-heard-extra"]}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onApplyOtherNodes({
                                                            inheritVariables: item.inheritVariables,
                                                            inheritCookies: item.inheritCookies
                                                        })
                                                    }}
                                                >
                                                    {t("SequenceItem.apply_to_other_nodes")}
                                                </span>
                                            </div>
                                        }
                                        content={
                                            <div className={styles["cog-popover-content"]}>
                                                <LabelNodeItem
                                                    label={t("SequenceItem.inherit_variables")}
                                                    labelClassName={styles["cog-popover-content-item"]}
                                                >
                                                    <YakitSwitch
                                                        checked={item.inheritVariables}
                                                        onChange={(checked) =>
                                                            onUpdateItem({...item, inheritVariables: checked})
                                                        }
                                                    />
                                                </LabelNodeItem>
                                                <LabelNodeItem
                                                    label={t("SequenceItem.inherit_cookie")}
                                                    labelClassName={styles["cog-popover-content-item"]}
                                                >
                                                    <YakitSwitch
                                                        checked={item.inheritCookies}
                                                        onChange={(checked) =>
                                                            onUpdateItem({...item, inheritCookies: checked})
                                                        }
                                                    />
                                                </LabelNodeItem>
                                            </div>
                                        }
                                        visible={visible}
                                        onVisibleChange={(v) => {
                                            if (disabled) return
                                            if (!item.pageId) return
                                            setVisible(v)
                                        }}
                                        overlayClassName={styles["cog-popover"]}
                                    >
                                        <YakitButton
                                            icon={<SolidSwitchConfigurationIcon />}
                                            type='text2'
                                            disabled={disabled}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                            }}
                                        />
                                    </YakitPopover>
                                </>
                            )}
                            <Divider type='vertical' style={{margin: 0}} />
                            <Tooltip title={t("SequenceItem.go_to_fuzzer_configuration")}>
                                <YakitButton
                                    icon={<OutlineArrowcirclerightIcon />}
                                    type='text2'
                                    disabled={disabled}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (disabled) return
                                        if (!item.pageId) {
                                            yakitNotify("error", t("SequenceItem.please_select_page"))
                                        } else {
                                            onSelectSubMenuById(item.pageId)
                                        }
                                    }}
                                />
                            </Tooltip>
                        </div>
                    </div>
                    <div
                        ref={selectRef}
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                    >
                        <YakitSelect
                            value={selectValue}
                            labelInValue
                            options={options}
                            onChange={(v) => {
                                onUpdateItemPage({...item, pageId: v.value, pageName: v.label})
                            }}
                            getPopupContainer={(dom) => dom}
                            disabled={disabled}
                            onDropdownVisibleChange={(v) => {
                                setSelectVisible(v)
                            }}
                            open={selectVisible && !isDragging}
                        />
                    </div>
                </div>
            </div>
        </>
    )
})

const SequenceResponseHeard: React.FC<SequenceResponseHeardProps> = React.memo((props) => {
    const {
        advancedConfigValue,
        droppedCount,
        responseInfo,
        disabled,
        onShowAll,
        currentSequenceItemName,
        currentSequenceItemPageName,
        setAdvancedConfigValue,
        getHttpParams,
        onPluginDebugger,
        isConcurrency,
    } = props
    const {t, i18n} = useI18nNamespaces(["webFuzzer"])
    const {
        onlyOneResponse: httpResponse,
        successCount,
        failedCount
    } = responseInfo || {
        id: "0",
        onlyOneResponse: {...emptyFuzzer},
        successFuzzer: [],
        failedFuzzer: [],
        successCount: 0,
        failedCount: 0
    }
    const cachedTotal: number = useCreation(() => {
        return failedCount + successCount
    }, [failedCount, successCount])
    const onlyOneResponse: boolean = useCreation(() => {
        return cachedTotal === 1
    }, [cachedTotal])

    // 跳转插件调试页面
    const handleSkipPluginDebuggerPage = async (tempType: "path" | "raw") => {
        const requests = getHttpParams()
        const params = {
            Requests: {Requests: Array.isArray(requests) ? requests : [getHttpParams()]},
            TemplateType: tempType
        }
        try {
            const {Status, YamlContent} = await ipcRenderer.invoke("ExportHTTPFuzzerTaskToYaml", params)
            if (Status.Ok) {
                onPluginDebugger(YamlContent)
            } else {
                throw new Error(Status.Reason)
            }
        } catch (error) {
            yakitFailed(error + "")
        }
    }

    return (
        <div className={styles["sequence-response-heard"]}>
            <div className={styles["sequence-response-heard-left"]}>
                {isConcurrency ? 
                    <span className={styles["sequence-response-heard-left-title"]}>
                        {currentSequenceItemPageName}
                    </span>
                : 
                <span>
                    <span className={styles["sequence-response-heard-left-title"]}>
                        {currentSequenceItemName || ""}
                    </span>
                    <span className={styles["sequence-response-heard-left-subTitle"]}>
                        {currentSequenceItemPageName || ""}
                    </span>
                </span>
                }
                <FuzzerExtraShow
                    droppedCount={droppedCount}
                    advancedConfigValue={advancedConfigValue || defaultAdvancedConfigValue}
                    setAdvancedConfigValue={setAdvancedConfigValue}
                    onlyOneResponse={onlyOneResponse}
                    httpResponse={httpResponse}
                />
            </div>
            <div style={{display: "flex"}}>
                {isConcurrency ? <Divider type='vertical' style={{ margin: 8, visibility: "hidden"}} /> : <>
                <ShareImportExportData
                    module='fuzzer'
                    supportShare={false}
                    supportImport={true}
                    getFuzzerRequestParams={getHttpParams}
                />
                <Divider type='vertical' style={{margin: 8}} />
                <YakitDropdownMenu
                    menu={{
                        data: [
                            {key: "pathTemplate", label: t("SequenceResponseHeard.generatePathTemplate")},
                            {key: "rawTemplate", label: t("SequenceResponseHeard.generateRawTemplate")}
                        ],
                        onClick: ({key}) => {
                            switch (key) {
                                case "pathTemplate":
                                    handleSkipPluginDebuggerPage("path")
                                    break
                                case "rawTemplate":
                                    handleSkipPluginDebuggerPage("raw")
                                    break
                                default:
                                    break
                            }
                        }
                    }}
                    dropdown={{
                        trigger: ["click"],
                        placement: "bottom"
                    }}
                >
                    <YakitButton type='primary' icon={<OutlineCodeIcon />}>
                        {t("SequenceResponseHeard.generateYamlTemplate")}
                    </YakitButton>
                </YakitDropdownMenu>
                </>}
                <YakitButton type='primary' disabled={disabled} onClick={() => onShowAll()} style={{marginLeft: 8}}>
                    {t("SequenceResponseHeard.show_all_responses")}
                </YakitButton>
            </div>
        </div>
    )
})

const SequenceResponse: React.FC<SequenceResponseProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {
            requestInfo,
            responseInfo,
            loading,
            extractedMap,
            hotPatchCode,
            setHotPatchCode,
            hotPatchCodeWithParamGetter,
            setHotPatchCodeWithParamGetter,
            onShowAll,
            onDebug,
            matcherValue,
            extractorValue,
            onSaveMatcherAndExtractionDrawer,
            activeKey,
            activeType,
            defActiveKeyAndOrder,
            webFuzzerNewEditorRef,
            inViewport,
            isConcurrency
        } = props
        const {t, i18n} = useI18nNamespaces(["webFuzzer", "yakitUi", "yakitRoute"])
        const {
            id: responseInfoId,
            onlyOneResponse: httpResponse,
            successFuzzer,
            failedFuzzer,
            successCount,
            failedCount,
            fuzzerTableMaxData,
            fuzzerResChartData
        } = responseInfo || {
            id: "0",
            onlyOneResponse: {...emptyFuzzer},
            successFuzzer: [],
            failedFuzzer: [],
            successCount: 0,
            failedCount: 0,
            fuzzerTableMaxData: DefFuzzerTableMaxData,
            fuzzerResChartData: []
        }
        const {request, advancedConfigValue, pageId} = requestInfo || {
            request: "",
            advancedConfigValue: {...defaultAdvancedConfigValue},
            pageId: ""
        }
        const [showSuccess, setShowSuccess] = useState<FuzzerShowSuccess>("true")
        const [query, setQuery] = useState<HTTPFuzzerPageTableQuery>()
        const [affixSearch, setAffixSearch] = useState<string>("")
        const [defaultResponseSearch, setDefaultResponseSearch] = useState<string>("")
        const [isRefresh, setIsRefresh] = useState<boolean>(false)

        const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false)

        const [showExtra, setShowExtra] = useState<boolean>(false) // Response中显示payload和提取内容
        const [showResponseInfoSecondEditor, setShowResponseInfoSecondEditor] = useState<boolean>(true)

        // 匹配器和提取器相关
        const [showMatcherAndExtraction, setShowMatcherAndExtraction] = useControllableValue<boolean>(props, {
            defaultValuePropName: "showMatcherAndExtraction",
            valuePropName: "showMatcherAndExtraction",
            trigger: "setShowMatcherAndExtraction"
        })
        const secondNodeRef = useRef(null)
        const secondNodeSize = useSize(secondNodeRef)

        const [onlyOneResEditor, setOnlyOneResEditor] = useState<IMonacoEditor>()
        const onlyOneResSelectionByteCount = useSelectionByteCount(onlyOneResEditor, 500)

        const successTableRef = useRef<any>()
        const requestHttpRef = useRef<string>(request)

        const cachedTotal: number = useCreation(() => {
            return failedCount + successCount
        }, [failedCount, successCount])
        const onlyOneResponse: boolean = useCreation(() => {
            return cachedTotal === 1
        }, [cachedTotal])

        const {queryPagesDataById, updatePagesDataCacheById} = usePageInfo(
            (s) => ({
                queryPagesDataById: s.queryPagesDataById,
                updatePagesDataCacheById: s.updatePagesDataCacheById
            }),
            shallow
        )
        useImperativeHandle(
            ref,
            () => ({
                validate: onValidateMatcherAndExtraction
            }),
            []
        )

        const responseViewerRef = useRef<MatcherAndExtractionRefProps>({
            validate: () => new Promise(() => {})
        })
        const onValidateMatcherAndExtraction = useMemoizedFn(() => {
            return new Promise((resolve: (val: boolean) => void, reject) => {
                try {
                    if (showMatcherAndExtraction && responseViewerRef.current) {
                        responseViewerRef.current
                            .validate()
                            .then((data: MatcherAndExtractionValueProps) => {
                                onSaveMatcherAndExtractionDrawer(data.matcher, data.extractor)
                                resolve(true)
                            })
                            .catch(reject)
                    } else {
                        resolve(true)
                    }
                } catch (error) {
                    reject(false)
                    yakitNotify("error", `${t("SequenceResponse.matcher_extractor_validation_failed")}${error}`)
                }
            })
        })
        useEffect(() => {
            getRemoteValue(HTTP_PACKET_EDITOR_Response_Info)
                .then((data) => {
                    setShowResponseInfoSecondEditor(data === "false" ? false : true)
                })
                .catch(() => {
                    setShowResponseInfoSecondEditor(true)
                })
        }, [])

        useEffect(() => {
            if (!pageId) return
            requestHttpRef.current = request
            setRefreshTrigger(!refreshTrigger)
        }, [pageId, request])

        useUpdateEffect(() => {
            if (successTableRef.current) {
                successTableRef.current.setCurrentSelectItem(undefined)
                successTableRef.current.setFirstFull(true)
            }
            setIsRefresh(!isRefresh)
            setQuery({})
        }, [responseInfoId])

        const onSetRequestHttp = useMemoizedFn((i: string) => {
            requestHttpRef.current = i
            onUpdatePageInfo(i, pageId || "")
        })
        const onUpdatePageInfo = useDebounceFn(
            (value: string, pId: string) => {
                if (!pId) return
                const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, pId)
                if (!currentItem) return
                if (currentItem.pageParamsInfo.webFuzzerPageInfo) {
                    if (value === currentItem.pageParamsInfo.webFuzzerPageInfo.request) return
                    const newCurrentItem: PageNodeItemProps = {
                        ...currentItem,
                        pageParamsInfo: {
                            webFuzzerPageInfo: {
                                ...currentItem.pageParamsInfo.webFuzzerPageInfo,
                                request: value
                            }
                        }
                    }
                    updatePagesDataCacheById(YakitRoute.HTTPFuzzer, {...newCurrentItem})
                }
            },
            {wait: 200, leading: true}
        ).run

        const [firstFull, setFirstFull] = useState<boolean>(false)
        const [secondFull, setSecondFull] = useState<boolean>(false)
        const ResizeBoxProps = useCreation(() => {
            let p = {
                firstRatio: "50%",
                secondRatio: "50%"
            }
            if (secondFull) {
                p.firstRatio = "0%"
            }
            if (firstFull) {
                p.secondRatio = "0%"
                p.firstRatio = "100%"
            }
            return p
        }, [firstFull, secondFull])

        const [hex, setHex] = useState<boolean>(false)
        const firstNodeExtra = () => (
            <>
                <YakitButton
                    size='small'
                    type='primary'
                    onClick={async () => {
                        if (!requestHttpRef.current) return
                        const beautifyValue = await prettifyPacketCode(requestHttpRef.current)
                        onSetRequestHttp(Uint8ArrayToString(beautifyValue as Uint8Array, "utf8"))
                        setRefreshTrigger(!refreshTrigger)
                    }}
                    style={{marginRight: 8}}
                >
                    {t("YakitButton.beautify")}
                </YakitButton>
                <YakitCheckableTag checked={hex} onChange={setHex}>
                    HEX
                </YakitCheckableTag>
                <YakitButton
                    size='small'
                    type='primary'
                    onClick={() => {
                        hotPatchTrigger()
                    }}
                >
                    {t("SequenceResponse.hotReload")}
                </YakitButton>
                <div className={styles["resize-card-icon"]} onClick={() => setFirstFull(!firstFull)}>
                    {firstFull ? <ArrowsRetractIcon /> : <ArrowsExpandIcon />}
                </div>
            </>
        )

        const secondNodeTitle = () => (
            <>
                <SecondNodeTitle
                    cachedTotal={cachedTotal}
                    onlyOneResponse={onlyOneResponse}
                    rsp={httpResponse}
                    successFuzzerLength={successCount}
                    failedFuzzerLength={failedCount}
                    showSuccess={showSuccess}
                    setShowSuccess={(v) => {
                        setShowSuccess(v)
                        setQuery({})
                    }}
                    showConcurrentAndLoad={true}
                    selectionByteCount={onlyOneResSelectionByteCount}
                />
            </>
        )

        const secondNodeExtra = () => (
            <>
                <SecondNodeExtra
                    onlyOneResponse={onlyOneResponse}
                    isHttps={advancedConfigValue.isHttps}
                    request={requestHttpRef.current}
                    cachedTotal={cachedTotal}
                    rsp={httpResponse}
                    valueSearch={affixSearch}
                    onSearchValueChange={(value) => {
                        setAffixSearch(value)
                        if (value === "" && defaultResponseSearch !== "") {
                            setDefaultResponseSearch("")
                        }
                    }}
                    onSearch={() => {
                        setDefaultResponseSearch(affixSearch)
                    }}
                    successFuzzer={successFuzzer}
                    failedFuzzer={failedFuzzer}
                    secondNodeSize={secondNodeSize}
                    query={query}
                    setQuery={(q) => {
                        setQuery({...q})
                    }}
                    sendPayloadsType='fuzzerSequence'
                    setShowExtra={setShowExtra}
                    showResponseInfoSecondEditor={showResponseInfoSecondEditor}
                    setShowResponseInfoSecondEditor={setShowResponseInfoSecondEditor}
                />
                <div className={styles["resize-card-icon"]} onClick={() => setSecondFull(!secondFull)}>
                    {secondFull ? <ArrowsRetractIcon /> : <ArrowsExpandIcon />}
                </div>
            </>
        )

        const hotPatchTrigger = useMemoizedFn(() => {
            let m = showYakitModal({
                title: null,
                width: "80%",
                footer: null,
                maskClosable: false,
                closable: false,
                hiddenHeader: true,
                keyboard: false,
                content: (
                    <HTTPFuzzerHotPatch
                        pageId={pageId}
                        initialHotPatchCode={hotPatchCode}
                        initialHotPatchCodeWithParamGetter={hotPatchCodeWithParamGetter}
                        onInsert={(tag) => {
                            if (webFuzzerNewEditorRef.current.reqEditor)
                                monacoEditorWrite(webFuzzerNewEditorRef.current.reqEditor, tag)
                            m.destroy()
                        }}
                        onSaveCode={(code) => {
                            setHotPatchCode(code)
                        }}
                        onSaveHotPatchCodeWithParamGetterCode={(code) => {
                            setHotPatchCodeWithParamGetter(code)

                            setRemoteValue(FuzzerRemoteGV.WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE, code)
                        }}
                        onCancel={() => m.destroy()}
                    />
                )
            })
        })

        const moreLimtAlertMsg = useMemo(
            () => (
                <div style={{fontSize: 12}}>
                    {t("HTTPFuzzerPage.response_overflow", {maxData: fuzzerTableMaxData})}
                    <YakitButton type='text' onClick={onShowAll} style={{padding: 0}}>
                        {t("HTTPFuzzerPage.trafficAnalysisMode")}
                    </YakitButton>
                    {t("HTTPFuzzerPage.view_all_suffix")}
                </div>
            ),
            [fuzzerTableMaxData, i18n.language]
        )
        const noMoreLimtAlertMsg = useMemo(
            () => (
                <div style={{fontSize: 12}}>
                    {t("HTTPFuzzerPage.advanced_filter_suggestion")}
                    <YakitButton type='text' onClick={onShowAll} style={{padding: 0}}>
                        {t("YakitRoute.historyAnalyzer")}
                    </YakitButton>
                    {t("HTTPFuzzerPage.performAction")}
                </div>
            ),
            [i18n.language]
        )

        return (
            <>
                <YakitResizeBox
                    firstMinSize={380}
                    secondMinSize={480}
                    isShowDefaultLineStyle={false}
                    style={{overflow: "hidden"}}
                    lineStyle={{display: firstFull || secondFull ? "none" : ""}}
                    secondNodeStyle={{padding: firstFull ? 0 : undefined, display: firstFull ? "none" : ""}}
                    firstNodeStyle={{padding: secondFull ? 0 : undefined, display: secondFull ? "none" : ""}}
                    {...ResizeBoxProps}
                    firstNode={
                        <WebFuzzerNewEditor
                            ref={webFuzzerNewEditorRef}
                            refreshTrigger={refreshTrigger}
                            request={requestHttpRef.current}
                            setRequest={(i) => onSetRequestHttp(i)}
                            isHttps={advancedConfigValue.isHttps}
                            hotPatchCode={hotPatchCode}
                            hotPatchCodeWithParamGetter={hotPatchCodeWithParamGetter}
                            setHotPatchCode={setHotPatchCode}
                            setHotPatchCodeWithParamGetter={setHotPatchCodeWithParamGetter}
                            firstNodeExtra={firstNodeExtra}
                            pageId={pageId}
                            oneResponseValue={
                                onlyOneResponse
                                    ? {
                                          originValue: Uint8ArrayToString(httpResponse.ResponseRaw),
                                          originalPackage: httpResponse.ResponseRaw
                                      }
                                    : undefined
                            }
                            hex={hex}
                        />
                    }
                    secondNode={
                        <div ref={secondNodeRef} style={{height: "100%", overflow: "hidden"}}>
                            {onlyOneResponse ? (
                                <ResponseViewer
                                    ref={responseViewerRef}
                                    fuzzerResponse={httpResponse}
                                    defaultResponseSearch={defaultResponseSearch}
                                    request={requestHttpRef.current}
                                    webFuzzerValue={Uint8ArrayToString(httpResponse.ResponseRaw)}
                                    showMatcherAndExtraction={showMatcherAndExtraction}
                                    setShowMatcherAndExtraction={setShowMatcherAndExtraction}
                                    matcherValue={matcherValue}
                                    extractorValue={extractorValue}
                                    defActiveKey={activeKey}
                                    defActiveType={activeType}
                                    defActiveKeyAndOrder={defActiveKeyAndOrder}
                                    onSaveMatcherAndExtraction={onSaveMatcherAndExtractionDrawer}
                                    showExtra={showExtra}
                                    setShowExtra={setShowExtra}
                                    showResponseInfoSecondEditor={showResponseInfoSecondEditor}
                                    setShowResponseInfoSecondEditor={setShowResponseInfoSecondEditor}
                                    secondNodeTitle={secondNodeTitle}
                                    secondNodeExtra={secondNodeExtra}
                                    onSetOnlyOneResEditor={setOnlyOneResEditor}
                                />
                            ) : (
                                <>
                                    <div
                                        className={classNames(styles["resize-card"], styles["resize-card-second"])}
                                        style={{display: firstFull ? "none" : ""}}
                                    >
                                        <div className={classNames(styles["resize-card-heard"])}>
                                            <div className={styles["resize-card-heard-title"]}>{secondNodeTitle()}</div>
                                            <div className={styles["resize-card-heard-extra"]}></div>
                                            {cachedTotal >= 1 && <YakitButton
                                                type='primary'
                                                onClick={onShowAll}
                                                className={styles["resize-card-heard-btn"]}
                                            >
                                                {t("HTTPFuzzerPage.trafficAnalysisMode")}
                                            </YakitButton>}
                                            {secondNodeExtra()}
                                        </div>
                                        {cachedTotal > 1 ? (
                                            <>
                                                {showSuccess === "true" && (
                                                    <HTTPFuzzerPageTable
                                                        ref={successTableRef}
                                                        isRefresh={isRefresh}
                                                        success={true}
                                                        data={successFuzzer}
                                                        query={query}
                                                        setQuery={setQuery}
                                                        extractedMap={extractedMap}
                                                        isEnd={loading}
                                                        onDebug={onDebug}
                                                        moreLimtAlertMsg={moreLimtAlertMsg}
                                                        noMoreLimtAlertMsg={noMoreLimtAlertMsg}
                                                        fuzzerTableMaxData={fuzzerTableMaxData}
                                                    />
                                                )}
                                                {showSuccess === "false" && (
                                                    <HTTPFuzzerPageTable
                                                        isRefresh={isRefresh}
                                                        success={false}
                                                        data={failedFuzzer}
                                                        query={query}
                                                        setQuery={setQuery}
                                                        isEnd={loading}
                                                        extractedMap={extractedMap}
                                                    />
                                                )}
                                                {showSuccess === "Concurrent/Load" && (
                                                    <div
                                                        style={{
                                                            height: "100%",
                                                            overflowY: "auto",
                                                            overflowX: "hidden"
                                                        }}
                                                    >
                                                        <FuzzerConcurrentLoad
                                                            inViewportCurrent={inViewport}
                                                            fuzzerResChartData={fuzzerResChartData}
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <Result
                                                status={"warning"}
                                                title={t(isConcurrency ? "ConcurrencyResponse.view_after_executing_concurrency" : "SequenceResponse.view_after_executing_sequence" )}
                                            />
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    }
                />
            </>
        )
    })
)

// 序列动画演示
interface SequenceAnimationAemonstrationProps {}
export const SequenceAnimationAemonstration: React.FC<SequenceAnimationAemonstrationProps> = React.memo((props) => {
    return (
        <div className={styles["sequence-animation-aemonstration"]}>
            <div className={styles["animation-cont-wrap"]}>
                <video src={sequencemp4} autoPlay loop></video>
            </div>
        </div>
    )
})
