import React, {useEffect, useState} from "react"
import {Button, Space, Table, Tag, Form} from "antd"
import {Risk} from "./schema"
import {genDefaultPagination, QueryGeneralRequest, QueryGeneralResponse} from "../invoker/schema"
import {useMemoizedFn} from "ahooks"
import {formatTimestamp} from "../../utils/timeUtil"
import {ReloadOutlined, SearchOutlined} from "@ant-design/icons"
import {failed} from "../../utils/notification"
import {showModal} from "../../utils/showModal"
import ReactJson from "react-json-view"
import {InputItem} from "../../utils/inputUtil"

export interface RiskTableProp {}

export interface QueryRisksParams extends QueryGeneralRequest {
    Search?: string
    RiskType?: string
    Network?: string
}

const {ipcRenderer} = window.require("electron")

export const RiskTable: React.FC<RiskTableProp> = (props) => {
    const [response, setResponse] = useState<QueryGeneralResponse<Risk>>({
        Data: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    })
    const [params, setParams] = useState<QueryRisksParams>({Pagination: genDefaultPagination(20)})
    const total = response.Total
    const pagination = response.Pagination
    const page = response.Pagination.Page
    const limit = response.Pagination.Limit
    const [loading, setLoading] = useState(false)

    const update = useMemoizedFn(
        (page?: number, limit?: number, order?: string, orderBy?: string, extraParam?: any) => {
            const paginationProps = {
                Page: page || 1,
                Limit: limit || pagination.Limit
            }
            setLoading(true)
            ipcRenderer
                .invoke("QueryRisks", {
                    ...params,
                    ...(extraParam ? extraParam : {}),
                    Pagination: paginationProps
                })
                .then((r: QueryGeneralResponse<any>) => {
                    setResponse(r)
                })
                .catch((e) => {
                    failed(`QueryRisks failed: ${e}`)
                })
                .finally(() => setTimeout(() => setLoading(false), 300))
        }
    )

    const delRisk = useMemoizedFn((hash: string) => {
        setLoading(true)
        ipcRenderer
            .invoke("DeleteRisk", {
                Hash: hash
            })
            .then(() => {
                update(1)
            })
            .catch((e) => {
                failed(`DelRisk failed: ${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        update(1)
    }, [])

    return (
        <Table<Risk>
            title={() => {
                return (
                    <Space>
                        {"风险与漏洞"}
                        <Button
                            size={"small"}
                            type={"link"}
                            onClick={() => {
                                update()
                            }}
                            icon={<ReloadOutlined />}
                        />
                    </Space>
                )
            }}
            size={"small"}
            bordered={true}
            columns={[
                {
                    title: "标题",
                    render: (i: Risk) => i?.TitleVerbose || i.Title,
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
                                    filterName={"Search"}
                                    confirm={confirm}
                                    setSelectedKeys={setSelectedKeys}
                                    update={update}
                                />
                            )
                        )
                    }
                },
                {
                    title: "类型",
                    render: (i: Risk) => i?.RiskTypeVerbose || i.RiskType,
                    filterIcon: (filtered) => {
                        return params && <SearchOutlined style={{color: filtered ? "#1890ff" : undefined}} />
                    },
                    filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
                        return (
                            params &&
                            setParams && (
                                <TableFilterDropdownString
                                    label={"搜索类型关键字"}
                                    params={params}
                                    setParams={setParams}
                                    filterName={"RiskType"}
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
                    render: (i: Risk) => i?.IP || "-",
                    filterIcon: (filtered) => {
                        return params && <SearchOutlined style={{color: filtered ? "#1890ff" : undefined}} />
                    },
                    filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
                        return (
                            params &&
                            setParams && (
                                <TableFilterDropdownString
                                    label={"搜索网段"}
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
                {title: "Token", render: (i: Risk) => i?.ReverseToken || "-"},
                {
                    title: "发现时间",
                    render: (i: Risk) => <Tag>{i.CreatedAt > 0 ? formatTimestamp(i.CreatedAt) : "-"}</Tag>
                },
                {
                    title: "操作",
                    render: (i: Risk) => (
                        <Space>
                            <Button
                                type={"link"}
                                onClick={() => {
                                    showModal({
                                        width: "60",
                                        title: "详情",
                                        content: (
                                            <div style={{overflow: "auto"}}>
                                                <ReactJson src={i} />
                                            </div>
                                        )
                                    })
                                }}
                            >
                                详情
                            </Button>
                            <Button
                                type={"link"}
                                danger
                                onClick={() => delRisk(i.Hash)}
                            >
                                删除
                            </Button>
                        </Space>
                    )
                }
            ]}
            rowKey={(e) => e.Hash}
            loading={loading}
            dataSource={response.Data}
            pagination={{
                current: +page,
                pageSize: limit,
                showSizeChanger: true,
                total,
                showTotal: (total) => <Tag>Total:{total}</Tag>,
                pageSizeOptions: ["5", "10", "20"]
            }}
            onChange={(pagination, filters, sorter, extra) => {
                const action = extra.action
                switch (action) {
                    case "paginate":
                        const current = pagination.current
                        update(+page === current ? 1 : current, pagination.pageSize)
                        return
                    case "filter":
                        update()
                        return
                }
            }}
        ></Table>
    )
}

export interface TableFilterDropdownStringProp<T> {
    label: string
    filterName: string
    params?: T
    setParams?: (y: T) => any

    // from parentcotnext
    confirm?: any
    setSelectedKeys?: (keys: React.Key[]) => any
    update?: (page?: number, limit?: number, order?: string, orderBy?: string, extraParam?: any) => any
}

export type FilterDropdownStringProp = TableFilterDropdownStringProp<QueryRisksParams>

export const TableFilterDropdownString: React.FC<FilterDropdownStringProp> = (props) => {
    const {params, setParams, setSelectedKeys, update} = props
    return (
        <div style={{padding: 8}}>
            <Form
                size={"small"}
                onSubmitCapture={(e) => {
                    e.preventDefault()

                    if (setSelectedKeys) {
                        // @ts-ignore
                        if (params[props.filterName]) {
                            const obj = {}
                            obj[props.filterName] = params ? params[props.filterName] : ""
                            // @ts-ignore
                            setSelectedKeys([obj])
                        } else {
                            setSelectedKeys([])
                        }
                    }
                    if (props.confirm) {
                        props.confirm()
                    }
                }}
            >
                <InputItem
                    style={{marginBottom: 4}}
                    label={props.label}
                    // @ts-ignore
                    value={params[props.filterName]}
                    setValue={(e) => {
                        if (params && setParams) {
                            const newParams = {...params}
                            // @ts-ignore
                            newParams[props.filterName] = e
                            setParams(newParams)
                        }
                    }}
                />

                <Form.Item style={{marginBottom: 0, marginTop: 0}} colon={false} label={" "}>
                    <Space>
                        <Button type='primary' htmlType='submit'>
                            搜索
                        </Button>
                        <Button
                            onClick={() => {
                                setSelectedKeys && setSelectedKeys([])
                                if (params && setParams) {
                                    const newParams = {...params}
                                    // @ts-ignore
                                    newParams[props.filterName] = ""
                                    setParams(newParams)
                                    setTimeout(() => {
                                        if (update) update(1)
                                    }, 50)
                                }
                            }}
                        >
                            重置搜索
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </div>
    )
}
