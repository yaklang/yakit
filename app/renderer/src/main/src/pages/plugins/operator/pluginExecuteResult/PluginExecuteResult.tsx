import PluginTabs from "@/components/businessUI/PluginTabs/PluginTabs"
import React, {useEffect, useMemo, useRef, useState} from "react"
import {HorizontalScrollCard} from "../horizontalScrollCard/HorizontalScrollCard"
import styles from "./PluginExecuteResult.module.scss"
import {
    PluginExecuteCustomTableProps,
    PluginExecuteLogProps,
    PluginExecutePortTableProps,
    PluginExecuteResultProps,
    PluginExecuteResultTabContentProps,
    PluginExecuteWebsiteTreeProps,
    VulnerabilitiesRisksTableProps
} from "./PluginExecuteResultType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useDebounceFn, useMemoizedFn, useSelections} from "ahooks"
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
import {CurrentHttpFlow} from "@/pages/yakitStore/viewers/base"
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
import {PortTableAndDetail, portAssetFormatJson} from "@/pages/assetViewer/PortAssetPage"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {HoldGRPCStreamProps, StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"

const {TabPane} = PluginTabs
const {ipcRenderer} = window.require("electron")

export const PluginExecuteResult: React.FC<PluginExecuteResultProps> = React.memo((props) => {
    const {streamInfo, runtimeId, loading} = props
    const renderTabContent = useMemoizedFn((ele: HoldGRPCStreamProps.InfoTab) => {
        switch (ele.type) {
            case "risk":
                return <VulnerabilitiesRisksTable riskState={streamInfo.riskState} />
            case "http":
                return <PluginExecuteHttpFlow runtimeId={runtimeId} />
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
            default:
                return <></>
        }
    })
    return (
        <div className={styles["plugin-execute-result"]}>
            {streamInfo.cardState.length > 0 && (
                <div className={styles["plugin-execute-result-wrapper"]}>
                    <HorizontalScrollCard title={"Data Card"} data={streamInfo.cardState} />
                </div>
            )}
            {streamInfo.tabsState.length > 0 && (
                <PluginTabs>
                    {streamInfo.tabsState.map((ele) => (
                        <TabPane
                            tab={ele.tabName}
                            key={ele.tabName}
                            className={styles["plugin-execute-result-tabPane"]}
                        >
                            {renderTabContent(ele)}
                        </TabPane>
                    ))}
                    {/* <TabPane tab='扫描端口列表' key='port'>
                    <PluginExecutePortTable />
                </TabPane>
                <TabPane tab='漏洞与风险' key='risk'>
                    <VulnerabilitiesRisksTable />
                </TabPane>
                <TabPane tab='HTTP 流量' key='httpFlow' style={{borderBottom: "1px solid var(--yakit-border-color)"}}>
                    <PluginExecuteHttpFlow runtimeId={runtimeId} />
                </TabPane>
                <TabPane tab='基础插件信息 / 日志' key='log'>
                    <PluginExecuteLog loading={loading} messageList={streamInfo.logState} />
                </TabPane>
                <TabPane tab='Console' key='console'>
                    <EngineConsole isMini={true} />
                </TabPane> */}
                </PluginTabs>
            )}
        </div>
    )
})
const PluginExecutePortTable: React.FC<PluginExecutePortTableProps> = React.memo((props) => {
    const [response, setResponse] = useState<QueryGeneralResponse<PortAsset>>({
        Data: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    })
    const [sendPopoverVisible, setSendPopoverVisible] = useState<boolean>(false)
    const [checkedURL, setCheckedURL] = useState<string[]>([])
    const [currentSelectItem, setCurrentSelectItem] = useState<PortAsset>()
    const [scrollToIndex, setScrollToIndex] = useState<number>()
    const [titleEffective, setTitleEffective] = useState<boolean>(false)
    const selectedId = useMemo<string[]>(() => {
        return response.Data.map((i) => `${i.Id}`)
    }, [response.Data])
    const {selected, allSelected, isSelected, select, unSelect, selectAll, unSelectAll, setSelected} =
        useSelections<string>(selectedId)
    useEffect(() => {
        update(1)
    }, [])
    useEffect(() => {
        setCheckedURL(
            response.Data.filter((e) => selected.includes(`${e.Id}`)).map((item) => `${item.Host}:${item.Port}`)
        )
    }, [selected])

    const update = useDebounceFn(
        (current: number, pageSize?: number, order?: string, orderBy?: string) => {
            const query = {
                Pagination: {
                    Limit: 500,
                    Page: current || response.Pagination.Page,
                    Order: order || "desc",
                    OrderBy: orderBy || "updated_at"
                },
                TitleEffective: titleEffective
            }
            ipcRenderer.invoke("QueryPorts", query).then((rsp: QueryGeneralResponse<PortAsset>) => {
                const d = current === 1 ? rsp.Data : response.Data.concat(rsp.Data)
                setResponse({
                    Total: current === 1 ? rsp.Total : response.Total,
                    Pagination: {
                        ...rsp.Pagination
                    },
                    Data: d
                })
            })
        },
        {wait: 200}
    ).run
    const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
        return [
            {
                title: "网络地址",
                dataKey: "Host",
                fixed: "left",
                render: (text) => (
                    <div className={styles["table-host"]}>
                        <span className='content-ellipsis'>{text}</span>
                        <CopyComponents copyText={text} />
                    </div>
                )
            },
            {
                title: "端口",
                dataKey: "Port",
                width: 100,
                render: (text) => <YakitTag color='blue'>{text}</YakitTag>
            },
            {
                title: "协议",
                dataKey: "Proto",
                width: 100,
                render: (text) => <YakitTag color='success'>{text}</YakitTag>
            },
            {
                title: "服务指纹",
                dataKey: "ServiceType"
            },
            {
                title: "Title",
                dataKey: "HtmlTitle",
                afterIconExtra: (
                    <div className={styles["htmlTitle-extra"]}>
                        <YakitCheckbox
                            checked={titleEffective}
                            onChange={(e) => {
                                setTitleEffective(e.target.checked)
                                setTimeout(() => {
                                    update(1)
                                }, 200)
                            }}
                        />
                        <span className={styles["valid-data"]}>有效数据</span>
                    </div>
                )
            },
            {
                title: "最近更新时间",
                dataKey: "UpdatedAt",
                render: (text) => (text ? formatTimestamp(text) : "-")
            }
        ]
    }, [titleEffective])
    const getData = useMemoizedFn(() => {
        return new Promise((resolve) => {
            let exportData: PortAsset[] = []
            const header: string[] = []
            const filterVal: string[] = []
            columns.forEach((item) => {
                if (item.dataKey !== "Action") {
                    header.push(item.title)
                    filterVal.push(item.dataKey)
                }
            })
            exportData = portAssetFormatJson(filterVal, response.Data)
            resolve({
                header,
                exportData,
                response: response
            })
        })
    })
    const menuData: YakitMenuItemType[] = useMemo(() => {
        return [
            {
                label: "发送到漏洞检测",
                key: "bug-test"
            },
            {label: "发送到爆破", key: "brute"}
        ]
    }, [])
    const onRowContextMenu = useMemoizedFn((rowData: PortAsset, selectedRows: PortAsset[], event: React.MouseEvent) => {
        if (!rowData) return
        showByRightContext(
            {
                width: 180,
                data: menuData,
                onClick: ({key}) => menuSelect(key, [`${rowData.Host}:${rowData.Port}`])
            },
            event.clientX,
            event.clientY
        )
    })
    const menuSelect = useMemoizedFn((key, urls) => {
        ipcRenderer
            .invoke("send-to-tab", {
                type: key,
                data: {URL: JSON.stringify(urls)}
            })
            .then(() => {
                setSendPopoverVisible(false)
            })
    })
    const onJumpPort = useMemoizedFn(() => {
        const info: RouteToPageProps = {
            route: YakitRoute.DB_Ports
        }
        emiter.emit("menuOpenPage", JSON.stringify(info))
    })
    return (
        <PortTableAndDetail
            firstNode={
                <>
                    <TableVirtualResize<PortAsset>
                        titleHeight={43}
                        renderTitle={
                            <div className={styles["table-renderTitle"]}>
                                <span>开放端口 / Open Ports</span>
                                <div className={styles["table-head-extra"]}>
                                    <ExportExcel
                                        btnProps={{
                                            size: "small",
                                            type: "outline2"
                                        }}
                                        getData={getData}
                                        text='导出全部'
                                    />
                                    <YakitButton
                                        type='primary'
                                        icon={<SolidViewgridIcon />}
                                        size='small'
                                        onClick={onJumpPort}
                                    >
                                        端口资产管理
                                    </YakitButton>
                                    <YakitDropdownMenu
                                        menu={{
                                            data: menuData,
                                            onClick: ({key}) => menuSelect(key, checkedURL)
                                        }}
                                        dropdown={{
                                            trigger: ["click"],
                                            placement: "bottom",
                                            visible: sendPopoverVisible,
                                            onVisibleChange: (v) => setSendPopoverVisible(v),
                                            disabled: selected.length === 0
                                        }}
                                    >
                                        <YakitButton
                                            onClick={() => {}}
                                            icon={<SolidPaperairplaneIcon />}
                                            type={"primary"}
                                            disabled={selected.length === 0}
                                            size='small'
                                        >
                                            发送到...
                                        </YakitButton>
                                    </YakitDropdownMenu>
                                </div>
                            </div>
                        }
                        scrollToIndex={scrollToIndex}
                        isRightClickBatchOperate={true}
                        renderKey='Id'
                        data={response.Data}
                        rowSelection={{
                            isAll: allSelected,
                            type: "checkbox",
                            selectedRowKeys: selected,
                            onSelectAll: (newSelectedRowKeys: string[], selected: PortAsset[], checked: boolean) => {
                                if (checked) {
                                    selectAll()
                                } else {
                                    unSelectAll()
                                }
                            },
                            onChangeCheckboxSingle: (c: boolean, keys: string) => {
                                if (c) {
                                    select(keys)
                                } else {
                                    unSelect(keys)
                                }
                            }
                        }}
                        pagination={{
                            total: response.Total,
                            limit: response.Pagination.Limit,
                            page: response.Pagination.Page,
                            onChange: (page, limit) => {}
                        }}
                        columns={columns}
                        onRowContextMenu={onRowContextMenu}
                        onSetCurrentRow={(val) => {
                            if (!currentSelectItem) {
                                const index = response.Data.findIndex((ele) => ele.Id === val?.Id)
                                setScrollToIndex(index)
                            }
                            if (val?.Id !== currentSelectItem?.Id) {
                                setCurrentSelectItem(val)
                            }
                        }}
                        enableDrag={true}
                    />
                </>
            }
            currentSelectItem={currentSelectItem}
            resizeBoxProps={{
                isShowDefaultLineStyle: false,
                firstNode: undefined,
                secondNode: undefined,
                lineDirection: "bottom",
                secondNodeStyle: {padding: 0}
            }}
            secondNodeClassName={styles["port-table-detail"]}
        />
    )
})
/**HTTP 流量 */
const PluginExecuteHttpFlow: React.FC<PluginExecuteWebsiteTreeProps> = React.memo((props) => {
    const {runtimeId} = props
    const [height, setHeight] = useState<number>(300) //表格所在div高度

    const webTreeRef = useRef<any>()
    return (
        <div className={styles["plugin-execute-http-flow"]}>
            <YakitResizeBox
                lineDirection='right'
                firstRatio={"20%"}
                firstMinSize={300}
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
                            treeExtraQueryparams={" "}
                            refreshTreeFlag={false}
                            onGetUrl={(searchURL, includeInUrl) => {
                                // setSearchURL(searchURL)
                                // setIncludeInUrl(includeInUrl)
                            }}
                            resetTableAndEditorShow={(table, editor) => {
                                // setOnlyShowFirstNode(table)
                                // setSecondNodeVisible(editor)
                            }}
                        />
                    </div>
                }
                secondNode={
                    <CurrentHttpFlow
                        runtimeId={runtimeId}
                        httpHistoryTableTitleStyle={{borderLeft: 0, borderRight: 0}}
                        containerClassName={styles["current-http-table-container"]}
                    />
                }
                secondNodeStyle={{padding: 0}}
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
    useEffect(() => {}, [])

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
        tableInfo: {columns = [], data = []}
    } = props
    return (
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
    )
})
