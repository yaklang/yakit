import React, {useEffect, useRef, useState} from "react";
import {YakQueryHTTPFlowRequest} from "../utils/yakQueryHTTPFlow";
import {genDefaultPagination, QueryGeneralResponse} from "../pages/invoker/schema";
import {HTTPFlow, onExpandHTTPFlow, StatusCodeToColor} from "./HTTPFlowTable/HTTPFlowTable";
// import * as antd from "antd";
import {Button, Space, Tag,Tooltip} from "antd";
import {BaseTable, features, useTablePipeline} from "../alibaba/ali-react-table-dist";
import {CopyableField} from "../utils/inputUtil";
import {showDrawer} from "../utils/showModal";
import ReactResizeDetector from "react-resize-detector";
import {useDebounceFn, useInViewport, useThrottleFn} from "ahooks";
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces";

const {ipcRenderer} = window.require("electron");

export interface HTTPFlowMiniTableProp {
    simple?: boolean
    autoUpdate?: boolean
    source: "crawler" | "mitm" | any
    filter: YakQueryHTTPFlowRequest
    onTotal: (total: number) => any
    onSendToWebFuzzer?: (isHttps: boolean, request: string) => any
    downstreamProxyStr?: string
}

export const HTTPFlowMiniTable: React.FC<HTTPFlowMiniTableProp> = React.memo((props) => {
    const {t} = useI18nNamespaces(["history"])
    const [tableHeight, setTableHeight] = useState(400);
    const [response, setResponse] = useState<QueryGeneralResponse<HTTPFlow>>({
        Data: [],
        Pagination: genDefaultPagination(),
        Total: 0
    });
    const findHTTPFlowById = (Hash: string) => {
        return response.Data.filter(i => i.Hash === Hash).shift()
    };

    const ref = useRef(null);
    const [inViewport] = useInViewport(ref);

    const pipeline = useTablePipeline({
        components: {
            'Tooltip':Tooltip
        },
    }).input({
        dataSource: response.Data,
        columns: props.simple ? [
            {
                code: "Hash", name: t("HTTPFlowMiniTable.id"), render: (i: any) => {
                    const flow: HTTPFlow | undefined = findHTTPFlowById(i)

                    return <div style={{overflow: "hidden"}}>
                        {flow?.Id}
                    </div>
                },
                width: 60, lock: true,
            },
            {
                code: "Hash", name: t("HTTPFlowMiniTable.method"), render: (i: any) => {
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
                code: "Hash", name: t("HTTPFlowMiniTable.bodyLength"), render: (i: any) => {
                    const flow: HTTPFlow | undefined = findHTTPFlowById(i)

                    return <div style={{overflow: "hidden"}}>
                        {flow?.BodySizeVerbose}
                    </div>
                },
                width: 100, lock: true,
            },
            {
                code: "Hash", name: t("HTTPFlowMiniTable.actions"), render: (i: any) => {
                    return <>
                        <Space>
                            <Button
                                type={"link"} size={"small"}
                                onClick={() => {
                                    let m = showDrawer({
                                        width: "80%",
                                        content: onExpandHTTPFlow(
                                            findHTTPFlowById(i),
                                            () => m.destroy(),
                                            props.downstreamProxyStr || ""
                                        ),
                                        bodyStyle: {paddingTop: 5}
                                    })
                                }}
                            >{t("HTTPFlowMiniTable.details")}</Button>
                        </Space>
                    </>
                },
                width: 80, lock: true,
            }
        ] : [
            {
                code: "Method", name: "Method",
                render: (i: any) => <Tag color={"geekblue"}>{i}</Tag>,
                width: 80,
            },
            {
                code: "StatusCode",
                name: t("HTTPFlowMiniTable.status"),
                render: (i: any) => <Tag color={StatusCodeToColor(i)}>{i}</Tag>,
                width: 80
            },
            {
                code: "GetParamsTotal",
                name: t("HTTPFlowMiniTable.getParams"),
                render: (i: any) => i > 0 ? <Tag color={"orange"}>{i}</Tag> : "-",
                width: 60
            },
            {
                code: "PostParamsTotal",
                name: t("HTTPFlowMiniTable.postParams"),
                render: (i: any) => i > 0 ? <Tag color={"orange"}>{i}</Tag> : "-",
                width: 60, lock: true,
            },
            {
                code: "Url", name: "URL", render: (i: any) => <CopyableField
                    text={i} tooltip={false} noCopy={true}
                />,
                width: 450, features: {sortable: true}
            },
            {
                code: "Hash", name: t("HTTPFlowMiniTable.actions"), render: (i: any) => {
                    return <>
                        <Space>
                            {props.onSendToWebFuzzer && <Button
                                type={"link"} size={"small"}
                                onClick={() => {
                                    const req = findHTTPFlowById(i);
                                    if (req) {
                                        ipcRenderer.invoke("send-to-tab", {
                                            type: "fuzzer",
                                            data: {
                                                isHttps: req.IsHTTPS,
                                                request: new Buffer(req.Request).toString()
                                            }
                                        })
                                    }
                                }}
                            >{t("HTTPFlowMiniTable.sendToWebFuzzer")}</Button>}
                            <Button
                                type={"link"} size={"small"}
                                onClick={() => {
                                    let m = showDrawer({
                                        width: "80%",
                                        content: onExpandHTTPFlow(
                                            findHTTPFlowById(i),
                                            () => m.destroy(),
                                            props.downstreamProxyStr || ""
                                        ),
                                        bodyStyle: {paddingTop: 5}
                                    })
                                }}
                            >{t("HTTPFlowMiniTable.details")}</Button>
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
        if (!inViewport) {
            return
        }
        ipcRenderer.invoke("QueryHTTPFlows", {...props.filter}).then((data: QueryGeneralResponse<HTTPFlow>) => {
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
    const updateThrottle = useDebounceFn(update, {leading: true, wait: 200})

    useEffect(() => {
        updateThrottle.run()
    }, [props.filter])

    useEffect(() => {
        if (props.simple) {
            if (!props.autoUpdate) {
                return
            }
            updateThrottle.run()
            const id = setInterval(() => {
                updateThrottle.run()
            }, 1000)
            return () => {
                clearInterval(id)
            }
        }
    }, [props.simple, props.autoUpdate])

    return <div style={{width: "100%", height: "100%", overflow: "auto"}} ref={ref}>
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
});
