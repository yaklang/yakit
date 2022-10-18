import React, {ReactNode, useEffect, useRef, useState} from "react"
import {Table, Space, Button, Input, Modal, Form, Popconfirm, Tag, Avatar} from "antd"
import type {ColumnsType} from "antd/es/table"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {useGetState, useMemoizedFn} from "ahooks"
import moment from "moment"
import "./AccountAdminPage.scss"
import {failed, success, warn} from "@/utils/notification"
import {PaginationSchema} from "../invoker/schema"
import {showModal} from "@/utils/showModal"
import {callCopyToClipboard} from "@/utils/basic"

const {ipcRenderer} = window.require("electron")

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

export interface CreateUserFormProps {
    onCancel: () => void
    refresh: () => void
}

const layout = {
    labelCol: {span: 5},
    wrapperCol: {span: 16}
}

export interface CreateProps {
    user_name: string
}

const CreateUserForm: React.FC<CreateUserFormProps> = (props) => {
    const {onCancel, refresh} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const onFinish = useMemoizedFn((values) => {
        console.log("values", values)
        const {user_name} = values
        NetWorkApi<CreateProps, API.NewUrmResponse>({
            method: "post",
            url: "urm",
            params: {
                user_name
            }
        })
            .then((res: API.NewUrmResponse) => {
                console.log("返回结果：", res)
                const {user_name, password} = res
                onCancel()
                refresh()
                const m = showModal({
                    title: "账号信息",
                    content: <ShowUserInfo user_name={user_name} password={password} onClose={() => m.destroy()} />
                })
                return m
            })
            .catch((err) => {
                failed("创建账号失败：" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })
    return (
        <div style={{marginTop: 24}}>
            <Form {...layout} form={form} onFinish={onFinish}>
                <Form.Item name='user_name' label='用户名' rules={[{required: true, message: "该项为必填"}]}>
                    <Input placeholder='请输入账号用户名' allowClear />
                </Form.Item>
                <div style={{textAlign: "center"}}>
                    <Button type='primary' htmlType='submit' loading={loading}>
                        确认
                    </Button>
                </div>
            </Form>
        </div>
    )
}

export interface AccountAdminPageProp {}

export interface QueryExecResultsParams {
    keywords: string
}

interface QueryProps {}
interface RemoveProps {
    uid: string[]
}
interface ResetProps {
    user_name: string
    uid: string
}
const AccountAdminPage: React.FC<AccountAdminPageProp> = (props) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [createUserShow, setCreateUserShow] = useState<boolean>(false)
    const [params, setParams, getParams] = useGetState<QueryExecResultsParams>({
        keywords: ""
    })
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
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
                const newData = res.data.map((item)=>({...item}))
                console.log("数据源：",newData)
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

    const rowSelection = {
        onChange: (selectedRowKeys, selectedRows: API.UrmUserList[]) => {
            // let newArr = selectedRowKeys.map((item)=>parseInt(item))
            setSelectedRowKeys(selectedRowKeys)
        }
    }

    const onRemove = (uid: string[]) => {
        console.log(uid,"uid")
        NetWorkApi<RemoveProps, API.NewUrmResponse>({
            method: "delete",
            url: "urm",
            data: {
                uid
            }
        })
            .then((res) => {
                console.log("返回结果：", res)
                success("删除用户成功")
                update()
            })
            .catch((err) => {
                failed("删除账号失败：" + err)
            })
            .finally(() => {})
    }

    const onReset = (uid, user_name) => {
        NetWorkApi<ResetProps, API.NewUrmResponse>({
            method: "post",
            url: "urm/reset/pwd",
            params: {
                user_name,
                uid
            }
        })
            .then((res) => {
                update()
                const {user_name, password} = res
                const m = showModal({
                    title: "账号信息",
                    content: <ShowUserInfo user_name={user_name} password={password} onClose={() => m.destroy()} />
                })
                return m
            })
            .catch((err) => {
                failed("重置账号失败：" + err)
            })
            .finally(() => {})
    }

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
                    <Popconfirm title={"确定要重置该用户密码吗？"} onConfirm={() => onReset(i.uid, i.user_name)}>
                        <Button size='small' type='primary'>
                            重置密码
                        </Button>
                    </Popconfirm>
                    <Popconfirm title={"确定删除该用户吗？"} onConfirm={() =>{ 
                        onRemove([i.uid])
                        }}>
                        <Button size={"small"} danger={true}>
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            )
        }
    ]
    return (
        <div className='account-admin-page'>
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
                            <div className='operation'>
                                <Space>
                                    {!!selectedRowKeys.length ? (
                                        <Popconfirm
                                            title={"确定删除选择的用户吗？不可恢复"}
                                            onConfirm={() => {
                                                onRemove(selectedRowKeys)
                                            }}
                                        >
                                            <Button type='primary' htmlType='submit' size='small'>
                                                批量删除
                                            </Button>
                                        </Popconfirm>
                                    ) : (
                                        <Button type='primary' size='small' disabled={true}>
                                            批量删除
                                        </Button>
                                    )}
                                    <Button
                                        type='primary'
                                        htmlType='submit'
                                        size='small'
                                        onClick={() => setCreateUserShow(!createUserShow)}
                                    >
                                        创建账号
                                    </Button>
                                </Space>
                            </div>
                        </div>
                    )
                }}
                rowSelection={{
                    type: "checkbox",
                    ...rowSelection
                }}
                columns={columns}
                size={"small"}
                bordered={true}
                dataSource={data}
            />
            <Modal
                visible={createUserShow}
                title={"创建账号"}
                destroyOnClose={true}
                maskClosable={false}
                bodyStyle={{padding: "10px 24px 24px 24px"}}
                width={600}
                onCancel={() => setCreateUserShow(false)}
                footer={null}
            >
                <CreateUserForm onCancel={() => setCreateUserShow(false)} refresh={() => update()} />
            </Modal>
        </div>
    )
}

export default AccountAdminPage
