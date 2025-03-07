import React, {ReactElement, useEffect, useRef, useState} from "react"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
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
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {v4 as uuidv4} from "uuid"
import {MITMConsts} from "../mitm/MITMConsts"
import styles from "./HTTPHistoryAnalysis.module.scss"

const {TabPane} = PluginTabs
const {ipcRenderer} = window.require("electron")

type tabKeys = "hot-patch" | "rule"
interface TabsItem {
    key: tabKeys
    label: ReactElement | string
    contShow: boolean
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
    const execParamsRef = useRef<any>()
    const [execStatus, setExecStatus] = useState<ExpandAndRetractExcessiveState>("default")
    const onExec = useMemoizedFn(() => {
        handleTabClick({
            key: curTabKey,
            label: "",
            contShow: true
        })

        // 热加载、规则保存操作
        onSaveHotCode(false)
        mitmRuleRef.current?.onSaveToDataBase(() => {})

        execParamsRef.current = {
            hotPatch: curHotPatch,
            rules: [...curRules]
        }
        setExecStatus("process")
    })
    const stopExec = useMemoizedFn(() => {
        setExecStatus("finished")
    })
    // #endregion

    // #region 执行结果
    const [activeKey, setActiveKey] = useState<string>("ruleData")
    const onTabChange = useMemoizedFn((key: string) => {
        setActiveKey(key)
    })
    // #endregion

    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "70%",
            secondRatio: "30%"
        }

        if (openTabsFlag) {
            p.firstRatio = "70%"
            if (execStatus !== "default") {
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
    }, [fullScreenFirstNode, openTabsFlag, execStatus])

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
                secondMinSize={400}
                secondNode={
                    <div className={styles["HTTPHistoryAnalysis-right"]}>
                        {execStatus === "default" ? (
                            <div className={styles["HTTPHistoryAnalysis-right-default"]}>
                                <div className={styles["HTTPHistoryAnalysis-right-default-title"]}>
                                    <span className={styles["title"]}>执行结果</span>{" "}
                                    设置好热加载或规则后，即可点击执行进行处理
                                </div>
                                <div className={styles["exec-btn"]}>
                                    <YakitButton size='large' type='primary' style={{width: 100}} onClick={onExec}>
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
                                        <PluginExecuteProgress percent={0} name={"main"} />
                                        {execStatus === "finished" && <YakitButton onClick={onExec}>执行</YakitButton>}
                                        {execStatus === "process" && (
                                            <YakitButton type='primary' danger onClick={stopExec}>
                                                停止
                                            </YakitButton>
                                        )}
                                    </div>
                                </div>
                                <div className={styles["HTTPHistoryAnalysis-result"]}>
                                    <HorizontalScrollCard
                                        title='Data Card'
                                        data={[
                                            {
                                                info: [
                                                    {Id: "已处理数/总数", Data: "123", Timestamp: Math.random() * 10}
                                                ],
                                                tag: "已处理数/总数"
                                            },
                                            {
                                                info: [
                                                    {Id: "符合条件流量", Data: "2222", Timestamp: Math.random() * 10}
                                                ],
                                                tag: "符合条件流量"
                                            },
                                            {
                                                info: [{Id: "提取数据", Data: "3333", Timestamp: Math.random() * 10}],
                                                tag: "提取数据"
                                            }
                                        ]}
                                    />
                                    <div className={styles["HTTPHistoryAnalysis-result-tab"]}>
                                        <PluginTabs activeKey={activeKey} onChange={onTabChange}>
                                            <TabPane key={"ruleData"} tab={"规则数据"}>
                                                <div className={styles["rule-data"]}>
                                                    <HttpRule />
                                                </div>
                                            </TabPane>
                                            <TabPane key={"historyData"} tab={"流量数据"}>
                                                <div className={styles["history-data"]}>
                                                    <HTTPHistory
                                                        pageType='History_Analysis_HistoryData'
                                                        showAdvancedConfig={false}
                                                        showProtocolType={false}
                                                        showBatchActions={false}
                                                        showDelAll={false}
                                                    />
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

interface HttpRuleProps {}
const HttpRule: React.FC<HttpRuleProps> = (props) => {
    const [historyId, setHistoryId] = useState<string>(uuidv4())
    const httpRuleSecondRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(httpRuleSecondRef)
    const [currentSelectItem, setCurrentSelectItem] = useState<any>({id: 1})

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

    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "50%",
            secondRatio: "50%"
        }
        if (!currentSelectItem?.id) {
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
                    <HttpRuleTable />
                </div>
            )}
            secondNode={
                <div className={styles["HttpRule-second"]} ref={httpRuleSecondRef}>
                    {/* <HTTPFlowDetailRequestAndResponse
                        pageType='History_Analysis_ruleData'
                        historyId={historyId}
                        noHeader={true}
                        sendToWebFuzzer={true}
                        downstreamProxyStr={downstreamProxy}
                        // id={1 || 0}
                        // defaultHttps={true}
                        // Tags={""}
                        // flow={undefined}
                        // flowRequestLoad={false}
                        // flowResponseLoad={false}
                        // highLightItem={undefined}
                    /> */}
                </div>
            }
            firstMinSize={160}
            secondMinSize={200}
            secondNodeStyle={{
                display: !currentSelectItem?.id ? "none" : "",
                padding: !currentSelectItem?.id ? 0 : undefined
            }}
            lineStyle={{display: !!currentSelectItem?.id ? "" : "none"}}
            lineDirection='top'
            {...ResizeBoxProps}
        />
    )
}

interface HttpRuleTableProps {}
const HttpRuleTable: React.FC<HttpRuleTableProps> = (props) => {
    const ruleColumns: ColumnsTypeProps[] = useCreation<ColumnsTypeProps[]>(() => {
        return [
            {
                title: "数据包ID",
                dataKey: "id",
                fixed: "left",
                ellipsis: false,
                width: 96,
                enableDrag: false
            },
            {
                title: "规则名",
                dataKey: "RuleName",
                filterProps: {
                    filterKey: "title",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                }
            },
            {
                title: "规则数据",
                dataKey: "Data",
                filterProps: {
                    filterKey: "title",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                }
            }
        ]
    }, [])

    return (
        <TableVirtualResize
            renderKey='id'
            columns={ruleColumns}
            loading={false}
            query={{}}
            isRefresh={true}
            titleHeight={42}
            isShowTotal={true}
            extra={
                <>
                    <YakitButton type='primary'>导出</YakitButton>
                </>
            }
            data={[]}
            useUpAndDown
            onChange={() => {}}
        ></TableVirtualResize>
    )
}
