import React, {useEffect, useState} from "react";
import {Button, Space, Table, Tag} from "antd";
import {Risk} from "./schema";
import {genDefaultPagination, QueryGeneralRequest, QueryGeneralResponse} from "../invoker/schema";
import {useMemoizedFn} from "ahooks";
import {formatTimestamp} from "../../utils/timeUtil";
import {ReloadOutlined} from "@ant-design/icons";
import {failed} from "../../utils/notification";
import {showModal} from "../../utils/showModal";
import ReactJson from "react-json-view";

export interface RiskTableProp {

}

export interface QueryRisksParams extends QueryGeneralRequest {

}

const {ipcRenderer} = window.require("electron");

export const RiskTable: React.FC<RiskTableProp> = (props) => {
    const [response, setResponse] = useState<QueryGeneralResponse<Risk>>({
        Data: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    });
    const [params, setParams] = useState<QueryRisksParams>({Pagination: genDefaultPagination(20)});
    const total = response.Total;
    const pagination = response.Pagination;
    const limit = response.Pagination.Limit;
    const [loading, setLoading] = useState(false);

    const update = useMemoizedFn((page?: number, limit?: number, order?: string, orderBy?: string, extraParam?: any) => {
        const paginationProps = {
            Page: page || 1,
            Limit: limit || pagination.Limit,
        };
        setLoading(true)
        ipcRenderer.invoke("QueryRisks", {
            ...params, ...extraParam ? extraParam : {}, Pagination: paginationProps,
        }).then((r: QueryGeneralResponse<any>) => {
            setResponse(r)
        }).catch(e => {
            failed(`QueryRisks failed: ${e}`)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    });

    useEffect(() => {
        update(1);
    }, [])

    return <Table<Risk>
        title={() => {
            return <Space>
                {"风险与漏洞"}
                <Button size={"small"} type={"link"} onClick={() => {
                    update()
                }} icon={<ReloadOutlined/>}/>
            </Space>
        }}
        size={"small"} bordered={true}
        columns={[
            {title: "标题", render: (i: Risk) => i?.TitleVerbose || i.Title},
            {title: "类型", render: (i: Risk) => i?.RiskTypeVerbose || i.RiskType},
            {title: "IP", render: (i: Risk) => i?.IP || "-"},
            {title: "Token", render: (i: Risk) => i?.ReverseToken || "-"},
            {title: "发现时间", render: (i: Risk) => <Tag>{i.CreatedAt > 0 ? formatTimestamp(i.CreatedAt) : "-"}</Tag>},
            {
                title: "操作", render: (i: Risk) => <Space>
                    <Button
                        type={"link"}
                        onClick={() => {
                            showModal({
                                width: "60",
                                title: "详情", content: <div style={{overflow: "auto"}}>
                                    <ReactJson src={i}/>
                                </div>
                            })
                        }}
                    >详情</Button>
                </Space>
            }
        ]}
        rowKey={e => e.Hash}
        loading={loading}
        dataSource={response.Data}
        pagination={{
            pageSize: limit,
            showSizeChanger: true,
            total,
            pageSizeOptions: ["5", "10", "20"],
            onChange: (page: number, limit?: number) => {
                // submit(page, limit)
            },
            onShowSizeChange: (old, limit) => {
                // dispatch({type: "updateParams", payload: {page: 1, limit}})
                // submit(1, limit)
            }
        }}
    >

    </Table>
};