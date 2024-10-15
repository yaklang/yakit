import React, {useEffect, useMemo, useRef, useState} from "react"
import {Divider} from "antd"
import {} from "@ant-design/icons"
import {useCreation, useGetState, useInterval, useMemoizedFn, useUpdateEffect} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./CodeScanExecuteResult.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {HoldGRPCStreamProps, StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {EngineConsole} from "@/components/baseConsole/BaseConsole"
import PluginTabs from "@/components/businessUI/PluginTabs/PluginTabs"
import {HorizontalScrollCard} from "@/pages/plugins/operator/horizontalScrollCard/HorizontalScrollCard"
import {LocalPluginLog} from "@/pages/plugins/operator/pluginExecuteResult/LocalPluginLog"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineRefreshIcon} from "@/assets/icon/outline"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {QuerySyntaxFlowResultRequest, QuerySyntaxFlowResultResponse, SyntaxFlowResult} from "../YakRunnerCodeScanType"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {apiFetchQuerySyntaxFlowResult} from "../utils"
import emiter from "@/utils/eventBus/eventBus"
const {ipcRenderer} = window.require("electron")
const {TabPane} = PluginTabs
export interface CodeScanStreamInfo {
    logState: StreamResult.Log[]
}

export interface CodeScanExecuteResultProps {
    runtimeId: string
    streamInfo: CodeScanStreamInfo
    loading: boolean
    defaultActiveKey?: string
    codeScanExecuteResultWrapper?: string
}
export const CodeScanExecuteResult: React.FC<CodeScanExecuteResultProps> = (props) => {
    const {streamInfo, runtimeId, loading, defaultActiveKey, codeScanExecuteResultWrapper = ""} = props

    const [allTotal, setAllTotal] = useState<number>(0)
    const [tempTotal, setTempTotal] = useState<number>(0) // 在risk表没有展示之前得临时显示在tab上得小红点计数
    const [interval, setInterval] = useState<number | undefined>(1000)

    useUpdateEffect(() => {
        setAllTotal(0)
        setTempTotal(0)
        setInterval(1000)
    }, [runtimeId])

    useInterval(() => {
        if (runtimeId) getTotal()
    }, interval)

    const getTotal = useMemoizedFn(() => {
        // const params: QueryRisksRequest = {
        //     ...defQueryRisksRequest,
        //     Pagination: {
        //         ...defQueryRisksRequest.Pagination,
        //         Page: 1,
        //         Limit: 1
        //     },
        //     RuntimeId: runtimeId
        // }
        // apiQueryRisks(params).then((allRes) => {
        //     if (+allRes.Total > 0) {
        //         setTempTotal(+allRes.Total)
        //     }
        // })
    })

    /**
     * 漏洞风险tab没有点击之前，tabContent不会渲染展示；不会请求数据
     * 强制渲染得话，组件内部不会请求数据
     * 采取：没有点击漏洞风险tab之前，由外面根据runtimeId查询是否有数据，有数据就展示对应得tab,以里面传出来得total为准，total>0后停止外面得useInterval，
     */
    const onSetRiskTotal = useMemoizedFn((total) => {
        if (total > 0) {
            setAllTotal(total)
            if (interval) setInterval(undefined)
        }
    })

    const renderTabContent = useMemoizedFn((ele: HoldGRPCStreamProps.InfoTab) => {
        switch (ele.type) {
            case "risk":
                return <CodeScanRisksTable runtimeId={runtimeId} allTotal={allTotal} setAllTotal={onSetRiskTotal} />
            case "result":
                return <CodeScanResultTable runtimeId={runtimeId} />
            case "log":
                return <LocalPluginLog loading={loading} list={streamInfo.logState} />
            case "console":
                return <EngineConsole isMini={true} />
            default:
                return <></>
        }
    })

    const showTabs = useMemo(() => {
        return [
            {tabName: "审计结果", type: "result"},
            {tabName: "漏洞与风险", type: "risk"},
            {tabName: "日志", type: "log"},
            {tabName: "Console", type: "console"}
        ]
    }, [])

    const tabBarRender = useMemoizedFn((tab: HoldGRPCStreamProps.InfoTab, length: number) => {
        if (tab.type === "risk") {
            return (
                <>
                    {tab.tabName}
                    <span className={styles["code-scan-execute-result-tabBar"]}>{length}</span>
                </>
            )
        }
        return tab.tabName
    })

    const showRiskTotal = useCreation(() => {
        if (allTotal > 0) return allTotal
        return tempTotal
    }, [allTotal, tempTotal])
    return (
        <div className={classNames(styles["code-scan-execute-result"], codeScanExecuteResultWrapper)}>
            {showTabs.length > 0 && (
                <PluginTabs defaultActiveKey={defaultActiveKey}>
                    {showTabs.map((ele) => (
                        <TabPane
                            tab={tabBarRender(ele, showRiskTotal)}
                            key={ele.tabName}
                            className={styles["code-scan-execute-result-tabPane"]}
                        >
                            {renderTabContent(ele)}
                        </TabPane>
                    ))}
                </PluginTabs>
            )}
        </div>
    )
}

interface CodeScanRisksTableProps {
    runtimeId: string
    allTotal: number
    setAllTotal: (n: number) => void
}

/** 审计漏洞表 */
const CodeScanRisksTable: React.FC<CodeScanRisksTableProps> = React.memo((props) => {
    return <div className={styles["code-scan-risk-table"]}></div>
})

interface CodeScanResultTableProps {
    runtimeId: string
}

/** 审计结果表 */
const CodeScanResultTable: React.FC<CodeScanResultTableProps> = React.memo((props) => {
    const {runtimeId} = props
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [loading, setLoading] = useState(false)
    const [params, setParams, getParams] = useGetState<QuerySyntaxFlowResultRequest>({
        Pagination: genDefaultPagination(20),
        Filter: {
            TaskIDs: [],
            ResultIDs: [],
            RuleNames: [],
            ProgramNames: [],
            Keyword: "",
            MinMatchedValue: 0,
            MaxMatchedValue: 0
        }
    })
    const [response, setResponse] = useState<QuerySyntaxFlowResultResponse>({
        Pagination: genDefaultPagination(20),
        DbMessage: {
            TableName: "",
            Operation: "",
            EffectRows: "",
            ExtraMessage: ""
        },
        Results: [],
        Total: 0
    })

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

    const update = useMemoizedFn((page: number) => {
        const paginationProps = {
            ...params.Pagination,
            Page: page,
            Limit: 20
        }
        const finalParams: QuerySyntaxFlowResultRequest = {
            Filter: {
                ...params.Filter,
                TaskIDs: [runtimeId]
            },
            Pagination: paginationProps
        }
        console.log("xxx", finalParams)

        apiFetchQuerySyntaxFlowResult(finalParams)
            .then((res) => {
                console.log("apiFetchQuerySyntaxFlowResult---", res)

                setResponse(res)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })

    const onRefreshMenuSelect = (key: string) => {
        switch (key) {
            case "noResetRefresh":
                update(1)
                break
            case "resetRefresh":
                break
            default:
                break
        }
    }

    const onSearch = useMemoizedFn(() => {
        setIsRefresh(!isRefresh)
    })

    const columns: ColumnsTypeProps[] = [
        {
            title: "序号",
            dataKey: "ResultID",
            fixed: "left",
            ellipsis: false,
            width: 96,
            enableDrag: false,
        },
        {
            title: "扫描目标",
            dataKey: "ProgramName",
            width:200,
            render: (text) => text || "-"
        },
        {
            title: "规则名称",
            dataKey: "Title",
            width:200,
            render: (text) => text || "-"
        },
        {
            title: "规则类型",
            dataKey: "Purpose",
            width:200,
            render: (text) => text || "-"
        },
        {
            title: "等级",
            dataKey: "Severity",
            width:200,
            render: (text) => text || "-"
        },
        {
            title: "命中个数",
            dataKey: "RiskCount",
            width:200,
            render: (text) => text || "-"
        },
        {
            title: "操作",
            dataKey: "action",
            width: 80,
            fixed: "right",
            render: (_, rowData) => {
                return <></>
            }
        },
    ]

    const onTableChange = useMemoizedFn((page: number, limit: number, newSort: SortProps, filter: any) => {
        setParams({
            ...params,
            ...filter
        })
        setTimeout(() => {
            update(1)
        }, 10)
    })

    useEffect(() => {
        update(1)
    }, [])

    const onRefreshCodeScanResultFun = useMemoizedFn((task_id) => {
        console.log("onRefreshCodeScanResultFun---",task_id);
        if(task_id === runtimeId){
           update(1) 
        }
    })

    useEffect(() => {
        emiter.on("onRefreshCodeScanResult", onRefreshCodeScanResultFun)
        return () => {
            emiter.off("onRefreshCodeScanResult", onRefreshCodeScanResultFun)
        }
    })
    return (
        <div className={styles["code-scan-result-table"]}>
            <TableVirtualResize<SyntaxFlowResult>
                loading={loading}
                query={params}
                isRefresh={isRefresh}
                titleHeight={42}
                title={
                    <div className={styles["virtual-table-header-wrap"]}>
                        <div className={styles["virtual-table-heard-left"]}>
                            <div className={styles["virtual-table-heard-left-item"]}>
                                <span className={styles["virtual-table-heard-left-text"]}>Total</span>
                                <span className={styles["virtual-table-heard-left-number"]}>{response.Total}</span>
                            </div>
                        </div>
                    </div>
                }
                extra={
                    <div className={styles["domainAsset-table-extra"]}>
                        <YakitInput.Search
                            placeholder='请输入网络地址、端口、服务指纹、title关键词搜索'
                            style={{width: 320}}
                            onSearch={onSearch}
                            onPressEnter={() => onSearch()}
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
                data={response.Results}
                enableDrag={false}
                renderKey='ID'
                columns={columns}
                useUpAndDown
                onChange={onTableChange}
                pagination={{
                    total: response.Total,
                    limit: response.Pagination.Limit,
                    page: response.Pagination.Page,
                    onChange: (page) => {
                        update(page)
                    }
                }}
            />
        </div>
    )
})
