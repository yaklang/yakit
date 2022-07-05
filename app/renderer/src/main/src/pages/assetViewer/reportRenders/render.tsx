import React from "react";
import {ReportItem} from "./schema";
import {ReportMarkdownBlock} from "./markdownRender";
import {YakEditor} from "../../../utils/editors";
import {AutoCard} from "../../../components/AutoCard";
import {Tag} from "antd";
import {JSONTableRender} from "./jsonTableRender";
import {PieGraph} from "../../graph/PieGraph";

export interface ReportItemRenderProp {
    item: ReportItem
}

export const ReportItemRender: React.FC<ReportItemRenderProp> = (props) => {
    switch (props.item.type) {
        case "markdown":
            return <ReportMarkdownBlock item={props.item}/>
        case "json-table":
            return <JSONTableRender item={props.item}/>
        case "pie-graph":
            try {
                return <PieGraph type={"pie"} height={300}
                                 data={JSON.parse(props.item.content) as { key: string, value: number }[]}/>
            } catch (e) {
                console.info("渲染图失败")
                console.info(e)
                return <div style={{height: 300}}>
                    <YakEditor value={props.item.content}/>
                </div>
            }
        default:
            return <AutoCard
                style={{width: "100%"}}
                size={"small"}
                extra={<Tag color={"red"}>{props.item.type}</Tag>}
            >
                <div style={{height: 300}}>
                    <YakEditor value={props.item.content}/>
                </div>
            </AutoCard>
    }
};