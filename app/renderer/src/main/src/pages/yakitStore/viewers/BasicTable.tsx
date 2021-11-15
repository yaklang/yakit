import React from "react";
import {BaseTable, features, useTablePipeline} from "../../../alibaba/ali-react-table-dist";
import * as antd from "antd";

export interface BasicTableProp {
    columns: string[]
    data: object[]
}

export const BasicTable: React.FC<BasicTableProp> = (props) => {
    // const findHTTPFlowById = (Hash: string) => {
    //     return response.Data.filter(i => i.Hash === Hash).shift()
    // }

    const pipeline = useTablePipeline({
        components: antd,
    }).input({
        dataSource: props.data,
        columns: props.columns.map(i => {
            return {code: i, name: i, width: 150} as any
        }),
    }).primaryKey("uuid").use(features.columnResize({
        minSize: 60,
    })).use(features.columnHover()).use(features.tips())

    return <div style={{width: "100%"}}>
        <BaseTable
            {...pipeline.getProps()} style={{width: "100%", height: 600, overflow: "auto"}}
        />
    </div>
};