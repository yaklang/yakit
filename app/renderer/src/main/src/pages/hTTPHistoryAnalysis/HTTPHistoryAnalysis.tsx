import React, {Suspense, useEffect, useRef, useState} from "react"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {
    useControllableValue,
    useCreation,
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
    OutlineRefreshIcon,
    OutlineReplyIcon,
    OutlineSearchIcon,
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
import {ImportExportProgress} from "@/components/HTTPFlowTable/HTTPFlowTable"
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
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {getSelectionEditorByteCount} from "@/components/yakitUI/YakitEditor/editorUtils"
import {YakitRoute} from "@/enums/yakitRoute"
import {HTTPHistoryFilter} from "./HTTPHistory/HTTPHistoryFilter"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import classNames from "classnames"
import {cloneDeep} from "lodash"
import styles from "./HTTPHistoryAnalysis.module.scss"

const MITMRule = React.lazy(() => import("../mitm/MITMRule/MITMRule"))

const {ipcRenderer} = window.require("electron")

interface HTTPHistoryAnalysisProps {
    pageId: string
}
export const HTTPHistoryAnalysis: React.FC<HTTPHistoryAnalysisProps> = React.memo((props) => {
    const {pageId} = props
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    const initPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.DB_HTTPHistoryAnalysis, pageId)
        if (currentItem && currentItem.pageParamsInfo.hTTPHistoryAnalysisPageInfo) {
            return {...currentItem.pageParamsInfo.hTTPHistoryAnalysisPageInfo}
        }
        return {...defaultHTTPHistoryAnalysisPageInfo}
    })
    const [pageInfo, setPageInfo] = useState<HTTPHistoryAnalysisPageInfo>(initPageInfo())
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")

    const [isAllHttpFlow, setIsAllHttpFlow] = useState<boolean>(false)
    const [selectedHttpFlowIds, setSelectedHttpFlowIds] = useState<string[]>([])
    const [hTTPFlowFilter, setHTTPFlowFilter] = useState<YakQueryHTTPFlowRequest>()

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
    const ResizeBoxProps = useCreation(() => {
        let p = cloneDeep(lastRatio)

        if (!openBottomTabsFlag) {
            p.firstRatio = "100%"
            p.secondRatio = "0%"
        }

        return p
    }, [openBottomTabsFlag, lastRatio])

    const onClickFooterTabItem = (key: TabKeys) => {
        setOpenBottomTabsFlag(true)
        setCurBottomTab(key)
    }

    useEffect(() => {
        setOpenBottomTabsFlag(!pageInfo.webFuzzer)
        setCurBottomTab(pageInfo.webFuzzer ? undefined : "rule")
    }, [pageInfo.webFuzzer])

    return (
        <div className={styles["HTTPHistoryAnalysis"]} ref={hTTPHistoryAnalysisRef}>
            <YakitResizeBox
                style={{height: "calc(100% - 24px)"}}
                isVer={true}
                freeze={openBottomTabsFlag}
                isRecalculateWH={openBottomTabsFlag}
                firstNode={() => (
                    <div className={styles["HTTPHistoryAnalysis-top"]}>
                        <HTTPHistoryFilter
                            onSetSelectedHttpFlowIds={setSelectedHttpFlowIds}
                            onSetIsAllHttpFlow={setIsAllHttpFlow}
                            onSetHTTPFlowFilter={(filterStr) => {
                                try {
                                    const filter = JSON.parse(filterStr) || {}
                                    delete filter.Pagination
                                    setHTTPFlowFilter(filter)
                                } catch (error) {}
                            }}
                            downstreamProxy={downstreamProxy}
                            toWebFuzzer={pageInfo.webFuzzer}
                            runtimeId={pageInfo.runtimeId}
                            sourceType={pageInfo.sourceType}
                            executeStatus={executeStatus}
                        />
                    </div>
                )}
                firstMinSize={40}
                secondNode={
                    <div className={styles["HTTPHistoryAnalysis-bottom"]}>
                        {curBottomTab && (
                            <AnalysisMain
                                curBottomTab={curBottomTab}
                                onSetCurBottomTab={setCurBottomTab}
                                onSetOpenBottomTabsFlag={setOpenBottomTabsFlag}
                                hTTPFlowFilter={hTTPFlowFilter}
                                httpFlowIds={isAllHttpFlow ? [] : selectedHttpFlowIds.map((id) => Number(id))}
                                downstreamProxy={downstreamProxy}
                                setExecuteStatus={setExecuteStatus}
                            />
                        )}
                    </div>
                }
                secondNodeStyle={{
                    padding: 0,
                    display: openBottomTabsFlag ? "block" : "none",
                    minHeight: openBottomTabsFlag ? "300px" : "0"
                }}
                lineStyle={{display: ""}}
                onMouseUp={({firstSizePercent, secondSizePercent}) => {
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
                }}
                {...ResizeBoxProps}
            />
            <div className={styles["HTTPHistoryAnalysis-footer-tab"]}>
                {footerTabs.map((item) => (
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
}

interface AnalysisMainProps {
    curBottomTab: TabKeys
    onSetCurBottomTab: (tab?: TabKeys) => void
    onSetOpenBottomTabsFlag: (flag: boolean) => void
    hTTPFlowFilter?: YakQueryHTTPFlowRequest
    httpFlowIds: number[]
    downstreamProxy: string
    setExecuteStatus: (s: ExpandAndRetractExcessiveState) => void
}
const AnalysisMain: React.FC<AnalysisMainProps> = React.memo((props) => {
    const {curBottomTab, onSetCurBottomTab, onSetOpenBottomTabsFlag, hTTPFlowFilter, httpFlowIds, downstreamProxy} =
        props

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
        notifyFlag && yakitNotify("success", "保存成功")
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
        ["rule"]: false,
        ["hot-patch"]: false
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
        return p
    }, [lastRatio, fullScreenFirstNode, fullScreenSecondNode])
    // #endregion

    // #region 执行表单
    const [sourceType, setSourceType] = useState<SourceType>("database")
    const [concurrency, setConcurrency] = useState<number>(10)
    const [enableDeduplicate, setEnableDeduplicate] = useState<boolean>(false)

    // 编辑器
    const [rawRequest, setRawRequest] = useState<string>("")
    const [rawResponse, setRawResponse] = useState<string>("")
    const [refreshTriggerReqEditor, setRefreshTriggerReqEditor] = useState<boolean>(false)
    const [refreshTriggerResEditor, setRefreshTriggerResEditor] = useState<boolean>(false)
    const [reqEditor, setReqEditor] = useState<IMonacoEditor>()
    const [resEditor, setResEditor] = useState<IMonacoEditor>()
    const [reqSelectionByteCount, setReqSelectionByteCount] = useState<number>(0)
    const [resSelectionByteCount, setResSelectionByteCount] = useState<number>(0)

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

    useEffect(() => {
        try {
            if (reqEditor) {
                getSelectionEditorByteCount(reqEditor, (byteCount) => {
                    setReqSelectionByteCount(byteCount)
                })
            }
            if (resEditor) {
                getSelectionEditorByteCount(resEditor, (byteCount) => {
                    setResSelectionByteCount(byteCount)
                })
            }
        } catch (e) {}
    }, [reqEditor, resEditor])

    // #endregion

    // #region 执行
    const execParamsRef = useRef<AnalyzeHTTPFlowRequest>()
    const tokenRef = useRef<string>(randomString(40))
    const [isExit, setIsExit] = useState<boolean>(false)
    const [executeStatus, setExecuteStatus] = useControllableValue<ExpandAndRetractExcessiveState>(props, {
        defaultValue: "default",
        valuePropName: "executeStatus",
        trigger: "setExecuteStatus"
    })
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
                    }
                }
            }, 300)
        },
        onError: () => {
            setExecuteStatus("error")
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

    const onStartExecute = () => {
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
            }
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
    }

    const onStopExecute = () => {
        ipcRenderer
            .invoke(`cancel-AnalyzeHTTPFlow`, tokenRef.current)
            .then(() => {
                debugPluginStreamEvent.stop()
                setExecuteStatus("finished")
            })
            .catch((e: any) => {
                yakitNotify("error", "取消流量分析出错:" + e)
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
    // #endregion

    return (
        <div className={styles["AnalysisMain"]}>
            <div className={styles["AnalysisMain-header"]}>
                <div className={styles["AnalysisMain-header-left"]}>
                    {footerTabs.map((item) => (
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
                    firstNode={() => (
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
                                                    title={"确认重置热加载代码？"}
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
                                                    保存模板
                                                </YakitButton>
                                                <AddHotCodeTemplate
                                                    type='httpflow-analyze'
                                                    hotPatchTempLocal={hotPatchTempLocal}
                                                    hotPatchCode={curHotPatch}
                                                    visible={addHotCodeTemplateVisible}
                                                    onSetAddHotCodeTemplateVisible={setAddHotCodeTemplateVisible}
                                                ></AddHotCodeTemplate>
                                                <YakitButton type='outline1' onClick={() => onSaveHotCode()}>
                                                    保存
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
                    )}
                    firstNodeStyle={{
                        display: fullScreenSecondNode ? "none" : ""
                    }}
                    lineStyle={{display: fullScreenFirstNode || fullScreenSecondNode ? "none" : ""}}
                    firstMinSize={650}
                    secondMinSize={500}
                    secondNode={
                        <div className={styles["AnalysisMain-right"]}>
                            {executeStatus === "default" || isExit ? (
                                <div className={styles["AnalysisMain-right-default"]}>
                                    <div className={styles["AnalysisMain-right-default-header"]}>
                                        <div className={styles["title-wrapper"]}>
                                            <span className={styles["title"]}>执行结果</span>{" "}
                                            设置好热加载或规则后，即可点击执行进行处理
                                        </div>
                                    </div>
                                    <div className={styles["exec-form-item"]}>
                                        <span className={styles["exec-form-item-label"]}>数据类型：</span>
                                        <YakitRadioButtons
                                            value={sourceType}
                                            onChange={(e) => setSourceType(e.target.value)}
                                            buttonStyle='solid'
                                            options={[
                                                {
                                                    value: "database",
                                                    label: "筛选流量"
                                                },
                                                {
                                                    value: "rawpacket",
                                                    label: "数据包"
                                                }
                                            ]}
                                            size={"middle"}
                                        />
                                    </div>
                                    <div
                                        className={styles["exec-form-item"]}
                                        style={{height: sourceType === "rawpacket" ? "calc(100% - 200px)" : undefined}}
                                    >
                                        {sourceType === "database" ? (
                                            <>
                                                <span className={styles["exec-form-item-label"]}></span>
                                                <span style={{color: "var(--yakit-primary-5)"}}>
                                                    筛选上面流量勾选后进行分析，未勾选默认跑所有流量
                                                </span>
                                            </>
                                        ) : (
                                            <div className={styles["rawpacket-editor-wrapper"]}>
                                                <YakitResizeBox
                                                    firstNode={
                                                        <>
                                                            <NewHTTPPacketEditor
                                                                originValue={rawRequest}
                                                                isShowBeautifyRender={false}
                                                                title={
                                                                    <div className={styles["row-editor-title"]}>
                                                                        <span style={{fontSize: 12}}>Request</span>
                                                                        {reqSelectionByteCount > 0 && (
                                                                            <YakitTag>
                                                                                {reqSelectionByteCount} bytes
                                                                            </YakitTag>
                                                                        )}
                                                                    </div>
                                                                }
                                                                extra={
                                                                    <>
                                                                        <YakitButton
                                                                            size='small'
                                                                            onClick={() => {
                                                                                beautifyCode("req", rawRequest)
                                                                            }}
                                                                        >
                                                                            美化
                                                                        </YakitButton>
                                                                    </>
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
                                                        </>
                                                    }
                                                    secondNode={
                                                        <>
                                                            <NewHTTPPacketEditor
                                                                originValue={rawResponse}
                                                                isShowBeautifyRender={false}
                                                                title={
                                                                    <div className={styles["row-editor-title"]}>
                                                                        <span style={{fontSize: 12}}>Response</span>
                                                                        {resSelectionByteCount > 0 && (
                                                                            <YakitTag>
                                                                                {resSelectionByteCount} bytes
                                                                            </YakitTag>
                                                                        )}
                                                                    </div>
                                                                }
                                                                extra={
                                                                    <>
                                                                        <YakitButton
                                                                            size='small'
                                                                            onClick={() => {
                                                                                beautifyCode("res", rawResponse)
                                                                            }}
                                                                        >
                                                                            美化
                                                                        </YakitButton>
                                                                    </>
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
                                                        </>
                                                    }
                                                    firstMinSize={300}
                                                    secondMinSize={300}
                                                ></YakitResizeBox>
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles["exec-form-item"]}>
                                        <span className={styles["exec-form-item-label"]}>并发：</span>
                                        <YakitInputNumber
                                            type='horizontal'
                                            size='small'
                                            value={concurrency}
                                            onChange={(v) => setConcurrency(v as number)}
                                        />
                                    </div>
                                    <div className={styles["exec-form-item"]}>
                                        <span className={styles["exec-form-item-label"]}>单条记录内数据去重：</span>
                                        <YakitSwitch checked={enableDeduplicate} onChange={setEnableDeduplicate} />
                                    </div>
                                    <div className={styles["exec-btn"]}>
                                        <YakitButton
                                            size='middle'
                                            type='primary'
                                            onClick={onStartExecute}
                                            style={{width: 100}}
                                        >
                                            执行
                                        </YakitButton>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles["AnalysisMain-right-noDefault"]}>
                                    {/* 执行结果 */}
                                    <div className={styles["AnalysisMain-header"]}>
                                        <div className={styles["AnalysisMain-header-text"]}>执行结果</div>
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
                                                    ? "执行"
                                                    : executeStatus === "process"
                                                    ? "停止"
                                                    : executeStatus === "paused"
                                                    ? "继续"
                                                    : "退出"}
                                            </YakitButton>
                                            <YakitButton
                                                type='outline2'
                                                icon={<OutlineReplyIcon />}
                                                onClick={() => {
                                                    onStopExecute()
                                                    setTimeout(() => {
                                                        setFullScreenSecondNode(false)
                                                        setIsExit(true)
                                                    }, 300)
                                                }}
                                            >
                                                返回
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
                    secondNodeStyle={{
                        padding: fullScreenFirstNode || fullScreenSecondNode ? 0 : undefined,
                        display: fullScreenFirstNode ? "none" : ""
                    }}
                    onMouseUp={({firstSizePercent, secondSizePercent}) => {
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
                    }}
                    {...ResizeBoxProps}
                />
            </div>
        </div>
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

    return (
        <div className={styles["HttpRule-first"]}>
            <HttpRuleTable
                tableData={tableData}
                currentSelectItem={currentSelectItem}
                onSelect={(i) => {
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
                }}
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
                yakitNotify("error", "搜索失败:" + error)
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
                    yakitNotify("error", "搜索失败:" + e)
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
                        label: "在新窗口打开",
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
                title: "序号",
                dataKey: "Id",
                fixed: "left",
                width: 100,
                enableDrag: false,
                sorterProps: {
                    sorter: true
                }
            },
            {
                title: "数据包ID",
                dataKey: "HTTPFlowId",
                width: 100
            },
            {
                title: "方法",
                dataKey: "Method",
                width: 80,
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
                title: "状态码",
                dataKey: "StatusCode",
                width: 100,
                filterProps: {
                    filterKey: "StatusCode",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />,
                    filterInputProps: {
                        placeholder: "支持输入200,200-204格式，多个用逗号分隔",
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
                title: "规则名",
                dataKey: "RuleVerboseName",
                width: 300,
                filterProps: {
                    filterKey: "RuleVerboseName",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                }
            },
            {
                title: "规则数据",
                dataKey: "ExtractedContent",
                filterProps: {
                    filterKey: "ExtractedContent",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                }
            }
        ]
    }, [])

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
                            导出
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
                    title='导出规则数据'
                    subTitle='查询数据库中'
                    token={exportToken}
                    apiKey='ExportMITMRuleExtractedDataStream'
                    onClose={(finish, streamData) => {
                        setExportPercentVisible(false)
                        if (finish) {
                            const path = streamData[streamData.length - 1]?.ExportFilePath
                            if (path) {
                                openABSFileLocated(path)
                                yakitNotify("success", "导出成功")
                            } else {
                                yakitNotify("error", "导出失败，路径找不到")
                            }
                        }
                    }}
                />
            )}
        </div>
    )
})
