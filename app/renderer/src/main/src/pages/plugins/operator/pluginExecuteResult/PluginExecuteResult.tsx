import PluginTabs from "@/components/businessUI/PluginTabs/PluginTabs"
import React, {useEffect, useMemo, useRef, useState} from "react"
import {HorizontalScrollCard} from "../horizontalScrollCard/HorizontalScrollCard"
import styles from "./PluginExecuteResult.module.scss"
import {
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
import {useCreation, useDebounceFn, useMemoizedFn, useSelections} from "ahooks"
import emiter from "@/utils/eventBus/eventBus"
import {RouteToPageProps} from "@/pages/layout/publicMenu/PublicMenu"
import {YakitRoute} from "@/routes/newRoute"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {RiskDetails, TitleColor} from "@/pages/risks/RiskTable"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {Risk} from "@/pages/risks/schema"
import {QueryGeneralResponse, genDefaultPagination} from "@/pages/invoker/schema"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {formatTimestamp} from "@/utils/timeUtil"
import {CurrentHttpFlow, formatJson} from "@/pages/yakitStore/viewers/base"
import {Timeline} from "antd"
import {LogLevelToCode} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {YakitLogFormatter} from "@/pages/invoker/YakitLogFormatter"
import {EngineConsole} from "@/components/baseConsole/BaseConsole"
import {WebTree} from "@/components/WebTree/WebTree"
import classNames from "classnames"
import ReactResizeDetector from "react-resize-detector"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {SolidPaperairplaneIcon, SolidViewgridIcon} from "@/assets/icon/solid"
import {ExportExcel} from "@/components/DataExport/DataExport"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {PortAsset} from "@/pages/assetViewer/models"
import {PortTableAndDetail, QueryPortsRequest, portAssetFormatJson} from "@/pages/assetViewer/PortAssetPage"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {HoldGRPCStreamProps, StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {PortTable} from "@/pages/assetViewer/PortTable/PortTable"
import {PortTableRefProps} from "@/pages/assetViewer/PortTable/PortTableType"
import {defQueryPortsRequest} from "@/pages/assetViewer/PortTable/utils"
import cloneDeep from "lodash/cloneDeep"

const {TabPane} = PluginTabs
const {ipcRenderer} = window.require("electron")

export const PluginExecuteResult: React.FC<PluginExecuteResultProps> = React.memo((props) => {
    const {streamInfo, runtimeId, loading, pluginType, defaultActiveKey} = props

    const renderTabContent = useMemoizedFn((ele: HoldGRPCStreamProps.InfoTab) => {
        switch (ele.type) {
            case "risk":
                return <VulnerabilitiesRisksTable riskState={streamInfo.riskState} />
            case "port":
                return <PluginExecutePortTable runtimeId={runtimeId} />
            case "http":
                return (
                    <PluginExecuteHttpFlow
                        runtimeId={runtimeId}
                        website={!!streamInfo.tabsInfoState["website"]?.targets}
                    />
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
                return <PluginExecuteCode content={textInfo.content} pluginType={pluginType} />
            default:
                return <></>
        }
    })

    const showTabs = useMemo(() => {
        if (streamInfo.riskState.length === 0) {
            return streamInfo.tabsState.filter((item) => item.tabName !== "漏洞与风险")
        }
        return streamInfo.tabsState
    }, [streamInfo.tabsState, streamInfo.riskState])

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

    return (
        <div className={styles["plugin-execute-result"]}>
            {streamInfo.cardState.length > 0 && (
                <div className={styles["plugin-execute-result-wrapper"]}>
                    <HorizontalScrollCard title={"Data Card"} data={streamInfo.cardState} />
                </div>
            )}
            {showTabs.length > 0 && (
                <PluginTabs defaultActiveKey={defaultActiveKey}>
                    {showTabs.map((ele) => (
                        <TabPane
                            tab={tabBarRender(ele, streamInfo.riskState.length)}
                            key={ele.tabName}
                            className={styles["plugin-execute-result-tabPane"]}
                        >
                            {renderTabContent(ele)}
                        </TabPane>
                    ))}
                    {/* <TabPane tab='扫描端口列表' key='port'>
                        <PluginExecutePortTable />
                    </TabPane> */}
                </PluginTabs>
            )}
        </div>
    )
})
const PluginExecutePortTable: React.FC<PluginExecutePortTableProps> = React.memo((props) => {
    const {runtimeId} = props
    const [total, setTotal] = useState<number>(0)
    const [params, setParams] = useState<QueryPortsRequest>({
        ...cloneDeep(defQueryPortsRequest),
        RuntimeId:runtimeId
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
            tableTitle={<span>开放端口 / Open Ports</span>}
            tableTitleExtraOperate={
                <>
                    <YakitButton type='primary' icon={<SolidViewgridIcon />} size='small' onClick={onJumpPort}>
                        端口资产管理
                    </YakitButton>
                    {total}
                </>
            }
            containerClassName={styles["plugin-execute-port-table-container"]}
            btnSize='small'
            setTotal={setTotal}
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
const PluginExecuteLog: React.FC<PluginExecuteLogProps> = React.memo((props) => {
    const {loading, messageList} = props
    const timelineItemProps = useMemo(() => {
        return (messageList || [])
            .filter((i) => {
                return !((i?.level || "").startsWith("json-feature") || (i?.level || "").startsWith("feature-"))
            })
            .splice(0, 25)
    }, [messageList])
    const list = useMemo(() => {
        return (timelineItemProps || []).reverse().filter((item) => item.level !== "json-risk")
    }, [timelineItemProps])
    return (
        <PluginExecuteResultTabContent title='任务额外日志与结果'>
            <Timeline pending={loading} style={{marginTop: 10, marginBottom: 10}}>
                {list.map((e, index) => {
                    return (
                        <Timeline.Item key={index} color={LogLevelToCode(e.level)}>
                            <YakitLogFormatter data={e.data} level={e.level} timestamp={e.timestamp} onlyTime={true} />
                        </Timeline.Item>
                    )
                })}
            </Timeline>
        </PluginExecuteResultTabContent>
    )
})
/**获取风险等级的展示tag类型 */
const getSeverity = (type) => {
    switch (type) {
        case "低危":
            return "warning"
        case "中危":
            return "info"
        case "高危":
            return "danger"
        case "严重":
            return "serious"
        default:
            return undefined
    }
}
/**风险与漏洞tab表 */
const VulnerabilitiesRisksTable: React.FC<VulnerabilitiesRisksTableProps> = React.memo((props) => {
    const {riskState} = props

    const columns: ColumnsTypeProps[] = useMemo(() => {
        return [
            {
                title: "标题",
                dataKey: "TitleVerbose",
                width: 400,
                render: (_, i) => i.TitleVerbose || i.Title || "-"
            },
            {
                title: "类型",
                dataKey: "RiskTypeVerbose"
            },
            {
                title: "等级",
                dataKey: "Severity",
                render: (severity) => {
                    const title = TitleColor.filter((item) => item.key.includes(severity || ""))[0]
                    const value = title ? title.name : severity || "-"
                    return <YakitTag color={getSeverity(value)}>{value}</YakitTag>
                }
            },
            {
                title: "IP",
                dataKey: "IP"
            },
            {
                title: "发现时间",
                dataKey: "CreatedAt",
                // width: 160,
                render: (v) => formatTimestamp(v)
            },
            {
                title: "操作",
                dataKey: "Action",
                width: 70,
                fixed: "right",
                render: (_, i: Risk) => {
                    return (
                        <>
                            <YakitButton
                                type='text'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onDetail(i)
                                }}
                            >
                                详情
                            </YakitButton>
                        </>
                    )
                }
            }
        ]
    }, [])
    const onDetail = useMemoizedFn((i: Risk) => {
        let m = showYakitModal({
            width: "80%",
            title: "详情",
            footer: null,
            content: (
                <div style={{padding: 24}}>
                    <RiskDetails info={i} onClose={() => m.destroy()} />
                </div>
            )
        })
    })
    const onJumpRisk = useMemoizedFn(() => {
        const info: RouteToPageProps = {
            route: YakitRoute.DB_Risk
        }
        emiter.emit("menuOpenPage", JSON.stringify(info))
    })
    return (
        <TableVirtualResize<StreamResult.Risk>
            renderTitle={
                <div className={styles["table-renderTitle"]}>
                    <span>风险与漏洞</span>
                    <YakitButton type='outline2' size='small' onClick={onJumpRisk}>
                        查看全部
                    </YakitButton>
                </div>
            }
            enableDrag={true}
            titleHeight={44}
            data={riskState}
            renderKey={"Hash"}
            pagination={{
                page: 1,
                limit: 50,
                total: riskState.length,
                onChange: () => {}
            }}
            columns={columns}
            containerClassName={styles["table-container"]}
        />
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
    return (
        <PluginExecuteResultTabContent
            title={name}
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
                isShowTitle={false}
                enableDrag={true}
                data={data}
                renderKey={"uuid"}
                pagination={{
                    page: 1,
                    limit: 50,
                    total: data.length,
                    onChange: () => {}
                }}
                columns={columns}
                containerClassName={styles["custom-table-container"]}
            />
        </PluginExecuteResultTabContent>
    )
})

const PluginExecuteCode: React.FC<PluginExecuteCodeProps> = React.memo((props) => {
    const {content, pluginType} = props
    return (
        <>
            <YakitEditor readOnly={true} value={content} type={pluginType || "yak"} />
        </>
    )
})
