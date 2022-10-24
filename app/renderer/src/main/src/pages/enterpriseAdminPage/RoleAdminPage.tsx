import React, {ReactNode, useEffect, useRef, useState} from "react"
import {Table, Space, Button, Input, Modal, Form, Popconfirm, Tag, Switch, Row, Col, TreeSelect} from "antd"
import {} from "@ant-design/icons"
import "./RoleAdminPage.scss"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {useGetState, useMemoizedFn} from "ahooks"
import moment from "moment"
import {failed, success, warn} from "@/utils/notification"
import {PaginationSchema} from "../../pages/invoker/schema"
import type {ColumnsType} from "antd/es/table"
import type {TreeSelectProps} from "antd"
import type {DefaultOptionType} from "antd/es/select"
const {SHOW_PARENT} = TreeSelect
export interface CreateUserFormProps {
    isEdit: boolean
    onCancel: () => void
    refresh: () => void
}

const layout = {
    labelCol: {span: 5},
    wrapperCol: {span: 16}
}
const itemLayout = {
    labelCol: {span: 9},
    wrapperCol: {span: 12}
}
export interface CreateProps {
    user_name: string
}

const RoleOperationForm: React.FC<CreateUserFormProps> = (props) => {
    const {onCancel, refresh, isEdit} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const onFinish = useMemoizedFn((values) => {
        console.log("values", values)
        // const {user_name} = values
        // NetWorkApi<CreateProps, API.NewUrmResponse>({
        //     method: "post",
        //     url: "urm",
        //     params: {
        //         user_name
        //     }
        // })
        //     .then((res: API.NewUrmResponse) => {
        //         console.log("返回结果：", res)
        //         onCancel()
        //         refresh()
        //     })
        //     .catch((err) => {
        //         failed("失败：" + err)
        //     })
        //     .finally(() => {
        //         setTimeout(() => {
        //             setLoading(false)
        //         }, 200)
        //     })
    })
    const [treeData, setTreeData] = useState<Omit<DefaultOptionType, "label">[]>([
        {id: 1, pId: 0, value: "1", title: "Expand to load"},
        {id: 2, pId: 0, value: "2", title: "Expand to load"},
        {id: 3, pId: 0, value: "3", title: "Tree Node", isLeaf: true}
    ])
    const genTreeNode = (parentId: number, isLeaf = false) => {
        const random = Math.random().toString(36).substring(2, 6)
        return {
            id: random,
            pId: parentId,
            value: random,
            title: isLeaf ? "Tree Node" : "Expand to load",
            isLeaf
        }
    }
    const onLoadData: TreeSelectProps["loadData"] = ({id}) =>
        new Promise((resolve) => {
            setTimeout(() => {
                setTreeData(treeData.concat([genTreeNode(id, false), genTreeNode(id, true), genTreeNode(id, true)]))
                resolve(undefined)
            }, 300)
        })
    const onChange = (newValue: string[]) => {
        console.log("onChange ", newValue)
    }

    return (
        <div style={{marginTop: 24}}>
            <Form {...layout} form={form} onFinish={onFinish}>
                <Form.Item name='user_name' label='角色名' rules={[{required: true, message: "该项为必填"}]}>
                    <Input placeholder='请输入角色名' allowClear />
                </Form.Item>
                <Form.Item name='user_name1' label='插件权限' initialValue={["3"]}>
                    <TreeSelect
                        treeDataSimpleMode
                        style={{width: "100%"}}
                        dropdownStyle={{maxHeight: 400, overflow: "auto"}}
                        placeholder='请选择插件权限'
                        treeCheckable={true}
                        onChange={onChange}
                        loadData={onLoadData}
                        treeData={treeData}
                    />
                </Form.Item>
                <Row>
                    <Col span={5}>
                        <div style={{textAlign: "right", paddingTop: 4}}>操作权限：</div>
                    </Col>
                    <Col span={16}>
                        <div style={{display: "flex"}}>
                            <div style={{width: "50%"}}>
                                <Form.Item {...itemLayout} name='user_name2' label='审核插件'>
                                    <Switch checkedChildren='开' unCheckedChildren='关' />
                                </Form.Item>
                            </div>

                            <div style={{width: "50%"}}>
                                <Form.Item {...itemLayout} name='user_name3' label='插件删除'>
                                    <Switch checkedChildren='开' unCheckedChildren='关' />
                                </Form.Item>
                            </div>
                        </div>
                    </Col>
                </Row>

                <div style={{textAlign: "center"}}>
                    <Button style={{width: 200}} type='primary' htmlType='submit' loading={loading}>
                        确认
                    </Button>
                </div>
            </Form>
        </div>
    )
}

export interface QueryExecResultsParams {}

interface QueryProps {}
interface RemoveProps {
    uid: string[]
}
interface ResetProps {
    user_name: string
    uid: string
}
export interface RoleAdminPageProps {}

const RoleAdminPage: React.FC<RoleAdminPageProps> = (props) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [roleFormShow, setRoleFormShow] = useState<boolean>(false)
    const [params, setParams, getParams] = useGetState<QueryExecResultsParams>({})
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const [pagination, setPagination] = useState<PaginationSchema>({
        Limit: 20,
        Order: "desc",
        OrderBy: "updated_at",
        Page: 1
    })
    const [data, setData] = useState<API.UrmUserList[]>([])
    const [total, setTotal] = useState<number>(0)
    // 是否为编辑
    const [isEdit, setIsEdit] = useState<boolean>(false)

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

    const rowSelection = {
        onChange: (selectedRowKeys, selectedRows: API.UrmUserList[]) => {
            // let newArr = selectedRowKeys.map((item)=>parseInt(item))
            setSelectedRowKeys(selectedRowKeys)
        }
    }

    const onRemove = (uid: string[]) => {
        console.log(uid, "uid")
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

    const columns: ColumnsType<API.UrmUserList> = [
        {
            title: "角色名",
            dataIndex: "user_name",
            render: (text: string, record) => (
                <div>
                    <span style={{marginLeft: 10}}>{text}</span>
                </div>
            )
        },
        {
            title: "操作权限"
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
                    <Button
                        size='small'
                        type='primary'
                        onClick={() => {
                            setIsEdit(true)
                            setRoleFormShow(true)
                        }}
                    >
                        编辑
                    </Button>
                    <Popconfirm
                        title={"确定删除该用户吗？"}
                        onConfirm={() => {
                            onRemove([i.uid])
                        }}
                    >
                        <Button size={"small"} danger={true}>
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            )
        }
    ]
    return (
        <div className='role-admin-page'>
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
                                        onClick={() => {
                                            setIsEdit(false)
                                            setRoleFormShow(true)
                                        }}
                                    >
                                        创建角色
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
                visible={roleFormShow}
                title={isEdit ? "编辑角色" : "创建角色"}
                destroyOnClose={true}
                maskClosable={false}
                bodyStyle={{padding: "10px 24px 24px 24px"}}
                width={600}
                onCancel={() => setRoleFormShow(false)}
                footer={null}
            >
                <RoleOperationForm isEdit={isEdit} onCancel={() => setRoleFormShow(false)} refresh={() => update()} />
            </Modal>
        </div>
    )
}

export default RoleAdminPage
