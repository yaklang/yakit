import React, {useEffect, useState, useRef} from "react"
import {
    Button,
    Card,
    Col,
    Descriptions,
    Form,
    Modal,
    Popover,
    Row,
    Space,
    Table,
    Tag,
    Typography,
    Popconfirm,
    Tooltip
} from "antd"
import {PaginationSchema, QueryGeneralRequest, QueryGeneralResponse} from "../invoker/schema"
import {failed} from "../../utils/notification"
import {PortAsset} from "./models"
import {CopyableField, InputItem} from "../../utils/inputUtil"
import {formatTimestamp} from "../../utils/timeUtil"
import {HTTPFlow, TableFilterDropdownForm} from "../../components/HTTPFlowTable"
import {SearchOutlined, ReloadOutlined} from "@ant-design/icons"
import {ColumnsType, SorterResult} from "antd/lib/table/interface"
import {YakEditor} from "../../utils/editors"
import {openExternalWebsite} from "../../utils/openWebsite"
import {startExecYakCode} from "../../utils/basic"
import {OutputAsset} from "./outputAssetYakCode"
import {DropdownMenu} from "../../components/baseTemplate/DropdownMenu"
import {LineMenunIcon} from "../../assets/icons"
import {ExportExcel} from "../../components/DataExport/index"
import {useGetState, useMemoizedFn} from "ahooks"
import {onRemoveToolFC} from "../../utils/deleteTool"

const {ipcRenderer} = window.require("electron")

export interface PortAssetTableProp {
    closed?: boolean
    onClicked?: (i: PortAsset) => any
}

export interface QueryPortsRequest extends QueryGeneralRequest {
    Hosts: string
    Ports: string
    State: "open" | "closed" | "unknown"
    Service: string
}

const formatJson = (filterVal, jsonData) => {
    return jsonData.map((v, index) =>
        filterVal.map((j) => {
            if (j === "UpdatedAt") {
                return formatTimestamp(v[j])
            } else if (j === "Host") {
                return `${v[j]}:${v["Port"]}`
            } else {
                return v[j]
            }
        })
    )
}

export const PortAssetTable: React.FC<PortAssetTableProp> = (props) => {
    const [response, setResponse] = useState<QueryGeneralResponse<PortAsset>>({
        Data: [],
        Pagination: {
            Limit: 15,
            Page: 1,
            OrderBy: "desc",
            Order: "updated_at"
        } as PaginationSchema,
        Total: 0
    })
    const [params, setParams, getParams] = useGetState<QueryPortsRequest>({
        Hosts: "",
        Ports: "",
        Service: "",
        State: props.closed ? "closed" : "open",
        Pagination: {
            Limit: 15,
            Page: 1,
            OrderBy: "desc",
            Order: "updated_at"
        }
    })
    const [loading, setLoading] = useState(false)
    const [outputByNetwork, setOutputByNetwork] = useState("")
    const [checkedURL, setCheckedURL] = useState<string[]>([])
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

    const update = (current?: number, pageSize?: number, order?: string, orderBy?: string) => {
        setLoading(true)
        ipcRenderer
            .invoke("QueryPorts", {
                ...getParams(),
                Pagination: {
                    Limit: pageSize || response.Pagination.Limit,
                    Page: current || response.Pagination.Page,
                    Order: order || "desc",
                    OrderBy: orderBy || "updated_at"
                }
            })
            .then((data) => {
                setSelectedRowKeys([])
                setCheckedURL([])
                setResponse(data)
            })
            .catch((e: any) => {
                failed("QueryPorts failed: " + `${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    }

    useEffect(() => {
        update()
    }, [])
    let columns: any = [
        {
            title: "????????????",
            dataIndex: "Host",
            filteredValue: (getParams()["Hosts"] && ["Host"]) || null,
            render: (_, i: PortAsset) => <CopyableField text={`${i.Host}:${i.Port}`} />,
            filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
                return (
                    params &&
                    setParams && (
                        <TableFilterDropdownForm
                            label={"??????IP/??????"}
                            params={params}
                            setParams={setParams}
                            filterName={"Hosts"}
                            pureString={true}
                            confirm={confirm}
                            setSelectedKeys={setSelectedKeys}
                        />
                    )
                )
            },
            width: 200,
            filterIcon: (filtered) => {
                return params && !!setParams && <SearchOutlined style={{color: filtered ? "#1890ff" : undefined}} />
            }
        },
        {
            title: "??????",
            width: 70,
            dataIndex: "Port",
            filteredValue: (getParams()["Ports"] && ["Port"]) || null,
            render: (_, i: PortAsset) => <Tag color={"geekblue"}>{i.Port}</Tag>,
            filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
                return (
                    params &&
                    setParams && (
                        <TableFilterDropdownForm
                            label={"????????????"}
                            params={params}
                            setParams={setParams}
                            filterName={"Ports"}
                            autoCompletions={[]}
                            pureString={true}
                            confirm={confirm}
                            setSelectedKeys={setSelectedKeys}
                        />
                    )
                )
            },
            filterIcon: (filtered) => {
                return (
                    params &&
                    !!setParams && <SearchOutlined style={{color: !!params["Ports"] ? "#1890ff" : undefined}} />
                )
            }
        }
    ]
    if (props.closed) {
        columns.push({
            title: "????????????",
            dataIndex: "Reason",
            render: (_, i: PortAsset) =>
                i.ServiceType ? (
                    <div style={{width: 230, overflow: "auto"}}>
                        <CopyableField text={i.Reason} />
                    </div>
                ) : (
                    ""
                ),
            width: 250
        })
    } else {
        columns = [
            ...columns,
            {
                title: "??????",
                dataIndex: "Proto",
                width: 57,
                render: (_, i: PortAsset) => <Tag color={"green"}>{i.Proto}</Tag>
            },
            {
                title: "????????????",
                dataIndex: "ServiceType",
                render: (_, i: PortAsset) =>
                    i.ServiceType ? (
                        <div style={{width: 230, overflowX: "hidden"}}>
                            <CopyableField noCopy={true} text={i.ServiceType} />
                        </div>
                    ) : (
                        ""
                    ),
                width: 250,
                filteredValue: (getParams()["Service"] && ["ServiceType"]) || null,
                filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
                    return (
                        params &&
                        setParams && (
                            <TableFilterDropdownForm
                                label={"???????????????"}
                                params={params}
                                setParams={setParams}
                                filterName={"Service"}
                                autoCompletions={[]}
                                pureString={true}
                                confirm={confirm}
                                setSelectedKeys={setSelectedKeys}
                            />
                        )
                    )
                },
                filterIcon: (filtered) => {
                    return params && !!setParams && <SearchOutlined style={{color: filtered ? "#1890ff" : undefined}} />
                }
            },
            {
                title: "Title",
                dataIndex: "HtmlTitle",
                render: (_, i: PortAsset) =>
                    i.ServiceType ? (
                        <div style={{width: 150, overflow: "auto"}}>
                            <CopyableField noCopy={true} text={i.HtmlTitle} />
                        </div>
                    ) : (
                        ""
                    ),
                width: 170,
                filteredValue: (getParams()["Title"] && ["HtmlTitle"]) || null,
                filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
                    return (
                        params &&
                        setParams && (
                            <TableFilterDropdownForm
                                label={"Html Title"}
                                params={params}
                                setParams={setParams}
                                filterName={"Title"}
                                autoCompletions={[]}
                                pureString={true}
                                confirm={confirm}
                                setSelectedKeys={setSelectedKeys}
                            />
                        )
                    )
                },
                filterIcon: (filtered) => {
                    return params && !!setParams && <SearchOutlined style={{color: filtered ? "#1890ff" : undefined}} />
                }
            },
            {
                title: "??????????????????",
                dataIndex: "UpdatedAt",
                render: (_, i: PortAsset) => <Tag color={"green"}>{formatTimestamp(i.UpdatedAt)}</Tag>
            },
            {
                title: "??????",
                dataIndex: "Action",
                render: (_, i: PortAsset) => (
                    <Button
                        size={"small"}
                        type={"link"}
                        onClick={(e) => {
                            openExternalWebsite(`http://${i.Host}:${i.Port}`)
                        }}
                    >
                        ???????????????
                    </Button>
                ),
                fixed: "right"
            }
        ]
    }
    const getData = useMemoizedFn((query) => {
        return new Promise((resolve) => {
            ipcRenderer
                .invoke("QueryPorts", {
                    ...params,
                    Pagination: {
                        ...query
                    }
                })
                .then((res: QueryGeneralResponse<PortAsset>) => {
                    const {Data} = res
                    //    ????????????
                    let exportData: any = []
                    const header: string[] = []
                    const filterVal: string[] = []
                    columns.forEach((item) => {
                        if (item.dataIndex !== "Action") {
                            header.push(item.title)
                            filterVal.push(item.dataIndex)
                        }
                    })
                    exportData = formatJson(filterVal, Data)
                    resolve({
                        header,
                        exportData,
                        response: res
                    })
                })
                .catch((e: any) => {
                    failed("?????????????????? " + `${e}`)
                })
        })
    })
    const onRemove = useMemoizedFn(() => {
        const transferParams = {
            selectedRowKeys,
            params,
            interfaceName: "DeletePorts"
        }
        setLoading(true)
        onRemoveToolFC(transferParams)
            .then(() => {
                refList()
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    const refList = useMemoizedFn(() => {
        setParams({
            Hosts: "",
            Ports: "",
            Service: "",
            State: props.closed ? "closed" : "open",
            Pagination: {
                Limit: 15,
                Page: 1,
                OrderBy: "desc",
                Order: "updated_at"
            }
        })

        setTimeout(() => {
            update()
        }, 10)
    })
    return (
        <Table<PortAsset>
            title={() => {
                return (
                    <Row>
                        <Col span={12}>
                            <Space>
                                ??????????????????
                                <Tooltip title='?????????????????????????????????'>
                                    <Button
                                        icon={<ReloadOutlined />}
                                        size={"small"}
                                        type={"link"}
                                        onClick={() => {
                                            refList()
                                        }}
                                    />
                                </Tooltip>
                            </Space>
                        </Col>
                        <Col span={12} style={{textAlign: "right"}}>
                            <Space>
                                <ExportExcel getData={getData} btnProps={{size: "small"}} />
                                <Popconfirm
                                    title={
                                        selectedRowKeys.length > 0
                                            ? "???????????????????????????????????????????????????"
                                            : "?????????????????????????????????? ????????????"
                                    }
                                    onConfirm={onRemove}
                                >
                                    <Button size='small' danger={true}>
                                        ????????????
                                    </Button>
                                </Popconfirm>
                                <DropdownMenu
                                    menu={{
                                        data: [
                                            {key: "bug-test", title: "?????????????????????"},
                                            {key: "scan-port", title: "?????????????????????"},
                                            {key: "brute", title: "???????????????"}
                                        ]
                                    }}
                                    dropdown={{placement: "bottomRight"}}
                                    onClick={(key) => {
                                        if (checkedURL.length === 0) {
                                            failed("??????????????????????????????????????????")
                                            return
                                        }

                                        ipcRenderer.invoke("send-to-tab", {
                                            type: key,
                                            data: {URL: JSON.stringify(checkedURL)}
                                        })
                                    }}
                                >
                                    <Button type='link' icon={<LineMenunIcon />}></Button>
                                </DropdownMenu>
                            </Space>
                        </Col>
                    </Row>
                )
            }}
            scroll={{x: "auto"}}
            size={"small"}
            bordered={true}
            rowKey={(row) => row.Id}
            onRow={(r) => {
                return {
                    onClick: (e) => {
                        // props.onClicked && props.onClicked(r)
                    }
                }
            }}
            expandable={{
                expandedRowRender: (record) => <PortAssetDescription port={record} />
            }}
            loading={loading}
            columns={columns || []}
            dataSource={response.Data}
            pagination={{
                size: "small",
                pageSize: response.Pagination?.Limit || 10,
                total: response.Total,
                showTotal: (i) => <Tag>???{i}?????????</Tag>,
                showSizeChanger: true,
                showLessItems: true
            }}
            // @ts-ignore*/
            onChange={(paging: any, _: any, sorter: SorterResult<HTTPFlow>) => {
                if (sorter.order && sorter.columnKey) {
                    update(paging.current, paging.pageSize, sorter.order, `${sorter.columnKey}`)
                } else {
                    update(paging.current, paging.pageSize)
                }
            }}
            rowSelection={{
                onChange: (selectedRowKeys, selectedRows) => {
                    setSelectedRowKeys(selectedRowKeys as string[])
                    setCheckedURL(selectedRows.map((item) => `${item.Host}:${item.Port}`))
                },
                selectedRowKeys
            }}
        ></Table>
    )
}

export interface PortAssetDescriptionProp {
    port: PortAsset
}

export const PortAssetDescription: React.FC<PortAssetDescriptionProp> = (props) => {
    const {port} = props
    return (
        <Descriptions
            size={"small"}
            bordered={true}
            column={!port.ServiceType ? 1 : 2}
            title={""}
            style={{marginLeft: 20}}
        >
            <Descriptions.Item label={<Tag>??????</Tag>}>
                <CopyableField text={`${port.State}`} />
            </Descriptions.Item>
            {port.HtmlTitle && (
                <Descriptions.Item label={<Tag>Title</Tag>}>
                    <CopyableField text={`${port.HtmlTitle}`} />
                </Descriptions.Item>
            )}
            {port.ServiceType && (
                <Descriptions.Item span={2} label={<Tag>??????</Tag>}>
                    <CopyableField text={`${port.ServiceType}`} />
                </Descriptions.Item>
            )}
            {port.Reason && (
                <Descriptions.Item span={2} label={<Tag>????????????</Tag>}>
                    <CopyableField text={`${port.Reason}`} />
                </Descriptions.Item>
            )}
            {port.CPE.join("|") !== "" ? (
                <Descriptions.Item span={2} label={<Tag>CPE</Tag>}>
                    <Space direction={"vertical"}>
                        {port.CPE.map((e) => {
                            return <CopyableField text={`${e}`} />
                        })}
                    </Space>
                </Descriptions.Item>
            ) : undefined}
            {port.Fingerprint && (
                <Descriptions.Item span={2} label={<Tag>????????????</Tag>}>
                    <div style={{height: 200}}>
                        <YakEditor value={port.Fingerprint} noLineNumber={true} noMiniMap={true} />
                    </div>
                </Descriptions.Item>
            )}
        </Descriptions>
    )
}
