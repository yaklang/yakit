import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {
    CodeScaMainExecuteContentProps,
    CodeScanAuditExecuteFormProps,
    CodeScanAuditExecuteRefProps,
    CodeScanByExecuteProps,
    CodeScanByGroupProps,
    CodeScanExecuteContentProps,
    CodeScanExecuteContentRefProps,
    CodeScanGroupByKeyWordItemProps,
    CodeScanTabsItem,
    FlowRuleDetailsListItemProps,
    SyntaxFlowResult,
    SyntaxFlowScanActiveTask,
    SyntaxFlowScanActiveTaskShow,
    SyntaxFlowScanExecuteState,
    SyntaxFlowScanModeType,
    SyntaxFlowScanRequest,
    SyntaxFlowScanResponse,
    VerifyStartProps,
    YakRunnerCodeScanProps,
    CodeScanRuleByGroupProps,
    CodeScanRuleByKeyWordProps,
    CreateSSAProjectResponse
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
    useThrottleFn,
    useUpdateEffect
} from "ahooks"
import styles from "./YakRunnerCodeScan.module.scss"
import {failed, warn, info, yakitNotify, success} from "@/utils/notification"
import classNames from "classnames"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineClipboardlistIcon,
    OutlineQuestionmarkcircleIcon,
    OutlineTerminalIcon
} from "@/assets/icon/outline"
import {defYakitAutoCompleteRef, YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {RemoteGV} from "@/yakitGV"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {genDefaultPagination, QueryGeneralResponse, YakScript} from "../invoker/schema"
import {ExpandAndRetract} from "../plugins/operator/expandAndRetract/ExpandAndRetract"
import {
    FormContentItemByType,
    PluginExecuteProgress
} from "../plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {randomString} from "@/utils/randomUtil"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {grpcFetchAuditTree} from "../yakRunnerAuditCode/utils"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {apiCancelSyntaxFlowScan, apiSyntaxFlowScan, getGroupNamesTotal} from "./utils"
import {YakitRoute} from "@/enums/yakitRoute"
import {AuditCodePageInfoProps, CodeScanPageInfoProps, PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {defaultCodeScanPageInfo} from "@/defaultConstants/CodeScan"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import useHoldGRPCStream, {convertCardInfo} from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {HoldGRPCStreamInfo, HoldGRPCStreamProps, StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {PluginExecuteResult} from "../plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {v4 as uuidv4} from "uuid"
import {grpcFetchLocalPluginDetail} from "../pluginHub/utils/grpc"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {ExtraParamsNodeByType} from "../plugins/operator/localPluginExecuteDetailHeard/PluginExecuteExtraParams"
import {getValueByType, getYakExecutorParam, ParamsToGroupByGroupName} from "../plugins/editDetails/utils"
import {apiCancelDebugPlugin, apiDebugPlugin, DebugPluginRequest} from "../plugins/utils"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
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
import {YakParamProps} from "../plugins/pluginsType"
import moment from "moment"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {ChevronDownIcon, ChevronUpIcon, FolderOpenIcon} from "@/assets/newIcon"
import {SSAProjectResponse} from "../yakRunnerAuditCode/AuditCode/AuditCodeType"
import {QuerySSAProgramRequest} from "../yakRunnerScanHistory/YakRunnerScanHistory"
import {apiQuerySSAPrograms} from "../yakRunnerScanHistory/utils"
import {formatTimestamp} from "@/utils/timeUtil"
import {AfreshAuditModal} from "../yakRunnerAuditCode/AuditCode/AuditCode"
import ProxyRulesConfig, { ProxyTest } from "@/components/configNetwork/ProxyRulesConfig"
import {checkProxyVersion, isValidUrlWithProtocol} from "@/utils/proxyConfigUtil"
import {useProxy} from "@/hook/useProxy"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
const {YakitPanel} = YakitCollapse
const {ipcRenderer} = window.require("electron")

// 数组去重
const filterItem = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

// clear
const clearRuleByPageInfo: CodeScanPageInfoProps = {
    GroupNames: [],
    Keyword: "",
    FilterLibRuleKind: "",
    selectTotal: 0,
    RuleIds: []
}
export interface CodeScanStreamInfo {
    logState: StreamResult.Log[]
    cardState: HoldGRPCStreamProps.InfoCards[]
}

const CodeScanRuleByGroup: React.FC<CodeScanRuleByGroupProps> = React.memo((props) => {
    const {inViewport} = props
    const [pageInfo, setPageInfo] = useControllableValue<CodeScanPageInfoProps>(props, {
        defaultValue: {
            ...clearRuleByPageInfo
        },
        valuePropName: "pageInfo",
        trigger: "setPageInfo"
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
        if (
            (pageInfo.Keyword || "").length > 0 ||
            pageInfo.FilterLibRuleKind !== "" ||
            (pageInfo.RuleIds || []).length > 0
        ) {
            return false
        }
        if (pageInfo.GroupNames && pageInfo.GroupNames.length > 0 && pageInfo.GroupNames.length !== response.length)
            return true
        return false
    }, [pageInfo.GroupNames, response])

    const checked: boolean = useCreation(() => {
        if (
            (pageInfo.Keyword || "").length > 0 ||
            pageInfo.FilterLibRuleKind !== "" ||
            (pageInfo.RuleIds || []).length > 0
        ) {
            return false
        }
        return (
            allCheck ||
            !!(pageInfo.GroupNames && pageInfo.GroupNames.length > 0 && pageInfo.GroupNames.length === response.length)
        )
    }, [pageInfo, allCheck])

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
    const onSelectAll = useMemoizedFn(async (e) => {
        try {
            const {checked} = e.target
            if (checked) {
                const GroupNames = response.map((ele) => ele.GroupName)
                const selectTotal = await getGroupNamesTotal(GroupNames)
                setPageInfo((prev) => ({
                    ...prev,
                    GroupNames,
                    Keyword: "",
                    FilterLibRuleKind: "",
                    selectTotal,
                    RuleIds: []
                }))
            } else {
                setPageInfo((prev) => ({
                    ...prev,
                    ...clearRuleByPageInfo
                }))
            }
            setAllCheck(checked)
        } catch (error) {}
    })

    const onClearSelect = useMemoizedFn(() => {
        setPageInfo((prev) => ({
            ...prev,
            ...clearRuleByPageInfo
        }))
        setAllCheck(false)
    })

    const total = useCreation(() => {
        return response.length
    }, [response])

    const onSelect = useMemoizedFn(async (val: SyntaxFlowGroup) => {
        try {
            const isExist = (pageInfo.GroupNames || []).includes(val.GroupName)
            if (isExist) {
                const newList = (pageInfo.GroupNames || []).filter((ele) => ele !== val.GroupName)
                setLoading(true)
                const selectTotal = await getGroupNamesTotal(newList)
                setLoading(false)
                setPageInfo((prev: CodeScanPageInfoProps) => ({
                    ...prev,
                    GroupNames: newList,
                    Keyword: "",
                    FilterLibRuleKind: "",
                    selectTotal,
                    RuleIds: []
                }))
                setAllCheck(newList.length === response.length)
            } else {
                const newList = [...(pageInfo.GroupNames || []), val.GroupName]
                setLoading(true)
                const selectTotal = await getGroupNamesTotal(newList)
                setLoading(false)
                setPageInfo((prev: CodeScanPageInfoProps) => ({
                    ...prev,
                    GroupNames: newList,
                    Keyword: "",
                    FilterLibRuleKind: "",
                    selectTotal,
                    RuleIds: []
                }))
                setAllCheck(newList.length === response.length)
            }
            setKeywords("")
            onSearch("")
        } catch (error) {}
    })

    return (
        <>
            <div
                className={classNames(styles["code-scan-group-wrapper"])}
                style={{height: inViewport ? "100%" : "0px"}}
            >
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
                                placeholder='请输入组名搜索'
                                onSearch={onSearch}
                                onPressEnter={onPressEnter}
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
                                Selected
                                <span className={styles["num-style"]}>{(pageInfo.GroupNames || []).length}</span>
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
                        const checked = (pageInfo.GroupNames || []).includes(rowData.GroupName)

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
        </>
    )
})

const CodeScanRuleByKeyWord: React.FC<CodeScanRuleByKeyWordProps> = React.memo((props) => {
    const {inViewport, handleTabClick} = props
    const [pageInfo, setPageInfo] = useControllableValue<CodeScanPageInfoProps>(props, {
        defaultValue: {
            GroupNames: [],
            selectTotal: 0
        },
        valuePropName: "pageInfo",
        trigger: "setPageInfo"
    })
    const [filterLibRuleKind, setFilterLibRuleKind] = useControllableValue<"" | "noLib">(props, {
        defaultValue: "noLib",
        valuePropName: "filterLibRuleKind",
        trigger: "setFilterLibRuleKind"
    })
    const [response, setResponse] = useState<QuerySyntaxFlowRuleResponse>(initialLocalState)
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectedRules, setSelectedRules] = useState<SyntaxFlowRule[]>([])
    const [groupList, setGroupList] = useState<SyntaxFlowGroup[]>([]) // 组数据
    const [groupTagShow, setGroupTagShow] = useState<boolean>(false)
    const [keywords, setKeywords] = useState<string>("")
    const [selectGroup, setSelectGroup] = useState<string[]>([])
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const checked: boolean = useCreation(() => {
        return allCheck || (selectedRules.length > 0 && selectedRules.length === response.Total)
    }, [selectedRules, allCheck, response.Total])

    const indeterminate: boolean = useCreation(() => {
        if (checked) return false
        if (!checked && selectedRules.length > 0) return true
        return false
    }, [selectedRules, checked])

    const onClearSelect = useMemoizedFn(() => {
        setSelectedRules([])
        setAllCheck(false)
        setSelectGroup([])
        setPageInfo((prev) => ({
            ...prev,
            ...clearRuleByPageInfo
        }))
    })

    const onSelectAll = useMemoizedFn((e) => {
        const {checked} = e.target
        if (checked) {
            setSelectedRules(response.Rule)
        } else {
            setSelectedRules([])
        }
        setAllCheck(checked)
    })

    const onSearch = useMemoizedFn((val) => {
        setKeywords(val)
        setAllCheck(false)
        setSelectedRules([])
    })

    const onPressEnter = useMemoizedFn((e) => {
        setIsRefresh(!isRefresh)
        setAllCheck(false)
        setSelectedRules([])
    })

    useEffect(() => {
        if (inViewport) init()
    }, [inViewport])

    const init = useMemoizedFn((KeyWord = "") => {
        const params = {
            Filter: {
                KeyWord
            }
        }
        grpcFetchLocalRuleGroupList({Pagination: DefaultRuleGroupFilterPageMeta, ...params})
            .then(({Group}) => {
                setGroupList(Group)
            })
            .finally(() => {})
    })

    const onSelectGroup = useMemoizedFn((val: SyntaxFlowGroup) => {
        setAllCheck(false)
        setSelectedRules([])
        setSelectGroup((v) => filterItem([...v, val.GroupName]))
    })

    const onCloseTag = useMemoizedFn((i: string) => {
        const arr = selectGroup.filter((element) => i !== element)
        setSelectGroup([...arr])
        setAllCheck(false)
        setSelectedRules([])
    })

    useUpdateEffect(() => {
        if (!inViewport) return
        if (allCheck) {
            setPageInfo((prev: CodeScanPageInfoProps) => ({
                ...prev,
                GroupNames: selectGroup,
                Keyword: keywords,
                FilterLibRuleKind: filterLibRuleKind,
                selectTotal: parseInt(response.Total + ""),
                RuleIds: []
            }))
        } else {
            setPageInfo((prev: CodeScanPageInfoProps) => ({
                ...prev,
                ...clearRuleByPageInfo,
                RuleIds: selectedRules.map((item) => parseInt(item.Id + "")),
                selectTotal: selectedRules.length
            }))
        }
    }, [allCheck, selectGroup, keywords, selectedRules, filterLibRuleKind])

    // 如若在按组选择插件组，则清空关键词搜索和已选规则与所选组
    useUpdateEffect(() => {
        if (!inViewport) {
            setSelectedRules([])
            setAllCheck(false)
            setSelectGroup([])
        }
    }, [pageInfo.GroupNames])

    const onFilterLibRuleKindChange = useMemoizedFn((v: "" | "noLib") => {
        setFilterLibRuleKind(v)
        setAllCheck(false)
        setSelectedRules([])
    })

    const onResetCodeScanProjectFun = useMemoizedFn(() => {
        handleTabClick({
            key: "group",
            label: <>按组选</>,
            contShow: false
        })
        setAllCheck(false)
        setSelectedRules([])
    })

    useEffect(() => {
        emiter.on("onResetCodeScanProject", onResetCodeScanProjectFun)
        return () => {
            emiter.off("onResetCodeScanProject", onResetCodeScanProjectFun)
        }
    }, [])
    return (
        <>
            <div className={styles["left-header-search"]}>
                <div className={styles["header-type-wrapper"]}>
                    <span className={styles["header-text"]}>扫描规则</span>
                </div>
                {inViewport && (
                    <div className={styles["header-filter-search"]}>
                        <YakitInput.Search
                            value={keywords}
                            onChange={(e) => setKeywords(e.target.value)}
                            placeholder='请输入关键字搜索'
                            onSearch={onSearch}
                            onPressEnter={onPressEnter}
                        />
                    </div>
                )}
            </div>
            <div
                className={classNames(styles["code-scan-group-wrapper"])}
                style={{height: inViewport ? "100%" : "0px"}}
            >
                <div className={styles["filter-wrapper"]}>
                    <div className={styles["header-filter-tag"]}>
                        <YakitPopover
                            overlayClassName={styles["code-scan-rule-group-popover"]}
                            content={
                                <div className={styles["code-scan-rule-list-filter"]}>
                                    {groupList.map((item) => {
                                        return (
                                            <div
                                                className={styles["code-scan-rule-list-group-item"]}
                                                key={item.GroupName}
                                                onClick={() => onSelectGroup(item)}
                                            >
                                                <div
                                                    className={classNames(
                                                        styles["name"],
                                                        "yakit-content-single-ellipsis"
                                                    )}
                                                >
                                                    {item.GroupName}
                                                </div>
                                                <div className={styles["count"]}>{item.Count}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            }
                            trigger='hover'
                            visible={groupTagShow}
                            onVisibleChange={setGroupTagShow}
                            placement='bottom'
                        >
                            <div
                                className={classNames(styles["tag-total"], {
                                    [styles["tag-total-active"]]: groupTagShow
                                })}
                            >
                                <FolderOpenIcon />
                                <span>
                                    规则组 <span className={styles["total-style"]}>{groupList.length}</span>
                                </span>
                                {(groupTagShow && <ChevronUpIcon className={styles["chevron-down"]} />) || (
                                    <ChevronDownIcon className={styles["chevron-down"]} />
                                )}
                            </div>
                        </YakitPopover>
                    </div>

                    <div className={styles["filter-body"]} style={{padding: "0px 8px 0px 7px"}}>
                        <div className={styles["filter-body-left"]}>
                            <YakitCheckbox indeterminate={indeterminate} checked={checked} onChange={onSelectAll}>
                                全选
                            </YakitCheckbox>
                            <span className={styles["count-num"]}>
                                Total<span className={styles["num-style"]}>{response.Total}</span>
                            </span>
                            <Divider type='vertical' style={{margin: "0 4px"}} />
                            <span className={styles["count-num"]}>
                                Selected
                                <span className={styles["num-style"]}>
                                    {checked ? response.Total : selectedRules.length}
                                </span>
                            </span>
                        </div>
                        <div className={styles["filter-body-right"]}>
                            <YakitCheckbox
                                checked={filterLibRuleKind !== "noLib"}
                                onChange={(e) => onFilterLibRuleKindChange(e.target.checked ? "" : "noLib")}
                            >
                                包含Lib规则
                            </YakitCheckbox>
                            <YakitButton type='text' danger onClick={onClearSelect}>
                                清空
                            </YakitButton>
                        </div>
                    </div>
                    {selectGroup.length > 0 && (
                        <div className={styles["code-scan-rule-group-query-show"]}>
                            {selectGroup.map((i) => {
                                return (
                                    <YakitTag
                                        key={i}
                                        style={{marginBottom: 2}}
                                        onClose={() => onCloseTag(i)}
                                        closable={true}
                                    >
                                        <FolderOpenIcon className={styles["folder-icon"]} />
                                        <span
                                            className={classNames(
                                                styles["code-scan-rule-group-name"],
                                                "content-ellipsis"
                                            )}
                                        >
                                            {i}
                                        </span>
                                    </YakitTag>
                                )
                            })}
                        </div>
                    )}
                </div>
                <CodeScanByGroup
                    hidden={false}
                    response={response}
                    setResponse={setResponse}
                    filterLibRuleKind={filterLibRuleKind}
                    selectedRules={selectedRules}
                    setSelectedRules={setSelectedRules}
                    allCheck={allCheck}
                    setAllCheck={setAllCheck}
                    selectGroup={selectGroup}
                    keywords={keywords}
                    isRefresh={isRefresh}
                />
            </div>
        </>
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

    const [codeScanTabs, setCodeScanTabs] = useState<Array<CodeScanTabsItem>>([
        {
            key: "group",
            label: <>按组选</>,
            contShow: true // 初始为true
        },
        {
            key: "keyword",
            label: <>按关键词</>,
            contShow: false
        }
    ])
    const [type, setType] = useState<"keyword" | "group">("group")
    const handleTabClick = useMemoizedFn((item: CodeScanTabsItem) => {
        const contShow = !item.contShow
        codeScanTabs.forEach((i) => {
            if (i.key === item.key) {
                i.contShow = contShow
            } else {
                i.contShow = false
            }
        })
        setCodeScanTabs([...codeScanTabs])
        setHidden(!codeScanTabs.some((item) => item.contShow))
        setType(item.key)
    })

    const handleTabHidden = useMemoizedFn((isHidden: boolean) => {
        if (isHidden) {
            codeScanTabs.forEach((i) => {
                i.contShow = false
            })
            setCodeScanTabs([...codeScanTabs])
        } else {
            codeScanTabs.forEach((i) => {
                if (i.key === type) {
                    i.contShow = true
                } else {
                    i.contShow = false
                }
            })
            setCodeScanTabs([...codeScanTabs])
        }
        setHidden(isHidden)
    })

    const [filterLibRuleKind, setFilterLibRuleKind] = useState<"" | "noLib">("noLib")

    return (
        <div className={styles["yakrunner-codec-scan"]} id={`yakrunner-code-scan-${pageId}`}>
            {/* 左侧边栏 */}
            <div className={styles["code-scan-tab-wrap"]}>
                <div className={styles["code-scan-tab"]}>
                    {codeScanTabs.map((item) => (
                        <div
                            className={classNames(styles["code-scan-tab-item"], {
                                [styles["code-scan-tab-item-active"]]: type === item.key,
                                [styles["code-scan-tab-item-unshowCont"]]: type === item.key && !item.contShow
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
            </div>

            <div
                className={classNames(styles["left-wrapper"], {
                    [styles["left-wrapper-hidden"]]: hidden
                })}
            >
                <CodeScanRuleByKeyWord
                    inViewport={type === "keyword"}
                    filterLibRuleKind={filterLibRuleKind}
                    setFilterLibRuleKind={setFilterLibRuleKind}
                    pageInfo={pageInfo}
                    setPageInfo={setPageInfo}
                    handleTabClick={handleTabClick}
                />

                <CodeScanRuleByGroup inViewport={type === "group"} pageInfo={pageInfo} setPageInfo={setPageInfo} />
            </div>
            <CodeScanExecuteContent
                hidden={hidden}
                setHidden={handleTabHidden}
                pageInfo={pageInfo}
                setPageInfo={setPageInfo}
                pageId={pageId}
                filterLibRuleKind={filterLibRuleKind}
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
    const {hidden, filterLibRuleKind, allCheck, setAllCheck, selectGroup, keywords, isRefresh} = props
    const isLoadingRef = useRef<boolean>(true)
    const [response, setResponse] = useControllableValue<QuerySyntaxFlowRuleResponse>(props, {
        defaultValue: initialLocalState,
        valuePropName: "response",
        trigger: "setResponse"
    })
    const [loading, setLoading] = useState<boolean>(false)
    const [hasMore, setHasMore] = useState<boolean>(true)
    const [selectedRules, setSelectedRules] = useControllableValue<SyntaxFlowRule[]>(props, {
        defaultValue: [],
        valuePropName: "selectedRules",
        trigger: "setSelectedRules"
    })
    useEffect(() => {
        fetchList(true)
    }, [filterLibRuleKind, selectGroup, keywords, isRefresh])

    const fetchList = useDebounceFn(
        useMemoizedFn(async (reset?: boolean) => {
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
                    GroupNames: selectGroup,
                    Severity: [],
                    Purpose: [],
                    Tag: [],
                    Keyword: keywords,
                    FilterLibRuleKind: filterLibRuleKind
                },
                Pagination: {
                    Limit: params?.Limit || 10,
                    Page: params?.Page || 1,
                    OrderBy: "updated_at",
                    Order: "desc"
                }
            }

            try {
                const res = await grpcFetchLocalRuleList(query)
                if (!res.Rule) res.Rule = []
                const length = +res.Pagination.Page === 1 ? res.Rule.length : res.Rule.length + response.Rule.length
                setHasMore(length < +res.Total)
                if (!reset && allCheck) {
                    setSelectedRules((prev) => [...prev, ...response.Rule])
                }
                setResponse({
                    Pagination: res.Pagination,
                    Rule: response && !reset ? [...response.Rule, ...res.Rule] : res.Rule,
                    Total: res.Total
                })
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

    // 规则选择
    const onCheck = useMemoizedFn((checked: boolean, rule: SyntaxFlowRule) => {
        if (checked) {
            setSelectedRules((prev) => [...prev, rule])
        } else {
            setSelectedRules((prev) => prev.filter((r) => r.Hash !== rule.Hash))
        }
        setAllCheck(false)
    })
    return (
        <div
            className={classNames(styles["code-scan-by-group-wrapper"], {
                [styles["code-scan-by-group-wrapper-hidden"]]: hidden
            })}
        >
            <RollingLoadList<SyntaxFlowRule>
                data={response.Rule}
                loadMoreData={onUpdateList}
                renderRow={(info: SyntaxFlowRule, i: number) => {
                    let check = allCheck || selectedRules.some((rule) => rule.Hash === info.Hash)
                    return <FlowRuleDetailsListItem data={info} check={check} onCheck={onCheck} />
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
        </div>
    )
})

const CodeScanByExecute: React.FC<CodeScanByExecuteProps> = React.memo((props) => {
    const {data} = props
    const [recalculation, setRecalculation] = useState<boolean>(false)
    useUpdateEffect(() => {
        setRecalculation(!recalculation)
    }, [data])
    return (
        <div className={classNames(styles["code-scan-by-execute-wrapper"])}>
            {data.length === 0 ? (
                <YakitEmpty title='暂无更多执行规则' style={{paddingTop: 48}} />
            ) : (
                <RollingLoadList<SyntaxFlowScanActiveTaskShow>
                    data={data}
                    recalculation={recalculation}
                    loadMoreData={() => {}}
                    renderRow={(info: SyntaxFlowScanActiveTaskShow) => {
                        const m = moment(info.RunningTime * 1000)
                        // 计算分钟、秒
                        const minutes = m.minutes()
                        const seconds = m.seconds()
                        const time = `${minutes === 0 ? "" : minutes + "分"}${seconds}秒`
                        return (
                            <>
                                <span className={classNames(styles["name"], "content-ellipsis")}>
                                    规则名: {info.RuleName}
                                </span>
                                <span className='content-ellipsis'>项目名 : {info.ProgramName}</span>
                                <span className='content-ellipsis'>Info : {info.Info}</span>
                                <span className={styles["footer"]}>
                                    <span
                                        className={classNames(styles["progress"], {
                                            [styles["progress-gray"]]: info.Progress === 1
                                        })}
                                    >
                                        执行进度: {Math.round(info.Progress * 100)}%
                                    </span>
                                    <span className={classNames(styles["time"])}>{time}</span>
                                </span>
                            </>
                        )
                    }}
                    page={1}
                    hasMore={false}
                    loading={false}
                    defItemHeight={128}
                    rowKey='id'
                    classNameRow={styles["code-scan-by-execute-item"]}
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
    const {pageId, filterLibRuleKind, hidden, setHidden} = props
    /** 子组件方法传递给父组件 */
    const codeScanExecuteContentRef = useRef<CodeScanExecuteContentRefProps>(null)
    const [pageInfo, setPageInfo] = useControllableValue<CodeScanPageInfoProps>(props, {
        defaultValue: {
            ...clearRuleByPageInfo
        },
        valuePropName: "pageInfo",
        trigger: "setPageInfo"
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

    const [executeType, setExecuteType] = useState<"new" | "old">("old")
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

    const [auditCodeList, setAuditCodeList] = useState<
        {label: string; value: number; Language: string; JSONStringConfig: string}[]
    >([])
    const [selectProjectId, setSelectProjectId] = useState<number[]>([])
    const getAduitList = useMemoizedFn(async () => {
        try {
            // QuerySSAProject
            ipcRenderer
                .invoke("QuerySSAProject", {
                    Pagination: {
                        ...genDefaultPagination(500),
                        Order: "asc",
                        OrderBy: "created_at"
                    }
                })
                .then((item: QueryGeneralResponse<SSAProjectResponse>) => {
                    item.Data = (item as any)?.Projects || []
                    if (item.Data.length > 0) {
                        let projectId: number[] = []
                        const list = item.Data.map((item) => {
                            const {ProjectName, ID, Language, JSONStringConfig} = item
                            if (pageInfo.projectId === ID) {
                                projectId.push(ID)
                            }
                            return {label: ProjectName, value: ID, Language, JSONStringConfig}
                        })
                        setAuditCodeList(list)
                        setSelectProjectId(projectId)
                    }
                })
        } catch (error) {}
    })

    useEffect(() => {
        getAduitList()
    }, [])

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

    const [ActiveTask, setActiveTask] = useState<SyntaxFlowScanActiveTask[]>([])
    const CodeScanByExecuteLastDataRef = useRef<SyntaxFlowScanActiveTaskShow[]>([])
    // 合并两个数组，依据id进行合并，如若存在则更新
    const mergeArraysById = useMemoizedFn(
        (arr1: SyntaxFlowScanActiveTaskShow[], arr2: SyntaxFlowScanActiveTaskShow[]) => {
            const map = new Map(arr1.map((item) => [item.id, {...item}]))
            for (const obj of arr2) {
                const existing = map.get(obj.id)
                if (existing) {
                    Object.assign(existing, obj)
                } else {
                    map.set(obj.id, {...obj})
                }
            }
            return Array.from(map.values())
        }
    )
    // 将 Progress===1 的项移动到数组末尾，且保持顺序不变
    const moveProgressToEndStable = useMemoizedFn((arr) => {
        // 找到最后一段连续的 Progress===1 的起始索引
        let lastIndex = arr.length - 1
        while (lastIndex >= 0 && arr[lastIndex].Progress === 1) {
            lastIndex--
        }

        const beforeTail = arr.slice(0, lastIndex + 1)
        const tailOnes = arr.slice(lastIndex + 1)

        // 从前面部分分离出 Progress===1 的项
        const toMove = beforeTail.filter((item) => item.Progress === 1)
        const remain = beforeTail.filter((item) => item.Progress !== 1)

        // 保证顺序：非1项 → 尾部已有1项 → 要移动的1项
        return [...remain, ...tailOnes, ...toMove]
    })
    const CodeScanByExecuteData = useCreation(() => {
        const data: SyntaxFlowScanActiveTaskShow[] = ActiveTask.map((item) => {
            return {
                ...item,
                id: `${item.RuleName}-${item.ProgramName}`
            }
        })
        const newData = mergeArraysById(CodeScanByExecuteLastDataRef.current || [], data)
        const sortedData = moveProgressToEndStable(newData)
        CodeScanByExecuteLastDataRef.current = sortedData
        return sortedData
    }, [ActiveTask])

    const onRemove = useMemoizedFn(() => {
        setPageInfo((prev) => ({
            ...prev,
            ...clearRuleByPageInfo
        }))
    })

    const onSetProgressFun = useThrottleFn(
        (data?: {type: "new" | "old"; progress: number}) => {
            setProgressShow(data)
        },
        {wait: 500}
    ).run
    return (
        <>
            {executeStatus !== "default" && CodeScanByExecuteData.length > 0 && (
                <div className={styles["midden-wrapper"]}>
                    <div className={styles["midden-heard"]}>
                        <span className={styles["header-text"]}>规则执行</span>
                    </div>
                    <CodeScanByExecute data={CodeScanByExecuteData} />
                </div>
            )}
            <div className={styles["code-scan-execute-wrapper"]}>
                <ExpandAndRetract isExpand={isExpand} onExpand={onExpand} status={executeStatus}>
                    <div className={styles["code-scan-executor-title"]}>
                        <span className={styles["code-scan-executor-title-text"]}>规则执行</span>
                        {(pageInfo.selectTotal || 0) > 0 && (
                            <YakitTag closable onClose={onRemove} color='info'>
                                {pageInfo.selectTotal}
                            </YakitTag>
                        )}
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
                        setProgressShow={onSetProgressFun}
                        executeStatus={executeStatus}
                        setExecuteStatus={onSetExecuteStatus}
                        filterLibRuleKind={filterLibRuleKind}
                        setHidden={setHidden}
                        auditCodeList={auditCodeList}
                        getAduitList={getAduitList}
                        executeType={executeType}
                        setExecuteType={setExecuteType}
                        isAuditExecuting={isAuditExecuting}
                        setAuditsExecuting={setAuditsExecuting}
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
                        setActiveTask={setActiveTask}
                        CodeScanByExecuteLastDataRef={CodeScanByExecuteLastDataRef}
                        selectProjectId={selectProjectId}
                        setSelectProjectId={setSelectProjectId}
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
            filterLibRuleKind,
            setProgressShow,
            auditCodeList,
            getAduitList,
            executeType,
            setExecuteType,
            pageInfo,
            pageId,
            setPageInfo,
            setExtraParamsVisible,
            extraParamsValue,
            setActiveTask,
            CodeScanByExecuteLastDataRef
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
            const {projectId, historyName, codeScanMode, runtimeId} = pageInfo
            if (projectId) {
                setExecuteType("old")
                form.setFieldsValue({
                    project: projectId,
                    history: historyName
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
                    GroupNames: pageInfo.GroupNames || [],
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
        /**项目列表-执行状态 */
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
            const projectItem = auditCodeList.find((item) => item.value === pageInfo.projectId)
            const projectName = pageInfo?.projectName || projectItem?.label
            
            if (projectName) {
                reportName = `${projectName}代码扫描报告`
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
                    if (!!res?.ActiveTask && res.ActiveTask.length > 0) {
                        setActiveTask(res.ActiveTask)
                    }
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

        const [JSONStringConfig, setJSONStringConfig] = useState<string>()
        const SyntaxFlowScanParamsRef = useRef<SyntaxFlowScanRequest>()
        const onSyntaxFlowScan = useMemoizedFn(async () => {
            if (!SyntaxFlowScanParamsRef.current) {
                failed("获取扫描参数失败，请重试")
                return
            }
            apiSyntaxFlowScan(SyntaxFlowScanParamsRef.current, token).then(() => {
                pageInfoCacheRef.current = {
                    ...pageInfo,
                    projectId: SyntaxFlowScanParamsRef.current?.SSAProjectId,
                    historyName: SyntaxFlowScanParamsRef.current?.ProgramName
                }
                setIsExpand(false)
                setExecuteStatus("process")
                resetStreamInfo()
                if (setHidden) setHidden(true)
            })
        })

        /**开始执行 */
        const onStartExecute = useMemoizedFn(async (value, isSetForm?: boolean) => {
            if ((pageInfo.selectTotal || 0) === 0) {
                warn("请选择扫描规则")
                return
            }
            const {project, history} = value
            if (!project) {
                warn("请输入项目名称")
                return
            }
            // 设置表单
            if (isSetForm) {
                getAduitList()
                form.setFieldsValue({project})
            }

            // 清空已展示的规则执行数据
            CodeScanByExecuteLastDataRef.current = []
            setActiveTask([])
            const params: SyntaxFlowScanRequest = {
                ...extraParamsValue,
                ControlMode: "start",
                SSAProjectId: project,
                ProgramName: history === "recompileAndScan" || !history ? [] : [history],
                Filter: {
                    RuleNames: [],
                    Language: [],
                    GroupNames: pageInfo.GroupNames || [],
                    Severity: [],
                    Purpose: [],
                    Tag: [],
                    Keyword: pageInfo.Keyword || "",
                    FilterLibRuleKind: filterLibRuleKind,
                    Ids: pageInfo.RuleIds || []
                }
            }
            SyntaxFlowScanParamsRef.current = params
            // 先执行编译再扫描
            if (history === "recompileAndScan") {
                const JSONStringConfig = auditCodeList.find((item) => item.value === project)?.JSONStringConfig
                if (!JSONStringConfig) {
                    failed("未找到对应项目编译配置，请重试")
                    return
                }
                setJSONStringConfig(JSONStringConfig)
            }
            // 直接扫描
            else {
                onSyntaxFlowScan()
            }
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
                    GroupNames: pageInfo.GroupNames || [],
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
                        GroupNames: pageInfo.GroupNames || [],
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

        const [selectProjectId, setSelectProjectId] = useControllableValue<number[]>(props, {
            defaultValue: [],
            valuePropName: "selectProjectId",
            trigger: "setSelectProjectId"
        })
        const [compileHistoryList, setCompileHistoryList] = useState<{label: string; value: string}[]>([])
        const isSelectProjectRef = useRef<boolean>(false)
        const getCompileHistoryList = useMemoizedFn(async (ProjectIds: number[]) => {
            const finalParams: QuerySSAProgramRequest = {
                Filter: {
                    ProjectIds
                },
                Pagination: {...genDefaultPagination(500), OrderBy: "created_at"}
            }
            let newCompileHistoryList: {label: string; value: string}[] = []
            apiQuerySSAPrograms(finalParams)
                .then((res) => {
                    newCompileHistoryList = res.Data.map((item) => {
                        return {
                            label: formatTimestamp(item.UpdateAt),
                            value: item.Name
                        }
                    })
                    newCompileHistoryList.unshift({label: "编译并扫描最新代码", value: "recompileAndScan"})
                    setCompileHistoryList(newCompileHistoryList)
                })
                .finally(() => {
                    if (isSelectProjectRef.current) {
                        isSelectProjectRef.current = false
                        if (newCompileHistoryList.length > 1) {
                            form.setFieldsValue({
                                history: newCompileHistoryList[1].value
                            })
                        } else {
                            form.setFieldsValue({
                                history: "recompileAndScan"
                            })
                        }
                    }
                })
        })

        useUpdateEffect(() => {
            if (selectProjectId.length === 0) {
                setCompileHistoryList([])
                return
            }
            getCompileHistoryList(selectProjectId)
        }, [selectProjectId])

        const onSelectProject = useMemoizedFn(async (item: number) => {
            try {
                let selectGroup = pageInfo.GroupNames ? [...pageInfo.GroupNames] : []

                let language = auditCodeList.find((itemIn) => itemIn.value === item)?.Language
                if (language) {
                    selectGroup.push(language)
                    selectGroup.push("general")
                }

                const newSelectGroup = filter(selectGroup)
                const selectTotal = await getGroupNamesTotal(newSelectGroup)
                setPageInfo({
                    ...pageInfo,
                    ...clearRuleByPageInfo,
                    GroupNames: newSelectGroup,
                    selectTotal
                })
                isSelectProjectRef.current = true
                setSelectProjectId(item ? [item] : [])
                emiter.emit("onResetCodeScanProject")
            } catch (error) {}
        })

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
                                        label: "项目列表"
                                    }
                                ]}
                            />
                        </Col>
                    </Row>
                    {executeType === "new" ? (
                        <CodeScanAuditExecuteForm
                            ref={codeScanAuditExecuteRef}
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
                            pageInfo={pageInfo}
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
                                    allowClear
                                    showSearch
                                    placeholder='请选择项目名称'
                                    options={auditCodeList}
                                    onChange={onSelectProject}
                                />
                            </Form.Item>

                            <Form.Item label='编译历史' name='history'>
                                <YakitSelect
                                    allowClear
                                    showSearch
                                    placeholder='请选择编译历史'
                                    options={compileHistoryList}
                                    disabled={compileHistoryList.length === 0}
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
                        // 后端建议没有则传任意数字填充
                        runtimeId={runtimeId || "1111111111"}
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

                <AfreshAuditModal
                    nameOrConfig={JSONStringConfig}
                    setNameOrConfig={setJSONStringConfig}
                    onSuccee={onSyntaxFlowScan}
                    warrpId={document.getElementById(`yakrunner-code-scan-${pageId}`)}
                    type='compile'
                />
            </>
        )
    })
)

const CodeScanAuditExecuteForm: React.FC<CodeScanAuditExecuteFormProps> = React.memo(
    forwardRef((props, ref) => {
        const {
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
            openExtraPropsDrawer,
            pageInfo
        } = props
        const [form] = Form.useForm()
        // 是否表单校验中
        const [isVerifyForm, setVerifyForm] = useState<boolean>(false)
        const [activeKey, setActiveKey] = useState<string | string[]>()
        const [agentConfigModalVisible, setAgentConfigModalVisible] = useState<boolean>(false)
        // 由于此流还包含表单校验功能 因此需判断校验是否通过，是否已经真正的执行了
        const isRealStartRef = useRef<boolean>(false)
        const {t, i18n} = useI18nNamespaces(["mitm"])
        const {
            proxyConfig: {Endpoints = []},
            proxyPointsOptions,
            checkProxyEndpoints
        } = useProxy()

        /** 选填参数 */
        const groupParams = useMemo(() => {
            const arr =
                plugin?.Params.filter(
                    (item) => !item.Required && (item.Group || "").length > 0 && item.Group !== "significant"
                ) || []
            return ParamsToGroupByGroupName(arr)
        }, [plugin?.Params])

        /** 填充表单默认值 */
        const handleInitFormValue = useMemoizedFn((arr: YakParamProps[]) => {
            // 表单内数据
            let formData = {}
            if (form) formData = form.getFieldsValue() || {}
            let defaultValue = {...formData}
            let newFormValue = {}
            arr.forEach((ele) => {
                let initValue = formData[ele.Field] || ele.Value || ele.DefaultValue
                let value = getValueByType(initValue, ele.TypeVerbose)
                newFormValue = {
                    ...newFormValue,
                    [ele.Field]: value
                }
            })
            let fieldsValue = {...cloneDeep(defaultValue || {}), ...newFormValue}
            // compile-immediately 特例处理（应后端要求）
            if ((plugin?.Params || []).filter((item) => item.Field === "compile-immediately").length > 0) {
                fieldsValue["compile-immediately"] = true
            }
            form.setFieldsValue(fieldsValue)
        })

        /** 选填参数（无需折叠） */
        const groupParamsShow = useMemo(() => {
            const arr =
                plugin?.Params.filter(
                    (item) => !item.Required && (item.Group || "").length > 0 && item.Group === "significant"
                ) || []
            return ParamsToGroupByGroupName(arr)
        }, [plugin?.Params])

        /** 必填参数（头部展示） */
        const groupParamsHeader = useMemo(() => {
            const arr = plugin?.Params.filter((item) => item.Required && (item.Group || "").length > 0) || []
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
        const projectIdCacheRef = useRef<number>()
        const jsonCacheRef = useRef<string>("")

        // 执行审计
        const onStartAudit = useMemoizedFn((requestParams: DebugPluginRequest) => {
            setAuditError(false)
            debugPluginStreamEvent.reset()
            debugCompilePluginStreamEvent.reset()
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

        const tokenCompileRef = useRef<string>(randomString(40))
        const [streamCompileInfo, debugCompilePluginStreamEvent] = useHoldGRPCStream({
            taskName: "debug-plugin",
            apiKey: "DebugPlugin",
            token: tokenCompileRef.current,
            onEnd: (getStreamInfo) => {
                debugCompilePluginStreamEvent.stop()
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
                yakitNotify("info", `Compile调试任务启动成功，运行时 ID: ${rId}`)
            }
        })
        // 通过插件（SSA 项目编译）执行
        const onCompileByPlugin = useMemoizedFn(() => {
            const requestParams: DebugPluginRequest = {
                Code: "",
                PluginType: "yak",
                Input: "",
                HTTPRequestTemplate: {} as HTTPRequestBuilderParams,
                ExecParams: [
                    {
                        Key: "config",
                        Value: jsonCacheRef.current
                    }
                ],
                PluginName: "SSA 项目编译"
            }
            apiDebugPlugin({params: requestParams, token: tokenCompileRef.current})
                .then(() => {
                    isStartExecuteRef.current = false
                    debugCompilePluginStreamEvent.start()
                })
                .catch(() => {})
        })

        const isStartExecuteRef = useRef<boolean>(false)
        useUpdateEffect(() => {
            // 插件执行 SSA 项目编译
            const progress =
                Math.floor((streamCompileInfo.progressState.map((item) => item.progress)[0] || 0) * 100) / 100
            // 当任务结束时 跳转打开编译列表
            if (progress === 1) {
                setTimeout(() => {
                    if (projectIdCacheRef.current) {
                        isStartExecuteRef.current = true
                        setExecuteType("old")
                        onStartExecute(
                            {
                                project: projectIdCacheRef.current
                            },
                            true
                        )
                    } else {
                        failed("项目名获取失败")
                    }
                }, 300)
            }

            let newLog = streamCompileInfo.logState.slice(0, 100).map((item) => ({
                type: "log",
                content: item
            }))
            pushNewLogs(newLog)

            setProgressShow({
                type: "new",
                progress: progress
            })
        }, [streamCompileInfo])

        const onCreateSSAProject = useMemoizedFn(async (JSONStringConfig) => {
            return new Promise((resolve, reject) => {
                ipcRenderer
                    .invoke("CreateSSAProject", {
                        JSONStringConfig
                    })
                    .then((res: CreateSSAProjectResponse) => {
                        projectIdCacheRef.current = res.Project.ID
                        jsonCacheRef.current = res.Project.JSONStringConfig
                        resolve(null)
                    })
                    .catch((error) => {
                        yakitNotify("error", "创建项目管理数据失败")
                        reject(error)
                    })
            })
        })

        const onStreamInfoFun = useMemoizedFn(async (newStreamInfo: HoldGRPCStreamInfo) => {
            // 此处为真正的启动
            if (!isRealStartRef.current) {
                const startLog = newStreamInfo.logState.find((item) => item.level === "code")
                if (startLog && startLog.data) {
                    try {
                        const verifyStart = JSON.parse(startLog?.data) as VerifyStartProps
                        const {kind, msg} = verifyStart.error
                        setVerifyForm(false)
                        // CreateSSAProject 创建项目管理数据
                        projectIdCacheRef.current = verifyStart?.BaseInfo?.project_id
                        jsonCacheRef.current = startLog?.data || ""

                        if (verifyStart?.project_exists === false) {
                            await onCreateSSAProject(startLog?.data || "")
                        }

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
                                onCompileByPlugin()
                                break
                        }
                    } catch (error) {
                        failed("启动解析失败")
                    }
                }
            }
        })

        useUpdateEffect(() => {
            onStreamInfoFun(streamInfo)
        }, [streamInfo])

        const onStartAuditFun = useMemoizedFn(async (value) => {
            if ((pageInfo.selectTotal || 0) === 0) {
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
            //如果有新增的代理配置 则存配置项
            checkProxyEndpoints(value.proxy)
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

        const onClickDownstreamProxy = useMemoizedFn(async () => {
            try {
                const versionValid = await checkProxyVersion()
                if (!versionValid) {
                    return
                }
                setAgentConfigModalVisible(true)
            } catch (error) {
                console.error("error:", error)
            }
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
                            cacheFilePathKey='CodeScan_File_Path'
                            cacheFolderPathKey='CodeScan_Folder_Path'
                        />
                    </Form.Item>

                    {groupParamsHeader.length > 0 && (
                        <>
                            {groupParamsHeader.map((item, index) => (
                                <React.Fragment key={item.group}>
                                    {item.data?.map((formItem) => (
                                        <React.Fragment key={formItem.Field + formItem.FieldVerbose}>
                                            <FormContentItemByType item={formItem} pluginType={"yak"} />
                                        </React.Fragment>
                                    ))}
                                </React.Fragment>
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
                            </Col>
                            <Col span={24}>
                                {groupParamsShow.length > 0 && (
                                    <>
                                        {groupParamsShow.map((item) => (
                                            <React.Fragment key={item.group}>
                                                {item.data?.map((formItem) => (
                                                    <React.Fragment key={formItem.Field + formItem.FieldVerbose}>
                                                        <FormContentItemByType item={formItem} pluginType={"yak"} />
                                                    </React.Fragment>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </>
                                )}
                            </Col>
                            <Col span={18}>
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
                                                <>
                                                <div
                                                    className={styles["agent-down-stream-proxy"]}
                                                    onClick={onClickDownstreamProxy}
                                                >
                                                    {t("AgentConfigModal.proxy_configuration")}
                                                </div>
                                                    <Divider type="vertical" />
                                                    <ProxyTest onEchoNode={(proxy)=>form.setFieldsValue({proxy})}/>
                                                </>
                                            }
                                            validateTrigger={["onChange", "onBlur"]}
                                            rules={[
                                                {
                                                    validator: (_, value) => {
                                                        if (!value || !Array.isArray(value) || value.length === 0) {
                                                            return Promise.resolve()
                                                        }
                                                        // 获取当前options中的所有值
                                                        const existingOptions = Endpoints.map(({Id}) => Id)
                                                        // 只校验新输入的值(不在options中的值)
                                                        const newValues = value.filter((v) => !existingOptions.includes(v))
                                                        // 校验代理地址格式: 协议://地址:端口
                                                        for (const v of newValues) {
                                                            if (!isValidUrlWithProtocol(v)) {
                                                                return Promise.reject(t("ProxyConfig.valid_proxy_address_tip"))
                                                            }
                                                        }
                                                        return Promise.resolve()
                                                    }
                                                }
                                            ]}
                                        >
                                            <YakitSelect
                                                allowClear
                                                options={proxyPointsOptions}
                                                mode='tags'
                                                placeholder={t("ProxyConfig.example_proxy_address")}
                                            />
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
                <ProxyRulesConfig
                    hideRules
                    visible={agentConfigModalVisible}
                    onClose={() => setAgentConfigModalVisible(false)}
                />
            </div>
        )
    })
)

/**@name 代码扫描中规则列表的item */
export const FlowRuleDetailsListItem: React.FC<FlowRuleDetailsListItemProps> = React.memo((props) => {
    const {data, check, onCheck} = props
    return (
        <div className={styles["flow-rule-item-wrapper"]}>
            <div className={styles["flow-rule-item"]}>
                <YakitCheckbox
                    checked={check}
                    onClick={(e) => {
                        e.stopPropagation()
                    }}
                    onChange={(e) => onCheck(e.target.checked, data)}
                />
                <div className={styles["flow-rule-item-info"]}>
                    <div
                        className={classNames(
                            styles["flow-rule-item-info-text-style"],
                            "yakit-content-single-ellipsis"
                        )}
                    >
                        {data.RuleName}
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
