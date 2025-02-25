import PluginTabs from "@/components/businessUI/PluginTabs/PluginTabs"
import React, {useEffect, useMemo, useRef, useState} from "react"
import {HorizontalScrollCard} from "../horizontalScrollCard/HorizontalScrollCard"
import styles from "./PluginExecuteResult.module.scss"
import {
    AuditHoleTableOnTabProps,
    PluginExecuteCodeProps,
    PluginExecuteCustomTableProps,
    PluginExecuteLogProps,
    PluginExecutePortTableProps,
    PluginExecuteResultProps,
    PluginExecuteResultTabContentProps,
    PluginExecuteWebsiteTreeProps,
    VulnerabilitiesRisksTableProps
} from "./PluginExecuteResultType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    useControllableValue,
    useCreation,
    useDebounceEffect,
    useDebounceFn,
    useInterval,
    useMemoizedFn,
    useUpdateEffect
} from "ahooks"
import emiter from "@/utils/eventBus/eventBus"
import {RouteToPageProps} from "@/pages/layout/publicMenu/PublicMenu"
import {YakitRoute} from "@/enums/yakitRoute"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {CurrentHttpFlow, formatJson} from "@/pages/yakitStore/viewers/base"
import {EngineConsole} from "@/components/baseConsole/BaseConsole"
import {WebTree} from "@/components/WebTree/WebTree"
import classNames from "classnames"
import ReactResizeDetector from "react-resize-detector"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {SolidViewgridIcon} from "@/assets/icon/solid"
import {ExportExcel} from "@/components/DataExport/DataExport"
import {QueryPortsRequest} from "@/pages/assetViewer/PortAssetPage"
import {HoldGRPCStreamProps, StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {PortTable} from "@/pages/assetViewer/PortTable/PortTable"
import {defQueryPortsRequest} from "@/pages/assetViewer/PortTable/utils"
import cloneDeep from "lodash/cloneDeep"
import {yakitFailed} from "@/utils/notification"
import {sorterFunction} from "@/pages/fuzzer/components/HTTPFuzzerPageTable/HTTPFuzzerPageTable"
import {YakitRiskTable} from "@/pages/risks/YakitRiskTable/YakitRiskTable"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {QueryRisksRequest} from "@/pages/risks/YakitRiskTable/YakitRiskTableType"
import {defQueryRisksRequest} from "@/pages/risks/YakitRiskTable/constants"
import {TableTotalAndSelectNumber} from "@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber"
import {apiQueryRisks} from "@/pages/risks/YakitRiskTable/utils"
import {OutlineChartpieIcon, OutlineLogIcon, OutlineTerminalIcon} from "@/assets/icon/outline"
import {LocalList, LocalPluginLog, LocalText} from "./LocalPluginLog"
import {CodeScanResult} from "@/pages/yakRunnerCodeScan/CodeScanResultTable/CodeScanResultTable"
import {YakitAuditHoleTable} from "@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTable"

const {TabPane} = PluginTabs

export const PluginExecuteResult: React.FC<PluginExecuteResultProps> = React.memo((props) => {
    const {
        streamInfo,
        runtimeId,
        loading,
        defaultActiveKey,
        pluginExecuteResultWrapper = "",
        PluginTabsRightNode
    } = props

    const [allTotal, setAllTotal] = useState<number>(0)
    const [tempTotal, setTempTotal] = useState<number>(0) // 在risk表没有展示之前得临时显示在tab上得小红点计数
    const [interval, setInterval] = useState<number | undefined>(1000)

    useUpdateEffect(() => {
        setAllTotal(0)
        setTempTotal(0)
        if (streamInfo.tabsState.find((item) => item.type === "ssa-risk")) {
            setInterval(undefined)
        } else {
            setInterval(1000)
        }
    }, [runtimeId])
    useInterval(() => {
        if (runtimeId) getTotal()
    }, interval)

    const getTotal = useMemoizedFn(() => {
        const params: QueryRisksRequest = {
            ...defQueryRisksRequest,
            Pagination: {
                ...defQueryRisksRequest.Pagination,
                Page: 1,
                Limit: 1
            },
            RuntimeId: runtimeId
        }
        apiQueryRisks(params).then((allRes) => {
            if (+allRes.Total > 0) {
                setTempTotal(+allRes.Total)
            }
        })
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
                return !!runtimeId ? (
                    <VulnerabilitiesRisksTable runtimeId={runtimeId} allTotal={allTotal} setAllTotal={onSetRiskTotal} />
                ) : (
                    <></>
                )
            case "port":
                return !!runtimeId ? <PluginExecutePortTable runtimeId={runtimeId} /> : <></>
            case "http":
                return !!runtimeId ? (
                    <PluginExecuteHttpFlow
                        runtimeId={runtimeId}
                        website={!!streamInfo.tabsInfoState["website"]?.targets}
                    />
                ) : (
                    <></>
                )
            case "log":
                return <PluginExecuteLog loading={loading} messageList={streamInfo.logState} />
            case "console":
                return <EngineConsole isMini={true} />
            case "table":
                const tableInfo: HoldGRPCStreamProps.InfoTable = streamInfo.tabsInfoState[ele.tabName] || {
                    columns: [],
                    data: [],
                    name: ""
                }
                return <PluginExecuteCustomTable tableInfo={tableInfo} />
            case "text":
                const textInfo: HoldGRPCStreamProps.InfoText = streamInfo.tabsInfoState[ele.tabName] || {
                    content: ""
                }
                return <PluginExecuteCode content={textInfo.content} />
            case "result":
                const {customProps} = ele
                return <CodeScanResult {...(customProps || {})} isExecuting={loading} runtimeId={runtimeId} />
            case "ssa-risk":
                return <AuditHoleTableOnTab runtimeId={runtimeId} />
            default:
                return <></>
        }
    })

    const showTabs = useMemo(() => {
        if (!tempTotal && !streamInfo.tabsState.find((item) => item.type === "ssa-risk")) {
            return streamInfo.tabsState.filter((item) => item.tabName !== "漏洞与风险")
        }
        return streamInfo.tabsState
    }, [streamInfo.tabsState, tempTotal])

    const tabBarRender = useMemoizedFn((tab: HoldGRPCStreamProps.InfoTab, length: number) => {
        if (tab.type === "risk") {
            return (
                <>
                    {tab.tabName}
                    <span className={styles["plugin-execute-result-tabBar"]}>{length}</span>
                </>
            )
        }

        return tab.tabName
    })
    const cardState = useCreation(() => {
        return streamInfo.cardState.filter((item) => item.tag !== "no display")
    }, [streamInfo.cardState])
    const showRiskTotal = useCreation(() => {
        if (allTotal > 0) return allTotal
        return tempTotal
    }, [allTotal, tempTotal])
    return (
        <div className={classNames(styles["plugin-execute-result"], pluginExecuteResultWrapper)}>
            {cardState.length > 0 && (
                <div className={styles["plugin-execute-result-wrapper"]}>
                    <HorizontalScrollCard title={"Data Card"} data={cardState} />
                </div>
            )}
            {showTabs.length > 0 && (
                <PluginTabs defaultActiveKey={defaultActiveKey} tabBarExtraContent={{right: PluginTabsRightNode}}>
                    {showTabs.map((ele) => (
                        <TabPane
                            tab={tabBarRender(ele, showRiskTotal)}
                            key={ele.tabName}
                            className={styles["plugin-execute-result-tabPane"]}
                        >
                            {renderTabContent(ele)}
                        </TabPane>
                    ))}
                </PluginTabs>
            )}
        </div>
    )
})
const PluginExecutePortTable: React.FC<PluginExecutePortTableProps> = React.memo((props) => {
    const {runtimeId} = props
    const [params, setParams] = useState<QueryPortsRequest>({
        ...cloneDeep(defQueryPortsRequest),
        RuntimeId: runtimeId
    })
    const onJumpPort = useMemoizedFn(() => {
        const info: RouteToPageProps = {
            route: YakitRoute.DB_Ports
        }
        emiter.emit("menuOpenPage", JSON.stringify(info))
    })
    return (
        <PortTable
            query={params}
            setQuery={setParams}
            tableTitleExtraOperate={
                <>
                    <YakitButton type='primary' icon={<SolidViewgridIcon />} size='small' onClick={onJumpPort}>
                        端口资产管理
                    </YakitButton>
                </>
            }
            containerClassName={styles["plugin-execute-port-table-container"]}
            btnSize='small'
            detailBodyClassName={styles["plugin-execute-port-table-detail-body"]}
        />
    )
})
/**HTTP 流量 */
const PluginExecuteHttpFlow: React.FC<PluginExecuteWebsiteTreeProps> = React.memo((props) => {
    const {runtimeId, website = false} = props

    const [height, setHeight] = useState<number>(300) //表格所在div高度

    const webTreeRef = useRef<any>()
    // 被点击的树节点
    const [searchURL, setSearchURL] = useState<string>("")
    // 被点击的树节点URL参数
    const [includeInUrl, setIncludeInUrl] = useState<string>("")
    // 是否只展示表格
    const [onlyShowFirstNode, setOnlyShowFirstNode] = useState<boolean>(true)
    // 表格里详情是否显示
    const [secondNodeVisible, setSecondNodeVisible] = useState<boolean>(false)
    useEffect(() => {
        setSecondNodeVisible(!onlyShowFirstNode)
    }, [onlyShowFirstNode])

    const [treeQueryparams, setTreeQueryparams] = useState<string>("")
    const [refreshTreeFlag, setRefreshTreeFlag] = useState<boolean>(false)
    // 流量表筛选条件 改变 控制webtree刷新
    const onQueryParams = useMemoizedFn((queryParams: string, execFlag?: boolean) => {
        setTreeQueryparams(queryParams)
        setRefreshTreeFlag(!!execFlag)
    })

    return (
        <div className={styles["plugin-execute-http-flow"]}>
            <YakitResizeBox
                lineDirection='right'
                firstNodeStyle={{
                    display: website ? "" : "none"
                }}
                firstMinSize={website ? 300 : 0}
                lineStyle={{display: website ? "" : "none"}}
                secondNodeStyle={{padding: 0}}
                secondRatio={website ? "80%" : "100%"}
                firstNode={
                    <div className={styles["plugin-execute-web-tree"]}>
                        <ReactResizeDetector
                            onResize={(w, h) => {
                                if (!w || !h) {
                                    return
                                }
                                setHeight(h)
                            }}
                            handleHeight={true}
                            refreshMode={"debounce"}
                            refreshRate={50}
                        />
                        <WebTree
                            ref={webTreeRef}
                            height={height}
                            searchPlaceholder='请输入域名进行搜索,例baidu.com'
                            treeExtraQueryparams={treeQueryparams}
                            refreshTreeFlag={refreshTreeFlag}
                            onGetUrl={(searchURL, includeInUrl) => {
                                setSearchURL(searchURL)
                                setIncludeInUrl(includeInUrl)
                            }}
                            resetTableAndEditorShow={(table, editor) => {
                                setOnlyShowFirstNode(table)
                                setSecondNodeVisible(editor)
                            }}
                            runTimeId={runtimeId}
                        />
                    </div>
                }
                secondNode={
                    <CurrentHttpFlow
                        runtimeId={runtimeId}
                        searchURL={searchURL}
                        includeInUrl={includeInUrl}
                        isOnlyTable={onlyShowFirstNode}
                        onIsOnlyTable={setOnlyShowFirstNode}
                        showDetail={secondNodeVisible}
                        pageType='History'
                        httpHistoryTableTitleStyle={{borderLeft: 0, borderRight: 0}}
                        containerClassName={styles["current-http-table-container"]}
                        onQueryParams={onQueryParams}
                    />
                }
            ></YakitResizeBox>
        </div>
    )
})
/** 基础插件信息 / 日志 */
export const PluginExecuteLog: React.FC<PluginExecuteLogProps> = React.memo((props) => {
    const {loading, messageList, wrapperClassName} = props
    const [activeKey, setActiveKey] = useState<string>("plugin-log")

    const list: StreamResult.Log[] = useCreation(() => {
        return (messageList || [])
            .filter((i) => {
                return !((i?.level || "").startsWith("json-feature") || (i?.level || "").startsWith("feature-"))
            })
            .splice(0, 25)
            .reverse()
    }, [messageList])

    const echartsLists: StreamResult.Log[] = useCreation(() => {
        return messageList.filter((ele) => ele.level === "json-graph")
    }, [messageList])
    const textLists: StreamResult.Log[] = useCreation(() => {
        const textTypes = ["text", "code"]
        return messageList.filter((ele) => textTypes.includes(ele.level))
    }, [messageList])
    const logTabs = useCreation(() => {
        const tab = [
            {
                name: "插件日志",
                icon: <OutlineLogIcon />,
                number: 0,
                type: "plugin-log"
            }
        ]
        if (!!echartsLists.length) {
            tab.push({
                name: "统计图表",
                icon: <OutlineChartpieIcon />,
                number: echartsLists.length,
                type: "echarts-statistics"
            })
        }
        if (!!textLists.length) {
            tab.push({
                name: "输出文本",
                icon: <OutlineTerminalIcon />,
                number: textLists.length,
                type: "output-text"
            })
        }
        return tab
    }, [echartsLists, textLists])

    const renderTabContent = useMemoizedFn((type) => {
        switch (type) {
            case "plugin-log":
                return <LocalPluginLog loading={loading} list={list} />
            case "echarts-statistics":
                return <LocalList list={echartsLists} />
            case "output-text":
                return <LocalText list={textLists} />
            default:
                return <></>
        }
    })
    const onTabChange = useMemoizedFn((key: string) => {
        setActiveKey(key)
    })

    return (
        <>
            <PluginTabs
                activeKey={activeKey}
                onChange={onTabChange}
                type='line'
                wrapperClassName={classNames(styles["plugin-execute-log"], wrapperClassName)}
            >
                {logTabs.map((ele) => (
                    <TabPane
                        tab={
                            <div
                                className={classNames(styles["log-tab-name"], {
                                    [styles["log-tab-name-active"]]: activeKey === ele.type
                                })}
                            >
                                {ele.icon} {ele.name}
                                {!!ele.number && <div className={styles["tab-number"]}>{ele.number}</div>}
                            </div>
                        }
                        key={ele.type}
                    >
                        {renderTabContent(ele.type)}
                    </TabPane>
                ))}
            </PluginTabs>
        </>
    )
})

/**风险与漏洞tab表 */
export const VulnerabilitiesRisksTable: React.FC<VulnerabilitiesRisksTableProps> = React.memo((props) => {
    const {runtimeId} = props
    const [riskLoading, setRiskLoading] = useState<boolean>(false)
    const [allTotal, setAllTotal] = useControllableValue<number>(props, {
        defaultValue: 0,
        valuePropName: "allTotal",
        trigger: "setAllTotal"
    })
    const [query, setQuery] = useState<QueryRisksRequest>({
        ...defQueryRisksRequest,
        RuntimeId: runtimeId
    })

    useUpdateEffect(() => {
        setQuery({...query, RuntimeId: runtimeId})
    }, [runtimeId])

    const onJumpRisk = useMemoizedFn(() => {
        const info: RouteToPageProps = {
            route: YakitRoute.DB_Risk
        }
        emiter.emit("menuOpenPage", JSON.stringify(info))
    })
    return (
        <div className={styles["risks-table"]}>
            <YakitSpin spinning={riskLoading}>
                <YakitRiskTable
                    query={query}
                    setQuery={setQuery}
                    advancedQuery={true}
                    setRiskLoading={setRiskLoading}
                    renderTitle={
                        <div className={styles["table-renderTitle"]}>
                            <div className={styles["table-renderTitle-left"]}>
                                <span>风险与漏洞</span>
                                <TableTotalAndSelectNumber total={allTotal} />
                            </div>
                            <YakitButton type='outline2' size='small' onClick={onJumpRisk}>
                                查看全部
                            </YakitButton>
                        </div>
                    }
                    riskWrapperClassName={styles["risks-table-wrapper"]}
                    tableVirtualResizeProps={{
                        containerClassName: styles["table-container"],
                        titleHeight: 44,
                        rowSelection: undefined
                    }}
                    yakitRiskDetailsBorder={false}
                    excludeColumnsKey={["action"]}
                    allTotal={allTotal}
                    setAllTotal={setAllTotal}
                />
            </YakitSpin>
        </div>
    )
})

/**审计漏洞tab表 */
export const AuditHoleTableOnTab: React.FC<AuditHoleTableOnTabProps> = React.memo((props) => {
    const {runtimeId} = props
    const [allTotal, setAllTotal] = useState<number>(0)

    const onJumpAuditHole = useMemoizedFn(() => {
        const info: RouteToPageProps = {
            route: YakitRoute.YakRunner_Audit_Hole
        }
        emiter.emit("menuOpenPage", JSON.stringify(info))
    })
    return (
        <div className={styles["risks-table"]}>
            <YakitAuditHoleTable
                query={{
                    RuntimeID: [runtimeId]
                }}
                setAllTotal={setAllTotal}
                renderTitle={
                    <div className={styles["table-renderTitle"]}>
                        <div className={styles["table-renderTitle-left"]}>
                            <span>风险与漏洞</span>
                            <TableTotalAndSelectNumber total={allTotal} />
                        </div>
                        <YakitButton type='outline2' size='small' onClick={onJumpAuditHole}>
                            查看全部
                        </YakitButton>
                    </div>
                }
                riskWrapperClassName={styles["risks-table-wrapper"]}
            />
        </div>
    )
})

/**插件执行的tab content 结构 */
const PluginExecuteResultTabContent: React.FC<PluginExecuteResultTabContentProps> = React.memo((props) => {
    const {title, extra, children, className = ""} = props
    return (
        <div className={styles["plugin-execute-result-tab-content"]}>
            {(title || extra) && (
                <div className={styles["plugin-execute-result-tab-content-head"]}>
                    <div>{title}</div>
                    <div>{extra}</div>
                </div>
            )}
            <div className={classNames(styles["plugin-execute-result-tab-content-body"], className)}>{children}</div>
        </div>
    )
})

const PluginExecuteCustomTable: React.FC<PluginExecuteCustomTableProps> = React.memo((props) => {
    const {
        tableInfo: {columns = [], data = [], name = ""}
    } = props
    const [tableData, setTableData] = useState(data)
    const [columnsData, setColumnsData] = useState(columns)

    const [sorterTable, setSorterTable] = useState<SortProps>()

    const [query, setQuery] = useState<any>({}) // 设置表头查询条件
    const [loading, setLoading] = useState<boolean>(false)

    const firstItemRef = useRef<any>()

    useEffect(() => {
        setTimeout(() => {
            const item = data[0]
            firstItemRef.current = data[0]
            onSetColumns(item)
        }, 500)
    }, [])
    useDebounceEffect(
        () => {
            if (!firstItemRef.current) {
                firstItemRef.current = data[0]
                onSetColumns(firstItemRef.current)
            }
            queryData()
        },
        [data],
        {wait: 300, leading: true}
    )
    useUpdateEffect(() => {
        update()
    }, [query, sorterTable])
    const onSetColumns = useMemoizedFn((item) => {
        if (!item) return
        const newColumns = columns.map((ele) => ({
            ...ele,
            sorterProps: {
                sorter: !Number.isNaN(Number(item[ele.dataKey]))
            },
            filterProps: {
                filtersType: "input"
            }
        }))
        setColumnsData(newColumns)
    })
    const update = useDebounceFn(
        () => {
            setLoading(true)
            new Promise((resolve, reject) => {
                try {
                    queryData()
                    resolve(true)
                } catch (error) {
                    reject(error)
                }
            })
                .catch((e) => {
                    yakitFailed("搜索失败:" + e)
                })
                .finally(() => {
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                })
        },
        {
            wait: 200
        }
    ).run
    // 搜索
    const queryData = useMemoizedFn(() => {
        try {
            let list: any = []
            const length = data.length
            const queryHaveValue = {}
            // 找出有查询条件
            for (const key in query) {
                const objItem = query[key]
                if (objItem) {
                    queryHaveValue[key] = query[key]
                }
            }
            // 所有查询条件为空时，返回原始数据
            if (Object.getOwnPropertyNames(queryHaveValue).length === 0) {
                list = [...data]
            } else {
                // 搜索
                for (let index = 0; index < length; index++) {
                    const elementArrayItem = data[index]
                    let isAdd: boolean[] = []
                    for (const key in queryHaveValue) {
                        const objItem = queryHaveValue[key]
                        const isHave = `${elementArrayItem[key]}`.includes(objItem)
                        isAdd.push(isHave)
                    }
                    // 所有条件都满足
                    if (!isAdd.includes(false)) {
                        list.push(elementArrayItem)
                    }
                    isAdd = []
                }
            }
            const newDataTable = sorterTable?.order === "none" ? list : sorterFunction(list, sorterTable, "") || []
            setTableData(newDataTable)
        } catch (error) {
            yakitFailed("搜索失败:" + error)
        }
    })
    const getData = useMemoizedFn(() => {
        return new Promise((resolve) => {
            const header = columns.map((ele) => ele.title)
            const exportData = formatJson(header, data)
            const params = {
                header,
                exportData,
                response: {
                    Pagination: {
                        Page: 1
                    },
                    Data: data,
                    Total: data.length
                }
            }
            resolve(params)
        })
    })
    const onTableChange = useMemoizedFn((page: number, limit: number, sorter: SortProps, filters: any, extra?: any) => {
        setQuery(filters)
        setSorterTable(sorter)
    })
    return (
        <PluginExecuteResultTabContent
            // title={name}
            title={
                <span className={styles["table-title"]}>
                    Total<span className={styles["table-title-number"]}>{data.length}</span>
                </span>
            }
            extra={
                <ExportExcel
                    btnProps={{
                        size: "small",
                        type: "outline2"
                    }}
                    getData={getData}
                    fileName={name || "输出表"}
                    text='导出全部'
                />
            }
            className={styles["plugin-execute-custom-table"]}
        >
            <TableVirtualResize
                loading={loading}
                isRefresh={loading}
                isShowTitle={false}
                enableDrag={true}
                data={tableData}
                renderKey={"uuid"}
                pagination={{
                    page: 1,
                    limit: 50,
                    total: data.length,
                    onChange: () => {}
                }}
                columns={columnsData}
                containerClassName={styles["custom-table-container"]}
                onChange={onTableChange}
            />
        </PluginExecuteResultTabContent>
    )
})

const PluginExecuteCode: React.FC<PluginExecuteCodeProps> = React.memo((props) => {
    const {content} = props
    return (
        <>
            <YakitEditor readOnly={true} value={content} type='plaintext' />
        </>
    )
})
