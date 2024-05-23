import React, {useEffect, useState} from "react"
import {Button, Popconfirm, Checkbox, Space, Table, Tag, Typography, Tooltip, Row, Col} from "antd"
import {genDefaultPagination, QueryGeneralRequest, QueryGeneralResponse} from "../invoker/schema"
import {failed} from "../../utils/notification"
import {ReloadOutlined, SearchOutlined} from "@ant-design/icons"
import {TableFilterDropdownString} from "../risks/RiskTable"
import {useGetState, useMemoizedFn} from "ahooks"
import {DropdownMenu} from "../../components/baseTemplate/DropdownMenu"
import {LineMenunIcon} from "../../assets/icons"
import {ExportExcel} from "../../components/DataExport/DataExport"
import {onRemoveToolFC} from "../../utils/deleteTool"

import styles from "./DomainAssetPage.module.scss"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/routes/newRouteConstants"

export interface Domain {
    ID?: number
    DomainName: string
    IPAddr: string
    HTTPTitle: string
}

export interface QueryDomainsRequest extends QueryGeneralRequest {
    Network?: string
    DomainKeyword?: string
    Title?: string
}

export interface DomainAssetPageProps {}

const {ipcRenderer} = window.require("electron")
const {Text} = Typography

const formatJson = (filterVal, jsonData) => {
    return jsonData.map((v, index) =>
        filterVal.map((j) => {
            return v[j]
        })
    )
}

export const DomainAssetPage: React.FC<DomainAssetPageProps> = (props: DomainAssetPageProps) => {
    const [params, setParams, getParams] = useGetState<QueryDomainsRequest>({
        Pagination: genDefaultPagination(20)
    })
    const [response, setResponse] = useState<QueryGeneralResponse<Domain>>({
        Data: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    })
    const [loading, setLoading] = useState(false)
    const {Data, Total, Pagination} = response
    const [outputDomainKeyword, setOutputDomainKeyword] = useState("*")

    const [checkedURL, setCheckedURL] = useState<string[]>([])
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const [checkedAll, setCheckedAll] = useState<boolean>(false)

    const [allResponse, setAllResponse] = useState<QueryGeneralResponse<Domain>>({
        Data: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    })
    useEffect(() => {
        if (checkedAll) {
            const rowKeys = allResponse.Data.map((item) => (item.ID || "").toString()).filter((item) => item !== "")
            setSelectedRowKeys(rowKeys)
            setCheckedURL(allResponse.Data.map((item) => item.DomainName))
        }
    }, [checkedAll])

    useEffect(() => {
        getAllData()
    }, [])
    const getAllData = () => {
        ipcRenderer
            .invoke("QueryDomains", {
                All: true
            })
            .then((data: QueryGeneralResponse<Domain>) => {
                setAllResponse(data)
            })
            .catch((e: any) => {
                failed("QueryExecHistory failed: " + `${e}`)
            })
            .finally(() => {})
    }

    const update = useMemoizedFn((page?: number, limit?: number) => {
        const newParams = {
            ...getParams()
        }
        if (page) newParams.Pagination.Page = page
        if (limit) newParams.Pagination.Limit = limit

        setLoading(true)
        ipcRenderer
            .invoke("QueryDomains", newParams)
            .then((data) => {
                setResponse(data)
            })
            .catch((e: any) => {
                failed("QueryExecHistory failed: " + `${e}`)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })

    // 单个删除
    const delDomainSingle = useMemoizedFn((host: string) => {
        const newParams = {
            DomainKeyword: host
        }
        setLoading(true)
        ipcRenderer
            .invoke("DeleteDomains", newParams)
            .then(() => {
                update(1)
                getAllData()
            })
            .catch((e) => {
                failed(`DelDomain failed: ${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        update(1, 20)
    }, [])
    const columns = [
        {
            title: "域名",
            dataIndex: "DomainName",
            filteredValue: (getParams()["DomainKeyword"] && ["DomainName"]) || null,
            width: 400,
            render: (_, i: Domain) => (
                <Text style={{maxWidth: 400}} ellipsis={{tooltip: true}}>
                    {i.DomainName}
                </Text>
            ),
            filterIcon: (filtered) => {
                return params && <SearchOutlined style={{color: filtered ? "#1890ff" : undefined}} />
            },
            filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
                return (
                    params &&
                    setParams && (
                        <TableFilterDropdownString
                            label={"搜索关键字"}
                            params={params}
                            setParams={setParams}
                            filterName={"DomainKeyword"}
                            confirm={confirm}
                            setSelectedKeys={setSelectedKeys}
                            update={update}
                        />
                    )
                )
            }
        },
        {
            title: "IP",
            dataIndex: "IPAddr",
            width: 470,
            render: (_, i: Domain) => (
                <Text style={{maxWidth: 470}} ellipsis={{tooltip: true}}>
                    {i.IPAddr || "-"}
                </Text>
            ),
            filteredValue: (getParams()["Network"] && ["IPAddr"]) || null,
            filterIcon: (filtered) => {
                return params && <SearchOutlined style={{color: filtered ? "#1890ff" : undefined}} />
            },
            filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
                return (
                    params &&
                    setParams && (
                        <TableFilterDropdownString
                            label={"搜索IP"}
                            params={params}
                            setParams={setParams}
                            filterName={"Network"}
                            confirm={confirm}
                            setSelectedKeys={setSelectedKeys}
                            update={update}
                        />
                    )
                )
            }
        },
        {
            title: "HTMLTitle",
            dataIndex: "HTTPTitle",
            width: 470,
            render: (_, i: Domain) => (
                <Text style={{maxWidth: 470}} ellipsis={{tooltip: true}}>
                    {i.HTTPTitle || "-"}
                </Text>
            ),
            filteredValue: (getParams()["Title"] && ["HTTPTitle"]) || null,
            filterIcon: (filtered) => {
                return params && <SearchOutlined style={{color: filtered ? "#1890ff" : undefined}} />
            },
            filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
                return (
                    params &&
                    setParams && (
                        <TableFilterDropdownString
                            label={"搜索关键字"}
                            params={params}
                            setParams={setParams}
                            filterName={"Title"}
                            confirm={confirm}
                            setSelectedKeys={setSelectedKeys}
                            update={update}
                        />
                    )
                )
            }
        },
        {
            title: "操作",
            dataIndex: "Action",
            render: (_, i: Domain) => (
                <Space>
                    <Button
                        size='small'
                        type={"link"}
                        danger
                        onClick={() => {
                            delDomainSingle(i.DomainName)
                            setSelectedRowKeys([])
                            setCheckedURL([])
                            setCheckedAll(false)
                        }}
                    >
                        删除
                    </Button>
                </Space>
            )
        }
    ]
    const getData = useMemoizedFn((query) => {
        return new Promise((resolve) => {
            ipcRenderer
                .invoke("QueryDomains", {
                    ...params,
                    Pagination: {
                        ...query
                    }
                })
                .then((res: QueryGeneralResponse<any>) => {
                    const {Data} = res
                    //    数据导出
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
                .catch((e) => {
                    failed("数据导出失败 " + `${e}`)
                })
        })
    })

    const onRemove = useMemoizedFn(() => {
        const transferParams = {
            selectedRowKeys: checkedAll ? [] : selectedRowKeys,
            params,
            interfaceName: "DeleteDomains",
            selectedRowKeysNmae: "IDs"
        }
        setLoading(true)
        onRemoveToolFC(transferParams)
            .then(() => {
                refList()
                setSelectedRowKeys([])
                setCheckedURL([])
                setCheckedAll(false)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    const refList = useMemoizedFn(() => {
        setParams({
            Pagination: genDefaultPagination(20)
        })
        setTimeout(() => {
            update(1)
        }, 10)
        setTimeout(() => {
            getAllData()
        }, 10)
    })
    return (
        <Table<Domain>
            className={styles["table-wrapper"]}
            loading={loading}
            pagination={{
                size: "small",
                current: +Pagination.Page,
                pageSize: Pagination?.Limit || 10,
                showSizeChanger: true,
                total: Total,
                showTotal: (i) => <Tag>共{i}条历史记录</Tag>,
                onChange: (page: number, limit?: number) => {
                    update(page, limit)
                }
            }}
            title={(e) => {
                return (
                    <>
                        <div style={{display: "flex", justifyContent: "space-between"}}>
                            <Space>
                                <div>域名资产</div>
                                <Tooltip title='刷新会重置所有查询条件'>
                                    <Button
                                        type={"link"}
                                        onClick={() => {
                                            refList()
                                        }}
                                        size={"small"}
                                        icon={<ReloadOutlined />}
                                    />
                                </Tooltip>
                            </Space>
                        </div>
                        <Row>
                            <Col span={12} style={{display: "flex", alignItems: "center"}}>
                                <Checkbox
                                    style={{marginLeft: 8}}
                                    checked={checkedAll}
                                    onChange={(e) => {
                                        if (!e.target.checked) {
                                            setSelectedRowKeys([])
                                            setCheckedURL([])
                                        }
                                        setCheckedAll(e.target.checked)
                                    }}
                                    disabled={allResponse.Data.length === 0}
                                >
                                    全选
                                </Checkbox>
                                {selectedRowKeys.length > 0 && (
                                    <Tag color='blue'>
                                        已选{checkedAll ? allResponse.Total : selectedRowKeys?.length}条
                                    </Tag>
                                )}
                            </Col>
                            <Col span={12} style={{textAlign: "right"}}>
                                <Space>
                                    <ExportExcel getData={getData} btnProps={{size: "small"}} fileName='域名资产' />
                                    <Popconfirm
                                        title={
                                            checkedAll
                                                ? "确定删除所有域名资产吗? 不可恢复"
                                                : "确定删除选择的域名资产吗？不可恢复"
                                        }
                                        onConfirm={onRemove}
                                        disabled={selectedRowKeys.length === 0}
                                    >
                                        <Button size='small' danger={true} disabled={selectedRowKeys.length === 0}>
                                            删除资产
                                        </Button>
                                    </Popconfirm>
                                    <DropdownMenu
                                        menu={{
                                            data: [
                                                {key: "bug-test", title: "发送到漏洞检测"},
                                                {key: "brute", title: "发送到爆破"}
                                            ]
                                        }}
                                        dropdown={{placement: "bottomRight"}}
                                        onClick={(key) => {
                                            if (checkedURL.length === 0) {
                                                failed("请最少选择一个选项再进行操作")
                                                return
                                            }
                                            switch (key) {
                                                case "brute":
                                                    emiter.emit(
                                                        "openPage",
                                                        JSON.stringify({
                                                            route: YakitRoute.Mod_Brute,
                                                            params: {
                                                                targets: checkedURL.join(",")
                                                            }
                                                        })
                                                    )
                                                    break
                                                case "bug-test":
                                                    emiter.emit(
                                                        "openPage",
                                                        JSON.stringify({
                                                            route: YakitRoute.PoC,
                                                            params: {
                                                                URL: JSON.stringify(checkedURL)
                                                            }
                                                        })
                                                    )
                                                    break
                                                default:
                                                    break
                                            }
                                        }}
                                    >
                                        <Button type='link' icon={<LineMenunIcon />}></Button>
                                    </DropdownMenu>
                                </Space>
                            </Col>
                        </Row>
                    </>
                )
            }}
            size={"small"}
            bordered={true}
            dataSource={Data}
            rowKey={(e) => `${e.ID}`}
            rowSelection={{
                onChange: (selectedRowKeys, selectedRows) => {
                    if (selectedRowKeys.length === allResponse.Data.length) setCheckedAll(true)
                    else {
                        setCheckedAll(false)
                    }
                    setSelectedRowKeys(selectedRowKeys as string[])
                    setCheckedURL(selectedRows.map((item) => item.DomainName))
                },
                selectedRowKeys
            }}
            columns={columns}
        ></Table>
    )
}
