import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {Descriptions, Divider} from "antd"
import {useControllableValue, useCreation, useDebounceFn, useMemoizedFn, useUpdateEffect} from "ahooks"
import {OutlineSearchIcon} from "@/assets/icon/outline"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {formatTimestamp} from "@/utils/timeUtil"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {YakitResizeBox, YakitResizeBoxProps} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import classNames from "classnames"
import {FieldName} from "@/pages/risks/RiskTable"
import {FieldGroup} from "@/pages/risks/YakitRiskTable/utils"
import {SeverityMapTag} from "@/pages/risks/YakitRiskTable/YakitRiskTable"
import {
    MisstatementRiskDetailsProps,
    MisstatementRiskTableProps,
    RiskFeedBackPage,
    RiskFeedBackRequest
} from "./MisstatementRiskTableType"
import {API} from "@/services/swagger/resposeType"
import {yakitNotify} from "@/utils/notification"
import {NetWorkApi} from "@/services/fetch"
import useListenWidth from "@/pages/pluginHub/hooks/useListenWidth"
import {
    IconSolidDefaultRiskIcon,
    IconSolidHighRiskIcon,
    IconSolidInfoRiskIcon,
    IconSolidLowRiskIcon,
    IconSolidMediumRiskIcon,
    IconSolidSeriousIcon
} from "@/pages/risks/icon"
import {NewHTTPPacketEditor} from "@/utils/editors"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {defRiskFeedBackPage} from "./constants"
import styles from "./MisstatementRiskTable.module.scss"

export const MisstatementRiskTable: React.FC<MisstatementRiskTableProps> = React.forwardRef((props, ref) => {
    const {riskWrapperClassName = "", excludeColumnsKey = []} = props

    const [currentSelectItem, setCurrentSelectItem] = useState<API.RiskLists>()
    const [tableQuery, setTableQuery] = useControllableValue<RiskFeedBackRequest>(props, {
        defaultValue: {},
        valuePropName: "query",
        trigger: "setQuery"
    })
    const [pageParams, setPageParams] = useControllableValue<RiskFeedBackPage>(props, {
        defaultValue: defRiskFeedBackPage,
        valuePropName: "pageParams",
        trigger: "setPageParams"
    })

    const [tableResponse, setTableResponse] = useState<API.RiskUploadResponse>({
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

    const [riskTypeVerbose, setRiskTypeVerbose] = useState<FieldName[]>([])
    const [tag, setTag] = useState<FieldGroup[]>([])
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
                dataKey: "title_verbose",
                filterProps: {
                    filterKey: "title",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                },
                render: (_, record) => record?.title_verbose || record.title || "-"
            },
            {
                title: "类型",
                dataKey: "risk_type_verbose",
                width: 100,
                filterProps: {
                    filterKey: "riskTypeList",
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
                render: (_, i: API.RiskLists) => {
                    const title = SeverityMapTag.filter((item) => item.key.includes(i.severity || ""))[0]
                    return (
                        <YakitTag color={title?.tag as YakitTagColor} className={styles["table-severity-tag"]}>
                            {title ? title.name : i.severity || "-"}
                        </YakitTag>
                    )
                },
                filterProps: {
                    filterKey: "severityList",
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
                dataKey: "ip",
                width: 120,
                filterProps: {
                    filterKey: "net_work",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                }
            },
            {
                title: "url",
                dataKey: "url"
            },
            {
                title: "处置状态",
                dataKey: "tags",
                minWidth: 120,
                filterProps: {
                    filterKey: "tagList",
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
                dataKey: "risk_created_at",
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
    }, [riskTypeVerbose, tag, excludeColumnsKey])

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
        setPageParams((prev) => ({...prev, order: sort.order, order_by: sort.orderBy}))

        const newQuery = {
            ...tableQuery,
            ...filter
        }
        if (filter.riskTypeList) {
            newQuery.risk_type = filter.riskTypeList.join(",")
        }
        if (filter.severityList) {
            newQuery.severity = filter.severityList.join(",")
        }
        if (filter.tagList) {
            newQuery.tags = filter.tagList.join(",")
        }
        setTableQuery(newQuery)
    })

    const update = useMemoizedFn((page: number) => {
        const params: RiskFeedBackRequest = {
            ...tableQuery
        }
        delete params.riskTypeList
        delete params.severityList
        delete params.tagList

        const isInit = page === 1
        isInitRequestRef.current = false
        if (isInit) {
            setTableLoading(true)
        }

        NetWorkApi<RiskFeedBackRequest, API.RiskUploadResponse>({
            method: "get",
            url: "risk/feed/back",
            params: {
                ...pageParams,
                // @ts-ignore
                page
            },
            data: {
                ...params
            }
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
                setPageParams((prev) => ({...prev, page}))
            })
            .catch((e) => {
                yakitNotify("error", "获取插件误报反馈列表失败：" + e)
            })
            .finally(() => {
                setTableLoading(false)
            })
    })

    const onSetCurrentRow = useMemoizedFn((val?: API.RiskLists) => {
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

    const onClickIP = useMemoizedFn((info: API.RiskLists) => {
        const index = tableResponse.data.findIndex((item) => item.id === info.id)
        // 加随机值触发更新渲染执行表格跳转方法
        if (index !== -1) setScrollToIndex(index + "_" + Math.random())
    })

    return (
        <div className={classNames(styles["yakit-risk-table"], riskWrapperClassName)}>
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
                    <TableVirtualResize<API.RiskLists>
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
                        <MisstatementRiskDetails
                            info={currentSelectItem}
                            onClickIP={onClickIP}
                            className={styles["yakit-risk-details"]}
                            border={true}
                        />
                    )
                }
                {...ResizeBoxProps}
            />
        </div>
    )
})

const MisstatementRiskDetails: React.FC<MisstatementRiskDetailsProps> = React.memo((props) => {
    const {info, className = "", border = true} = props
    const [currentSelectShowType, setCurrentSelectShowType] = useState<"request" | "response">("request")
    const [isShowCode, setIsShowCode] = useState<boolean>(true)
    const descriptionsRef = useRef<HTMLDivElement>(null)
    const descriptionsDivWidth = useListenWidth(descriptionsRef)

    useEffect(() => {
        const isRequestString = !!info.quoted_request
        const isResponseString = !!info.quoted_response
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
    const column = useCreation(() => {
        if (descriptionsDivWidth > 600) return 3
        return 1
    }, [descriptionsDivWidth])
    const codeNode = useMemoizedFn(() => {
        const isHttps = !!info.url && info.url?.length > 0 && info.url.includes("https")
        const extraParams = {
            originValue: currentSelectShowType === "request" ? info.quoted_request : info.quoted_response,
            webFuzzerValue: currentSelectShowType === "request" ? "" : info.quoted_request
        }
        return (
            <NewHTTPPacketEditor
                defaultHttps={isHttps}
                url={info.url || ""}
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
                }
                {...extraParams}
            />
        )
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

    const onClickIP = useMemoizedFn(() => {
        if (props.onClickIP) props.onClickIP(info)
    })

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
                                {info.title || "-"}
                            </div>
                            <div className={styles["content-heard-body-description"]}>
                                <YakitTag color='info' style={{cursor: "pointer"}} onClick={onClickIP}>
                                    ID:{info.id}
                                </YakitTag>
                                <span>IP:{info.ip || "-"}</span>
                                <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                                <span className={styles["description-port"]}>端口:{info.port || "-"}</span>
                                <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                                <span className={styles["url-info"]}>
                                    URL:
                                    <span className={classNames(styles["url"], "content-ellipsis")}>
                                        {info?.url || "-"}
                                    </span>
                                    <CopyComponents copyText={info?.url || "-"} />
                                </span>
                                <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                                <span className={styles["content-heard-body-time"]}>
                                    发现时间:{!!info.risk_created_at ? formatTimestamp(info.risk_created_at) : "-"}
                                </span>
                                {!isShowCode && (
                                    <>
                                        <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                                        <YakitTag color='warning'>无数据包</YakitTag>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <YakitResizeBox
                    {...extraResizeBoxProps}
                    firstNode={<div className={styles["content-resize-first"]}>{codeNode()}</div>}
                    secondNode={
                        <div className={styles["content-resize-second"]} ref={descriptionsRef}>
                            <Descriptions bordered size='small' column={column} labelStyle={{width: 120}}>
                                <Descriptions.Item label='Host'>{info.host || "-"}</Descriptions.Item>
                                <Descriptions.Item label='类型'>
                                    {(info?.risk_type_verbose || info.risk_type).replaceAll("NUCLEI-", "")}
                                </Descriptions.Item>
                                <Descriptions.Item label='来源'>
                                    {info?.from_yak_script || "漏洞检测"}
                                </Descriptions.Item>
                                <Descriptions.Item label='反连Token' contentStyle={{minWidth: 120}}>
                                    {info?.reverse_token || "-"}
                                </Descriptions.Item>
                                <Descriptions.Item label='Hash'>{info?.hash || "-"}</Descriptions.Item>
                                <Descriptions.Item label='验证状态'>
                                    <YakitTag color={`${!info.waiting_verified ? "success" : "info"}`}>
                                        {!info.waiting_verified ? "已验证" : "未验证"}
                                    </YakitTag>
                                </Descriptions.Item>

                                <>
                                    <Descriptions.Item
                                        label='漏洞描述'
                                        span={column}
                                        contentStyle={{whiteSpace: "pre-wrap"}}
                                    >
                                        {info.description || "-"}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label='解决方案'
                                        span={column}
                                        contentStyle={{whiteSpace: "pre-wrap"}}
                                    >
                                        {info.solution || "-"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label='Parameter' span={column}>
                                        {info.parameter || "-"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label='Payload' span={column}>
                                        <div style={{maxHeight: 180, overflow: "auto"}}>{`${info.payload}` || "-"}</div>
                                    </Descriptions.Item>
                                    <Descriptions.Item label='详情' span={column}>
                                        <div style={{height: 180}}>
                                            <YakitEditor type='yak' value={`${info.details || ""}`} readOnly={true} />
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
