import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePlay2Icon, OutlineRefreshIcon} from "@/assets/icon/outline"
import {Descriptions, Divider} from "antd"
import {
    useCreation,
    useDebounceEffect,
    useDebounceFn,
    useEventListener,
    useMemoizedFn,
    useThrottleFn,
    useUpdateEffect
} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {useCampare} from "@/hook/useCompare/useCompare"
import {formatTimestamp} from "@/utils/timeUtil"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {cloneDeep, isEqual} from "lodash"
import {TraceSvgSvgIcon} from "@/assets/icons"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteMitmGV} from "@/enums/mitm"
import classNames from "classnames"
import {PluginExecutionTrace, PluginTraceProps, QueryPluginTrace} from "./type"
import styles from "./PluginTrace.module.scss"

const TraceStatusMapTag = [
    {
        key: ["pending"],
        name: "等待中",
        tag: "blue"
    },
    {key: ["running"], name: "执行中", tag: "yellow"},
    {
        key: ["completed"],
        name: "完成",
        tag: "success"
    },
    {key: ["failed"], name: "失败", tag: "danger"},
    {
        key: ["cancelled"],
        name: "取消",
        tag: "info"
    }
]

export const pluginTraceRefFunDef = {
    noDetailFun: () => {},
    refreshAndScrollNow: () => {},
    refreshFlush: () => {},
    syncTracesToState: () => {},
    cancelTracesToState: () => {}
}

const PluginTrace: React.FC<PluginTraceProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {
            isInitTrace,
            startLoading,
            tracing,
            stopLoading,
            startPluginTrace,
            resetPluginTrace,
            stopPluginTrace,
            cancelPluginTraceById,
            pluginTraceStats,
            pluginTraceList
        } = props

        useImperativeHandle(
            ref,
            () => ({
                noDetailFun: noDetailFun, // 不显示详情
                refreshFlush: refreshFlush, // 立即刷新表格数据
                refreshAndScrollNow: refreshAndScrollNow, // 立即刷新表格数据且滚动到第一个元素
                syncTracesToState: syncTracesToState, // 节流表格数据
                cancelTracesToState: cancelTraces // 取消节流表格数据
            }),
            []
        )

        const [searchValue, setSearchValue] = useState<string>("")
        const tableRef = useRef<any>(null)
        const mouseenterRef = useRef<boolean>(false)
        const [tableQuery, setTableQuery] = useState<QueryPluginTrace>({
            KeyWords: "",
            Status: []
        })
        const [tableLoading, setTableLoading] = useState<boolean>(false)
        const [showList, setShowList] = useState<PluginExecutionTrace[]>([])
        const [scrollToIndex, setScrollToIndex] = useState<number | string>()
        const [refresh, setRefresh] = useState<boolean>(true)
        const [selectCurTrace, setSelectCurTrace] = useState<PluginExecutionTrace>()
        const [secondNodeVisible, setSecondNodeVisible] = useState<boolean>(false)
        const [isRefreshPluginTraces, setIsRefreshPluginTraces] = useState<boolean>(false)
        const rafIdRef = useRef<number>(0)

        const noDetailFun = useMemoizedFn(() => {
            setSelectCurTrace(undefined)
            setSecondNodeVisible(false)
        })
        useUpdateEffect(() => {
            noDetailFun()
        }, [refresh])

        useEventListener(
            "mouseenter",
            () => {
                mouseenterRef.current = true
            },
            {target: tableRef.current?.containerRef}
        )
        useEventListener(
            "mouseleave",
            () => {
                mouseenterRef.current = false
                syncTracesToState()
            },
            {target: tableRef.current?.containerRef}
        )

        const refreshWithRaf = useMemoizedFn(() => {
            cancelAnimationFrame(rafIdRef.current)
            rafIdRef.current = requestAnimationFrame(() => refreshFlush())
        })

        const {run: throttledRefresh, cancel: cancelTraces} = useThrottleFn(refreshWithRaf, {
            wait: 1000,
            leading: true,
            trailing: true
        })

        const syncTracesToState = useMemoizedFn(() => {
            if (mouseenterRef.current || !tracing) return
            throttledRefresh()
        })

        const refreshFlush = useMemoizedFn(() => {
            setIsRefreshPluginTraces((prev) => !prev)
        })

        const onResetPluginTrace = useMemoizedFn(() => {
            cancelTraces()
            resetPluginTrace()
            setShowList([])
            refreshAndScrollNow()
        })

        const lastRatioRef = useRef<{firstRatio: string; secondRatio: string}>({
            firstRatio: "50%",
            secondRatio: "50%"
        })
        useEffect(() => {
            getRemoteValue(RemoteMitmGV.MitmTraceResizeBox).then((res) => {
                if (res) {
                    try {
                        const {firstSizePercent, secondSizePercent} = JSON.parse(res)
                        lastRatioRef.current = {
                            firstRatio: firstSizePercent,
                            secondRatio: secondSizePercent
                        }
                    } catch (error) {}
                }
            })
        }, [])
        const ResizeBoxProps = useCreation(() => {
            let p = cloneDeep(lastRatioRef.current)
            if (!secondNodeVisible) {
                p.firstRatio = "100%"
                p.secondRatio = "0%"
            }
            return {
                ...p,
                secondNodeStyle: {
                    display: !secondNodeVisible ? "none" : "",
                    padding: !secondNodeVisible ? 0 : undefined
                },
                lineStyle: {display: !secondNodeVisible ? "none" : ""}
            }
        }, [secondNodeVisible])
        const onMouseUp = useMemoizedFn(({firstSizePercent, secondSizePercent}) => {
            lastRatioRef.current = {
                firstRatio: firstSizePercent,
                secondRatio: secondSizePercent
            }
            // 缓存比例用于下次加载
            setRemoteValue(
                RemoteMitmGV.MitmTraceResizeBox,
                JSON.stringify({
                    firstSizePercent,
                    secondSizePercent
                })
            )
        })

        const refreshAndScrollNow = useMemoizedFn(() => {
            refreshFlush()
            setRefresh((prev) => !prev)
        })

        const onSearchChange = useMemoizedFn((e: {target: {value: string}}) => {
            const value = e.target.value
            setSearchValue(value)
        })

        const onSearch = useMemoizedFn((value: string) => {
            setTableQuery((prev) => ({
                ...prev,
                KeyWords: value.trim()
            }))
        })

        const traceStatusTag = useMemoizedFn((text) => {
            const title = TraceStatusMapTag.filter((item) => item.key.includes(text || ""))[0]
            return (
                <YakitTag color={title?.tag as YakitTagColor} className={styles["table-traceStatus-tag"]}>
                    {title ? title.name : text || "-"}
                </YakitTag>
            )
        })

        const columns: ColumnsTypeProps[] = useCreation<ColumnsTypeProps[]>(() => {
            const columnArr: ColumnsTypeProps[] = [
                {
                    title: "序号",
                    width: 96,
                    fixed: "left",
                    dataKey: "Index"
                },
                {
                    title: "插件名称",
                    width: 200,
                    dataKey: "PluginID"
                },
                {
                    title: "Hook名称",
                    dataKey: "HookName",
                    width: 200
                },
                {
                    title: "状态",
                    dataKey: "Status",
                    width: 80,
                    filterProps: {
                        filterKey: "Status",
                        filtersType: "select",
                        filterMultiple: true,
                        filters: [
                            {
                                label: "执行中",
                                value: "running"
                            },
                            {
                                label: "失败",
                                value: "failed"
                            },
                            {
                                label: "取消",
                                value: "cancelled"
                            }
                        ]
                    },
                    render: (text) => traceStatusTag(text)
                },
                {
                    title: "调用参数",
                    width: 300,
                    dataKey: "ExecutionArgsStr"
                },
                {
                    title: "开始时间",
                    width: 150,
                    dataKey: "StartTime",
                    render: (text) => <div>{text === 0 ? "-" : formatTimestamp(text)}</div>
                },
                {
                    title: "耗时（ms）",
                    width: 100,
                    dataKey: "DurationMs"
                },
                {
                    title: "错误信息",
                    width: 200,
                    dataKey: "ErrorMessage"
                },
                {
                    title: "操作",
                    width: 70,
                    fixed: "right",
                    dataKey: "Action",
                    render: (_, record) => {
                        if (record.Status === "running") {
                            return (
                                <YakitButton
                                    colors='danger'
                                    size='small'
                                    onClick={() => cancelPluginTraceById(record.TraceID)}
                                >
                                    取消
                                </YakitButton>
                            )
                        } else {
                            return <></>
                        }
                    }
                }
            ]
            return columnArr
        }, [])

        const updateSelectCurTrace = useMemoizedFn((traceList) => {
            if (selectCurTrace) {
                let index = -1
                traceList.forEach((trace: PluginExecutionTrace, i: number) => {
                    if (trace.TraceID === selectCurTrace.TraceID) {
                        index = i
                        if (!isEqual(selectCurTrace, trace)) {
                            setSelectCurTrace(trace)
                        }
                    }
                })
                if (index === -1) {
                    const newSelectCurTrace: PluginExecutionTrace = {
                        ...selectCurTrace,
                        Status: "completed"
                    }
                    if (!isEqual(selectCurTrace, newSelectCurTrace)) {
                        setSelectCurTrace(newSelectCurTrace)
                    }
                }
            }
        })

        const queryUpdateData = useDebounceFn(
            () => {
                try {
                    if (tableQuery.Status.length || tableQuery.KeyWords) {
                        const newDataTable = pluginTraceList()
                        const l = newDataTable.length
                        const searchList: PluginExecutionTrace[] = []
                        for (let index = 0; index < l; index++) {
                            const record = newDataTable[index]

                            let statusIsPush = true
                            let keyWordsIsPush = true

                            if (tableQuery.Status.length) {
                                statusIsPush = tableQuery.Status.includes(record.Status)
                            }

                            if (tableQuery.KeyWords) {
                                keyWordsIsPush = (
                                    record.PluginID.toLocaleLowerCase() + record.HookName.toLocaleLowerCase()
                                ).includes(tableQuery.KeyWords.toLocaleLowerCase())
                            }

                            if (statusIsPush && keyWordsIsPush) {
                                searchList.push(record)
                            }
                        }
                        setShowList([...searchList])
                        if (!searchList.length) {
                            setRefresh((prev) => !prev)
                        } else {
                            updateSelectCurTrace(searchList)
                        }
                    } else {
                        const newData = pluginTraceList()
                        setShowList([...newData])
                        if (!newData.length) {
                            setRefresh((prev) => !prev)
                        } else {
                            updateSelectCurTrace(newData)
                        }
                    }
                } catch (error) {
                    yakitNotify("error", "搜索失败:" + error)
                }
            },
            {wait: 300}
        ).run

        const update = useDebounceFn(
            () => {
                setTableLoading(true)
                new Promise((resolve, reject) => {
                    try {
                        queryUpdateData()
                        resolve(true)
                    } catch (error) {
                        reject(error)
                    }
                })
                    .catch((e) => {
                        yakitNotify("error", "搜索失败:" + e)
                    })
                    .finally(() => {
                        setTimeout(() => {
                            setTableLoading(false)
                        }, 300)
                    })
            },
            {
                wait: 500
            }
        ).run

        useEffect(() => {
            update()
        }, [isRefreshPluginTraces])

        const compareQuery = useCampare(tableQuery)
        useDebounceEffect(
            () => {
                refreshAndScrollNow()
            },
            [compareQuery],
            {wait: 300}
        )
        const onTableChange = useMemoizedFn((page: number, limit: number, newSort: SortProps, filter: any) => {
            const newTableQuery = {...cloneDeep(tableQuery), ...filter}
            setTableQuery(newTableQuery)
        })

        const onSetCurrentRow = useDebounceFn(
            (rowDate: PluginExecutionTrace | undefined) => {
                setSelectCurTrace(rowDate)
                setSecondNodeVisible(rowDate ? true : false)
            },
            {wait: 200, leading: true}
        ).run

        const onPositioning = useMemoizedFn((traceID: string) => {
            let scrollToIndex: number | undefined = undefined
            showList.forEach((item, index) => {
                if (item.TraceID === traceID) {
                    scrollToIndex = index
                }
            })
            if (scrollToIndex !== undefined) {
                // 加随机值触发更新渲染执行表格跳转方法
                setScrollToIndex(scrollToIndex + "_" + Math.random())
            }
        })

        return (
            <div className={styles["plugin-trace"]}>
                {isInitTrace ? (
                    <YakitEmpty
                        image={<TraceSvgSvgIcon />}
                        title='插件追踪'
                        description='开启追踪后可查看插件具体的执行情况和执行失败的原因'
                        style={{marginTop: 80}}
                    >
                        <YakitButton
                            type='primary'
                            icon={<OutlinePlay2Icon />}
                            onClick={startPluginTrace}
                            loading={startLoading}
                        >
                            开始追踪
                        </YakitButton>
                    </YakitEmpty>
                ) : (
                    <YakitResizeBox
                        isVer={true}
                        firstNode={
                            <div className={styles["plugin-trace-content"]}>
                                <YakitInput.Search
                                    wrapperStyle={{marginBottom: 8}}
                                    placeholder='请输入插件名或Hook名进行搜索'
                                    onChange={onSearchChange}
                                    onSearch={onSearch}
                                    value={searchValue}
                                />
                                <div className={styles["plugin-trace-content-list"]}>
                                    <TableVirtualResize<PluginExecutionTrace>
                                        ref={tableRef}
                                        renderKey='TraceID'
                                        titleHeight={38}
                                        renderTitle={
                                            <div className={styles["plugin-trace-content-list-header"]}>
                                                <div className={styles["pluginTraceStats-bar"]}>
                                                    <div className={styles["label"]}>
                                                        总数{" "}
                                                        <span className={styles["totalTraces"]}>
                                                            {pluginTraceStats().TotalTraces}
                                                        </span>
                                                    </div>
                                                    <div className='divider'>|</div>
                                                    <div className={styles["label"]}>
                                                        执行中{" "}
                                                        <span className={styles["runningTraces"]}>
                                                            {pluginTraceStats().RunningTraces}
                                                        </span>
                                                    </div>
                                                    <div className='divider'>|</div>
                                                    <div className={styles["label"]}>
                                                        失败{" "}
                                                        <span className={styles["failedTraces"]}>
                                                            {pluginTraceStats().FailedTraces}
                                                        </span>
                                                    </div>
                                                    <div className='divider'>|</div>
                                                    <div className={styles["label"]}>
                                                        已完成{" "}
                                                        <span className={styles["completedTraces"]}>
                                                            {pluginTraceStats().CompletedTraces}
                                                        </span>
                                                    </div>
                                                    <div className='divider'>|</div>
                                                    <div className={styles["label"]}>
                                                        取消{" "}
                                                        <span className={styles["cancelledTraces"]}>
                                                            {pluginTraceStats().CancelledTraces}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className={styles["plugin-trace-content-list-header-right"]}>
                                                    {tracing ? (
                                                        <div
                                                            className={
                                                                styles["plugin-trace-content-list-header-right-stop"]
                                                            }
                                                        >
                                                            <YakitButton
                                                                type='outline1'
                                                                colors='danger'
                                                                size='small'
                                                                onClick={onResetPluginTrace}
                                                            >
                                                                重置
                                                            </YakitButton>
                                                            <YakitButton
                                                                type='outline1'
                                                                colors='danger'
                                                                size='small'
                                                                loading={stopLoading}
                                                                onClick={stopPluginTrace}
                                                            >
                                                                停止追踪
                                                            </YakitButton>
                                                            <YakitButton
                                                                type='text2'
                                                                icon={<OutlineRefreshIcon />}
                                                                onClick={refreshAndScrollNow}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <YakitButton
                                                            type='primary'
                                                            size='small'
                                                            onClick={startPluginTrace}
                                                            loading={startLoading}
                                                        >
                                                            开始追踪
                                                        </YakitButton>
                                                    )}
                                                </div>
                                            </div>
                                        }
                                        columns={columns}
                                        query={tableQuery}
                                        isRefresh={refresh}
                                        loading={tableLoading}
                                        isShowTotal={false}
                                        data={showList}
                                        overscan={50}
                                        onChange={onTableChange}
                                        pagination={{
                                            total: showList.length,
                                            limit: 1,
                                            page: 20,
                                            onChange: () => {}
                                        }}
                                        enableDrag={true}
                                        useUpAndDown
                                        inMouseEnterTable
                                        onSetCurrentRow={onSetCurrentRow}
                                        scrollToIndex={scrollToIndex}
                                    ></TableVirtualResize>
                                </div>
                            </div>
                        }
                        secondNode={
                            secondNodeVisible && (
                                <div
                                    className={classNames(
                                        styles["plugin-trace-details-content"],
                                        "yakit-descriptions",
                                        {
                                            [styles["plugin-trace-details-content-no-border"]]: true
                                        }
                                    )}
                                >
                                    <div className={styles["content-heard"]}>
                                        <div className={styles["content-heard-left"]}>
                                            <div className={styles["content-heard-body"]}>
                                                <div
                                                    className={classNames(
                                                        styles["content-heard-body-title"],
                                                        "content-ellipsis"
                                                    )}
                                                >
                                                    {selectCurTrace?.PluginID || "-"}
                                                </div>
                                                <div
                                                    className={styles["content-heard-body-description"]}
                                                    style={{flexWrap: "wrap"}}
                                                >
                                                    <YakitTag
                                                        color='yellow'
                                                        onClick={() => {
                                                            if (!selectCurTrace?.TraceID) {
                                                                yakitNotify("info", "列表未找到，暂无法定位")
                                                                return
                                                            }

                                                            if (selectCurTrace?.Status === "completed") {
                                                                yakitNotify(
                                                                    "info",
                                                                    selectCurTrace?.TraceID +
                                                                        "：状态已执行完成，已自动从列表移除，暂无法定位"
                                                                )
                                                                return
                                                            }

                                                            onPositioning(selectCurTrace?.TraceID)
                                                        }}
                                                        style={{cursor: "pointer"}}
                                                    >
                                                        ID: {selectCurTrace?.Index}
                                                    </YakitTag>
                                                    <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                                                    <span className={styles["content-heard-body-time"]}>
                                                        开始时间:
                                                        {!!selectCurTrace?.StartTime
                                                            ? formatTimestamp(selectCurTrace?.StartTime)
                                                            : "-"}
                                                    </span>
                                                    <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                                                    {traceStatusTag(selectCurTrace?.Status)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles["content-resize-second"]}>
                                        <Descriptions bordered size='small' column={2} labelStyle={{width: 120}}>
                                            <Descriptions.Item label='Hook名称'>
                                                {selectCurTrace?.HookName || "-"}
                                            </Descriptions.Item>
                                            <Descriptions.Item label='耗时'>
                                                {selectCurTrace?.DurationMs || "-"}
                                            </Descriptions.Item>
                                            <Descriptions.Item label='调用参数' span={2}>
                                                <div className={styles["descriptions-item"]}>
                                                    {selectCurTrace?.ExecutionArgsStr && (
                                                        <CopyComponents
                                                            copyText={selectCurTrace?.ExecutionArgsStr || ""}
                                                        />
                                                    )}
                                                    {selectCurTrace?.ExecutionArgsStr || "-"}
                                                </div>
                                            </Descriptions.Item>
                                            <Descriptions.Item label='错误信息' span={2}>
                                                <div className={styles["descriptions-item"]}>
                                                    {selectCurTrace?.ErrorMessage && (
                                                        <CopyComponents copyText={selectCurTrace?.ErrorMessage || ""} />
                                                    )}
                                                    {selectCurTrace?.ErrorMessage || "-"}
                                                </div>
                                            </Descriptions.Item>
                                        </Descriptions>
                                        <div className={styles["no-more"]}>暂无更多</div>
                                    </div>
                                </div>
                            )
                        }
                        firstMinSize={80}
                        secondMinSize={200}
                        lineDirection='top'
                        onMouseUp={onMouseUp}
                        {...ResizeBoxProps}
                    ></YakitResizeBox>
                )}
            </div>
        )
    })
)

export default PluginTrace
