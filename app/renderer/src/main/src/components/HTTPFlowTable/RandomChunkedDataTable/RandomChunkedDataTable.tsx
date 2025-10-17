import React from "react"
import {RandomChunkedDataTableProps} from "./RandomChunkedDataTableType"
import styles from "./RandomChunkedDataTable.module.scss"
import {useCreation} from "ahooks"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {RandomChunkedResponse} from "@/pages/fuzzer/HTTPFuzzerPage"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const RandomChunkedDataTable: React.FC<RandomChunkedDataTableProps> = React.memo((props) => {
    const {data} = props
    const {t, i18n} = useI18nNamespaces(["history"])
    const columns: ColumnsTypeProps[] = useCreation(() => {
        return [
            {
                title: "ID",
                dataKey: "Index",
                width: 100
            },
            {
                title: t("RandomChunkedDataTable.content"),
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
                title: t("RandomChunkedDataTable.chunkLength"),
                dataKey: "ChunkedLength",
                width: 140
            },
            {
                title: t("RandomChunkedDataTable.singleDurationMs"),
                dataKey: "CurrentChunkedDelayTime",
                width: 160
            },
            {
                title: t("RandomChunkedDataTable.totalDurationMs"),
                dataKey: "TotalDelayTime",
                width: 160
            }
        ]
    }, [i18n.language])
    return (
        <div className={styles["chunked-table-container-wrapper"]}>
            <div className={styles["chunked-table-container-title"]}>{t("RandomChunkedDataTable.chunkDetails")}</div>
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
