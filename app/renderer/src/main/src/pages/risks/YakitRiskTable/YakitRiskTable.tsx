import React, {ReactNode, useEffect, useMemo, useRef, useState} from "react"
import {
    QueryRisksRequest,
    QueryRisksResponse,
    YakitCodeScanRiskDetailsProps,
    YakitRiskDetailsProps,
    YakitRiskSelectTagProps,
    YakitRiskTableProps,
    YakURLDataItemProps
} from "./YakitRiskTableType"
import styles from "./YakitRiskTable.module.scss"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {Risk} from "../schema"
import {Badge, CollapseProps, Descriptions, Divider, Form, Tooltip} from "antd"
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
    OutlineExportIcon,
    OutlineEyeIcon,
    OutlineOpenIcon,
    OutlinePlayIcon,
    OutlineRefreshIcon,
    OutlineSearchIcon,
    OutlineTerminalIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import cloneDeep from "lodash/cloneDeep"
import {formatTimestamp} from "@/utils/timeUtil"
import {SolidRefreshIcon} from "@/assets/icon/solid"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {
    DeleteRiskRequest,
    ExportHtmlProps,
    FieldGroup,
    SetTagForRiskRequest,
    apiDeleteRisk,
    apiExportHtml,
    apiNewRiskRead,
    apiQueryAvailableRiskType,
    apiQueryRiskTags,
    apiQueryRisks,
    apiQueryRisksIncrementOrderDesc,
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
import {getHtmlTemplate} from "./htmlTemplate"
import {yakitNotify} from "@/utils/notification"
import moment from "moment"
import {FieldName} from "../RiskTable"
import {defQueryRisksRequest} from "./constants"
import emiter from "@/utils/eventBus/eventBus"
import {FuncBtn} from "@/pages/plugins/funcTemplate"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {YakitRoute} from "@/enums/yakitRoute"
import {AuditCodePageInfoProps, PluginHubPageInfoProps} from "@/store/pageInfo"
import {grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"
import ReactResizeDetector from "react-resize-detector"
import {serverPushStatus} from "@/utils/duplex/duplex"
import useListenWidth from "@/pages/pluginHub/hooks/useListenWidth"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {loadAuditFromYakURLRaw} from "@/pages/yakRunnerAuditCode/utils"
import {AuditEmiterYakUrlProps} from "@/pages/yakRunnerAuditCode/YakRunnerAuditCodeType"
import {CollapseList} from "@/pages/yakRunner/CollapseList/CollapseList"
import {addToTab} from "@/pages/MainTabs"
import {YakCodemirror} from "@/components/yakCodemirror/YakCodemirror"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {SSARisk} from "@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType"

export const isShowCodeScanDetail = (selectItem: Risk) => {
    const {ResultID, SyntaxFlowVariable, ProgramName} = selectItem
    if (ResultID && SyntaxFlowVariable && ProgramName) {
        return true
    }
    return false
}

const batchExportMenuData: YakitMenuItemProps[] = [
    {
        key: "export-csv",
        label: "导出 CSV"
    },
    {
        key: "export-html",
        label: "导出 html"
    }
]
const batchRefreshMenuData: YakitMenuItemProps[] = [
    {
        key: "noResetRefresh",
        label: "仅刷新"
    },
    {
        key: "resetRefresh",
        label: "重置查询条件刷新"
    }
]

/**name字段里面的内容不可随意更改，与查询条件有关 */
export const SeverityMapTag = [
    {
        key: ["info", "fingerprint", "infof", "default"],
        value: "title-info",
        name: "信息",
        tag: "success"
    },
    {key: ["low"], value: "title-low", name: "低危", tag: "warning"},
    {
        key: ["middle", "warn", "warning", "medium"],
        value: "title-middle",
        name: "中危",
        tag: "info"
    },
    {key: ["high"], value: "title-high", name: "高危", tag: "danger"},
    {
        key: ["fatal", "critical", "panic"],
        value: "title-fatal",
        name: "严重",
        tag: "serious"
    }
]
/**漏洞风险导出字段及其属性 */
const exportFields = [
    {
        label: "漏洞标题",
        value: "TitleVerbose",
        isDefaultChecked: true
    },
    {
        label: "IP",
        value: "IP",
        isDefaultChecked: true
    },
    {
        label: "漏洞等级",
        value: "Severity",
        isDefaultChecked: true
    },
    {
        label: "漏洞类型",
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
        label: "发现时间",
        value: "CreatedAt",
        isDefaultChecked: true
    },
    {
        label: "端口",
        value: "Port",
        isDefaultChecked: true
    },
    {
        label: "漏洞描述",
        value: "Description",
        isDefaultChecked: true
    },
    {
        label: "解决方案",
        value: "Solution",
        isDefaultChecked: true
    },
    {
        label: "来源",
        value: "FromYakScript",
        isDefaultChecked: false
    },
    {
        label: "反连 Token",
        value: "ReverseToken",
        isDefaultChecked: false
    },
    {
        label: "参数",
        value: "Parameter",
        isDefaultChecked: false
    },
    {
        label: "Payload",
        value: "Payload",
        isDefaultChecked: false
    }
]
const yakitRiskCellStyle = {
    信息: {
        font: {
            color: {rgb: "56c991"}
        }
    },
    低危: {
        font: {
            color: {rgb: "ffb660"}
        }
    },
    中危: {
        font: {
            color: {rgb: "f28b44"}
        }
    },
    高危: {
        font: {
            color: {rgb: "f6544a"}
        }
    },
    严重: {
        font: {
            color: {rgb: "bd2a21"}
        }
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
    const [loading, setLoading] = useState<boolean>(false)

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

    const [exportTitle, setExportTitle] = useState<string[]>([])

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
                title: "序号",
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
                title: "标题",
                dataKey: "TitleVerbose",
                filterProps: {
                    filterKey: "Title",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                },
                render: (_, record) => record?.TitleVerbose || record.Title || "-"
            },
            {
                title: "类型",
                dataKey: "RiskTypeVerbose",
                filterProps: {
                    filterKey: "RiskTypeList",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: riskTypeVerboseTable
                }
            },
            {
                title: "等级",
                dataKey: "Severity",
                width: 75,
                align: "center",
                render: (_, i: Risk) => {
                    const title = SeverityMapTag.filter((item) => item.key.includes(i.Severity || ""))[0]
                    return (
                        <YakitTag color={title?.tag as YakitTagColor} className={styles["table-severity-tag"]}>
                            {title ? title.name : i.Severity || "-"}
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
                            label: "严重"
                        },
                        {
                            value: "high",
                            label: "高危"
                        },
                        {
                            value: "warning",
                            label: "中危"
                        },
                        {
                            value: "low",
                            label: "低危"
                        },
                        {
                            value: "info",
                            label: "信息"
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
                title: "处置状态",
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
                title: "发现时间",
                dataKey: "CreatedAt",
                render: (text) => (text ? formatTimestamp(text) : "-")
            },
            {
                title: "操作",
                dataKey: "action",
                width: 100,
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
                        {isShowCodeScanDetail(record) ? (
                            <Tooltip title={"在代码审计中打开"}>
                                <YakitButton
                                    type='text'
                                    icon={<OutlineTerminalIcon />}
                                    onClick={() => {
                                        const params: AuditCodePageInfoProps = {
                                            Schema: "syntaxflow",
                                            Location: record.ProgramName || "",
                                            Path: `/`,
                                            Query: [{Key: "result_id", Value: record.ResultID || 0}]
                                        }
                                        emiter.emit(
                                            "openPage",
                                            JSON.stringify({
                                                route: YakitRoute.YakRunner_Audit_Code,
                                                params
                                            })
                                        )
                                    }}
                                />
                            </Tooltip>
                        ) : (
                            <Tooltip
                                title='复测'
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
                        )}
                    </>
                )
            }
        ]
        return columnArr.filter((ele) => !excludeColumnsKey.includes(ele.dataKey))
    }, [riskTypeVerbose, tag, excludeColumnsKey])
    /**复测 */
    const onRetest = useMemoizedFn((record: Risk) => {
        if (record.YakScriptUUID || record.FromYakScript) {
            grpcFetchLocalPluginDetail({Name: record.FromYakScript || "", UUID: record.YakScriptUUID}).then(
                (yakScript: YakScript) => {
                    const info = {
                        route: YakitRoute.Plugin_Hub,
                        params: {
                            tabActive: "local",
                            detailInfo: {uuid: yakScript.UUID, name: yakScript.ScriptName, isCorePlugin: !!yakScript?.IsCorePlugin}
                        } as PluginHubPageInfoProps
                    }
                    emiter.emit("openPage", JSON.stringify(info))
                }
            )
        } else {
            yakitNotify("error", "该漏洞未经插件扫描")
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
                    序号【{record.Id}】- {record.TitleVerbose || record.Title}
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
        const exportValue = exportFields.map((item) => item.label)
        const initCheckFields = exportFields.filter((ele) => ele.isDefaultChecked).map((item) => item.label)
        const m = showYakitModal({
            title: "选择导出字段",
            content: (
                <ExportSelect
                    exportValue={exportValue}
                    initCheckValue={initCheckFields}
                    setExportTitle={setExportTitle}
                    exportKey={RemoteGV.RiskExportFields}
                    getData={getExcelData}
                    onClose={() => m.destroy()}
                    fileName='风险与漏洞'
                />
            ),
            onCancel: () => {
                m.destroy()
                setSelectList([])
            },
            footer: null,
            width: 650
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
                    const value = v["FromYakScript"] || "漏洞检测"
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
                    return title ? title.name : v["Severity"] || "-"
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
            exportTitle.forEach((item) => {
                const itemData = exportFields.filter((itemIn) => itemIn.label === item)[0]
                header.push(item)
                filterVal.push(itemData.value)
            })
            const number = filterVal.findIndex((ele) => ele === "Severity")
            let optsSingleCellSetting = {}
            if (number !== -1) {
                optsSingleCellSetting = {
                    c: number, // 第*列，
                    colorObj: yakitRiskCellStyle // 字体颜色设置
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
        const htmlContent = getHtmlTemplate()
        const params: ExportHtmlProps = {
            htmlContent,
            fileName: `riskTable-${moment().valueOf()}`,
            data: newRisks
        }
        apiExportHtml(params).catch((error) => {
            yakitNotify("error", `导出html失败:${error}`)
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
            IsRead: type === "all" ? "" : "false"
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
        }
    })
    const onSetCurrentRow = useMemoizedFn((val?: Risk) => {
        if (!val) {
            setCurrentSelectItem(undefined)
            return
        }
        if (val?.Id !== currentSelectItem?.Id) {
            setCurrentSelectItem(val)
        }
        if (!val.IsRead) {
            apiNewRiskRead({Filter:{...query,Ids: [val.Id]}}).then(() => {
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
        apiNewRiskRead({Filter:{...query,Ids: []}}).then(() => {
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
            data: [{key: "delete-repeat-title", label: "删除重复标题数据"}],
            onClick: ({key}) => onRightMenuSelect(key, rowData)
        })
    })
    const onRightMenuSelect = useMemoizedFn((key: string, rowData: Risk) => {
        switch (key) {
            case "delete-repeat-title":
                onDeleteRepeatTitle(rowData)
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
                                                title='展开筛选'
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
                                        <div className={styles["table-renderTitle-text"]}>风险与漏洞</div>
                                        <YakitRadioButtons
                                            value={type}
                                            onChange={(e) => {
                                                setType(e.target.value)
                                            }}
                                            buttonStyle='solid'
                                            options={[
                                                {
                                                    value: "all",
                                                    label: "全部"
                                                },
                                                {
                                                    value: "false",
                                                    label: "未读"
                                                }
                                            ]}
                                        />
                                        <div className={styles["virtual-table-heard-right"]}>
                                            <div className={styles["virtual-table-heard-right-item"]}>
                                                <span className={styles["virtual-table-heard-right-text"]}>Total</span>
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
                                    </div>
                                    <div className={styles["table-head-extra"]}>
                                        <YakitInput.Search
                                            value={keywords}
                                            onChange={(e) => setKeywords(e.target.value)}
                                            placeholder='请输入关键词搜索'
                                            onSearch={onSearch}
                                            onPressEnter={onPressEnter}
                                        />
                                        <Divider type='vertical' style={{margin: 0}} />
                                        <FuncBtn
                                            maxWidth={1200}
                                            type='outline2'
                                            icon={<OutlineEyeIcon />}
                                            onClick={onAllRead}
                                            name='全部已读'
                                        />
                                        <YakitDropdownMenu
                                            menu={{
                                                data: batchExportMenuData,
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
                                                name=' 导出为...'
                                                disabled={allTotal === 0}
                                            />
                                        </YakitDropdownMenu>
                                        <YakitPopconfirm
                                            title={
                                                allCheck
                                                    ? "确定删除所有风险与漏洞吗? 不可恢复"
                                                    : "确定删除选择的风险与漏洞吗?不可恢复"
                                            }
                                            onConfirm={onRemove}
                                        >
                                            <FuncBtn
                                                maxWidth={1200}
                                                type='outline1'
                                                colors='danger'
                                                icon={<OutlineTrashIcon />}
                                                disabled={allTotal === 0}
                                                name={selectNum === 0 ? "清空" : "删除"}
                                            />
                                        </YakitPopconfirm>
                                        <YakitDropdownMenu
                                            menu={{
                                                data: batchRefreshMenuData,
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
                        {...(tableVirtualResizeProps || {})}
                    />
                }
                secondNode={
                    currentSelectItem && (
                        <>
                            {isShowCodeScanDetail(currentSelectItem) ? (
                                <YakitCodeScanRiskDetails
                                    info={currentSelectItem}
                                    onClickIP={onClickIP}
                                    className={styles["yakit-code-scan-risk-details"]}
                                    isShowExtra={true}
                                />
                            ) : (
                                <YakitRiskDetails
                                    info={currentSelectItem}
                                    className={styles["yakit-risk-details"]}
                                    onClickIP={onClickIP}
                                    border={yakitRiskDetailsBorder}
                                    isShowExtra={!excludeColumnsKey.includes("action")}
                                    onRetest={onRetest}
                                />
                            )}
                        </>
                    )
                }
                {...ResizeBoxProps}
            />
        </div>
    )
})
const defaultTags = [
    {
        label: "误报",
        value: "误报"
    },
    {
        label: "忽略",
        value: "忽略"
    },
    {
        label: "已处理",
        value: "已处理"
    },
    {
        label: "待处理",
        value: "待处理"
    }
]
const YakitRiskSelectTag: React.FC<YakitRiskSelectTagProps> = React.memo((props) => {
    const {info, onClose, onSave} = props
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
            return !defaultTags.find((i) => i.value === item.value)
        })
        return defaultTags.concat(list)
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
                        取消
                    </YakitButton>
                    <YakitButton htmlType='submit'>确定</YakitButton>
                </div>
            </Form>
        </div>
    )
})

export const YakitRiskDetails: React.FC<YakitRiskDetailsProps> = React.memo((props) => {
    const {info, isShowTime = true, className = "", border = true, isShowExtra, onRetest} = props
    const [currentSelectShowType, setCurrentSelectShowType] = useState<"request" | "response">("request")
    const [isShowCode, setIsShowCode] = useState<boolean>(true)
    const descriptionsRef = useRef<HTMLDivElement>(null)
    const descriptionsDivWidth = useListenWidth(descriptionsRef)

    useEffect(() => {
        const isRequestString = !!requestString(info)
        const isResponseString = !!responseString(info)
        if (isRequestString) {
            setCurrentSelectShowType("request")
        } else if (isResponseString) {
            setCurrentSelectShowType("response")
        }
        if (isRequestString || isResponseString) {
            setIsShowCode(true)
        } else {
            setIsShowCode(false)
        }
    }, [info])

    const severityInfo = useCreation(() => {
        const severity = SeverityMapTag.filter((item) => item.key.includes(info.Severity || ""))[0]
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
            name: severity?.name || info?.Severity || "-"
        }
    }, [info.Severity])
    const onClickIP = useMemoizedFn(() => {
        if (props.onClickIP) props.onClickIP(info)
    })
    const column = useCreation(() => {
        if (descriptionsDivWidth > 600) return 3
        return 1
    }, [descriptionsDivWidth])
    const codeNode = useMemoizedFn(() => {
        const isHttps = !!info.Url && info.Url?.length > 0 && info.Url.includes("https")
        const extraParams = {
            originValue: currentSelectShowType === "request" ? requestString(info) : responseString(info),
            originalPackage: currentSelectShowType === "request" ? info.Request : info.Response,
            webFuzzerValue: currentSelectShowType === "request" ? "" : requestString(info)
        }
        return (
            <NewHTTPPacketEditor
                defaultHttps={isHttps}
                url={info.Url || ""}
                readOnly={true}
                isShowBeautifyRender={true}
                showDefaultExtra={true}
                hideSearch={true}
                noHex={true}
                noModeTag={true}
                simpleMode={true}
                bordered={false}
                isResponse={currentSelectShowType === "response"}
                title={
                    <div className={styles["content-resize-first-heard"]}>
                        <YakitRadioButtons
                            size='small'
                            value={currentSelectShowType}
                            onChange={(e) => {
                                setCurrentSelectShowType(e.target.value)
                            }}
                            buttonStyle='solid'
                            options={[
                                {
                                    value: "request",
                                    label: "请求"
                                },
                                {
                                    value: "response",
                                    label: "响应"
                                }
                            ]}
                        />
                    </div>
                }
                downbodyParams={{IsRisk: true, Id: info.Id, IsRequest: currentSelectShowType === "request"}}
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
    const extraResizeBoxProps = useCreation(() => {
        let p: YakitResizeBoxProps = {
            firstNode: <></>,
            secondNode: <></>,
            firstRatio: "50%",
            secondRatio: "50%",
            lineStyle: {height: "auto"},
            firstNodeStyle: {height: "auto"}
        }
        if (!isShowCode) {
            p.firstRatio = "0%"
            p.secondRatio = "100%"
            p.lineStyle = {display: "none"}
            p.firstNodeStyle = {display: "none"}
            p.secondNodeStyle = {padding: 0}
        }
        return p
    }, [isShowCode])

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
                                {severityInfo.name}
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
                                <span className={styles["description-port"]}>端口:{info.Port || "-"}</span>
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
                                            发现时间:{!!info.CreatedAt ? formatTimestamp(info.CreatedAt) : "-"}
                                        </span>
                                    </>
                                )}
                                {!isShowCode && (
                                    <>
                                        <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                                        <YakitTag color='warning'>无数据包</YakitTag>
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
                                name='复测'
                            />
                        </div>
                    )}
                </div>
                <YakitResizeBox
                    {...extraResizeBoxProps}
                    firstNode={<div className={styles["content-resize-first"]}>{codeNode()}</div>}
                    secondNode={
                        <div className={styles["content-resize-second"]} ref={descriptionsRef}>
                            <Descriptions bordered size='small' column={column} labelStyle={{width: 120}}>
                                <Descriptions.Item label='Host'>{info.Host || "-"}</Descriptions.Item>
                                <Descriptions.Item label='类型'>
                                    {(info?.RiskTypeVerbose || info.RiskType).replaceAll("NUCLEI-", "")}
                                </Descriptions.Item>
                                <Descriptions.Item label='来源'>{info?.FromYakScript || "漏洞检测"}</Descriptions.Item>
                                <Descriptions.Item label='反连Token' contentStyle={{minWidth: 120}}>
                                    {info?.ReverseToken || "-"}
                                </Descriptions.Item>
                                <Descriptions.Item label='Hash'>{info?.Hash || "-"}</Descriptions.Item>
                                <Descriptions.Item label='验证状态'>
                                    <YakitTag color={`${!info.WaitingVerified ? "success" : "info"}`}>
                                        {!info.WaitingVerified ? "已验证" : "未验证"}
                                    </YakitTag>
                                </Descriptions.Item>

                                <>
                                    <Descriptions.Item
                                        label='漏洞描述'
                                        span={column}
                                        contentStyle={{whiteSpace: "pre-wrap"}}
                                    >
                                        {info.Description || "-"}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label='解决方案'
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
                                    <Descriptions.Item label='详情' span={column}>
                                        <div style={{height: 180}}>
                                            <YakitEditor type='yak' value={`${info.Details || ""}`} readOnly={true} />
                                        </div>
                                    </Descriptions.Item>
                                </>
                            </Descriptions>
                            <div className={styles["no-more"]}>暂无更多</div>
                        </div>
                    }
                    firstMinSize={200}
                    secondMinSize={400}
                />
            </div>
        </>
    )
})

export const YakitCodeScanRiskDetails: React.FC<YakitCodeScanRiskDetailsProps> = React.memo((props) => {
    const {info, className, border, isShowExtra} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [yakURLData, setYakURLData] = useState<YakURLDataItemProps[]>([])

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

    const [isShowCollapse, setIsShowCollapse] = useState<boolean>(false)
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

    const onClickIP = useMemoizedFn(() => {
        if (props.onClickIP) props.onClickIP(info)
    })

    const severityInfo = useCreation(() => {
        const severity = SeverityMapTag.filter((item) => item.key.includes(info.Severity || ""))[0]
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
            name: severity?.name || info?.Severity || "-"
        }
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
                Query: [{Key: "result_id", Value: ResultID}]
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
                            {severityInfo.name}
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
                            <span className={styles["description-port"]}>所属项目:{info.ProgramName || "-"}</span>
                            <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                            <span className={styles["content-heard-body-time"]}>
                                发现时间:{!!info.CreatedAt ? formatTimestamp(info.CreatedAt) : "-"}
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
                                在代码审计中打开
                            </YakitButton>
                        ) : (
                            <Tooltip title={`相关数据已被删除`} placement='topLeft'>
                                <div className={styles["disabled-open"]}>
                                    <OutlineTerminalIcon />
                                    在代码审计中打开
                                </div>
                            </Tooltip>
                        )}
                    </div>
                )}
            </div>
            <YakitResizeBox
                {...extraResizeBoxProps}
                firstNode={
                    <div className={styles["content-resize-collapse"]}>
                        <div className={styles["main-title"]}>相关代码段</div>
                        <YakitSpin spinning={loading}>
                            <AuditResultCollapse
                                data={yakURLData}
                                jumpCodeScanPage={jumpCodeScanPage}
                                isShowExtra={isShowExtra}
                            />
                        </YakitSpin>
                    </div>
                }
                secondNode={<AuditResultDescribe info={info} />}
                firstMinSize={200}
                secondMinSize={400}
            />
        </div>
    )
})

export interface AuditResultDescribeProps {
    info: Risk | SSARisk
    columnSize?: number
}

export const AuditResultDescribe: React.FC<AuditResultDescribeProps> = React.memo((props) => {
    const {info, columnSize} = props

    const column = useCreation(() => {
        if (columnSize) return columnSize
        return 1
    }, [])

    const getRule = useMemoizedFn(() => {
        const newInfo = info as any
        return newInfo?.FromYakScript || newInfo?.FromRule || "漏洞检测"
    })
    return (
        <div className={styles["content-resize-second"]}>
            <Descriptions bordered size='small' column={column} labelStyle={{width: 120}}>
                <Descriptions.Item label='类型'>
                    {(info?.RiskTypeVerbose || info.RiskType).replaceAll("NUCLEI-", "")}
                </Descriptions.Item>
                <Descriptions.Item label='Hash'>{info?.Hash || "-"}</Descriptions.Item>
                <Descriptions.Item label='扫描规则'>{getRule()}</Descriptions.Item>
                <>
                    <Descriptions.Item label='漏洞描述' span={column} contentStyle={{whiteSpace: "pre-wrap"}}>
                        {info.Description || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label='解决方案' span={column} contentStyle={{whiteSpace: "pre-wrap"}}>
                        {info.Solution || "-"}
                    </Descriptions.Item>
                </>
            </Descriptions>
            <div className={styles["no-more"]}>暂无更多</div>
        </div>
    )
})

export const RightBugAuditResult: React.FC<AuditResultDescribeProps> = React.memo((props) => {
    const {info, columnSize} = props

    const column = useCreation(() => {
        if (columnSize) return columnSize
        return 1
    }, [])

    const severityInfo = useCreation(() => {
        const severity = SeverityMapTag.filter((item) => item.key.includes(info.Severity || ""))[0]
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
            name: severity?.name || info?.Severity || "-"
        }
    }, [info.Severity])

    const getRule = useMemoizedFn(() => {
        const newInfo = info as any
        return newInfo?.FromYakScript || newInfo?.FromRule || "漏洞检测"
    })
    return (
        <div
            className={classNames(styles["yakit-risk-details-content"], "yakit-descriptions", {
                [styles["yakit-risk-details-content-no-border"]]: true
            })}
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
                            {severityInfo.name}
                        </span>
                    </div>
                    <Divider type='vertical' style={{height: 40, margin: "0 16px"}} />
                    <div className={styles["content-heard-body"]}>
                        <div className={classNames(styles["content-heard-body-title"], "content-ellipsis")}>
                            {info.Title || "-"}
                        </div>
                        <div className={styles["content-heard-body-description"]} style={{flexWrap: "wrap"}}>
                            <YakitTag color='info'>ID:{info.Id}</YakitTag>
                            <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                            <span className={styles["description-port"]}>所属项目:{info.ProgramName || "-"}</span>
                            <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                            <span className={styles["content-heard-body-time"]}>
                                发现时间:{!!info.CreatedAt ? formatTimestamp(info.CreatedAt) : "-"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles["content-resize-second"]}>
                <Descriptions bordered size='small' column={column} labelStyle={{width: 120}}>
                    <Descriptions.Item label='类型'>
                        {(info?.RiskTypeVerbose || info.RiskType).replaceAll("NUCLEI-", "")}
                    </Descriptions.Item>
                    <Descriptions.Item label='Hash'>{info?.Hash || "-"}</Descriptions.Item>
                    <Descriptions.Item label='扫描规则'>{getRule()}</Descriptions.Item>
                    <>
                        <Descriptions.Item label='漏洞描述' span={column} contentStyle={{whiteSpace: "pre-wrap"}}>
                            {info.Description || "-"}
                        </Descriptions.Item>
                        <Descriptions.Item label='解决方案' span={column} contentStyle={{whiteSpace: "pre-wrap"}}>
                            {info.Solution || "-"}
                        </Descriptions.Item>
                    </>
                </Descriptions>
                <div className={styles["no-more"]}>暂无更多</div>
            </div>
        </div>
    )
})

interface AuditResultCollapseProps {
    data: YakURLDataItemProps[]
    jumpCodeScanPage: (v: string) => void
    isShowExtra?: boolean
    collapseProps?: CollapseProps
}

export const AuditResultCollapse: React.FC<AuditResultCollapseProps> = React.memo((props) => {
    const {data, jumpCodeScanPage, isShowExtra, collapseProps} = props

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
                    <Tooltip title={"在代码审计中打开"}>
                        <YakitButton
                            type='text2'
                            icon={<OutlineTerminalIcon />}
                            onClick={(e) => {
                                e.stopPropagation()
                                jumpCodeScanPage(`/${index}`)
                            }}
                        />
                    </Tooltip>
                )}
            </div>
        )
    }

    const renderItem = (info: YakURLDataItemProps) => {
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
            />
        )
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
