import React, {useState, useEffect, ReactNode} from "react"
import {BaseTable, features, useTablePipeline} from "../../../alibaba/ali-react-table-dist"
import * as antd from "antd"

import "./BasicTable.scss"

interface ColumnsProps {
    name: string
    title: ReactNode
}
export interface BasicTableProp {
    columns: ColumnsProps[] | string[]
    data: object[]
    loading?: boolean
}

export const BasicTable: React.FC<BasicTableProp> = (props) => {
    const pipeline = useTablePipeline({
        components: antd
    })
        .input({
            dataSource: props.data,
            columns: props.columns.map((i) => {
                return {
                    code: i.name || i,
                    name: i.name || i,
                    width: 150,
                    title: i.title || null,
                    render: (value: any) => <div style={{wordBreak: "break-word"}}>{value}</div>
                } as any
            })
        })
        .primaryKey("uuid")
        .use(
            features.columnResize({
                minSize: 60
            })
        )
        .use(features.columnHover())
        .use(features.tips())

    return (
        <div style={{width: "100%"}}>
            <BaseTable {...pipeline.getProps()} style={{width: "100%", overflow: "auto"}} isLoading={props.loading} />
        </div>
    )
}
