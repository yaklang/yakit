import React, {useEffect, useRef, useState} from "react"
import {
    Button,
    Space,
    Table,
    Tag,
    Form,
    Typography,
    Descriptions,
    Popconfirm,
    Tooltip,
    Menu,
    Select,
    PageHeader, Row, Col
} from "antd"
import {WebShell, WebShellResponse} from "./schema"
import {genDefaultPagination, QueryGeneralRequest, QueryGeneralResponse} from "../invoker/schema"
import {useGetState, useMemoizedFn} from "ahooks"
import {formatTimestamp} from "@/utils/timeUtil"
import {ArrowsAltOutlined, ReloadOutlined, SearchOutlined, SwapOutlined} from "@ant-design/icons"
import {failed, success} from "@/utils/notification"
import {showModal} from "@/utils/showModal"
import {InputItem, ManyMultiSelectForString} from "@/utils/inputUtil"

import infoImg from "../../assets/riskDetails/info.png"
import highImg from "../../assets/riskDetails/high.png"
import fatalImg from "../../assets/riskDetails/fatal.png"
import middleImg from "../../assets/riskDetails/middle.png"
import lowImg from "../../assets/riskDetails/low.png"
import debugImg from "../../assets/riskDetails/debug.png"

import "./WebShellTable.css"
import {ExportExcel} from "../../components/DataExport/DataExport"
import {HTTPPacketEditor, YakCodeEditor} from "../../utils/editors"
import {onRemoveToolFC} from "../../utils/deleteTool"
import {showByContextMenu} from "../../components/functionTemplate/showByContext"
import {ColumnType} from "antd/lib/table"
import {WebShellFileTree} from "@/pages/webshellManager/WebShellFileTree";
import {AutoSpin} from "@/components/AutoSpin";
import {Uint8ArrayToString} from "@/utils/str";

export interface WebShellTableProp {
    severity?: string
}

export interface QueryWebShellsParams extends QueryGeneralRequest {
    Search?: string
    RiskType?: string
    Network?: string
    Severity?: string
    Tag?: string
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


const onAddShell = () => {
    const m = showModal({
        title: "添加WebShell", width: "60%", content: (
            <NewShell onChangeProject={() => {
                m.destroy()
            }}/>
        )
    })
}

interface NewShellProp {
    onChangeProject: () => any
}

const {Option} = Select

const NewShell: React.FC<NewShellProp> = (props) => {
    const [url, setUrl] = useState("");
    const [shell_type, setShellType] = useState("Behinder");
    const [script_type, setScriptType] = useState("JSP");
    const [pass, setPass] = useState("");
    const [secret_key, setSecretKey] = useState("");
    const [enc_mode, setEncMode] = useState("Base64");

    const onShellTypeChange = (value: string) => {
        setShellType(value)
    };
    const onScriptTypeChange = (value: string) => {
        setScriptType(value)
    };
    const onEncModeChange = (value: string) => {
        setEncMode(value)
    };

    return <Form
        labelCol={{span: 5}} wrapperCol={{span: 14}}
        onSubmitCapture={e => {
            e.preventDefault()
            console.log(e)
            console.log(url)
            console.log(shell_type)
            console.log(script_type)
            ipcRenderer.invoke("CreateWebShell", {
                Url: url,
                Pass: pass,
                ShellType: shell_type,
                ShellScript: script_type,
                SecretKey: secret_key,
                EncMode: enc_mode,
            }).then(e => {
                console.log(e)
                success("添加 Shell 成功")
            })
        }}
    >
        <InputItem label={`Url`} value={url} setValue={setUrl}/>
        <Form.Item name="shell_type" label={"Shell类型"}>
            <Select
                defaultValue={"Behinder"}
                onChange={onShellTypeChange}
            >
                <Option value="Behinder">Behinder</Option>
                <Option value="Godzilla">Godzilla</Option>
            </Select>
        </Form.Item>

        <Form.Item name="script_type" label={"脚本类型"}>
            <Select
                defaultValue={"JSP"}
                onChange={onScriptTypeChange}
            >
                <Option value="JSP">JSP</Option>
                <Option value="JSPX">JSPX</Option>
                <Option value="PHP">PHP</Option>
                <Option value="ASP">ASP</Option>
                <Option value="ASPX">ASPX</Option>
            </Select>
        </Form.Item>
        <InputItem label={`参数`} value={pass} setValue={setPass}
                   style={{display: shell_type == "Behinder" ? "none" : ""}}/>
        <InputItem label={`密钥`} value={secret_key} setValue={setSecretKey}/>
        <Form.Item name="enc_mode" label={"加密模式"} style={{display: shell_type == "Behinder" ? "none" : ""}}>
            <Select
                defaultValue={"Base64"}
                onChange={onEncModeChange}
            >
                <Option value="Base64">Base64</Option>
                <Option value="Raw">Raw</Option>
            </Select>
        </Form.Item>

        <Form.Item colon={false} label={" "}>
            <Button type="primary" htmlType="submit"> 新增 </Button>
        </Form.Item>
    </Form>
};

const EditShell: React.FC<WebShell> = (props) => {
    const [url, setUrl] = useState(props.Url);
    const [shell_type, setShellType] = useState(props.ShellType);
    const [script_type, setScriptType] = useState(props.ShellScript);
    const [pass, setPass] = useState(props.Pass);
    const [secret_key, setSecretKey] = useState(props.SecretKey);
    const [enc_mode, setEncMode] = useState(props.EncMode);

    const onShellTypeChange = (value: string) => {
        setShellType(value)
    };
    const onScriptTypeChange = (value: string) => {
        setScriptType(value)
    };

    const onEncModeChange = (value: string) => {
        setEncMode(value)
    };

    return <Form
        labelCol={{span: 5}} wrapperCol={{span: 14}}
        onSubmitCapture={e => {
            e.preventDefault()
            console.log(e)
            console.log(url)
            console.log(shell_type)
            console.log(script_type)
            ipcRenderer.invoke("UpdateWebShellById", {
                Id: props.Id,
                Url: url,
                Pass: pass,
                ShellType: shell_type,
                ShellScript: script_type,
                SecretKey: secret_key,
                EncMode: enc_mode,
            }).then(e => {
                success("编辑 Shell 成功")
            })
        }}
    >
        <InputItem label={`Url`} value={url} setValue={setUrl}/>
        <Form.Item name="shell_type" label={"Shell类型"}>
            <Select
                defaultValue={"Behinder"}
                onChange={onShellTypeChange}
            >
                <Option value="Behinder">Behinder</Option>
                <Option value="Godzilla">Godzilla</Option>
            </Select>
        </Form.Item>

        <Form.Item name="script_type" label={"脚本类型"}>
            <Select
                defaultValue={"JSP"}
                onChange={onScriptTypeChange}
            >
                <Option value="JSP">JSP</Option>
                <Option value="JSPX">JSPX</Option>
                <Option value="PHP">PHP</Option>
                <Option value="ASP">ASP</Option>
                <Option value="ASPX">ASPX</Option>
            </Select>
        </Form.Item>
        <InputItem label={`参数`} value={pass} setValue={setPass}
                   style={{display: shell_type == "Behinder" ? "none" : ""}}/>
        <InputItem label={`密钥`} value={secret_key} setValue={setSecretKey}/>
        <Form.Item name="enc_mode" label={"加密模式"} style={{display: shell_type == "Behinder" ? "none" : ""}}>
            <Select
                defaultValue={"Base64"}
                onChange={onEncModeChange}
            >
                <Option value="Base64">Base64</Option>
                <Option value="Raw">Raw</Option>
            </Select>
        </Form.Item>

        <Form.Item colon={false} label={" "}>
            <Button type="primary" htmlType="submit"> 新增 </Button>
        </Form.Item>
    </Form>
};

const BasicInfo: React.FC<WebShellResponse<any>> = (props) => {
    const [text, setText] = useState(new Buffer(props.Data).toString());

    useEffect(() => {
        setText(new Buffer(props.Data).toString());
    }, [props.Data]);

    const jsonData = JSON.parse(text);
    const basicInfo = jsonData.basicInfo;

    return <div >
        <pre><code dangerouslySetInnerHTML={{__html: basicInfo}}/></pre>
    </div>
}

export const WebShellTable: React.FC<WebShellTableProp> = (props) => {
    const [response, setResponse] = useState<QueryGeneralResponse<WebShell>>({
        Data: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    })
    const [params, setParams, getParams] = useGetState<QueryWebShellsParams>({
        Tag: props.severity,
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

    const [selected, setSelected, getSelected] = useGetState<WebShell>()

    const time = useRef<any>(null)

    const update = useMemoizedFn((page?: number, limit?: number, order?: string, orderBy?: string, extraParam?: any) => {
            const paginationProps = {
                Page: page || 1,
                Limit: limit || pagination.Limit
            }
            setLoading(true)
            ipcRenderer
                .invoke("QueryWebShells", {
                    ...getParams(),
                    ...(extraParam ? extraParam : {}),
                    Pagination: paginationProps
                })
                .then((r: QueryGeneralResponse<any>) => {
                    setResponse(r)
                    setSelectedRowKeys([])
                })
                .catch((e) => {
                    failed(`QueryWebShells failed: ${e}`)
                })
                .finally(() => setTimeout(() => setLoading(false), 300))
        }
    )

    const delRisk = useMemoizedFn((hash: string) => {
        setLoading(true)
        ipcRenderer
            .invoke("DeleteRisk", {Hash: hash})
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
            title: "类型",
            dataIndex: "ShellType",
            width: 70,
            filteredValue: (getParams()["ShellType"]) || null,
            render: (_, i: WebShell) => i.ShellType === "Behinder" ? <Tag color={"geekblue"}>B</Tag> :
                <Tag color={"orange"}>G</Tag>,
            filterIcon: (filtered) => {
                return params && <SearchOutlined style={{color: filtered ? "#1890ff" : undefined}}/>
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
            title: "Url",
            dataIndex: "Url",
            render: (_, i: WebShell) => (
                <Paragraph style={{maxWidth: 400, marginBottom: 0}} ellipsis={{tooltip: true}}>
                    {i.Url}
                </Paragraph>
            ),
            width: 320,
            filteredValue: (getParams()["Search"] && ["Url"]) || null,
            filterIcon: (filtered) => {
                return params && <SearchOutlined style={{color: filtered ? "#1890ff" : undefined}}/>
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
            title: "备注",
            dataIndex: "Tag",
            render: (_, i: WebShell) => i?.Tag
        },
        {
            title: "添加时间",
            dataIndex: "CreatedAt",
            render: (_, i: WebShell) => <Tag>{i.CreatedAt > 0 ? formatTimestamp(i.CreatedAt) : "-"}</Tag>
        },
        {
            title: "是否存活",
            dataIndex: "State",
            render: (_, i: WebShell) => i.State ? "✅" :
                "❌",
        }
        // {
        //     title: "操作",
        //     dataIndex: "Action",
        //     render: (_, i: WebShell) => {
        //         return (
        //             <Space>
        //                 <Button
        //                     size='small'
        //                     type={"link"}
        //                     onClick={() => {
        //                         showModal({
        //                             width: "80%",
        //                             title: "详情",
        //                             content: (
        //                                 <div style={{overflow: "auto"}}>
        //                                     <RiskDetails info={i}/>
        //                                 </div>
        //                             )
        //                         })
        //                     }}
        //                 >
        //                     详情
        //                 </Button>
        //                 <Button size='small' type={"link"} danger onClick={() => delRisk(i.Hash)}>
        //                     删除
        //                 </Button>
        //             </Space>
        //         )
        //     }
        // }
    ]

    const onRemove = useMemoizedFn(() => {
        const transferParams = {
            selectedRowKeys,
            params,
            interfaceName: "DeleteWebShell"
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
            Severity: props.severity,
            Pagination: genDefaultPagination(20)
        })
        setTimeout(() => {
            update()
        }, 10)
    })
    return (
        <div className='risk-table-container'>
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
            </div>

            <div className='container-table'>
                <Table<WebShell>
                    title={() => {
                        return (
                            <div>
                                <div className='table-title'>
                                    <Space>
                                        WebShell
                                        <Tooltip title='刷新会重置所有查询条件'>
                                            <Button
                                                size={"small"}
                                                type={"link"}
                                                onClick={() => {
                                                    refList()
                                                }}
                                                icon={<ReloadOutlined/>}
                                            />
                                        </Tooltip>
                                    </Space>
                                    <Space>

                                        <Button size='small' type={"primary"} onClick={() => {
                                            onAddShell()
                                        }}>
                                            添加 Shell
                                        </Button>
                                        <Popconfirm
                                            title={
                                                selectedRowKeys.length > 0
                                                    ? "确定删除选择的 Shell 吗？不可恢复"
                                                    : "确定删除所有 Shell 吗? 不可恢复"
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
                                    data: [
                                        {key: "update_shell", title: "编辑数据"},
                                        {key: "ping_shell", title: "验证存活"},
                                        {key: "get_basic_info", title: "获取信息"},
                                        {key: "file_opt_shell", title: "文件管理"},
                                    ],
                                    onClick: ({key}) => {
                                        if (key === "update_shell") {
                                            showModal({
                                                title: "编辑WebShell", width: "60%", content: (
                                                    <EditShell {...record}/>
                                                )
                                            })
                                        } else if (key === "ping_shell") {
                                            ipcRenderer.invoke("Ping", {
                                                Id: record.Id
                                            }).then(e => {
                                                console.log(e)
                                                if (e.State) {
                                                    success("Ping Success!")
                                                } else {
                                                    success("Ping Fail!")
                                                }
                                            }).catch((e: any) => {
                                                console.log(e.message)
                                                failed(e.message)
                                            })
                                        } else if (key === "get_basic_info") {
                                            ipcRenderer.invoke("GetBasicInfo", {
                                                Id: record.Id
                                            }).then((e: WebShellResponse<any>) => {
                                                console.log(typeof e)
                                                if (e.State) {
                                                    showModal({
                                                        title: record.Url + "-基础信息",
                                                        width: "60%",
                                                        content: (
                                                            <div style={{height: 600,overflow: "auto"}}>
                                                                <BasicInfo {...e}/>
                                                            </div>
                                                        )
                                                    })
                                                } else {
                                                    failed("Ping Fail!")
                                                }
                                            }).catch((e: any) => {
                                                console.log(e.message)
                                                failed(e.message)
                                            })

                                        } else if (key === "file_opt_shell") {
                                            showModal({
                                                title: record.Url + "-文件管理", width: "60%", content: (
                                                    <WebShellFileTree {...record}/>
                                                )
                                            })
                                        }

                                    }
                                })
                            }
                        }
                    }}
                />
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

export type FilterDropdownStringProp = TableFilterDropdownStringProp<QueryWebShellsParams>

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


// export const RiskDetails: React.FC<RiskDetailsProp> = React.memo((props: RiskDetailsProp) => {
//     const {info, isShowTime = true} = props
//     const title = TitleColor.filter((item) => item.key.includes(info.Severity || ""))[0]
//     const [shrink, setShrink] = useState(!!props.shrink);
//
//     return (
//         <Descriptions
//             title={
//                 <div className='container-title-body'>
//                     <div className='title-icon'>
//                         <img src={title?.img || infoImg} className='icon-img'/>
//                     </div>
//
//                     <div className='title-header'>
//                         <div className='header-name text-ellipsis' title={info?.TitleVerbose || info.Title}>
//                             <Space>
//                                 {info?.TitleVerbose || info.Title}
//                                 <Button
//                                     type={"link"} size={"small"}
//                                     onClick={()=>{
//                                         setShrink(!shrink)
//                                     }}
//                                 >{shrink ? `展开详情` : `折叠详情`}</Button>
//                             </Space>
//                         </div>
//
//                         <div className='header-subtitle'>
//                             <div className={`${title?.tag || "title-background-default"} subtitle-level`}>
//                                 {title ? title.name : info.Severity || "-"}
//                             </div>
//                             <div className='subtitle-spacing subtitle-url'>
//                                 Url
//                                 <Paragraph className='subtitle-font text-ellipsis' copyable ellipsis>
//                                     {info?.Url || "-"}
//                                 </Paragraph>
//                             </div>
//                             {isShowTime && (
//                                 <div className='subtitle-spacing'>
//                                     发现时间
//                                     <span className='subtitle-font'>
//                                         {info.CreatedAt > 0 ? formatTimestamp(info.CreatedAt) : "-"}
//                                     </span>
//                                 </div>
//                             )}
//                             {isShowTime && (
//                                 <div>
//                                     最近更新时间
//                                     <span className='subtitle-font'>
//                                         {info.CreatedAt > 0 ? formatTimestamp(info.CreatedAt) : "-"}
//                                     </span>
//                                 </div>
//                             )}
//                         </div>
//                     </div>
//                 </div>
//             }
//             bordered
//             size='small'
//         >
//             <Descriptions.Item label='IP'>
//                 <div>{info.IP || "-"}</div>
//             </Descriptions.Item>
//             <Descriptions.Item label='ID'>
//                 <div>{info.Id || "-"}</div>
//             </Descriptions.Item>
//             <Descriptions.Item label='端口'>
//                 <div>{info.Port || "-"}</div>
//             </Descriptions.Item>
//
//             <Descriptions.Item label='Host'>
//                 <div>{info.Host || "-"}</div>
//             </Descriptions.Item>
//             <Descriptions.Item label='类型'>
//                 <div>{info?.RiskTypeVerbose || info.RiskType}</div>
//             </Descriptions.Item>
//             <Descriptions.Item label='来源'>
//                 <div>{info?.FromYakScript || "漏洞检测"}</div>
//             </Descriptions.Item>
//
//             <Descriptions.Item label='反连Token'>
//                 <div>{info.ReverseToken || "-"}</div>
//             </Descriptions.Item>
//             <Descriptions.Item label='Hash'>
//                 <div>{info.Hash || "-"}</div>
//             </Descriptions.Item>
//             <Descriptions.Item label='验证状态'>
//                 <div style={{color: `${!info.WaitingVerified ? "#11AB4E" : "#FAAF2B"}`}}>
//                     {!info.WaitingVerified ? "已验证" : "未验证"}
//                 </div>
//             </Descriptions.Item>
//
//             {!shrink && (
//                 <>
//                     <Descriptions.Item label='Parameter' span={3}>
//                         <div>{info.Parameter || "-"}</div>
//                     </Descriptions.Item>
//                     <Descriptions.Item label='Payload' span={3}>
//                         <div>{info.Payload || "-"}</div>
//                     </Descriptions.Item>
//                     {(info?.Request || []).length > 0 && (
//                         <Descriptions.Item label='Request' span={3}>
//                             <div style={{height: 300}}>
//                                 <HTTPPacketEditor
//                                     originValue={info?.Request || new Uint8Array()}
//                                     readOnly={true}
//                                     noHeader={true}
//                                 />
//                             </div>
//                         </Descriptions.Item>
//                     )}
//                     {(info?.Response || []).length > 0 && (
//                         <Descriptions.Item label='Response' span={3}>
//                             <div style={{height: 300}}>
//                                 <HTTPPacketEditor
//                                     originValue={info?.Response || new Uint8Array()}
//                                     readOnly={true}
//                                     noHeader={true}
//                                 />
//                             </div>
//                         </Descriptions.Item>
//                     )}
//                     <Descriptions.Item label='详情' span={3}>
//                         <div style={{maxHeight: 180, overflow: "auto"}}>{`${info.Details}` || "-"}</div>
//                     </Descriptions.Item>
//                 </>
//             )}
//         </Descriptions>
//     )
// })