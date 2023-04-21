import React, {useEffect, useRef, useState} from "react"
import {Table, Space, Tooltip, Typography, Form} from "antd"
import {ReloadOutlined} from "@ant-design/icons"
import {useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {formatTimestamp} from "@/utils/timeUtil"
import {showModal} from "@/utils/showModal"
import styles from "./HoleCollectPage.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {ExportExcel} from "../../components/DataExport/DataExport"
import {genDefaultPagination, QueryGeneralRequest, QueryGeneralResponse} from "../invoker/schema"
import {TitleColor} from "../risks/RiskTable"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {PaginationSchema} from "../../pages/invoker/schema"
import {RiskDetails, cellColorFontSetting} from "../risks/RiskTable"
import {Risk} from "../risks/schema"
const {ipcRenderer} = window.require("electron")
const {Paragraph} = Typography
const {Option} = YakitSelect
export interface HoleCollectPageProps {}

export const HoleCollectPage: React.FC<HoleCollectPageProps> = (props) => {
    const [response, setResponse] = useState<API.RiskLists[]>([])
    const [params, setParams, getParams] = useGetState<PaginationSchema>({
        ...genDefaultPagination(20)
    })
    const [RiskType, setRiskType] = useState<API.RiskTypes[]>([])
    const [total, setTotal] = useState<number>(0)
    const [loading, setLoading] = useState<boolean>(false)
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

    const [form] = Form.useForm()
    const newbodyParams = useRef<API.GetRiskWhere>({})
    useEffect(() => {
        getRiskType()
        update()
    }, [])

    const onFinish = useMemoizedFn((values) => {
        const {net_work, risk_type, search, severity, user_name} = values
        let obj = {
            search,
            risk_type: risk_type ? risk_type.join(",") : undefined,
            severity: severity === "all" ? undefined : severity,
            net_work,
            user_name
        }
        newbodyParams.current = obj
        update()
    })

    const reset = useMemoizedFn(() => {
        form.resetFields()
        newbodyParams.current = {}
        update()
    })

    const getRiskType = () => {
        NetWorkApi<any, API.RiskTypeResponse>({
            method: "get",
            url: "risk/type",
            params: {}
        })
            .then((res) => {
                if (res) {
                    setRiskType(res.data)
                }
            })
            .catch((e) => {
                failed(`QueryRisks failed: ${e}`)
            })
            .finally(() => {})
    }

    const update = useMemoizedFn((page?: number, limit?: number) => {
        const paginationProps = {
            page: page || 1,
            limit: limit || 20
        }
        setLoading(true)
        NetWorkApi<any, API.RiskUploadResponse>({
            method: "get",
            url: "risk",
            params: {...paginationProps},
            data: newbodyParams.current
        })
            .then((res) => {
                setResponse(res.data || [])
                setTotal(res.pagemeta.total)
                setParams({...getParams(), Page: res.pagemeta.page, Limit: res.pagemeta.limit})
                setSelectedRowKeys([])
            })
            .catch((e) => {
                failed(`QueryRisks failed: ${e}`)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 300)
            })
    })

    const delRisk = (hash?: string[]) => {
        setLoading(true)
        let obj: API.GetRiskWhere = {}
        if (hash) {
            obj.hash = hash
        }
        NetWorkApi<API.GetRiskWhere, API.ActionSucceeded>({
            method: "delete",
            url: "risk",
            data: obj
        })
            .then((res) => {
                if (res.ok) {
                    success("删除成功")
                    setSelectedRowKeys([])
                    update()
                }
            })
            .catch((e) => {
                setLoading(false)
                failed(`QueryRisks failed: ${e}`)
            })
            .finally(() => {})
    }

    const delItem = useMemoizedFn((hash: string) => {
        delRisk([hash])
    })

    const columns = [
        {
            title: "标题",
            dataIndex: "title_verbose",
            render: (_, i: API.RiskLists) => (
                <Paragraph style={{maxWidth: 400, marginBottom: 0}} ellipsis={{tooltip: true}}>
                    {i?.title_verbose || i.title}
                </Paragraph>
            ),
            width: 400
        },
        {
            title: "类型",
            dataIndex: "risk_type_verbose",
            width: 90,
            render: (_, i: API.RiskLists) => i?.risk_type_verbose || i.risk_type
        },
        {
            title: "等级",
            dataIndex: "severity",
            render: (_, i: API.RiskLists) => {
                const title = TitleColor.filter((item) => item.key.includes(i.severity || ""))[0]
                return <span className={title?.value || "title-default"}>{title ? title.name : i.severity || "-"}</span>
            },
            width: 90
        },
        {
            title: "ip",
            dataIndex: "ip",
            render: (_, i: API.RiskLists) => i?.ip || "-"
        },
        {
            title: "Token",
            dataIndex: "reverse_token",
            render: (_, i: API.RiskLists) => (
                <Paragraph style={{maxWidth: 400, marginBottom: 0}} ellipsis={{tooltip: true}}>
                    {i?.reverse_token || "-"}
                </Paragraph>
            ),
            width: 400
        },
        {
            title: "上传账号",
            dataIndex: "user_name",
            render: (_, i: API.RiskLists) => <div style={{minWidth: 120}}>{i?.user_name}</div>
        },
        {
            title: "发现时间",
            dataIndex: "risk_created_at",
            render: (_, i: API.RiskLists) => (
                <YakitTag>{i.risk_created_at > 0 ? formatTimestamp(i.risk_created_at) : "-"}</YakitTag>
            )
        },
        {
            title: "操作",
            dataIndex: "action",
            render: (_, i: API.RiskLists) => {
                return (
                    <Space>
                        <YakitButton
                            type={"text"}
                            onClick={() => {
                                let info: Risk = {
                                    Hash: i.hash,
                                    IP: i.ip,
                                    Url: i.url,
                                    Port: i.port + "",
                                    Host: i.host,
                                    Title: i.title,
                                    TitleVerbose: i.title_verbose,
                                    Description: i.description,
                                    Solution: i.solution,
                                    RiskType: i.risk_type,
                                    RiskTypeVerbose: i.risk_type_verbose,
                                    Parameter: i.parameter,
                                    Payload: i.payload,
                                    Details: i.details,
                                    FromYakScript: i.from_yak_script,
                                    WaitingVerified: i.waiting_verified,
                                    ReverseToken: i.reverse_token,
                                    Id: i.id,
                                    CreatedAt: i.created_at,
                                    UpdatedAt: i.updated_at,
                                    Severity: i.severity,
                                    RuntimeId: i.runtime_id
                                }
                                showModal({
                                    width: "80%",
                                    title: "详情",
                                    content: (
                                        <div style={{overflow: "auto"}}>
                                            <RiskDetails
                                                info={info}
                                                quotedRequest={i.quoted_request}
                                                quotedResponse={i.quoted_response}
                                            />
                                        </div>
                                    )
                                })
                            }}
                        >
                            详情
                        </YakitButton>
                        <YakitPopconfirm
                            title={"确定删除该漏洞吗？"}
                            onConfirm={() => {
                                delItem(i.hash)
                            }}
                        >
                            <YakitButton type={"text"} danger style={{color: "red"}}>
                                删除
                            </YakitButton>
                        </YakitPopconfirm>
                    </Space>
                )
            }
        }
    ]

    const formatJson = (filterVal, jsonData) => {
        return jsonData.map((v, index) =>
            filterVal.map((j) => {
                if (j === "risk_created_at") {
                    return formatTimestamp(v[j])
                } else if (j === "severity") {
                    const title = TitleColor.filter((item) => item.key.includes(v[j] || ""))[0]
                    return title ? title.name : v[j] || "-"
                } else if (j === "risk_type_verbose") {
                    return v[j] || v["risk_type"]
                } else if (j === "title_verbose") {
                    return v[j] || v["title"]
                } else {
                    return v[j]
                }
            })
        )
    }

    const getData = useMemoizedFn((query: {Limit: number; Page: number}) => {
        return new Promise((resolve) => {
            const paginationProps = {
                page: query.Page || 1,
                limit: query.Limit || 20
            }
            NetWorkApi<any, API.RiskUploadResponse>({
                method: "get",
                url: "risk",
                params: {...paginationProps},
                data: newbodyParams.current
            })
                .then((res) => {
                    const newRes = {
                        Data: res.data,
                        Pagination: {
                            Page: res.pagemeta.page,
                            Limit: res.pagemeta.limit
                        },
                        Total: res.pagemeta.total
                    }
                    //    数据导出
                    let exportData: any = []
                    const header: string[] = []
                    const filterVal: string[] = []
                    columns.forEach((item) => {
                        if (item.dataIndex !== "action") {
                            header.push(item.title)
                            filterVal.push(item.dataIndex)
                        }
                    })
                    exportData = formatJson(filterVal, newRes.Data || [])
                    resolve({
                        header,
                        exportData,
                        response: newRes,
                        optsSingleCellSetting: {
                            c: 2, // 第三列，
                            colorObj: cellColorFontSetting // 字体颜色设置
                        }
                    })
                })
                .catch((e) => {
                    failed("数据导出失败 " + `${e}`)
                })
                .finally(() => {})
        })
    })

    const onRemove = useMemoizedFn(() => {
        // 删除选中项
        if (selectedRowKeys.length > 0) {
            delRisk(selectedRowKeys)
        }
        // 全删
        else {
            delRisk()
        }
    })

    return (
        <div className={styles["hole-collect"]}>
            <Table<API.RiskLists>
                title={() => {
                    return (
                        <div>
                            <div className={styles["table-title"]}>
                                <Space>
                                    风险与漏洞
                                    <Tooltip title='刷新会重置所有查询条件'>
                                        <YakitButton
                                            size={"small"}
                                            type={"text"}
                                            onClick={() => {
                                                reset()
                                            }}
                                            icon={<ReloadOutlined style={{position: "relative", top: 2}} />}
                                        />
                                    </Tooltip>
                                </Space>
                                <Space>
                                    <ExportExcel getData={getData} fileName='风险与漏洞' newUI={true} />
                                    <YakitPopconfirm
                                        title={
                                            selectedRowKeys.length > 0
                                                ? "确定删除选择的风险与漏洞吗？不可恢复"
                                                : "确定删除所有风险与漏洞吗? 不可恢复"
                                        }
                                        onConfirm={onRemove}
                                    >
                                        <YakitButton danger={true} type='danger'>
                                            删除数据
                                        </YakitButton>
                                    </YakitPopconfirm>
                                </Space>
                            </div>
                            <div className={styles["filter-box"]}>
                                <Form
                                    onFinish={onFinish}
                                    form={form}
                                    layout='inline'
                                    className={styles["filter-box-form"]}
                                >
                                    <Form.Item name='search' label='漏洞标题'>
                                        <YakitInput style={{width: 180}} placeholder='请输入漏洞标题' allowClear />
                                    </Form.Item>
                                    <Form.Item name='risk_type' label='漏洞类型'>
                                        <YakitSelect
                                            mode='multiple'
                                            allowClear
                                            style={{width: 180}}
                                            placeholder='请选择漏洞类型'
                                        >
                                            {RiskType.map((item) => {
                                                return <Option key={item.risk_type}>{item.risk_type}</Option>
                                            })}
                                        </YakitSelect>
                                    </Form.Item>
                                    <Form.Item name='net_work' label='IP'>
                                        <YakitInput placeholder='请输入IP' allowClear style={{width: 180}} />
                                    </Form.Item>
                                    <Form.Item name='severity' label='漏洞级别'>
                                        <YakitSelect defaultValue='all' style={{width: 180}}>
                                            <Option value='all'>全部</Option>
                                            <Option value='info'>信息/指纹</Option>
                                            <Option value='critical'>严重</Option>
                                            <Option value='high'>高危</Option>
                                            <Option value='warning'>中危</Option>
                                            <Option value='low'>低危</Option>
                                        </YakitSelect>
                                    </Form.Item>
                                    <Form.Item name='user_name' label='上传账号'>
                                        <YakitInput style={{width: 180}} placeholder='请输入上传账号' allowClear />
                                    </Form.Item>
                                </Form>
                                <div className={styles["filter-btn"]}>
                                    <YakitButton
                                        type='primary'
                                        onClick={() => {
                                            form.submit()
                                        }}
                                    >
                                        搜索
                                    </YakitButton>
                                </div>
                            </div>
                        </div>
                    )
                }}
                size={"small"}
                bordered={true}
                columns={columns}
                scroll={{x: "auto"}}
                rowKey={(e) => e.hash}
                loading={loading}
                dataSource={response}
                pagination={{
                    current: +getParams().Page,
                    pageSize: getParams().Limit,
                    showSizeChanger: true,
                    total: total,
                    showTotal: (total) => <YakitTag>Total:{total}</YakitTag>,
                    pageSizeOptions: ["5", "10", "20"]
                }}
                onChange={(pagination) => {
                    const current = pagination.current
                    update(+getParams().Page === current ? 1 : current, pagination.pageSize)
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
                            // showByContextMenu({
                            //     data: [{key: "delect-repeat", title: "删除重复标题数据"}],
                            //     onClick: ({key}) => {
                            //         if (key === "delect-repeat") {
                            //             const newParams = {
                            //                 DeleteRepetition: true,
                            //                 Id: record.Id,
                            //                 Filter: {
                            //                     Search: record?.TitleVerbose || record.Title,
                            //                     Network: record?.IP,
                            //                 }
                            //             }
                            //             ipcRenderer
                            //                 .invoke("DeleteRisk", newParams)
                            //                 .then(() => {
                            //                     update()
                            //                 })
                            //                 .catch((e: any) => {
                            //                     failed(`DeleteRisk failed: ${e}`)
                            //                 })
                            //         }
                            //     }
                            // })
                        }
                    }
                }}
            />
        </div>
    )
}
