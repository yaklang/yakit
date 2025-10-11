import React, {forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {
    CodeScaMainExecuteContentProps,
    CodeScanAuditExecuteFormProps,
    CodeScanAuditExecuteRefProps,
    CodeScanByGroupProps,
    CodeScanExecuteContentProps,
    CodeScanExecuteContentRefProps,
    CodeScanExecuteExtraParamsDrawerProps,
    CodeScanGroupByKeyWordItemProps,
    CodeScanGroupByKeyWordProps,
    FlowRuleDetailsListItemProps,
    SyntaxFlowResult,
    SyntaxFlowScanExecuteState,
    SyntaxFlowScanModeType,
    SyntaxFlowScanRequest,
    SyntaxFlowScanResponse,
    VerifyStartProps,
    YakRunnerCodeScanProps
} from "./YakRunnerCodeScanType"
import {Col, Divider, Form, Radio, Row, Slider, Tooltip} from "antd"
import {
    useControllableValue,
    useCreation,
    useDebounceFn,
    useGetState,
    useInterval,
    useInViewport,
    useMemoizedFn,
    useUpdateEffect
} from "ahooks"
import styles from "./YakRunnerCodeScan.module.scss"
import {failed, warn, info, yakitNotify} from "@/utils/notification"
import classNames from "classnames"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineClipboardlistIcon,
    OutlineCloseIcon,
    OutlineOpenIcon,
    OutlineQuestionmarkcircleIcon,
    OutlineTerminalIcon
} from "@/assets/icon/outline"
import {defYakitAutoCompleteRef, YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {RemoteGV} from "@/yakitGV"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {YakScript} from "../invoker/schema"
import {ExpandAndRetract} from "../plugins/operator/expandAndRetract/ExpandAndRetract"
import {
    ExecuteEnterNodeByPluginParams,
    FormContentItemByType,
    PluginExecuteProgress
} from "../plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {randomString} from "@/utils/randomUtil"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {grpcFetchAuditTree} from "../yakRunnerAuditCode/utils"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {apiCancelSyntaxFlowScan, apiSyntaxFlowScan} from "./utils"
import {YakitRoute} from "@/enums/yakitRoute"
import {AuditCodePageInfoProps, CodeScanPageInfoProps, PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {defaultCodeScanPageInfo} from "@/defaultConstants/CodeScan"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import useHoldGRPCStream, {convertCardInfo} from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {HoldGRPCStreamProps, StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {PluginExecuteResult} from "../plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {v4 as uuidv4} from "uuid"
import {grpcFetchLocalPluginDetail} from "../pluginHub/utils/grpc"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {ExtraParamsNodeByType} from "../plugins/operator/localPluginExecuteDetailHeard/PluginExecuteExtraParams"
import {getValueByType, getYakExecutorParam, ParamsToGroupByGroupName} from "../plugins/editDetails/utils"
import {apiCancelDebugPlugin, apiDebugPlugin, DebugPluginRequest} from "../plugins/utils"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {getJsonSchemaListResult} from "@/components/JsonFormWrapper/JsonFormWrapper"
import {CodeScanTaskListDrawer} from "./CodeScanTaskListDrawer/CodeScanTaskListDrawer"
import emiter from "@/utils/eventBus/eventBus"
import {grpcFetchLocalRuleGroupList, grpcFetchLocalRuleList} from "../ruleManagement/api"
import {
    QuerySyntaxFlowRuleRequest,
    QuerySyntaxFlowRuleResponse,
    SyntaxFlowGroup,
    SyntaxFlowRule
} from "../ruleManagement/RuleManagementType"
import cloneDeep from "lodash/cloneDeep"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {FormExtraSettingProps} from "../plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {AgentConfigModal} from "../mitm/MITMServerStartForm/MITMServerStartForm"
import {YakitDragger} from "@/components/yakitUI/YakitForm/YakitForm"
import {DefaultRuleGroupFilterPageMeta} from "@/defaultConstants/RuleManagement"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {RuleDebugAuditDetail} from "../ruleManagement/template"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {CreateReportContentProps, onCreateReportModal} from "../portscan/CreateReport"
import CodeScanExtraParamsDrawer, {CodeScanExtraParam} from "./CodeScanExtraParamsDrawer/CodeScanExtraParamsDrawer"
import { YakParamProps } from "../plugins/pluginsType"
const {YakitPanel} = YakitCollapse
const {ipcRenderer} = window.require("electron")

export interface CodeScanStreamInfo {
    logState: StreamResult.Log[]
    cardState: HoldGRPCStreamProps.InfoCards[]
}

const CodeScanGroupByKeyWord: React.FC<CodeScanGroupByKeyWordProps> = React.memo((props) => {
    const {inViewport} = props
    const [selectGroupList, setSelectGroupList] = useControllableValue<string[]>(props, {
        defaultValue: [],
        valuePropName: "selectGroupListByKeyWord",
        trigger: "setSelectGroupListByKeyWord"
    })
    const [keywords, setKeywords] = useState<string>("")
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [response, setResponse] = useState<SyntaxFlowGroup[]>([])
    const [isRef, setIsRef] = useState<boolean>(false)
    const codeScanKeywordsRef = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })

    useEffect(() => {
        if (inViewport) init()
    }, [inViewport])

    const init = useMemoizedFn((KeyWord = "") => {
        setLoading(true)
        const params = {
            Filter: {
                KeyWord
            }
        }
        grpcFetchLocalRuleGroupList({Pagination: DefaultRuleGroupFilterPageMeta, ...params})
            .then(({Group}) => {
                setResponse(Group)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })

    const indeterminate: boolean = useCreation(() => {
        if (selectGroupList.length > 0 && selectGroupList.length !== response.length) return true
        return false
    }, [selectGroupList, response])

    const checked: boolean = useCreation(() => {
        return allCheck || (selectGroupList.length > 0 && selectGroupList.length === response.length)
    }, [selectGroupList, allCheck])

    const onSearch = useMemoizedFn((val) => {
        // if (!val) return
        init(val)
    })
    const onPressEnter = useMemoizedFn((e) => {
        onSearch(e.target.value)
    })
    const onSelectKeywords = useMemoizedFn((value) => {
        onSearch(value)
        setKeywords(value)
    })
    const onSelectAll = useMemoizedFn((e) => {
        const {checked} = e.target
        if (checked) {
            setSelectGroupList(response.map((ele) => ele.GroupName))
        } else {
            setSelectGroupList([])
        }
        setAllCheck(checked)
    })

    const onClearSelect = useMemoizedFn(() => {
        setSelectGroupList([])
        setAllCheck(false)
    })

    const total = useCreation(() => {
        return response.length
    }, [response])

    const onSelect = useMemoizedFn((val: SyntaxFlowGroup) => {
        const isExist = selectGroupList.includes(val.GroupName)
        if (isExist) {
            const newList = selectGroupList.filter((ele) => ele !== val.GroupName)
            setSelectGroupList(newList)
            setAllCheck(newList.length === response.length)
        } else {
            const newList = [...selectGroupList, val.GroupName]
            setSelectGroupList(newList)
            setAllCheck(newList.length === response.length)
        }
        setKeywords("")
        onSearch("")
    })
    return (
        <div className={classNames(styles["code-scan-group-wrapper"])}>
            <div className={styles["filter-wrapper"]}>
                <div className={styles["header-search"]}>
                    <YakitAutoComplete
                        ref={codeScanKeywordsRef}
                        isCacheDefaultValue={false}
                        cacheHistoryDataKey={RemoteGV.CodeScanKeywords}
                        onSelect={onSelectKeywords}
                        value={keywords}
                        style={{flex: 1}}
                    >
                        <YakitInput.Search
                            value={keywords}
                            onChange={(e) => setKeywords(e.target.value)}
                            placeholder='请输入关键词搜索'
                            onSearch={onSearch}
                            onPressEnter={onPressEnter}
                            size='large'
                        />
                    </YakitAutoComplete>
                </div>
                <div className={styles["filter-body"]}>
                    <div className={styles["filter-body-left"]}>
                        <YakitCheckbox indeterminate={indeterminate} checked={checked} onChange={onSelectAll}>
                            全选
                        </YakitCheckbox>
                        <span className={styles["count-num"]}>
                            Total<span className={styles["num-style"]}>{total}</span>
                        </span>
                        <Divider type='vertical' style={{margin: "0 4px"}} />
                        <span className={styles["count-num"]}>
                            Selected<span className={styles["num-style"]}>{selectGroupList.length}</span>
                        </span>
                    </div>
                    <div className={styles["filter-body-right"]}>
                        <YakitButton type='text' danger onClick={onClearSelect}>
                            清空
                        </YakitButton>
                    </div>
                </div>
            </div>

            <RollingLoadList<SyntaxFlowGroup>
                data={response}
                loadMoreData={() => {}}
                renderRow={(rowData: SyntaxFlowGroup, index: number) => {
                    const checked = selectGroupList.includes(rowData.GroupName)
                    return <CodeScanGroupByKeyWordItem item={rowData} onSelect={onSelect} selected={checked} />
                }}
                page={1}
                hasMore={false}
                loading={loading}
                defItemHeight={70}
                isGridLayout
                defCol={3}
                classNameList={styles["group-list-wrapper"]}
                rowKey='GroupName'
                isRef={isRef}
            />
        </div>
    )
})

export const YakRunnerCodeScan: React.FC<YakRunnerCodeScanProps> = (props) => {
    const {pageId} = props
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    const initPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.YakRunner_Code_Scan, pageId)
        if (currentItem && currentItem.pageParamsInfo.codeScanPageInfo) {
            return currentItem.pageParamsInfo.codeScanPageInfo
        }
        return {...defaultCodeScanPageInfo}
    })
    const [pageInfo, setPageInfo] = useState<CodeScanPageInfoProps>(initPageInfo())

    // 隐藏插件列表
    const [hidden, setHidden] = useState<boolean>(false)

    const pluginGroupRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(pluginGroupRef)

    const onClose = useMemoizedFn(() => {
        setHidden(true)
    })

    const onClearAll = useMemoizedFn(() => {
        setPageInfo((v) => ({...v, selectGroup: [], selectGroupListByKeyWord: []}))
        setHidden(false)
    })

    const onSetSelectGroupListByKeyWord = useMemoizedFn((groups) => {
        setPageInfo((v) => ({...v, selectGroupListByKeyWord: groups}))
    })

    const selectGroupListAll = useCreation(() => {
        const groups = [...new Set([...(pageInfo.selectGroupListByKeyWord || [])])]
        return groups
    }, [pageInfo.selectGroupListByKeyWord])

    return (
        <div className={styles["yakrunner-codec-scan"]} id={`yakrunner-code-scan-${pageId}`}>
            <div
                className={classNames(styles["left-wrapper"], {
                    [styles["left-wrapper-hidden"]]: hidden
                })}
            >
                <div className={styles["left-header-search"]}>
                    <div className={styles["header-type-wrapper"]}>
                        <span className={styles["header-text"]}>扫描规则</span>
                    </div>
                    <Tooltip title='收起' placement='top' overlayClassName='plugins-tooltip'>
                        <YakitButton
                            type='text2'
                            onClick={onClose}
                            icon={<OutlineCloseIcon className={styles["header-icon"]} />}
                        ></YakitButton>
                    </Tooltip>
                </div>
                <CodeScanGroupByKeyWord
                    inViewport={inViewport}
                    selectGroupListByKeyWord={pageInfo.selectGroupListByKeyWord || []}
                    setSelectGroupListByKeyWord={onSetSelectGroupListByKeyWord}
                />
            </div>
            <CodeScanExecuteContent
                hidden={hidden}
                setHidden={setHidden}
                selectGroupList={selectGroupListAll}
                onClearAll={onClearAll}
                pageInfo={pageInfo}
                setPageInfo={setPageInfo}
                pageId={pageId}
                onSetSelectGroupListByKeyWord={onSetSelectGroupListByKeyWord}
            />
        </div>
    )
}

const initialLocalState: QuerySyntaxFlowRuleResponse = {
    Rule: [],
    Pagination: {
        Limit: 10,
        Page: 0,
        OrderBy: "",
        Order: ""
    },
    Total: 0
}

const CodeScanByGroup: React.FC<CodeScanByGroupProps> = React.memo((props) => {
    const {selectGroupList, setTotal, hidden, filterLibRuleKind} = props
    const isLoadingRef = useRef<boolean>(true)
    const [response, setResponse] = useState<QuerySyntaxFlowRuleResponse>(initialLocalState)
    const [loading, setLoading] = useState<boolean>(false)
    const [hasMore, setHasMore] = useState<boolean>(true)

    useEffect(() => {
        fetchList(true)
    }, [selectGroupList, filterLibRuleKind])

    const fetchList = useDebounceFn(
        useMemoizedFn(async (reset?: boolean) => {
            if (selectGroupList.length === 0) {
                setTotal(0)
                setResponse(initialLocalState)
                return
            }
            if (reset) {
                isLoadingRef.current = true
            }
            setLoading(true)
            const params: Paging = !!reset
                ? {Page: 1, Limit: 20}
                : {
                      Page: +response.Pagination.Page + 1,
                      Limit: +response.Pagination.Limit || 20
                  }
            const query: QuerySyntaxFlowRuleRequest = {
                Filter: {
                    RuleNames: [],
                    Language: [],
                    GroupNames: [],
                    Severity: [],
                    Purpose: [],
                    Tag: [],
                    Keyword: "",
                    FilterLibRuleKind: filterLibRuleKind
                },
                Pagination: {
                    Limit: params?.Limit || 10,
                    Page: params?.Page || 1,
                    OrderBy: "updated_at",
                    Order: "desc"
                }
            }
            if (query.Filter) query.Filter.GroupNames = selectGroupList

            try {
                const res = await grpcFetchLocalRuleList(query)
                if (!res.Rule) res.Rule = []
                const length = +res.Pagination.Page === 1 ? res.Rule.length : res.Rule.length + response.Rule.length
                setHasMore(length < +res.Total)

                setResponse({
                    Pagination: res.Pagination,
                    Rule: response && !reset ? [...response.Rule, ...res.Rule] : res.Rule,
                    Total: res.Total
                })

                if (+res.Pagination.Page === 1) {
                    setTotal(+res.Total)
                }
            } catch (error) {}
            setTimeout(() => {
                isLoadingRef.current = false
                setLoading(false)
            }, 200)
        }),
        {wait: 200, leading: true}
    ).run

    // 滚动更多加载
    const onUpdateList = useMemoizedFn(() => {
        fetchList()
    })
    return (
        <div
            className={classNames(styles["code-scan-by-group-wrapper"], {
                [styles["code-scan-by-group-wrapper-hidden"]]: hidden
            })}
        >
            {selectGroupList.length === 0 || +response.Total === 0 ? (
                <YakitEmpty title='请选择规则组进行扫描' style={{paddingTop: 48}} />
            ) : (
                <RollingLoadList<SyntaxFlowRule>
                    data={response.Rule}
                    loadMoreData={onUpdateList}
                    renderRow={(info: SyntaxFlowRule, i: number) => {
                        return <FlowRuleDetailsListItem data={info} />
                    }}
                    page={response.Pagination.Page}
                    hasMore={hasMore}
                    loading={loading}
                    defItemHeight={46}
                    rowKey='Hash'
                    isRef={loading && isLoadingRef.current}
                    classNameRow={styles["flow-rule-details-opt-wrapper"]}
                    classNameList={styles["flow-rule-by-group-list-wrapper"]}
                />
            )}
        </div>
    )
})

const CodeScanGroupByKeyWordItem: React.FC<CodeScanGroupByKeyWordItemProps> = React.memo((props) => {
    const {item, onSelect, selected} = props
    return (
        <div
            className={classNames(styles["group-item-wrapper"], styles["group-keyword-item-wrapper"], {
                [styles["group-item-wrapper-checked"]]: selected
            })}
            onClick={() => onSelect(item)}
        >
            <div className={styles["item-tip"]}>
                <span className={styles["item-tip-name"]}>{item.GroupName}</span>
                <span className={styles["item-tip-number"]}>{item.Count}个规则</span>
            </div>
        </div>
    )
})

const CodeScanExecuteContent: React.FC<CodeScanExecuteContentProps> = React.memo((props) => {
    const {onClearAll, selectGroupList, pageInfo, setPageInfo, onSetSelectGroupListByKeyWord, pageId} = props
    /** 子组件方法传递给父组件 */
    const codeScanExecuteContentRef = useRef<CodeScanExecuteContentRefProps>(null)
    const [hidden, setHidden] = useControllableValue<boolean>(props, {
        defaultValue: false,
        valuePropName: "hidden",
        trigger: "setHidden"
    })

    const [executeStatus, setExecuteStatus] = useControllableValue<SyntaxFlowScanExecuteState>(props, {
        defaultValue: "default",
        valuePropName: "executeStatus",
        trigger: "setExecuteStatus"
    })
    /**新项目-执行状态 */
    const [isAuditExecuting, setAuditsExecuting] = useState<boolean>(false)

    /**是否展开/收起 */
    const [isExpand, setIsExpand] = useState<boolean>(true)
    const [progressShow, setProgressShow] = useState<{type: "new" | "old"; progress: number}>()
    const [total, setTotal] = useState<number>(0)

    const [executeType, setExecuteType] = useState<"new" | "old">("new")
    /**暂停 */
    const [pauseLoading, setPauseLoading] = useState<boolean>(false)
    /**停止 */
    const [stopLoading, setStopLoading] = useState<boolean>(false)
    /**继续 */
    const [continueLoading, setContinueLoading] = useState<boolean>(false)
    // 任务列表抽屉
    const [visibleScanList, setVisibleScanList] = useState<boolean>(false)
    /**额外参数弹出框 */
    const [extraParamsVisible, setExtraParamsVisible] = useState<boolean>(false)
    const [extraParamsValue, setExtraParamsValue] = useState<CodeScanExtraParam>({
        Concurrency: 5,
        Memory: false
    })

    const isExecuting = useCreation(() => {
        if (executeStatus === "process") return true
        if (executeStatus === "paused") return true
        return false
    }, [executeStatus])

    const isShowFlowRule = useCreation(() => {
        return selectGroupList.length > 0
    }, [selectGroupList])

    const onExpand = useMemoizedFn((e) => {
        e.stopPropagation()
        setIsExpand(!isExpand)
    })

    const onSetExecuteStatus = useMemoizedFn((val) => {
        setExecuteStatus(val)
    })

    const onExecuteInTop = useMemoizedFn((e) => {
        e.stopPropagation()
        codeScanExecuteContentRef.current?.onStartExecute()
    })

    const onStopExecute = useMemoizedFn(() => {
        codeScanExecuteContentRef.current?.onStopExecute()
    })

    const onPause = useMemoizedFn((e) => {
        codeScanExecuteContentRef.current?.onPause()
    })

    const onContinue = useMemoizedFn((e) => {
        codeScanExecuteContentRef.current?.onContinue()
    })

    const onAuditExecuteInTop = useMemoizedFn((e) => {
        e.stopPropagation()
        codeScanExecuteContentRef.current?.onStartAuditExecute()
    })

    const onStopAuditExecute = useMemoizedFn((e) => {
        e.stopPropagation()
        codeScanExecuteContentRef.current?.onStopAuditExecute()
    })

    const [auditCodeList, setAuditCodeList] = useState<{label: string; value: string; language: string}[]>([])

    const getAduitList = useMemoizedFn(async () => {
        try {
            const {res} = await grpcFetchAuditTree("/")
            if (res.Resources.length > 0) {
                const list = res.Resources.map((item) => {
                    let language = item.Extra.find((item) => item.Key === "Language")?.Value || ""
                    return {label: item.ResourceName, value: item.ResourceName, language}
                })
                // setExecuteType("old")
                setAuditCodeList(list)
            }
        } catch (error) {}
    })

    useEffect(() => {
        getAduitList()
    }, [])

    const [filterLibRuleKind, setFilterLibRuleKind] = useState<"" | "noLib">("noLib")

    const [selectProject, setsSelectProject] = useState<string[]>([])
    const [openProject, setOpenProject] = useState<string>()

    const onCreateReport = useMemoizedFn((e) => {
        e.stopPropagation()
        codeScanExecuteContentRef.current?.onCreateReport()
    })
    const disabledReport = useCreation(() => {
        switch (executeStatus) {
            case "finished":
                return false
            case "error":
                return false
            default:
                return true
        }
    }, [executeStatus])

    /**保存额外参数 */
    const onSaveExtraParams = useMemoizedFn((v: CodeScanExtraParam) => {
        setExtraParamsValue({
            ...v
        } as CodeScanExtraParam)
        setExtraParamsVisible(false)
    })
    return (
        <>
            {isShowFlowRule && (
                <div className={styles["midden-wrapper"]}>
                    <div className={styles["midden-heard"]}>
                        {hidden && (
                            <Tooltip title='展开' placement='top' overlayClassName='plugins-tooltip'>
                                <YakitButton
                                    type='text2'
                                    onClick={() => setHidden(false)}
                                    icon={<OutlineOpenIcon className={styles["header-icon"]} />}
                                ></YakitButton>
                            </Tooltip>
                        )}
                        <span className={styles["header-text"]}>已选规则</span>
                        <div className={styles["heard-right"]}>
                            <span className={styles["heard-tip"]}>
                                Total<span className={styles["heard-number"]}>{total}</span>
                            </span>
                            <div className={styles["option"]}>
                                <YakitCheckbox
                                    checked={filterLibRuleKind !== "noLib"}
                                    onChange={(e) => setFilterLibRuleKind(e.target.checked ? "" : "noLib")}
                                >
                                    包含Lib规则
                                </YakitCheckbox>
                                <YakitButton type='text' danger onClick={onClearAll}>
                                    清空
                                </YakitButton>
                            </div>
                        </div>
                    </div>
                    <CodeScanByGroup
                        hidden={false}
                        selectGroupList={selectGroupList}
                        filterLibRuleKind={filterLibRuleKind}
                        setTotal={setTotal}
                    />
                </div>
            )}
            <div className={styles["code-scan-execute-wrapper"]}>
                <ExpandAndRetract isExpand={isExpand} onExpand={onExpand} status={executeStatus}>
                    <div className={styles["code-scan-executor-title"]}>
                        <span className={styles["code-scan-executor-title-text"]}>规则执行</span>
                    </div>
                    <div className={styles["code-scan-executor-btn"]}>
                        {progressShow && (
                            <PluginExecuteProgress
                                percent={progressShow.progress}
                                name={progressShow.type === "new" ? "编译" : "扫描"}
                            />
                        )}
                        <YakitButton
                            type='text'
                            onClick={(e) => {
                                e.stopPropagation()
                                setVisibleScanList(true)
                            }}
                            style={{padding: 0}}
                        >
                            任务列表
                        </YakitButton>
                        {isExecuting
                            ? !isExpand && (
                                  <>
                                      {executeType === "new" ? (
                                          <YakitButton danger onClick={onStopAuditExecute}>
                                              停止
                                          </YakitButton>
                                      ) : (
                                          <>
                                              {executeStatus === "paused" && !pauseLoading && (
                                                  <YakitButton onClick={onContinue} loading={continueLoading}>
                                                      继续
                                                  </YakitButton>
                                              )}
                                              {(executeStatus === "process" || pauseLoading) && (
                                                  <YakitButton onClick={onPause} loading={pauseLoading}>
                                                      暂停
                                                  </YakitButton>
                                              )}
                                              <YakitButton
                                                  danger
                                                  onClick={onStopExecute}
                                                  disabled={pauseLoading || continueLoading}
                                              >
                                                  停止
                                              </YakitButton>
                                          </>
                                      )}
                                      <div className={styles["divider-style"]}></div>
                                  </>
                              )
                            : !isExpand && (
                                  <>
                                      {executeType === "new" ? (
                                          <YakitButton onClick={onAuditExecuteInTop}>编译</YakitButton>
                                      ) : (
                                          <YakitButton onClick={onExecuteInTop}>执行</YakitButton>
                                      )}
                                      {/* <div className={styles["divider-style"]} /> */}
                                  </>
                              )}

                        <YakitButton
                            icon={<OutlineClipboardlistIcon />}
                            disabled={disabledReport}
                            onClick={onCreateReport}
                        >
                            生成报告
                        </YakitButton>
                        <div className={styles["divider-style"]} />

                        {/* {Object.keys(pageInfo).length > 0 && (
                            <Tooltip
                                title='在代码审计中打开'
                                destroyTooltipOnHide={true}
                                overlayStyle={{paddingBottom: 0}}
                                placement='top'
                            >
                                <YakitButton
                                    type='text2'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (!pageInfo.projectName) return
                                        if (pageInfo.projectName.length > 1) {
                                            setsSelectProject(pageInfo.projectName)
                                            setOpenProject(pageInfo.projectName[0])
                                        } else {
                                            // 跳转到审计页面的参数
                                            const params: AuditCodePageInfoProps = {
                                                Schema: "syntaxflow",
                                                Location: pageInfo.projectName[0],
                                                Path: `/`,
                                                runtimeId: pageInfo.runtimeId
                                            }
                                            emiter.emit(
                                                "openPage",
                                                JSON.stringify({
                                                    route: YakitRoute.YakRunner_Audit_Code,
                                                    params
                                                })
                                            )
                                        }
                                    }}
                                    icon={<OutlineTerminalIcon />}
                                />
                            </Tooltip>
                        )} */}
                        <YakitButton
                            type='text2'
                            icon={hidden ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
                            onClick={(e) => {
                                e.stopPropagation()
                                setHidden(!hidden)
                            }}
                        />
                    </div>
                </ExpandAndRetract>
                <div className={styles["code-scan-executor-body"]}>
                    <CodeScanMainExecuteContent
                        ref={codeScanExecuteContentRef}
                        isExpand={isExpand}
                        setIsExpand={setIsExpand}
                        setProgressShow={setProgressShow}
                        executeStatus={executeStatus}
                        setExecuteStatus={onSetExecuteStatus}
                        selectGroupList={selectGroupList}
                        filterLibRuleKind={filterLibRuleKind}
                        setHidden={setHidden}
                        auditCodeList={auditCodeList}
                        getAduitList={getAduitList}
                        executeType={executeType}
                        setExecuteType={setExecuteType}
                        isAuditExecuting={isAuditExecuting}
                        setAuditsExecuting={setAuditsExecuting}
                        onSetSelectGroupListByKeyWord={onSetSelectGroupListByKeyWord}
                        pageInfo={pageInfo}
                        pageId={pageId}
                        pauseLoading={pauseLoading}
                        stopLoading={stopLoading}
                        setPauseLoading={setPauseLoading}
                        setStopLoading={setStopLoading}
                        continueLoading={continueLoading}
                        setContinueLoading={setContinueLoading}
                        setPageInfo={setPageInfo}
                        setExtraParamsVisible={setExtraParamsVisible}
                        extraParamsValue={extraParamsValue}
                    />
                </div>
            </div>
            <React.Suspense fallback={<>loading...</>}>
                <CodeScanExtraParamsDrawer
                    extraParamsValue={extraParamsValue}
                    visible={extraParamsVisible}
                    onSave={onSaveExtraParams}
                />
                {visibleScanList && (
                    <CodeScanTaskListDrawer visible={visibleScanList} setVisible={setVisibleScanList} />
                )}
            </React.Suspense>
            <YakitHint
                visible={selectProject.length > 0}
                title={"选择项目打开"}
                children={
                    <>
                        <div className={styles["default-content"]}>
                            代码审计只能打开一个项目，请选择项目在代码审计中查看
                        </div>
                        <Radio.Group
                            className='plugins-radio-wrapper'
                            value={openProject}
                            onChange={(e) => {
                                setOpenProject(e.target.value)
                            }}
                            options={selectProject.map((item) => ({
                                label: item,
                                value: item
                            }))}
                        />
                    </>
                }
                onOk={() => {
                    if (openProject) {
                        // 跳转到审计页面的参数
                        const params: AuditCodePageInfoProps = {
                            Schema: "syntaxflow",
                            Location: openProject,
                            Path: `/`,
                            runtimeId: pageInfo.runtimeId
                        }
                        emiter.emit(
                            "openPage",
                            JSON.stringify({
                                route: YakitRoute.YakRunner_Audit_Code,
                                params
                            })
                        )
                        setOpenProject(undefined)
                        setsSelectProject([])
                    } else {
                        setOpenProject(undefined)
                        setsSelectProject([])
                    }
                }}
                onCancel={() => {
                    setOpenProject(undefined)
                    setsSelectProject([])
                }}
            />
        </>
    )
})

export const CodeScanMainExecuteContent: React.FC<CodeScaMainExecuteContentProps> = React.memo(
    forwardRef((props, ref) => {
        const {
            isExpand,
            setIsExpand,
            setHidden,
            selectGroupList,
            filterLibRuleKind,
            setProgressShow,
            auditCodeList,
            getAduitList,
            executeType,
            setExecuteType,
            onSetSelectGroupListByKeyWord,
            pageInfo,
            pageId,
            setPageInfo,
            setExtraParamsVisible,
            extraParamsValue
        } = props

        const {queryPagesDataById, updatePagesDataCacheById} = usePageInfo(
            (s) => ({
                queryPagesDataById: s.queryPagesDataById,
                updatePagesDataCacheById: s.updatePagesDataCacheById
            }),
            shallow
        )

        const [form] = Form.useForm()

        const [plugin, setPlugin] = useState<YakScript>()
        /** 子组件方法传递给父组件 */
        const codeScanAuditExecuteRef = useRef<CodeScanAuditExecuteRefProps>(null)
        // 获取参数
        const handleFetchParams = useDebounceFn(
            useMemoizedFn(async () => {
                try {
                    const newPlugin = await grpcFetchLocalPluginDetail({Name: "SSA 项目探测"}, true)
                    setPlugin(newPlugin)
                } catch (error) {}
            }),
            {wait: 300}
        ).run

        useEffect(() => {
            handleFetchParams()
        }, [])

        useEffect(() => {
            const {projectName, codeScanMode, runtimeId} = pageInfo
            if (projectName) {
                setExecuteType("old")
                form.setFieldsValue({
                    project: projectName
                })
            }
            if (codeScanMode && runtimeId) {
                onMultipleTask(runtimeId, codeScanMode)
            }
        }, [])

        const codeScanFormRef = useRef<HTMLDivElement>(null)
        const [inViewport = true] = useInViewport(codeScanFormRef)
        useEffect(() => {
            if (inViewport) {
                emiter.on("onSetCodeScanTaskStatus", onSetCodeScanTaskStatusFun)
            }
            return () => {
                emiter.off("onSetCodeScanTaskStatus", onSetCodeScanTaskStatusFun)
            }
        }, [inViewport])

        // 重新设置代码扫描任务状态
        const onSetCodeScanTaskStatusFun = useMemoizedFn((res) => {
            try {
                const value = JSON.parse(res)
                const {runtimeId, codeScanMode, pageId: pId} = value
                if (pageId !== pId) return
                if (!runtimeId) {
                    yakitNotify("error", "未设置正常得 runtimeId")
                    return
                }
                if (codeScanMode === "new") {
                    yakitNotify("error", "重试(new)不走该操作,请传入正确的codeScanMode")
                    return
                }
                onMultipleTask(runtimeId, codeScanMode)
            } catch (error) {}
        })

        // 查看、暂停、继续任务时执行
        const onMultipleTask = useMemoizedFn((runtimeId, codeScanMode: SyntaxFlowScanModeType) => {
            if (codeScanMode === "pause") {
                setPauseLoading(true)
            }
            if (codeScanMode === "resume") {
                setContinueLoading(true)
            }
            const params: SyntaxFlowScanRequest = {
                ControlMode: codeScanMode,
                ResumeTaskId: runtimeId,
                Filter: {
                    RuleNames: [],
                    Language: [],
                    GroupNames: selectGroupList,
                    Severity: [],
                    Purpose: [],
                    Tag: [],
                    Keyword: "",
                    FilterLibRuleKind: filterLibRuleKind
                }
            }
            apiSyntaxFlowScan(params, token).then(() => {
                setIsExpand(false)
                setExecuteStatus("process")
                if (setHidden) setHidden(true)
            })
        })

        useImperativeHandle(
            ref,
            () => ({
                onStopExecute,
                onPause,
                onContinue,
                onStartExecute: () => {
                    form.validateFields()
                        .then(onStartExecute)
                        .catch((e) => {
                            setIsExpand(true)
                        })
                },
                onSetProject: (project: string) => {
                    form.setFieldsValue({
                        project
                    })
                },
                onStartAuditExecute: () => {
                    codeScanAuditExecuteRef.current?.onStartAuditExecute()
                },
                onStopAuditExecute: () => {
                    codeScanAuditExecuteRef.current?.onCancelAudit()
                },
                onCreateReport
            }),
            [form]
        )

        const [runtimeId, setRuntimeId, getRuntimeId] = useGetState<string>("")
        const [stopLoading, setStopLoading] = useControllableValue<boolean>(props, {
            defaultValue: false,
            valuePropName: "stopLoading",
            trigger: "setStopLoading"
        })
        const [pauseLoading, setPauseLoading] = useControllableValue<boolean>(props, {
            defaultValue: false,
            valuePropName: "pauseLoading",
            trigger: "setPauseLoading"
        })
        const [continueLoading, setContinueLoading] = useControllableValue<boolean>(props, {
            defaultValue: false,
            valuePropName: "continueLoading",
            trigger: "setContinueLoading"
        })
        /**已编译项目-执行状态 */
        const [executeStatus, setExecuteStatus] = useControllableValue<SyntaxFlowScanExecuteState>(props, {
            defaultValue: "default",
            valuePropName: "executeStatus",
            trigger: "setExecuteStatus"
        })
        const [isAuditExecuting, setAuditsExecuting] = useControllableValue<boolean>(props, {
            defaultValue: false,
            valuePropName: "isAuditExecuting",
            trigger: "setAuditsExecuting"
        })

        const [token, setToken] = useState(randomString(20))
        // 新项目执行是否报错，如若报错 展示结果
        const [auditError, setAuditError] = useState<boolean>(false)

        const isExecuting = useCreation(() => {
            if (executeStatus === "process") return true
            if (executeStatus === "paused") return true
            return false
        }, [executeStatus])

        const isShowResult = useCreation(() => {
            return isExecuting || runtimeId || auditError
        }, [isExecuting, runtimeId, auditError])

        const [streamInfo, setStreamInfo] = useState<CodeScanStreamInfo>({
            cardState: [],
            logState: []
        })

        // logs
        let messages = useRef<StreamResult.Message[]>([])

        /** 放入日志队列 */
        const pushLogs = useMemoizedFn((log: StreamResult.Message) => {
            messages.current.unshift({...log, content: {...log.content, id: uuidv4()}})
            // 只缓存 100 条结果（日志类型 + 数据类型）
            if (messages.current.length > 100) {
                messages.current.pop()
            }
        })
        /** 新项目日志队列 */
        const pushNewLogs = useMemoizedFn((log: StreamResult.Message[]) => {
            messages.current = log
        })

        // card
        let cardKVPair = useRef<Map<string, HoldGRPCStreamProps.CacheCard>>(
            new Map<string, HoldGRPCStreamProps.CacheCard>()
        )

        const resetStreamInfo = useMemoizedFn(() => {
            messages.current = []
            cardKVPair.current = new Map<string, HoldGRPCStreamProps.CacheCard>()
            setRuntimeId("")
        })

        const [interval, setInterval] = useState<number | undefined>()
        useInterval(
            () => {
                // logs
                const logs: StreamResult.Log[] = messages.current
                    .filter((i) => i.type === "log")
                    .map((i) => i.content as StreamResult.Log)
                    .filter((i) => i.data !== "null")
                setStreamInfo({
                    cardState: convertCardInfo(cardKVPair.current),
                    logState: logs
                })
            },
            interval,
            {
                immediate: true
            }
        )

        useEffect(() => {
            if (isExecuting) {
                setInterval(500)
            } else {
                // 由于任务结束时 有可能map卡片数据并未更新完毕 因此等待1S后关闭轮询
                setTimeout(() => {
                    setInterval(undefined)
                }, 1000)
            }
        }, [isExecuting])

        /** 判断是否为无效数据 */
        const checkStreamValidity = useMemoizedFn((stream: StreamResult.Log) => {
            try {
                const check = JSON.parse(stream.data)
                if (check === "null" || !check || check === "undefined") return false
                return check
            } catch (e) {
                return false
            }
        })

        const onUpdateExecutorPageInfo = useMemoizedFn((runtimeId: string) => {
            if (!pageId) return
            const route = YakitRoute.YakRunner_Code_Scan
            const currentItem: PageNodeItemProps | undefined = queryPagesDataById(route, pageId)
            if (!currentItem) return
            let newCurrentItem: PageNodeItemProps = {
                ...currentItem,
                pageParamsInfo: {
                    codeScanPageInfo: {
                        ...currentItem.pageParamsInfo.codeScanPageInfo,
                        runtimeId
                    }
                }
            }
            updatePagesDataCacheById(route, {...newCurrentItem})
        })

        const pageInfoCacheRef = useRef<CodeScanPageInfoProps>()

        /**生成报告 */
        const onCreateReport = useMemoizedFn(() => {
            if (executeStatus === "default") return
            let reportName = ""
            if (pageInfo.projectName && pageInfo.projectName.length > 0) {
                reportName = `${pageInfo.projectName[0]}代码扫描报告`
            }

            const params: CreateReportContentProps = {
                reportName,
                runtimeId,
                type: "codeScan"
            }
            onCreateReportModal(params, {
                getContainer:
                    document.getElementById(`main-operator-page-body-${YakitRoute.YakRunner_Code_Scan}`) || undefined
            })
        })

        useEffect(() => {
            ipcRenderer.on(`${token}-data`, async (e: any, res: SyntaxFlowScanResponse) => {
                if (res) {
                    // console.log("token-data:", res)
                    const data = res.ExecResult

                    if (!!res.Status) {
                        switch (res.Status) {
                            case "done":
                                setExecuteStatus("finished")
                                break
                            case "error":
                                setExecuteStatus("error")
                                break
                            case "executing":
                                setContinueLoading(false)
                                setExecuteStatus("process")
                                break
                            case "paused":
                                setExecuteStatus("paused")
                                break
                            default:
                                break
                        }
                    }
                    if (!!data?.RuntimeID && getRuntimeId() !== data.RuntimeID) {
                        setRuntimeId(data.RuntimeID)
                        if (pageInfoCacheRef.current) {
                            setPageInfo({...pageInfoCacheRef.current, runtimeId: data.RuntimeID})
                        }

                        /**更新该页面最新的runtimeId */
                        onUpdateExecutorPageInfo(data.RuntimeID)
                    }
                    if (data && data.IsMessage) {
                        try {
                            let obj: StreamResult.Message = JSON.parse(Buffer.from(data.Message).toString())
                            let progressObj = obj.content as StreamResult.Progress
                            if (obj.type === "progress") {
                                setProgressShow({
                                    type: "old",
                                    progress: progressObj.progress
                                })
                                return
                            }

                            // feature-status-card-data 卡片展示
                            const logData = obj.content as StreamResult.Log
                            // feature-status-card-data 卡片展示
                            if (obj.type === "log" && logData.level === "feature-status-card-data") {
                                try {
                                    const checkInfo = checkStreamValidity(logData)
                                    if (!checkInfo) return

                                    const obj: StreamResult.Card = checkInfo
                                    const {id, data, tags} = obj
                                    const {timestamp} = logData
                                    const originData = cardKVPair.current.get(id)
                                    if (originData && originData.Timestamp > timestamp) {
                                        return
                                    }
                                    cardKVPair.current.set(id, {
                                        Id: id,
                                        Data: data,
                                        Timestamp: timestamp,
                                        Tags: Array.isArray(tags) ? tags : []
                                    })
                                } catch (e) {}
                                return
                            }

                            pushLogs(obj)
                        } catch (error) {}
                    }
                }
            })
            ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
                setTimeout(() => {
                    setExecuteStatus("error")
                    setPauseLoading(false)
                    setStopLoading(false)
                    setContinueLoading(false)
                }, 200)
                yakitNotify("error", `[Mod] flow-scan error: ${error}`)
            })
            ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
                info("[SyntaxFlowScan] finished")
                setTimeout(() => {
                    setPauseLoading(false)
                    setStopLoading(false)
                    setContinueLoading(false)
                }, 200)
            })
            return () => {
                ipcRenderer.removeAllListeners(`${token}-data`)
                ipcRenderer.removeAllListeners(`${token}-error`)
                ipcRenderer.removeAllListeners(`${token}-end`)
            }
        }, [])

        /**开始执行 */
        const onStartExecute = useMemoizedFn(async (value, isSetForm?: boolean) => {
            if (selectGroupList.length === 0) {
                warn("请选择扫描规则")
                return
            }
            const {project} = value
            if (!project) {
                warn("请输入项目名称")
                return
            }
            // 设置表单
            if (isSetForm) {
                getAduitList()
                form.setFieldsValue({project})
            }
            const params: SyntaxFlowScanRequest = {
                ...extraParamsValue,
                ControlMode: "start",
                ProgramName: project,
                Filter: {
                    RuleNames: [],
                    Language: [],
                    GroupNames: selectGroupList,
                    Severity: [],
                    Purpose: [],
                    Tag: [],
                    Keyword: "",
                    FilterLibRuleKind: filterLibRuleKind
                }
            }
            apiSyntaxFlowScan(params, token).then(() => {
                pageInfoCacheRef.current = {
                    ...pageInfo,
                    projectName: project
                }
                setIsExpand(false)
                setExecuteStatus("process")
                resetStreamInfo()
                if (setHidden) setHidden(true)
            })
        })

        /**取消执行 */
        const onStopExecute = useMemoizedFn(() => {
            if (isAuditExecuting) {
                codeScanAuditExecuteRef.current?.onCancelAudit()
            } else {
                setStopLoading(true)
                apiCancelSyntaxFlowScan(token).then(() => {
                    setIsExpand(true)
                    setExecuteStatus("finished")
                })
            }
        })

        /**暂停 */
        const onPause = useMemoizedFn(() => {
            setPauseLoading(true)
            const params: SyntaxFlowScanRequest = {
                ControlMode: "pause",
                ProgramName: [],
                Filter: {
                    RuleNames: [],
                    Language: [],
                    GroupNames: selectGroupList,
                    Severity: [],
                    Purpose: [],
                    Tag: [],
                    Keyword: "",
                    FilterLibRuleKind: filterLibRuleKind
                },
                ResumeTaskId: runtimeId
            }
            apiSyntaxFlowScan(params, token)
        })

        /**继续 */
        const onContinue = useMemoizedFn(() => {
            form.validateFields().then((value) => {
                const {project} = value
                if (!project) {
                    warn("请输入项目名称")
                    return
                }
                setContinueLoading(true)
                const params: SyntaxFlowScanRequest = {
                    ControlMode: "resume",
                    ProgramName: project,
                    Filter: {
                        RuleNames: [],
                        Language: [],
                        GroupNames: selectGroupList,
                        Severity: [],
                        Purpose: [],
                        Tag: [],
                        Keyword: "",
                        FilterLibRuleKind: filterLibRuleKind
                    },
                    ResumeTaskId: runtimeId
                }
                apiSyntaxFlowScan(params, token).then(() => {
                    setIsExpand(false)
                    setExecuteStatus("process")
                    resetStreamInfo()
                    if (setHidden) setHidden(true)
                })
            })
        })
        // 审计结果表格数据
        const [auditData, setAuditData] = useState<SyntaxFlowResult[]>([])
        const handleUpdateAuditData = useMemoizedFn((data: SyntaxFlowResult[]) => {
            setAuditData(data)
        })

        // 审计详情抽屉
        const auditInfo = useRef<SyntaxFlowResult>()
        const [auditDetailShow, setAuditDetailShow] = useState<boolean>(false)
        const handleShowDetail = useMemoizedFn((info: SyntaxFlowResult) => {
            if (auditDetailShow) return
            auditInfo.current = cloneDeep(info)
            setAuditDetailShow(true)
        })
        const handleCancelDetail = useMemoizedFn(() => {
            auditInfo.current = undefined
            setAuditDetailShow(false)
        })

        const getTabsState = useMemo(() => {
            const tabsState = [
                {tabName: "漏洞与风险", type: "ssa-risk"},
                {tabName: "日志", type: "log"},
                {tabName: "Console", type: "console"}
            ]
            if (runtimeId) {
                return [
                    {
                        tabName: "审计结果",
                        type: "result",
                        customProps: {onDetail: handleShowDetail, updateDataCallback: handleUpdateAuditData}
                    },
                    ...tabsState
                ]
            }
            return tabsState
        }, [runtimeId])

        // 跳转到代码审计页面
        const jumpCodeScanPage = useMemoizedFn(() => {
            if (!auditInfo.current) return
            // 跳转到审计页面的参数
            const params: AuditCodePageInfoProps = {
                Schema: "syntaxflow",
                Location: auditInfo.current.ProgramName,
                Path: `/`,
                Query: [{Key: "result_id", Value: auditInfo.current.ResultID}]
            }
            emiter.emit(
                "openPage",
                JSON.stringify({
                    route: YakitRoute.YakRunner_Audit_Code,
                    params
                })
            )
            handleCancelDetail()
        })

        const openExtraPropsDrawer = useMemoizedFn(() => {
            setExtraParamsVisible(true)
        })

        // 数组去重
        const filter = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

        return (
            <>
                <div
                    className={classNames(styles["code-scan-execute-form-wrapper"], {
                        [styles["code-scan-execute-form-wrapper-hidden"]]: !isExpand
                    })}
                    ref={codeScanFormRef}
                >
                    <Row style={{marginBottom: 16}}>
                        <Col span={6}></Col>
                        <Col span={12}>
                            <YakitRadioButtons
                                disabled={isExecuting}
                                value={executeType}
                                onChange={(e) => {
                                    setExecuteType(e.target.value)
                                }}
                                buttonStyle='solid'
                                options={[
                                    {
                                        value: "new",
                                        label: "新项目"
                                    },
                                    {
                                        value: "old",
                                        label: "已编译项目"
                                    }
                                ]}
                            />
                        </Col>
                    </Row>
                    {executeType === "new" ? (
                        <CodeScanAuditExecuteForm
                            ref={codeScanAuditExecuteRef}
                            selectGroupList={selectGroupList}
                            plugin={plugin}
                            onStartExecute={onStartExecute}
                            setProgressShow={setProgressShow}
                            pushNewLogs={pushNewLogs}
                            isAuditExecuting={isAuditExecuting}
                            setAuditsExecuting={setAuditsExecuting}
                            setExecuteType={setExecuteType}
                            setIsExpand={setIsExpand}
                            setExecuteStatus={setExecuteStatus}
                            resetStreamInfo={resetStreamInfo}
                            setAuditError={setAuditError}
                            openExtraPropsDrawer={openExtraPropsDrawer}
                        />
                    ) : (
                        <Form
                            form={form}
                            onFinish={(value) => onStartExecute(value)}
                            labelCol={{span: 6}}
                            wrapperCol={{span: 12}} //这样设置是为了让输入框居中
                            validateMessages={{
                                /* eslint-disable no-template-curly-in-string */
                                required: "${label} 是必填字段"
                            }}
                            labelWrap={true}
                        >
                            <Form.Item
                                label='项目名称'
                                name='project'
                                rules={[{required: true, message: "请选择项目名称"}]}
                            >
                                <YakitSelect
                                    mode='multiple'
                                    allowClear
                                    showSearch
                                    placeholder='请选择项目名称'
                                    options={auditCodeList}
                                    onChange={(arr: string[]) => {
                                        let selectGroup = [...selectGroupList]
                                        arr.forEach((item) => {
                                            let language = auditCodeList.find((itemIn) => itemIn.value === item)
                                                ?.language
                                            if (language) {
                                                selectGroup.push(language)
                                                selectGroup.push("general")
                                            }
                                        })
                                        const newSelectGroup = filter(selectGroup)
                                        onSetSelectGroupListByKeyWord(newSelectGroup)
                                    }}
                                />
                            </Form.Item>

                            <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                                <div className={styles["code-scan-execute-form-operate"]}>
                                    {isExecuting ? (
                                        <>
                                            {executeStatus === "paused" && !pauseLoading && (
                                                <YakitButton
                                                    size='large'
                                                    onClick={onContinue}
                                                    loading={continueLoading}
                                                >
                                                    继续
                                                </YakitButton>
                                            )}
                                            {(executeStatus === "process" || pauseLoading) && (
                                                <YakitButton
                                                    size='large'
                                                    onClick={onPause}
                                                    loading={pauseLoading}
                                                    disabled={stopLoading}
                                                >
                                                    暂停
                                                </YakitButton>
                                            )}
                                            <YakitButton
                                                danger
                                                onClick={onStopExecute}
                                                size='large'
                                                loading={stopLoading}
                                                disabled={pauseLoading || continueLoading}
                                            >
                                                停止
                                            </YakitButton>
                                        </>
                                    ) : (
                                        <>
                                            <YakitButton htmlType='submit' size='large'>
                                                开始执行
                                            </YakitButton>
                                        </>
                                    )}
                                    <YakitButton
                                        type='text'
                                        onClick={openExtraPropsDrawer}
                                        disabled={isAuditExecuting}
                                        size='large'
                                    >
                                        额外参数
                                    </YakitButton>
                                </div>
                            </Form.Item>
                        </Form>
                    )}
                </div>

                {isShowResult && (
                    <PluginExecuteResult
                        streamInfo={{
                            progressState: [],
                            cardState: streamInfo.cardState,
                            tabsState: getTabsState,
                            logState: streamInfo.logState,
                            tabsInfoState: {},
                            riskState: [],
                            rulesState: []
                        }}
                        runtimeId={runtimeId}
                        loading={isExecuting}
                        defaultActiveKey={undefined}
                    />
                )}

                {/* <React.Suspense fallback={<>loading...</>}>
                    {auditDetailShow && auditInfo.current && (
                        <AuditCodeDetailDrawer
                            rowData={auditInfo.current}
                            visible={auditDetailShow}
                            handleCancelDetail={handleCancelDetail}
                        />
                    )}
                </React.Suspense> */}

                <React.Suspense fallback={<>loading...</>}>
                    {auditDetailShow && auditInfo.current && (
                        <YakitDrawer
                            visible={auditDetailShow}
                            onClose={handleCancelDetail}
                            width='90%'
                            title='审计详情'
                            extra={
                                <YakitButton
                                    icon={<OutlineTerminalIcon />}
                                    type='outline2'
                                    onClick={() => jumpCodeScanPage()}
                                >
                                    在代码审计中打开
                                </YakitButton>
                            }
                            bodyStyle={{overflow: "hidden", padding: 0}}
                        >
                            {/* 审计详情 */}
                            <div className={classNames(styles["drawer-body"])}>
                                <React.Suspense fallback={<YakitSpin spinning={true} />}>
                                    {auditDetailShow && auditInfo.current && (
                                        <RuleDebugAuditDetail auditData={auditData} info={auditInfo.current} />
                                    )}
                                </React.Suspense>
                            </div>
                        </YakitDrawer>
                    )}
                </React.Suspense>
            </>
        )
    })
)

const CodeScanAuditExecuteForm: React.FC<CodeScanAuditExecuteFormProps> = React.memo(
    forwardRef((props, ref) => {
        const {
            selectGroupList,
            plugin,
            onStartExecute,
            setProgressShow,
            pushNewLogs,
            isAuditExecuting,
            setAuditsExecuting,
            setExecuteType,
            setIsExpand,
            setExecuteStatus,
            resetStreamInfo,
            setAuditError,
            openExtraPropsDrawer
        } = props
        const [form] = Form.useForm()
        // 是否表单校验中
        const [isVerifyForm, setVerifyForm] = useState<boolean>(false)
        const [activeKey, setActiveKey] = useState<string | string[]>()
        const [agentConfigModalVisible, setAgentConfigModalVisible] = useState<boolean>(false)
        // 由于此流还包含表单校验功能 因此需判断校验是否通过，是否已经真正的执行了
        const isRealStartRef = useRef<boolean>(false)

        /** 填充表单默认值 */
        const handleInitFormValue = useMemoizedFn((arr:YakParamProps[]) => {
            // 表单内数据
            let formData = {}
            if (form) formData = (form.getFieldsValue() || {})
            let defaultValue = {...formData}
            let newFormValue = {}
            arr.forEach((ele) => {
                let initValue = formData[ele.Field] || ele.Value || ele.DefaultValue
                const value = getValueByType(initValue, ele.TypeVerbose)
                newFormValue = {
                    ...newFormValue,
                    [ele.Field]: value
                }
            })
            form.setFieldsValue({...cloneDeep(defaultValue || {}), ...newFormValue})
        })

        /** 选填参数 */
        const groupParams = useMemo(() => {
            const arr =
                plugin?.Params.filter(
                    (item) => !item.Required && (item.Group || "").length > 0
                ) || []
            return ParamsToGroupByGroupName(arr)
        }, [plugin?.Params])

        /** 必填参数（头部展示） */
        const groupParamsHeader = useMemo(() => {
            const arr =
                plugin?.Params.filter(
                    (item) => item.Required && (item.Group || "").length > 0
                ) || []
            handleInitFormValue(arr)     
            return ParamsToGroupByGroupName(arr)
        }, [plugin?.Params])

        /** 自定义控件数据 */
        const customParams = useMemo(() => {
            const defalut: FormExtraSettingProps = {
                double: false,
                data: []
            }
            try {
                const arr = plugin?.Params.filter((item) => !item.Required) || []
                const customArr = arr.filter((item) => (item.Group || "").length === 0)
                // 项目分片
                const peephole = customArr.find((item) => item.Field === "peephole")?.ExtraSetting || "{}"
                const language = customArr.find((item) => item.Field === "language")?.ExtraSetting || "{}"

                const peepholeArr: FormExtraSettingProps = JSON.parse(peephole) || {
                    double: false,
                    data: []
                }
                const languageArr: FormExtraSettingProps = JSON.parse(language) || {
                    double: false,
                    data: []
                }
                return {
                    peepholeArr,
                    languageArr
                }
            } catch (error) {
                return {
                    peepholeArr: defalut,
                    languageArr: defalut
                }
            }
        }, [plugin?.Params])

        const tokenRef = useRef<string>(randomString(40))
        const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
            taskName: "debug-plugin",
            apiKey: "DebugPlugin",
            token: tokenRef.current,
            onEnd: (getStreamInfo) => {
                debugPluginStreamEvent.stop()
                setTimeout(() => {
                    if (getStreamInfo) {
                        const errorLog = getStreamInfo.logState.find((item) => item.level === "error")
                        if (errorLog) {
                            setExecuteStatus("error")
                            setAuditError(true)
                        }
                    }
                    setAuditsExecuting(false)
                    setProgressShow(undefined)
                }, 300)
            },
            onError: () => {
                setExecuteStatus("error")
            },
            setRuntimeId: (rId) => {
                yakitNotify("info", `调试任务启动成功，运行时 ID: ${rId}`)
            }
        })
        const runnerProject = useRef<string>()

        // 执行审计
        const onStartAudit = useMemoizedFn((requestParams: DebugPluginRequest) => {
            setAuditError(false)
            debugPluginStreamEvent.reset()
            apiDebugPlugin({params: requestParams, token: tokenRef.current}).then(() => {
                isRealStartRef.current = false
                resetStreamInfo()
                debugPluginStreamEvent.start()
                setVerifyForm(true)
            })
        })

        const onCancelAudit = () => {
            apiCancelDebugPlugin(tokenRef.current).then(() => {
                setIsExpand(true)
                setExecuteStatus("finished")
            })
        }

        useImperativeHandle(
            ref,
            () => ({
                onCancelAudit,
                onStartAuditExecute: () => {
                    form.validateFields()
                        .then(onStartAuditFun)
                        .catch((e) => {
                            setIsExpand(true)
                        })
                }
            }),
            []
        )

        useUpdateEffect(() => {
            // 此处为真正的启动
            if (!isRealStartRef.current) {
                const startLog = streamInfo.logState.find((item) => item.level === "code")
                if (startLog && startLog.data) {
                    try {
                        const verifyStart = JSON.parse(startLog?.data) as VerifyStartProps
                        const {kind, msg} = verifyStart.error
                        setVerifyForm(false)
                        runnerProject.current = verifyStart.program_name
                        switch (kind) {
                            // 链接错误
                            case "connectFailException":
                                warn("链接错误")
                                setActiveKey(["defalut"])
                                setTimeout(() => {
                                    form.setFields([
                                        {
                                            name: "proxy",
                                            errors: [msg] // 设置错误信息
                                        },
                                        {
                                            name: "language",
                                            errors: []
                                        }
                                    ])
                                }, 200)

                                break
                            // 文件类型错误
                            case "fileTypeException":
                                form.setFields([
                                    {
                                        name: "proxy",
                                        errors: []
                                    },
                                    {
                                        name: "language",
                                        errors: []
                                    }
                                ])
                                warn(
                                    "输入文件无法解析，请检查输入的路径为文件夹或jar/war/zip文件，或链接是否包含http/https/git协议头"
                                )
                                break
                            // 文件不存在错误
                            case "fileNotFoundException":
                                form.setFields([
                                    {
                                        name: "proxy",
                                        errors: []
                                    },
                                    {
                                        name: "language",
                                        errors: []
                                    }
                                ])
                                warn(
                                    "路径错误或者输入的内容无法识别，请检查输入的路径是否存在文件或文件夹或链接是否有http/https/git协议头。"
                                )
                                break
                            // 无法自动确定语言
                            case "languageNeedSelectException":
                                warn("该输入无法自动确定语言，请指定编译语言")
                                setActiveKey(["defalut"])
                                form.setFields([
                                    {
                                        name: "language",
                                        errors: [msg] // 设置错误信息
                                    },
                                    {
                                        name: "proxy",
                                        errors: []
                                    }
                                ])
                                break
                            default:
                                //  真正的启动
                                isRealStartRef.current = true
                                setIsExpand(false)
                                setAuditsExecuting(true)
                                setExecuteStatus("process")
                                break
                        }
                    } catch (error) {
                        failed("启动解析失败")
                    }
                }
            }

            if (isRealStartRef.current) {
                const progress = Math.floor((streamInfo.progressState.map((item) => item.progress)[0] || 0) * 100) / 100
                // 当任务结束时 跳转打开编译列表
                if (progress === 1) {
                    setTimeout(() => {
                        if (runnerProject.current) {
                            setExecuteType("old")
                            onStartExecute({project: [runnerProject.current]}, true)
                        } else {
                            failed("项目名获取失败")
                        }
                    }, 300)
                }

                let newLog = streamInfo.logState.slice(0, 100).map((item) => ({
                    type: "log",
                    content: item
                }))
                pushNewLogs(newLog)

                setProgressShow({
                    type: "new",
                    progress: progress
                })
            }
        }, [streamInfo])

        const onStartAuditFun = useMemoizedFn(async (value) => {
            if (selectGroupList.length === 0) {
                warn("请选择扫描规则")
                return
            }
            if (!plugin) {
                failed("插件获取失败")
                return
            }
            const requestParams: DebugPluginRequest = {
                Code: plugin.Content,
                PluginType: plugin.Type,
                Input: value["Input"] || "",
                HTTPRequestTemplate: {} as HTTPRequestBuilderParams,
                ExecParams: [],
                PluginName: ""
            }

            requestParams.ExecParams = getYakExecutorParam({...value})
            if (customParams.peepholeArr.data.length > 0) {
                requestParams.ExecParams = requestParams.ExecParams.map((item) => {
                    if (item.Key === "peephole") {
                        return {...item, Value: customParams.peepholeArr?.data[item.Value]?.value}
                    }
                    return item
                })
            }
            onStartAudit(requestParams)
        })

        return (
            <div className={styles["code-scan-audit-execute-form"]}>
                <Form
                    form={form}
                    onFinish={onStartAuditFun}
                    labelCol={{span: 6}}
                    wrapperCol={{span: 12}} //这样设置是为了让输入框居中
                    validateMessages={{
                        /* eslint-disable no-template-curly-in-string */
                        required: "${label} 是必填字段"
                    }}
                    labelWrap={true}
                    className={styles["code-scan-form"]}
                >
                    <Form.Item name='target' label='项目路径' rules={[{required: true, message: "请输入项目路径"}]}>
                        <YakitDragger
                            isShowPathNumber={false}
                            selectType='all'
                            renderType='textarea'
                            multiple={false}
                            help='可将项目文件拖入框内或点击此处'
                            disabled={false}
                            // accept=""
                        />
                    </Form.Item>

                    {groupParamsHeader.length > 0 && (
                        <>
                            {groupParamsHeader.map((item, index) => (
                                <>
                                    {item.data?.map((formItem) => (
                                        <React.Fragment key={formItem.Field + formItem.FieldVerbose}>
                                            <FormContentItemByType item={formItem} pluginType={"yak"} />
                                        </React.Fragment>
                                    ))}
                                </>
                            ))}
                        </>
                    )}

                    {/* <ExecuteEnterNodeByPluginParams
                        paramsList={requiredParams}
                        pluginType={"yak"}
                        isExecuting={isAuditExecuting}
                        jsonSchemaListRef={jsonSchemaListRef}
                    /> */}

                    {groupParams.length > 0 && (
                        <Row>
                            <Col span={18}>
                                <div
                                    className={styles["additional-params-divider"]}
                                    style={{marginLeft: "calc(33% - 98px)"}}
                                >
                                    <div className={styles["text-style"]}>额外参数 (非必填)</div>
                                    <div className={styles["divider-style"]} />
                                </div>
                                <YakitCollapse
                                    className={styles["extra-params-collapse"]}
                                    activeKey={activeKey}
                                    onChange={(v) => {
                                        setActiveKey(v)
                                    }}
                                >
                                    <YakitPanel key='defalut' header={`参数组`}>
                                        <Form.Item name='language' label='语言'>
                                            <YakitSelect options={customParams.languageArr.data} />
                                        </Form.Item>
                                        <Form.Item
                                            name='proxy'
                                            label='代理'
                                            extra={
                                                <div
                                                    className={styles["agent-down-stream-proxy"]}
                                                    onClick={() => setAgentConfigModalVisible(true)}
                                                >
                                                    配置代理认证
                                                </div>
                                            }
                                        >
                                            <YakitAutoComplete placeholder='例如 http://127.0.0.1:7890 或者 socks5://127.0.0.1:7890' />
                                        </Form.Item>
                                        <Form.Item
                                            name='peephole'
                                            label='编译速度'
                                            help='小文件无需配置，大文件可根据需求选择，速度越快，精度越小'
                                        >
                                            <Slider
                                                style={{width: 300}}
                                                dots
                                                min={0}
                                                max={3}
                                                tipFormatter={(value) => {
                                                    switch (value) {
                                                        case 0:
                                                            return "关闭，精度IV"
                                                        case 1:
                                                            return "慢速，精度III"
                                                        case 2:
                                                            return "中速，精度II"
                                                        case 3:
                                                            return "快速，精度I"
                                                        default:
                                                            return value
                                                    }
                                                }}
                                            />
                                        </Form.Item>
                                    </YakitPanel>
                                </YakitCollapse>
                                <ExtraParamsNodeByType
                                    extraParamsGroup={groupParams}
                                    pluginType={"yak"}
                                    isDefaultActiveKey={false}
                                    wrapperClassName={styles["extra-node-collapse"]}
                                />
                            </Col>
                        </Row>
                    )}

                    <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                        <div className={styles["code-scan-execute-form-operate"]}>
                            {isAuditExecuting ? (
                                <YakitButton danger onClick={onCancelAudit} size='large'>
                                    停止
                                </YakitButton>
                            ) : (
                                <YakitButton htmlType='submit' size='large' loading={isVerifyForm}>
                                    {isVerifyForm ? "正在校验" : "开始编译"}
                                </YakitButton>
                            )}
                            <YakitButton
                                type='text'
                                onClick={openExtraPropsDrawer}
                                disabled={isAuditExecuting}
                                size='large'
                            >
                                额外参数
                            </YakitButton>
                        </div>
                    </Form.Item>
                </Form>
                <AgentConfigModal
                    agentConfigModalVisible={agentConfigModalVisible}
                    onCloseModal={() => setAgentConfigModalVisible(false)}
                    generateURL={(url) => {
                        form.setFieldsValue({proxy: url})
                    }}
                />
            </div>
        )
    })
)

/**@name 代码扫描中规则列表的item */
export const FlowRuleDetailsListItem: React.FC<FlowRuleDetailsListItemProps> = React.memo((props) => {
    const {data} = props
    return (
        <div className={styles["flow-rule-item-wrapper"]}>
            <div className={styles["flow-rule-item"]}>
                <div className={styles["flow-rule-item-info"]}>
                    <div
                        className={classNames(
                            styles["flow-rule-item-info-text-style"],
                            "yakit-content-single-ellipsis"
                        )}
                    >
                        {data.Title}
                    </div>
                </div>
                <div className={styles["flow-rule-item-show"]}>
                    <Tooltip
                        title={data.Description || "No Description about it."}
                        placement='topRight'
                        overlayClassName='plugins-tooltip'
                    >
                        <OutlineQuestionmarkcircleIcon className={styles["flow-rule-item-show-icon-style"]} />
                    </Tooltip>
                </div>
            </div>
        </div>
    )
})
