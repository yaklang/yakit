import PluginTabs from "@/components/businessUI/PluginTabs/PluginTabs"
import React, {useEffect, useMemo, useRef, useState} from "react"
import {HorizontalScrollCard} from "../horizontalScrollCard/HorizontalScrollCard"
import styles from "./PluginExecuteResult.module.scss"
import {
    PluginExecuteLogProps,
    PluginExecuteResultProps,
    PluginExecuteResultTabContentProps,
    PluginExecuteWebsiteTreeProps,
    VulnerabilitiesRisksTableProps
} from "./PluginExecuteResultType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useMemoizedFn} from "ahooks"
import emiter from "@/utils/eventBus/eventBus"
import {RouteToPageProps} from "@/pages/layout/publicMenu/PublicMenu"
import {YakitRoute} from "@/routes/newRoute"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {RiskDetails, TitleColor} from "@/pages/risks/RiskTable"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
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

const {TabPane} = PluginTabs
const {ipcRenderer} = window.require("electron")

export const PluginExecuteResult: React.FC<PluginExecuteResultProps> = React.memo((props) => {
    const {infoState, runtimeId, loading} = props
    return (
        <div className={styles["plugin-execute-result"]}>
            <div className={styles["plugin-execute-result-wrapper"]}>
                <HorizontalScrollCard title={"Data Card"} />
            </div>
            <PluginTabs defaultActiveKey='httpFlow'>
                <TabPane tab='漏洞与风险' key='risk'>
                    <VulnerabilitiesRisksTable />
                </TabPane>
                <TabPane tab='HTTP 流量' key='httpFlow' style={{borderBottom: "1px solid var(--yakit-border-color)"}}>
                    <PluginExecuteHttpFlow runtimeId={runtimeId} />
                </TabPane>
                <TabPane tab='基础插件信息 / 日志' key='log'>
                    <PluginExecuteLog loading={loading} messageList={infoState.messageState} />
                </TabPane>
                <TabPane tab='Console' key='console'>
                    <EngineConsole isMini={true} />
                </TabPane>
            </PluginTabs>
        </div>
    )
})
const PluginExecuteHttpFlow: React.FC<PluginExecuteWebsiteTreeProps> = React.memo((props) => {
    const {runtimeId} = props
    const [height, setHeight] = useState<number>(300) //表格所在div高度

    const webTreeRef = useRef<any>()
    return (
        <div className={styles["plugin-execute-http-flow"]}>
            <YakitResizeBox
                lineDirection='right'
                isShowDefaultLineStyle={false}
                firstRatio={"20%"}
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
                secondNode={<CurrentHttpFlow runtimeId={runtimeId} />}
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
    return (
        <PluginExecuteResultTabContent title='任务额外日志与结果'>
            <Timeline pending={loading} style={{marginTop: 10, marginBottom: 10}}>
                {(timelineItemProps || [])
                    .reverse()
                    .filter((item) => item.level !== "json-risk")
                    .map((e, index) => {
                        return (
                            <Timeline.Item key={index} color={LogLevelToCode(e.level)}>
                                <YakitLogFormatter
                                    data={e.data}
                                    level={e.level}
                                    timestamp={e.timestamp}
                                    onlyTime={true}
                                />
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
    const [response, setResponse] = useState<QueryGeneralResponse<Risk>>({
        Data: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    })
    useEffect(() => {
        update(1)
    }, [])
    const update = useMemoizedFn(
        (page?: number, limit?: number, order?: string, orderBy?: string, extraParam?: any) => {
            const paginationProps = {
                Page: page || 1,
                Limit: 50,
                OrderBy: "created_at",
                Order: "desc"
            }
            ipcRenderer
                .invoke("QueryRisks", {
                    Pagination: paginationProps
                })
                .then((r: QueryGeneralResponse<any>) => {
                    setResponse(r)
                })
        }
    )
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
        <TableVirtualResize<Risk>
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
            data={response.Data}
            renderKey={"Hash"}
            pagination={{
                page: 1,
                limit: 50,
                total: response.Data.length,
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
