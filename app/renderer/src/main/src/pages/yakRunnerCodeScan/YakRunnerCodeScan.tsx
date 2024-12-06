import React, {forwardRef, useEffect, useImperativeHandle, useMemo, useReducer, useRef, useState} from "react"
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
    QuerySyntaxFlowRuleRequest,
    QuerySyntaxFlowRuleResponse,
    SyntaxFlowGroup,
    SyntaxFlowRule,
    SyntaxFlowScanExecuteState,
    SyntaxFlowScanRequest,
    SyntaxFlowScanResponse,
    YakRunnerCodeScanProps
} from "./YakRunnerCodeScanType"
import {Col, Divider, Form, Row, Tooltip} from "antd"
import {} from "@ant-design/icons"
import {
    useControllableValue,
    useCreation,
    useDebounceFn,
    useGetState,
    useInViewport,
    useMemoizedFn,
    useUpdateEffect
} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./YakRunnerCodeScan.module.scss"
import {failed, success, warn, info, yakitNotify} from "@/utils/notification"
import classNames from "classnames"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlinCompileIcon,
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineCloseIcon,
    OutlineOpenIcon,
    OutlineQuestionmarkcircleIcon
} from "@/assets/icon/outline"
import {defYakitAutoCompleteRef, YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {RemoteGV} from "@/yakitGV"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {YakScript} from "../invoker/schema"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {ExpandAndRetract} from "../plugins/operator/expandAndRetract/ExpandAndRetract"
import {
    ExecuteEnterNodeByPluginParams,
    PluginExecuteProgress
} from "../plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import useHoldBatchGRPCStream from "@/hook/useHoldBatchGRPCStream/useHoldBatchGRPCStream"
import {randomString} from "@/utils/randomUtil"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {grpcFetchAuditTree} from "../yakRunnerAuditCode/utils"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {addToTab} from "../MainTabs"
import {
    apiCancelSyntaxFlowScan,
    apiFetchQuerySyntaxFlowRule,
    apiFetchQuerySyntaxFlowRuleGroup,
    apiSyntaxFlowScan
} from "./utils"
import {YakitRoute} from "@/enums/yakitRoute"
import {CodeScanPageInfoProps, PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {defaultCodeScanPageInfo} from "@/defaultConstants/CodeScan"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import useHoldGRPCStream, {convertCardInfo} from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {HoldGRPCStreamProps, StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {isCommunityEdition} from "@/utils/envfile"
import {WaterMark} from "@ant-design/pro-layout"
import {PluginExecuteResult} from "../plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {v4 as uuidv4} from "uuid"
import {grpcFetchLocalPluginDetail} from "../pluginHub/utils/grpc"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {ExtraParamsNodeByType} from "../plugins/operator/localPluginExecuteDetailHeard/PluginExecuteExtraParams"
import {getYakExecutorParam, ParamsToGroupByGroupName} from "../plugins/editDetails/utils"
import {apiCancelDebugPlugin, apiDebugPlugin, DebugPluginRequest} from "../plugins/utils"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {getJsonSchemaListResult} from "@/components/JsonFormWrapper/JsonFormWrapper"
import {number} from "echarts"
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
        apiFetchQuerySyntaxFlowRuleGroup(params)
            .then((res) => {
                setResponse(res)
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

    const onSetSelectGroupList = useMemoizedFn((groups) => {
        setPageInfo((v) => ({...v, selectGroup: groups}))
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

    const waterMarkStr = useMemo(() => {
        if (isCommunityEdition()) {
            return "Yakit技术浏览版仅供技术交流使用"
        }
        return " "
    }, [])

    return (
        <WaterMark content={waterMarkStr} style={{overflow: "hidden", height: "100%"}}>
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
                    pageId={pageId}
                />
            </div>
        </WaterMark>
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
    const {selectGroupList, setTotal, hidden} = props
    const isLoadingRef = useRef<boolean>(true)
    const [response, setResponse] = useState<QuerySyntaxFlowRuleResponse>(initialLocalState)
    const [loading, setLoading] = useState<boolean>(false)
    const [hasMore, setHasMore] = useState<boolean>(true)

    useEffect(() => {
        fetchList(true)
    }, [selectGroupList])

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
                    Keyword: ""
                },
                Pagination: {
                    Limit: params?.Limit || 10,
                    Page: params?.Page || 1,
                    OrderBy: "updated_at",
                    Order: "desc"
                }
            }
            query.Filter.GroupNames = selectGroupList
            try {
                const res = await apiFetchQuerySyntaxFlowRule(query)
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
    const {onClearAll, selectGroupList, pageInfo, pageId} = props
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
    /**继续 */
    const [continueLoading, setContinueLoading] = useState<boolean>(false)
    // 任务列表抽屉
    const [visibleRaskList, setVisibleRaskList] = useState<boolean>(false)
    const isExecuting = useCreation(() => {
        if (executeStatus === "process") return true
        if (executeStatus === "paused") return true
        return false
    }, [executeStatus])

    const selectGroupNum = useCreation(() => {
        return selectGroupList.length
    }, [selectGroupList])

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

    const [auditCodeList, setAuditCodeList] = useState<{label: string; value: string}[]>([])

    const getAduitList = useMemoizedFn(async () => {
        try {
            const {res} = await grpcFetchAuditTree("/")
            if (res.Resources.length > 0) {
                const list = res.Resources.map((item) => ({label: item.ResourceName, value: item.ResourceName}))
                setAuditCodeList(list)
            }
        } catch (error) {}
    })

    useEffect(() => {
        getAduitList()
    }, [])

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
                            <YakitButton type='text' danger onClick={onClearAll}>
                                清空
                            </YakitButton>
                        </div>
                    </div>
                    <CodeScanByGroup hidden={false} selectGroupList={selectGroupList} setTotal={setTotal} />
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
                        {/* <YakitButton
                            type='text'
                            onClick={(e) => {
                                e.stopPropagation()
                                setVisibleRaskList(true)
                            }}
                            style={{padding: 0}}
                        >
                            任务列表
                        </YakitButton> */}
                        {isExecuting
                            ? !isExpand && (
                                  <>
                                      {executeType === "new" ? (
                                          <YakitButton danger onClick={onStopAuditExecute}>
                                              停止
                                          </YakitButton>
                                      ) : (
                                          <>
                                              {/* {executeStatus === "paused" && !pauseLoading && (
                                          <YakitButton onClick={onContinue} loading={continueLoading}>
                                              继续
                                          </YakitButton>
                                      )}
                                      {(executeStatus === "process" || pauseLoading) && (
                                          <YakitButton onClick={onPause} loading={pauseLoading}>
                                              暂停
                                          </YakitButton>
                                      )} */}
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
                                      <div className={styles["divider-style"]}></div>
                                  </>
                              )}
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
                        setHidden={setHidden}
                        auditCodeList={auditCodeList}
                        getAduitList={getAduitList}
                        executeType={executeType}
                        setExecuteType={setExecuteType}
                        isAuditExecuting={isAuditExecuting}
                        setAuditsExecuting={setAuditsExecuting}
                        pageInfo={pageInfo}
                    />
                </div>
            </div>
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
            setProgressShow,
            auditCodeList,
            getAduitList,
            executeType,
            setExecuteType,
            pageInfo
        } = props
        const [form] = Form.useForm()

        const [plugin, setPlugin] = useState<YakScript>()
        /** 子组件方法传递给父组件 */
        const codeScanAuditExecuteRef = useRef<CodeScanAuditExecuteRefProps>(null)
        // 获取参数
        const handleFetchParams = useDebounceFn(
            useMemoizedFn(async () => {
                const newPlugin = await grpcFetchLocalPluginDetail({Name: "SSA 项目编译"}, true)
                setPlugin(newPlugin)
            }),
            {wait: 300}
        ).run

        useEffect(() => {
            handleFetchParams()
        }, [])

        useEffect(() => {
            if (pageInfo.projectName) {
                setExecuteType("old")
                form.setFieldsValue({
                    project: pageInfo.projectName
                })
            }
        }, [])

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
                }
            }),
            [form]
        )

        const [runtimeId, setRuntimeId] = useState<string>("")

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

        const isExecuting = useCreation(() => {
            if (executeStatus === "process") return true
            if (executeStatus === "paused") return true
            return false
        }, [executeStatus])

        const isShowResult = useCreation(() => {
            return isExecuting || runtimeId
        }, [isExecuting, runtimeId])

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

        const resetStreamInfo = useMemoizedFn(()=>{
            messages.current = []
            cardKVPair.current = new Map<string, HoldGRPCStreamProps.CacheCard>()
            setRuntimeId("")
        })

        useEffect(() => {
            let id = setInterval(() => {
                // logs
                const logs: StreamResult.Log[] = messages.current
                    .filter((i) => i.type === "log")
                    .map((i) => i.content as StreamResult.Log)
                    .filter((i) => i.data !== "null")
                setStreamInfo({
                    cardState: convertCardInfo(cardKVPair.current),
                    logState: logs
                })
            }, 200)
            return () => clearInterval(id)
        }, [])
        // const cacheCard: HoldGRPCStreamProps.InfoCards[] = convertCardInfo(cardKVPair.current)
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

        useEffect(() => {
            ipcRenderer.on(`${token}-data`, async (e: any, res: SyntaxFlowScanResponse) => {
                if (res) {
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
                                setPauseLoading(false)
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
                    if (!!data?.RuntimeID) {
                        setRuntimeId(data.RuntimeID)
                    }
                    if (data && data.IsMessage) {
                        try {
                            let obj: StreamResult.Message = JSON.parse(Buffer.from(data.Message).toString())
                            let progressObj = obj.content as StreamResult.Progress
                            if (obj.type === "progress") {
                                setProgressShow({
                                    type: "old",
                                    progress: progressObj.progress,
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
                    setContinueLoading(false)
                }, 200)
                yakitNotify("error", `[Mod] flow-scan error: ${error}`)
            })
            ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
                info("[SyntaxFlowScan] finished")
                setTimeout(() => {
                    setPauseLoading(false)
                    setContinueLoading(false)
                }, 200)
            })
            return () => {
                ipcRenderer.invoke("cancel-ConvertPayloadGroupToDatabase", token)
                ipcRenderer.removeAllListeners(`${token}-data`)
                ipcRenderer.removeAllListeners(`${token}-error`)
                ipcRenderer.removeAllListeners(`${token}-end`)
            }
        }, [])

        /**开始执行 */
        const onStartExecute = useMemoizedFn(async (value, isSetForm?: boolean) => {
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
                ControlMode: "start",
                ProgramName: [project],
                Filter: {
                    RuleNames: [],
                    Language: [],
                    GroupNames: selectGroupList,
                    Severity: [],
                    Purpose: [],
                    Tag: [],
                    Keyword: ""
                }
            }
            apiSyntaxFlowScan(params, token).then(() => {
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
                apiCancelSyntaxFlowScan(token).then(() => {
                    setIsExpand(true)
                    setExecuteStatus("finished")
                })
            }
        })

        /**暂停 */
        const onPause = useMemoizedFn(() => {
            setPauseLoading(true)
            // apiHybridScanByMode(runtimeId, "pause", tokenRef.current)
        })

        /**继续 */
        const onContinue = useMemoizedFn(() => {
            setContinueLoading(true)
            // hybridScanStreamEvent.reset()
            // apiHybridScanByMode(runtimeId, "resume", tokenRef.current).then(() => {
            //     hybridScanStreamEvent.start()
            // })
        })

        const getTabsState = useMemo(() => {
            const tabsState = [
                {tabName: "漏洞与风险", type: "risk"},
                {tabName: "日志", type: "log"},
                {tabName: "Console", type: "console"}
            ]
            if (runtimeId) {
                return [{tabName: "审计结果", type: "result"}, ...tabsState]
            }
            return tabsState
        }, [runtimeId])
        return (
            <>
                <div
                    className={classNames(styles["code-scan-execute-form-wrapper"], {
                        [styles["code-scan-execute-form-wrapper-hidden"]]: !isExpand
                    })}
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
                            className={styles["code-scan-form"]}
                        >
                            <Form.Item
                                label='项目名称'
                                name='project'
                                rules={[{required: true, message: "请选择项目名称"}]}
                            >
                                <YakitSelect
                                    showSearch
                                    placeholder='请选择项目名称'
                                    options={auditCodeList}
                                ></YakitSelect>
                            </Form.Item>

                            <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                                <div className={styles["code-scan-execute-form-operate"]}>
                                    {isExecuting ? (
                                        <>
                                            {/* {executeStatus === "paused" && !pauseLoading && (
                                            <YakitButton size='large' onClick={onContinue} loading={continueLoading}>
                                                继续
                                            </YakitButton>
                                        )} */}
                                            {/* {(executeStatus === "process" || pauseLoading) && (
                                            <YakitButton size='large' onClick={onPause} loading={pauseLoading}>
                                                暂停
                                            </YakitButton>
                                        )} */}
                                            <YakitButton
                                                danger
                                                onClick={onStopExecute}
                                                size='large'
                                                disabled={pauseLoading || continueLoading}
                                            >
                                                停止
                                            </YakitButton>
                                        </>
                                    ) : (
                                        <>
                                            <YakitButton
                                                htmlType='submit'
                                                size='large'
                                                disabled={selectGroupList.length === 0}
                                            >
                                                开始执行
                                            </YakitButton>
                                        </>
                                    )}
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
                            riskState: []
                        }}
                        runtimeId={runtimeId}
                        loading={isExecuting}
                        defaultActiveKey={undefined}
                    />
                )}
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
            resetStreamInfo
        } = props
        const [form] = Form.useForm()
        const jsonSchemaListRef = useRef<{
            [key: string]: any
        }>({})
        const [extraParamsVisible, setExtraParamsVisible] = useState<boolean>(false)
        const openExtraPropsDrawer = useMemoizedFn(() => {
            setExtraParamsVisible(true)
        })

        // 必要参数
        const requiredParams = useMemo(() => {
            return (
                plugin?.Params.filter((item) => !!item.Required).map((item) => {
                    return item
                }) || []
            )
        }, [plugin?.Params])
        const [extraParamsValue, setExtraParamsValue] = useState<any>()
        /** 选填参数 */
        const groupParams = useMemo(() => {
            const arr = plugin?.Params.filter((item) => !item.Required) || []
            return ParamsToGroupByGroupName(arr)
        }, [plugin?.Params])

        const tokenRef = useRef<string>(randomString(40))
        const [runtimeId, setRuntimeId] = useState<string>("")
        const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
            taskName: "debug-plugin",
            apiKey: "DebugPlugin",
            token: tokenRef.current,
            onEnd: () => {
                debugPluginStreamEvent.stop()
                setTimeout(() => {
                    setAuditsExecuting(false)
                    setProgressShow(undefined)
                }, 300)
            },
            onError: () => {
                setExecuteStatus("error")
            },
            setRuntimeId: (rId) => {
                yakitNotify("info", `调试任务启动成功，运行时 ID: ${rId}`)
                setRuntimeId(rId)
            }
        })
        const runnerProject = useRef<string>()

        // 执行审计
        const onStartAudit = useMemoizedFn((path: string, requestParams: DebugPluginRequest) => {
            debugPluginStreamEvent.reset()
            apiDebugPlugin({params: requestParams, token: tokenRef.current}).then(() => {
                resetStreamInfo()
                setIsExpand(false)
                setAuditsExecuting(true)
                setExecuteStatus("process")
                debugPluginStreamEvent.start()
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
            const progress = Math.floor((streamInfo.progressState.map((item) => item.progress)[0] || 0) * 100) / 100
            // 当任务结束时 跳转打开编译列表
            if (progress === 1) {
                setTimeout(() => {
                    setExecuteType("old")
                    runnerProject.current && onStartExecute({project: runnerProject.current},true)
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
        }, [streamInfo])

        const onStartAuditFun = useMemoizedFn(async (value) => {
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

            const request: Record<string, any> = {}
            for (let el of plugin?.Params || []) request[el.Field] = value[el.Field] || undefined
            requestParams.ExecParams = getYakExecutorParam({...value, ...extraParamsValue})

            const result = getJsonSchemaListResult(jsonSchemaListRef.current)
            if (result.jsonSchemaError.length > 0) {
                failed(`jsonSchema校验失败`)
                return
            }
            result.jsonSchemaSuccess.forEach((item) => {
                requestParams.ExecParams.push({
                    Key: item.key,
                    Value: JSON.stringify(item.value)
                })
            })
            runnerProject.current = value["programName"]
            onStartAudit(value["programName"], requestParams)
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
                    <div className={styles["custom-params-wrapper"]}>
                        <ExecuteEnterNodeByPluginParams
                            paramsList={requiredParams}
                            pluginType={"yak"}
                            isExecuting={isAuditExecuting}
                            jsonSchemaListRef={jsonSchemaListRef}
                        />
                    </div>
                    <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                        <div className={styles["code-scan-execute-form-operate"]}>
                            {isAuditExecuting ? (
                                <YakitButton danger onClick={onCancelAudit} size='large'>
                                    停止
                                </YakitButton>
                            ) : (
                                <YakitButton htmlType='submit' size='large' disabled={selectGroupList.length === 0}>
                                    开始编译
                                </YakitButton>
                            )}
                            {groupParams.length > 0 && (
                                <YakitButton
                                    type='text'
                                    onClick={openExtraPropsDrawer}
                                    disabled={isAuditExecuting}
                                    size='large'
                                >
                                    额外参数
                                </YakitButton>
                            )}
                        </div>
                    </Form.Item>
                </Form>
                {/* 额外参数中没有JsonSchema */}
                <React.Suspense fallback={<div>loading...</div>}>
                    <CodeScanExecuteExtraParamsDrawer
                        groupParams={groupParams}
                        visible={extraParamsVisible}
                        setVisible={setExtraParamsVisible}
                        extraParamsValue={extraParamsValue}
                        setExtraParamsValue={setExtraParamsValue}
                    />
                </React.Suspense>
            </div>
        )
    })
)

const CodeScanExecuteExtraParamsDrawer: React.FC<CodeScanExecuteExtraParamsDrawerProps> = React.memo((props) => {
    const {groupParams, visible, setVisible, extraParamsValue, setExtraParamsValue} = props
    const [form] = Form.useForm()

    useEffect(() => {
        if (visible) {
            form.setFieldsValue({...extraParamsValue})
        }
    }, [visible, extraParamsValue])

    const onClose = useMemoizedFn(() => {
        onSaveSetting()
    })
    const onSaveSetting = useMemoizedFn(() => {
        form.validateFields().then((formValue) => {
            setExtraParamsValue(formValue)
            setVisible(false)
        })
    })
    return (
        <YakitDrawer
            className={styles["code-scan-execute-extra-params-drawer"]}
            visible={visible}
            onClose={onClose}
            width='40%'
            title='额外参数 (非必填)'
        >
            <Form size='small' labelWrap={true} labelCol={{span: 6}} wrapperCol={{span: 18}} form={form}>
                <ExtraParamsNodeByType extraParamsGroup={groupParams} pluginType={"yak"} />
            </Form>
        </YakitDrawer>
    )
})

/**@name 代码扫描中规则列表的item */
export const FlowRuleDetailsListItem: (props: FlowRuleDetailsListItemProps) => any = React.memo((props) => {
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
