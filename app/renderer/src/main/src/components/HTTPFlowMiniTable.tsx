import React, {useEffect, useState} from "react";
import {YakQueryHTTPFlowRequest} from "../utils/yakQueryHTTPFlow";
import {genDefaultPagination, QueryGeneralResponse} from "../pages/invoker/schema";
import {HTTPFlow, onExpandHTTPFlow, StatusCodeToColor} from "./HTTPFlowTable";
import * as antd from "antd";
import {Button, Space, Tag} from "antd";
import {BaseTable, features, useTablePipeline} from "../alibaba/ali-react-table-dist";
import {CopyableField} from "../utils/inputUtil";
import {showDrawer} from "../utils/showModal";

export interface HTTPFlowMiniTableProp {
    source: "crawler" | "mini" | any
    filter: YakQueryHTTPFlowRequest
    onTotal: (total: number) => any
    onSendToWebFuzzer?: (isHttps: boolean, request: string) => any
}

const {ipcRenderer} = window.require("electron");

export const HTTPFlowMiniTable: React.FC<HTTPFlowMiniTableProp> = (props) => {
    const [response, setResponse] = useState<QueryGeneralResponse<HTTPFlow>>({
        Data: [],
        Pagination: genDefaultPagination(),
        Total: 0
    });
    const pipeline = useTablePipeline({
        components: antd,
    }).input({
        dataSource: response.Data,
        columns: [
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
                width: props.onSendToWebFuzzer ? 150 : 80, lock: true,
            },
        ],
    }).primaryKey("uuid").use(features.columnResize({
        minSize: 60,
    })).use(
        features.sort({
            mode: 'single',
            highlightColumnWhenActive: true,
        }),
    ).use(features.columnHover()).use(features.tips())
    const findHTTPFlowById = (Hash: string) => {
        return response.Data.filter(i => i.Hash === Hash).shift()
    }
    const update = () => {
        ipcRenderer.invoke("QueryHTTPFlows", props.filter).then((data: QueryGeneralResponse<HTTPFlow>) => {
            setResponse(data)
            props.onTotal(data.Total)
        })
    }
    useEffect(() => {
        update()
    }, [props.filter])

    return <div style={{width: "100%"}}>
        <BaseTable
            {...pipeline.getProps()} style={{width: "100%", height: "100%", overflow: "auto"}}
        />
    </div>
};