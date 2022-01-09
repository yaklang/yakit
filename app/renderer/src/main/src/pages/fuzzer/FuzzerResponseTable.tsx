import React, {useState} from "react";
import {BaseTable, features, useTablePipeline} from "../../alibaba/ali-react-table-dist";
import {analyzeFuzzerResponse, FuzzerResponse} from "./HTTPFuzzerPage";
import {Button, Space, Table, Tag, Tooltip, Typography} from "antd";
import {formatTimestamp} from "../../utils/timeUtil";
import * as  antd from "antd";
import {DurationMsToColor, StatusCodeToColor} from "../../components/HTTPFlowTable";
import {divider} from "@uiw/react-md-editor";
import {CopyableField} from "../../utils/inputUtil";
import ReactResizeDetector from "react-resize-detector";

export interface FuzzerResponseTableProp {
    content: FuzzerResponse[]
    setRequest: (s: string | any) => any
    success?: boolean
}

const {Text} = Typography;

export const FuzzerResponseTable: React.FC<FuzzerResponseTableProp> = (props) => {
    const {content, setRequest} = props;

    return <>
        <Table<FuzzerResponse>
            size={"small"}
            scroll={{y: 500, x: 600}}
            rowKey={"uuid"}
            bordered={true}
            columns={[
                {
                    title: "Method",
                    width: 78,
                    fixed: "left",
                    sorter: (a: FuzzerResponse, b: FuzzerResponse) => a.Method.localeCompare(b.Method),
                    render: (i: FuzzerResponse) => <div>{i.Method}</div>
                },
                {
                    title: "访问状态", width: 80,
                    fixed: "left",
                    sorter: (a: FuzzerResponse, b: FuzzerResponse) => a.StatusCode - b.StatusCode,
                    render: (i: FuzzerResponse) => {
                        return <div>{i.Ok ?
                            <Tag color={"geekblue"}>{i.StatusCode}</Tag> : <Tooltip title={i.Reason}>
                                <Tag color={"red"}>
                                    失败
                                </Tag>
                            </Tooltip>}</div>
                    }
                },
                {
                    title: "Body 长度", width: 85,
                    sorter: (a: FuzzerResponse, b: FuzzerResponse) => a.BodyLength - b.BodyLength,
                    render: (i: FuzzerResponse) => {
                        return <div>{i.Ok ? i.BodyLength : ""}</div>
                    }
                },
                {
                    title: "延迟(ms)", width: 80,
                    sorter: (a: FuzzerResponse, b: FuzzerResponse) => a.DurationMs - b.DurationMs,
                    render: (i: FuzzerResponse) => {
                        if (!i.Ok) {
                            return ""
                        }
                        return <div>{i.DurationMs &&
                        <Tag>{i.DurationMs}ms</Tag>}</div>
                    }
                },
                {
                    title: "Content-Type / 失败原因", width: 200,
                    render: (i: FuzzerResponse) => <Text
                        ellipsis={{tooltip: true}}
                        style={{width: 200, color: i.Ok ? undefined : "red"}}
                    >{i.Ok ? i.ContentType : i.Reason}</Text>
                },
                {
                    title: "请求时间", fixed: "right", width: 165,
                    sorter: (a: FuzzerResponse, b: FuzzerResponse) => a.Timestamp - b.Timestamp,
                    render: (i: FuzzerResponse) => <Tag>{formatTimestamp(i.Timestamp)}</Tag>
                },
                {
                    title: "操作", fixed: "right", width: 80,
                    render: (i: FuzzerResponse) => <Button
                        size={"small"} type={"primary"}
                        onClick={() => {
                            analyzeFuzzerResponse(i, setRequest)
                        }}
                    >分析详情</Button>
                },
            ]}
            dataSource={content.reverse() || []}
            pagination={false}
        />
    </>
};

const sortAsNumber = (a: any, b: any) => parseInt(a) > parseInt(b)

export const FuzzerResponseTableEx: React.FC<FuzzerResponseTableProp> = (props) => {
    const {content, setRequest} = props;
    const [tableHeight, setTableHeight] = useState(0);
    const pipeline = useTablePipeline({
        components: antd, primaryKey: (raw: FuzzerResponse)=>{
            return raw.UUID
        }
    }).input({
        dataSource: content,
        columns: props.success ? [
            {
                name: "Method", code: "Method", width: 100, features: {
                    sortable: true,
                }
            },
            {
                name: "StatusCode", code: "StatusCode", features: {
                    sortable: sortAsNumber,
                },
                render: v => <Tag color={StatusCodeToColor(v)}>{`${v}`}</Tag>, width: 100,
            },
            {
                name: "响应包大小",
                code: "BodyLength",
                render: v => <div
                    style={{
                        overflow: "auto",
                    }}>
                    <Tag>{`${v}`}</Tag>
                </div>,
                features: {
                    sortable: sortAsNumber,
                },
                width: 100,
            },
            {
                name: "Payloads",
                code: "Payloads",
                render: (value: any, row: any, rowIndex: number) => {
                    return `${value}`
                }, width: 300,
            },
            {
                name: "延迟(ms)",
                code: "DurationMs",
                render: (value: any, row: any, rowIndex: number) => {
                    return value
                }, width: 100,
                features: {
                    sortable: sortAsNumber
                },
            },
            {
                name: "Content-Type",
                code: "ContentType",
                render: (value: any, row: any, rowIndex: number) => {
                    return value
                }, width: 300,
            },
            {
                name: "操作", code: "UUID", render: (v) => {
                    return <Space direction={"vertical"}>
                        <Button size={"small"} type={"primary"} onClick={() => {
                            const res = content.filter(i => i.UUID === v);
                            if ((res || []).length > 0) {
                                analyzeFuzzerResponse(res[0], setRequest)
                            }
                        }}>请求详情</Button>
                    </Space>
                }, width: 100, lock: true, features: {sortable: sortAsNumber}
            }
        ] : [
            {
                name: "Method", code: "Method", width: 60, features: {
                    sortable: true,
                }
            },
            {
                name: "失败原因", code: "Reason", render: (v) => {
                    return v ? <CopyableField style={{color: "red"}} noCopy={true} text={v}/> : "-"
                }, features: {
                    tips: <>
                        如果请求失败才会有内容~
                    </>
                }
            }
        ],
    }).primaryKey("UUID").use(features.columnResize({
        minSize: 60,
    })).use(
        features.sort({
            mode: 'single',
            highlightColumnWhenActive: true,
        }),
    ).use(features.columnHover()).use(features.tips())

    return <div style={{width: "100%", height: "100%", overflow: "hidden"}}>
        <ReactResizeDetector
            onResize={(width, height) => {
                if (!width || !height) {
                    return
                }
                setTableHeight(height)
            }}
            handleWidth={true} handleHeight={true} refreshMode={"debounce"} refreshRate={50}
        />
        <BaseTable {...pipeline.getProps()} style={{width: "100%", height: tableHeight, overflow: "auto"}}/>
    </div>
};
