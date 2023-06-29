import React, {useEffect, useState} from "react";
import {Button, Pagination, Table} from "antd";
import {Paging} from "@/utils/yakQueryHTTPFlow";
import {genDefaultPagination, QueryGeneralRequest, QueryGeneralResponse} from "@/pages/invoker/schema";
import {useMemoizedFn} from "ahooks";
import {CopyableField} from "@/utils/inputUtil";
import styles from "./hTTPFlowDetail.module.scss"

export interface HTTPFlowExtractedDataTableProp {
    title: React.ReactNode
    httpFlowHash: string
}

const {ipcRenderer} = window.require("electron");

interface HTTPFlowExtractedData {
    Id: number
    CreatedAt: number
    SourceType: "httpflow" | string
    TraceId: string
    Regexp: string
    RuleName: string
    Data: string
}

export const HTTPFlowExtractedDataTable: React.FC<HTTPFlowExtractedDataTableProp> = (props) => {
    const [pagination, setPagination] = useState<Paging>(genDefaultPagination());
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<HTTPFlowExtractedData[]>([]);
    const [params, setParams] = useState<QueryGeneralRequest & { HTTPFlowHash: string }>({
        HTTPFlowHash: props.httpFlowHash, Pagination: genDefaultPagination()
    })
    const [total, setTotal] = useState(0)

    const update = useMemoizedFn((page?: number, limit?: number, order?: string, orderBy?: string, extraParam?: any) => {
        const paginationProps = {
            Page: page || 1,
            Limit: limit || pagination.Limit,
        };
        setLoading(true)
        ipcRenderer.invoke("QueryMITMRuleExtractedData", {
            ...params, ...extraParam ? extraParam : {}, Pagination: paginationProps,
        }).then((r: QueryGeneralResponse<HTTPFlowExtractedData>) => {
            setData(r.Data);
            setPagination(r.Pagination)
            setTotal(r.Total)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        if (!props.httpFlowHash) {
            return
        }
        update(1, 10)
    }, [props.httpFlowHash])

    return <div className={styles["httpFlow-data-table"]}>
        <Table<HTTPFlowExtractedData>
            bordered={true}
            title={() => <>
                {props.title}
            </>}
            dataSource={data}
            key={"Id"}
            columns={[
                {
                    title: "规则名",
                    render: (i: HTTPFlowExtractedData) => <div className='content-ellipsis' style={{width:100,overflow:"hidden"}}>{i.RuleName}</div>,
                    width: 100
                },
                {
                    title: "规则数据",
                    render: (i: HTTPFlowExtractedData) => <div className='content-ellipsis' style={{width:200,overflow:"hidden"}}>{i.Data.slice(0,50)}</div>,
                    width: 210
                },
            ]}
            scroll={{x: "auto"}}
            loading={loading}
            size={"small"} style={{margin: 0, padding: 0}}
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

        >

        </Table>
    </div>
};