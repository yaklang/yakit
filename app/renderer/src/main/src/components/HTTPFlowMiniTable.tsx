import React, {useEffect, useState} from "react";
import {YakQueryHTTPFlowRequest} from "../utils/yakQueryHTTPFlow";
import {genDefaultPagination, QueryGeneralResponse} from "../pages/invoker/schema";
import {HTTPFlow, onExpandHTTPFlow, StatusCodeToColor} from "./HTTPFlowTable";
import * as antd from "antd";
import {Button, Space, Tag} from "antd";
import {BaseTable, features, useTablePipeline} from "../alibaba/ali-react-table-dist";
import {CopyableField} from "../utils/inputUtil";
import {showDrawer} from "../utils/showModal";
import ReactResizeDetector from "react-resize-detector";
import {useThrottleFn} from "ahooks";

const {ipcRenderer} = window.require("electron");

export interface HTTPFlowMiniTableProp {
    simple?: boolean
    autoUpdate?: boolean
    source: "crawler" | "mitm" | any
    filter: YakQueryHTTPFlowRequest
    onTotal: (total: number) => any
    onSendToWebFuzzer?: (isHttps: boolean, request: string) => any
}

export const HTTPFlowMiniTable: React.FC<HTTPFlowMiniTableProp> = (props) => {
    const [tableHeight, setTableHeight] = useState(400);
    const [response, setResponse] = useState<QueryGeneralResponse<HTTPFlow>>({
        Data: [],
        Pagination: genDefaultPagination(),
        Total: 0
    });
    const findHTTPFlowById = (Hash: string) => {
        return response.Data.filter(i => i.Hash === Hash).shift()
    }

    const pipeline = useTablePipeline({
        components: antd,
    }).input({
        dataSource: response.Data,
        columns: props.simple ? [
            {
                code: "Hash", name: "状态", render: (i: any) => {
                    const flow: HTTPFlow | undefined = findHTTPFlowById(i)

                    return <div style={{overflow: "hidden"}}>
                        {flow && <Space size={4}>
                            <div style={{width: 35, textAlign: "right"}}>{flow.Method}</div>
                            <Tag style={{
                                width: 30,
                                textAlign: "left",
                                paddingLeft: 3, paddingRight: 3,
                            }} color={StatusCodeToColor(flow.StatusCode)}>{flow.StatusCode}</Tag>
                        </Space>}
                    </div>
                },
                width: 100, lock: true,
            },
            {
                code: "Hash", name: "URL", render: (i: any) => {
                    const flow: HTTPFlow | undefined = findHTTPFlowById(i)

                    return <div style={{overflow: "hidden"}}>
                        {flow && <Space>
                            <CopyableField
                                text={flow.Url} tooltip={false} noCopy={true}
                            />
                        </Space>}
                    </div>
                },
                width: 700,
            },
            {
                code: "Hash", name: "操作", render: (i: any) => {
                    return <>
                        <Space>
                            {false && props.onSendToWebFuzzer && <Button
                                type={"link"} size={"small"}
                                onClick={() => {
                                    const req = findHTTPFlowById(i);
                                    if (props.onSendToWebFuzzer && req) {
                                        props.onSendToWebFuzzer(req.IsHTTPS, new Buffer(req.Request).toString())
                                    }
                                }}
                            >发送到Fuzzer</Button>}
                            <Button
                                type={"link"} size={"small"}
                                onClick={() => {
                                    let m = showDrawer({
                                        width: "80%",
                                        content: onExpandHTTPFlow(
                                            findHTTPFlowById(i),
                                            (req: Uint8Array, isHttps: boolean) => {
                                                if (props.onSendToWebFuzzer) {
                                                    props.onSendToWebFuzzer(isHttps, new Buffer(req).toString())
                                                    m.destroy()
                                                }
                                            }),
                                    })
                                }}
                            >详情</Button>
                        </Space>
                    </>
                },
                width: props.onSendToWebFuzzer ? 150 : 80, lock: true,
            }
        ] : [
            {
                code: "Method", name: "Method",
                render: (i: any) => <Tag color={"geekblue"}>{i}</Tag>,
                width: 80,
            },
            {
                code: "StatusCode",
                name: "StatusCode",
                render: (i: any) => <Tag color={StatusCodeToColor(i)}>{i}</Tag>,
                width: 80
            },
            {
                code: "GetParamsTotal",
                name: "Get 参数",
                render: (i: any) => i > 0 ? <Tag color={"orange"}>{i}个</Tag> : "-",
                width: 60
            },
            {
                code: "PostParamsTotal",
                name: "Post 参数",
                render: (i: any) => i > 0 ? <Tag color={"orange"}>{i}个</Tag> : "-",
                width: 60, lock: true,
            },
            {
                code: "Url", name: "URL", render: (i: any) => <CopyableField
                    text={i} tooltip={false} noCopy={true}
                />,
                width: 450, features: {sortable: true}
            },
            {
                code: "Hash", name: "操作", render: (i: any) => {
                    return <>
                        <Space>
                            {props.onSendToWebFuzzer && <Button
                                type={"link"} size={"small"}
                                onClick={() => {
                                    const req = findHTTPFlowById(i);
                                    if (props.onSendToWebFuzzer && req) {
                                        props.onSendToWebFuzzer(req.IsHTTPS, new Buffer(req.Request).toString())
                                    }
                                }}
                            >发送到Fuzzer</Button>}
                            <Button
                                type={"link"} size={"small"}
                                onClick={() => {
                                    let m = showDrawer({
                                        width: "80%",
                                        content: onExpandHTTPFlow(findHTTPFlowById(i), (req: Uint8Array, isHttps: boolean) => {
                                            if (props.onSendToWebFuzzer) {
                                                props.onSendToWebFuzzer(isHttps, new Buffer(req).toString())
                                                m.destroy()
                                            }

                                        })
                                    })
                                }}
                            >详情</Button>
                        </Space>
                    </>
                },
                width: props.onSendToWebFuzzer ? 180 : 80, lock: true,
            },
        ],
    }).primaryKey("uuid").use(features.columnResize({
        minSize: 60,
    })).use(features.columnHover()).use(features.tips())

    if (!props.simple) {
        pipeline.use(
            features.sort({
                mode: 'single',
                highlightColumnWhenActive: true,
            }),
        )
    }


    const update = () => {
        ipcRenderer.invoke("QueryHTTPFlows", props.filter).then((data: QueryGeneralResponse<HTTPFlow>) => {
            // if ((data.Data || []).length > 0 && (response.Data || []).length > 0) {
            //     if (data.Data[0].Id === response.Data[0].Id) {
            //         props.onTotal(data.Total)
            //         return
            //     }
            // }
            setResponse(data)
            props.onTotal(data.Total)
        })
    }
    const updateThrottle = useThrottleFn(update, {wait: 1000})


    useEffect(() => {
        updateThrottle.run()
    }, [props.filter])

    useEffect(() => {
        if (props.simple) {

            if (!props.autoUpdate) {
                return
            }
            const id = setInterval(() => {
                updateThrottle.run()
            }, 1000)
            return () => {
                clearInterval(id)
            }
        }
    }, [props.simple, props.autoUpdate])

    return <div style={{width: "100%", height: "100%", overflow: "auto"}}>
        <ReactResizeDetector
            onResize={(width, height) => {
                if (!width || !height) {
                    return
                }
                setTableHeight(height)
            }}
            handleWidth={true} handleHeight={true} refreshMode={"debounce"} refreshRate={50}
        />
        <BaseTable
            {...pipeline.getProps()} style={{width: "100%", height: tableHeight, overflow: "auto"}}
        />
    </div>
};