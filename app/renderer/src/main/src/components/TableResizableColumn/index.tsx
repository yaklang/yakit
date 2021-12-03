import { YakQueryHTTPFlowRequest } from "@/utils/yakQueryHTTPFlow"
import React, { useRef, useEffect, useState } from "react"
import { Table, Column, HeaderCell, Cell, TableProps, ColumnProps } from "rsuite-table"
import "rsuite-table/dist/css/rsuite-table.css"
import "./style.css"

export interface TableResizableColumnProp<T> extends TableProps {
    columns: any[]
    data: T[]
    sortFilter: any
}

const CellRender = ({ rowData, dataKey, render, ...props }: any) => {
    return <Cell {...props}>{render({ rowData, dataKey, ...props })}</Cell>
}

export function TableResizableColumn<T>(props: TableResizableColumnProp<T>) {
    const [cols, setCols] = useState(props.columns)
    const [sortColumn, setSortColumn] = useState("")
    const [sortType, setSortType] = useState()

    useEffect(() => {
        setCols(props.columns)
    }, [props.columns])

    const handleSortColumn = (sortColumn: string, sortType: any) => {
        setSortColumn(sortColumn)
        setSortType(sortType)
        props.sortFilter(sortColumn, sortType)
    }

    useEffect(()=>{})

    return (
        <div>
            <Table
                {...(props as TableProps)}
                className='reszie-table'
                sortColumn={sortColumn}
                sortType={sortType}
                onSortColumn={handleSortColumn}
                bordered={true}
                cellBordered={true}
                rowHeight={props.rowHeight || 40}
            >
                {cols.map((item) => {
                    return (
                        <Column key={item.dataKey} {...(item as ColumnProps)}>
                            <HeaderCell>{item.headRender()}</HeaderCell>
                            <CellRender
                                dataKey={item.dataKey}
                                render={item.cellRender}
                            ></CellRender>
                        </Column>
                    )
                })}
            </Table>
        </div>
    )
}
