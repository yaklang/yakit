import React, {useEffect, useState} from "react";
import {
    Button,
    Form,
    Menu,
    PageHeader,
    PaginationProps, Popconfirm,
    Popover, Select,
    Space,
    Table,
    Tag,
    Typography
} from "antd";
import {yakQueryHTTPFlow, YakQueryHTTPFlowRequest} from "../utils/yakQueryHTTPFlow";
import {showByCursorContainer} from "../utils/showByCursor";
import {showDrawer, showModal} from "../utils/showModal";
import {AnalyzerPage} from "../pages/analyzer/AnalyzerPage";
import {Uint8ArrayToString} from "../utils/convertor";
import {PaginationSchema} from "../pages/invoker/schema";
import {ColumnsType} from "antd/lib/table";
import {formatTimestamp} from "../utils/timeUtil";
import {FuzzerResponse} from "../pages/fuzzer/HTTPFuzzerPage";
import {ReloadOutlined, SearchOutlined} from "@ant-design/icons";
import {InputItem, ManyMultiSelectForString, SwitchItem} from "../utils/inputUtil";
import {SorterResult} from "antd/lib/table/interface";
import {HTTPFlowDetail, SendToFuzzerFunc} from "./HTTPFlowDetail";
import {failed, info} from "../utils/notification";

const {ipcRenderer} = window.require("electron");
const {Text} = Typography;

export interface HTTPHeaderItem {
    Header: string,
    Value: string
}

export interface HTTPFlow {
    Method: string
    Path: string
    Hash: string
    IsHTTPS: boolean
    Url: string
    Request: Uint8Array
    Response: Uint8Array
    StatusCode: number
    BodyLength: number
    BodySizeVerbose?: string
    ContentType: string
    SourceType: string
    RequestHeader: HTTPHeaderItem[]
    ResponseHeader: HTTPHeaderItem[]
    GetParamsTotal: number
    PostParamsTotal: number
    CookieParamsTotal: number
    CreatedAt: number
    UpdatedAt: number

    GetParams: FuzzableParams[]
    PostParams: FuzzableParams[]
    CookieParams: FuzzableParams[]
}

export interface FuzzableParams {
    Position: string;
    ParamName: string
    OriginValue: Uint8Array
    AutoTemplate: Uint8Array
    IsHTTPS: boolean;
}

export interface TableFilterDropdownStringProp<T> {
    label: string
    pureBool?: boolean
    autoCompletions?: string[]
    pureString?: boolean
    filterName: string
    params?: T
    setParams?: (y: T) => any

    // from parentcotnext
    confirm?: any
    setSelectedKeys?: (keys: React.Key[]) => any
}

export type FilterDropdownStringProp = TableFilterDropdownStringProp<YakQueryHTTPFlowRequest>;

export const TableFilterDropdownForm: React.FC<TableFilterDropdownStringProp<any>> = (props: TableFilterDropdownStringProp<any>) => {
    return <HTTLFlowFilterDropdownForm {...props} />
};

export const HTTLFlowFilterDropdownForm: React.FC<FilterDropdownStringProp> = (props) => {
    const {params, setParams, setSelectedKeys} = props;
    return <div style={{padding: 8}}>
        <Form size={"small"} onSubmitCapture={e => {
            e.preventDefault()

            if (setSelectedKeys) {
                // @ts-ignore
                if (params[props.filterName]) {
                    // @ts-ignore
                    setSelectedKeys([`${props.filterName}: ${JSON.stringify(params ? {result: params[props.filterName]} : {})}`])
                } else {
                    setSelectedKeys([])
                }
            }
            if (props.confirm) {
                props.confirm();
            }
        }}>
            {props.pureBool ? <>
                <SwitchItem
                    formItemStyle={{marginBottom: 4}}
                    label={props.label}
                    // @ts-ignore
                    value={params[props.filterName]}
                    setValue={e => {
                        if (params && setParams) {
                            const newParams = {...params};
                            // @ts-ignore
                            newParams[props.filterName] = e
                            setParams(newParams)
                        }
                    }}
                />
            </> : <>{
                props.pureString ? <InputItem
                    style={{marginBottom: 4}}
                    label={props.label}
                    // @ts-ignore
                    value={params[props.filterName]}
                    setValue={e => {
                        if (params && setParams) {
                            const newParams = {...params};
                            // @ts-ignore
                            newParams[props.filterName] = e
                            setParams(newParams)
                        }
                    }}
                /> : <ManyMultiSelectForString
                    mode={"tags"}
                    formItemStyle={{marginBottom: 4}}
                    label={props.label}
                    data={(props.autoCompletions || []).map(i => {
                        return {value: i, label: i}
                    })}
                    // @ts-ignore
                    value={params[props.filterName]}
                    setValue={e => {
                        if (e === "") {
                            if (setSelectedKeys) {
                                setSelectedKeys([])
                            }
                        }
                        if (params && setParams) {
                            const newParams = {...params};
                            // @ts-ignore
                            newParams[props.filterName] = e
                            setParams(newParams)
                        }
                    }}
                />
            }</>}
            <Form.Item style={{marginBottom: 0, marginTop: 0}} colon={false} label={" "}>
                <Space>
                    <Button type="primary" htmlType="submit"> 设置搜索条件 </Button>
                    <Button onClick={() => {
                        setSelectedKeys && setSelectedKeys([])
                        if (params && setParams) {
                            const newParams = {...params};
                            // @ts-ignore
                            newParams[props.filterName] = ""
                            setParams(newParams)
                        }
                    }}> 重置搜索 </Button>
                </Space>
            </Form.Item>
        </Form>
    </div>
};

export const onExpandHTTPFlow = (flow: HTTPFlow, onSendToFuzzer?: SendToFuzzerFunc) => {
    return <div style={{width: "100%"}}>
        <HTTPFlowDetail hash={flow.Hash} onSendToFuzzer={onSendToFuzzer}/>
    </div>
}

export const HTTPFlowColumns = (
    props: HTTPFlowTableProp, params?: YakQueryHTTPFlowRequest, setParams?: (p: YakQueryHTTPFlowRequest) => any,
    mini?: boolean,
): ColumnsType<HTTPFlow> => mini ? [
    // {
    //     fixed: "left", defaultSortOrder: "descend", key: "updated_at",
    //     sorter: params && setParams && true,
    //     title: "请求时间", render: (i: HTTPFlow) => <Tag>{formatTimestamp(i.UpdatedAt)}</Tag>, width: 60
    // },
    {
        title: "URL", render: (i: HTTPFlow) => {
            return <div style={{overflow: "auto"}}>
                <Space size={0}>
                    <Tag color={"geekblue"}>{i.Method}</Tag>
                    <Tag color={StatusCodeToColor(i.StatusCode)}>{i.StatusCode}</Tag>
                    <Text
                        style={{width: 320}}
                        copyable={true}
                        ellipsis={{tooltip: true,}}
                    >{i.Url}</Text>
                </Space>
            </div>
        }, width: 400, fixed: "left",
        filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
            return params && setParams && <HTTLFlowFilterDropdownForm
                label={"搜索URL关键字"} params={params} setParams={setParams}
                filterName={"SearchURL"} pureString={true}
                confirm={confirm} setSelectedKeys={setSelectedKeys}
            />
        },
        filterIcon: filtered => {
            return params && setParams && <SearchOutlined style={{color: filtered ? '#1890ff' : undefined}}/>
        },
    },
    {
        fixed: "right", width: 90,
        title: "操作", render: (record: HTTPFlow) => <>
            <Popover trigger={"click"} content={<>
                <Space direction={"vertical"}>
                    <Button size={"small"} type={"primary"} onClick={e => {
                        if (props.onSendToWebFuzzer) props.onSendToWebFuzzer(record.IsHTTPS, new Buffer(record.Request).toString("utf8"))
                    }}>发送到 Fuzzer</Button>
                    <Button size={"small"} type={"primary"} onClick={e => {
                        showDrawer({
                            width: "80%",
                            content: onExpandHTTPFlow(record, (req: Uint8Array, isHttps: boolean) => {
                                if (props.onSendToWebFuzzer) props.onSendToWebFuzzer(isHttps, new Buffer(req).toString());
                            })
                        })
                    }}>查看详情</Button>
                </Space>
            </>}>
                <Button size={"small"} type={"primary"}>操作详情</Button>
            </Popover>
        </>
    },
] : [
    {
        fixed: "left", defaultSortOrder: "descend", key: "updated_at",
        sorter: params && setParams && true,
        title: "请求时间", render: (i: HTTPFlow) => <Tag>{formatTimestamp(i.UpdatedAt)}</Tag>, width: 60
    },
    {
        fixed: "left",
        filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
            return params && setParams && <HTTLFlowFilterDropdownForm
                label={"搜索方法"} params={params} setParams={setParams}
                filterName={"Methods"} autoCompletions={["GET", "POST", "HEAD"]}
                confirm={confirm} setSelectedKeys={setSelectedKeys}
            />
        },
        filterIcon: filtered => {
            return params && setParams && <SearchOutlined style={{color: filtered ? '#1890ff' : undefined}}/>
        },
        title: "方法", render: (i: HTTPFlow) => <Tag color={"geekblue"}>{i.Method}</Tag>, width: 60
    },
    {
        title: "状态码", width: 80, fixed: "left",
        filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
            return params && setParams && <HTTLFlowFilterDropdownForm
                label={"搜索状态码"} params={params} setParams={setParams}
                filterName={"StatusCode"} autoCompletions={[
                "200", "300-305", "400-404", "500-502",
                "200-299", "300-399", "400-499"]}
                confirm={confirm} setSelectedKeys={setSelectedKeys}
            />
        },
        filterIcon: filtered => {
            return params && setParams && <SearchOutlined style={{color: filtered ? '#1890ff' : undefined}}/>
        },
        render: (i: HTTPFlow) => <Tag color={StatusCodeToColor(i.StatusCode)}>{i.StatusCode}</Tag>
    },
    {
        title: "URL", render: (i: HTTPFlow) => {
            return <div style={{overflow: "auto"}}>
                <Space>
                    <Text
                        style={{width: 400}}
                        copyable={true}
                        ellipsis={{tooltip: true,}}
                    >{i.Url}</Text>
                </Space>
            </div>
        }, width: 400,
        filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
            return params && setParams && <HTTLFlowFilterDropdownForm
                label={"搜索URL关键字"} params={params} setParams={setParams}
                filterName={"SearchURL"} pureString={true}
                confirm={confirm} setSelectedKeys={setSelectedKeys}
            />
        },
        filterIcon: filtered => {
            return params && setParams && <SearchOutlined style={{color: filtered ? '#1890ff' : undefined}}/>
        },
    },
    {
        title: "URL 长度", render: (i: HTTPFlow) => {
            const len = (i.Url || "").length;
            return len > 0 && <Tag>{len}</Tag>
        },
    },
    {
        title: "参数", render: (i: HTTPFlow) => {
            return <Space direction={"vertical"}>
                {i.GetParamsTotal > 0 && <Tag color={"geekblue"}>{i.GetParamsTotal}个Get参数</Tag>}
                {i.PostParamsTotal > 0 && <Tag color={"blue"}>{i.PostParamsTotal}个Post参数</Tag>}
                {i.CookieParamsTotal > 0 && <Tag>{i.CookieParamsTotal}个Cookie参数</Tag>}
            </Space>
        },
        filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
            return params && setParams && <HTTLFlowFilterDropdownForm
                label={"过滤是否存在基础参数"} params={params} setParams={setParams}
                filterName={"HaveCommonParams"} pureBool={true}
                confirm={confirm} setSelectedKeys={setSelectedKeys}
            />
        },
    },
    {
        title: "响应长度", sorter: params && setParams && true, key: "body_length",
        render: (i: HTTPFlow) => <Tag>{i.BodySizeVerbose ? i.BodySizeVerbose : i.BodyLength}</Tag>,
        filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
            return params && setParams && <HTTLFlowFilterDropdownForm
                label={"是否存在Body？"} params={params} setParams={setParams}
                filterName={"HaveBody"} pureBool={true}
                confirm={confirm} setSelectedKeys={setSelectedKeys}
            />
        },
    },
    {title: "响应类型", render: (i: HTTPFlow) => <Tag>{i.ContentType}</Tag>},
    {
        fixed: "right",
        title: "操作", render: (record: HTTPFlow) => <Space>
            <Button size={"small"} type={"primary"} onClick={e => {
                if (props.onSendToWebFuzzer) props.onSendToWebFuzzer(record.IsHTTPS, new Buffer(record.Request).toString("utf8"))
            }}>发送到 Fuzzer</Button>
            <Button size={"small"} type={"primary"} onClick={e => {
                showDrawer({
                    width: "80%",
                    content: onExpandHTTPFlow(record, (req: Uint8Array, isHttps: boolean) => {
                        if (props.onSendToWebFuzzer) props.onSendToWebFuzzer(isHttps, new Buffer(req).toString());
                    })
                })
            }}>分析参数</Button>
        </Space>
    },
]

export interface HTTPFlowTableProp {
    onSendToWebFuzzer?: (isHttps: boolean, request: string) => any
    mini?: boolean
}

export const StatusCodeToColor = (code: number) => {
    if (code >= 400) {
        return "red"
    } else if (code < 400 && code >= 300) {
        return "orange"
    } else {
        return "green"
    }
};

export const LogLevelToCode = (level: string) => {
    switch (level.toLowerCase()) {
        case "info":
        case "information":
            return "blue";
        case "debug":
            return "gray"
        case "finished":
        case "success":
            return "green"
        case "fatal":
        case "error":
        case "panic":
        case "err":
            return "red";
        case "warning":
        case "warn":
            return "orange"
        default:
            return "blue"
    }
}

export const HTTPFlowTable: React.FC<HTTPFlowTableProp> = (props) => {
    const [data, setData] = useState<HTTPFlow[]>([]);
    const [params, setParams] = useState<YakQueryHTTPFlowRequest>({SourceType: "mitm"});
    const [pagination, setPagination] = useState<PaginationSchema>({
        Limit: 20,
        Order: "desc",
        OrderBy: "updated_at",
        Page: 1
    });
    const [total, setTotal] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    const update = (page?: number, limit?: number, order?: string, orderBy?: string, sourceType?: string) => {
        const paginationProps = {
            Page: page || 1,
            Limit: limit || pagination.Limit,
            Order: order === "ascend" ? "asc" : "desc",
            OrderBy: orderBy || "updated_at",
        };
        setLoading(true)
        yakQueryHTTPFlow({
            SourceType: sourceType, ...params,
            Pagination: {...paginationProps},
        })
    }

    useEffect(() => {
        ipcRenderer.on("client-query-http-flows-response", (e, rsp: {
            Data: HTTPFlow[],
            Total: number,
            Pagination: PaginationSchema,
        }) => {
            setLoading(false)
            setData(rsp.Data)
            setPagination(rsp.Pagination)
            setTotal(rsp.Total)
        })
        ipcRenderer.on("client-query-http-flows-error", (e, rsp: string) => {
            setLoading(false)
            failed("Query HTTPFlows failed: " + rsp)
        })

        update()
        return () => {
            ipcRenderer.removeAllListeners("client-query-http-flows-response")
        }
    }, [])

    return <div>
        <PageHeader
            title={"HTTP History"}
            subTitle={<Space>
                {"所有相关请求都在这里"}
                <Button icon={<ReloadOutlined/>} type={"link"}
                        onClick={e => {
                            update(1)
                        }}/>
            </Space>}
            extra={[
                <Space>
                    <Form.Item label={"选择 HTTP History 类型"} style={{marginBottom: 0}}>
                        <Select
                            mode={"multiple"} value={params.SourceType} style={{minWidth: 200}}
                            onChange={e => {
                                setParams({...params, SourceType: e})
                                setLoading(true)
                                setTimeout(() => {
                                    update(1, undefined, undefined, undefined, e)
                                }, 200)
                            }}

                        >
                            <Select.Option value={"mitm"}>mitm: 中间人劫持</Select.Option>
                            <Select.Option value={"fuzzer"}>fuzzer: 模糊测试分析</Select.Option>
                        </Select>
                    </Form.Item>
                    <Popconfirm
                        title={"确定想要删除所有记录吗？不可恢复"}
                        onConfirm={e => {
                            ipcRenderer.invoke("delete-http-flows-all")
                            setLoading(true)
                            info("正在删除...如自动刷新失败请手动刷新")
                            setTimeout(() => {
                                update(1)
                            }, 400)
                        }}
                    >
                        <Button danger={true}>
                            清除全部历史记录？
                        </Button>
                    </Popconfirm>
                </Space>
            ]}
        />
        <Table
            size={"small"} loading={loading}
            rowKey={"Hash"}
            pagination={{
                size: "small",
                pageSize: pagination?.Limit || 10,
                total, showTotal: (i) => <Tag>共{i}条历史记录</Tag>,
                // onChange(page: number, limit?: number): any {
                //     update(page, limit)
                // },
            }}
            // @ts-ignore*/
            onChange={(paging: any, _: any, sorter: SorterResult<HTTPFlow>) => {
                if (sorter.order && sorter.columnKey) {
                    update(paging.current, paging.pageSize, sorter.order, `${sorter.columnKey}`)
                } else {
                    update(paging.current, paging.pageSize)
                }

            }}
            columns={HTTPFlowColumns(props, params, setParams, props.mini)}
            dataSource={data}
        >

        </Table>
    </div>
};

export interface HTTPFlowLiveTableProp extends HTTPFlowTableProp {
    data: HTTPFlow[]
    limit?: number
}

export const HTTPFlowLiveTable: React.FC<HTTPFlowLiveTableProp> = (props) => {

    //
    // // 去重
    // let hashMap = new Map();
    // (props.data || []).forEach(e => {
    //     if (e) {
    //         hashMap.set(e.Hash, e)
    //     }
    // });
    // const newData: HTTPFlow[] = []
    // hashMap.forEach((e: HTTPFlow) => {
    //     newData.push(e)
    // })

    return <div style={{marginTop: 8}}>
        <Table
            scroll={{y: 480, x: 400}}
            size={"small"} bordered={true}
            pagination={false} rowKey={"Hash"}
            columns={HTTPFlowColumns(props, undefined, undefined, true)}
            dataSource={(props.data || []).sort((a, b) => b.UpdatedAt - a.UpdatedAt)}
        >

        </Table>
    </div>
};