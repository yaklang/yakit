import React, {Ref, useEffect, useRef, useState} from "react"
import {Divider, Tooltip} from "antd"
import {useGetState, useInViewport, useMemoizedFn, useSize, useUpdateEffect} from "ahooks"
import styles from "./CodeScanResultTable.module.scss"
import {yakitNotify} from "@/utils/notification"
import classNames from "classnames"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {QuerySyntaxFlowResultRequest, QuerySyntaxFlowResultResponse, SyntaxFlowResult} from "../YakRunnerCodeScanType"
import emiter from "@/utils/eventBus/eventBus"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {apiFetchQuerySyntaxFlowResult} from "../utils"
import {YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {OutlineArrowcirclerightIcon, OutlineRefreshIcon, OutlineTerminalIcon} from "@/assets/icon/outline"
import {serverPushStatus} from "@/utils/duplex/duplex"
import ReactResizeDetector from "react-resize-detector"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {SeverityMapTag} from "@/pages/risks/YakitRiskTable/YakitRiskTable"
import cloneDeep from "lodash/cloneDeep"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitRoute} from "@/enums/yakitRoute"
import {AuditCodePageInfoProps} from "@/store/pageInfo"

const OFFSET_LIMIT = 30
const OFFSET_STEP = 100

const defSort: SortProps = {
    order: "desc",
    orderBy: "id"
}
// 倒序时需要额外处理传给后端顺序
export const verifyOrder = (pagination: Paging, AfterID?: number) => {
    // 是否将返回结果倒序
    let isReverse = false
    if (pagination.Order && ["desc", "none"].includes(pagination.Order) && AfterID) {
        pagination.Order = "asc"
        isReverse = true
    }
    return {pagination, isReverse}
}

export interface CodeScanResultTableProps extends CodeScanResultProp {
    inViewport?: boolean
    onlyShowFirstNode?: boolean
    setOnlyShowFirstNode?: (i: boolean) => void
    params?: QuerySyntaxFlowResultRequest
    refresh?: boolean
}
export const CodeScanResultTable: React.FC<CodeScanResultTableProps> = React.memo((props) => {
    const {
        runtimeId,
        isExecuting,
        onDetail,
        inViewport,
        onlyShowFirstNode,
        setOnlyShowFirstNode,
        refresh,
        updateDataCallback
    } = props
    const [data, setData] = useState<SyntaxFlowResult[]>([])
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    // 最新一条数据ID
    const maxIdRef = useRef<number>(0)
    // 最后一条数据ID
    const minIdRef = useRef<number>(0)
    // 接口是否正在请求
    const isGrpcRef = useRef<boolean>(false)
    const [currentIndex, setCurrentIndex] = useState<number>()
    const [total, setTotal] = useState<number>(0)
    const [loading, setLoading] = useState(false)
    const [params, setParams, getParams] = useGetState<QuerySyntaxFlowResultRequest>({
        Pagination: genDefaultPagination(20),
        Filter: {
            TaskIDs: [],
            ResultIDs: [],
            RuleNames: [],
            ProgramNames: [],
            Keyword: "",
            OnlyRisk: true
        }
    })
    const [pagination, setPagination] = useState<Paging>({
        Limit: OFFSET_LIMIT,
        Order: "desc",
        OrderBy: "created_at",
        Page: 1
    })
    const [offsetData, setOffsetData, getOffsetData] = useGetState<SyntaxFlowResult[]>([])
    const [isReset, setIsReset] = useState<boolean>(false)
    // 是否循环接口
    const [isLoop, setIsLoop] = useState<boolean>(!serverPushStatus)
    // 表格排序
    const sortRef = useRef<SortProps>(defSort)

    const boxHeightRef = useRef<number>()
    const ref = useRef(null)
    const size = useSize(ref)

    const tableRef = useRef<any>(null)
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

    // 设置是否自动刷新
    const idRef = useRef<NodeJS.Timeout>()

    const extraTimerRef = useRef<any>() // 用于控制获取total和最大id的轮询
    useEffect(() => {
        return () => {
            clearInterval(extraTimerRef.current)
        }
    }, [])

    useUpdateEffect(() => {
        setData([])
    }, [runtimeId])

    useEffect(() => {
        updateDataCallback && updateDataCallback(data)
    }, [data])

    const getAddDataByGrpc = useMemoizedFn((query) => {
        if (!isLoop) return
        const clientHeight = tableRef.current?.containerRef?.clientHeight
        // 解决页面未显示时 此接口轮询导致接口锁死
        if (clientHeight === 0) return
        const copyQuery = structuredClone(query)
        copyQuery.Pagination = {
            Page: 1,
            Limit: pagination.Limit,
            Order: "desc",
            OrderBy: "Id"
        }
        apiFetchQuerySyntaxFlowResult(copyQuery)
            .then((rsp: QuerySyntaxFlowResultResponse) => {
                const resData = rsp?.Results || []
                if (resData.length) {
                    setTotal(rsp.Total)
                }
            })
            .catch(() => {
                if (extraTimerRef.current) {
                    clearInterval(extraTimerRef.current)
                }
            })
    })

    // 方法请求
    const getDataByGrpc = useMemoizedFn((query, type: "top" | "bottom" | "update" | "offset") => {
        if (isGrpcRef.current) return
        isGrpcRef.current = true
        const finalParams: QuerySyntaxFlowResultRequest = {
            ...query,
            Filter: {
                ...query.Filter,
                TaskIDs: [runtimeId]
            }
        }

        // 真正需要传给后端的查询数据
        const realQuery: QuerySyntaxFlowResultRequest = cloneDeep(query)
        // 倒序时需要额外处理传给后端顺序
        const verifyResult = verifyOrder(realQuery.Pagination, realQuery.Filter.AfterID)
        finalParams.Pagination = verifyResult.pagination
        apiFetchQuerySyntaxFlowResult(finalParams)
            .then((rsp: QuerySyntaxFlowResultResponse) => {
                const newData: SyntaxFlowResult[] = verifyResult.isReverse ? rsp.Results.reverse() : rsp.Results
                if (type === "top") {
                    if (newData.length <= 0) {
                        // 没有数据
                        serverPushStatus && setIsLoop(false)
                        return
                    }
                    if (["desc", "none"].includes(query.Pagination.Order)) {
                        setData([...newData, ...data])
                        maxIdRef.current = newData[0].ResultID
                    } else {
                        // 升序
                        if (rsp.Pagination.Limit - data.length >= 0) {
                            setData([...data, ...newData])
                            maxIdRef.current = newData[newData.length - 1].ResultID
                        }
                    }
                } else if (type === "bottom") {
                    if (newData.length <= 0) {
                        // 没有数据
                        serverPushStatus && setIsLoop(false)
                        return
                    }
                    const arr = [...data, ...newData]
                    setData(arr)
                    if (["desc", "none"].includes(query.Pagination.Order)) {
                        minIdRef.current = newData[newData.length - 1].ResultID
                    } else {
                        // 升序
                        maxIdRef.current = newData[newData.length - 1].ResultID
                    }
                } else if (type === "offset") {
                    if (newData.length <= 0) {
                        // 没有数据
                        serverPushStatus && setIsLoop(false)
                        return
                    }
                    if (["desc", "none"].includes(query.Pagination.Order)) {
                        const newOffsetData = newData.concat(getOffsetData())
                        maxIdRef.current = newOffsetData[0].ResultID
                        setOffsetData(newOffsetData)
                    }
                } else {
                    if (newData.length <= 0) {
                        // 没有数据
                        serverPushStatus && setIsLoop(false)
                    }
                    setIsRefresh(!isRefresh)
                    setPagination(rsp.Pagination)
                    setData([...newData])
                    if (["desc", "none"].includes(query.Pagination.Order)) {
                        maxIdRef.current = newData.length > 0 ? newData[0].ResultID : 0
                        minIdRef.current = newData.length > 0 ? newData[newData.length - 1].ResultID : 0
                    } else {
                        maxIdRef.current = newData.length > 0 ? newData[newData.length - 1].ResultID : 0
                        minIdRef.current = newData.length > 0 ? newData[0].ResultID : 0
                    }
                    setTotal(rsp.Total)
                    // 开启定时器 用于算total和拿最新的最大id
                    if (extraTimerRef.current) {
                        clearInterval(extraTimerRef.current)
                    }
                    extraTimerRef.current = setInterval(() => getAddDataByGrpc(finalParams), 1000)
                }
            })
            .catch((e: any) => {
                if (idRef.current) {
                    clearInterval(idRef.current)
                }
                yakitNotify("error", `query code scan failed: ${e}`)
            })
            .finally(() =>
                setTimeout(() => {
                    setLoading(false)
                    isGrpcRef.current = false
                }, 100)
            )
    })

    // 偏移量更新顶部数据
    const updateTopData = useMemoizedFn(() => {
        // 倒序的时候有储存的偏移量 则直接使用
        if (getOffsetData().length && ["desc", "none"].includes(sortRef.current.order)) {
            setData([...getOffsetData(), ...data])
            setOffsetData([])
            return
        }
        // 如无偏移 则直接请求数据
        if (maxIdRef.current === 0) {
            updateData()
            return
        }
        const paginationProps = {
            Page: 1,
            Limit: pagination.Limit,
            Order: sortRef.current.order,
            OrderBy: sortRef.current.orderBy || "id"
        }

        const query: QuerySyntaxFlowResultRequest = {
            ...params,
            Pagination: {...paginationProps},
            Filter: {...params.Filter, AfterID: maxIdRef.current}
        }
        getDataByGrpc(query, "top")
    })

    // 偏移量更新底部数据
    const updateBottomData = useMemoizedFn(() => {
        // 如无偏移 则直接请求数据
        if (minIdRef.current === 0) {
            updateData()
            return
        }
        const paginationProps = {
            Page: 1,
            Limit: pagination.Limit,
            Order: sortRef.current.order,
            OrderBy: sortRef.current.orderBy || "id"
        }

        const query: QuerySyntaxFlowResultRequest = {
            ...params,
            Pagination: {...paginationProps},
            Filter: {
                ...params.Filter,
                BeforeID: ["desc", "none"].includes(paginationProps.Order) ? minIdRef.current : undefined,
                AfterID: ["desc", "none"].includes(paginationProps.Order) ? undefined : maxIdRef.current
            }
        }
        getDataByGrpc(query, "bottom")
    })

    // 根据页面大小动态计算需要获取的最新数据条数(初始请求)
    const updateData = useMemoizedFn(() => {
        if (boxHeightRef.current) {
            setOffsetData([])
            maxIdRef.current = 0
            minIdRef.current = 0
            const limitCount: number = Math.ceil(boxHeightRef.current / 28)
            const paginationProps = {
                Page: 1,
                Limit: limitCount,
                Order: sortRef.current.order,
                OrderBy: sortRef.current.orderBy || "id"
            }
            const query = {
                ...params,
                Pagination: {...paginationProps}
            }
            setCurrentIndex(undefined)
            setOnlyShowFirstNode && setOnlyShowFirstNode(true)
            getDataByGrpc(query, "update")
        } else {
            setIsLoop(true)
        }
    })

    // 滚轮处于中间时 监听是否有数据更新
    const updateOffsetData = useMemoizedFn(() => {
        const paginationProps = {
            Page: 1,
            Limit: OFFSET_STEP,
            Order: "desc",
            OrderBy: "id"
        }
        const query = {
            ...params,
            Filter: {...params.Filter, AfterID: maxIdRef.current},
            Pagination: {...paginationProps}
        }
        getDataByGrpc(query, "offset")
    })

    /**@description 重置查询条件并刷新 */
    const onResetRefresh = useMemoizedFn(() => {
        sortRef.current = defSort
        const newParams: QuerySyntaxFlowResultRequest = {
            Pagination: genDefaultPagination(20),
            Filter: {
                TaskIDs: [],
                ResultIDs: [],
                RuleNames: [],
                ProgramNames: [],
                Keyword: "",
                OnlyRisk: false
            },
            ...(props.params || {})
        }
        setParams(newParams)
        setIsReset(!isReset)
        setTimeout(() => {
            updateData()
        }, 100)
    })

    const onRefreshMenuSelect = (key: string) => {
        switch (key) {
            case "noResetRefresh":
                updateData()
                break
            case "resetRefresh":
                onResetRefresh()
                break
            default:
                break
        }
    }
    const onCheckThan = useMemoizedFn((check: boolean) => {
        setParams({
            ...params,
            Filter: {
                ...params.Filter,
                OnlyRisk: check
            }
        })
        setTimeout(() => {
            updateData()
        }, 10)
    })

    const columns: ColumnsTypeProps[] = [
        {
            title: "序号",
            dataKey: "ResultID",
            fixed: "left",
            ellipsis: false,
            width: 96,
            enableDrag: false
        },
        {
            title: "扫描目标",
            dataKey: "ProgramName",
            width: 200,
            render: (text) => text || "-"
        },
        {
            title: "规则名称",
            dataKey: "Title",
            render: (text) => text || "-"
        },
        {
            title: "等级",
            dataKey: "Severity",
            width: 75,
            render: (_, i: SyntaxFlowResult) => {
                const title = SeverityMapTag.filter((item) => item.key.includes(i.Severity || ""))[0]
                return (
                    <YakitTag color={title?.tag as YakitTagColor} className={styles["table-severity-tag"]}>
                        {title ? title.name : i.Severity || "-"}
                    </YakitTag>
                )
            },
            filterProps: {
                filterKey: "Severity",
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
                        value: "middle",
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
            title: "风险个数",
            dataKey: "RiskCount",
            width: 160,
            render: (text) => text || "-",
            beforeIconExtra: (
                <div className={classNames(styles["body-length-checkbox"])}>
                    <YakitCheckbox
                        disabled={isExecuting}
                        checked={params.Filter.OnlyRisk}
                        onChange={(e) => onCheckThan(e.target.checked)}
                    />
                    <span className={styles["tip"]}>大于0</span>
                </div>
            )
        },
        {
            title: "操作",
            dataKey: "action",
            width: 100,
            fixed: "right",
            render: (_, rowData: SyntaxFlowResult) => {
                return (
                    <>
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
                                    // 跳转到审计页面的参数
                                    const params: AuditCodePageInfoProps = {
                                        Schema: "syntaxflow",
                                        Location: rowData.ProgramName,
                                        Path: `/`,
                                        Query: [{Key: "result_id", Value: rowData.ResultID}]
                                    }
                                    emiter.emit(
                                        "openPage",
                                        JSON.stringify({
                                            route: YakitRoute.YakRunner_Audit_Code,
                                            params
                                        })
                                    )
                                }}
                                icon={<OutlineTerminalIcon />}
                            />
                        </Tooltip>
                        <Divider type='vertical' />

                        <YakitButton
                            type='text2'
                            onClick={(e) => {
                                e.stopPropagation()
                                onDetail && onDetail(rowData)
                            }}
                            icon={<OutlineArrowcirclerightIcon />}
                        />
                    </>
                )
            }
        }
    ]

    const onTableChange = useMemoizedFn((page: number, limit: number, newSort: SortProps, filter: any) => {
        setParams({
            ...params,
            Filter: filter
        })
        setTimeout(() => {
            updateData()
        }, 10)
    })

    useEffect(() => {
        updateData()
    }, [])

    useUpdateEffect(() => {
        updateData()
    }, [refresh])

    const onRefreshCodeScanResultFun = useMemoizedFn((data) => {
        try {
            const updateData = JSON.parse(data)
            if (typeof updateData !== "string" && updateData.task_id === runtimeId) {
                if (updateData.action === "update") {
                    setIsLoop(true)
                }
            }
        } catch (error) {}
    })

    useEffect(() => {
        emiter.on("onRefreshCodeScanResult", onRefreshCodeScanResultFun)
        return () => {
            emiter.off("onRefreshCodeScanResult", onRefreshCodeScanResultFun)
        }
    })

    const scrollUpdate = useMemoizedFn(() => {
        if (isGrpcRef.current) return
        const scrollTop = tableRef.current?.containerRef?.scrollTop
        const clientHeight = tableRef.current?.containerRef?.clientHeight
        const scrollHeight = tableRef.current?.containerRef?.scrollHeight
        // let scrollBottom: number|undefined = undefined
        let scrollBottomPercent: number | undefined = undefined
        if (typeof scrollTop === "number" && typeof clientHeight === "number" && typeof scrollHeight === "number") {
            // scrollBottom = parseInt((scrollHeight - scrollTop - clientHeight).toFixed())
            scrollBottomPercent = Number(((scrollTop + clientHeight) / scrollHeight).toFixed(2))
        }

        // 滚动条接近触顶
        if (scrollTop < 10) {
            updateTopData()
            setOffsetData([])
        }
        // 滚动条接近触底
        else if (typeof scrollBottomPercent === "number" && scrollBottomPercent > 0.9) {
            updateBottomData()
            setOffsetData([])
        }
        // 滚动条在中间 增量
        else {
            if (data.length === 0) {
                updateData()
            } else {
                // 倒序的时候才需要掉接口拿偏移数据
                if (["desc", "none"].includes(sortRef.current.order)) {
                    updateOffsetData()
                }
            }
        }
    })

    useEffect(() => {
        let sTop, cHeight, sHeight
        let id = setInterval(() => {
            const scrollTop = tableRef.current?.containerRef?.scrollTop
            const clientHeight = tableRef.current?.containerRef?.clientHeight
            const scrollHeight = tableRef.current?.containerRef?.scrollHeight
            if (sTop !== scrollTop || cHeight !== clientHeight || sHeight !== scrollHeight) {
                setIsLoop(true)
            }
            sTop = scrollTop
            cHeight = clientHeight
            sHeight = scrollHeight
        }, 1000)
        return () => clearInterval(id)
    }, [])

    useEffect(() => {
        return () => {
            clearInterval(idRef.current)
        }
    }, [])
    useEffect(() => {
        if (inViewport) {
            scrollUpdate()
            if (isLoop) {
                if (idRef.current) {
                    clearInterval(idRef.current)
                }
                idRef.current = setInterval(scrollUpdate, 1000)
            }
        }
        return () => clearInterval(idRef.current)
    }, [inViewport, isLoop, scrollUpdate])
    return (
        <div ref={ref as Ref<any>} tabIndex={-1} style={{width: "100%", height: "100%", overflow: "hidden"}}>
            <ReactResizeDetector
                onResize={(width, height) => {
                    if (!width || !height) {
                        return
                    }
                    if (onlyShowFirstNode) {
                        // 窗口由小变大时 重新拉取数据
                        if (boxHeightRef.current && boxHeightRef.current < height) {
                            boxHeightRef.current = height
                            updateData()
                        } else {
                            boxHeightRef.current = height
                        }
                    }
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <div className={styles["code-scan-result-table"]}>
                <TableVirtualResize<SyntaxFlowResult>
                    ref={tableRef}
                    currentIndex={currentIndex}
                    setCurrentIndex={setCurrentIndex}
                    query={params.Filter}
                    titleHeight={42}
                    title={
                        <div className={styles["virtual-table-header-wrap"]}>
                            <div className={styles["virtual-table-heard-left"]}>
                                <div className={styles["virtual-table-heard-left-item"]}>
                                    <span className={styles["virtual-table-heard-left-text"]}>Total</span>
                                    <span className={styles["virtual-table-heard-left-number"]}>{total}</span>
                                </div>
                            </div>
                        </div>
                    }
                    extra={
                        <div className={styles["domainAsset-table-extra"]}>
                            <YakitInput.Search
                                placeholder='请输入关键词搜索'
                                style={{maxWidth: 200}}
                                onSearch={updateData}
                                onPressEnter={updateData}
                                value={params.Filter.Keyword}
                                onChange={(e) => {
                                    const {value} = e.target
                                    setParams({...params, Filter: {...params.Filter, Keyword: value}})
                                }}
                            />
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
                                <YakitButton type='text2' icon={<OutlineRefreshIcon />} />
                            </YakitDropdownMenu>
                        </div>
                    }
                    isReset={isReset}
                    isRefresh={isRefresh}
                    renderKey='ResultID'
                    data={data}
                    loading={loading}
                    enableDrag={true}
                    columns={columns}
                    pagination={{
                        page: pagination.Page,
                        limit: pagination.Limit,
                        total,
                        onChange: (page, limit) => {}
                    }}
                    onChange={onTableChange}
                    useUpAndDown={true}
                />
            </div>
        </div>
    )
})

interface CodeScanResultProp {
    runtimeId: string
    isExecuting: boolean
    onDetail?: (info: SyntaxFlowResult) => void
    /** data 更新后触发的 callback 方法 */
    updateDataCallback?: (data: SyntaxFlowResult[]) => void
}

export const CodeScanResult: React.FC<CodeScanResultProp> = (props) => {
    const ref = useRef(null)
    const [inViewport] = useInViewport(ref)

    return (
        <div className={styles["code-scan-result"]} ref={ref}>
            <CodeScanResultTable {...props} inViewport={inViewport} onlyShowFirstNode={true} />
        </div>
    )
}
