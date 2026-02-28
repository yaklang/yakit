import React, {useEffect, useMemo, useRef, useState} from "react"
import {
    QueryRisksRequest,
    QueryRisksResponse,
    YakitCodeScanRiskDetailsProps,
    YakitRiskDetailContentProps,
    YakitRiskDetailsProps,
    YakitRiskSelectTagProps,
    YakitRiskTableProps,
    YakURLDataItemProps
} from "./YakitRiskTableType"
import styles from "./YakitRiskTable.module.scss"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {PacketHistory, Risk} from "../schema"
import {Badge, CollapseProps, Descriptions, Divider, Form, Tooltip, Typography} from "antd"
import {YakScript, genDefaultPagination} from "@/pages/invoker/schema"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    useControllableValue,
    useCreation,
    useDebounceEffect,
    useDebounceFn,
    useInViewport,
    useInterval,
    useMemoizedFn
} from "ahooks"
import {YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {
    OutlineChevrondownIcon,
    OutlineChevronleftIcon,
    OutlineChevronrightIcon,
    OutlineClockIcon,
    OutlineExportIcon,
    OutlineEyeIcon,
    OutlineOpenIcon,
    OutlinePlayIcon,
    OutlineRefreshIcon,
    OutlineSearchIcon,
    OutlineTerminalIcon,
    OutlineTrashIcon,
    OutlineUploadIcon
} from "@/assets/icon/outline"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import cloneDeep from "lodash/cloneDeep"
import {formatTimestamp} from "@/utils/timeUtil"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {
    DeleteRiskRequest,
    ExportHtmlProps,
    FieldGroup,
    SetTagForRiskRequest,
    UploadRiskToOnlineRequest,
    apiDeleteRisk,
    apiExportHtml,
    apiNewRiskRead,
    apiQueryAvailableRiskType,
    apiQueryRiskTags,
    apiQueryRisks,
    apiQueryRisksIncrementOrderDesc,
    apiRiskFeedbackToOnline,
    apiSetTagForRisk
} from "./utils"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {YakitResizeBox, YakitResizeBoxProps} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import classNames from "classnames"
import {
    IconSolidInfoRiskIcon,
    IconSolidLowRiskIcon,
    IconSolidMediumRiskIcon,
    IconSolidHighRiskIcon,
    IconSolidSeriousIcon,
    IconSolidDefaultRiskIcon
} from "../icon"
import {NewHTTPPacketEditor} from "@/utils/editors"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {ExportSelect} from "@/components/DataExport/DataExport"
import {RemoteGV} from "@/yakitGV"
import {getHtmlEnTemplate, getHtmlTemplate} from "./htmlTemplate"
import {yakitNotify} from "@/utils/notification"
import moment from "moment"
import {FieldName} from "../RiskTable"
import {defQueryRisksRequest} from "./constants"
import emiter from "@/utils/eventBus/eventBus"
import {FuncBtn} from "@/pages/plugins/funcTemplate"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {YakitRoute} from "@/enums/yakitRoute"
import {
    AuditCodePageInfoProps,
    PluginHubPageInfoProps,
    RuleManagementPageInfoProps,
    usePageInfo
} from "@/store/pageInfo"
import {grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"
import ReactResizeDetector from "react-resize-detector"
import {serverPushStatus} from "@/utils/duplex/duplex"
import useListenWidth from "@/pages/pluginHub/hooks/useListenWidth"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {loadAuditFromYakURLRaw} from "@/pages/yakRunnerAuditCode/utils"
import {AuditEmiterYakUrlProps, OpenFileByPathProps} from "@/pages/yakRunnerAuditCode/YakRunnerAuditCodeType"
import {CollapseList} from "@/pages/yakRunner/CollapseList/CollapseList"
import {YakCodemirror} from "@/components/yakCodemirror/YakCodemirror"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {SSARisk} from "@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType"
import {getRemoteValue} from "@/utils/kv"
import {NoPromptHint} from "@/pages/pluginHub/utilsUI/UtilsTemplate"
import {RemoteRiskGV} from "@/enums/risk"
import {useStore} from "@/store"
import {minWinSendToChildWin, openRiskNewWindow} from "@/utils/openWebsite"
import {CodeRangeProps} from "@/pages/yakRunnerAuditCode/RightAuditDetail/RightAuditDetail"
import {JumpToAuditEditorProps} from "@/pages/yakRunnerAuditCode/BottomEditorDetails/BottomEditorDetailsType"
import {Selection} from "@/pages/yakRunnerAuditCode/RunnerTabs/RunnerTabsType"
import {getNameByPath} from "@/pages/yakRunner/utils"
import {shallow} from "zustand/shallow"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {SafeMarkdown} from "@/pages/assetViewer/reportRenders/markdownRender"
import {HTTPFlow} from "@/components/HTTPFlowTable/HTTPFlowTable"

const {ipcRenderer} = window.require("electron")

export const isShowCodeScanDetail = (selectItem: Risk) => {
    const {ResultID, SyntaxFlowVariable, ProgramName} = selectItem
    if (ResultID && SyntaxFlowVariable && ProgramName) {
        return true
    }
    return false
}

const batchExportMenuData: (t: (text: string) => string) => YakitMenuItemProps[] = (t) => {
    return [
        {
            key: "export-csv",
            label: t("YakitRiskTable.export_csv")
        },
        {
            key: "export-html",
            label: t("YakitRiskTable.export_html")
        }
    ]
}
const batchRefreshMenuData: (t: (text: string) => string) => YakitMenuItemProps[] = (t) => {
    return [
        {
            key: "noResetRefresh",
            label: t("YakitButton.refreshOnly")
        },
        {
            key: "resetRefresh",
            label: t("YakitButton.resetQueryAndRefresh")
        }
    ]
}

/**name字段里面的内容不可随意更改，与查询条件有关 */
export const SeverityMapTag = [
    {
        key: ["info", "fingerprint", "infof", "default"],
        value: "title-info",
        name: "信息",
        nameUi: "YakitTag.info",
        tag: "success"
    },
    {key: ["low"], value: "title-low", name: "低危", nameUi: "YakitTag.low", tag: "warning"},
    {
        key: ["middle", "warn", "warning", "medium"],
        value: "title-middle",
        name: "中危",
        nameUi: "YakitTag.warning",
        tag: "info"
    },
    {key: ["high"], value: "title-high", name: "高危", nameUi: "YakitTag.high", tag: "danger"},
    {
        key: ["fatal", "critical", "panic"],
        value: "title-fatal",
        name: "严重",
        nameUi: "YakitTag.critical",
        tag: "serious"
    }
]
/**漏洞风险导出字段及其属性 */
const exportFields = (t: (text: string) => string) => {
    return [
        {
            label: t("YakitRiskTable.title"),
            value: "TitleVerbose",
            isDefaultChecked: true
        },
        {
            label: "IP",
            value: "IP",
            isDefaultChecked: true
        },
        {
            label: t("YakitRiskTable.level"),
            value: "Severity",
            isDefaultChecked: true
        },
        {
            label: t("YakitRiskTable.type"),
            value: "Type",
            isDefaultChecked: true
        },
        {
            label: "URL",
            value: "Url",
            isDefaultChecked: true
        },
        {
            label: "Tag",
            value: "Tags",
            isDefaultChecked: false
        },
        {
            label: t("YakitRiskTable.discovery_time"),
            value: "CreatedAt",
            isDefaultChecked: true
        },
        {
            label: t("YakitRiskTable.port_colon"),
            value: "Port",
            isDefaultChecked: true
        },
        {
            label: t("YakitRiskTable.vulnerability_detection"),
            value: "Description",
            isDefaultChecked: true
        },
        {
            label: t("YakitRiskTable.solution"),
            value: "Solution",
            isDefaultChecked: true
        },
        {
            label: t("YakitRiskTable.source"),
            value: "FromYakScript",
            isDefaultChecked: false
        },
        {
            label: t("YakitRiskTable.reverse_token"),
            value: "ReverseToken",
            isDefaultChecked: false
        },
        {
            label: t("YakitRiskTable.parameter"),
            value: "Parameter",
            isDefaultChecked: false
        },
        {
            label: "Payload",
            value: "Payload",
            isDefaultChecked: false
        }
    ]
}
const yakitRiskCellStyle = (t: (text: string) => string) => {
    return {
        [t("YakitTag.info")]: {
            font: {
                color: {rgb: "56c991"}
            }
        },
        [t("YakitTag.low")]: {
            font: {
                color: {rgb: "ffb660"}
            }
        },
        [t("YakitTag.warning")]: {
            font: {
                color: {rgb: "f28b44"}
            }
        },
        [t("YakitTag.high")]: {
            font: {
                color: {rgb: "f6544a"}
            }
        },
        [t("YakitTag.critical")]: {
            font: {
                color: {rgb: "bd2a21"}
            }
        }
    }
}

const getSeverityIcon = (Severity?: string) => {
    const severity = SeverityMapTag.filter((item) => item.key.includes(Severity || ""))[0]
    let icon = <></>
    switch (severity?.name) {
        case "信息":
            icon = <IconSolidInfoRiskIcon />
            break
        case "低危":
            icon = <IconSolidLowRiskIcon />
            break
        case "中危":
            icon = <IconSolidMediumRiskIcon />
            break
        case "高危":
            icon = <IconSolidHighRiskIcon />
            break
        case "严重":
            icon = <IconSolidSeriousIcon />
            break
        default:
            icon = <IconSolidDefaultRiskIcon />
            break
    }
    return {
        icon,
        tag: severity?.tag || "default",
        name: severity?.name || Severity || "-",
        nameUi: severity?.nameUi
    }
}
const defLimit = 20
export const YakitRiskTable: React.FC<YakitRiskTableProps> = React.memo((props) => {
    const {
        advancedQuery,
        setAdvancedQuery,
        setRiskLoading,
        renderTitle,
        riskWrapperClassName = "",
        tableVirtualResizeProps,
        yakitRiskDetailsBorder = true,
        excludeColumnsKey = []
    } = props
    const {t, i18n} = useI18nNamespaces(["risk", "yakitUi"])
    const {currentPageTabRouteKey} = usePageInfo(
        (s) => ({
            currentPageTabRouteKey: s.currentPageTabRouteKey
        }),
        shallow
    )
    const {userInfo} = useStore()
    const [loading, setLoading] = useState<boolean>(false)
    const percentContainerRef = useRef<string>(currentPageTabRouteKey)

    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [response, setResponse] = useState<QueryRisksResponse>({
        Data: [],
        Pagination: {...genDefaultPagination(20)},
        Total: 0
    })
    const [scrollToIndex, setScrollToIndex] = useState<number>()
    const [keywords, setKeywords] = useState<string>("")
    const [type, setType] = useState<"all" | "unread">("all")
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectList, setSelectList] = useState<Risk[]>([])
    const [currentSelectItem, setCurrentSelectItem] = useState<Risk>()
    const [query, setQuery] = useControllableValue<QueryRisksRequest>(props, {
        defaultValue: cloneDeep(defQueryRisksRequest),
        valuePropName: "query",
        trigger: "setQuery"
    })

    const [exportDataKey, setExportDataKey] = useState<string[]>([])

    const [riskTypeVerbose, setRiskTypeVerbose] = useState<FieldName[]>([])

    const [tag, setTag] = useState<FieldGroup[]>([])

    const [interval, setInterval] = useState<number | undefined>(undefined) // 控制 Interval
    const [offsetDataInTop, setOffsetDataInTop] = useState<Risk[]>([])
    const [allTotal, setAllTotal] = useControllableValue<number>(props, {
        defaultValue: 0,
        valuePropName: "allTotal",
        trigger: "setAllTotal"
    })

    const riskTableRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(riskTableRef)

    const prePage = useRef<number>(0)
    const afterId = useRef<number>(0)
    const beforeId = useRef<number>(0)
    const tableRef = useRef<any>(null)
    const defLimitRef = useRef<number>(defLimit)
    const limitRef = useRef<number>(defLimit)
    const tableBodyHeightRef = useRef<number>(0)
    const isInitRequestRef = useRef<boolean>(true)

    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return allTotal
        else return selectList.length
    }, [allCheck, selectList, allTotal])
    useEffect(() => {
        if (inViewport) {
            getRiskTags()
            getRiskType()
        }
        emiter.on("onRefRiskList", onRefRiskList)
        return () => {
            emiter.off("onRefRiskList", onRefRiskList)
        }
    }, [inViewport])
    useDebounceEffect(
        () => {
            // 初次不通过此处请求数据
            if (!isInitRequestRef.current) {
                onRefRiskList()
            }
        },
        [query, type],
        {
            wait: 200,
            leading: true
        }
    )
    useEffect(() => {
        // 组件存在既不卸载
        emiter.on("onRefreshQueryNewRisk", onStartInterval)
        return () => {
            emiter.off("onRefreshQueryNewRisk", onStartInterval)
        }
    }, [])

    useInterval(() => {
        if (beforeId.current) {
            getIncrementInTop()
        }
    }, interval)

    const intervalRedDot = useCreation(() => {
        return offsetDataInTop.length && !interval ? 1000 : undefined
    }, [offsetDataInTop, interval])
    useInterval(() => {
        const scrollTop = getScrollTop()
        if (inViewport && scrollTop < 10 && offsetDataInTop?.length > 0) {
            // 滚动条滚动到顶部的时候，如果偏移缓存数据中有数据，第一次优先将缓存数据放在总的数据中
            setResponse({
                ...response,
                Data: [...offsetDataInTop, ...response.Data]
            })
            setOffsetDataInTop([])
            return
        }
    }, intervalRedDot)
    /**开启实时数据刷新 */
    const onStartInterval = useMemoizedFn(() => {
        setInterval(1000)
    })
    const getScrollTop = useMemoizedFn(() => {
        return tableRef.current?.containerRef?.scrollTop || 0
    })
    /**获取滚动条在顶部的数据 */
    const getIncrementInTop = useMemoizedFn(() => {
        let params: QueryRisksRequest = {
            ...getQuery(),
            Pagination: {
                Limit: 20,
                Page: 1,
                Order: query.Pagination.Order,
                OrderBy: query.Pagination.OrderBy
            },
            FromId: afterId.current ? afterId.current : 0
        }
        if (params.Pagination.Order === "asc" || params.Pagination.OrderBy !== "id") {
            // 升序时，顶部不实时刷新，避免数据混乱
            // 排序字段为Id才实时刷新数据
            return
        }
        const scrollTop = getScrollTop()
        if (inViewport && scrollTop < 10 && offsetDataInTop?.length > 0) {
            // 滚动条滚动到顶部的时候，如果偏移缓存数据中有数据，第一次优先将缓存数据放在总的数据中
            setResponse({
                ...response,
                Data: [...offsetDataInTop, ...response.Data]
            })
            setOffsetDataInTop([])
            return
        }
        apiQueryRisksIncrementOrderDesc(params).then((rsp) => {
            if (rsp.Data.length > 0) {
                afterId.current = rsp.Data[0].Id
            } else {
                serverPushStatus && setInterval(undefined)
            }
            const newData = getResData(rsp.Data)
            const newTotal = allTotal + rsp.Data.length
            if (scrollTop < 10) {
                setResponse({
                    ...response,
                    Data: [...newData, ...response.Data]
                })
            } else {
                setOffsetDataInTop([...newData, ...offsetDataInTop])
            }
            setAllTotal(newTotal)
        })
    })
    const columns: ColumnsTypeProps[] = useCreation<ColumnsTypeProps[]>(() => {
        const tagTable = tag.map((item) => ({
            value: item.Name,
            label: item.Name,
            total: item.Total
        }))
        const riskTypeVerboseTable = riskTypeVerbose.map((item) => ({
            value: item.Verbose,
            label: item.Verbose,
            total: item.Total
        }))
        const columnArr: ColumnsTypeProps[] = [
            {
                title: t("YakitTable.order"),
                dataKey: "Id",
                fixed: "left",
                ellipsis: false,
                width: 96,
                enableDrag: false,
                sorterProps: {
                    sorter: true,
                    sorterKey: "id"
                }
            },
            {
                title: t("YakitRiskTable.title"),
                dataKey: "TitleVerbose",
                filterProps: {
                    filterKey: "Title",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                },
                render: (_, record) => record?.TitleVerbose || record.Title || "-"
            },
            {
                title: t("YakitRiskTable.type"),
                dataKey: "RiskTypeVerbose",
                filterProps: {
                    filterKey: "RiskTypeList",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: riskTypeVerboseTable
                }
            },
            {
                title: t("YakitRiskTable.level"),
                dataKey: "Severity",
                width: 100,
                align: "center",
                render: (_, i: Risk) => {
                    const title = SeverityMapTag.filter((item) => item.key.includes(i.Severity || ""))[0]
                    return (
                        <YakitTag color={title?.tag as YakitTagColor} className={styles["table-severity-tag"]}>
                            {title ? t(title.nameUi) : i.Severity || "-"}
                        </YakitTag>
                    )
                },
                filterProps: {
                    filterKey: "SeverityList",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: [
                        {
                            value: "critical",
                            label: t("YakitTag.critical")
                        },
                        {
                            value: "high",
                            label: t("YakitTag.high")
                        },
                        {
                            value: "warning",
                            label: t("YakitTag.warning")
                        },
                        {
                            value: "low",
                            label: t("YakitTag.low")
                        },
                        {
                            value: "info",
                            label: t("YakitTag.info")
                        }
                    ]
                }
            },
            {
                title: "IP",
                dataKey: "IP",
                width: 120,
                filterProps: {
                    filterKey: "Network",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                }
            },
            {
                title: "Url",
                dataKey: "Url"
            },
            {
                title: t("YakitRiskTable.disposal_status"),
                dataKey: "Tags",
                filterProps: {
                    filterKey: "TagList",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: tagTable
                },
                minWidth: 120,
                render: (text, record, index) => (
                    <>
                        <div
                            className={styles["table-tag"]}
                            onClick={(e) => {
                                onOpenSelect(record)
                            }}
                        >
                            <span>{!!text ? text.replaceAll("|", ",") : "-"}</span>
                            <OutlineChevrondownIcon className={styles["table-tag-icon"]} />
                        </div>
                    </>
                )
            },
            {
                title: t("YakitRiskTable.discovery_time"),
                dataKey: "CreatedAt",
                filterProps: {
                    filterKey: "CreatedAt",
                    filtersType: "dateTime"
                },
                render: (text) => (text ? formatTimestamp(text) : "-")
            },
            {
                title: t("YakitTable.action"),
                dataKey: "action",
                width: 140,
                fixed: "right",
                render: (text, record: Risk, index) => (
                    <>
                        <YakitButton
                            type='text'
                            danger
                            onClick={(e) => {
                                e.stopPropagation()
                                onRemoveSingle(record.Id)
                            }}
                            icon={<OutlineTrashIcon />}
                        />
                        <Divider type='vertical' />
                        <Tooltip
                            title={t("YakitRiskTable.retest")}
                            destroyTooltipOnHide={true}
                            overlayStyle={{paddingBottom: 0}}
                            placement='top'
                        >
                            <YakitButton
                                type='text'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onRetest(record)
                                }}
                                icon={<OutlinePlayIcon />}
                            />
                        </Tooltip>
                        <Divider type='vertical' />
                        <Tooltip
                            title={t("YakitRiskTable.false_positive_feedback")}
                            destroyTooltipOnHide={true}
                            overlayStyle={{paddingBottom: 0}}
                            placement='top'
                        >
                            <OutlineUploadIcon
                                className={styles["misstatement-icon"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onClickRiskFeedbackToOnline(record)
                                }}
                            />
                        </Tooltip>
                    </>
                )
            }
        ]
        return columnArr.filter((ele) => !excludeColumnsKey.includes(ele.dataKey))
    }, [riskTypeVerbose, tag, excludeColumnsKey, i18n.language])

    /**误报上传 start */
    const [misstatementVisible, setMisstatementVisible] = useState<boolean>(false)
    const misstatementHintCache = useRef<boolean>(false)
    const riskFeedbackToOnlineParams = useRef<UploadRiskToOnlineRequest>()
    useEffect(() => {
        getRemoteValue(RemoteRiskGV.RiskMisstatementNoPrompt).then((res) => {
            misstatementHintCache.current = res === "true"
        })
    }, [])
    const handleMisstatementHint = (isOk: boolean, cache: boolean) => {
        if (isOk) {
            misstatementHintCache.current = cache
            fetchMisstatement()
        }
        setMisstatementVisible(false)
    }
    const onClickRiskFeedbackToOnline = useMemoizedFn((record: Risk) => {
        if (!userInfo.isLogin) {
            yakitNotify("info", t("YakitRiskTable.please_login_first"))
            return
        }
        riskFeedbackToOnlineParams.current = {
            Token: userInfo.token,
            Hash: [record.Hash]
        }
        if (!misstatementHintCache.current) {
            setMisstatementVisible(true)
        } else {
            fetchMisstatement()
        }
    })
    const fetchMisstatement = () => {
        const params = riskFeedbackToOnlineParams.current
        if (params) {
            apiRiskFeedbackToOnline(params).then(() => {
                yakitNotify("success", t("YakitRiskTable.feedback_success"))
            })
        }
    }
    /**误报上传 end */

    /**复测 */
    const onRetest = useMemoizedFn((record: Risk) => {
        if (record.YakScriptUUID || record.FromYakScript) {
            grpcFetchLocalPluginDetail({Name: record.FromYakScript || "", UUID: record.YakScriptUUID}).then(
                (yakScript: YakScript) => {
                    const info = {
                        route: YakitRoute.Plugin_Hub,
                        params: {
                            tabActive: "local",
                            detailInfo: {
                                uuid: yakScript.UUID,
                                name: yakScript.ScriptName,
                                isCorePlugin: !!yakScript?.IsCorePlugin
                            }
                        } as PluginHubPageInfoProps
                    }
                    emiter.emit("openPage", JSON.stringify(info))
                }
            )
        } else {
            yakitNotify("error", t("YakitRiskTable.vulnerability_not_scanned_by_plugin"))
        }
    })
    const onRefRiskList = useDebounceFn(
        () => {
            limitRef.current = defLimitRef.current
            setOffsetDataInTop([])
            update(1)
            getTotal()
        },
        {wait: 200, leading: true}
    ).run
    const getRiskTags = useMemoizedFn(() => {
        apiQueryRiskTags().then((res) => {
            setTag(res.RiskTags)
        })
    })
    const getRiskType = useMemoizedFn(() => {
        apiQueryAvailableRiskType().then(setRiskTypeVerbose)
    })
    const onOpenSelect = useMemoizedFn((record: Risk) => {
        const m = showYakitModal({
            title: (
                <div className='content-ellipsis'>
                    {t("YakitTable.order")}【{record.Id}】- {record.TitleVerbose || record.Title}
                </div>
            ),
            content: <YakitRiskSelectTag info={record} onClose={() => m.destroy()} onSave={onSaveTags} />,
            footer: null,
            onCancel: () => {
                m.destroy()
            }
        })
    })
    const onSaveTags = useMemoizedFn((info: Risk) => {
        const params: SetTagForRiskRequest = {
            Id: info.Id,
            Hash: info.Hash,
            Tags: !!info.Tags ? info.Tags?.split("|") : []
        }
        apiSetTagForRisk(params).then(() => {
            const index = response.Data.findIndex((item) => item.Id === info.Id)
            if (index === -1) return
            response.Data[index] = {
                ...info
            }
            setResponse({
                ...response,
                Data: [...response.Data]
            })
            getRiskTags()
        })
    })
    const onRemoveSingle = useMemoizedFn((id) => {
        apiDeleteRisk({Id: id}).then(() => {
            setResponse({
                ...response,
                Data: response.Data.filter((item) => item.Id !== id)
            })
            emiter.emit("onRefRiskFieldGroup")
        })
    })
    /**批量删除后，重置查询条件刷新 */
    const onRemove = useMemoizedFn(() => {
        let removeQuery: DeleteRiskRequest = {
            Filter: {
                ...getQuery()
            }
        }
        if (!allCheck && selectList.length > 0) {
            // 勾选删除
            const ids = selectList.map((item) => item.Id)
            removeQuery = {
                Ids: ids
            }
        }
        setRiskLoading(true)
        apiDeleteRisk(removeQuery)
            .then(() => {
                onResetRefresh()
                emiter.emit("onRefRiskFieldGroup")
            })
            .finally(() =>
                setTimeout(() => {
                    setRiskLoading(false)
                }, 200)
            )
    })
    const onExportMenuSelect = useMemoizedFn((key: string) => {
        switch (key) {
            case "export-csv":
                onExportCSV()
                break
            case "export-html":
                onExportHTML()
                break
            default:
                break
        }
    })
    const onExportCSV = useMemoizedFn(() => {
        if (+response.Total === 0) return
        percentContainerRef.current = currentPageTabRouteKey
        const exportValue = exportFields(t).map((item) => ({title: item.label, key: item.value}))
        const initCheckFields = exportFields(t)
            .filter((ele) => ele.isDefaultChecked)
            .map((item) => ({title: item.label, key: item.value}))
        const m = showYakitModal({
            title: t("YakitRiskTable.select_export_fields"),
            content: (
                <ExportSelect
                    exportValue={exportValue}
                    initCheckValue={initCheckFields}
                    setExportTitle={(v: string[]) => {
                        setExportDataKey([...v])
                    }}
                    exportKey={RemoteGV.RiskExportFields}
                    getData={getExcelData}
                    onClose={() => m.destroy()}
                    fileName={t("YakitRiskTable.risk_and_vulnerabilities")}
                    getContainer={
                        document.getElementById(`main-operator-page-body-${percentContainerRef.current}`) || undefined
                    }
                />
            ),
            onCancel: () => {
                m.destroy()
                setSelectList([])
            },
            footer: null,
            width: 750,
            getContainer: document.getElementById(`main-operator-page-body-${percentContainerRef.current}`) || undefined
        })
    })
    const formatJson = (filterVal, jsonData) => {
        return jsonData.map((v, index) =>
            filterVal.map((j) => {
                if (j === "Tags") {
                    const value = v["Tags"] || ""
                    return value.replaceAll("|", ",")
                }
                if (j === "FromYakScript") {
                    const value = v["FromYakScript"] || t("YakitRiskTable.vulnerability_detection")
                    return value
                }
                if (j === "TitleVerbose") {
                    const value = v["TitleVerbose"] || v["Title"] || ""
                    return value
                }
                if (j === "Type") {
                    const value = v["RiskTypeVerbose"] || v["RiskType"] || ""
                    return value.replaceAll("NUCLEI-", "")
                }
                if (j === "Severity") {
                    const title = SeverityMapTag.filter((item) => item.key.includes(v["Severity"] || ""))[0]
                    return title ? t(title.nameUi) : v["Severity"] || "-"
                }
                if (j === "CreatedAt") {
                    return formatTimestamp(v[j])
                }
                if (["Request", "Response"].includes(j)) {
                    return Buffer.from(v[j]).toString("utf8")
                }
                return v[j]
            })
        )
    }
    const getExcelData = useMemoizedFn(() => {
        return new Promise((resolve, reject) => {
            let exportData: any = []
            const header: string[] = []
            const filterVal: string[] = []
            exportDataKey.forEach((item) => {
                const itemData = exportFields(t).filter((itemIn) => itemIn.value === item)[0]
                header.push(itemData.label)
                filterVal.push(itemData.value)
            })
            const number = filterVal.findIndex((ele) => ele === "Severity")
            let optsSingleCellSetting = {}
            if (number !== -1) {
                optsSingleCellSetting = {
                    c: number, // 第*列，
                    colorObj: yakitRiskCellStyle(t) // 字体颜色设置
                }
            }
            const resolveData = {
                header,
                optsSingleCellSetting
            }
            if (allCheck || selectList.length === 0) {
                const exportQuery: QueryRisksRequest = {
                    ...getQuery(),
                    Pagination: {
                        ...query.Pagination,
                        Page: 1,
                        Limit: allTotal
                    }
                }
                apiQueryRisks(exportQuery).then((res) => {
                    exportData = formatJson(filterVal, res.Data)
                    resolve({
                        ...resolveData,
                        exportData,
                        response: res
                    })
                })
            } else {
                exportData = formatJson(filterVal, selectList)
                resolve({
                    ...resolveData,
                    exportData,
                    response: {
                        Total: selectList.length,
                        Data: selectList,
                        Pagination: {
                            Page: 1,
                            Limit: selectList.length,
                            OrderBy: query.Pagination.OrderBy,
                            Order: query.Pagination.Order
                        }
                    }
                })
            }
        })
    })
    const onExportHTML = useMemoizedFn(async () => {
        if (+response.Total === 0) return
        setRiskLoading(true)
        let risks: Risk[] = []
        if (allCheck || selectList.length === 0) {
            const exportQuery: QueryRisksRequest = {
                ...getQuery(),
                Pagination: {
                    ...query.Pagination,
                    Page: 1,
                    Limit: allTotal
                }
            }
            const res = await apiQueryRisks(exportQuery)
            risks = [...res.Data]
        } else {
            risks = [...selectList]
        }
        const newRisks = risks.map((ele) => ({
            ...ele,
            RequestString: Buffer.from(ele.Request || new Uint8Array()).toString("utf8"),
            ResponseString: Buffer.from(ele.Response || new Uint8Array()).toString("utf8")
        }))
        const htmlContent = i18n.language === "zh" ? getHtmlTemplate() : getHtmlEnTemplate()
        const params: ExportHtmlProps = {
            htmlContent,
            fileName: `riskTable-${moment().valueOf()}`,
            data: newRisks
        }
        apiExportHtml(params).catch((error) => {
            yakitNotify("error", `${t("YakitRiskTable.export_html_failed")}${error}`)
        })
        setTimeout(() => {
            setRiskLoading(false)
        }, 200)
    })
    const onRefreshMenuSelect = useMemoizedFn((key: string) => {
        switch (key) {
            case "noResetRefresh":
                onRefRiskList()
                break
            case "resetRefresh":
                onResetRefresh()
                break
            default:
                break
        }
    })
    /**条件变化会自动查询新数据 */
    const onResetRefresh = useMemoizedFn(() => {
        setQuery(cloneDeep(defQueryRisksRequest))
    })
    const onTableChange = useMemoizedFn((page: number, limit: number, newSort: SortProps, filter: any) => {
        let sort = {...newSort}
        if (sort.order === "none") {
            sort.order = "desc"
            sort.orderBy = "id"
        }
        const newQuery = {
            ...query,
            ...filter,
            Pagination: {
                ...query.Pagination,
                Order: sort.order,
                OrderBy: sort.orderBy
            }
        }
        setOffsetDataInTop([]) // 排序条件变化，清空缓存的实时数据
        setQuery(newQuery)
        limitRef.current = defLimitRef.current
    })

    const getQueryNetwork = useMemoizedFn((network: string, ipList: string[]) => {
        let ip = network
        if (ipList.length > 0) {
            ip = !!ip ? `${ip},${ipList.join(",")}` : ipList.join(",")
        }
        return ip
    })

    const getQuery = useMemoizedFn(() => {
        const finalParams: QueryRisksRequest = {
            ...query,
            RiskType: !!query.RiskTypeList ? query.RiskTypeList.join(",") : "",
            Severity: !!query.SeverityList ? query.SeverityList.join(",") : "",
            Tags: !!query.TagList ? query.TagList.join("|") : "",
            Network: getQueryNetwork(query.Network, query.IPList || []),
            IsRead: type === "all" ? "" : "false",
            AfterCreatedAt: !!query.CreatedAt ? query.CreatedAt[0] : undefined,
            BeforeCreatedAt: !!query.CreatedAt ? query.CreatedAt[1] : undefined
        }
        return finalParams
    })
    const getResData = useMemoizedFn((data: Risk[]) => {
        const resData = (data || []).map((ele) => ({
            ...ele,
            cellClassName: ele.IsRead ? "" : styles["yakit-risk-table-cell-unread"]
        }))
        return resData
    })
    const update = useMemoizedFn((page?: number) => {
        const paginationProps = {
            ...query.Pagination,
            Page: 1,
            Limit: limitRef.current
        }
        const finalParams: QueryRisksRequest = {
            ...getQuery(),
            Pagination: paginationProps
        }
        const isInit = page === 1
        if (query.Pagination.Order === "asc") {
            finalParams.FromId = isInit ? 0 : afterId.current
        } else {
            finalParams.UntilId = isInit ? 0 : beforeId.current
        }
        if (isInit) {
            prePage.current = 0
        }

        apiQueryRisks(finalParams)
            .then((res) => {
                const resData = getResData(res.Data)
                const d = isInit ? resData : (response?.Data || []).concat(resData)
                prePage.current += 1
                setResponse({
                    ...res,
                    Data: d,
                    Pagination: {
                        ...res.Pagination,
                        Page: prePage.current // 虚假的page，只是为了让表格滚动加载下一页数据
                    }
                })
                if (isInit) {
                    setIsRefresh(!isRefresh)
                    setSelectList([])
                    setAllCheck(false)
                    setCurrentSelectItem(undefined)
                } else {
                    if (allCheck) {
                        setSelectList(d)
                    }
                }

                limitRef.current = defLimit
                if (query.Pagination.Order === "asc") {
                    if (isInit) {
                        beforeId.current = (res.Data[0] && res.Data[0].Id) || 0
                        onTableResize(undefined, tableBodyHeightRef.current)
                    }
                    afterId.current = (res.Data[res.Data.length - 1] && res.Data[res.Data.length - 1].Id) || 0
                } else {
                    if (isInit) {
                        afterId.current = (res.Data[0] && res.Data[0].Id) || 0
                        onTableResize(undefined, tableBodyHeightRef.current)
                    }
                    beforeId.current = (res.Data[res.Data.length - 1] && res.Data[res.Data.length - 1].Id) || 0
                }
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    /**
     * 1.获取所有数据，带查询条件
     * 2.获取数据总数，因为有FromId/UntilId字段查询回来的总数并不是真正的总数
     */
    const getTotal = useMemoizedFn(() => {
        const params: QueryRisksRequest = {
            ...getQuery(),
            Pagination: {
                ...query.Pagination,
                Page: 1,
                Limit: 1
            }
        }
        apiQueryRisks(params).then((allRes) => {
            setAllTotal(+allRes.Total)
            if (+allRes.Total !== selectList.length) {
                setAllCheck(false)
            }
        })
    })
    const onSearch = useMemoizedFn((val) => {
        setLoading(true)
        setQuery({
            ...query,
            Search: val
        })
    })
    const onPressEnter = useMemoizedFn(() => {
        onSearch(keywords)
    })
    const onSelectAll = useMemoizedFn((newSelectedRowKeys: string[], selected: Risk[], checked: boolean) => {
        if (checked) {
            setAllCheck(true)
            setSelectList(response.Data)
        } else {
            setAllCheck(false)
            setSelectList([])
        }
    })
    const onChangeCheckboxSingle = useMemoizedFn((c: boolean, key: string, selectedRows: Risk) => {
        if (c) {
            setSelectList((s) => [...s, selectedRows])
        } else {
            setSelectList((s) => s.filter((ele) => ele.Id !== selectedRows.Id))
            setAllCheck(false)
        }
    })
    const onSetCurrentRow = useMemoizedFn((val?: Risk) => {
        if (!val) {
            setCurrentSelectItem(undefined)
            return
        }
        if (val?.Id !== currentSelectItem?.Id) {
            setCurrentSelectItem(val)
            minWinSendToChildWin({
                type: "openRiskNewWindow",
                data: val
            })
        }
        if (!val.IsRead) {
            apiNewRiskRead({Filter: {...query, Ids: [val.Id]}}).then(() => {
                setResponse({
                    ...response,
                    Data: response.Data.map((ele) => {
                        if (ele.Id === val.Id) {
                            ele.IsRead = true
                            ele.cellClassName = ""
                        }
                        return ele
                    })
                })
            })
            emiter.emit("onRefRisksRead", JSON.stringify({Id: val.Id}))
        }
    })
    const onAllRead = useMemoizedFn(() => {
        apiNewRiskRead({Filter: {...query, Ids: []}}).then(() => {
            onRefRiskList()
            emiter.emit("onRefRisksRead", JSON.stringify({Id: "", isAllRead: true}))
        })
    })
    const onExpend = useMemoizedFn(() => {
        if (setAdvancedQuery) setAdvancedQuery(true)
    })
    const onRowContextMenu = useMemoizedFn((rowData: Risk) => {
        if (!rowData) return
        showByRightContext({
            width: 180,
            data: [
                {key: "delete-repeat-title", label: t("YakitRiskTable.RowContextMenu.delete_duplicate_title_data")},
                {key: "open-in-new-window", label: t("YakitRiskTable.RowContextMenu.openInNewWindow")}
            ],
            onClick: ({key}) => onRightMenuSelect(key, rowData)
        })
    })
    const onRightMenuSelect = useMemoizedFn((key: string, rowData: Risk) => {
        switch (key) {
            case "delete-repeat-title":
                onDeleteRepeatTitle(rowData)
                break
            case "open-in-new-window":
                onRiskTableRowDoubleClick(rowData)
                break
            default:
                break
        }
    })
    const onDeleteRepeatTitle = useMemoizedFn((rowData: Risk) => {
        const newParams = {
            DeleteRepetition: true,
            Id: rowData.Id,
            Filter: {
                ...defQueryRisksRequest,
                Title: rowData?.TitleVerbose || rowData.Title,
                Network: rowData?.IP
            }
        }
        setRiskLoading(true)
        apiDeleteRisk(newParams)
            .then(() => {
                onResetRefresh()
                emiter.emit("onRefRiskFieldGroup")
            })
            .finally(() =>
                setTimeout(() => {
                    setRiskLoading(false)
                }, 200)
            )
    })
    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "50%",
            secondRatio: "50%"
        }
        if (!currentSelectItem?.Id) {
            p.secondRatio = "0%"
            p.firstRatio = "100%"
        }
        return p
    }, [currentSelectItem])
    const selectedRowKeys = useCreation(() => {
        return selectList.map((ele) => ele.Id) || []
    }, [selectList])
    const onClickIP = useMemoizedFn((info: Risk) => {
        const index = response?.Data.findIndex((item) => item.Id === info.Id)
        if (index !== -1) setScrollToIndex(index)
    })
    /**table所在的div大小发生变化 */
    const onTableResize = useMemoizedFn((width, height) => {
        if (!height) {
            return
        }
        const tableCellHeight = 28
        const limit = Math.trunc(height / tableCellHeight) + 10
        defLimitRef.current = limit
        isInitRequestRef.current = false
        tableBodyHeightRef.current = height
        if (allTotal === 0) {
            // init
            onRefRiskList()
            return
        } else if (tableBodyHeightRef.current < height) {
            // 窗口由小变大时 重新拉取数据
            const length = response.Data.length
            const h = length * tableCellHeight
            if (h < height) {
                update()
            }
            return
        }
    })

    const onRiskTableRowDoubleClick = useMemoizedFn((r?: Risk) => {
        openRiskNewWindow(r)
    })

    return (
        <div className={classNames(styles["yakit-risk-table"], riskWrapperClassName)} ref={riskTableRef}>
            <ReactResizeDetector
                onResize={onTableResize}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <YakitResizeBox
                firstMinSize={160}
                secondMinSize={200}
                isVer={true}
                lineStyle={{display: !!currentSelectItem?.Id ? "" : "none"}}
                lineDirection='bottom'
                secondNodeStyle={{
                    display: !currentSelectItem?.Id ? "none" : "",
                    padding: !currentSelectItem?.Id ? 0 : undefined
                }}
                firstNode={
                    <TableVirtualResize<Risk>
                        ref={tableRef}
                        scrollToIndex={scrollToIndex}
                        query={query}
                        loading={loading}
                        isRefresh={isRefresh}
                        titleHeight={32}
                        renderTitle={
                            renderTitle ? (
                                renderTitle
                            ) : (
                                <div className={styles["table-renderTitle"]}>
                                    <div className={styles["table-renderTitle-left"]}>
                                        {!advancedQuery && (
                                            <Tooltip
                                                title={t("YakitRiskTable.expand_filter")}
                                                placement='topLeft'
                                                overlayClassName='plugins-tooltip'
                                            >
                                                <YakitButton
                                                    type='text2'
                                                    onClick={onExpend}
                                                    icon={<OutlineOpenIcon onClick={onExpend} />}
                                                ></YakitButton>
                                            </Tooltip>
                                        )}
                                        <div className={styles["table-renderTitle-text"]}>
                                            {t("YakitRiskTable.risk_and_vulnerabilities")}
                                        </div>
                                        <YakitRadioButtons
                                            value={type}
                                            onChange={(e) => {
                                                setType(e.target.value)
                                            }}
                                            buttonStyle='solid'
                                            options={[
                                                {
                                                    value: "all",
                                                    label: t("YakitRiskTable.all")
                                                },
                                                {
                                                    value: "false",
                                                    label: t("YakitRiskTable.unread")
                                                }
                                            ]}
                                        />
                                        {
                                            <div className={styles["virtual-table-heard-right"]}>
                                                <div className={styles["virtual-table-heard-right-item"]}>
                                                    <span className={styles["virtual-table-heard-right-text"]}>
                                                        Total
                                                    </span>
                                                    <span className={styles["virtual-table-heard-right-number"]}>
                                                        {allTotal}
                                                    </span>
                                                </div>
                                                <Divider type='vertical' />
                                                <div className={styles["virtual-table-heard-right-item"]}>
                                                    <span className={styles["virtual-table-heard-right-text"]}>
                                                        Selected
                                                    </span>
                                                    <span className={styles["virtual-table-heard-right-number"]}>
                                                        {selectNum}
                                                    </span>
                                                </div>
                                            </div>
                                        }
                                    </div>
                                    <div className={styles["table-head-extra"]}>
                                        <YakitInput.Search
                                            value={keywords}
                                            onChange={(e) => setKeywords(e.target.value)}
                                            placeholder={t("YakitInput.searchKeyWordPlaceholder")}
                                            onSearch={onSearch}
                                            onPressEnter={onPressEnter}
                                        />
                                        <Divider type='vertical' style={{margin: 0}} />
                                        <FuncBtn
                                            maxWidth={1200}
                                            type='outline2'
                                            icon={<OutlineEyeIcon />}
                                            onClick={onAllRead}
                                            name={t("YakitRiskTable.mark_all_as_read")}
                                        />
                                        <YakitDropdownMenu
                                            menu={{
                                                data: batchExportMenuData(t),
                                                onClick: ({key}) => {
                                                    onExportMenuSelect(key)
                                                }
                                            }}
                                            dropdown={{
                                                trigger: ["hover"],
                                                placement: "bottom",
                                                disabled: allTotal === 0
                                            }}
                                        >
                                            <FuncBtn
                                                maxWidth={1200}
                                                type='outline2'
                                                icon={<OutlineExportIcon />}
                                                name={" " + t("YakitRiskTable.export_as")}
                                                disabled={allTotal === 0}
                                            />
                                        </YakitDropdownMenu>
                                        <YakitPopconfirm
                                            title={
                                                allCheck
                                                    ? t("YakitRiskTable.confirm_delete_all_risks")
                                                    : t("YakitRiskTable.confirm_delete_selected_risks")
                                            }
                                            onConfirm={onRemove}
                                        >
                                            <FuncBtn
                                                maxWidth={1200}
                                                type='outline1'
                                                colors='danger'
                                                icon={<OutlineTrashIcon />}
                                                disabled={allTotal === 0}
                                                name={
                                                    selectNum === 0 ? t("YakitButton.clear") : t("YakitButton.delete")
                                                }
                                            />
                                        </YakitPopconfirm>
                                        <YakitDropdownMenu
                                            menu={{
                                                data: batchRefreshMenuData(t),
                                                onClick: ({key}) => {
                                                    onRefreshMenuSelect(key)
                                                }
                                            }}
                                            dropdown={{
                                                trigger: ["hover"],
                                                placement: "bottom"
                                            }}
                                        >
                                            <Badge dot={offsetDataInTop.length > 0} offset={[-5, 4]}>
                                                <YakitButton type='text2' icon={<OutlineRefreshIcon />} />
                                            </Badge>
                                        </YakitDropdownMenu>
                                    </div>
                                </div>
                            )
                        }
                        renderKey='Id'
                        data={response.Data}
                        rowSelection={{
                            isAll: allCheck,
                            type: "checkbox",
                            selectedRowKeys,
                            onSelectAll,
                            onChangeCheckboxSingle
                        }}
                        pagination={{
                            total: allTotal,
                            limit: response.Pagination.Limit,
                            page: response.Pagination.Page,
                            onChange: (page) => update(page)
                        }}
                        columns={columns}
                        onSetCurrentRow={onSetCurrentRow}
                        enableDrag={true}
                        useUpAndDown
                        onChange={onTableChange}
                        onRowContextMenu={onRowContextMenu}
                        onRowDoubleClick={onRiskTableRowDoubleClick}
                        {...(tableVirtualResizeProps || {})}
                    />
                }
                secondNode={
                    currentSelectItem && (
                        <YakitRiskDetails
                            info={currentSelectItem}
                            className={styles["yakit-risk-details"]}
                            onClickIP={onClickIP}
                            border={yakitRiskDetailsBorder}
                            isShowExtra={!excludeColumnsKey.includes("action")}
                            onRetest={onRetest}
                        />
                    )
                }
                {...ResizeBoxProps}
            />
            {/* 误报反馈提示 */}
            <NoPromptHint
                visible={misstatementVisible}
                title={t("YakitRiskTable.false_positive_feedback_reminder")}
                content={t("YakitRiskTable.confirm_feedback_prompt")}
                cacheKey={RemoteRiskGV.RiskMisstatementNoPrompt}
                onCallback={handleMisstatementHint}
            />
        </div>
    )
})
const defaultTags = (t: (text: string) => string) => {
    return [
        {
            label: t("YakitRiskSelectTag.false_positive"),
            value: "误报"
        },
        {
            label: t("YakitRiskSelectTag.ignore"),
            value: "忽略"
        },
        {
            label: t("YakitRiskSelectTag.processed"),
            value: "已处理"
        },
        {
            label: t("YakitRiskSelectTag.pending"),
            value: "待处理"
        }
    ]
}
const YakitRiskSelectTag: React.FC<YakitRiskSelectTagProps> = React.memo((props) => {
    const {info, onClose, onSave} = props
    const {t, i18n} = useI18nNamespaces(["risk", "yakitUi"])
    const initSelectTags = useCreation(() => {
        let tagList: {label: string; value: string}[] = []
        if (!!info?.Tags) {
            tagList =
                (info?.Tags || "").split("|").map((item) => ({
                    label: item,
                    value: item
                })) || []
        }
        return tagList
    }, [info.Tags])
    const tags = useCreation(() => {
        const list = initSelectTags.filter((item) => {
            return !defaultTags(t).find((i) => i.value === item.value)
        })
        return defaultTags(t).concat(list)
    }, [info.Tags, initSelectTags])
    const onFinish = useMemoizedFn((value) => {
        onSave({
            ...info,
            Tags: !!value.TagList ? value.TagList.join("|") : ""
        })
        if (onClose) onClose()
    })
    return (
        <div className={styles["yakit-risk-select-tag"]}>
            <Form onFinish={onFinish}>
                <Form.Item label='Tags' name='TagList' initialValue={initSelectTags}>
                    <YakitSelect mode='tags' allowClear>
                        {tags.map((item) => {
                            return (
                                <YakitSelect.Option key={item.value} value={item.value}>
                                    {item.label}
                                </YakitSelect.Option>
                            )
                        })}
                    </YakitSelect>
                </Form.Item>
                <div className={styles["yakit-risk-select-tag-btns"]}>
                    <YakitButton
                        type='outline2'
                        onClick={() => {
                            if (onClose) onClose()
                        }}
                    >
                        {t("YakitButton.cancel")}
                    </YakitButton>
                    <YakitButton htmlType='submit'>{t("YakitButton.ok")}</YakitButton>
                </div>
            </Form>
        </div>
    )
})

export const YakitRiskDetails: React.FC<YakitRiskDetailsProps> = React.memo((props) => {
    const {
        info,
        isShowTime = true,
        className = "",
        border = true,
        isShowExtra,
        onRetest,
        boxStyle,
        detailClassName = ""
    } = props
    const {t, i18n} = useI18nNamespaces(["risk", "yakitUi"])
    const [isShowCode, setIsShowCode] = useState<boolean>(true)
    const descriptionsRef = useRef<HTMLDivElement>(null)
    const descriptionsDivWidth = useListenWidth(descriptionsRef)
    const [packetIndex, setPacketIndex] = useState<number>(0)
    const [packetHistory, setPacketHistory] = useState<PacketHistory[]>([])

    useEffect(() => {
        let cancelled = false
        const initHistory = async () => {
            const baseArr: PacketHistory[] = [
                {
                    Id: info.Id,
                    Url: info.Url,
                    Request: info.Request,
                    Response: info.Response
                }
            ]

            if (!info.PacketPairs?.length) {
                if (!cancelled) {
                    setPacketHistory(baseArr)
                }
                return
            }

            try {
                const results = await Promise.all(
                    info.PacketPairs.filter((item) => item.HttpflowId).map((item) =>
                        ipcRenderer
                            .invoke("GetHTTPFlowById", {Id: item.HttpflowId})
                            .then((data: HTTPFlow) => ({
                                HttpflowId: item.HttpflowId,
                                Url: item.Url,
                                Request: data.Request,
                                Response: data.Response
                            }))
                            .catch(() => ({
                                HttpflowId: item.HttpflowId,
                                Url: item.Url
                            }))
                    )
                )

                if (!cancelled) {
                    setPacketHistory([...baseArr, ...(results as PacketHistory[])])
                }
            } catch (e) {
                if (!cancelled) {
                    info.PacketPairs.filter((item) => item.HttpflowId).map((item) => {
                        baseArr.push(item)
                    })
                    setPacketHistory(baseArr)
                }
            }
        }
        const isRequestString = !!requestString(info)
        const isResponseString = !!responseString(info)
        if (isRequestString || isResponseString) {
            setPacketIndex(0)
            initHistory()
            setIsShowCode(true)
        } else {
            setIsShowCode(false)
        }
        return () => {
            cancelled = true
        }
    }, [info])

    const severityInfo = useCreation(() => {
        return getSeverityIcon(info.Severity)
    }, [info.Severity])

    const onClickIP = useMemoizedFn(() => {
        if (props.onClickIP) props.onClickIP(info)
    })

    const column = useCreation(() => {
        if (descriptionsDivWidth > 600) return 3
        return 1
    }, [descriptionsDivWidth])

    const codeNode = useMemoizedFn((isRequest: boolean) => {
        const showPacket = packetHistory[packetIndex]
        const extraParams = {
            originValue: isRequest ? requestString(showPacket) : responseString(showPacket),
            originalPackage: isRequest ? showPacket?.Request : showPacket?.Response,
            webFuzzerValue: isRequest ? "" : requestString(showPacket),
            defaultHttps: !!showPacket.Url && showPacket.Url?.length > 0 && showPacket.Url.includes("https"),
            url: showPacket.Url || "",
            downbodyParams: showPacket.HttpflowId
                ? {Id: showPacket.HttpflowId, IsRequest: isRequest}
                : {IsRisk: true, Id: showPacket.Id, IsRequest: isRequest}
        }
        return (
            <NewHTTPPacketEditor
                readOnly={true}
                isShowBeautifyRender={true}
                bordered={true}
                isResponse={!isRequest}
                title={
                    <div>
                        {isRequest ? (
                            <div className={styles["content-resize-first-heard"]}>
                                <span>Request</span>
                                <Tooltip title={t("YakitRiskDetails.prev")} align={{targetOffset: [0, -10]}}>
                                    <YakitButton
                                        type='text'
                                        disabled={packetIndex <= 0}
                                        icon={<OutlineChevronleftIcon />}
                                        onClick={() => {
                                            setPacketIndex((prev) => prev - 1)
                                        }}
                                    ></YakitButton>
                                </Tooltip>
                                <Tooltip title={t("YakitRiskDetails.next")} align={{targetOffset: [0, -10]}}>
                                    <YakitButton
                                        type='text'
                                        disabled={packetIndex + 1 === packetHistory.length}
                                        icon={<OutlineChevronrightIcon />}
                                        onClick={() => {
                                            setPacketIndex((prev) => prev + 1)
                                        }}
                                    ></YakitButton>
                                </Tooltip>
                                <YakitDropdownMenu
                                    menu={{
                                        className: styles["packetHistoryDropdownMenu"],
                                        data: packetHistory.map((item, index) => {
                                            const urlNode = (
                                                <Typography.Text ellipsis={{tooltip: item.Url}} style={{maxWidth: 300}}>
                                                    {item.Url || "-"}
                                                </Typography.Text>
                                            )
                                            if (index === 0) {
                                                return {
                                                    key: index + "",
                                                    label: (
                                                        <>
                                                            {urlNode}
                                                            <YakitTag color='warning' size='small' border={false}>
                                                                {t("YakitRiskDetails.originReq")}
                                                            </YakitTag>
                                                        </>
                                                    )
                                                }
                                            }
                                            return {
                                                key: index + "",
                                                label: (
                                                    <>
                                                        {index}&nbsp;&nbsp;{urlNode}
                                                    </>
                                                )
                                            }
                                        }),
                                        onClick: ({key}) => {
                                            setPacketIndex(Number(key))
                                        }
                                    }}
                                    dropdown={{
                                        trigger: ["click"],
                                        placement: "bottomLeft"
                                    }}
                                >
                                    <YakitButton type='outline1' size='small' icon={<OutlineClockIcon />}>
                                        {t("YakitRiskDetails.verificationRecord")}
                                    </YakitButton>
                                </YakitDropdownMenu>
                            </div>
                        ) : (
                            <span>Response</span>
                        )}
                    </div>
                }
                onClickOpenPacketNewWindowMenu={() => {
                    openRiskNewWindow(info)
                }}
                {...extraParams}
            />
        )
    })
    const requestString = useMemoizedFn((info) => {
        return Uint8ArrayToString(info?.Request || new Uint8Array())
    })
    const responseString = useMemoizedFn((info) => {
        return Uint8ArrayToString(info?.Response || new Uint8Array())
    })

    const [showType, setShowType] = useControllableValue<"detail" | "code" | "history">(props, {
        defaultValue: "detail",
        valuePropName: "showType",
        trigger: "setShowType"
    })

    const getOptions = useMemo(() => {
        let options = [
            {
                label: t("YakitRiskDetails.vulnerability_details"),
                value: "detail"
            },
            {
                label: t("YakitRiskDetails.data_packet"),
                value: "code"
            }
        ]
        return options
    }, [i18n.language])

    const extraResizeBoxProps = useCreation(() => {
        let p: YakitResizeBoxProps = {
            firstNode: <></>,
            secondNode: <></>,
            firstRatio: "50%",
            secondRatio: "50%",
            lineStyle: {height: "auto"},
            firstNodeStyle: {height: "auto"}
        }
        return p
    }, [])
    return (
        <>
            <div
                className={classNames(
                    styles["yakit-risk-details-content"],
                    "yakit-descriptions",
                    {
                        [styles["yakit-risk-details-content-no-border"]]: !border
                    },
                    className
                )}
            >
                <div className={styles["content-heard"]}>
                    <div className={styles["content-heard-left"]}>
                        <div className={styles["content-heard-severity"]}>
                            {severityInfo.icon}
                            <span
                                className={classNames(
                                    styles["content-heard-severity-name"],
                                    styles[`severity-${severityInfo.tag}`]
                                )}
                            >
                                {t(severityInfo.nameUi || severityInfo.name)}
                            </span>
                        </div>
                        <Divider type='vertical' style={{height: 40, margin: "0 16px"}} />
                        <div className={styles["content-heard-body"]}>
                            <div className={classNames(styles["content-heard-body-title"], "content-ellipsis")}>
                                {info.Title || "-"}
                            </div>
                            <div className={styles["content-heard-body-description"]}>
                                <YakitTag color='info' style={{cursor: "pointer"}} onClick={onClickIP}>
                                    ID:{info.Id}
                                </YakitTag>
                                <span>IP:{info.IP || "-"}</span>
                                <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                                <span className={styles["description-port"]}>
                                    {t("YakitRiskDetails.port_colon")}
                                    {info.Port || "-"}
                                </span>
                                <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                                <span className={styles["url-info"]}>
                                    URL:
                                    <span className={classNames(styles["url"], "content-ellipsis")}>
                                        {info?.Url || "-"}
                                    </span>
                                    <CopyComponents copyText={info?.Url || "-"} />
                                </span>
                                {isShowTime && (
                                    <>
                                        <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                                        <span className={styles["content-heard-body-time"]}>
                                            {t("YakitRiskDetails.discovery_time_colon")}
                                            {!!info.CreatedAt ? formatTimestamp(info.CreatedAt) : "-"}
                                        </span>
                                    </>
                                )}
                                {!isShowCode && (
                                    <>
                                        <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                                        <YakitTag color='warning'>{t("YakitRiskDetails.no_data_packet")}</YakitTag>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    {isShowExtra && (
                        <div className={styles["content-heard-right"]}>
                            <FuncBtn
                                maxWidth={1200}
                                type='outline2'
                                icon={<OutlinePlayIcon />}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (onRetest) onRetest(info)
                                }}
                                name={t("YakitRiskDetails.retest")}
                            />
                        </div>
                    )}
                </div>
                {isShowCode && (
                    <YakitRadioButtons
                        style={{margin: 6}}
                        value={showType}
                        onChange={(e) => {
                            const value = e.target.value
                            setShowType(value)
                        }}
                        buttonStyle='solid'
                        options={getOptions}
                    />
                )}
                {showType === "detail" && (
                    <div className={classNames(styles["content-resize-second"], detailClassName)} ref={descriptionsRef}>
                        <Descriptions bordered size='small' column={column} labelStyle={{width: 120}}>
                            <Descriptions.Item label='Host'>{info.Host || "-"}</Descriptions.Item>
                            <Descriptions.Item label={t("YakitRiskDetails.type")}>
                                {(info?.RiskTypeVerbose || info.RiskType).replaceAll("NUCLEI-", "")}
                            </Descriptions.Item>
                            <Descriptions.Item label={t("YakitRiskDetails.source")}>
                                {info?.FromYakScript || t("YakitRiskDetails.vulnerability_detection")}
                            </Descriptions.Item>
                            <Descriptions.Item
                                label={t("YakitRiskDetails.reverse_token")}
                                contentStyle={{minWidth: 120}}
                            >
                                {info?.ReverseToken || "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label='Hash'>{info?.Hash || "-"}</Descriptions.Item>
                            <Descriptions.Item label={t("YakitRiskDetails.verification_status")}>
                                <YakitTag color={`${!info.WaitingVerified ? "success" : "info"}`}>
                                    {!info.WaitingVerified
                                        ? t("YakitRiskDetails.verified")
                                        : t("YakitRiskDetails.not_verified")}
                                </YakitTag>
                            </Descriptions.Item>

                            <>
                                <Descriptions.Item
                                    label={t("YakitRiskDetails.vulnerability_description")}
                                    span={column}
                                    contentStyle={{whiteSpace: "pre-wrap"}}
                                >
                                    {info.Description || "-"}
                                </Descriptions.Item>
                                <Descriptions.Item
                                    label={t("YakitRiskDetails.solution")}
                                    span={column}
                                    contentStyle={{whiteSpace: "pre-wrap"}}
                                >
                                    {info.Solution || "-"}
                                </Descriptions.Item>
                                <Descriptions.Item label='Parameter' span={column}>
                                    {info.Parameter || "-"}
                                </Descriptions.Item>
                                <Descriptions.Item label='Payload' span={column}>
                                    <div style={{maxHeight: 180, overflow: "auto"}}>{`${info.Payload}` || "-"}</div>
                                </Descriptions.Item>
                                <Descriptions.Item label={t("YakitRiskDetails.details")} span={column}>
                                    <div style={{height: 180}}>
                                        <YakitEditor type='yak' value={`${info.Details || ""}`} readOnly={true} />
                                    </div>
                                </Descriptions.Item>
                            </>
                        </Descriptions>
                        <div className={styles["no-more"]}>{t("YakitEmpty.noMoreData")}</div>
                    </div>
                )}

                {showType === "code" && isShowCode && (
                    <YakitResizeBox
                        style={{padding: 6, ...boxStyle}}
                        {...extraResizeBoxProps}
                        firstNode={<div className={styles["content-resize-first"]}>{codeNode(true)}</div>}
                        secondNode={<div className={styles["content-resize-first"]}>{codeNode(false)}</div>}
                        firstMinSize={300}
                        secondMinSize={300}
                    />
                )}
            </div>
        </>
    )
})

export const YakitRiskDetailContent: React.FC<YakitRiskDetailContentProps> = React.memo((props) => {
    const {info, isShowCollapse, setIsShowCollapse, jumpCodeScanPage, isShowExtra, isScroll} = props
    const {t, i18n} = useI18nNamespaces(["risk"])
    const [loading, setLoading] = useState<boolean>(false)
    const [yakURLData, setYakURLData] = useState<YakURLDataItemProps[]>([])
    const extraResizeBoxProps = useCreation(() => {
        let p: YakitResizeBoxProps = {
            firstNode: <></>,
            secondNode: <></>,
            firstRatio: "50%",
            secondRatio: "50%",
            lineStyle: {height: "auto"},
            firstNodeStyle: {height: "auto"}
        }
        if (!isShowCollapse) {
            p.firstRatio = "0%"
            p.secondRatio = "100%"
            p.lineStyle = {display: "none"}
            p.firstNodeStyle = {display: "none"}
            p.secondNodeStyle = {padding: 0}
        }
        return p
    }, [isShowCollapse])

    useEffect(() => {
        const {ResultID, SyntaxFlowVariable, ProgramName} = info

        if (ResultID && SyntaxFlowVariable && ProgramName) {
            const params: AuditEmiterYakUrlProps = {
                Schema: "syntaxflow",
                Location: ProgramName,
                Path: `/${SyntaxFlowVariable}`,
                Query: [{Key: "result_id", Value: ResultID}]
            }
            initData(params)
        }
    }, [info])

    const initData = useMemoizedFn(async (params: AuditEmiterYakUrlProps) => {
        try {
            setLoading(true)
            const {Body, ...auditYakUrl} = params
            const body = Body ? StringToUint8Array(Body) : undefined
            const result = await loadAuditFromYakURLRaw(auditYakUrl, body)

            if (result && result.Resources.length > 0) {
                const ResultID = result.Resources.find((item) => item.ResourceType === "result_id")?.ResourceName
                if (ResultID === info.ResultID) {
                    setLoading(false)
                    let arr: YakURLDataItemProps[] = []
                    result.Resources.filter((item) => item.ResourceType === "value").forEach((item) => {
                        let obj: any = {
                            index: "",
                            source: "",
                            ResourceName: item.ResourceName
                        }
                        item.Extra.forEach((itemIn) => {
                            if (["index", "source"].includes(itemIn.Key)) {
                                obj[itemIn.Key] = itemIn.Value
                            }
                            if (itemIn.Key === "code_range") {
                                try {
                                    obj[itemIn.Key] = JSON.parse(itemIn.Value)
                                } catch (error) {}
                            }
                        })
                        arr.push(obj)
                    })
                    setYakURLData(arr)
                    setIsShowCollapse(true)
                }
            } else {
                setLoading(false)
                setIsShowCollapse(false)
            }
        } catch (error) {
            setLoading(false)
            setIsShowCollapse(false)
        }
    })

    return (
        <YakitResizeBox
            {...extraResizeBoxProps}
            firstNode={
                <div className={styles["content-resize-collapse"]}>
                    <div className={styles["main-title"]}>{t("YakitRiskDetailContent.related_code_snippet")}</div>
                    <YakitSpin spinning={loading}>
                        <AuditResultCollapse
                            data={yakURLData}
                            jumpCodeScanPage={jumpCodeScanPage}
                            isShowExtra={isShowExtra}
                        />
                    </YakitSpin>
                </div>
            }
            secondNode={<AuditResultDescribe info={info} isScroll={isScroll} />}
            firstMinSize={200}
            secondMinSize={400}
        />
    )
})

export const YakitCodeScanRiskDetails: React.FC<YakitCodeScanRiskDetailsProps> = React.memo((props) => {
    const {info, className, border, isShowExtra} = props
    const {t, i18n} = useI18nNamespaces(["risk", "yakitUi"])
    const [isShowCollapse, setIsShowCollapse] = useState<boolean>(false)

    const onClickIP = useMemoizedFn(() => {
        if (props.onClickIP) props.onClickIP(info)
    })

    const severityInfo = useCreation(() => {
        return getSeverityIcon(info.Severity)
    }, [info.Severity])

    // 跳转到代码审计页面
    const jumpCodeScanPage = useMemoizedFn((value?: string) => {
        const {ProgramName, SyntaxFlowVariable, ResultID} = info
        if (ResultID && SyntaxFlowVariable && ProgramName) {
            // 跳转到审计页面的参数
            const params: AuditCodePageInfoProps = {
                Schema: "syntaxflow",
                Location: ProgramName,
                Path: `/`,
                Variable: SyntaxFlowVariable,
                Value: value,
                Query: [
                    {Key: "result_id", Value: ResultID},
                    {Key: "risk_hash", Value: info.Hash || ""}
                ]
            }

            emiter.emit(
                "openPage",
                JSON.stringify({
                    route: YakitRoute.YakRunner_Audit_Code,
                    params
                })
            )
        }
    })

    return (
        <div
            className={classNames(
                styles["yakit-risk-details-content"],
                "yakit-descriptions",
                {
                    [styles["yakit-risk-details-content-no-border"]]: !border
                },
                className
            )}
        >
            <div className={styles["content-heard"]}>
                <div className={styles["content-heard-left"]}>
                    <div className={styles["content-heard-severity"]}>
                        {severityInfo.icon}
                        <span
                            className={classNames(
                                styles["content-heard-severity-name"],
                                styles[`severity-${severityInfo.tag}`]
                            )}
                        >
                            {t(severityInfo.nameUi || severityInfo.name)}
                        </span>
                    </div>
                    <Divider type='vertical' style={{height: 40, margin: "0 16px"}} />
                    <div className={styles["content-heard-body"]}>
                        <div className={classNames(styles["content-heard-body-title"], "content-ellipsis")}>
                            {info?.TitleVerbose || info.Title || "-"}
                        </div>
                        <div className={styles["content-heard-body-description"]}>
                            <YakitTag color='info' style={{cursor: "pointer"}} onClick={onClickIP}>
                                ID:{info.Id}
                            </YakitTag>
                            <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                            <span className={styles["description-port"]}>
                                {t("YakitCodeScanRiskDetails.project")}
                                {info.ProgramName || "-"}
                            </span>
                            <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                            <span className={styles["content-heard-body-time"]}>
                                {t("YakitCodeScanRiskDetails.discovery_time_colon")}
                                {!!info.CreatedAt ? formatTimestamp(info.CreatedAt) : "-"}
                            </span>
                        </div>
                    </div>
                </div>
                {isShowExtra && (
                    <div className={styles["content-heard-right"]} style={{height: "100%", alignItems: "center"}}>
                        {isShowCollapse ? (
                            <YakitButton
                                type='outline2'
                                icon={<OutlineTerminalIcon />}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    jumpCodeScanPage()
                                }}
                            >
                                {t("YakitCodeScanRiskDetails.open_in_code_audit")}
                            </YakitButton>
                        ) : (
                            <Tooltip title={t("YakitCodeScanRiskDetails.related_data_deleted")} placement='topLeft'>
                                <div className={styles["disabled-open"]}>
                                    <OutlineTerminalIcon />
                                    {t("YakitCodeScanRiskDetails.open_in_code_audit")}
                                </div>
                            </Tooltip>
                        )}
                    </div>
                )}
            </div>
            <YakitRiskDetailContent info={info} isShowCollapse={isShowCollapse} setIsShowCollapse={setIsShowCollapse} />
        </div>
    )
})

export interface AuditResultDescribeProps {
    info: SSARisk
    columnSize?: number
    isScroll?: boolean
}

export const AuditResultDescribe: React.FC<AuditResultDescribeProps> = React.memo((props) => {
    const {info, columnSize, isScroll = true} = props
    const {t, i18n} = useI18nNamespaces(["risk", "yakitUi"])

    const column = useCreation(() => {
        if (columnSize) return columnSize
        return 1
    }, [])

    const getRule = useMemoizedFn(() => {
        const newInfo = info as any
        return newInfo?.FromYakScript || newInfo?.FromRule || t("AuditResultDescribe.vulnerability_detection")
    })

    const jumpRuleManagementPage = useMemoizedFn(() => {
        let value = getRule()
        // 跳转到审计页面的参数
        const params: RuleManagementPageInfoProps = {
            RuleNames: value ? [value] : []
        }
        emiter.emit(
            "openPage",
            JSON.stringify({
                route: YakitRoute.Rule_Management,
                params
            })
        )
    })
    return (
        <div
            className={classNames(styles["content-resize-second"], {
                [styles["content-resize-overflow"]]: isScroll
            })}
        >
            <Descriptions bordered size='small' column={column} labelStyle={{width: 120}}>
                <Descriptions.Item label={t("AuditResultDescribe.type")}>
                    {(info?.RiskTypeVerbose || info.RiskType).replaceAll("NUCLEI-", "")}
                </Descriptions.Item>
                <Descriptions.Item label='Hash'>{info?.Hash || "-"}</Descriptions.Item>
                <Descriptions.Item label={t("AuditResultDescribe.scan_rules")}>
                    <span className={styles["scan-rule-box"]} onClick={jumpRuleManagementPage}>
                        {getRule()}
                    </span>
                </Descriptions.Item>
                <>
                    <Descriptions.Item label={t("AuditResultDescribe.vulnerability_description")} span={column}>
                        {info.Description ? (
                            <SafeMarkdown
                                className={classNames(styles["md-content"])}
                                source={info.Description}
                                style={{whiteSpace: "normal"}}
                            />
                        ) : (
                            "-"
                        )}
                    </Descriptions.Item>
                    <Descriptions.Item label={t("AuditResultDescribe.solution")} span={column}>
                        {info.Solution ? (
                            <SafeMarkdown
                                className={classNames(styles["md-content"])}
                                source={info.Solution}
                                style={{whiteSpace: "normal"}}
                            />
                        ) : (
                            "-"
                        )}
                    </Descriptions.Item>
                </>
            </Descriptions>
            <div className={styles["no-more"]}>{t("YakitEmpty.noMoreData")}</div>
        </div>
    )
})

interface RightBugAuditResultHeaderProps {
    info: SSARisk
    extra?: React.ReactNode
}

export const RightBugAuditResultHeader: React.FC<RightBugAuditResultHeaderProps> = React.memo((props) => {
    const {info, extra} = props
    const {t, i18n} = useI18nNamespaces(["risk", "yakitUi"])
    const severityInfo = useCreation(() => {
        return getSeverityIcon(info.Severity)
    }, [info.Severity])

    const onContext = useMemoizedFn(async () => {
        try {
            const item: CodeRangeProps = JSON.parse(info.CodeRange)
            const {url, start_line, start_column, end_line, end_column} = item
            const name = await getNameByPath(url)
            const highLightRange: Selection = {
                startLineNumber: start_line,
                startColumn: start_column,
                endLineNumber: end_line,
                endColumn: end_column
            }
            const OpenFileByPathParams: OpenFileByPathProps = {
                params: {
                    path: url,
                    name,
                    highLightRange
                }
            }
            emiter.emit("onCodeAuditOpenFileByPath", JSON.stringify(OpenFileByPathParams))
            // 纯跳转行号
            setTimeout(() => {
                const obj: JumpToAuditEditorProps = {
                    selections: highLightRange,
                    path: url,
                    isSelect: false
                }
                emiter.emit("onCodeAuditJumpEditorDetail", JSON.stringify(obj))
            }, 100)
        } catch (error) {}
    })

    return (
        <div className={styles["content-heard"]}>
            <div className={styles["content-heard-left"]}>
                <div className={styles["content-heard-severity"]}>
                    {severityInfo.icon}
                    <span
                        className={classNames(
                            styles["content-heard-severity-name"],
                            styles[`severity-${severityInfo.tag}`]
                        )}
                    >
                        {t(severityInfo.nameUi || severityInfo.name)}
                    </span>
                </div>
                <Divider type='vertical' style={{height: 40, margin: "0 16px"}} />
                <div className={styles["content-heard-body"]}>
                    <div
                        className={classNames(
                            styles["content-heard-body-title"],
                            styles["content-heard-body-title-click"],
                            "content-ellipsis"
                        )}
                        onClick={onContext}
                    >
                        {info.Title || "-"}
                    </div>
                    <div className={styles["content-heard-body-description"]} style={{flexWrap: "wrap"}}>
                        <YakitTag color='info'>ID:{info.Id}</YakitTag>
                        <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                        <span className={styles["description-port"]}>
                            {t("RightBugAuditResultHeader.project")}
                            {info.ProgramName || "-"}
                        </span>
                        <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                        <span className={styles["content-heard-body-time"]}>
                            {t("RightBugAuditResultHeader.discovery_time_colon")}
                            {!!info.CreatedAt ? formatTimestamp(info.CreatedAt) : "-"}
                        </span>
                    </div>
                </div>
            </div>
            {extra && <div className={styles["content-heard-right"]}>{extra}</div>}
        </div>
    )
})

export interface RightBugAuditResultProps {
    info: SSARisk
    columnSize?: number
    isScroll?: boolean
    extra?: React.ReactNode
    boxStyle?: React.CSSProperties
}

export const RightBugAuditResult: React.FC<RightBugAuditResultProps> = React.memo((props) => {
    const {info, columnSize, extra, boxStyle} = props

    return (
        <div
            className={classNames(styles["yakit-risk-details-content"], "yakit-descriptions", {
                [styles["yakit-risk-details-content-no-border"]]: true
            })}
            style={boxStyle}
        >
            <RightBugAuditResultHeader info={info} extra={extra} />
            <AuditResultDescribe info={info} columnSize={columnSize} />
        </div>
    )
})

interface AuditResultCollapseProps {
    data: YakURLDataItemProps[]
    jumpCodeScanPage?: (v: string) => void
    isShowExtra?: boolean
    collapseProps?: CollapseProps
}

export const AuditResultCollapse: React.FC<AuditResultCollapseProps> = React.memo((props) => {
    const {data, jumpCodeScanPage, isShowExtra, collapseProps} = props
    const {t, i18n} = useI18nNamespaces(["risk"])

    const titleRender = (info: YakURLDataItemProps) => {
        const {index, code_range, source, ResourceName} = info
        const lastSlashIndex = code_range.url.lastIndexOf("/")
        const fileName = code_range.url.substring(lastSlashIndex + 1)
        return (
            <div className={styles["node-content"]}>
                <div className={classNames(styles["content-body"])}>
                    <div className={classNames(styles["name"], "yakit-content-single-ellipsis")}>{ResourceName}</div>
                    <Tooltip title={`${code_range.url}:${code_range.start_line}`}>
                        <div className={classNames(styles["detail"], "yakit-content-single-ellipsis")}>
                            {fileName}:{code_range.start_line}
                        </div>
                    </Tooltip>
                </div>
                {isShowExtra && (
                    <Tooltip title={t("AuditResultCollapse.open_in_code_audit")}>
                        <YakitButton
                            type='text2'
                            icon={<OutlineTerminalIcon />}
                            onClick={(e) => {
                                e.stopPropagation()
                                jumpCodeScanPage && jumpCodeScanPage(`/${index}`)
                            }}
                        />
                    </Tooltip>
                )}
            </div>
        )
    }

    const renderItem = (info: YakURLDataItemProps) => {
        return <YakRiskCodemirror info={info} />
    }
    return (
        <div className={styles["audit-result-collapse"]}>
            <CollapseList
                type='sideBar'
                // onlyKey='index'
                list={data}
                titleRender={titleRender}
                renderItem={renderItem}
                collapseProps={collapseProps}
            />
        </div>
    )
})

interface YakRiskCodemirrorProps {
    info: YakURLDataItemProps
    editorDidMount?: (editor: any) => void
}

export const YakRiskCodemirror: React.FC<YakRiskCodemirrorProps> = React.memo((props) => {
    const {info, editorDidMount} = props
    const filename = info.code_range.url.split("/").pop()
    const {start_line, end_line, source_code_line, start_column, end_column} = info.code_range
    return (
        <YakCodemirror
            readOnly={true}
            fileName={filename}
            value={info.source}
            firstLineNumber={source_code_line}
            highLight={{
                from: {line: start_line - source_code_line, ch: start_column}, // 开始位置
                to: {line: end_line - source_code_line, ch: end_column} // 结束位置
            }}
            editorDidMount={editorDidMount}
        />
    )
})
