import React, {useRef} from "react"
import {Risk} from "@/pages/risks/schema"
import {Empty} from "antd"
import {RiskDetails, TitleColor} from "@/pages/risks/RiskTable"
import {showModal} from "@/utils/showModal"
import {TableResizableColumn} from "@/components/TableResizableColumn"
import {useInViewport} from "ahooks"

export interface RisksViewerProp {
    risks: Risk[]
    tableContentHeight?: number
}

export const RisksViewer: React.FC<RisksViewerProp> = React.memo((props) => {
    const {tableContentHeight} = props
    const ref = useRef(null)
    const [inViewport] = useInViewport(ref)
    return (
        <div ref={ref}>
            <TableResizableColumn
                virtualized={true}
                sortFilter={() => {}}
                autoHeight={typeof tableContentHeight === "number" ? tableContentHeight <= 0 : undefined}
                height={tableContentHeight}
                data={props.risks}
                wordWrap={true}
                renderEmpty={() => {
                    return <Empty className='table-empty' description='数据加载中' />
                }}
                columns={[
                    {
                        dataKey: "TitleVerbose",
                        width: 400,
                        resizable: true,
                        minWidth: 400,
                        headRender: () => "标题",
                        cellRender: ({rowData, dataKey, ...props}: any) => {
                            return (
                                <div
                                    className='div-font-ellipsis'
                                    style={{width: "100%"}}
                                    title={rowData?.TitleVerbose || rowData.Title}
                                >
                                    {rowData?.TitleVerbose || rowData.Title}
                                </div>
                            )
                        }
                    },
                    {
                        dataKey: "RiskTypeVerbose",
                        width: 150,
                        minWidth: 150,
                        resizable: true,
                        headRender: () => "类型",
                        cellRender: ({rowData, dataKey, ...props}: any) => {
                            return rowData?.RiskTypeVerbose || rowData.RiskType
                        }
                    },
                    {
                        dataKey: "Severity",
                        width: 90,
                        headRender: () => "等级",
                        cellRender: ({rowData, dataKey, ...props}: any) => {
                            const title = TitleColor.filter((item) => item.key.includes(rowData.Severity || ""))[0]
                            return (
                                <span className={title?.value || "title-default"}>
                                    {title ? title.name : rowData.Severity || "-"}
                                </span>
                            )
                        }
                    },
                    {
                        dataKey: "IP",
                        width: 160,
                        headRender: () => "IP",
                        cellRender: ({rowData, dataKey, ...props}: any) => {
                            return rowData?.IP || "-"
                        }
                    },
                    {
                        dataKey: "ReverseToken",
                        flexGrow: 1,
                        minWidth: 360,
                        headRender: () => "Token",
                        cellRender: ({rowData, dataKey, ...props}: any) => {
                            return rowData?.ReverseToken || "-"
                        }
                    },
                    {
                        dataKey: "operate",
                        width: 90,
                        fixed: "right",
                        headRender: () => "操作",
                        cellRender: ({rowData}: any) => {
                            return (
                                <a
                                    onClick={(e) => {
                                        showModal({
                                            width: "80%",
                                            title: "详情",
                                            content: (
                                                <div style={{overflow: "auto"}}>
                                                    <RiskDetails info={rowData} isShowTime={false} />
                                                </div>
                                            )
                                        })
                                    }}
                                >
                                    详情
                                </a>
                            )
                        }
                    }
                ].map((item) => {
                    item["verticalAlign"] = "middle"
                    return item
                })}
            />
        </div>
    )
})
