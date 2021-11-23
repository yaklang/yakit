import React, {useEffect, useState} from "react";
import {Typography, PageHeader, Table, Tag, Space, Row, Tabs, Button} from "antd";
import {ExecHistoryRecord, ExecHistoryRecordResponse, PaginationSchema} from "./schema";
import {formatTimestamp} from "../../utils/timeUtil";
import {YakEditor} from "../../utils/editors";
import {showDrawer} from "../../utils/showModal";

const {Text} = Typography;

export interface ExecHistoryTableProp {
    trigger?: number
    mini?: boolean
}

const {ipcRenderer} = window.require("electron");

const ExecHistoryViewer = (r: ExecHistoryRecord) => {
    return <Row style={{width: "100%"}}>
        <Space direction={"vertical"} style={{width: "100%"}}>
            {/*<div style={{height: 300, width: "100%"}}>*/}
            {/*    <YakEditor value={r.Script} readOnly={true}/>*/}
            {/*</div>*/}
            <Tabs>
                {r.Stderr && <Tabs.TabPane tab={"标准错误流内容"} key={"stderr"}>
                    <div style={{height: 300}}>
                        <YakEditor value={Buffer.from(r.Stderr).toString("utf8")} readOnly={true}/>
                    </div>
                </Tabs.TabPane>}
                {r.Stdout && <Tabs.TabPane tab={"标准输出流内容"} key={"stdout"}>
                    <div style={{height: 300}}>
                        <YakEditor value={Buffer.from(r.Stdout).toString("utf8")} readOnly={true}/>
                    </div>
                </Tabs.TabPane>}
            </Tabs>
        </Space>
    </Row>
}

export const ExecHistoryTable: React.FC<ExecHistoryTableProp> = (props) => {
    const [data, setData] = useState<ExecHistoryRecord[]>([]);
    const [pagination, setPagination] = useState<PaginationSchema>({
        Limit: 8,
        Order: "desc",
        OrderBy: "updated_at",
        Page: 1
    });
    const [total, setTotal] = useState<number>(0);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const update = (page?: number, limit?: number) => {
        setLoading(true)
        if (page || limit) {
            ipcRenderer.invoke("yak-exec-history", {
                Pagination: {Page: page || 1, Limit: limit || pagination?.Limit, Order: "desc", OrderBy: "updated_at"}
            })
        } else {
            ipcRenderer.invoke("yak-exec-history", {
                Pagination: {Page: 1, Limit: pagination.Limit, Order: "desc", OrderBy: "updated_at",}
            })
        }
    }

    useEffect(() => {
        update(1)
    }, [props.trigger])

    useEffect(() => {
        ipcRenderer.on("client-yak-exec-history", function handler(_, data: ExecHistoryRecordResponse) {
            if (data) {
                setData(data.Data)
                setPagination(data.Pagination)
                setTotal(data.Total)
            }
            setTimeout(() => setLoading(false), 300)
        })
        ipcRenderer.on("client-yak-exec-error", function handler(_, error) {
            setError(error)
            setTimeout(() => setLoading(false), 300)
        })

        update()
        return () => {
            ipcRenderer.removeAllListeners("client-yak-exec-history")
            ipcRenderer.removeAllListeners("client-yak-exec-error")
        }
    }, [])

    return <div style={{marginTop: 0}}>
        <Table<ExecHistoryRecord>
            bordered={true}
            size={"small"}
            loading={loading}
            dataSource={data || []}
            scroll={{x: 300, y: 420}}
            rowKey={(row)=>{return `${row.Timestamp}`}}
            expandable={props.mini ? undefined : {
                expandedRowRender: (r) => {
                    return <ExecHistoryViewer {...r}/>
                },
                expandRowByClick: true,
            }}
            pagination={{
                size: "small", simple: true,
                pageSize: pagination?.Limit || 10,
                showSizeChanger: !props.mini,
                total, showTotal: (i) => <Tag>共{i}条历史记录</Tag>,
                onChange(page: number, limit?: number): any {
                    update(page, limit)
                },
            }}
            columns={props.mini ? [
                {
                    title: "开始执行", width: 180,
                    render: (r: ExecHistoryRecord) => <Tag>{formatTimestamp(r.Timestamp)}</Tag>
                },
                {title: "耗时", render: (r: ExecHistoryRecord) => <Tag color={"geekblue"}>{r.DurationMs}ms</Tag>},
                {
                    title: "操作", fixed: "right", width: 60,
                    render: (r: ExecHistoryRecord) => <Button
                        type={"link"} size={"small"}
                        onClick={e => {
                            showDrawer({
                                title: `执行历史记录：${r.Params}`,
                                width: "70%",
                                content: <>
                                    <ExecHistoryViewer {...r}/>
                                </>
                            })
                        }}
                    >查看</Button>
                },
            ] : [
                {title: "时间戳", render: (r: ExecHistoryRecord) => <Tag>{formatTimestamp(r.Timestamp)}</Tag>},
                {
                    title: "参数", render: (r: ExecHistoryRecord) => r.Params ? <Text style={{width: 230}} ellipsis={{
                        tooltip: true,
                    }} copyable={true}
                    >{r.Params}</Text> : <Tag>无参数</Tag>
                },
                {
                    title: "状态",
                    render: (r: ExecHistoryRecord) => r.Ok ? <Tag color={"green"}>执行成功</Tag> : <Tag>执行失败</Tag>
                },
                {title: "执行间隔(ms)", render: (r: ExecHistoryRecord) => <Tag color={"geekblue"}>{r.DurationMs}ms</Tag>},
                {
                    title: "执行结果/失败原因", render: (r: ExecHistoryRecord) => r.Ok ? <Space>
                        {r.Stdout && <Tag color={"geekblue"}>标准输出内容长度[{(r.StdoutLen)}]</Tag>}
                        {r.Stderr && <Tag color={"orange"}>标准错误内容长度[{(r.StderrLen)}]</Tag>}
                        {!r.Stdout && !r.Stderr ? <Tag>无输出</Tag> : undefined}
                    </Space> : <Space>
                        <Tag color={"red"}>{r.Reason}</Tag>
                    </Space>
                },
            ]}
        />
    </div>
};