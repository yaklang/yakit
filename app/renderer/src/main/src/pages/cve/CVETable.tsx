import React, {useEffect, useState} from "react";
import {AutoCard} from "@/components/AutoCard";
import {Table} from "antd";
import {QueryCVERequest} from "@/pages/cve/CVEViewer";
import {useMemoizedFn} from "ahooks";
import {genDefaultPagination, PaginationSchema, QueryGeneralResponse} from "@/pages/invoker/schema";

export interface CVETableProp {
    filter: QueryCVERequest
}

const {ipcRenderer} = window.require("electron");

export const CVETable: React.FC<CVETableProp> = (props) => {
    const [params, setParams] = useState<QueryCVERequest>({...props.filter});
    const [data, setData] = useState<CVEDetail[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState<PaginationSchema>(genDefaultPagination(1, 20));
    const [total, setTotal] = useState(0);

    const update = useMemoizedFn((page?: number, limit?: number, order?: string, orderBy?: string, extraParam?: any) => {
        const paginationProps = {
            Page: page || 1,
            Limit: limit || pagination.Limit,
        };
        setLoading(true)
        ipcRenderer.invoke("QueryCVE", {
            ...params, ...extraParam ? extraParam : {}, Pagination: paginationProps,
        }).then((r: QueryGeneralResponse<CVEDetail>) => {
            setData(r.Data);
            setPagination(r.Pagination)
            setTotal(r.Total)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        update(1)
    }, [])

    return <AutoCard bordered={false} size={"small"} title={"CVE 列表"}>
        <Table<CVEDetail>
            size={"small"}
            dataSource={data}
            columns={[
                {title: "CVE编号", render: (i: CVEDetail) => i.CVE},
                {title: "中文标题", render: (i: CVEDetail) => i.Title},
                {title: "产品名", render: (i: CVEDetail) => i.Product},
                {title: "CVSSv2基础评分", render: (i: CVEDetail) => i.BaseCVSSv2Score},
            ]}
        />
    </AutoCard>
};

export interface CVEDetail {
    CVE: string
    DescriptionZh: string
    DescriptionOrigin: string
    Title: string
    Solution: string
    AccessVector: string
    AccessComplexity: string
    Authentication: string
    ConfidentialityImpack: string
    IntegrityImpact: string
    AvailabilityImpact: string
    Severity: string
    PublishedAt: number
    CWE: string
    CVSSVersion: string
    CVSSVectorString: string
    BaseCVSSv2Score: number
    ExploitabilityScore: number
    ObtainAllPrivileged: boolean
    ObtainUserPrivileged: boolean
    ObtainOtherPrivileged: boolean
    UserInteractionRequired: boolean
    Product: string
}