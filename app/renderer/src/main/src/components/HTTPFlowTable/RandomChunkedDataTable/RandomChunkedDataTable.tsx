import React from "react"
import {RandomChunkedDataTableProps} from "./RandomChunkedDataTableType"
import styles from "./RandomChunkedDataTable.module.scss"
import {useCreation} from "ahooks"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {RandomChunkedResponse} from "@/pages/fuzzer/HTTPFuzzerPage"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"

const RandomChunkedDataTable: React.FC<RandomChunkedDataTableProps> = React.memo((props) => {
    const {data} = props
    const columns: ColumnsTypeProps[] = useCreation(() => {
        return [
            {
                title: "ID",
                dataKey: "Index",
                width: 100
            },
            {
                title: "内容",
                dataKey: "Data",
                render: (text) => {
                    const originValueStr = text ? Buffer.from(text).toString() : ""
                    return (
                        <span
                            className='content-ellipsis'
                            title={`${
                                originValueStr.length > 200 ? `${originValueStr.substring(0, 200)}...` : originValueStr
                            }`}
                        >
                            {originValueStr.length > 200 ? originValueStr.substring(0, 200) : originValueStr}
                        </span>
                    )
                }
            },
            {
                title: "分块长度",
                dataKey: "ChunkedLength",
                width: 100
            },
            {
                title: "单个耗时(ms)",
                dataKey: "CurrentChunkedDelayTime",
                width: 120
            },
            {
                title: "总耗时(ms)",
                dataKey: "TotalDelayTime",
                width: 100
            }
        ]
    }, [])
    return (
        <div className={styles["chunked-table-container-wrapper"]}>
            <div className={styles["chunked-table-container-title"]}>分块详情</div>
            <TableVirtualResize<RandomChunkedResponse>
                isRefresh={false}
                titleHeight={0.01}
                renderTitle={<></>}
                renderKey='Index'
                data={data}
                columns={columns}
                pagination={{
                    page: 1,
                    limit: 10,
                    total: data.length,
                    onChange: () => {}
                }}
                containerClassName={styles["chunked-table-container"]}
            />
        </div>
    )
})

export default RandomChunkedDataTable
