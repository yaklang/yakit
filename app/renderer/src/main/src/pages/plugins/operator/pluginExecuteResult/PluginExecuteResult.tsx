import PluginTabs from "@/components/businessUI/PluginTabs/PluginTabs"
import React, {useEffect, useMemo, useState} from "react"
import {HorizontalScrollCard} from "../horizontalScrollCard/HorizontalScrollCard"
import styles from "./PluginExecuteResult.module.scss"
import {PluginExecuteResultProps, VulnerabilitiesRisksTableProps} from "./PluginExecuteResultType"
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

const {TabPane} = PluginTabs
const {ipcRenderer} = window.require("electron")

export const PluginExecuteResult: React.FC<PluginExecuteResultProps> = React.memo((props) => {
    const {infoState} = props
    return (
        <div className={styles["plugin-execute-result"]}>
            <div className={styles["plugin-execute-result-wrapper"]}>
                <HorizontalScrollCard title={"Data Card"} />
            </div>
            <PluginTabs defaultActiveKey='risk'>
                <TabPane tab='漏洞与风险' key='risk'>
                    <VulnerabilitiesRisksTable />
                </TabPane>
                <TabPane tab='本次执行 HTTP 流量' key='current-http-flow'>
                    本次执行 HTTP 流量
                </TabPane>
                <TabPane tab='基础插件信息 / 日志' key='feature-0'>
                    基础插件信息 / 日志
                </TabPane>
                <TabPane tab='Console' key='console'>
                    Console
                </TabPane>
            </PluginTabs>
        </div>
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
