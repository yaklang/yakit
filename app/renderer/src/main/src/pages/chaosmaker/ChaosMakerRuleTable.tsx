import React, {useEffect, useState} from "react";
import {Table, Tag} from "antd";
import {ChaosMakerRule} from "@/pages/chaosmaker/ChaosMaker";
import {useMemoizedFn} from "ahooks";
import {
    genDefaultPagination,
    PaginationSchema,
    QueryGeneralRequest,
    QueryGeneralResponse
} from "@/pages/invoker/schema";
import {AutoCard} from "@/components/AutoCard";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {showDrawer} from "@/utils/showModal";

export interface ChaosMakerRuleTableProp {

}

const {ipcRenderer} = window.require("electron");

export interface QueryChaosMakerRulesRequest extends QueryGeneralRequest {
    RuleType: string
    Keywords: string[]
}

export const ChaosMakerRuleTable: React.FC<ChaosMakerRuleTableProp> = (props) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ChaosMakerRule[]>([]);
    const [pagination, setPagination] = useState<PaginationSchema>(genDefaultPagination(10));
    const [total, setTotal] = useState<number>(0);
    const [params, setParams] = useState<QueryChaosMakerRulesRequest>({
        Pagination: genDefaultPagination(10), Keywords: [], RuleType: ""
    });

    // 选中规则
    const [selectedRowKeys, setSelectedRowKeys] = useState<ChaosMakerRule>();

    const update = useMemoizedFn((page?: number, limit?: number, order?: string, orderBy?: string, extraParam?: any) => {
        const paginationProps = {
            Page: page || 1,
            Limit: limit || pagination.Limit,
        };
        setLoading(true)
        ipcRenderer.invoke("QueryChaosMakerRules", {
            ...params, ...extraParam ? extraParam : {}, Pagination: paginationProps,
        }).then((r: QueryGeneralResponse<ChaosMakerRule>) => {
            setData(r.Data);
            setPagination(r.Pagination)
            setTotal(r.Total)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        update(1)
    }, [])

    const limit = pagination.Limit;
    return <AutoCard
        title={"BAS 模拟规则"} size={"small"} bordered={true} style={{marginLeft: 6}}
        extra={<>
            <Tag color={"orange"}>已选{total}攻击规则</Tag>
            <YakitButton>按选中剧本发起攻击</YakitButton>
        </>}
    >
        <Table<ChaosMakerRule>
            columns={[
                {title: "规则名", render: (i: ChaosMakerRule) => i.Name},
                {title: "规则类型", render: (i: ChaosMakerRule) => i.RuleType},
                {title: "规则描述", render: (i: ChaosMakerRule) => i.RuleType},
            ]}
            rowKey={i => i["Id"]}
            size={"small"}
            dataSource={data}
            rowSelection={{
                type: "radio",
                selectedRowKeys: selectedRowKeys?.Id ? [selectedRowKeys.Id] : [],
                onChange: (keys) => {
                    if (typeof keys === "object") {
                        let found = false;
                        data.forEach(i => {
                            if (found) {
                                return
                            }
                            if (`${i.Id}` === `${keys[0]}`) {
                                if (!!i) {
                                    showDrawer({
                                        title: "流量规则详情",
                                        width: "30%",
                                        content: (
                                            <div>
                                                {JSON.stringify(i)}
                                            </div>
                                        )
                                    })
                                }
                                setSelectedRowKeys(i)
                                found = true
                            }
                        })
                    }
                },
            }}
            pagination={{
                pageSize: limit,
                showSizeChanger: true,
                total, current: pagination.Page,
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
    </AutoCard>
};