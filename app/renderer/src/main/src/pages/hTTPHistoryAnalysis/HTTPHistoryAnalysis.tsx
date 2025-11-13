import React, {ReactNode, Suspense, useEffect, useRef, useState} from "react"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {
    useCreation,
    useDebounceEffect,
    useDebounceFn,
    useInViewport,
    useMemoizedFn,
    usePrevious,
    useThrottleEffect,
    useUpdateEffect
} from "ahooks"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteHistoryGV} from "@/enums/history"
import {
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineEyeIcon,
    OutlineInformationcircleIcon,
    OutlineLightningboltIcon,
    OutlinePlusIcon,
    OutlineRefreshIcon,
    OutlineReplyIcon,
    OutlineSearchIcon,
    OutlineTrashIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {AddHotCodeTemplate, HotCodeTemplate, HotPatchTempItem} from "../fuzzer/HTTPFuzzerHotPatch"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {
    defaultHTTPHistoryAnalysisPageInfo,
    footerTabs,
    HotPatchDefaultContent
} from "@/defaultConstants/hTTPHistoryAnalysis"
import {MITMContentReplacerRule, MITMRulePropRef} from "../mitm/MITMRule/MITMRuleType"
import {yakitNotify} from "@/utils/notification"
import useGetSetState from "../pluginHub/hooks/useGetSetState"
import {useStore} from "@/store/mitmState"
import {ExpandAndRetractExcessiveState} from "../plugins/operator/expandAndRetract/ExpandAndRetract"
import {PluginExecuteProgress} from "../plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {HorizontalScrollCard} from "../plugins/operator/horizontalScrollCard/HorizontalScrollCard"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {MITMConsts} from "../mitm/MITMConsts"
import {HTTPFlowDetailProp} from "@/components/HTTPFlowDetail"
import {HTTPFlow, ImportExportProgress} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {randomString} from "@/utils/randomUtil"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {useCampare} from "@/hook/useCompare/useCompare"
import {minWinSendToChildWin, openABSFileLocated, openPacketNewWindow} from "@/utils/openWebsite"
import {parseStatusCodes, sorterFunction} from "../fuzzer/components/HTTPFuzzerPageTable/HTTPFuzzerPageTable"
import emiter from "@/utils/eventBus/eventBus"
import {HTTPHistoryAnalysisPageInfo, PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {IMonacoEditor, NewHTTPPacketEditor} from "@/utils/editors"
import {YakQueryHTTPFlowRequest} from "@/utils/yakQueryHTTPFlow"
import {prettifyPacketCode} from "@/utils/prettifyPacket"
import {Uint8ArrayToString} from "@/utils/str"
import {YakitRoute} from "@/enums/yakitRoute"
import {HTTPHistoryFilter} from "./HTTPHistory/HTTPHistoryFilter"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import classNames from "classnames"
import {cloneDeep} from "lodash"
import {
    ColorSelect,
    MatcherAndExtractionDrawer,
    MatcherItem,
    onFilterEmptySubMatcher
} from "../fuzzer/MatcherAndExtractionCard/MatcherAndExtractionCard"
import {
    FilterEmptySubMatcherFunctionProps,
    HTTPResponseMatcher,
    MatcherActiveKey
} from "../fuzzer/MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {
    filterModeOptions,
    matchersConditionOptions,
    matcherTypeList
} from "../fuzzer/MatcherAndExtractionCard/constants"
import {Divider, Tooltip} from "antd"
import {YakitPopover, YakitPopoverProp} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {getAction, ByteCountTag} from "../fuzzer/HTTPFuzzerPage"
import {useSelectionByteCount} from "@/components/yakitUI/YakitEditor/useSelectionByteCount"

import styles from "./HTTPHistoryAnalysis.module.scss"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
const MITMRule = React.lazy(() => import("../mitm/MITMRule/MITMRule"))
const {ipcRenderer} = window.require("electron")
interface HTTPHistoryAnalysisProps {
    pageId: string
    /** 来自httpFuzzerPage或FuzzerSequence */
    params?: HTTPHistoryAnalysisPageInfo
    closable?: boolean
}
export const HTTPHistoryAnalysis: React.FC<HTTPHistoryAnalysisProps> = React.memo((props) => {
    const {pageId, params, closable } = props
    const {t, i18n} = useI18nNamespaces(["HTTPHistoryAnalysis"])
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    const initPageInfo = useMemoizedFn(() => {
        if (params) {
            return {...defaultHTTPHistoryAnalysisPageInfo, ...params}
        }
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.DB_HTTPHistoryAnalysis, pageId)
        if (currentItem && currentItem.pageParamsInfo.hTTPHistoryAnalysisPageInfo) {
            return {...currentItem.pageParamsInfo.hTTPHistoryAnalysisPageInfo}
        }
        return {...defaultHTTPHistoryAnalysisPageInfo}
    })
    const [pageInfo, setPageInfo] = useState<HTTPHistoryAnalysisPageInfo>(initPageInfo())

    const [refreshHttpTable, setRefreshHttpTable] = useState<boolean>(false)
    const [isResetSelect, setIsResetSelect] = useState<boolean>(true)
    const [selectedHttpFlowIds, setSelectedHttpFlowIds] = useState<string[]>([])
    const [clickedHttpFlow, setClickedHttpFlow] = useState<HTTPFlow>()
    const [firstHttpFlow, setFirstHttpFlow] = useState<HTTPFlow>()
    const [hTTPFlowFilter, setHTTPFlowFilter] = useState<YakQueryHTTPFlowRequest>()
    const onSetHTTPFlowFilter = useMemoizedFn((filterStr) => {
        try {
            const filter = JSON.parse(filterStr) || {}
            delete filter.Pagination
            setHTTPFlowFilter(filter)
        } catch (error) {}
    })
    const httpFlowIds = useCreation(() => {
        return selectedHttpFlowIds?.map((id) => Number(id)) || []
    }, [selectedHttpFlowIds])
    const memoClickedHttpFlow = useCreation(() => clickedHttpFlow, [clickedHttpFlow?.Id])
    const memoFirstHttpFlow = useCreation(() => firstHttpFlow, [firstHttpFlow?.Id])

    const hTTPHistoryAnalysisRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(hTTPHistoryAnalysisRef)
    const [downstreamProxy, setDownstreamProxy] = useState<string>("")
    useEffect(() => {
        if (inViewport) {
            getRemoteValue(MITMConsts.MITMDefaultDownstreamProxyHistory).then((res) => {
                if (res) {
                    try {
                        const obj = JSON.parse(res) || {}
                        setDownstreamProxy(obj.defaultValue || "")
                    } catch (error) {
                        setDownstreamProxy("")
                    }
                } else {
                    setDownstreamProxy("")
                }
            })
        }
    }, [inViewport])

    const [openBottomTabsFlag, setOpenBottomTabsFlag] = useState<boolean>(false)
    const [curBottomTab, setCurBottomTab] = useState<TabKeys>()

    const [lastRatio, setLastRatio] = useState<{firstRatio: string; secondRatio: string}>({
        firstRatio: "50%",
        secondRatio: "50%"
    })
    useEffect(() => {
        getRemoteValue(RemoteHistoryGV.HTTPFlowAnalysisYakitResizeBox).then((res) => {
            if (res) {
                try {
                    const {firstSizePercent, secondSizePercent} = JSON.parse(res)
                    setLastRatio({
                        firstRatio: firstSizePercent,
                        secondRatio: secondSizePercent
                    })
                } catch (error) {}
            }
        })
    }, [])

    const onMouseUp = useMemoizedFn(({firstSizePercent, secondSizePercent}) => {
        setLastRatio({
            firstRatio: firstSizePercent,
            secondRatio: secondSizePercent
        })
        setRemoteValue(
            RemoteHistoryGV.HTTPFlowAnalysisYakitResizeBox,
            JSON.stringify({
                firstSizePercent,
                secondSizePercent
            })
        )
    })

    const ResizeBoxProps = useCreation(() => {
        let p = cloneDeep(lastRatio)

        if (!openBottomTabsFlag) {
            p.firstRatio = "100%"
            p.secondRatio = "0%"
        }
        return {
            ...p,
            style: {
                height: "calc(100% - 24px)"
            },
            secondNodeStyle: {
                padding: 0,
                display: openBottomTabsFlag ? "block" : "none",
                minHeight: openBottomTabsFlag ? "400px" : "0"
            },
            lineStyle: {display: ""}
        }
    }, [openBottomTabsFlag, lastRatio])

    const onClickFooterTabItem = (key: TabKeys) => {
        setOpenBottomTabsFlag(true)
        setCurBottomTab(key)
    }

    useEffect(() => {
        onClickFooterTabItem("rule")
    }, [pageInfo.webFuzzer])

    return (
        <div className={styles["HTTPHistoryAnalysis"]} ref={hTTPHistoryAnalysisRef}>
            <YakitResizeBox
                isVer={true}
                freeze={openBottomTabsFlag}
                isRecalculateWH={openBottomTabsFlag}
                firstNode={
                    <div className={styles["HTTPHistoryAnalysis-top"]}>
                        <HTTPHistoryFilter
                            onSetClickedHttpFlow={setClickedHttpFlow}
                            onSetFirstHttpFlow={setFirstHttpFlow}
                            onSetSelectedHttpFlowIds={setSelectedHttpFlowIds}
                            onSetHTTPFlowFilter={onSetHTTPFlowFilter}
                            refreshHttpTable={refreshHttpTable}
                            isResetSelect={isResetSelect}
                            onSetIsResetSelect={setIsResetSelect}
                            downstreamProxy={downstreamProxy}
                            toWebFuzzer={pageInfo.webFuzzer}
                            runtimeId={pageInfo.runtimeId}
                            sourceType={pageInfo.sourceType}
                            webFuzzerPageId={pageInfo.pageId}
                            closable={closable}
                        />
                    </div>
                }
                firstMinSize={40}
                secondNode={
                    <div className={styles["HTTPHistoryAnalysis-bottom"]}>
                        {curBottomTab && (
                            <AnalysisMain
                                inViewport={inViewport}
                                curBottomTab={curBottomTab}
                                onSetCurBottomTab={setCurBottomTab}
                                onSetOpenBottomTabsFlag={setOpenBottomTabsFlag}
                                onSetRefreshHttpTable={setRefreshHttpTable}
                                onSetIsResetSelect={setIsResetSelect}
                                hTTPFlowFilter={hTTPFlowFilter}
                                httpFlowIds={httpFlowIds}
                                clickHttpFlow={memoClickedHttpFlow}
                                firstHttpFlow={memoFirstHttpFlow}
                                downstreamProxy={downstreamProxy}
                            />
                        )}
                    </div>
                }
                onMouseUp={onMouseUp}
                {...ResizeBoxProps}
            />
            <div className={styles["HTTPHistoryAnalysis-footer-tab"]}>
                {footerTabs(t).map((item) => (
                    <div
                        className={styles["footer-tab-item"]}
                        key={item.key}
                        onClick={() => {
                            onClickFooterTabItem(item.key as TabKeys)
                        }}
                    >
                        {item.label}
                    </div>
                ))}
            </div>
        </div>
    )
})

type TabKeys = "hot-patch" | "rule"
type TabRenderState = {
    [K in TabKeys]: boolean
}

interface AnalyzeHTTPFlowConfig {
    Concurrency: number
    EnableDeduplicate: boolean
}

type SourceType = "database" | "rawpacket"
interface AnalyzedDataSource {
    SourceType: SourceType
    HTTPFlowFilter?: YakQueryHTTPFlowRequest
    RawRequest?: string
    RawResponse?: string
}

interface AnalyzeHTTPFlowRequest {
    HotPatchCode: string
    Replacers: MITMContentReplacerRule[]
    Config: AnalyzeHTTPFlowConfig
    Source: AnalyzedDataSource
    Matchers: HTTPResponseMatcher[]
}

interface AnalysisMainProps {
    inViewport?: boolean
    curBottomTab: TabKeys
    onSetCurBottomTab: (tab?: TabKeys) => void
    onSetOpenBottomTabsFlag: (flag: boolean) => void
    onSetRefreshHttpTable: React.Dispatch<React.SetStateAction<boolean>>
    onSetIsResetSelect: React.Dispatch<React.SetStateAction<boolean>>
    hTTPFlowFilter?: YakQueryHTTPFlowRequest
    httpFlowIds: number[]
    clickHttpFlow?: HTTPFlow
    firstHttpFlow?: HTTPFlow
    downstreamProxy: string
}
const AnalysisMain: React.FC<AnalysisMainProps> = React.memo((props) => {
    const {
        inViewport,
        curBottomTab,
        onSetCurBottomTab,
        onSetOpenBottomTabsFlag,
        onSetRefreshHttpTable,
        onSetIsResetSelect,
        hTTPFlowFilter,
        httpFlowIds,
        clickHttpFlow,
        firstHttpFlow,
        downstreamProxy
    } = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "HTTPHistoryAnalysis", "webFuzzer"])

    useEffect(() => {
        onSetRules()
        getRemoteValueHotCode()
    }, [])

    // #region 热加载
    const [curHotPatch, setCurHotPatch, getCurHotPatch] = useGetSetState<string>("")
    const [hotPatchTempLocal, setHotPatchTempLocal] = useState<HotPatchTempItem[]>([])
    const [addHotCodeTemplateVisible, setAddHotCodeTemplateVisible] = useState<boolean>(false)
    const getRemoteValueHotCode = useMemoizedFn(() => {
        getRemoteValue(RemoteHistoryGV.HistoryAnalysisHotPatchCodeSave).then((setting: string) => {
            let code = HotPatchDefaultContent
            try {
                const obj = JSON.parse(setting) || {}
                if (obj.code !== undefined) {
                    code = obj.code
                }
            } catch (error) {}
            setCurHotPatch(code)
            setTimeout(() => {
                onSaveHotCode(false)
            }, 50)
        })
    })
    const onSaveHotCode = useMemoizedFn((notifyFlag: boolean = true) => {
        setRemoteValue(RemoteHistoryGV.HistoryAnalysisHotPatchCodeSave, JSON.stringify({code: getCurHotPatch()}))
        notifyFlag && yakitNotify("success", t("YakitNotification.saved"))
    })
    // #endregion

    // #region 规则配置
    const {mitmStatus} = useStore()
    const mitmRuleRef = useRef<MITMRulePropRef>(null)
    const [mitmRuleKey, setMitmRuleKey] = useState<string>(randomString(40))
    const rulesResetFieldsRef = useRef({
        NoReplace: true,
        Result: "",
        ExtraHeaders: [],
        ExtraCookies: [],
        Drop: false,
        ExtraRepeat: false
    })
    const [curRules, setCurRules, getCurRules] = useGetSetState<MITMContentReplacerRule[]>([])
    const onRefreshCurrentRules = useMemoizedFn(() => {
        setMitmRuleKey(randomString(40))
    })
    const onSetRules = useMemoizedFn((r?: MITMContentReplacerRule[]) => {
        if (r === undefined) {
            ipcRenderer.invoke("GetCurrentRules", {}).then((rsp: {Rules: MITMContentReplacerRule[]}) => {
                const newRules = rsp.Rules.map((ele) => ({...ele, Id: ele.Index}))
                setCurRules(
                    newRules.map((item) => ({
                        ...item,
                        ...rulesResetFieldsRef.current
                    }))
                )
            })
        } else {
            setCurRules(
                r.map((item) => ({
                    ...item,
                    ...rulesResetFieldsRef.current
                }))
            )
        }
    })
    // #endregion

    // #region 切换底部tab
    const previousBottomTab = usePrevious(curBottomTab)
    useEffect(() => {
        if (previousBottomTab === "hot-patch") {
            onSaveHotCode(false)
        } else if (previousBottomTab === "rule") {
            mitmRuleRef.current?.onSaveToDataBase(() => {})
        }
    }, [previousBottomTab])

    const [initRenderTabCont, setInitRenderTabCont] = useState<TabRenderState>({
        rule: false,
        "hot-patch": false
    }) // 初次页面渲染的时候，非当前tab的内容是否不加载
    useEffect(() => {
        setFullScreenFirstNode(false)
        setFullScreenSecondNode(false)
        setInitRenderTabCont((prev) => {
            return {...prev, [curBottomTab]: true}
        })
    }, [curBottomTab])
    // #endregion

    // #region YakitResizeBox
    const [fullScreenFirstNode, setFullScreenFirstNode] = useState<boolean>(false)
    const [fullScreenSecondNode, setFullScreenSecondNode] = useState<boolean>(false)
    const [lastRatio, setLastRatio] = useState<{firstRatio: string; secondRatio: string}>({
        firstRatio: "40%",
        secondRatio: "60%"
    })
    useEffect(() => {
        getRemoteValue(RemoteHistoryGV.HTTPFlowAnalysisMainYakitResizeBox).then((res) => {
            if (res) {
                try {
                    const {firstSizePercent, secondSizePercent} = JSON.parse(res)
                    setLastRatio({
                        firstRatio: firstSizePercent,
                        secondRatio: secondSizePercent
                    })
                } catch (error) {}
            }
        })
    }, [])
    const ResizeBoxProps = useCreation(() => {
        let p = cloneDeep(lastRatio)

        if (fullScreenFirstNode) {
            p.secondRatio = "0%"
            p.firstRatio = "100%"
        } else if (fullScreenSecondNode) {
            p.secondRatio = "100%"
            p.firstRatio = "0%"
        }
        return {
            ...p,
            firstNodeStyle: {
                display: fullScreenSecondNode ? "none" : ""
            },
            lineStyle: {display: fullScreenFirstNode || fullScreenSecondNode ? "none" : ""},
            secondNodeStyle: {
                padding: fullScreenFirstNode || fullScreenSecondNode ? 0 : undefined,
                display: fullScreenFirstNode ? "none" : ""
            }
        }
    }, [lastRatio, fullScreenFirstNode, fullScreenSecondNode])
    const onMouseUp = useMemoizedFn(({firstSizePercent, secondSizePercent}) => {
        setLastRatio({
            firstRatio: firstSizePercent,
            secondRatio: secondSizePercent
        })
        setRemoteValue(
            RemoteHistoryGV.HTTPFlowAnalysisMainYakitResizeBox,
            JSON.stringify({
                firstSizePercent,
                secondSizePercent
            })
        )
    })
    // #endregion

    // #region 执行表单
    const [sourceType, setSourceType] = useState<SourceType>("database")
    const [concurrency, setConcurrency] = useState<number>(10)
    const [enableDeduplicate, setEnableDeduplicate] = useState<boolean>(false)

    /* ------ 匹配器和提取器（目前只支持匹配器）start ----*/
    const [visibleMatcherAndExtractionDrawer, setVisibleMatcherAndExtractionDrawer] = useState<boolean>(false)
    const [defActiveKey, setDefActiveKey] = useState<string>("") // 提取器
    const [defActiveKeyAndOrder, setDefActiveKeyAndOrder] = useState<MatcherActiveKey>({
        order: 0,
        defActiveKey: ""
    }) // 匹配器
    const [matchersList, setMatchersList] = useState<HTTPResponseMatcher[]>([])
    const matcherValue = useCreation(() => {
        return {matchersList: matchersList}
    }, [matchersList])
    const extractorValue = useCreation(() => {
        return {extractorList: []}
    }, [])

    const [httpFlowLoading, setHttpFlowLoading] = useState<boolean>(false)
    const [httpFlowRequest, setHttpFlowRequest] = useState<string>("")
    useDebounceEffect(
        () => {
            if (firstHttpFlow?.Id) {
                if (clickHttpFlow?.Id) {
                    getHttpFlowById(clickHttpFlow)
                } else {
                    getHttpFlowById(firstHttpFlow)
                }
            } else {
                setHttpFlowRequest("")
            }
        },
        [clickHttpFlow?.Id, firstHttpFlow?.Id],
        {wait: 500}
    )
    const getSafeHTTPRequest = (flow: HTTPFlow) => {
        return (flow.InvalidForUTF8Request ? flow.SafeHTTPRequest! : flow.RequestString) || ""
    }
    const getHttpFlowById = (flow: HTTPFlow) => {
        // 是否获取Request
        let isGetRequest: boolean = true
        // 请求不为空直接使用
        if (flow.RequestString) {
            isGetRequest = false
            setHttpFlowRequest(getSafeHTTPRequest(flow))
        }
        if (isGetRequest) {
            setHttpFlowLoading(true)
            ipcRenderer
                .invoke("GetHTTPFlowById", {Id: flow.Id})
                .then((i: HTTPFlow) => {
                    setHttpFlowRequest(getSafeHTTPRequest(i))
                })
                .catch((e) => {
                    yakitNotify("error", `Query HTTPFlow failed: ${e}`)
                })
                .finally(() => {
                    setHttpFlowLoading(false)
                })
        }
    }

    useEffect(() => {
        if (!inViewport) {
            onCloseMatcherAndExtractionDrawer()
        }
    }, [inViewport])
    const onOpenMatcherAndExtractionDrawer = useMemoizedFn(() => {
        setVisibleMatcherAndExtractionDrawer(true)
    })
    const onCloseMatcherAndExtractionDrawer = useMemoizedFn(() => {
        setVisibleMatcherAndExtractionDrawer(false)
    })
    const onSaveMatcherAndExtractionDrawer = useMemoizedFn((matcher, extractor) => {
        setMatchersList(matcher.matchersList || [])
    })

    const onChangeMatcher = useMemoizedFn((params: {index: number; value: string; fileId: string}) => {
        const {index, value, fileId} = params
        setMatchersList((prev) => {
            const copyPrev = cloneDeep(prev)
            copyPrev[index] = {
                ...copyPrev[index],
                [fileId]: value
            }
            return copyPrev
        })
    })
    const onRemoveMatcher = useMemoizedFn((index: number, subIndex: number) => {
        const params: FilterEmptySubMatcherFunctionProps = {
            matchers: matchersList,
            index,
            subIndex
        }
        const newMatchers = onFilterEmptySubMatcher(params)
        setMatchersList(newMatchers)
    })
    const onEditMatcher = useMemoizedFn((index: number, subIndex: number) => {
        setDefActiveKeyAndOrder({
            order: index,
            defActiveKey: `ID:${subIndex}`
        })
        onOpenMatcherAndExtractionDrawer()
    })
    /* ------ 匹配器和提取器（目前只支持匹配器）end ----*/

    // 编辑器
    const [rawRequest, setRawRequest] = useState<string>("")
    const [rawResponse, setRawResponse] = useState<string>("")
    const [refreshTriggerReqEditor, setRefreshTriggerReqEditor] = useState<boolean>(false)
    const [refreshTriggerResEditor, setRefreshTriggerResEditor] = useState<boolean>(false)
    const [reqEditor, setReqEditor] = useState<IMonacoEditor>()
    const [resEditor, setResEditor] = useState<IMonacoEditor>()
    const resSelectionByteCount = useSelectionByteCount(resEditor, 500)
    const reqSelectionByteCount = useSelectionByteCount(reqEditor, 500)

    const beautifyCode = async (type: "req" | "res", oldCode: string) => {
        if (!oldCode) return
        const encoder = new TextEncoder()
        const bytes = encoder.encode(oldCode)
        const mb = bytes.length / 1024 / 1024
        if (mb > 0.5) {
            return
        } else {
            const beautifyValue = await prettifyPacketCode(oldCode)
            if (type === "req") {
                setRawRequest(Uint8ArrayToString(beautifyValue as Uint8Array, "utf8"))
                setRefreshTriggerReqEditor((prev) => !prev)
            } else {
                setRawResponse(Uint8ArrayToString(beautifyValue as Uint8Array, "utf8"))
                setRefreshTriggerResEditor((prev) => !prev)
            }
        }
    }

    // #endregion

    // #region 执行
    const execParamsRef = useRef<AnalyzeHTTPFlowRequest>()
    const tokenRef = useRef<string>(randomString(40))
    const [isExit, setIsExit] = useState<boolean>(false)
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")
    const [currentSelectItem, setCurrentSelectItem] = useState<HTTPFlowRuleData>()
    const [isRefreshTable, setIsRefreshTable] = useState<boolean>(true)
    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        taskName: "AnalyzeHTTPFlow",
        apiKey: "AnalyzeHTTPFlow",
        token: tokenRef.current,
        onEnd: (getStreamInfo) => {
            debugPluginStreamEvent.stop()
            setTimeout(() => {
                if (getStreamInfo) {
                    const errorLog = getStreamInfo.logState.find((item) => item.level === "error")
                    if (errorLog) {
                        setExecuteStatus("error")
                    } else {
                        setExecuteStatus("finished")
                        refreshHttpTableHasMatchersList()
                    }
                }
            }, 300)
        },
        onError: () => {
            setExecuteStatus("error")
        }
    })

    const refreshHttpTableHasMatchersList = useMemoizedFn(() => {
        if (sourceType === "database" && matchersList.length) {
            onSetIsResetSelect(false)
            onSetRefreshHttpTable((prev) => !prev)
        }
    })

    const onOperateClick = useMemoizedFn(() => {
        switch (executeStatus) {
            case "finished":
            case "error":
                onStartExecute()
                break
            case "process":
                onStopExecute()
                break
            default:
                break
        }
    })

    const exitReturn = useMemoizedFn(() => {
        onStopExecute()
        setTimeout(() => {
            setFullScreenSecondNode(false)
            setIsExit(true)
        }, 300)
    })

    const onStartExecute = useMemoizedFn(() => {
        // 热加载、规则保存操作
        onSaveHotCode(false)
        mitmRuleRef.current?.onSaveToDataBase(() => {})

        setIsExit(false)
        debugPluginStreamEvent.reset()
        setCurrentSelectItem(undefined)
        setIsRefreshTable((prev) => !prev)

        execParamsRef.current = {
            HotPatchCode: curHotPatch,
            Replacers: [...curRules],
            Config: {
                Concurrency: concurrency,
                EnableDeduplicate: enableDeduplicate
            },
            Source: {
                SourceType: sourceType
            },
            Matchers:
                sourceType === "database"
                    ? matchersList.map((ele) => ({
                          ...ele,
                          Action: getAction(ele.filterMode),
                          HitColor: !!getAction(ele.filterMode) ? "" : ele.HitColor // 只有仅匹配才传颜色
                      }))
                    : []
        }
        if (sourceType === "database") {
            execParamsRef.current.Source = {
                ...execParamsRef.current.Source,
                HTTPFlowFilter: {
                    ...hTTPFlowFilter,
                    IncludeId: httpFlowIds
                }
            }
        } else {
            execParamsRef.current.Source = {
                ...execParamsRef.current.Source,
                RawRequest: rawRequest,
                RawResponse: rawResponse
            }
        }
        ipcRenderer.invoke("AnalyzeHTTPFlow", execParamsRef.current, tokenRef.current).then(() => {
            debugPluginStreamEvent.start()
            setExecuteStatus("process")
            setFullScreenSecondNode(true)
            setFullScreenFirstNode(false)
        })
    })

    const onStopExecute = () => {
        ipcRenderer
            .invoke(`cancel-AnalyzeHTTPFlow`, tokenRef.current)
            .then(() => {
                debugPluginStreamEvent.stop()
                setExecuteStatus("finished")
            })
            .catch((e: any) => {
                yakitNotify("error", t("AnalysisMain.cancel_traffic_analysis_error") + e)
            })
    }

    useEffect(() => {
        if (isExit) {
            setExecuteStatus("default")
        }
    }, [isExit])
    useEffect(() => {
        if (isExit || executeStatus === "default") {
            emiter.on("onRefreshCurrentRules", onRefreshCurrentRules)
            return () => {
                emiter.off("onRefreshCurrentRules", onRefreshCurrentRules)
            }
        }
    }, [isExit, executeStatus])

    useUpdateEffect(() => {
        if (inViewport && executeStatus === "default") {
            onSetRefreshHttpTable((prev) => !prev)
        }
    }, [inViewport])
    // #endregion

    return (
        <div className={styles["AnalysisMain"]}>
            <div className={styles["AnalysisMain-header"]}>
                <div className={styles["AnalysisMain-header-left"]}>
                    {footerTabs(t).map((item) => (
                        <div
                            className={classNames(styles["header-tab-item"], {
                                [styles["tab-item-active"]]: curBottomTab === item.key
                            })}
                            key={item.key}
                            onClick={() => {
                                onSetCurBottomTab(item.key as TabKeys)
                            }}
                        >
                            {item.label}
                        </div>
                    ))}
                </div>
                <div className={styles["AnalysisMain-header-right"]}>
                    <YakitButton
                        icon={<OutlineXIcon />}
                        type='text2'
                        onClick={() => {
                            onStopExecute()
                            onSetCurBottomTab(undefined)
                            onSetOpenBottomTabsFlag(false)
                        }}
                    ></YakitButton>
                </div>
            </div>
            <div style={{height: "calc(100% - 30px)"}}>
                <YakitResizeBox
                    isVer={false}
                    freeze={true}
                    firstNode={
                        <div className={styles["AnalysisMain-left"]}>
                            <div
                                className={styles["rule-wrapper"]}
                                style={{display: curBottomTab === "rule" ? "block" : "none"}}
                            >
                                {initRenderTabCont["rule"] && (
                                    <Suspense fallback={<div>loading</div>}>
                                        <MITMRule
                                            key={mitmRuleKey}
                                            ref={mitmRuleRef}
                                            ruleUse='historyAnalysis'
                                            inMouseEnterTable={true}
                                            visible={true}
                                            status={mitmStatus}
                                            excludeColumnsKey={JSON.stringify(["NoReplace", "Drop", "ExtraRepeat"])}
                                            excludeBatchMenuKey={JSON.stringify(["no-replace", "replace"])}
                                            onSetRules={onSetRules}
                                            onRefreshCom={onRefreshCurrentRules}
                                        />
                                    </Suspense>
                                )}
                            </div>
                            <div
                                className={styles["hotPatch-wrapper"]}
                                style={{display: curBottomTab === "hot-patch" ? "block" : "none"}}
                            >
                                {initRenderTabCont["hot-patch"] && (
                                    <>
                                        <div className={styles["hotPatch-header"]}>
                                            <div className={styles["hotPatch-header-left"]}>
                                                <HotCodeTemplate
                                                    type='httpflow-analyze'
                                                    hotPatchTempLocal={hotPatchTempLocal}
                                                    onSetHotPatchTempLocal={setHotPatchTempLocal}
                                                    onClickHotCode={setCurHotPatch}
                                                ></HotCodeTemplate>
                                            </div>
                                            <div className={styles["hotPatch-header-right"]}>
                                                <YakitPopconfirm
                                                    title={t("AnalysisMain.confirm_reset_hot_reload_code")}
                                                    onConfirm={() => {
                                                        setCurHotPatch(HotPatchDefaultContent)
                                                    }}
                                                    placement='top'
                                                >
                                                    <YakitButton type='text'>
                                                        <OutlineRefreshIcon />
                                                    </YakitButton>
                                                </YakitPopconfirm>
                                                <YakitButton
                                                    type='outline1'
                                                    onClick={() => setAddHotCodeTemplateVisible(true)}
                                                >
                                                    {t("YakitButton.save_template")}
                                                </YakitButton>
                                                <AddHotCodeTemplate
                                                    type='httpflow-analyze'
                                                    hotPatchTempLocal={hotPatchTempLocal}
                                                    hotPatchCode={curHotPatch}
                                                    visible={addHotCodeTemplateVisible}
                                                    onSetAddHotCodeTemplateVisible={setAddHotCodeTemplateVisible}
                                                ></AddHotCodeTemplate>
                                                <YakitButton type='outline1' onClick={() => onSaveHotCode()}>
                                                    {t("YakitButton.save")}
                                                </YakitButton>
                                                {fullScreenFirstNode ? (
                                                    <OutlineArrowscollapseIcon
                                                        className={styles["expand-icon"]}
                                                        onClick={() => setFullScreenFirstNode(false)}
                                                    />
                                                ) : (
                                                    <OutlineArrowsexpandIcon
                                                        className={styles["expand-icon"]}
                                                        onClick={() => {
                                                            setFullScreenSecondNode(false)
                                                            setFullScreenFirstNode(true)
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        <div className={styles["hotPatch-editor"]}>
                                            <YakitEditor
                                                type={"mitm"}
                                                value={curHotPatch}
                                                setValue={setCurHotPatch}
                                                noMiniMap={true}
                                                noWordWrap={true}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    }
                    firstMinSize={650}
                    secondMinSize={500}
                    secondNode={
                        <div className={styles["AnalysisMain-right"]}>
                            {executeStatus === "default" || isExit ? (
                                <div
                                    className={styles["AnalysisMain-right-default"]}
                                    style={{overflow: sourceType === "database" ? "auto" : undefined}}
                                >
                                    <div className={styles["AnalysisMain-right-default-header"]}>
                                        <div className={styles["title-wrapper"]}>
                                            <span className={styles["title"]}>
                                                {t("AnalysisMain.execution_result")}
                                            </span>{" "}
                                            <span className={styles["content"]}>
                                                {t("AnalysisMain.set_hot_reload_or_rules_then_execute")}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles["exec-form-item"]}>
                                        <span className={styles["exec-form-item-label"]}>
                                            {t("AnalysisMain.data_type")}
                                        </span>
                                        <YakitRadioButtons
                                            value={sourceType}
                                            onChange={(e) => setSourceType(e.target.value)}
                                            buttonStyle='solid'
                                            options={[
                                                {
                                                    value: "database",
                                                    label: t("AnalysisMain.filter_traffic")
                                                },
                                                {
                                                    value: "rawpacket",
                                                    label: t("AnalysisMain.packet")
                                                }
                                            ]}
                                            size={"middle"}
                                        />
                                    </div>
                                    <div
                                        className={styles["exec-form-item"]}
                                        style={{
                                            height: sourceType === "rawpacket" ? `calc(100% - 200px)` : undefined
                                        }}
                                    >
                                        {sourceType === "database" ? (
                                            <>
                                                <span className={styles["exec-form-item-label"]}></span>
                                                <span style={{color: "var(--Colors-Use-Main-Primary)"}}>
                                                    {t("AnalysisMain.filter_traffic_analysis_tip")}
                                                </span>
                                            </>
                                        ) : (
                                            <div className={styles["rawpacket-editor-wrapper"]}>
                                                <YakitResizeBox
                                                    firstNode={
                                                        <NewHTTPPacketEditor
                                                            originValue={rawRequest}
                                                            isShowBeautifyRender={false}
                                                            title={
                                                                <div className={styles["row-editor-title"]}>
                                                                    <span style={{fontSize: 12}}>Request</span>
                                                                    <ByteCountTag
                                                                        selectionByteCount={reqSelectionByteCount}
                                                                        itemKey='httpHistoryAnalysis'
                                                                    />
                                                                </div>
                                                            }
                                                            extra={
                                                                <YakitButton
                                                                    size='small'
                                                                    onClick={() => {
                                                                        beautifyCode("req", rawRequest)
                                                                    }}
                                                                >
                                                                    {t("YakitButton.beautify")}
                                                                </YakitButton>
                                                            }
                                                            noMinimap={true}
                                                            onChange={setRawRequest}
                                                            refreshTrigger={refreshTriggerReqEditor}
                                                            onEditor={setReqEditor}
                                                            onClickOpenPacketNewWindowMenu={() => {
                                                                openPacketNewWindow({
                                                                    request: {
                                                                        originValue: rawRequest
                                                                    },
                                                                    response: {
                                                                        originValue: rawResponse
                                                                    }
                                                                })
                                                            }}
                                                            editorOperationRecord='HTTP_FLOW_ANALYSIS_REQUEST_Record'
                                                            onlyBasicMenu
                                                            noLineNumber
                                                        />
                                                    }
                                                    secondNode={
                                                        <NewHTTPPacketEditor
                                                            originValue={rawResponse}
                                                            isShowBeautifyRender={false}
                                                            title={
                                                                <div className={styles["row-editor-title"]}>
                                                                    <span style={{fontSize: 12}}>Response</span>
                                                                    <ByteCountTag
                                                                        selectionByteCount={resSelectionByteCount}
                                                                        itemKey='httpHistoryAnalysis'
                                                                    />
                                                                </div>
                                                            }
                                                            extra={
                                                                <YakitButton
                                                                    size='small'
                                                                    onClick={() => {
                                                                        beautifyCode("res", rawResponse)
                                                                    }}
                                                                >
                                                                    {t("YakitButton.beautify")}
                                                                </YakitButton>
                                                            }
                                                            isResponse={true}
                                                            noMinimap={true}
                                                            onChange={setRawResponse}
                                                            refreshTrigger={refreshTriggerResEditor}
                                                            onEditor={setResEditor}
                                                            editorOperationRecord='HTTP_FLOW_ANALYSIS_RESPONSE_Record'
                                                            onlyBasicMenu
                                                            noLineNumber
                                                        />
                                                    }
                                                    firstMinSize={300}
                                                    secondMinSize={300}
                                                ></YakitResizeBox>
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles["exec-form-item"]}>
                                        <span className={styles["exec-form-item-label"]}>
                                            {t("AnalysisMain.concurrency")}
                                        </span>
                                        <YakitInputNumber
                                            type='horizontal'
                                            size='small'
                                            value={concurrency}
                                            onChange={(v) => setConcurrency(v as number)}
                                        />
                                    </div>
                                    <div className={styles["exec-form-item"]}>
                                        <span className={styles["exec-form-item-label"]}>
                                            {t("AnalysisMain.deduplicate_within_single_record")}
                                        </span>
                                        <YakitSwitch checked={enableDeduplicate} onChange={setEnableDeduplicate} />
                                    </div>
                                    {sourceType === "database" && (
                                        <div className={styles["exec-form-item"]}>
                                            <span className={styles["exec-form-item-label"]}>
                                                {t("AnalysisMain.matcher")}
                                                <Tooltip title={t("AnalysisMain.discard_or_keep_traffic_analysis_tip")}>
                                                    <OutlineInformationcircleIcon className={styles["info-icon"]} />
                                                </Tooltip>
                                                ：
                                            </span>
                                            <div>
                                                {matchersList.length === 0 ? (
                                                    <YakitButton
                                                        size='middle'
                                                        type='outline1'
                                                        onClick={onOpenMatcherAndExtractionDrawer}
                                                        icon={<OutlinePlusIcon />}
                                                        disabled={httpFlowLoading || httpFlowRequest === ""}
                                                    >
                                                        {t("YakitButton.add_new")}
                                                    </YakitButton>
                                                ) : (
                                                    <>
                                                        {matchersList.map((matcherItem, index) => (
                                                            <div
                                                                className={styles["matchers-item"]}
                                                                key={`matchersID:${index}`}
                                                            >
                                                                <div className={styles["matchers-heard"]}>
                                                                    <div className={styles["matchers-heard-left"]}>
                                                                        <YakitRadioButtons
                                                                            buttonStyle='solid'
                                                                            options={filterModeOptions(t)}
                                                                            size='small'
                                                                            value={matcherItem.filterMode}
                                                                            onChange={(e) => {
                                                                                onChangeMatcher({
                                                                                    index,
                                                                                    value: e.target.value,
                                                                                    fileId: "filterMode"
                                                                                })
                                                                            }}
                                                                        />
                                                                        {matcherItem.filterMode === "onlyMatch" && (
                                                                            <ColorSelect
                                                                                size='small'
                                                                                value={matcherItem.HitColor}
                                                                                onChange={(value) => {
                                                                                    onChangeMatcher({
                                                                                        index,
                                                                                        value,
                                                                                        fileId: "HitColor"
                                                                                    })
                                                                                }}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                    <YakitRadioButtons
                                                                        buttonStyle='solid'
                                                                        options={matchersConditionOptions}
                                                                        size='small'
                                                                        value={matcherItem.SubMatcherCondition}
                                                                        onChange={(e) => {
                                                                            onChangeMatcher({
                                                                                index,
                                                                                value: e.target.value,
                                                                                fileId: "SubMatcherCondition"
                                                                            })
                                                                        }}
                                                                    />
                                                                    <div className={styles["matchers-heard-right"]}>
                                                                        <OutlineTrashIcon
                                                                            className={styles["trashIcon"]}
                                                                            onClick={() => {
                                                                                setMatchersList((prev) => {
                                                                                    return prev.filter(
                                                                                        (_, i) => i !== index
                                                                                    )
                                                                                })
                                                                            }}
                                                                        />
                                                                        <Divider type='vertical' />
                                                                        <OutlineLightningboltIcon
                                                                            className={styles["lightningboltIcon"]}
                                                                            onClick={onOpenMatcherAndExtractionDrawer}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                {matcherItem.SubMatchers.map((subItem, subIndex) => (
                                                                    <div
                                                                        className={styles["matchersList-item"]}
                                                                        key={`matchersID:${subIndex}`}
                                                                    >
                                                                        <div
                                                                            className={
                                                                                styles["matchersList-item-heard"]
                                                                            }
                                                                        >
                                                                            <span className={styles["item-id"]}>
                                                                                ID&nbsp;{subIndex}
                                                                            </span>
                                                                            <span>
                                                                                [
                                                                                {
                                                                                    matcherTypeList(t).find(
                                                                                        (e) =>
                                                                                            e.value ===
                                                                                            subItem.MatcherType
                                                                                    )?.label
                                                                                }
                                                                                ]
                                                                            </span>
                                                                            <span className={styles["item-number"]}>
                                                                                {subItem.Group?.length}
                                                                            </span>
                                                                        </div>
                                                                        <MatchersAndExtractorsListItemOperate
                                                                            onRemove={() =>
                                                                                onRemoveMatcher(index, subIndex)
                                                                            }
                                                                            onEdit={() =>
                                                                                onEditMatcher(index, subIndex)
                                                                            }
                                                                            popoverContent={
                                                                                <MatcherItem
                                                                                    matcherItem={subItem}
                                                                                    onEdit={() => {}}
                                                                                    notEditable={true}
                                                                                    httpResponse=''
                                                                                />
                                                                            }
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </>
                                                )}
                                                <MatcherAndExtractionDrawer
                                                    pageType='History_Analysis'
                                                    visibleDrawer={visibleMatcherAndExtractionDrawer}
                                                    defActiveType='matchers'
                                                    httpResponse={httpFlowRequest}
                                                    defActiveKey={defActiveKey}
                                                    defActiveKeyAndOrder={defActiveKeyAndOrder}
                                                    matcherValue={matcherValue}
                                                    extractorValue={extractorValue}
                                                    onClose={onCloseMatcherAndExtractionDrawer}
                                                    onSave={onSaveMatcherAndExtractionDrawer}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div className={styles["exec-btn"]}>
                                        <YakitButton
                                            size='middle'
                                            type='primary'
                                            onClick={onStartExecute}
                                            style={{width: 100}}
                                        >
                                            {t("YakitButton.execute")}
                                        </YakitButton>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles["AnalysisMain-right-noDefault"]}>
                                    {/* 执行结果 */}
                                    <div className={styles["AnalysisMain-header"]}>
                                        <div className={styles["AnalysisMain-header-text"]}>
                                            {t("AnalysisMain.execution_result")}
                                        </div>
                                        <div className={styles["AnalysisMain-execStatus-wrapper"]}>
                                            {streamInfo.progressState.length === 1 && (
                                                <div className={styles["crash-log-progress"]}>
                                                    <PluginExecuteProgress
                                                        percent={streamInfo.progressState[0].progress}
                                                        name={streamInfo.progressState[0].id}
                                                    />
                                                </div>
                                            )}
                                            <YakitButton onClick={onOperateClick} danger={executeStatus === "process"}>
                                                {["finished", "error"].includes(executeStatus)
                                                    ? t("YakitButton.execute")
                                                    : executeStatus === "process"
                                                    ? t("YakitButton.stop")
                                                    : executeStatus === "paused"
                                                    ? t("YakitButton.continue")
                                                    : t("YakitButton.exit")}
                                            </YakitButton>
                                            <YakitButton
                                                type='outline2'
                                                icon={<OutlineReplyIcon />}
                                                onClick={exitReturn}
                                            >
                                                {t("YakitButton.back")}
                                            </YakitButton>
                                            {fullScreenSecondNode ? (
                                                <OutlineArrowscollapseIcon
                                                    className={styles["expand-icon"]}
                                                    onClick={() => setFullScreenSecondNode(false)}
                                                />
                                            ) : (
                                                <OutlineArrowsexpandIcon
                                                    className={styles["expand-icon"]}
                                                    onClick={() => {
                                                        setFullScreenFirstNode(false)
                                                        setFullScreenSecondNode(true)
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles["AnalysisMain-result"]}>
                                        {streamInfo.cardState.length > 0 && (
                                            <HorizontalScrollCard
                                                title='Data Card'
                                                data={streamInfo.cardState}
                                                compact
                                            />
                                        )}
                                        <div className={styles["AnalysisMain-result-tab"]}>
                                            <div className={styles["rule-data"]}>
                                                <HttpRule
                                                    tableData={streamInfo.rulesState}
                                                    currentSelectItem={currentSelectItem}
                                                    onSetCurrentSelectItem={setCurrentSelectItem}
                                                    isRefreshTable={isRefreshTable}
                                                    executeStatus={executeStatus}
                                                    downstreamProxy={downstreamProxy}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    }
                    onMouseUp={onMouseUp}
                    {...ResizeBoxProps}
                />
            </div>
        </div>
    )
})

interface MatchersAndExtractorsListItemOperateProps {
    onRemove: () => void
    onEdit: () => void
    popoverContent: ReactNode
}
const MatchersAndExtractorsListItemOperate: React.FC<MatchersAndExtractorsListItemOperateProps> = React.memo(
    (props) => {
        const {onRemove, onEdit, popoverContent} = props
        const {t, i18n} = useI18nNamespaces(["HTTPHistoryAnalysis"])
        const [visiblePopover, setVisiblePopover] = useState<boolean>(false)
        return (
            <div
                className={classNames(styles["matchersList-item-operate"], {
                    [styles["matchersList-item-operate-hover"]]: visiblePopover
                })}
            >
                <OutlineTrashIcon className={styles["trash-icon"]} onClick={onRemove} />

                <Tooltip title={t("MatchersAndExtractorsListItemOperate.debug")}>
                    <OutlineLightningboltIcon className={styles["hollow-lightningBolt-icon"]} onClick={onEdit} />
                </Tooltip>
                <TerminalPopover
                    popoverContent={popoverContent}
                    visiblePopover={visiblePopover}
                    setVisiblePopover={setVisiblePopover}
                />
            </div>
        )
    }
)

interface TerminalPopoverProps extends YakitPopoverProp {
    popoverContent: ReactNode
    visiblePopover: boolean
    setVisiblePopover: (b: boolean) => void
}

const TerminalPopover: React.FC<TerminalPopoverProps> = React.memo((props) => {
    const {popoverContent, visiblePopover, setVisiblePopover} = props
    const popoverContentRef = useRef<HTMLDivElement>(null)
    const terminalIconRef = useRef<HTMLDivElement>(null)
    const onSetArrowTop = useMemoizedFn(() => {
        if (terminalIconRef.current && popoverContentRef.current) {
            try {
                const {top: iconOffsetTop, height: iconHeight} = terminalIconRef.current.getBoundingClientRect()
                const {top: popoverContentOffsetTop} = popoverContentRef.current.getBoundingClientRect()
                const arrowTop = iconOffsetTop - popoverContentOffsetTop + iconHeight / 2
                popoverContentRef.current.style.setProperty("--arrow-top", `${arrowTop}px`)
            } catch (error) {}
        }
    })
    return (
        <YakitPopover
            placement='right'
            overlayClassName={classNames(styles["matching-extraction-content"], styles["terminal-popover"])}
            content={
                <div className={styles["terminal-popover-content"]} ref={popoverContentRef}>
                    {popoverContent}
                </div>
            }
            visible={visiblePopover}
            onVisibleChange={(v) => {
                if (v) {
                    setTimeout(() => {
                        onSetArrowTop()
                    }, 200)
                }
                setVisiblePopover(v)
            }}
        >
            <span ref={terminalIconRef} style={{height: 24, lineHeight: "16px"}}>
                <OutlineEyeIcon className={styles["terminal-icon"]} />
            </span>
        </YakitPopover>
    )
})

interface HttpRuleProps {
    tableData: HTTPFlowRuleData[]
    currentSelectItem?: HTTPFlowRuleData
    onSetCurrentSelectItem: (c?: HTTPFlowRuleData) => void
    isRefreshTable: boolean
    executeStatus: ExpandAndRetractExcessiveState
    downstreamProxy: string
}
const HttpRule: React.FC<HttpRuleProps> = React.memo((props) => {
    const {tableData, currentSelectItem, onSetCurrentSelectItem, isRefreshTable, executeStatus, downstreamProxy} = props
    const [scrollToIndex, setScrollToIndex] = useState<string>()

    // #region 规则数据包打开新窗口
    const HTTPFlowDetailMiniProps = (v: HTTPFlowRuleData) => {
        return {
            noHeader: true,
            id: v?.HTTPFlowId || 0,
            analyzedIds: v?.Id ? [v.Id] : undefined,
            sendToWebFuzzer: true,
            downstreamProxyStr: downstreamProxy,
            scrollID: v?.Id,
            showEditTag: false,
            showJumpTree: false
        } as HTTPFlowDetailProp
    }

    // 双击表格行打开新窗口数据包
    const onHttpRuleTableRowDoubleClick = useMemoizedFn((r) => {
        openPacketNewWindow({
            showParentPacketCom: {
                components: "HTTPFlowDetailMini",
                props: {
                    ...HTTPFlowDetailMiniProps(r)
                }
            }
        })
    })
    // #endregion

    const onSelect = useMemoizedFn((i) => {
        if (!i) {
            onSetCurrentSelectItem(undefined)
            return
        }
        onSetCurrentSelectItem(i)
        minWinSendToChildWin({
            type: "openPacketNewWindow",
            data: {
                showParentPacketCom: {
                    components: "HTTPFlowDetailMini",
                    props: {
                        ...HTTPFlowDetailMiniProps(i)
                    }
                }
            }
        })
    })

    return (
        <div className={styles["HttpRule-first"]}>
            <HttpRuleTable
                tableData={tableData}
                currentSelectItem={currentSelectItem}
                onSelect={onSelect}
                scrollToIndex={scrollToIndex}
                onSetScrollToIndex={setScrollToIndex}
                isRefreshTable={isRefreshTable}
                executeStatus={executeStatus}
                onRowDoubleClick={onHttpRuleTableRowDoubleClick}
            />
        </div>
    )
})

interface QueryAnalyzedHTTPFlowRuleFilter {
    Methods: string[]
    SearchURL: string
    StatusCode: string
    RuleVerboseName: string
    ExtractedContent: string
}
export interface HTTPFlowRuleData {
    Id: number
    HTTPFlowId: number
    Method: string
    StatusCode: string
    Url: string
    IPAddress: string
    RuleVerboseName: string
    Rule: string
    ExtractedContent: string
}
interface HttpRuleTableProps {
    tableData: HTTPFlowRuleData[]
    currentSelectItem?: HTTPFlowRuleData
    onSelect: (c?: HTTPFlowRuleData) => void
    scrollToIndex?: string
    onSetScrollToIndex: (i?: string) => void
    isRefreshTable: boolean
    executeStatus: ExpandAndRetractExcessiveState
    onRowDoubleClick: (r?: HTTPFlowRuleData) => void
}
const HttpRuleTable: React.FC<HttpRuleTableProps> = React.memo((props) => {
    const {currentPageTabRouteKey} = usePageInfo(
        (s) => ({
            currentPageTabRouteKey: s.currentPageTabRouteKey
        }),
        shallow
    )
    const {
        tableData,
        currentSelectItem,
        onSelect,
        scrollToIndex,
        onSetScrollToIndex,
        isRefreshTable,
        executeStatus,
        onRowDoubleClick
    } = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "HTTPHistoryAnalysis", "history"])

    const tableRef = useRef<any>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [tableQuery, setTableQuery] = useState<QueryAnalyzedHTTPFlowRuleFilter>({
        Methods: [],
        StatusCode: "",
        SearchURL: "",
        RuleVerboseName: "",
        ExtractedContent: ""
    })
    const [showList, setShowList] = useState<HTTPFlowRuleData[]>([])
    const [sorterTable, setSorterTable, getSorterTable] = useGetSetState<SortProps>()
    const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
    const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
    const onSelectAll = useMemoizedFn(() => {
        if (isAllSelect) {
            setIsAllSelect(false)
            setSelectedRowKeys([])
        } else {
            setIsAllSelect(true)
            setSelectedRowKeys(showList.map((item) => item.Id))
        }
    })
    const onSelectChange = useMemoizedFn((c: boolean, keys: string, rows: HTTPFlowRuleData) => {
        if (c) {
            setSelectedRowKeys([...selectedRowKeys, rows.Id])
        } else {
            setIsAllSelect(false)
            const newSelectedRowKeys = selectedRowKeys.filter((ele) => ele !== rows.Id)
            setSelectedRowKeys(newSelectedRowKeys)
        }
    })

    const compareShowList = useCampare(showList)
    useEffect(() => {
        if (isAllSelect) {
            setSelectedRowKeys(showList.map((item) => item.Id))
        }
    }, [compareShowList, isAllSelect])

    const scrollUpdate = useMemoizedFn((dataLength) => {
        const scrollTop = tableRef.current?.containerRef?.scrollTop
        const clientHeight = tableRef.current?.containerRef?.clientHeight
        const scrollHeight = tableRef.current?.containerRef?.scrollHeight
        let scrollBottom: number | undefined = undefined
        if (typeof scrollTop === "number" && typeof clientHeight === "number" && typeof scrollHeight === "number") {
            scrollBottom = parseInt((scrollHeight - scrollTop - clientHeight).toFixed())
            const isScroll: boolean = scrollHeight > clientHeight
            if (scrollBottom <= 2 && isScroll) {
                onSetScrollToIndex(dataLength)
            }
        }
    })
    // 前端搜索
    const queryUpdateData = useDebounceFn(
        () => {
            try {
                if (
                    tableQuery.Methods.length > 0 ||
                    tableQuery.StatusCode ||
                    tableQuery.SearchURL ||
                    tableQuery.RuleVerboseName ||
                    tableQuery.ExtractedContent
                ) {
                    const newDataTable = sorterFunction(tableData, getSorterTable()) || []
                    const l = newDataTable.length
                    const searchList: HTTPFlowRuleData[] = []
                    for (let index = 0; index < l; index++) {
                        const record = newDataTable[index]

                        let methodsIsPush = true
                        let statusCodeIsPush = true
                        let searchURLIsPush = true

                        let ruleVerboseNameIsPush = true
                        let extractedContentIsPush = true

                        if (tableQuery.Methods.length) {
                            methodsIsPush = tableQuery.Methods.includes(record.Method)
                        }

                        if (tableQuery.StatusCode) {
                            const statusCodes = parseStatusCodes(tableQuery.StatusCode)
                            const codeIsPushArr: boolean[] = []
                            for (let index = 0; index < statusCodes.length; index++) {
                                const element = statusCodes[index]
                                if (record.StatusCode == element) {
                                    codeIsPushArr.push(true)
                                } else {
                                    codeIsPushArr.push(false)
                                }
                            }
                            statusCodeIsPush = codeIsPushArr.includes(true)
                        }

                        if (tableQuery.SearchURL) {
                            searchURLIsPush = record.Url.includes(tableQuery.SearchURL)
                        }

                        if (tableQuery.RuleVerboseName) {
                            ruleVerboseNameIsPush = record.RuleVerboseName.toLocaleLowerCase().includes(
                                tableQuery.RuleVerboseName.toLocaleLowerCase()
                            )
                        }

                        if (tableQuery.ExtractedContent) {
                            extractedContentIsPush = record.ExtractedContent.toLocaleLowerCase().includes(
                                tableQuery.ExtractedContent.toLocaleLowerCase()
                            )
                        }

                        if (
                            methodsIsPush &&
                            statusCodeIsPush &&
                            searchURLIsPush &&
                            ruleVerboseNameIsPush &&
                            extractedContentIsPush
                        ) {
                            searchList.push(record)
                        }
                    }
                    setShowList([...searchList])
                    if (searchList.length) {
                        scrollUpdate(searchList.length)
                    } else {
                        onSetScrollToIndex("0")
                    }
                } else {
                    const newData = sorterFunction(tableData, getSorterTable()) || []
                    setShowList([...newData])
                    if (newData.length) {
                        scrollUpdate(newData.length)
                    } else {
                        onSetScrollToIndex("0")
                    }
                }
            } catch (error) {
                yakitNotify("error", t("YakitNotification.search_failed", {colon: true}) + error)
            }
        },
        {wait: 300}
    ).run

    const update = useDebounceFn(
        () => {
            setLoading(true)
            new Promise((resolve, reject) => {
                try {
                    queryUpdateData()
                    resolve(true)
                } catch (error) {
                    reject(error)
                }
            })
                .catch((e) => {
                    yakitNotify("error", t("YakitNotification.search_failed", {colon: true}) + e)
                })
                .finally(() => {
                    setTimeout(() => {
                        setLoading(false)
                    }, 300)
                })
        },
        {
            wait: 200
        }
    ).run

    useEffect(() => {
        update()
    }, [isRefreshTable])

    const compareTableData = useCampare(tableData)
    const compareSorterTable = useCampare(sorterTable)
    const compareQuery = useCampare(tableQuery)
    useThrottleEffect(
        () => {
            queryUpdateData()
        },
        [compareTableData, compareSorterTable],
        {wait: 500}
    )
    useUpdateEffect(() => {
        update()
    }, [compareQuery])
    const onTableChange = useMemoizedFn((page: number, limit: number, newSort: SortProps, filter: any) => {
        const newTableQuery = {...tableQuery, ...filter}
        setTableQuery(newTableQuery)
        setSorterTable(newSort)
    })

    const onSetCurrentRow = useMemoizedFn((val?: HTTPFlowRuleData) => {
        if (!val) {
            onSelect(undefined)
            return
        }
        if (val?.Id !== currentSelectItem?.Id) {
            onSelect(val)
        }
    })

    const onRowContextMenu = useMemoizedFn((rowData: HTTPFlowRuleData, _, event: React.MouseEvent) => {
        showByRightContext(
            {
                width: 180,
                data: [
                    {
                        label: t("HTTPFlowTable.RowContextMenu.openInNewWindow"),
                        key: "在新窗口打开"
                    }
                ],
                onClick: ({key, keyPath}) => {
                    if (key === "在新窗口打开") {
                        onRowDoubleClick(rowData)
                    }
                }
            },
            event.clientX,
            event.clientY
        )
    })

    const ruleColumns: ColumnsTypeProps[] = useCreation<ColumnsTypeProps[]>(() => {
        return [
            {
                title: t("YakitTable.order"),
                dataKey: "Id",
                fixed: "left",
                width: 100,
                enableDrag: false,
                sorterProps: {
                    sorter: true
                }
            },
            {
                title: t("HttpRuleTable.packet_id"),
                dataKey: "HTTPFlowId",
                width: 100
            },
            {
                title: t("HttpRuleTable.method"),
                dataKey: "Method",
                width: 100,
                filterProps: {
                    filterKey: "Methods",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: [
                        {
                            label: "GET",
                            value: "GET"
                        },
                        {
                            label: "POST",
                            value: "POST"
                        },
                        {
                            label: "HEAD",
                            value: "HEAD"
                        },
                        {
                            label: "PUT",
                            value: "PUT"
                        },
                        {
                            label: "DELETE",
                            value: "DELETE"
                        }
                    ]
                }
            },
            {
                title: t("HttpRuleTable.statusCode"),
                dataKey: "StatusCode",
                width: 140,
                filterProps: {
                    filterKey: "StatusCode",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />,
                    filterInputProps: {
                        placeholder: t("YakitInput.supportInputFormat"),
                        wrapperStyle: {width: 270},
                        onRegular: (value) => {
                            // 只允许输入数字、逗号和连字符，去掉所有其他字符
                            return value.replace(/[^0-9,-]/g, "")
                        }
                    }
                }
            },
            {
                title: "URL",
                dataKey: "Url",
                width: 400,
                filterProps: {
                    filterKey: "SearchURL",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                }
            },
            {
                title: "IP",
                dataKey: "IPAddress",
                width: 200
            },
            {
                title: t("HttpRuleTable.rule_name"),
                dataKey: "RuleVerboseName",
                width: 300,
                filterProps: {
                    filterKey: "RuleVerboseName",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                }
            },
            {
                title: t("HttpRuleTable.rule_data"),
                dataKey: "ExtractedContent",
                filterProps: {
                    filterKey: "ExtractedContent",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                }
            }
        ]
    }, [i18n.language])

    const [exportToken, setExportToken] = useState<string>("")
    const [exportPercentVisible, setExportPercentVisible] = useState<boolean>(false)
    const percentContainerRef = useRef<string>(currentPageTabRouteKey)
    const exportMITMRuleExtractedData = useMemoizedFn(() => {
        const token = randomString(40)
        setExportToken(token)
        ipcRenderer
            .invoke(
                "ExportMITMRuleExtractedDataStream",
                {
                    Type: "json",
                    Filter: {
                        AnalyzedIds: selectedRowKeys.length ? selectedRowKeys : showList.map((item) => item.Id)
                    }
                },
                token
            )
            .then(() => {
                percentContainerRef.current = currentPageTabRouteKey
                setExportPercentVisible(true)
            })
            .catch((error) => {
                yakitNotify("error", `[ExportMITMRuleExtractedData] error: ${error}`)
            })
    })

    return (
        <div className={styles["HttpRule-table-wrapper"]}>
            <TableVirtualResize<HTTPFlowRuleData>
                ref={tableRef}
                renderKey='Id'
                columns={ruleColumns}
                query={tableQuery}
                isRefresh={isRefreshTable || loading}
                loading={loading}
                isShowTotal={true}
                extra={
                    <>
                        <YakitButton
                            type='primary'
                            onClick={exportMITMRuleExtractedData}
                            disabled={executeStatus === "process"}
                        >
                            {t("YakitButton.export")}
                        </YakitButton>
                    </>
                }
                data={showList}
                onChange={onTableChange}
                pagination={{
                    total: showList.length,
                    limit: 1,
                    page: 20,
                    onChange: () => {}
                }}
                rowSelection={{
                    isAll: isAllSelect,
                    type: "checkbox",
                    selectedRowKeys,
                    onSelectAll: onSelectAll,
                    onChangeCheckboxSingle: onSelectChange
                }}
                enableDrag={true}
                currentSelectItem={currentSelectItem}
                onSetCurrentRow={onSetCurrentRow}
                useUpAndDown
                inMouseEnterTable
                scrollToIndex={scrollToIndex}
                onRowContextMenu={onRowContextMenu}
                onRowDoubleClick={onRowDoubleClick}
            ></TableVirtualResize>
            {exportPercentVisible && (
                <ImportExportProgress
                    getContainer={
                        document.getElementById(`main-operator-page-body-${percentContainerRef.current}`) || undefined
                    }
                    visible={exportPercentVisible}
                    title={t("HttpRuleTable.export_rule_data")}
                    subTitle={t("HttpRuleTable.query_in_database")}
                    token={exportToken}
                    apiKey='ExportMITMRuleExtractedDataStream'
                    onClose={(finish, streamData) => {
                        setExportPercentVisible(false)
                        if (finish) {
                            const path = streamData[streamData.length - 1]?.ExportFilePath
                            if (path) {
                                openABSFileLocated(path)
                                yakitNotify("success", t("YakitNotification.exportSuccess"))
                            } else {
                                yakitNotify("error", t("HttpRuleTable.export_failed_path_not_found"))
                            }
                        }
                    }}
                />
            )}
        </div>
    )
})
