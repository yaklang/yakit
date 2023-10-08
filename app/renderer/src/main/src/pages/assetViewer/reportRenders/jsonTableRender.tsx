import React, {useEffect, useMemo, useRef, useState} from "react"
import {ReportItemRenderProp} from "./render"
import {Table} from "antd"
import {MinusSquareOutlined, PlusSquareOutlined} from "@ant-design/icons"
import {useUpdateEffect} from "ahooks"
import styles from "./jsonTableRender.module.scss"
import classNames from "classnames"

export interface JSONTableRenderProp extends ReportItemRenderProp {}

export const JSONTableRender: React.FC<JSONTableRenderProp> = (props) => {
    const [header, setHeader] = useState<string[]>([])
    const [data, setData] = useState<object[]>([])

    useEffect(() => {
        try {
            const _data = JSON.parse(props.item.content) as {header: string[]; data: string[][]}
            const {header, data} = _data
            setHeader(header)
            setData(
                data
                    .map((i, _index) => {
                        const obj = {_index}
                        for (let pIndex = 0; pIndex < header.length; pIndex++) {
                            if (i === null || i === undefined) {
                                return {_index: -1}
                            }
                            if (pIndex >= i.length) {
                                obj[header[pIndex]] = ""
                            } else {
                                obj[header[pIndex]] = i[pIndex]
                            }
                        }
                        return obj
                    })
                    .filter((i) => i._index >= 0) as object[]
            )
        } catch (e) {
            console.info(e)
        }
    }, [props.item])

    return (
        <Table
            style={{marginTop: 12}}
            size={"small"}
            pagination={false}
            columns={header.map((i) => {
                return {title: i, dataIndex: i}
            })}
            rowKey={"_index"}
            dataSource={data}
        ></Table>
    )
}

export const FoldTable: React.FC<RiskTableProp> = (props) => {
    const {data: datas} = props
    const {data} = datas

    const tableData = useRef<any[]>([])
    const [header, setHeader] = useState<string[]>([])
    const [dataSource, setDataSource] = useState<any[]>([])
    const [extendItem, setExtendItem] = useState<boolean>(false)
    useEffect(() => {
        let header: string[] = []
        data.map((item, index) => {
            let newArr: any = Object.entries(item)
            newArr.sort(function (a: any, b: any) {
                return a[1].sort - b[1].sort
            })
            let itemData: any = {}
            newArr.map((itemIn: any[], indexIn: number) => {
                if (index === 0) {
                    header.push(itemIn[0])
                }
                itemData[`name-${indexIn}`] = itemIn[1]
            })
            tableData.current = [...tableData.current, itemData]
        })
        setHeader(header)
        // setDataSource(tableData.current)
    }, [])

    useUpdateEffect(() => {
        if (extendItem) {
            setDataSource(tableData.current)
        } else {
            setDataSource([])
        }
    }, [extendItem])

    const columns = useMemo(() => {
        const initColumns: {title: any; dataIndex: string; key: string}[] = (header as string[]).map((item, index) => {
            return {
                title: () => {
                    if (index === 0) {
                        return (
                            <div>
                                {extendItem ? <MinusSquareOutlined /> : <PlusSquareOutlined />}
                                <span style={{paddingLeft: 4}}>{item}</span>
                            </div>
                        )
                    }
                    return item
                },
                dataIndex: `name-${index}`,
                key: `name-${index}`,
                render: (text: any) => {
                    return <div style={text?.color ? {color: text.color} : {}}>{text?.value}</div>
                }
            }
        })
        return initColumns
    }, [header, extendItem])

    const headerRow = {
      onClick: () => {
        setExtendItem(!extendItem)
      },
    }
    return (
        <div
            className={classNames({
                [styles["fold-table"]]: !extendItem
            })}
        >
            <Table
                tableLayout='fixed'
                bordered={true}
                columns={columns}
                dataSource={dataSource}
                pagination={false}
                onHeaderRow={() => headerRow}
            ></Table>
        </div>
    )
}

export interface ReportTableProp {
    data: any
}

export const ReportMergeTable: React.FC<ReportTableProp> = (props) => {
    const {data: content} = props

    let header: string[] = []
    let data: any[] = []
    if (Array.isArray(content.data)) {
        content.data.map((item, index) => {
            let newArr = Object.entries(item)
            newArr.sort(function (a: any, b: any) {
                return a[1].sort - b[1].sort
            })
            let itemData: any[] = []
            newArr.map((itemIn: any) => {
                if (index === 0) {
                    header.push(itemIn[0])
                }
                itemData.push(itemIn[1]?.value || "")
            })
            data.push(itemData)
        })
    }

    let newData: string[][] = []
    const result = data.reduce((acc, item) => {
        const key = item[0]
        if (!acc[key]) {
            acc[key] = []
        }
        acc[key].push(item)
        return acc
    }, {})
    const sortedArr = Object.values(result)
    sortedArr.map((item) => {
        if (Array.isArray(item)) {
            newData = [...newData, ...item]
        }
    })

    const columns: {title: string; dataIndex: string; key: string}[] = (header as string[]).map((item, index) => {
        if (index === 0) {
            return {
                title: item,
                dataIndex: `name-${index}`,
                key: `name-${index}`,
                render: (text: any, record: any, index: number) => {
                    const firstRowIndex = newData.findIndex((item: string[]) => item[0] === text)
                    if (index === firstRowIndex) {
                        const count = newData.filter((item: string[]) => item[0] === text).length
                        return {
                            children: text,
                            props: {
                                rowSpan: count
                            }
                        }
                    }
                    return {
                        children: null,
                        props: {
                            rowSpan: 0
                        }
                    }
                }
            }
        }
        return {
            title: item,
            dataIndex: `name-${index}`,
            key: `name-${index}`
        }
    })
    const dataSource = (newData as string[][]).map((item, index) => {
        const info: {[key: string]: any} = {
            key: `${index}`
        }
        for (let i in item) {
            info[`name-${i}`] = item[i]
        }
        return info
    })

    return (
        <div>
            <Table
                tableLayout='fixed'
                bordered={true}
                columns={columns}
                dataSource={dataSource}
                pagination={false}
            ></Table>
        </div>
    )
}

interface DataProps {
    data: any[]
    type: string
}

interface RiskTableProp {
    data: DataProps
}

export const RiskTable: React.FC<RiskTableProp> = (props) => {
    const {data: datas} = props
    const {data} = datas

    const [header, setHeader] = useState<string[]>([])
    const [dataSource, setDataSource] = useState<any[]>([])
    useEffect(() => {
        let header: string[] = []
        let tableData: any[] = []
        data.map((item, index) => {
            let newArr: any = Object.entries(item)
            newArr.sort(function (a: any, b: any) {
                return a[1].sort - b[1].sort
            })
            let itemData: any = {}
            newArr.map((itemIn: any[], indexIn: number) => {
                if (index === 0) {
                    header.push(itemIn[0])
                }
                itemData[`name-${indexIn}`] = itemIn[1]
            })
            tableData.push(itemData)
        })
        // console.log("tableData", tableData);
        setHeader(header)
        setDataSource(tableData)
    }, [])

    const columns = useMemo(() => {
        const initColumns: {title: string; dataIndex: string; key: string}[] = (header as string[]).map(
            (item, index) => {
                return {
                    title: item,
                    dataIndex: `name-${index}`,
                    key: `name-${index}`,
                    render: (text: any) => {
                        return <div style={text?.color ? {color: text.color} : {}}>{text?.value}</div>
                    }
                }
            }
        )
        return initColumns
    }, [header])

    return (
        <div>
            <Table
                tableLayout='fixed'
                bordered={true}
                columns={columns}
                dataSource={dataSource}
                pagination={false}
            ></Table>
        </div>
    )
}
