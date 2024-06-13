import React, {ReactNode, useEffect, useMemo, useState} from "react"
import {QueryRisksRequest, QueryRisksResponse, YakitRiskDetailsProps, YakitRiskTableProps} from "./YakitRiskTableType"
import styles from "./YakitRiskTable.module.scss"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {Risk} from "../schema"
import {Descriptions, Divider} from "antd"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useControllableValue, useCreation, useMemoizedFn} from "ahooks"
import {YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {OutlineExportIcon, OutlineSearchIcon, OutlineTrashIcon, OutlineXIcon} from "@/assets/icon/outline"
import {ColumnsTypeProps, FiltersItemProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import cloneDeep from "lodash/cloneDeep"
import {defQueryRisksRequest} from "./constants"
import {formatTimestamp} from "@/utils/timeUtil"
import {SolidRefreshIcon} from "@/assets/icon/solid"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {apiQueryRisks} from "./utils"
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
export const YakitRiskTable: React.FC<YakitRiskTableProps> = React.memo((props) => {
    const [loading, setLoading] = useState(false)
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [response, setResponse] = useState<QueryRisksResponse>({
        Data: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    })
    const [scrollToIndex, setScrollToIndex] = useState<number>()

    const [keywords, setKeywords] = useState<string>("")
    const [type, setType] = useState<"all" | "unread">("all")
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectList, setSelectList] = useState<string[]>([])
    const [currentSelectItem, setCurrentSelectItem] = useState<Risk>()
    const [query, setQuery] = useControllableValue<QueryRisksRequest>(props, {
        defaultValue: {
            ...cloneDeep(defQueryRisksRequest)
        },
        valuePropName: "query",
        trigger: "setQuery"
    })

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
                        <YakitTag color={title?.tag as YakitTagColor} className={styles["table-tag"]}>
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
                }
            },
            {
                title: "发现时间",
                dataKey: "UpdatedAt",
                sorterProps: {
                    sorter: true,
                    sorterKey: "updated_at"
                },
                render: (text) => (text ? formatTimestamp(text) : "-")
            },
            {
                title: "操作",
                dataKey: "action",
                width: 60,
                fixed: "right",
                render: (text, record, index) => (
                    <>
                        <YakitButton
                            type='text'
                            danger
                            onClick={(e) => {
                                e.stopPropagation()
                                onRemoveSingle(record.TaskId)
                            }}
                            icon={<OutlineTrashIcon />}
                        />
                    </>
                )
            }
        ]
    }, [riskTypeVerbose, tag])
    const onRemoveSingle = useMemoizedFn((id) => {})
    const onRemove = useMemoizedFn(() => {})
    const onExportMenuSelect = useMemoizedFn((key: string) => {
        switch (key) {
            case "export-csv":
                break
            case "export-html":
                break
            default:
                break
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
        } else {
            setAllCheck(false)
            setSelectList([])
        }
    })
    const onChangeCheckboxSingle = useMemoizedFn((c: boolean, key: string, selectedRows) => {
        if (c) {
            setSelectList((s) => [...s, key])
        } else {
            setSelectList((s) => s.filter((ele) => ele !== key))
        }
    })
    const onSetCurrentRow = useMemoizedFn((val?: Risk) => {
        if (!currentSelectItem) {
            const index = response.Data.findIndex((ele) => ele.Id === val?.Id)
            setScrollToIndex(index)
        }
        if (val?.Id !== currentSelectItem?.Id) {
            setCurrentSelectItem(val)
        }
        /**TODO - 点击的row为未读的数据，需要变成已读 */
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
    return (
        <div className={styles["yakit-risk-table"]}>
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
                                    {/* <ExportExcel
                                btnProps={{
                                    size: btnSize,
                                    type: "outline2"
                                }}
                                getData={getData}
                                text='导出全部'
                            /> */}
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
                        isRightClickBatchOperate={true}
                        renderKey='Id'
                        data={response.Data}
                        rowSelection={{
                            isAll: allCheck,
                            type: "checkbox",
                            selectedRowKeys: selectList,
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
        let details: any
        let requestKeys: string[] = []
        let responseKeys: string[] = []

        if (info.Details) {
            details = typeof info.Details === "string" ? JSON.parse(info.Details) : info.Details
            if (details) {
                requestKeys = Object.keys(details)
                    .filter((key) => key.startsWith("request_"))
                    .sort()
                responseKeys = Object.keys(details)
                    .filter((key) => key.startsWith("response_"))
                    .sort()
            }
        }

        const itemList: ReactNode[] = []
        if (requestKeys.length > 0 || responseKeys.length > 0) {
            for (let i = 0; i < Math.max(requestKeys.length, responseKeys.length); i++) {
                if (requestKeys[i]) {
                    itemList.push(
                        <Descriptions.Item label={"Request_" + (i + 1)} span={3} key={requestKeys[i]}>
                            <div style={{height: 300}}>
                                {quotedRequest ? (
                                    <div>{quotedRequest}</div>
                                ) : (
                                    <NewHTTPPacketEditor
                                        defaultHttps={isHttps}
                                        originValue={new TextEncoder().encode(details[requestKeys[i]])}
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
                if (responseKeys[i]) {
                    itemList.push(
                        <Descriptions.Item label={"Response_" + (i + 1)} span={3} key={responseKeys[i]}>
                            <div style={{height: 300}}>
                                {quotedResponse ? (
                                    <div>{quotedResponse}</div>
                                ) : (
                                    <NewHTTPPacketEditor
                                        defaultHttps={isHttps}
                                        originValue={new TextEncoder().encode(details[responseKeys[i]])}
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
            }
        } else {
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
