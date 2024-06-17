import React, {ReactNode, useEffect, useMemo, useState} from "react"
import {
    QueryRisksRequest,
    QueryRisksResponse,
    YakitRiskDetailsProps,
    YakitRiskSelectTagProps,
    YakitRiskTableProps
} from "./YakitRiskTableType"
import styles from "./YakitRiskTable.module.scss"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {Risk} from "../schema"
import {Descriptions, Divider, Form} from "antd"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useControllableValue, useCreation, useMemoizedFn} from "ahooks"
import {YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {
    OutlineChevrondownIcon,
    OutlineExportIcon,
    OutlineSearchIcon,
    OutlineTrashIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {ColumnsTypeProps, FiltersItemProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import cloneDeep from "lodash/cloneDeep"
import {defQueryRisksRequest} from "./constants"
import {formatTimestamp} from "@/utils/timeUtil"
import {SolidRefreshIcon} from "@/assets/icon/solid"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {DeleteRiskRequest, ExportHtmlProps, apiDeleteRisk, apiExportHtml, apiNewRiskRead, apiQueryRisks} from "./utils"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
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
        value: "Tag",
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
export const YakitRiskTable: React.FC<YakitRiskTableProps> = React.memo((props) => {
    const [loading, setLoading] = useState(false)
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [response, setResponse] = useState<QueryRisksResponse>({
        Data: [],
        Pagination: {...genDefaultPagination(20), OrderBy: "created_at"},
        Total: 0
    })
    const [scrollToIndex, setScrollToIndex] = useState<number>()

    const [keywords, setKeywords] = useState<string>("")
    const [type, setType] = useState<"all" | "unread">("all")
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectList, setSelectList] = useState<Risk[]>([])
    const [currentSelectItem, setCurrentSelectItem] = useState<Risk>()
    const [query, setQuery] = useControllableValue<QueryRisksRequest>(props, {
        defaultValue: {
            ...cloneDeep(defQueryRisksRequest)
        },
        valuePropName: "query",
        trigger: "setQuery"
    })

    const [exportTitle, setExportTitle] = useState<string[]>([])

    const [riskTypeVerbose, setRiskTypeVerbose] = useState<FiltersItemProps[]>([
        {
            value: "CVE基线检查",
            label: "CVE基线检查"
        },
        {
            value: "弱口令",
            label: "弱口令"
        },
        {
            value: "其他",
            label: "其他"
        }
    ])

    const [tag, setTag] = useState<FiltersItemProps[]>([
        {
            value: "严重",
            label: "严重"
        },
        {
            value: "高危",
            label: "高危"
        },
        {
            value: "中危",
            label: "中危"
        },
        {
            value: "低危",
            label: "低危"
        },
        {
            value: "信息",
            label: "信息"
        }
    ])

    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.Total
        else return selectList.length
    }, [allCheck, selectList, response.Total])
    const total = useCreation(() => {
        return +response.Total
    }, [response.Total])
    useEffect(() => {
        update(1)
    }, [])
    const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
        return [
            {
                title: "序号",
                dataKey: "Id",
                fixed: "left",
                ellipsis: false,
                width: 96,
                enableDrag: false
            },
            {
                title: "标题",
                dataKey: "TitleVerbose",
                filterProps: {
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                }
            },
            {
                title: "类型",
                dataKey: "RiskTypeVerbose",
                filterProps: {
                    filtersType: "select",
                    filterMultiple: true,
                    filters: riskTypeVerbose
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
                    filtersType: "select",
                    filterMultiple: true,
                    filters: [
                        {
                            value: "严重",
                            label: "严重"
                        },
                        {
                            value: "高危",
                            label: "高危"
                        },
                        {
                            value: "中危",
                            label: "中危"
                        },
                        {
                            value: "低危",
                            label: "低危"
                        },
                        {
                            value: "信息",
                            label: "信息"
                        }
                    ]
                }
            },
            {
                title: "IP",
                dataKey: "IP",
                filterProps: {
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                }
            },
            {
                title: "Tag",
                dataKey: "Tag",
                filterProps: {
                    filtersType: "select",
                    filterMultiple: true,
                    filters: tag
                },
                minWidth: 120,
                render: (text, record, index) => (
                    <>
                        <div
                            className={styles["table-tag"]}
                            onClick={(e) => {
                                e.stopPropagation()
                                onOpenSelect(record)
                            }}
                        >
                            <span>{text || "-"}</span>
                            <OutlineChevrondownIcon />
                        </div>
                    </>
                )
            },
            {
                title: "发现时间",
                dataKey: "CreatedAt",
                sorterProps: {
                    sorter: true,
                    sorterKey: "created_at"
                },
                render: (text) => (text ? formatTimestamp(text) : "-")
            },
            {
                title: "操作",
                dataKey: "action",
                width: 60,
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
                    </>
                )
            }
        ]
    }, [riskTypeVerbose, tag])
    const onOpenSelect = useMemoizedFn((record: Risk) => {
        const m = showYakitModal({
            title: `序号【${record.Id}】`,
            content: <YakitRiskSelectTag info={record} onClose={() => m.destroy()} onSave={onSaveTags} />,
            footer: null,
            onCancel: () => {
                m.destroy()
            }
        })
    })
    const onSaveTags = useMemoizedFn((info: Risk) => {
        /*TODO -  等后端接口好了需要验证*/
        const index = response.Data.findIndex((item) => item.Hash === info.Hash)
        if (index === -1) return
        response.Data[index] = {
            ...info
        }
        setResponse({
            ...response,
            Data: [...response.Data]
        })
    })
    const onRemoveSingle = useMemoizedFn((id) => {
        apiDeleteRisk({Id: id}).then(() => {
            update(1)
        })
    })
    const onRemove = useMemoizedFn(() => {
        // 带条件删除
        let removeQuery: DeleteRiskRequest = {}
        if (allCheck) {
            removeQuery = {
                Filter: {
                    ...query
                }
            }
        } else {
            // 勾选删除
            const ids = selectList.map((item) => item.Id)
            removeQuery = {
                Ids: ids
            }
        }
        /*TODO - 带对接接口*/
        apiDeleteRisk(removeQuery).then(() => {
            update(1)
        })
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
            if (allCheck) {
                const exportQuery: QueryRisksRequest = {
                    ...query,
                    Pagination: {
                        ...query.Pagination,
                        Page: 1,
                        Limit: total
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
        setLoading(true)
        try {
            let risks: Risk[] = []
            if (allCheck) {
                const exportQuery: QueryRisksRequest = {
                    ...query,
                    Pagination: {
                        ...query.Pagination,
                        Page: 1,
                        Limit: total
                    }
                }

                const res = await apiQueryRisks(exportQuery)
                risks = [...res.Data]
            } else {
                risks = [...selectList]
            }
            const htmlContent = getHtmlTemplate()
            const params: ExportHtmlProps = {
                htmlContent,
                fileName: `riskTable-${moment().valueOf()}`,
                data: risks
            }
            apiExportHtml(params)
            setTimeout(() => {
                setLoading(false)
            }, 200)
        } catch (error) {
            yakitNotify("error", `导出html失败:${error}`)
            setLoading(false)
        }
    })
    const onRefreshMenuSelect = useMemoizedFn((key: string) => {
        switch (key) {
            case "noResetRefresh":
                update(1)
                break
            case "resetRefresh":
                setQuery(cloneDeep(defQueryRisksRequest))
                setTimeout(() => {
                    update(1)
                }, 200)
                break
            default:
                break
        }
    })
    const onTableChange = useMemoizedFn((page: number, limit: number, sort: SortProps, filter: any) => {
        if (sort.order === "none") {
            sort.order = "desc"
            sort.orderBy = "updated_at"
        }
        setQuery({
            ...query,
            Pagination: {
                ...query.Pagination,
                Order: sort.order,
                OrderBy: sort.orderBy
            }
        })
        setTimeout(() => {
            update(1, limit)
        }, 100)
    })
    const update = useMemoizedFn((page?: number, limit?: number) => {
        setLoading(true)
        const paginationProps = {
            ...query.Pagination,
            Page: page || 1,
            Limit: limit || query.Pagination.Limit
        }
        const finalParams: QueryRisksRequest = {
            ...query,
            Pagination: paginationProps
        }
        apiQueryRisks(finalParams)
            .then((res) => {
                console.log("res", finalParams, res)
                const newPage = +res.Pagination.Page
                const d = newPage === 1 ? res.Data : (response?.Data || []).concat(res.Data)
                setResponse({
                    ...res,
                    Data: d
                })
                if (newPage === 1) {
                    setIsRefresh(!isRefresh)
                    setSelectList([])
                    setAllCheck(false)
                } else {
                    if (allCheck) {
                        setSelectList(d)
                    }
                }

                if (+res.Total !== selectList.length) {
                    setAllCheck(false)
                }
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    const onSearch = useMemoizedFn(() => {})
    const onPressEnter = useMemoizedFn(() => {})
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
            setSelectList((s) => s.filter((ele) => ele.Hash !== selectedRows.Hash))
        }
    })
    const onSetCurrentRow = useMemoizedFn((val?: Risk) => {
        if (!val) return
        if (!currentSelectItem) {
            const index = response.Data.findIndex((ele) => ele.Id === val?.Id)
            setScrollToIndex(index)
        }
        if (val?.Id !== currentSelectItem?.Id) {
            setCurrentSelectItem(val)
        }
        /**TODO - 点击的row为未读的数据，需要变成已读 */
        apiNewRiskRead({Ids: [val.Id]}).then(() => {
            setResponse({
                ...response,
                Data: response.Data.map((ele) => {
                    if (ele.Id === val.Id) {
                        ele.IsRead = true
                        /**TODO - 模拟，下面这个样式是未读得 */
                        // ele.cellClassName = styles["yakit-risk-table-cell-unread"]
                    }
                    return ele
                })
            })
        })
    })
    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "70%",
            secondRatio: "30%"
        }
        if (!currentSelectItem?.Id) {
            p.secondRatio = "0%"
            p.firstRatio = "100%"
        }
        return p
    }, [currentSelectItem])
    const selectedRowKeys = useCreation(() => {
        return selectList.map((ele) => ele.Hash) || []
    }, [selectList])
    return (
        <div className={styles["yakit-risk-table"]} id='riskTable'>
            <YakitResizeBox
                firstMinSize={400}
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
                        scrollToIndex={scrollToIndex}
                        loading={loading}
                        isRefresh={isRefresh}
                        titleHeight={32}
                        renderTitle={
                            <div className={styles["table-renderTitle"]}>
                                <div className={styles["table-renderTitle-left"]}>
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
                                                value: "unread",
                                                label: "未读"
                                            }
                                        ]}
                                    />
                                    <div className={styles["virtual-table-heard-right"]}>
                                        <div className={styles["virtual-table-heard-right-item"]}>
                                            <span className={styles["virtual-table-heard-right-text"]}>Total</span>
                                            <span className={styles["virtual-table-heard-right-number"]}>
                                                {response.Total}
                                            </span>
                                        </div>
                                        <Divider type='vertical' />
                                        <div className={styles["virtual-table-heard-right-item"]}>
                                            <span className={styles["virtual-table-heard-right-text"]}>Selected</span>
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
                                            disabled: total === 0
                                        }}
                                    >
                                        <YakitButton type='outline2' icon={<OutlineExportIcon />}>
                                            导出为...
                                        </YakitButton>
                                    </YakitDropdownMenu>
                                    <YakitPopconfirm
                                        title={
                                            allCheck
                                                ? "确定删除所有风险与漏洞吗? 不可恢复"
                                                : "确定删除选择的风险与漏洞吗?不可恢复"
                                        }
                                        onConfirm={onRemove}
                                    >
                                        <YakitButton
                                            type='outline1'
                                            colors='danger'
                                            icon={<OutlineTrashIcon />}
                                            disabled={total === 0}
                                        >
                                            {selectNum === 0 ? "清空" : "删除数据"}
                                        </YakitButton>
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
                                        <YakitButton type='primary' icon={<SolidRefreshIcon />} />
                                    </YakitDropdownMenu>
                                </div>
                            </div>
                        }
                        renderKey='Hash'
                        data={response.Data}
                        rowSelection={{
                            isAll: allCheck,
                            type: "checkbox",
                            selectedRowKeys,
                            onSelectAll,
                            onChangeCheckboxSingle
                        }}
                        pagination={{
                            total,
                            limit: response.Pagination.Limit,
                            page: response.Pagination.Page,
                            onChange: (page) => update(page)
                        }}
                        columns={columns}
                        onSetCurrentRow={onSetCurrentRow}
                        enableDrag={true}
                        useUpAndDown
                        onChange={onTableChange}
                    />
                }
                secondNode={
                    currentSelectItem && (
                        <div className={styles["yakit-risk-details"]}>
                            <div className={styles["yakit-risk-details-title"]}>
                                <span>详情</span>
                                <YakitButton
                                    type='text2'
                                    icon={<OutlineXIcon />}
                                    onClick={() => setCurrentSelectItem(undefined)}
                                />
                            </div>
                            <YakitRiskDetails info={currentSelectItem} />
                        </div>
                    )
                }
                {...ResizeBoxProps}
            />
        </div>
    )
})

const YakitRiskSelectTag: React.FC<YakitRiskSelectTagProps> = React.memo((props) => {
    const {info, onClose, onSave} = props
    const tags = useCreation(() => {
        return [
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
    }, [info])
    const onFinish = useMemoizedFn((value) => {
        onSave({
            ...info,
            ...value
        })
        if (onClose) onClose()
    })
    return (
        <div className={styles["yakit-risk-select-tag"]}>
            <Form onFinish={onFinish}>
                <Form.Item label='Tags' name='Tags'>
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
    const {info, isShowTime = true, quotedRequest, quotedResponse, onClose} = props
    const severityInfo = useCreation(() => {
        const severity = SeverityMapTag.filter((item) => item.key.includes(info.Severity || ""))[0]
        let icon = <></>
        switch (severity.name) {
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
            tag: severity.tag,
            name: severity.name || info.Severity || "-"
        }
    }, [info.Severity])
    const items: ReactNode[] = useMemo(() => {
        const isHttps = !!info.Url && info.Url?.length > 0 && info.Url.includes("https")
        const itemList: ReactNode[] = []
        if ((info?.Request || []).length > 0) {
            itemList.push(
                <Descriptions.Item label='Request' span={3}>
                    <div style={{height: 300}}>
                        {quotedRequest ? (
                            <div>{quotedRequest}</div>
                        ) : (
                            <NewHTTPPacketEditor
                                defaultHttps={isHttps}
                                originValue={info?.Request || new Uint8Array()}
                                readOnly={true}
                                noHeader={true}
                                webFuzzerCallBack={() => {
                                    onClose && onClose()
                                }}
                            />
                        )}
                    </div>
                </Descriptions.Item>
            )
        }
        if ((info?.Response || []).length > 0) {
            itemList.push(
                <Descriptions.Item label='Response' span={3}>
                    <div style={{height: 300}}>
                        {quotedResponse ? (
                            <div>{quotedResponse}</div>
                        ) : (
                            <NewHTTPPacketEditor
                                defaultHttps={isHttps}
                                webFuzzerValue={info?.Request || new Uint8Array()}
                                originValue={info?.Response || new Uint8Array()}
                                readOnly={true}
                                noHeader={true}
                                webFuzzerCallBack={() => {
                                    onClose && onClose()
                                }}
                            />
                        )}
                    </div>
                </Descriptions.Item>
            )
        }

        return itemList
    }, [info, quotedResponse])
    return (
        <>
            <div className={classNames(styles["yakit-risk-details-content"], "yakit-descriptions")}>
                <div className={styles["content-heard"]}>
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
                            <span className={styles["url-info"]}>
                                URL:
                                <span className={classNames(styles["url"], "content-ellipsis")}>
                                    {info?.Url || "-"}
                                </span>
                                <CopyComponents copyText={info?.Url || "-"} />
                            </span>
                            <Divider type='vertical' style={{height: 16, margin: "0 16px"}} />
                            {isShowTime && (
                                <div className={styles["content-heard-body-time"]}>
                                    <span>发现时间 {!!info.CreatedAt ? formatTimestamp(info.CreatedAt) : "-"}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <Descriptions bordered size='small' column={3}>
                    <Descriptions.Item label='IP' contentStyle={{minWidth: 120}}>
                        {info.IP || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label='ID'>{info.Id || "-"}</Descriptions.Item>
                    <Descriptions.Item label='端口'>{info.Port || "-"}</Descriptions.Item>
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
                        <Descriptions.Item label='漏洞描述' span={3} contentStyle={{whiteSpace: "pre-wrap"}}>
                            {info.Description || "-"}
                        </Descriptions.Item>
                        <Descriptions.Item label='解决方案' span={3} contentStyle={{whiteSpace: "pre-wrap"}}>
                            {info.Solution || "-"}
                        </Descriptions.Item>
                        <Descriptions.Item label='Parameter' span={3}>
                            {info.Parameter || "-"}
                        </Descriptions.Item>
                        <Descriptions.Item label='Payload' span={3}>
                            {info.Payload || "-"}
                        </Descriptions.Item>
                        {items}
                        <Descriptions.Item label='详情' span={3}>
                            <div style={{maxHeight: 180, overflow: "auto"}}>{`${info.Details}` || "-"}</div>
                        </Descriptions.Item>
                    </>
                </Descriptions>
                <div className={styles["no-more"]}>暂无更多</div>
            </div>
        </>
    )
})
