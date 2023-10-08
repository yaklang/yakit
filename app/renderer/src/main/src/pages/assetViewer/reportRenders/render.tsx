import React from "react"
import {ReportItem, ReportJsonKindData} from "./schema"
import {ReportMarkdownBlock} from "./markdownRender"
import {YakEditor} from "../../../utils/editors"
import {AutoCard} from "../../../components/AutoCard"
import {Tag} from "antd"
import {JSONTableRender, ReportMergeTable, RiskTable} from "./jsonTableRender"
import {PieGraph} from "../../graph/PieGraph"
import {BarGraph} from "../../graph/BarGraph"
import {EchartsCard, HollowPie, MultiPie, NightingleRose, StackedVerticalBar, VerticalOptionBar} from "./EchartsInit"
import {FoldHoleCard, FoldRuleCard} from "./ReportExtendCard"

export interface ReportItemRenderProp {
    item: ReportItem
}

export const ReportItemRender: React.FC<ReportItemRenderProp> = (props) => {
    const {type, content} = props.item
    switch (type) {
        case "markdown":
            return <ReportMarkdownBlock item={props.item} />
        case "json-table":
            return <JSONTableRender item={props.item} />
        case "pie-graph":
            try {
                return (
                    <PieGraph
                        type={"pie"}
                        height={300}
                        data={JSON.parse(props.item.content) as {key: string; value: number}[]}
                    />
                )
            } catch (e) {
                console.info("渲染图失败")
                console.info(e)
                return (
                    <div style={{height: 300}}>
                        <YakEditor value={props.item.content} />
                    </div>
                )
            }
        case "bar-graph":
            try {
                return (
                    <BarGraph
                        type={"bar"}
                        width={450}
                        direction={props.item?.direction}
                        data={JSON.parse(props.item.content) as {key: string; value: number}[]}
                    />
                )
            } catch (e) {
                console.info("渲染图失败")
                console.info(e)
                return (
                    <div style={{height: 300}}>
                        <YakEditor value={props.item.content} />
                    </div>
                )
            }
        case "raw":
            try {
                const newData = JSON.parse(content)

                if (newData.type === "report-cover") {
                    return <div style={{height: 0}}></div>
                } else if (newData.type === "bar-graph") {
                    let color = newData?.color
                    let name = (newData?.data || []).map((item) => item.name)
                    let value = (newData?.data || []).map((item) => item.value)
                    let title = newData?.title
                    let obj = {name, value, color, title};
                    return <VerticalOptionBar content={obj} />
                } else if (newData.type === "pie-graph") {
                    return <HollowPie data={newData.data} title={newData.title} />
                } else if (newData.type === "fix-list") {
                    return <FoldHoleCard data={newData.data} />
                } else {
                    // kv图 南丁格尔玫瑰图 多层饼环
                    const content = typeof newData === "string" ? JSON.parse(newData) : newData
                    const {type, data} = content
                    if (type) {
                        switch (type) {
                            case "multi-pie":
                                return <MultiPie content={content} />
                            case "nightingle-rose":
                                return <NightingleRose content={content} />
                            // 通用kv
                            case "general":
                                // kv图展示柱状图
                                return <VerticalOptionBar content={content} />
                            case "year-cve":
                                return <StackedVerticalBar content={content}/>
                            case "card":
                                const dataTitle = content?.name_verbose || content?.name || ""
                                return <EchartsCard dataTitle={dataTitle} dataSource={data} />
                            case "fix-array-list":
                                return <FoldRuleCard content={content} />
                            case "risk-list":
                                return <RiskTable data={content} />
                            case "potential-risks-list":
                                return <RiskTable data={content} />
                            case "search-json-table":
                                return <ReportMergeTable data={content} />
                            default:
                                return (
                                    <AutoCard
                                        style={{width: "100%"}}
                                        size={"small"}
                                        extra={<Tag color={"red"}>{props.item.type}</Tag>}
                                    >
                                        <div style={{height: 300}}>
                                            <YakEditor value={props.item.content} />
                                        </div>
                                    </AutoCard>
                                )
                        }
                    }
                }
            } catch (error) {
                return (
                    <AutoCard style={{width: "100%"}} size={"small"} extra={<Tag color={"red"}>{props.item.type}</Tag>}>
                        <div style={{height: 300}}>
                            <YakEditor value={props.item.content} />
                        </div>
                    </AutoCard>
                )
            }
            return null
        default:
            return (
                <AutoCard style={{width: "100%"}} size={"small"} extra={<Tag color={"red"}>{props.item.type}</Tag>}>
                    <div style={{height: 300}}>
                        <YakEditor value={props.item.content} />
                    </div>
                </AutoCard>
            )
    }
}
