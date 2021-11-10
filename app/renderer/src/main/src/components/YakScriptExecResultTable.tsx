import React, {useEffect, useState} from "react";
import {Button, Card, Form, List, Row, Space, Tag} from "antd";
import {
    ExecResult,
    genDefaultPagination,
    PaginationSchema,
    QueryGeneralRequest,
    QueryGeneralResponse
} from "../pages/invoker/schema";
import {yakQueryHTTPFlow, YakQueryHTTPFlowRequest} from "../utils/yakQueryHTTPFlow";
import ReactJson from "react-json-view";
import {ManySelectOne} from "../utils/inputUtil";
import {YakitLogFormatter} from "../pages/invoker/YakitLogFormatter";
import {ExtractExecResultMessage} from "./yakitLogSchema";
import {ExecResultLog} from "../pages/invoker/batch/ExecMessageViewer";
import {ReloadOutlined} from "@ant-design/icons";
import {showByCursorContainer} from "../utils/showByCursor";
import {divider} from "@uiw/react-md-editor";

const {ipcRenderer} = window.require("electron");

export interface YakScriptExecResultTableProp {
    trigger?: boolean
    YakScriptName?: string
}

export interface QueryExecResultsParams extends QueryGeneralRequest {
    YakScriptName: string
}

export const YakScriptExecResultTable: React.FC<YakScriptExecResultTableProp> = (props) => {
    const [availableScriptNames, setAvailableScriptNames] = useState<string[]>(["default"]);
    const [params, setParams] = useState<QueryExecResultsParams>({
            YakScriptName: props.YakScriptName || "", Pagination: genDefaultPagination(10)
        }
    );
    const [pagination, setPagination] = useState<PaginationSchema>({
        Limit: 20,
        Order: "desc",
        OrderBy: "updated_at",
        Page: 1
    });
    const [total, setTotal] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ExecResult[]>([]);

    const update = (page?: number, limit?: number, order?: string, orderBy?: string, sourceType?: string) => {
        const paginationProps = {
            Page: page || 1,
            Limit: limit || pagination.Limit,
        };
        setLoading(true)
        ipcRenderer.invoke("QueryYakScriptExecResult", {
            ...params, Pagination: paginationProps,
        }).then((r: QueryGeneralResponse<ExecResult>) => {
            setData(r.Data);
            setPagination(r.Pagination)
            setTotal(r.Total)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    }

    useEffect(() => {
        ipcRenderer.invoke("QueryYakScriptNameInExecResult", {}).then((e: { YakScriptNames: string[] }) => {
            setAvailableScriptNames(e.YakScriptNames)
        })

        update(1)
    }, [props.trigger])

    useEffect(() => {
        update(1)
    }, [params.YakScriptName])

    return <Space style={{width: "100%"}} direction={"vertical"}>
        {/*{props.YakScriptName ? undefined : <Form onSubmitCapture={e => {*/}
        {/*    e.preventDefault()*/}

        {/*    update()*/}
        {/*}} layout={"inline"}>*/}
        {/*    <ManySelectOne*/}
        {/*        data={availableScriptNames.map(i => {*/}
        {/*            return {value: i, text: i}*/}
        {/*        })}*/}
        {/*        label={"需要查看的插件"} setValue={YakScriptName => setParams({...params, YakScriptName})}*/}
        {/*        value={params.YakScriptName}*/}
        {/*        formItemStyle={{width: 500}}*/}
        {/*    />*/}
        {/*    <Form.Item>*/}
        {/*        <Button type="primary" htmlType="submit"> 搜索插件结果 </Button>*/}
        {/*    </Form.Item>*/}
        {/*</Form>}*/}
        <Card
            bodyStyle={{padding: 0}} size={"small"} bordered={false}
            title={props.YakScriptName ? <>
                <Space>
                    <span>插件结果：</span>
                    <Button icon={<ReloadOutlined/>} type={"link"} onClick={() => {
                        update(1)
                    }}/>
                </Space>
            </> : undefined}
        >
            <div style={{width: "100%", display: "flex", marginBottom: 20}}>
                {props.YakScriptName ? undefined : <Card
                    size={"small"} bordered={true} title={"选择想要查看的插件"}
                    style={{marginRight: 20, minWidth: 240}}
                >
                    <List<string>
                        loading={loading}
                        dataSource={availableScriptNames}
                        renderItem={i => {
                            const selected = i === params.YakScriptName;
                            return <List.Item key={i}>
                                <Card
                                    style={{
                                        width: "100%",
                                        backgroundColor: selected ? "#6f9bff" : undefined,
                                        color: selected ? "#fff" : undefined,
                                    }}
                                    onContextMenu={(e) => {
                                        showByCursorContainer({
                                            content: <>
                                                <Card size={"small"} style={{padding: 0}}>
                                                    <Space direction={"vertical"}>
                                                        <Button
                                                            type={"primary"} danger={true}
                                                            onClick={() => {
                                                                ipcRenderer.invoke("DeleteYakScriptExecResult", {
                                                                    YakScriptName: i,
                                                                }).finally(() => {
                                                                    update(1)
                                                                })
                                                            }}
                                                        >删除该插件全部输出</Button>
                                                        {/*<Button type={"primary"}>查看插件详情</Button>*/}
                                                    </Space>
                                                </Card>
                                            </>
                                        }, e.clientX, e.clientY)
                                    }}
                                    bordered={false}
                                    size={"small"}
                                    hoverable={true}
                                    onClick={() => {
                                        setParams({...params, YakScriptName: i})
                                    }}
                                >
                                    {i}
                                </Card>
                            </List.Item>
                        }}
                        pagination={false}
                    >

                    </List>
                </Card>}
                <List<ExecResult>
                    loading={loading}
                    pagination={{
                        size: "small",
                        pageSize: pagination?.Limit || 10, simple: true,
                        total, showTotal: (i) => <Tag>共{i}条历史记录</Tag>,
                        onChange: (page: number, limit?: number) => {
                            update(page, limit)
                        }
                    }}
                    dataSource={data} bordered={false}
                    renderItem={(item: ExecResult) => {
                        const log: ExecResultLog = ExtractExecResultMessage(item) as ExecResultLog;
                        return <List.Item
                            id={item.Hash}
                            onContextMenu={(e) => {
                                if (!item.Id) {
                                    return
                                }

                                showByCursorContainer({
                                    content: <>
                                        <Space direction={"vertical"}>
                                            <Button
                                                type={"link"} danger={true}
                                                onClick={() => {
                                                    ipcRenderer.invoke("DeleteYakScriptExecResult", {
                                                        Id: [item.Id]
                                                    }).finally(() => {
                                                        update()
                                                    })
                                                }}
                                            >删除该记录</Button>
                                        </Space>
                                    </>
                                }, e.clientX, e.clientY)
                            }}
                            // extra={[
                            //     <Space direction={"vertical"}>
                            //         <Button type={"link"} danger={true}>删除该记录</Button>
                            //     </Space>
                            // ]}
                        >
                            <YakitLogFormatter {...log}/>
                        </List.Item>
                    }}
                >

                </List>
            </div>

        </Card>
    </Space>
};