import React, {ReactNode, useEffect, useRef, useState} from "react"
import {Table, Space, Button, Input, Modal, Form, Popconfirm, Tag, Avatar} from "antd"
import {} from "@ant-design/icons"
import {API} from "@/services/swagger/resposeType"
import {callCopyToClipboard} from "@/utils/basic"
import {useGetState, useMemoizedFn} from "ahooks"
import moment from "moment"
import {failed, success, warn} from "@/utils/notification"
import {NetWorkApi} from "@/services/fetch"
import {showModal} from "@/utils/showModal"
import {PaginationSchema} from "@/pages/invoker/schema"
import type {ColumnsType} from "antd/es/table"
import style from "./DynamicControl.module.scss"

const {ipcRenderer} = window.require("electron")

export interface DynamicControlProps {}

export const DynamicControl: React.FC<DynamicControlProps> = (props) => {
    return <div></div>
}

export interface ShowUserInfoProps extends API.NewUrmResponse {
    onClose: () => void
}
const ShowUserInfo: React.FC<ShowUserInfoProps> = (props) => {
    const {user_name, password, onClose} = props
    const copyUserInfo = () => {
        callCopyToClipboard(`用户名：${user_name}\n密码：${password}`)
    }
    return (
        <div style={{padding: "0 10px"}}>
            <div>
                用户名：<span>{user_name}</span>
            </div>
            <div>
                密码：<span>{password}</span>
            </div>
            <div style={{textAlign: "center", paddingTop: 10}}>
                <Button type='primary' onClick={() => copyUserInfo()}>
                    复制
                </Button>
            </div>
        </div>
    )
}

export interface ControlAdminPageProps {}
export interface AccountAdminPageProp {}

export interface QueryExecResultsParams {
    keywords: string
}

interface QueryProps {}

export const ControlAdminPage: React.FC<ControlAdminPageProps> = (props) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [params, setParams, getParams] = useGetState<QueryExecResultsParams>({
        keywords: ""
    })
    const [pagination, setPagination] = useState<PaginationSchema>({
        Limit: 20,
        Order: "desc",
        OrderBy: "updated_at",
        Page: 1
    })
    const [data, setData] = useState<API.UrmUserList[]>([])
    const [total, setTotal] = useState<number>(0)

    const update = (page?: number, limit?: number, order?: string, orderBy?: string) => {
        setLoading(true)
        const paginationProps = {
            page: page || 1,
            limit: limit || pagination.Limit
        }

        NetWorkApi<QueryProps, API.UrmUserListResponse>({
            method: "get",
            url: "urm",
            params: {
                ...params,
                ...paginationProps
            }
        })
            .then((res) => {
                const newData = res.data.map((item) => ({...item}))
                console.log("数据源：", newData)
                setData(newData)
                setPagination({...pagination, Limit: res.pagemeta.limit})
                setTotal(res.pagemeta.total)
            })
            .catch((err) => {
                failed("获取账号列表失败：" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    }

    useEffect(() => {
        update()
    }, [])

    const judgeAvatar = (record) => {
        const {head_img, user_name} = record
        return head_img && !!head_img.length ? (
            <Avatar size={32} src={head_img} />
        ) : (
            <Avatar size={32} style={{backgroundColor: "rgb(245, 106, 0)"}}>
                {user_name.slice(0, 1)}
            </Avatar>
        )
    }

    const columns: ColumnsType<API.UrmUserList> = [
        {
            title: "用户名",
            dataIndex: "user_name",
            render: (text: string, record) => (
                <div>
                    {judgeAvatar(record)}
                    <span style={{marginLeft: 10}}>{text}</span>
                </div>
            )
        },
        {
            title: "创建时间",
            dataIndex: "created_at",
            render: (text) => <span>{moment.unix(text).format("YYYY-MM-DD HH:mm")}</span>
        },
        {
            title: "操作",
            render: (i) => (
                <Space>
                    <Button size='small' type='primary'>
                        复制密钥
                    </Button>
                </Space>
            )
        }
    ]
    return (
        <div className='control-admin-page'>
            <Table
                loading={loading}
                pagination={{
                    size: "small",
                    defaultCurrent: 1,
                    pageSize: pagination?.Limit || 10,
                    showSizeChanger: true,
                    total,
                    showTotal: (i) => <Tag>{`Total ${i}`}</Tag>,
                    onChange: (page: number, limit?: number) => {
                        update(page, limit)
                    }
                }}
                rowKey={(row) => row.uid}
                title={(e) => {
                    return (
                        <div className='table-title'>
                            <div className='tab-title'>角色管理</div>
                            <div className='filter'>
                                <Input.Search
                                    placeholder={"请输入用户名进行搜索"}
                                    enterButton={true}
                                    size={"small"}
                                    style={{width: 200}}
                                    value={params.keywords}
                                    onChange={(e) => {
                                        setParams({...getParams(), keywords: e.target.value})
                                    }}
                                    onSearch={() => {
                                        update()
                                    }}
                                />
                            </div>
                        </div>
                    )
                }}
                columns={columns}
                size={"small"}
                bordered={true}
                dataSource={data}
            />
        </div>
    )
}
