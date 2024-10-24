import React, {useEffect, useState} from "react"
import {Button, Pagination, Typography, Table, Tooltip} from "antd"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import {genDefaultPagination, QueryGeneralRequest, QueryGeneralResponse} from "@/pages/invoker/schema"
import {useMemoizedFn} from "ahooks"
import {CopyableField} from "@/utils/inputUtil"
import styles from "./hTTPFlowDetail.module.scss"
import {HighLightText} from "./HTTPFlowDetail"
const {Text} = Typography
export interface HTTPFlowExtractedDataTableProp {
    title: React.ReactNode
    hiddenIndex: string
    onSetHighLightText: (highLightText: HighLightText[]) => void
}

const {ipcRenderer} = window.require("electron")

export interface HTTPFlowExtractedData {
    Id: number
    CreatedAt: number
    SourceType: "httpflow" | string
    TraceId: string
    Regexp: string
    RuleName: string
    Data: string
    Index: number
    Length: number
    IsMatchRequest: boolean
}

interface QueryMITMRuleExtractedDataRequest extends QueryGeneralRequest {
    HiddenIndex?: string
}

export const HTTPFlowExtractedDataTable: React.FC<HTTPFlowExtractedDataTableProp> = (props) => {
    const [pagination, setPagination] = useState<Paging>(genDefaultPagination())
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<HTTPFlowExtractedData[]>([])
    const [params, setParams] = useState<QueryMITMRuleExtractedDataRequest>({
        HiddenIndex: props.hiddenIndex,
        Pagination: genDefaultPagination()
    })
    const [total, setTotal] = useState(0)

    const update = useMemoizedFn((page?: number, limit?: number, hiddenIndex?: string) => {
        const paginationProps = {
            Page: page || 1,
            Limit: limit || pagination.Limit
        }
        setLoading(true)
        ipcRenderer
            .invoke("QueryMITMRuleExtractedData", {
                ...params,
                Pagination: paginationProps,
                HTTPFlowHiddenIndex: hiddenIndex ? hiddenIndex : params.HiddenIndex
            })
            .then((r: QueryGeneralResponse<HTTPFlowExtractedData>) => {
                setData(r.Data)
                props.onSetHighLightText(
                    r.Data.map((i) => ({
                        startOffset: i.Index,
                        highlightLength: i.Length,
                        hoverVal: i.RuleName,
                        IsMatchRequest: i.IsMatchRequest
                    }))
                )
                setPagination(r.Pagination)
                setTotal(r.Total)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        if (!props.hiddenIndex) {
            return
        }
        setParams({...params, HiddenIndex: props.hiddenIndex})
        update(1, 10, props.hiddenIndex)
    }, [props.hiddenIndex])

    return (
        <div className={styles["httpFlow-data-table"]}>
            <Table<HTTPFlowExtractedData>
                bordered={true}
                title={() => <>{props.title}</>}
                dataSource={data}
                key={"Id"}
                columns={[
                    {
                        title: "规则名",
                        render: (i: HTTPFlowExtractedData) => (
                            <Text
                                style={{maxWidth: 100}}
                                ellipsis={{
                                    tooltip: true
                                }}
                            >
                                {i.RuleName}
                            </Text>
                        ),
                        width: 100
                    },
                    {
                        title: "规则数据",
                        render: (i: HTTPFlowExtractedData) => (
                            <Text
                                style={{maxWidth: 200}}
                                ellipsis={{
                                    tooltip: <div style={{maxHeight: 300, overflowY: "auto"}}>{i.Data}</div>
                                }}
                            >
                                {i.Data}
                            </Text>
                        ),
                        width: 210
                    }
                ]}
                scroll={{x: "auto"}}
                loading={loading}
                size={"small"}
                style={{margin: 0, padding: 0}}
                pagination={{
                    pageSize: pagination.Limit,
                    showSizeChanger: true,
                    total,
                    pageSizeOptions: ["5", "10", "20"],
                    onChange: (page: number, limit?: number) => {
                        // dispatch({type: "updateParams", payload: {page, limit}})
                        update(page, limit)
                    },
                    onShowSizeChange: (old, limit) => {
                        // dispatch({type: "updateParams", payload: {page: 1, limit}})
                        update(1, limit)
                    }
                }}
            ></Table>
        </div>
    )
}
