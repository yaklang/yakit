import React, {useEffect, useState} from "react";
import {Button, Space, Table, Tag} from "antd";
import {genDefaultPagination, QueryGeneralRequest, QueryGeneralResponse} from "../invoker/schema";
import {failed} from "../../utils/notification";
import {ReloadOutlined} from "@ant-design/icons";

export interface Domain {
    ID?: number
    DomainName: string
    IPAddr: string
    HTTPTitle: string
}

export interface QueryDomainsRequest extends QueryGeneralRequest {
    Network?: string
    DomainKeyword?: string
    Title?: string
}

export interface DomainAssetPageProps {

}

const {ipcRenderer} = window.require("electron");

export const DomainAssetPage: React.FC<DomainAssetPageProps> = (props: DomainAssetPageProps) => {
    const [params, setParams] = useState<QueryDomainsRequest>({
        Pagination: genDefaultPagination(20),
    });
    const [response, setResponse] = useState<QueryGeneralResponse<Domain>>({
        Data: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    });
    const [loading, setLoading] = useState(false);
    const {Data, Total, Pagination} = response;

    const update = (page?: number, limit?: number,) => {
        const newParams = {
            ...params,
        }
        if (page) newParams.Pagination.Page = page;
        if (limit) newParams.Pagination.Limit = limit;

        setLoading(true)
        ipcRenderer.invoke("QueryDomains", newParams).then(data => {
            setResponse(data)
        }).catch(e => {
            failed("QueryExecHistory failed: " + `${e}`)
        }).finally(() => {
            setTimeout(() => setLoading(false), 200)
        })
    }

    useEffect(() => {
        update(1, 20)
    }, [])

    return <Table<Domain>
        loading={loading}
        pagination={{
            size: "small",
            pageSize: Pagination?.Limit || 10, showSizeChanger: true,
            total: Total, showTotal: (i) => <Tag>共{i}条历史记录</Tag>,
            onChange: (page: number, limit?: number) => {
                update(page, limit)
            }
        }}
        title={e => {
            return <Space>
                <div>域名资产</div>
                <Button
                    type={"link"} onClick={() => update(1)}
                    size={"small"} icon={<ReloadOutlined/>}
                />
            </Space>
        }}
        size={"small"} bordered={true}
        dataSource={Data}
        rowKey={e => `${e.ID}`}
        columns={[
            {title: "域名", dataIndex: "DomainName"},
            {title: "IP", dataIndex: "IPAddr"},
            {title: "HTMLTitle", dataIndex: "HTTPTitle"},
        ]}
    >

    </Table>
}