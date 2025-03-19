import React, {ReactElement, useEffect, useRef, useState} from "react"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {useCreation, useDebounceEffect, useDebounceFn, useInViewport, useMemoizedFn} from "ahooks"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteHistoryGV} from "@/enums/history"
import classNames from "classnames"
import {
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineRefreshIcon,
    OutlineSearchIcon
} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {AddHotCodeTemplate, HotCodeTemplate, HotPatchTempItem} from "../fuzzer/HTTPFuzzerHotPatch"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {HotPatchDefaultContent} from "@/defaultConstants/hTTPHistoryAnalysis"
import {MITMRule} from "../mitm/MITMRule/MITMRule"
import {MITMContentReplacerRule, MITMRulePropRef} from "../mitm/MITMRule/MITMRuleType"
import {yakitNotify} from "@/utils/notification"
import useGetSetState from "../pluginHub/hooks/useGetSetState"
import {useStore} from "@/store/mitmState"
import {ExpandAndRetractExcessiveState} from "../plugins/operator/expandAndRetract/ExpandAndRetract"
import {PluginExecuteProgress} from "../plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {HorizontalScrollCard} from "../plugins/operator/horizontalScrollCard/HorizontalScrollCard"
import PluginTabs from "@/components/businessUI/PluginTabs/PluginTabs"
import {HTTPHistory} from "@/components/HTTPHistory"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {v4 as uuidv4} from "uuid"
import {MITMConsts} from "../mitm/MITMConsts"
import {HistoryHighLightText, HTTPFlowDetailRequestAndResponse} from "@/components/HTTPFlowDetail"
import {HTTPFlow} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {randomString} from "@/utils/randomUtil"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {useCampare} from "@/hook/useCompare/useCompare"
import {openABSFileLocated} from "@/utils/openWebsite"
import styles from "./HTTPHistoryAnalysis.module.scss"

const {TabPane} = PluginTabs
const {ipcRenderer} = window.require("electron")

type tabKeys = "hot-patch" | "rule"
interface TabsItem {
    key: tabKeys
    label: ReactElement | string
    contShow: boolean
}

interface AnalyzeHTTPFlowRequest {
    HotPatchCode: string
    Replacers: MITMContentReplacerRule[]
}

interface HTTPHistoryAnalysisProps {}
export const HTTPHistoryAnalysis: React.FC<HTTPHistoryAnalysisProps> = (props) => {
    const [fullScreenFirstNode, setFullScreenFirstNode] = useState<boolean>(false)

    // #region 左侧tab
    const [openTabsFlag, setOpenTabsFlag] = useState<boolean>(false)
    const [curTabKey, setCurTabKey] = useState<tabKeys>("hot-patch")
    const [tabsData, setTabsData] = useState<Array<TabsItem>>([
        {
            key: "hot-patch",
            label: "热加载",
            contShow: true // 初始为true
        },
        {
            key: "rule",
            label: "规则",
            contShow: false // 初始为false
        }
    ])
    useEffect(() => {
        getRemoteValue(RemoteHistoryGV.HistoryAnalysisLeftTabs).then((setting: string) => {
            if (setting) {
                try {
                    const tabs = JSON.parse(setting)
                    setTabsData((prev) => {
                        prev.forEach((i) => {
                            if (i.key === tabs.curTabKey) {
                                i.contShow = tabs.contShow
                            } else {
                                i.contShow = false
                            }
                        })
                        return [...prev]
                    })
                    setCurTabKey(tabs.curTabKey)
                } catch (error) {
                    setTabsData((prev) => {
                        prev.forEach((i) => {
                            if (i.key === "hot-patch") {
                                i.contShow = true
                            } else {
                                i.contShow = false
                            }
                        })
                        return [...prev]
                    })
                    setCurTabKey("hot-patch")
                }
            }
        })
    }, [])
    const handleTabClick = async (item: TabsItem) => {
        // 切换到其他tab
        if (curTabKey !== item.key) {
            if (curTabKey === "hot-patch") {
                const res = await judgmentHotPatchChange()
                if (res) {
                    yakitNotify("info", "检测到热加载内容发生变更，请保存")
                    return
                }
            } else if (curTabKey === "rule") {
                const res = await judgmentRulesChange()
                if (res) {
                    yakitNotify("info", "检测到规则内容发生变更，请保存")
                    return
                }
            }
        }
        const contShow = !item.contShow
        setTabsData((prev) => {
            prev.forEach((i) => {
                if (i.key === item.key) {
                    i.contShow = contShow
                } else {
                    i.contShow = false
                }
            })
            return [...prev]
        })
        setRemoteValue(
            RemoteHistoryGV.HistoryAnalysisLeftTabs,
            JSON.stringify({contShow: contShow, curTabKey: item.key})
        )
        setCurTabKey(item.key)
        setFullScreenFirstNode(false)
    }
    useEffect(() => {
        setOpenTabsFlag(tabsData.some((item) => item.contShow))
    }, [tabsData])
    // #endregion

    // #region 热加载
    const [curHotPatch, setCurHotPatch, getCurHotPatch] = useGetSetState<string>("")
    const [hotPatchTempLocal, setHotPatchTempLocal] = useState<HotPatchTempItem[]>([])
    const [addHotCodeTemplateVisible, setAddHotCodeTemplateVisible] = useState<boolean>(false)
    useEffect(() => {
        getRemoteValue(RemoteHistoryGV.HistoryAnalysisHotPatchCodeSave).then((setting: string) => {
            if (setting) {
                setCurHotPatch(setting)
            } else {
                setCurHotPatch("")
            }
        })
    }, [])
    const onSaveHotCode = (notifyFlag: boolean = true) => {
        setRemoteValue(RemoteHistoryGV.HistoryAnalysisHotPatchCodeSave, curHotPatch)
        notifyFlag && yakitNotify("success", "保存成功")
    }
    const judgmentHotPatchChange = useMemoizedFn(() => {
        return new Promise((resolve) => {
            getRemoteValue(RemoteHistoryGV.HistoryAnalysisHotPatchCodeSave)
                .then((res: string) => {
                    if (res !== getCurHotPatch()) {
                        resolve(true)
                    } else {
                        resolve(false)
                    }
                })
                .catch(() => {
                    resolve(false)
                })
        })
    })
    // #endregion

    // #region 规则配置
    const {mitmStatus} = useStore()
    const mitmRuleRef = useRef<MITMRulePropRef>(null)
    const rulesResetFieldsRef = useRef({
        NoReplace: true,
        Result: "",
        ExtraHeaders: [],
        ExtraCookies: [],
        Drop: false,
        ExtraRepeat: false
    })
    const [curRules, setCurRules, getCurRules] = useGetSetState<MITMContentReplacerRule[]>([])
    const judgmentRulesChange = useMemoizedFn(() => {
        return new Promise((resolve) => {
            ipcRenderer
                .invoke("GetCurrentRules", {})
                .then((rsp: {Rules: MITMContentReplacerRule[]}) => {
                    const oldSaveRules = rsp.Rules.map((item) => ({
                        ...item,
                        Id: item.Index,
                        ...rulesResetFieldsRef.current
                    }))
                    if (
                        JSON.stringify(oldSaveRules) !==
                        JSON.stringify(
                            getCurRules().map((item) => ({...item, Id: item.Index, ...rulesResetFieldsRef.current}))
                        )
                    ) {
                        resolve(true)
                    } else {
                        resolve(false)
                    }
                })
                .catch(() => {
                    resolve(false)
                })
        })
    })
    // #endregion

    // #region 执行
    const execParamsRef = useRef<AnalyzeHTTPFlowRequest>()
    const tokenRef = useRef<string>(randomString(40))
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")
    const [resetTableKey, setResetTableKey] = useState<string>(randomString(40))
    const [currentSelectItem, setCurrentSelectItem] = useState<HTTPFlowRuleData>()
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
        handleTabClick({
            key: curTabKey,
            label: "",
            contShow: true
        })

        // 热加载、规则保存操作
        onSaveHotCode(false)
        mitmRuleRef.current?.onSaveToDataBase(() => {})

        onTabChange("ruleData")
        setResetTableKey(randomString(40))
        setCurrentSelectItem(undefined)
        debugPluginStreamEvent.reset()

        execParamsRef.current = {
            HotPatchCode: curHotPatch,
            Replacers: [...curRules]
        }
        ipcRenderer.invoke("AnalyzeHTTPFlow", execParamsRef.current, tokenRef.current).then(() => {
            debugPluginStreamEvent.start()
            setExecuteStatus("process")
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
    // #endregion

    const [activeKey, setActiveKey] = useState<"ruleData" | "historyData">("ruleData")
    const onTabChange = useMemoizedFn((key) => {
        setActiveKey(key)
    })

    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "70%",
            secondRatio: "30%"
        }

        if (openTabsFlag) {
            p.firstRatio = "70%"
            if (executeStatus !== "default") {
                p.firstRatio = "50%"
                p.secondRatio = "50%"
            }
        } else {
            p.firstRatio = "24px"
        }

        if (fullScreenFirstNode) {
            p.secondRatio = "0%"
            p.firstRatio = "100%"
        }
        return p
    }, [fullScreenFirstNode, openTabsFlag, executeStatus])

    return (
        <div className={styles["HTTPHistoryAnalysis"]}>
            <YakitResizeBox
                isVer={false}
                freeze={openTabsFlag}
                isRecalculateWH={openTabsFlag}
                firstNode={() => (
                    <div className={styles["HTTPHistoryAnalysis-left"]}>
                        <div className={styles["tab-wrap"]}>
                            <div className={styles["tab"]}>
                                {tabsData.map((item) => (
                                    <div
                                        className={classNames(styles["tab-item"], {
                                            [styles["tab-item-active"]]: curTabKey === item.key,
                                            [styles["tab-item-unshowCont"]]: curTabKey === item.key && !item.contShow
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
                                className={classNames(styles["tab-cont-item"])}
                                style={{
                                    overflowY: "hidden"
                                }}
                            >
                                <div
                                    className={styles["hotPatch-wrapper"]}
                                    style={{display: curTabKey === "hot-patch" ? "block" : "none"}}
                                >
                                    <div className={styles["hotPatch-header"]}>
                                        <div className={styles["hotPatch-header-left"]}>
                                            <HotCodeTemplate
                                                type='history'
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
                                                type='history'
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
                                </div>
                                <div
                                    className={styles["rule-wrapper"]}
                                    style={{display: curTabKey === "rule" ? "block" : "none"}}
                                >
                                    <MITMRule
                                        ref={mitmRuleRef}
                                        ruleUse='historyAnalysis'
                                        visible={true}
                                        status={mitmStatus}
                                        setVisible={() => {}}
                                        excludeColumnsKey={["NoReplace", "Drop", "ExtraRepeat"]}
                                        excludeBatchMenuKey={["no-replace", "replace"]}
                                        onSetRules={(r) => {
                                            setCurRules(
                                                r.map((item) => ({
                                                    ...item,
                                                    ...rulesResetFieldsRef.current
                                                }))
                                            )
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                lineStyle={{display: fullScreenFirstNode ? "none" : ""}}
                firstMinSize={openTabsFlag ? "600px" : "24px"}
                secondMinSize={500}
                secondNode={
                    <div className={styles["HTTPHistoryAnalysis-right"]}>
                        {executeStatus === "default" ? (
                            <div className={styles["HTTPHistoryAnalysis-right-default"]}>
                                <div className={styles["HTTPHistoryAnalysis-right-default-title"]}>
                                    <span className={styles["title"]}>执行结果</span>{" "}
                                    设置好热加载或规则后，即可点击执行进行处理
                                </div>
                                <div className={styles["exec-btn"]}>
                                    <YakitButton
                                        size='large'
                                        type='primary'
                                        style={{width: 100}}
                                        onClick={onStartExecute}
                                    >
                                        执行
                                    </YakitButton>
                                </div>
                            </div>
                        ) : (
                            <div className={styles["HTTPHistoryAnalysis-right-noDefault"]}>
                                {/* 执行结果 */}
                                <div className={styles["HTTPHistoryAnalysis-header"]}>
                                    <div className={styles["HTTPHistoryAnalysis-header-text"]}>执行结果</div>
                                    <div className={styles["HTTPHistoryAnalysis-execStatus-wrapper"]}>
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
                                    </div>
                                </div>
                                <div className={styles["HTTPHistoryAnalysis-result"]}>
                                    {streamInfo.cardState.length > 0 && (
                                        <HorizontalScrollCard title='Data Card' data={streamInfo.cardState} />
                                    )}
                                    <div className={styles["HTTPHistoryAnalysis-result-tab"]}>
                                        <PluginTabs activeKey={activeKey} onChange={onTabChange}>
                                            <TabPane key={"ruleData"} tab={"规则数据"}>
                                                <div className={styles["rule-data"]}>
                                                    <HttpRule
                                                        resetTableKey={resetTableKey}
                                                        onSetResetTableKey={setResetTableKey}
                                                        tableData={streamInfo.rulesState}
                                                        currentSelectItem={currentSelectItem}
                                                        onSetCurrentSelectItem={setCurrentSelectItem}
                                                    />
                                                </div>
                                            </TabPane>
                                            <TabPane
                                                key={"historyData"}
                                                tab={"流量数据"}
                                                disabled={
                                                    executeStatus === "process" ||
                                                    streamInfo.rulesState.map((item) => item.Id).length === 0
                                                }
                                            >
                                                <div className={styles["history-data"]}>
                                                    {executeStatus !== "process" && (
                                                        <HTTPHistory
                                                            pageType='History_Analysis_HistoryData'
                                                            showAdvancedConfig={false}
                                                            showProtocolType={false}
                                                            showBatchActions={false}
                                                            showDelAll={false}
                                                            params={{
                                                                AnalyzedIds: streamInfo.rulesState.map(
                                                                    (item) => item.Id
                                                                )
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            </TabPane>
                                        </PluginTabs>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                }
                secondNodeStyle={{
                    padding: fullScreenFirstNode ? 0 : undefined,
                    display: fullScreenFirstNode ? "none" : ""
                }}
                {...ResizeBoxProps}
            />
        </div>
    )
}

interface HttpRuleProps {
    resetTableKey: string
    onSetResetTableKey: (k: string) => void
    tableData: HTTPFlowRuleData[]
    currentSelectItem?: HTTPFlowRuleData
    onSetCurrentSelectItem: (c?: HTTPFlowRuleData) => void
}
const HttpRule: React.FC<HttpRuleProps> = (props) => {
    const {resetTableKey, onSetResetTableKey, tableData, currentSelectItem, onSetCurrentSelectItem} = props
    const [historyId, setHistoryId] = useState<string>(uuidv4())
    const httpRuleSecondRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(httpRuleSecondRef)

    const [highLightItem, setHighLightItem] = useState<HistoryHighLightText>()

    // #region mitm页面配置代理用于发送webFuzzer带过去
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
    // #endregion

    // #region 通过HTTPFlowId去拿去数据包详细数据
    const lasetIdRef = useRef<number>()
    const [flowRequestLoad, setFlowRequestLoad] = useState<boolean>(false)
    const [flowResponseLoad, setFlowResponseLoad] = useState<boolean>(false)
    const [flow, setFlow] = useState<HTTPFlow>()
    const getHTTPFlowById = useDebounceFn(
        useMemoizedFn((hTTPFlowId: number) => {
            setFlowRequestLoad(true)
            setFlowResponseLoad(true)
            ipcRenderer
                .invoke("GetHTTPFlowById", {Id: hTTPFlowId})
                .then((i: HTTPFlow) => {
                    if (i.Id == lasetIdRef.current) {
                        setFlow(i)
                    }
                })
                .catch((e: any) => {
                    setFlow(undefined)
                    onSetCurrentSelectItem(undefined)
                    setHighLightItem(undefined)
                    yakitNotify("error", `Query HTTPFlow failed: ${e}`)
                })
                .finally(() => {
                    setTimeout(() => {
                        setFlowRequestLoad(false)
                        setFlowResponseLoad(false)
                    }, 200)
                })
        }),
        {wait: 100}
    ).run
    // #endregion

    // #region 定位数据包id
    const [scrollToIndex, setScrollToIndex] = useState<string>()
    const scrollTo = useMemoizedFn((id) => {
        const index = tableData.findIndex((item: HTTPFlowRuleData) => item.Id === id)
        // 加随机值触发更新渲染执行表格跳转方法
        if (index !== -1) setScrollToIndex(index + "_" + Math.random())
    })
    // #endregion

    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "50%",
            secondRatio: "50%"
        }
        if (!currentSelectItem?.HTTPFlowId) {
            p.secondRatio = "0%"
            p.firstRatio = "100%"
        }
        return p
    }, [currentSelectItem])

    return (
        <YakitResizeBox
            isVer={true}
            firstNode={() => (
                <div className={styles["HttpRule-first"]}>
                    <HttpRuleTable
                        resetTableKey={resetTableKey}
                        onSetResetTableKey={onSetResetTableKey}
                        tableData={tableData}
                        currentSelectItem={currentSelectItem}
                        onSelect={(i) => {
                            if (!i) {
                                onSetCurrentSelectItem(undefined)
                                return
                            }
                            onSetCurrentSelectItem(i)

                            lasetIdRef.current = i.HTTPFlowId
                            getHTTPFlowById(i.HTTPFlowId)
                        }}
                        scrollToIndex={scrollToIndex}
                    />
                </div>
            )}
            secondNode={
                <div className={styles["HttpRule-second"]} ref={httpRuleSecondRef}>
                    {currentSelectItem?.HTTPFlowId && flow && (
                        <HTTPFlowDetailRequestAndResponse
                            pageType='History_Analysis_ruleData'
                            historyId={historyId}
                            noHeader={true}
                            sendToWebFuzzer={true}
                            downstreamProxyStr={downstreamProxy}
                            id={currentSelectItem?.HTTPFlowId || 0}
                            defaultHttps={flow?.IsHTTPS}
                            Tags={flow?.Tags}
                            flow={flow}
                            flowRequestLoad={flowRequestLoad}
                            flowResponseLoad={flowResponseLoad}
                            scrollTo={scrollTo}
                            scrollID={currentSelectItem.Id}
                            // highLightItem={undefined}
                        />
                    )}
                </div>
            }
            firstMinSize={160}
            secondMinSize={200}
            secondNodeStyle={{
                display: currentSelectItem?.HTTPFlowId === undefined ? "none" : "",
                padding: currentSelectItem?.HTTPFlowId === undefined ? 0 : undefined
            }}
            lineStyle={{display: currentSelectItem?.HTTPFlowId === undefined ? "none" : ""}}
            lineDirection='top'
            {...ResizeBoxProps}
        />
    )
}

interface QueryAnalyzedHTTPFlowRuleFilter {
    RuleVerboseName?: string
    Rule?: string
}
export interface HTTPFlowRuleData {
    Id: number
    HTTPFlowId: number
    RuleVerboseName: string
    Rule: string
}
interface HttpRuleTableProps {
    resetTableKey: string
    onSetResetTableKey: (k: string) => void
    tableData: HTTPFlowRuleData[]
    currentSelectItem?: HTTPFlowRuleData
    onSelect: (c?: HTTPFlowRuleData) => void
    scrollToIndex?: string
}
const HttpRuleTable: React.FC<HttpRuleTableProps> = (props) => {
    const {resetTableKey, onSetResetTableKey, tableData, currentSelectItem, onSelect, scrollToIndex} = props
    const [isRefresh, setIsRefresh] = useState<boolean>(true)
    const [tableQuery, setTableQuery] = useState<QueryAnalyzedHTTPFlowRuleFilter>({
        RuleVerboseName: "",
        Rule: ""
    })
    const [showList, setShowList] = useState<HTTPFlowRuleData[]>([])
    const compareTableData = useCampare(tableData)

    // 前端搜索
    const queryUpdateData = useDebounceFn(
        () => {
            if (tableQuery.RuleVerboseName || tableQuery.Rule) {
                const l = tableData.length
                const searchList: HTTPFlowRuleData[] = []
                for (let index = 0; index < l; index++) {
                    const record = tableData[index]
                    let ruleVerboseNameIsPush = true
                    let ruleIsPush = true

                    if (tableQuery.RuleVerboseName) {
                        ruleVerboseNameIsPush = record.RuleVerboseName.toLocaleLowerCase().includes(
                            tableQuery.RuleVerboseName.toLocaleLowerCase()
                        )
                    }

                    if (tableQuery.Rule) {
                        ruleIsPush = record.Rule.toLocaleLowerCase().includes(tableQuery.Rule.toLocaleLowerCase())
                    }

                    if (ruleVerboseNameIsPush && ruleIsPush) {
                        searchList.push(record)
                    }
                }
                setShowList(searchList)
            } else {
                setShowList(tableData)
            }
        },
        {wait: 300}
    ).run
    useDebounceEffect(
        () => {
            queryUpdateData()
        },
        [tableQuery, compareTableData],
        {wait: 100}
    )
    const onTableChange = useMemoizedFn((page: number, limit: number, newSort: SortProps, filter: any) => {
        const newTableQuery = {...tableQuery, ...filter}
        setTableQuery(newTableQuery)
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

    const ruleColumns: ColumnsTypeProps[] = useCreation<ColumnsTypeProps[]>(() => {
        return [
            {
                title: "序号",
                dataKey: "Id",
                fixed: "left",
                width: 96,
                enableDrag: false
            },
            {
                title: "数据包ID",
                dataKey: "HTTPFlowId",
                width: 96
            },
            {
                title: "规则名",
                dataKey: "RuleVerboseName",
                filterProps: {
                    filterKey: "RuleVerboseName",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                }
            },
            {
                title: "规则数据",
                dataKey: "Rule",
                filterProps: {
                    filterKey: "Rule",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                }
            }
        ]
    }, [])

    const exportMITMRuleExtractedData = useMemoizedFn(() => {
        ipcRenderer
            .invoke("ExportMITMRuleExtractedData", {
                Filter: {
                    AnalyzedIds: showList.map((item) => item.Id)
                }
            })
            .then((ExportFilePath: string) => {
                openABSFileLocated(ExportFilePath)
                yakitNotify("success", "导出成功")
            })
            .catch((err) => {
                yakitNotify("error", "导出失败：" + err)
            })
    })

    return (
        <div className={styles["HttpRule-table-wrapper"]}>
            <TableVirtualResize<HTTPFlowRuleData>
                key={resetTableKey}
                renderKey='Id'
                columns={ruleColumns}
                query={tableQuery}
                isRefresh={isRefresh}
                titleHeight={42}
                isShowTotal={true}
                extra={
                    <>
                        <YakitButton type='primary' onClick={exportMITMRuleExtractedData}>
                            导出
                        </YakitButton>
                    </>
                }
                data={showList}
                useUpAndDown
                onChange={onTableChange}
                pagination={{
                    total: showList.length,
                    limit: 1,
                    page: 20,
                    onChange: () => {}
                }}
                enableDrag={true}
                onSetCurrentRow={onSetCurrentRow}
                scrollToIndex={scrollToIndex}
            ></TableVirtualResize>
        </div>
    )
}
