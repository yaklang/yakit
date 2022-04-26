import React from "react";
import {ReportItem} from "./schema";

import MDEditor from "@uiw/react-md-editor";

const {Markdown} = MDEditor;

export interface ReportMarkdownBlockProp {
    item: ReportItem
}

export const ReportMarkdownBlock: React.FC<ReportMarkdownBlockProp> = (props) => {
    return <Markdown source={props.item.content}/>
};