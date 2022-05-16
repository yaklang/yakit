import React from "react";
import {ReportItem} from "./schema";
import {ReportMarkdownBlock} from "./markdownRender";
import {YakEditor} from "../../../utils/editors";
import {AutoCard} from "../../../components/AutoCard";
import {Tag} from "antd";
import {JSONTableRender} from "./jsonTableRender";

export interface ReportItemRenderProp {
    item: ReportItem
}

export const ReportItemRender: React.FC<ReportItemRenderProp> = (props) => {
    switch (props.item.type) {
        case "markdown":
            return <ReportMarkdownBlock item={props.item}/>
        case "json-table":
            return <JSONTableRender item={props.item}/>
        default:
            return <AutoCard
                style={{width: "100%", height: 400}}
                extra={<Tag color={"red"}>{props.item.type}</Tag>}
            >
                <YakEditor value={props.item.content}/>
            </AutoCard>
    }
};