import React, {useEffect, useState} from "react";
import {Form, Space, Table, Tabs, Tag} from "antd";
import {ChaosMakerRule, ChaosMakerRuleGroup} from "@/pages/chaosmaker/ChaosMaker";
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
import {InputItem} from "@/utils/inputUtil";
import {ChaosMakerOperators, ExecuteChaosMakerRuleRequest} from "@/pages/chaosmaker/ChaosMakerOperators";
import {failed} from "@/utils/notification";
import {ChaosMakerRunningSteps} from "@/pages/chaosmaker/ChaosMakerRunningSteps";
import {AutoSpin} from "@/components/AutoSpin";

export interface ChaosMakerRuleTableProp {
    groups?: ChaosMakerRuleGroup[]
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
    const [activeTab, setActiveTab] = useState<"tables" | "steps">("tables");
    const [running, setRunning] = useState(false);
    const [executeParam, setExecuteParams] = useState<ExecuteChaosMakerRuleRequest>();

    useEffect(() => {
        if (running) {
            setActiveTab("steps")
            setRunning(true)
            return () => {
                setActiveTab("tables")
            }
        }
    }, [running])

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
        }).catch(e => {
            failed(`查询BAS规则失败: ${e}`)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        update(1)
    }, [])

    const limit = pagination.Limit;
    return <AutoCard
        title={<div>
            模拟攻击集
            <Space style={{marginLeft: 4}} size={0}>
                {(props?.groups || []).filter((_, index) => {
                    return index < 3
                }).map(i => {
                    return <Tag color={"orange"}>{i.Title}</Tag>
                })}
                {(props?.groups || []).length > 3 && <Tag color={"orange"}>+{(props?.groups || []).length - 3}</Tag>}
            </Space>
        </div>} size={"small"} bordered={true} style={{marginLeft: 6}}
        extra={<>
            <Tag color={"orange"}>已选{total}攻击规则</Tag>
        </>}
        bodyStyle={{display: "flex", flexDirection: "column"}}
    >
        <ChaosMakerOperators running={running} groups={(props.groups || [])} onExecute={(data: ExecuteChaosMakerRuleRequest) => {
            setExecuteParams(data);
            setRunning(true)
        }}/>
        <Tabs
            style={{height: "100%"}}
            activeKey={activeTab}
            type={"card"}
            onChange={e => {

            }}
        >
            <Tabs.TabPane disabled={running} key="tables" tab={"规则列表"}>
                <Table<ChaosMakerRule>
                    style={{flex: 1}}
                    columns={[
                        {title: "规则名", render: (i: ChaosMakerRule) => i.NameZh || i.Name},
                        {title: "规则类型", render: (i: ChaosMakerRule) => i.ClassType},
                        {title: "相关", render: (i: ChaosMakerRule) => (i["CVE"] || []).join(", ")},
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
                        simple: true,
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
            </Tabs.TabPane>
            {running && <Tabs.TabPane key={"steps"} tab={"运行状态"}>
                <ChaosMakerRunningSteps params={executeParam}/>
            </Tabs.TabPane>}
        </Tabs>
    </AutoCard>
};