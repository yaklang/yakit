import React, {useEffect, useRef, useState} from "react"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useCreation, useDebounceFn, useMemoizedFn, useThrottleEffect, useUpdateEffect} from "ahooks"
import {SSARisk} from "../yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType"
import {useCampare} from "@/hook/useCompare/useCompare"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {formatTimestamp} from "@/utils/timeUtil"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {SeverityMapTag} from "../risks/YakitRiskTable/YakitRiskTable"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {YakitAuditRiskDetails} from "../yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTable"
import {isCellRedSingleColor} from "@/components/TableVirtualResize/utils"
import {QuerySyntaxFlowScanTaskResponse} from "../yakRunnerCodeScan/CodeScanTaskListDrawer/CodeScanTaskListDrawer"
import styles from "./SsaResDiff.module.scss"

const {ipcRenderer} = window.require("electron")

interface SSARiskDiffItem {
    ProgramName: string
    RuleName?: string
    Variable?: string
    RiskRuntimeId: string
}
interface SSARiskDiffRequest {
    BaseLine: SSARiskDiffItem
    Compare: SSARiskDiffItem
    DefaultCompare?: boolean
}
type SSARiskDiffStatus = "Equal" | "Add" | "Del"
interface SSARiskDiffResponse {
    BaseRisk: SSARisk
    CompareRisk: SSARisk
    RuleName: string
    Status: SSARiskDiffStatus
}

interface SsaResDiffProps {}
const SsaResDiff: React.FC<SsaResDiffProps> = React.memo((props) => {
    const [syntaxFlowScanTask, setSyntaxFlowScanTask] = useState<{label: string; value: string}[]>([])
    const [baseTaskID, setBaseTaskID] = useState<string>("")
    const [compareTaskID, setCompareTaskID] = useState<string>("")

    useEffect(() => {
        getSyntaxFlowScanTaskList()
    }, [])

    const getSyntaxFlowScanTaskList = useMemoizedFn(() => {
        ipcRenderer
            .invoke("QuerySyntaxFlowScanTask", {Filter: {}})
            .then((res: QuerySyntaxFlowScanTaskResponse) => {
                if (!res || !Array.isArray(res.Data)) {
                    return
                }
                setSyntaxFlowScanTask(
                    res.Data.map((item) => {
                        return {label: formatTimestamp(item.UpdatedAt), value: item.TaskId}
                    })
                )
            })
            .catch(() => {})
    })

    const [token, setToken] = useState<string>("")
    const timeRef = useRef<ReturnType<typeof setTimeout>>()
    const [ssaDiffRes, setSsaDiffRes] = useState<SSARiskDiffResponse[]>()
    const ssaDiffResRef = useRef<SSARiskDiffResponse[]>([])
    const [isRefreshBaseTable, setIsRefreshBaseTable] = useState<boolean>(false)
    const [isRefreshCompareTable, setIsRefreshCompareTable] = useState<boolean>(false)
    const onStartDiff = useMemoizedFn(() => {
        setSsaDiffRes([])
        ssaDiffResRef.current = []
        setIsRefreshBaseTable((prev) => !prev)
        setIsRefreshCompareTable((prev) => !prev)

        const t = randomString(40)
        setToken(t)

        const params: SSARiskDiffRequest = {
            BaseLine: {
                ProgramName: "",
                RiskRuntimeId: baseTaskID
            },
            Compare: {
                ProgramName: "",
                RiskRuntimeId: compareTaskID
            }
        }
        ipcRenderer
            .invoke("SSARiskDiff", params, t)
            .then(() => {})
            .catch((err) => {
                yakitNotify("error", "对比失败：" + err)
            })
    })

    useEffect(() => {
        if (!token) return
        const updateNewSSADiffStream = () => {
            setSsaDiffRes(ssaDiffResRef.current.slice())
        }
        timeRef.current = setInterval(updateNewSSADiffStream, 200)
        ipcRenderer.on(`${token}-data`, async (e, data: SSARiskDiffResponse) => {
            ssaDiffResRef.current.push(data)
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            yakitNotify("error", `error: ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {})
        return () => {
            if (token) {
                ipcRenderer.invoke(`cancel-SSARiskDiff`, token)
                ipcRenderer.removeAllListeners(`${token}-data`)
                ipcRenderer.removeAllListeners(`${token}-error`)
                ipcRenderer.removeAllListeners(`${token}-end`)
                clearInterval(timeRef.current)
            }
        }
    }, [token])

    const baseRisk = useCreation(() => {
        return (ssaDiffRes || [])
            .map((item) => {
                const baseRisk = {...item.BaseRisk}
                if (item.Status === "Del") {
                    baseRisk.cellClassName = "table-cell-bg-red"
                }
                return baseRisk
            })
            .filter((item) => item.Id != 0)
    }, [ssaDiffRes])

    const compareRisk = useCreation(() => {
        return (ssaDiffRes || [])
            .map((item) => {
                const compareRisk = {...item.CompareRisk}
                if (item.Status === "Add") {
                    compareRisk.cellClassName = "table-cell-bg-green"
                }
                return compareRisk
            })
            .filter((item) => item.Id != 0)
    }, [ssaDiffRes])

    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "50%",
            secondRatio: "50%"
        }
        return p
    }, [])

    return (
        <div className={styles["ssaResDiff"]}>
            <YakitResizeBox
                freeze={true}
                firstNode={
                    <div className={styles["ssaResTable-BaseRisk"]}>
                        <div className={styles["ssaResDiff-header"]}>
                            <div className={styles["ssaResDiff-ssaDiffItem"]}>
                                <span>选择扫描结果</span>
                                <YakitSelect
                                    placeholder='请选择后对比'
                                    options={syntaxFlowScanTask}
                                    notFoundContent='暂无数据'
                                    onChange={(value) => setBaseTaskID(value)}
                                />
                            </div>
                        </div>
                        <SsaResTableAndDetail tableData={baseRisk} isRefreshTable={isRefreshBaseTable} />
                    </div>
                }
                firstMinSize={300}
                secondNode={
                    <div className={styles["ssaResTable-CompareRisk"]}>
                        <div className={styles["ssaResDiff-header"]}>
                            <div className={styles["ssaResDiff-ssaDiffItem"]}>
                                <span>对比扫描结果</span>
                                <YakitSelect
                                    placeholder='请选择后对比'
                                    options={syntaxFlowScanTask}
                                    notFoundContent='暂无数据'
                                    onChange={(value) => setCompareTaskID(value)}
                                />
                            </div>
                            <YakitButton type='primary' onClick={onStartDiff} disabled={!(baseTaskID && compareTaskID)}>
                                开始对比
                            </YakitButton>
                        </div>
                        <SsaResTableAndDetail tableData={compareRisk} isRefreshTable={isRefreshCompareTable} />
                    </div>
                }
                secondMinSize={300}
                {...ResizeBoxProps}
            ></YakitResizeBox>
        </div>
    )
})

export default SsaResDiff

interface SsaResTableAndDetailProps {
    tableData: SSARisk[]
    isRefreshTable: boolean
}
const SsaResTableAndDetail: React.FC<SsaResTableAndDetailProps> = React.memo((props) => {
    const {tableData, isRefreshTable} = props
    const [currentSelectItem, setCurrentSelectItem] = useState<SSARisk>()

    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "50%",
            secondRatio: "50%"
        }
        if (!currentSelectItem) {
            p.firstRatio = "100%"
            p.secondRatio = "0%"
        }
        return p
    }, [currentSelectItem])

    useEffect(() => {
        setCurrentSelectItem(undefined)
    }, [isRefreshTable])

    return (
        <div className={styles["ssaResTableAndDetail"]}>
            <YakitResizeBox
                isVer={true}
                freeze={!!currentSelectItem}
                firstNode={
                    <div className={styles["ssaResTableAndDetail-top"]}>
                        <SsaResTable
                            tableData={tableData}
                            isRefreshTable={isRefreshTable}
                            currentSelectItem={currentSelectItem}
                            onSetCurrentSelectItem={setCurrentSelectItem}
                        />
                    </div>
                }
                firstMinSize={40}
                secondNode={
                    <div className={styles["ssaResTableAndDetail-bottom"]}>
                        {currentSelectItem && <YakitAuditRiskDetails info={currentSelectItem} isShowExtra={true} />}
                    </div>
                }
                secondNodeStyle={{
                    display: !currentSelectItem ? "none" : "",
                    padding: !currentSelectItem ? 0 : undefined
                }}
                lineStyle={{display: !currentSelectItem ? "none" : ""}}
                lineDirection='top'
                {...ResizeBoxProps}
            ></YakitResizeBox>
        </div>
    )
})

interface SsaResTableProps {
    tableData: SSARisk[]
    isRefreshTable: boolean
    currentSelectItem?: SSARisk
    onSetCurrentSelectItem: React.Dispatch<React.SetStateAction<SSARisk | undefined>>
}
const SsaResTable: React.FC<SsaResTableProps> = React.memo((props) => {
    const {tableData, isRefreshTable, currentSelectItem, onSetCurrentSelectItem} = props
    const tableRef = useRef<any>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [tableQuery, setTableQuery] = useState({})
    const [showList, setShowList] = useState<SSARisk[]>([])
    const [scrollToIndex, setScrollToIndex] = useState<string>()

    const scrollUpdate = useMemoizedFn((dataLength) => {
        const scrollTop = tableRef.current?.containerRef?.scrollTop
        const clientHeight = tableRef.current?.containerRef?.clientHeight
        const scrollHeight = tableRef.current?.containerRef?.scrollHeight
        let scrollBottom: number | undefined = undefined
        if (typeof scrollTop === "number" && typeof clientHeight === "number" && typeof scrollHeight === "number") {
            scrollBottom = parseInt((scrollHeight - scrollTop - clientHeight).toFixed())
            const isScroll: boolean = scrollHeight > clientHeight
            if (scrollBottom <= 2 && isScroll) {
                setScrollToIndex(dataLength)
            }
        }
    })

    const queryUpdateData = useDebounceFn(
        () => {
            const newData = tableData || []
            setShowList([...newData])
            if (newData.length) {
                scrollUpdate(newData.length)
            } else {
                setScrollToIndex("0")
            }
        },
        {wait: 300}
    ).run

    const update = useDebounceFn(
        () => {
            setLoading(true)
            queryUpdateData()
            setTimeout(() => {
                setLoading(false)
            }, 300)
        },
        {
            wait: 200
        }
    ).run

    useEffect(() => {
        update()
    }, [isRefreshTable])

    const compareTableData = useCampare(tableData)
    const compareQuery = useCampare(tableQuery)
    useThrottleEffect(
        () => {
            queryUpdateData()
        },
        [compareTableData],
        {wait: 500}
    )
    useUpdateEffect(() => {
        update()
    }, [compareQuery])

    const onTableChange = useMemoizedFn((page: number, limit: number, newSort: SortProps, filter: any) => {
        const newTableQuery = {...tableQuery, ...filter}
        setTableQuery(newTableQuery)
    })

    const onSetCurrentRow = useMemoizedFn((val?: SSARisk) => {
        if (!val) {
            onSetCurrentSelectItem(undefined)
            return
        }
        if (val?.Id !== currentSelectItem?.Id) {
            onSetCurrentSelectItem(val)
        }
    })

    const columns: ColumnsTypeProps[] = useCreation<ColumnsTypeProps[]>(() => {
        const columnArr: ColumnsTypeProps[] = [
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
                render: (_, record) => record?.titleVerbose || record.title || "-"
            },
            {
                title: "类型",
                dataKey: "RiskTypeVerbose"
            },
            {
                title: "等级",
                dataKey: "Severity",
                align: "center",
                width: 75,
                render: (_, i) => {
                    const title = SeverityMapTag.filter((item) => item.key.includes(i.Severity || ""))[0]
                    const color = isCellRedSingleColor(i.cellClassName) ? "white" : title?.tag
                    return (
                        <YakitTag color={color as YakitTagColor} className={styles["table-severity-tag"]}>
                            {title ? title.name : i.severity || "-"}
                        </YakitTag>
                    )
                }
            },
            {
                title: "所属项目",
                dataKey: "ProgramName"
            },
            {
                title: "处置状态",
                dataKey: "Tags",
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
                dataKey: "CreatedAt",
                render: (text) => (text ? formatTimestamp(text) : "-")
            }
        ]
        return columnArr
    }, [])

    return (
        <div className={styles["ssaResTable"]}>
            <TableVirtualResize<SSARisk>
                ref={tableRef}
                renderKey='Id'
                isShowTitle={false}
                columns={columns}
                query={tableQuery}
                isRefresh={isRefreshTable || loading}
                loading={loading}
                isShowTotal={false}
                data={showList}
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
                scrollToIndex={scrollToIndex}
                currentSelectItem={currentSelectItem}
                onSetCurrentRow={onSetCurrentRow}
            ></TableVirtualResize>
        </div>
    )
})
