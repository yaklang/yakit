import React, {ReactNode, useEffect, useRef, useState} from "react"
import {Table, Space, Button, Input, Modal, Form, Popconfirm, Tag} from "antd"
import type {ColumnsType} from "antd/es/table"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {useGetState, useMemoizedFn} from "ahooks"
import "./AccountAdminPage.scss"
import {failed, success, warn} from "@/utils/notification"
import {PaginationSchema} from "../../pages/invoker/schema"

const {ipcRenderer} = window.require("electron")

export interface CreateUserFormProp {
    onCancel: () => void,
    refresh: () => void,
}

const layout = {
    labelCol: {span: 5},
    wrapperCol: {span: 16}
}

export interface CreateProps {
    user_name:string
}

const CreateUserForm: React.FC<CreateUserFormProp> = (props) => {
    const { onCancel,refresh } = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const onFinish = useMemoizedFn((values) => {
        console.log("values", values)
        const {user_name} = values
        NetWorkApi<CreateProps, API.NewUrmResponse>({
            method: "post",
            url: "urm",
            data: {
                user_name
            }
        })
            .then((res) => {
                console.log("返回结果：", res)
                onCancel()
                refresh()
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
interface DataType {
    key: React.Key
    name: string
    age: number
    address: string
}

interface QueryProps {}
interface RemoveProps {
    uid:string[]
}
interface ResetProps {
    user_name:string,
    uid:number
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
    const [data, setData] = useState<DataType[]>([
        {
            key: "1",
            name: "John Brown",
            age: 32,
            address: "New York No. 1 Lake Park"
        },
        {
            key: "2",
            name: "Jim Green",
            age: 42,
            address: "London No. 1 Lake Park"
        }
    ])
    const [total, setTotal] = useState<number>(2)

    const update = (page?: number, limit?: number, order?: string, orderBy?: string) => {
        setLoading(true)
        const paginationProps = {
            Page: page || 1,
            Limit: limit || pagination.Limit
        }

        NetWorkApi<QueryProps, API.UrmUserList>({
            method: "get",
            url: "urm",
            params: {
                ...params,
                ...paginationProps
            }
        })
            .then((res) => {
                console.log("返回结果：", res)
                // setData()
                // setTotal()
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
        onChange: (selectedRowKeys: React.Key[], selectedRows: DataType[]) => {
            console.log(`selectedRowKeys: ${selectedRowKeys}`, "selectedRows: ", selectedRows)
            setSelectedRowKeys(selectedRowKeys as string[])
        }
    }
    
    const onRemove = (uid:string[]) => {
        NetWorkApi<RemoveProps, API.NewUrmResponse>({
            method: "post",
            url: "urm",
            data: {
                uid
            }
        })
            .then((res) => {
                console.log("返回结果：", res)
                update()
            })
            .catch((err) => {
                failed("删除账号失败：" + err)
            })
            .finally(() => {
            })
    }

    const onReset = (uid,user_name) => {
        NetWorkApi<ResetProps, API.NewUrmResponse>({
            method: "post",
            url: "urm/reset/pwd",
            data: {
                user_name,
                uid,
            }
        })
            .then((res) => {
                console.log("返回结果：", res)
                update()
            })
            .catch((err) => {
                failed("重置账号失败：" + err)
            })
            .finally(() => {
            })
    }

    const columns: ColumnsType<DataType> = [
        {
            title: "用户名",
            dataIndex: "name",
            render: (text: string) => <a>{text}</a>
        },
        {
            title: "创建时间",
            dataIndex: "age"
        },
        {
            title: "操作",
            render: (i) => (
                <Space>
                    <Button size='small' type='primary' onClick={()=>onReset(i.key,i.key)}>
                        重置密码
                    </Button>
                    <Popconfirm title={"确定删除该用户吗？不可恢复"} onConfirm={()=>onRemove([i.key])}>
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
                title={(e) => {
                    return (
                        <div className='table-title'>
                            <div className='filter'>
                                <Input.Search
                                    placeholder={"请输入用户名进行搜索"}
                                    enterButton={true}
                                    size={"small"}
                                    style={{width: 200}}
                                    value={""}
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
                                        <Popconfirm title={"确定删除选择的用户吗？不可恢复"} onConfirm={()=>{
                                            console.log("selectedRowKeys",selectedRowKeys)
                                            onRemove(selectedRowKeys)
                                        }}>
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
                <CreateUserForm onCancel={() => setCreateUserShow(false)} refresh={()=>update()}/>
            </Modal>
        </div>
    )
}

export default AccountAdminPage
