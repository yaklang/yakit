import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {Descriptions, Divider, Tooltip} from "antd"
import {useControllableValue, useCreation, useDebounceFn, useMemoizedFn, useUpdateEffect} from "ahooks"
import {OutlineSearchIcon} from "@/assets/icon/outline"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {formatTimestamp} from "@/utils/timeUtil"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {YakitResizeBox, YakitResizeBoxProps} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import classNames from "classnames"
import {YakURLDataItemProps} from "@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType"
import {FieldName} from "@/pages/risks/RiskTable"
import {SeverityMapTag} from "@/pages/risks/YakitRiskTable/YakitRiskTable"
import {
    MisstatementAuditHoleTableProps,
    MisstatementAuditResultCollapseProps,
    MisstatementAuditResultDescribeProps,
    MisstatementAuditRiskDetailsProps
} from "./MisstatementAuditHoleTableType"
import {API} from "@/services/swagger/resposeType"
import {yakitNotify} from "@/utils/notification"
import {NetWorkApi} from "@/services/fetch"
import {
    IconSolidDefaultRiskIcon,
    IconSolidHighRiskIcon,
    IconSolidInfoRiskIcon,
    IconSolidLowRiskIcon,
    IconSolidMediumRiskIcon,
    IconSolidSeriousIcon
} from "@/pages/risks/icon"
import {defSSARiskWhereRequest} from "./constants"
import {YakCodemirror} from "@/components/yakCodemirror/YakCodemirror"
import {CollapseList} from "@/pages/yakRunner/CollapseList/CollapseList"
import {CodeRangeProps} from "@/pages/yakRunnerAuditCode/RightAuditDetail/RightAuditDetail"
import {FieldGroup} from "@/pages/risks/YakitRiskTable/utils"
import styles from "./MisstatementAuditHoleTable.module.scss"

export const MisstatementAuditHoleTable: React.FC<MisstatementAuditHoleTableProps> = React.forwardRef((props, ref) => {
    const {riskWrapperClassName = "", excludeColumnsKey = []} = props

    const [currentSelectItem, setCurrentSelectItem] = useState<API.SSARiskResponseData>()
    const [tableQuery, setTableQuery] = useControllableValue<API.SSARiskWhereRequest>(props, {
        defaultValue: {...defSSARiskWhereRequest},
        valuePropName: "query",
        trigger: "setQuery"
    })
    const [tableResponse, setTableResponse] = useState<API.SSARiskResponse>({
        data: [],
        pagemeta: {
            page: 1,
            limit: 20,
            total: 0,
            total_page: 0
        }
    })
    const isInitRequestRef = useRef<boolean>(true)
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [scrollToIndex, setScrollToIndex] = useState<number | string>()
    const [tableLoading, setTableLoading] = useState(false)

    useImperativeHandle(
        ref,
        () => ({
            update: (page: number) => {
                update(page)
            },
            tableResponse
        }),
        [tableResponse]
    )

    const [tag, setTag] = useState<FieldGroup[]>([])
    const [riskTypeVerbose, setRiskTypeVerbose] = useState<FieldName[]>([])
    const [riskProgramList, setRiskProgramList] = useState<string[]>([])
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
        const riskProgramTable = riskProgramList.map((item) => ({
            value: item,
            label: item
        }))
        const columnArr: ColumnsTypeProps[] = [
            {
                title: "序号",
                dataKey: "id",
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
                dataKey: "titleVerbose",
                filterProps: {
                    filterKey: "title",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                },
                render: (_, record) => record?.titleVerbose || record.title || "-"
            },
            {
                title: "类型",
                dataKey: "riskTypeVerbose",
                width: 100,
                filterProps: {
                    filterKey: "riskType",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: riskTypeVerboseTable
                }
            },
            {
                title: "等级",
                dataKey: "severity",
                width: 75,
                align: "center",
                render: (_, i: API.SSARiskResponseData) => {
                    const title = SeverityMapTag.filter((item) => item.key.includes(i.severity || ""))[0]
                    return (
                        <YakitTag color={title?.tag as YakitTagColor} className={styles["table-severity-tag"]}>
                            {title ? title.name : i.severity || "-"}
                        </YakitTag>
                    )
                },
                filterProps: {
                    filterKey: "severity",
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
                title: "所属项目",
                dataKey: "programName",
                filterProps: {
                    filterKey: "programName",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: riskProgramTable
                }
            },
            {
                title: "处置状态",
                dataKey: "tags",
                minWidth: 120,
                filterProps: {
                    filterKey: "tags",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: tagTable
                },
                render: (text, record, index) => (
                    <>
                        <div className={styles["table-tag"]}>
                            <span>{!!text ? text.replaceAll("|", ",") : "-"}</span>
                        </div>
                    </>
                )
            },
            {
                title: "发现时间",
                dataKey: "ssaRiskCreatedAt",
                width: 200,
                render: (text) => (text ? formatTimestamp(text) : "-")
            },
            {
                title: "提交时间",
                dataKey: "created_at",
                width: 200,
                fixed: "right",
                render: (text) => (text ? formatTimestamp(text) : "-")
            }
        ]
        return columnArr.filter((ele) => !excludeColumnsKey.includes(ele.dataKey))
    }, [riskTypeVerbose, riskProgramList, excludeColumnsKey])

    useEffect(() => {
        update(1)
    }, [])

    const queyChangeUpdateData = useDebounceFn(
        () => {
            // 初次不通过此处请求数据
            if (!isInitRequestRef.current) {
                update(1)
            }
        },
        {wait: 300}
    ).run
    useUpdateEffect(() => {
        queyChangeUpdateData()
    }, [tableQuery])
    const onTableChange = useMemoizedFn((page: number, limit: number, newSort: SortProps, filter: any) => {
        let sort = {...newSort}
        if (sort.order === "none") {
            sort.order = "desc"
            sort.orderBy = "id"
        }

        const newQuery = {
            ...tableQuery,
            ...filter,
            order_by: sort.orderBy,
            order: sort.order
        }
        setTableQuery(newQuery)
    })

    const update = useMemoizedFn((page: number) => {
        const params: API.SSARiskWhereRequest = {
            ...tableQuery,
            page
        }

        const isInit = page === 1
        isInitRequestRef.current = false
        if (isInit) {
            setTableLoading(true)
        }

        NetWorkApi<API.SSARiskWhereRequest, API.SSARiskResponse>({
            method: "post",
            url: "ssa/risk",
            data: params
        })
            .then((res) => {
                const data = res.data || []
                const d = isInit ? data : tableResponse.data.concat(data)
                setTableResponse({
                    ...res,
                    data: d
                })
                if (isInit) {
                    setIsRefresh((prevIsRefresh) => !prevIsRefresh)
                }
            })
            .catch((e) => {
                yakitNotify("error", "获取规则误报反馈列表失败：" + e)
            })
            .finally(() => {
                setTableLoading(false)
            })
    })

    const onSetCurrentRow = useMemoizedFn((val?: API.SSARiskResponseData) => {
        if (!val) {
            setCurrentSelectItem(undefined)
            return
        }
        if (val?.id !== currentSelectItem?.id) {
            setCurrentSelectItem(val)
        }
    })
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

    const onClickIP = useMemoizedFn((info: API.SSARiskResponseData) => {
        const index = tableResponse.data.findIndex((item) => item.id === info.id)
        // 加随机值触发更新渲染执行表格跳转方法
        if (index !== -1) setScrollToIndex(index + "_" + Math.random())
    })

    return (
        <div className={classNames(styles["yakit-audit-hole-table"], riskWrapperClassName)}>
            <YakitResizeBox
                firstMinSize={160}
                secondMinSize={200}
                isVer={true}
                lineStyle={{display: !!currentSelectItem?.id ? "" : "none"}}
                lineDirection='bottom'
                secondNodeStyle={{
                    display: !currentSelectItem?.id ? "none" : "",
                    padding: !currentSelectItem?.id ? 0 : undefined
                }}
                firstNode={
                    <TableVirtualResize<API.SSARiskResponseData>
                        query={tableQuery}
                        scrollToIndex={scrollToIndex}
                        loading={tableLoading}
                        isRefresh={isRefresh}
                        isShowTitle={false}
                        renderKey='id'
                        data={tableResponse.data}
                        pagination={{
                            total: tableResponse.pagemeta.total,
                            limit: tableResponse.pagemeta.limit,
                            page: tableResponse.pagemeta.page,
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
                        <MisstatementAuditRiskDetails
                            info={currentSelectItem}
                            onClickIP={onClickIP}
                            className={styles["yakit-audit-hole-details"]}
                            border={true}
                        />
                    )
                }
                {...ResizeBoxProps}
            />
        </div>
    )
})

const MisstatementAuditRiskDetails: React.FC<MisstatementAuditRiskDetailsProps> = React.memo((props) => {
    const {info, className, border} = props
    const [yakURLData, setYakURLData] = useState<YakURLDataItemProps[]>([])

    useEffect(() => {
        initData()
    }, [info])

    const [isShowCollapse, setIsShowCollapse] = useState<boolean>(false)
    const initData = useMemoizedFn(async () => {
        try {
            const {index, codeRange, programName, codeFragment} = info
            if (index && codeRange && codeFragment && programName) {
                const code_range: CodeRangeProps = JSON.parse(codeRange)
                setYakURLData([
                    {
                        index: index,
                        code_range,
                        source: codeFragment,
                        ResourceName: programName
                    }
                ])
                setIsShowCollapse(true)
            } else {
                setIsShowCollapse(false)
            }
        } catch (error) {
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
        const severity = SeverityMapTag.filter((item) => item.key.includes(info.severity || ""))[0]
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
            name: severity?.name || info?.severity || "-"
        }
    }, [info.severity])

    return (
        <div
            className={classNames(
                styles["yakit-audit-risk-details-content"],
                "yakit-descriptions",
                {
                    [styles["yakit-audit-risk-details-content-no-border"]]: !border
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
                            {info?.titleVerbose || info.title || "-"}
                        </div>
                        <div className={styles["content-heard-body-description"]}>
                            <YakitTag color='info' style={{cursor: "pointer"}} onClick={onClickIP}>
                                ID:{info.id}
                            </YakitTag>
                            <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                            <span className={styles["description-port"]}>所属项目:{info.programName || "-"}</span>
                            <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                            <span className={styles["content-heard-body-time"]}>
                                发现时间:{!!info.ssaRiskCreatedAt ? formatTimestamp(info.ssaRiskCreatedAt) : "-"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <YakitResizeBox
                {...extraResizeBoxProps}
                firstNode={
                    <div className={styles["content-resize-collapse"]}>
                        <div className={styles["main-title"]}>相关代码段</div>
                        <MisstatementAuditResultCollapse
                            data={yakURLData}
                            collapseProps={{
                                defaultActiveKey: ["collapse-list-0"]
                            }}
                        />
                    </div>
                }
                secondNode={<MisstatementAuditResultDescribe info={info} />}
                firstMinSize={200}
                secondMinSize={400}
            />
        </div>
    )
})

const MisstatementAuditResultCollapse: React.FC<MisstatementAuditResultCollapseProps> = React.memo((props) => {
    const {data, collapseProps} = props

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
                list={data}
                titleRender={titleRender}
                renderItem={renderItem}
                collapseProps={collapseProps}
            />
        </div>
    )
})

const MisstatementAuditResultDescribe: React.FC<MisstatementAuditResultDescribeProps> = React.memo((props) => {
    const {info, columnSize} = props

    const column = useCreation(() => {
        if (columnSize) return columnSize
        return 1
    }, [])

    const getRule = useMemoizedFn(() => {
        return info?.fromRule || "漏洞检测"
    })
    return (
        <div className={styles["content-resize-second"]}>
            <Descriptions bordered size='small' column={column} labelStyle={{width: 120}}>
                <Descriptions.Item label='类型'>
                    {(info?.riskTypeVerbose || info?.riskType || "").replaceAll("NUCLEI-", "")}
                </Descriptions.Item>
                <Descriptions.Item label='Hash'>{info?.hash || "-"}</Descriptions.Item>
                <Descriptions.Item label='扫描规则'>{getRule()}</Descriptions.Item>
                <>
                    <Descriptions.Item label='漏洞描述' span={column} contentStyle={{whiteSpace: "pre-wrap"}}>
                        {info.description || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label='解决方案' span={column} contentStyle={{whiteSpace: "pre-wrap"}}>
                        {info.solution || "-"}
                    </Descriptions.Item>
                </>
            </Descriptions>
            <div className={styles["no-more"]}>暂无更多</div>
        </div>
    )
})
