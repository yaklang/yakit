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
const {ipcRenderer} = window.require("electron")
const {Paragraph} = Typography
const {Option} = YakitSelect
export interface HoleCollectPageProps {}

interface QueryHoleCollectParams {}

interface Risk {
    Hash: string
    IP: string
    Url?: string
    Port?: string
    Host?: string

    Title: string
    TitleVerbose?: string
    Description?: string
    Solution?: string
    RiskType: string
    RiskTypeVerbose?: string
    Parameter?: string
    Payload?: string
    Details?: string | Object

    FromYakScript?: string
    WaitingVerified?: boolean
    ReverseToken?: string

    Id: number
    CreatedAt: number
    UpdatedAt?: number

    Severity?: string

    Request?: Uint8Array
    Response?: Uint8Array
    RuntimeId?: string
}

export const HoleCollectPage: React.FC<HoleCollectPageProps> = (props) => {
    const [response, setResponse] = useState<QueryGeneralResponse<Risk>>({
        Data: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    })
    const [params, setParams, getParams] = useGetState<QueryHoleCollectParams>({
        Pagination: genDefaultPagination(20)
    })
    const total = response.Total
    const pagination = response.Pagination
    const page = response.Pagination.Page
    const limit = response.Pagination.Limit
    const [loading, setLoading] = useState<boolean>(false)
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

    const [form] = Form.useForm()

    useEffect(() => {
        update()
    }, [])

    const onFinish = useMemoizedFn((values) => {
        console.log("values", values)
        update()
    })

    const reset = useMemoizedFn(() => {
        form.resetFields()
        update()
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
                    ...getParams(),
                    ...(extraParam ? extraParam : {}),
                    Pagination: paginationProps
                })
                .then((r: QueryGeneralResponse<any>) => {
                    setResponse(r)
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
            .invoke("DeleteRisk", {Hash: hash})
            .then(() => {
                update(1)
            })
            .catch((e) => {
                failed(`DelRisk failed: ${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    const columns = [
        {
            title: "标题",
            dataIndex: "TitleVerbose",
            render: (_, i: Risk) => (
                <Paragraph style={{maxWidth: 400, marginBottom: 0}} ellipsis={{tooltip: true}}>
                    {i?.TitleVerbose || i.Title}
                </Paragraph>
            ),
            width: 400
        },
        {
            title: "类型",
            dataIndex: "RiskTypeVerbose",
            width: 90,
            render: (_, i: Risk) => i?.RiskTypeVerbose || i.RiskType
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
            render: (_, i: Risk) => i?.IP || "-"
        },
        {
            title: "Token",
            dataIndex: "ReverseToken",
            render: (_, i: Risk) => (
                <Paragraph style={{maxWidth: 400, marginBottom: 0}} ellipsis={{tooltip: true}}>
                    {i?.ReverseToken || "-"}
                </Paragraph>
            ),
            width: 400
        },
        {
            title: "上传账号",
            dataIndex: "IP111",
            render: (_, i: Risk) => <div style={{minWidth:120}}>{"-"}</div>,
        },
        {
            title: "发现时间",
            dataIndex: "CreatedAt",
            render: (_, i: Risk) => <YakitTag>{i.CreatedAt > 0 ? formatTimestamp(i.CreatedAt) : "-"}</YakitTag>
        },
        {
            title: "操作",
            dataIndex: "Action",
            render: (_, i: Risk) => {
                return (
                    <Space>
                        <YakitButton
                            type={"text"}
                            onClick={() => {
                                showModal({
                                    width: "80%",
                                    title: "详情",
                                    content: <div style={{overflow: "auto"}}>{/* <RiskDetails info={i}/> */}</div>
                                })
                            }}
                        >
                            详情
                        </YakitButton>
                        <YakitButton type={"text"} danger onClick={() => delRisk(i.Hash)} style={{color: "red"}}>
                            删除
                        </YakitButton>
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
                    // let exportData: any = []
                    // const header: string[] = []
                    // const filterVal: string[] = []
                    // columns.forEach((item) => {
                    //     if (item.dataIndex !== "Action") {
                    //         header.push(item.title)
                    //         filterVal.push(item.dataIndex)
                    //     }
                    // })
                    // exportData = formatJson(filterVal, Data)
                    // resolve({
                    //     header,
                    //     exportData,
                    //     response: res,
                    //     optsSingleCellSetting: {
                    //         c: 2, // 第三列，
                    //         colorObj: cellColorFontSetting // 字体颜色设置
                    //     }
                    // })
                })
                .catch((e) => {
                    failed("数据导出失败 " + `${e}`)
                })
        })
    })

    const refList = useMemoizedFn(() => {
        setParams({
            Pagination: genDefaultPagination(20)
        })
        setTimeout(() => {
            update()
        }, 10)
    })

    const onRemove = useMemoizedFn(() => {
        const transferParams = {
            selectedRowKeys,
            params,
            interfaceName: "DeleteRisk"
        }
        setLoading(true)
        // onRemoveToolFC(transferParams)
        //     .then(() => {
        //         refList()
        //     })
        //     .finally(() => setTimeout(() => setLoading(false), 300))
    })

    return (
        <div className={styles["hole-collect"]}>
            <Table<Risk>
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
                                                refList()
                                            }}
                                            icon={<ReloadOutlined style={{position:"relative",top:2}} />}
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
                                    <Form.Item name='Search' label='漏洞标题'>
                                        <YakitInput style={{width: 180}} placeholder='请输入漏洞标题' allowClear />
                                    </Form.Item>
                                    <Form.Item name='RiskType' label='漏洞类型'>
                                        <YakitSelect
                                            mode='multiple'
                                            allowClear
                                            style={{width: 180}}
                                            placeholder='请选择漏洞类型'
                                        >
                                            <Option key={1}>2</Option>
                                        </YakitSelect>
                                    </Form.Item>
                                    <Form.Item name='Network' label='IP'>
                                        <YakitInput placeholder='请输入IP' allowClear style={{width: 180}} />
                                    </Form.Item>
                                    <Form.Item name='user_name3' label='漏洞级别'>
                                        <YakitSelect defaultValue='all' style={{width: 180}}>
                                            <Option value='all'>全部</Option>
                                            <Option value='lucy'>信息/指纹</Option>
                                            <Option value='Yiminghe'>严重</Option>
                                            <Option value='Yiminghe1'>高危</Option>
                                            <Option value='Yiminghe2'>中危</Option>
                                            <Option value='Yiminghe3'>低危</Option>
                                        </YakitSelect>
                                    </Form.Item>
                                    <Form.Item name='user_name4' label='上传账号'>
                                        <YakitSelect
                                            mode='multiple'
                                            allowClear
                                            style={{width: 180}}
                                            placeholder='请选择上传账号'
                                        >
                                            <Option key={1}>2</Option>
                                        </YakitSelect>
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
                                    <YakitButton type='outline2' onClick={reset}>
                                        重置
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
                rowKey={(e) => e.Id}
                loading={loading}
                dataSource={response.Data}
                pagination={{
                    current: +page,
                    pageSize: limit,
                    showSizeChanger: true,
                    total: total,
                    showTotal: (total) => <YakitTag>Total:{total}</YakitTag>,
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
