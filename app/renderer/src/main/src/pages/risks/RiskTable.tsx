import React, {useEffect, useRef, useState} from "react"
import {Button, Space, Table, Tag, Form, Typography, Descriptions, Popconfirm, Tooltip, Menu} from "antd"
import {Risk} from "./schema"
import {genDefaultPagination, QueryGeneralRequest, QueryGeneralResponse} from "../invoker/schema"
import {useGetState, useMemoizedFn} from "ahooks"
import {formatTimestamp} from "../../utils/timeUtil"
import {ReloadOutlined, SearchOutlined} from "@ant-design/icons"
import {failed, success} from "../../utils/notification"
import {showModal} from "../../utils/showModal"
import {InputItem, ManyMultiSelectForString} from "../../utils/inputUtil"

import infoImg from "../../assets/riskDetails/info.png"
import highImg from "../../assets/riskDetails/high.png"
import fatalImg from "../../assets/riskDetails/fatal.png"
import middleImg from "../../assets/riskDetails/middle.png"
import lowImg from "../../assets/riskDetails/low.png"
import debugImg from "../../assets/riskDetails/debug.png"

import "./RiskTable.css"
import {ExportExcel} from "../../components/DataExport/index"
import {HTTPPacketEditor} from "../../utils/editors"
import {onRemoveToolFC} from "../../utils/deleteTool"
import {showByContextMenu} from "../../components/functionTemplate/showByContext"

export interface RiskTableProp {
    severity?: string
}

export interface QueryRisksParams extends QueryGeneralRequest {
    Search?: string
    RiskType?: string
    Network?: string
    Severity?: string
}

const {ipcRenderer} = window.require("electron")
const {Paragraph} = Typography

export interface Fields {
    Values: FieldName[]
}

export interface FieldName {
    Total: number
    Name: string
    Verbose: string
    Delta: number
}

export interface FieldNameSelectItem {
    Total: number
    Names: string[]
    Verbose: string
}

const mergeFieldNames = (f: Fields) => {
    let m = new Map<string, FieldNameSelectItem>()
    ;(f.Values || []).forEach((v) => {
        let i = m.get(v.Verbose)
        if (!i) {
            m.set(v.Verbose, {Total: v.Total, Verbose: v.Verbose, Names: [v.Name]})
            return
        } else {
            i.Total += v.Total
            i.Names.push(v.Name)
            i.Names.sort()
        }
    })
    let items: FieldNameSelectItem[] = []
    m.forEach((value) => {
        items.push(value)
    })
    return items
}

export const TitleColor = [
    {
        key: ["trace", "debug", "note"],
        value: "title-debug",
        name: "调试信息",
        img: debugImg,
        tag: "title-background-debug"
    },
    {
        key: ["info", "fingerprint", "infof", "default"],
        value: "title-info",
        name: "信息/指纹",
        img: infoImg,
        tag: "title-background-info"
    },
    {key: ["low"], value: "title-low", name: "低危", img: lowImg, tag: "title-background-low"},
    {
        key: ["middle", "warn", "warning", "medium"],
        value: "title-middle",
        name: "中危",
        img: middleImg,
        tag: "title-background-middle"
    },
    {key: ["high"], value: "title-high", name: "高危", img: highImg, tag: "title-background-high"},
    {
        key: ["fatal", "critical", "panic"],
        value: "title-fatal",
        name: "严重",
        img: fatalImg,
        tag: "title-background-fatal"
    }
]

const formatJson = (filterVal, jsonData) => {
    return jsonData.map((v, index) =>
        filterVal.map((j) => {
            if (j === "CreatedAt") {
                return formatTimestamp(v[j])
            } else if (j === "Severity") {
                const title = TitleColor.filter((item) => item.key.includes(v[j] || ""))[0]
                return title ? title.name : v[j] || "-"
            } else if (j === "RiskTypeVerbose") {
                return v[j] || v["RiskType"]
            } else if (j === "TitleVerbose") {
                return v[j] || v["Title"]
            } else {
                return v[j]
            }
        })
    )
}

export const RiskTable: React.FC<RiskTableProp> = (props) => {
    const [response, setResponse] = useState<QueryGeneralResponse<Risk>>({
        Data: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    })
    const [params, setParams, getParams] = useGetState<QueryRisksParams>({
        Severity: props.severity,
        Pagination: genDefaultPagination(20)
    })
    const total = response.Total
    const pagination = response.Pagination
    const page = response.Pagination.Page
    const limit = response.Pagination.Limit
    const [loading, setLoading] = useState(false)
    const [types, setTypes] = useState<FieldNameSelectItem[]>([])
    const [severities, setSeverities] = useState<FieldNameSelectItem[]>([])
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

    const [selected, setSelected, getSelected] = useGetState<Risk>()

    const time = useRef<any>(null)

    const updateRiskAndLevel = useMemoizedFn(() => {
        ipcRenderer.invoke("QueryAvailableRiskType", {}).then((f: Fields) => {
            setTypes(
                mergeFieldNames(f).sort((a, b) => {
                    const diff = a.Total - b.Total
                    if (diff === 0) {
                        return a.Verbose.localeCompare(b.Verbose)
                    } else {
                        return diff
                    }
                })
            )
        })
        ipcRenderer.invoke("QueryAvailableRiskLevel", {}).then((i: Fields) => {
            setSeverities(
                mergeFieldNames(i).sort((a, b) => {
                    const diff = a.Total - b.Total
                    if (diff === 0) {
                        return a.Verbose.localeCompare(b.Verbose)
                    } else {
                        return diff
                    }
                })
            )
        })
    })

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
                    updateRiskAndLevel()
                    setSelectedRowKeys([])
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

    const filterSelect = useMemoizedFn((type: string, value: string) => {
        const relation = {type: "RiskType", severity: "Severity"}

        const arr = getParams()[relation[type]] ? getParams()[relation[type]]?.split("|") : []
        const flag = arr.filter((item) => value.startsWith(item)) || []
        if (flag.length === 0) {
            arr?.push(value)
            setParams({...getParams(), [relation[type]]: arr?.join("|")})
        } else {
            const filters = arr?.filter((item) => !value.startsWith(item)) || []
            setParams({...getParams(), [relation[type]]: filters.join("|")})
        }

        if (time.current) {
            clearTimeout(time.current)
            time.current = null
        }
        time.current = setTimeout(() => {
            update(1)
        }, 1000)
    })
    const isSelected = useMemoizedFn((type: string, value: string) => {
        const relation = {type: "RiskType", severity: "Severity"}
        const arr = getParams()[relation[type]] ? getParams()[relation[type]]?.split("|") : []
        const num = arr.filter((item) => value.startsWith(item))
        return num.length !== 0
    })

    useEffect(() => {
        update(1)
    }, [])

    const showSelectedTag = () => {
        const risktypes: string[] = (getParams().RiskType && getParams().RiskType?.split("|")) || []
        const severitys: string[] = (getParams().Severity && getParams().Severity?.split("|")) || []

        const typekind = types.filter((item) => {
            item.Names = item.Names || []
            const type = risktypes.find((t) => {
                return item.Names.includes(t) && t
            })
            return !!type
        })
        const severitykind = severities.filter((item) => {
            item.Names = item.Names || []
            const severity = severitys.find((t) => {
                return item.Names.includes(t) && t
            })
            return !!severity
        })
        return (
            (typekind.length > 0 || severitykind.length > 0) && (
                <div className='title-header'>
                    {typekind.map((ele) => {
                        const type =
                            risktypes.find((t) => {
                                ele.Names.includes(t)
                            }) || ""
                        return (
                            <div className='title-selected-tag' key={type}>
                                <div className='tag-name-style' key={type}>
                                    {ele.Verbose}
                                </div>
                                <div
                                    className='tag-del-style'
                                    onClick={() => filterSelect("type", ele.Names.join(","))}
                                >
                                    x
                                </div>
                            </div>
                        )
                    })}
                    {severitykind?.map((ele) => {
                        const severity =
                            severitys.find((t) => {
                                ele.Names.includes(t)
                            }) || ""
                        return (
                            <div className='title-selected-tag' key={severity}>
                                <div className='tag-name-style' key={severity}>
                                    {ele.Verbose}
                                </div>
                                <div
                                    className='tag-del-style'
                                    onClick={() => filterSelect("severity", ele.Names.join(","))}
                                >
                                    x
                                </div>
                            </div>
                        )
                    })}
                </div>
            )
        )
    }

    const columns = [
        {
            title: "标题",
            dataIndex: "TitleVerbose",
            render: (_, i: Risk) => (
                <Paragraph style={{maxWidth: 400, marginBottom: 0}} ellipsis={{tooltip: true}}>
                    {i?.TitleVerbose || i.Title}
                </Paragraph>
            ),
            width: 400,
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
            dataIndex: "RiskTypeVerbose",
            width: 90,
            render: (_, i: Risk) => i?.RiskTypeVerbose || i.RiskType,
            filterIcon: (filtered) => {
                return (
                    params && (
                        <SearchOutlined style={{color: filtered || getParams()["RiskType"] ? "#1890ff" : undefined}} />
                    )
                )
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
            title: "等级",
            dataIndex: "Severity",
            render: (_, i: Risk) => {
                const title = TitleColor.filter((item) => item.key.includes(i.Severity || ""))[0]
                return <span className={title?.value || "title-default"}>{title ? title.name : i.Severity || "-"}</span>
            },
            width: 90
        },
        {
            title: "IP",
            dataIndex: "IP",
            render: (_, i: Risk) => i?.IP || "-",
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
        {title: "Token", dataIndex: "ReverseToken", render: (_, i: Risk) => i?.ReverseToken || "-"},
        {
            title: "发现时间",
            dataIndex: "CreatedAt",
            render: (_, i: Risk) => <Tag>{i.CreatedAt > 0 ? formatTimestamp(i.CreatedAt) : "-"}</Tag>
        },
        {
            title: "操作",
            dataIndex: "Action",
            render: (_, i: Risk) => {
                return (
                    <Space>
                        <Button
                            size='small'
                            type={"link"}
                            onClick={() => {
                                showModal({
                                    width: "80%",
                                    title: "详情",
                                    content: (
                                        <div style={{overflow: "auto"}}>
                                            <RiskDetails info={i} />
                                        </div>
                                    )
                                })
                            }}
                        >
                            详情
                        </Button>
                        <Button size='small' type={"link"} danger onClick={() => delRisk(i.Hash)}>
                            删除
                        </Button>
                    </Space>
                )
            }
        }
    ]

    const getData = useMemoizedFn((query) => {
        return new Promise((resolve) => {
            ipcRenderer
                .invoke("QueryRisks", {
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
            selectedRowKeys,
            params,
            interfaceName: "DeleteRisk"
        }
        setLoading(true)
        onRemoveToolFC(transferParams)
            .then(() => {
                update()
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    const refList = useMemoizedFn(() => {
        setParams({
            Severity: props.severity,
            Pagination: genDefaultPagination(20)
        })
        setTimeout(() => {
            update()
        }, 10)
    })
    return (
        <div className='risk-table-container'>
            <div className='container-table'>
                <Table<Risk>
                    title={() => {
                        return (
                            <div>
                                <div className='table-title'>
                                    <Space>
                                        风险与漏洞
                                        <Tooltip title='刷新会重置所有查询条件'>
                                            <Button
                                                size={"small"}
                                                type={"link"}
                                                onClick={() => {
                                                    refList()
                                                }}
                                                icon={<ReloadOutlined />}
                                            />
                                        </Tooltip>
                                    </Space>
                                    <Space>
                                        <ExportExcel
                                            getData={getData}
                                            btnProps={{size: "small"}}
                                            fileName='风险与漏洞'
                                        />
                                        <Popconfirm
                                            title={
                                                selectedRowKeys.length > 0
                                                    ? "确定删除选择的风险与漏洞吗？不可恢复"
                                                    : "确定删除所有风险与漏洞吗? 不可恢复"
                                            }
                                            onConfirm={onRemove}
                                        >
                                            <Button size='small' danger={true}>
                                                删除数据
                                            </Button>
                                        </Popconfirm>
                                    </Space>
                                </div>
                                {showSelectedTag()}
                            </div>
                        )
                    }}
                    size={"small"}
                    bordered={true}
                    columns={columns}
                    scroll={{x: "auto"}}
                    rowKey={(e) => e.Id}
                    loading={loading}
                    dataSource={response.Data}
                    pagination={{
                        current: +page,
                        pageSize: limit,
                        showSizeChanger: true,
                        total: total,
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
                    rowSelection={{
                        onChange: (selectedRowKeys) => {
                            setSelectedRowKeys(selectedRowKeys as string[])
                        },
                        selectedRowKeys
                    }}
                    onRow={(record) => {
                        return {
                            onContextMenu: (event) => {
                                showByContextMenu({
                                    data: [{key: "delect-repeat", title: "删除重复标题数据"}],
                                    onClick: ({key}) => {
                                        if (key === "delect-repeat") {
                                            const newParams = {
                                                DeleteRepetition: true,
                                                Id: record.Id,
                                                Filter: {
                                                    Search: record?.TitleVerbose || record.Title
                                                }
                                            }
                                            ipcRenderer
                                                .invoke("DeleteRisk", newParams)
                                                .then(() => {
                                                    update()
                                                })
                                                .catch((e: any) => {
                                                    failed(`DeleteRisk failed: ${e}`)
                                                })
                                        }
                                    }
                                })
                            }
                        }
                    }}
                />
            </div>

            <div className='container-filter-body'>
                {severities.length > 0 && (
                    <div className='filter-body-opt'>
                        <div className='opt-header'>漏洞级别</div>
                        <div className='opt-list'>
                            {severities.map((item) => {
                                const value = (item.Names || []).join(",")
                                return (
                                    <div
                                        key={value}
                                        className={`opt-list-item ${isSelected("severity", value) ? "selected" : ""}`}
                                        onClick={() => filterSelect("severity", value)}
                                    >
                                        <span className='item-name' title={item.Verbose}>
                                            {item.Verbose}
                                        </span>
                                        <span>{item.Total}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                <div className='opt-separator'></div>

                {types.length > 0 && (
                    <div className='filter-body-opt'>
                        <div className='opt-header'>漏洞/风险类型</div>
                        <div className='opt-list'>
                            {types.map((item) => {
                                const value = (item.Names || []).join(",")
                                return (
                                    <div
                                        key={value}
                                        className={`opt-list-item ${isSelected("type", value) ? "selected" : ""}`}
                                        onClick={() => filterSelect("type", value)}
                                    >
                                        <span>{item.Verbose}</span>
                                        <span>{item.Total}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
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

export interface DeleteRiskFormProp {
    onClose: () => any
    types?: FieldNameSelectItem[]
    severities?: FieldNameSelectItem[]
}
interface RiskDetailsProp {
    info: Risk
    isShowTime?: boolean
    shrink?: boolean
}

export const RiskDetails: React.FC<RiskDetailsProp> = React.memo((props: RiskDetailsProp) => {
    const {info, isShowTime = true} = props
    const title = TitleColor.filter((item) => item.key.includes(info.Severity || ""))[0]

    return (
        <Descriptions
            title={
                <div className='container-title-body'>
                    <div className='title-icon'>
                        <img src={title?.img || infoImg} className='icon-img' />
                    </div>

                    <div className='title-header'>
                        <div className='header-name text-ellipsis' title={info?.TitleVerbose || info.Title}>
                            {info?.TitleVerbose || info.Title}
                        </div>

                        <div className='header-subtitle'>
                            <div className={`${title?.tag || "title-background-default"} subtitle-level`}>
                                {title ? title.name : info.Severity || "-"}
                            </div>
                            <div className='subtitle-spacing subtitle-url'>
                                Url
                                <Paragraph className='subtitle-font text-ellipsis' copyable ellipsis>
                                    {info?.Url || "-"}
                                </Paragraph>
                            </div>
                            {isShowTime && (
                                <div className='subtitle-spacing'>
                                    发现时间
                                    <span className='subtitle-font'>
                                        {info.CreatedAt > 0 ? formatTimestamp(info.CreatedAt) : "-"}
                                    </span>
                                </div>
                            )}
                            {isShowTime && (
                                <div>
                                    最近更新时间
                                    <span className='subtitle-font'>
                                        {info.CreatedAt > 0 ? formatTimestamp(info.CreatedAt) : "-"}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            }
            bordered
            size='small'
        >
            <Descriptions.Item label='IP'>
                <div>{info.IP || "-"}</div>
            </Descriptions.Item>
            <Descriptions.Item label='ID'>
                <div>{info.Id || "-"}</div>
            </Descriptions.Item>
            <Descriptions.Item label='端口'>
                <div>{info.Port || "-"}</div>
            </Descriptions.Item>

            <Descriptions.Item label='Host'>
                <div>{info.Host || "-"}</div>
            </Descriptions.Item>
            <Descriptions.Item label='类型'>
                <div>{info?.RiskTypeVerbose || info.RiskType}</div>
            </Descriptions.Item>
            <Descriptions.Item label='来源'>
                <div>{info?.FromYakScript || "漏洞检测"}</div>
            </Descriptions.Item>

            <Descriptions.Item label='反连Token'>
                <div>{info.ReverseToken || "-"}</div>
            </Descriptions.Item>
            <Descriptions.Item label='Hash'>
                <div>{info.Hash || "-"}</div>
            </Descriptions.Item>
            <Descriptions.Item label='验证状态'>
                <div style={{color: `${!info.WaitingVerified ? "#11AB4E" : "#FAAF2B"}`}}>
                    {!info.WaitingVerified ? "已验证" : "未验证"}
                </div>
            </Descriptions.Item>

            {!props.shrink && (
                <>
                    <Descriptions.Item label='Parameter' span={3}>
                        <div>{info.Parameter || "-"}</div>
                    </Descriptions.Item>
                    <Descriptions.Item label='Payload' span={3}>
                        <div>{info.Payload || "-"}</div>
                    </Descriptions.Item>
                    {(info?.Request || []).length > 0 && (
                        <Descriptions.Item label='Request' span={3}>
                            <div style={{height: 300}}>
                                <HTTPPacketEditor
                                    originValue={info?.Request || new Uint8Array()}
                                    readOnly={true}
                                    noHeader={true}
                                />
                            </div>
                        </Descriptions.Item>
                    )}
                    {(info?.Response || []).length > 0 && (
                        <Descriptions.Item label='Response' span={3}>
                            <div style={{height: 300}}>
                                <HTTPPacketEditor
                                    originValue={info?.Response || new Uint8Array()}
                                    readOnly={true}
                                    noHeader={true}
                                />
                            </div>
                        </Descriptions.Item>
                    )}
                    <Descriptions.Item label='详情' span={3}>
                        <div style={{maxHeight: 180, overflow: "auto"}}>{info.Details || "-"}</div>
                    </Descriptions.Item>
                </>
            )}
        </Descriptions>
    )
})
