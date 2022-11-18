import React, {useEffect, useState} from "react"
import {Table, Space, Button, Input, Modal, Form, Popconfirm, Tag, Select, InputNumber, DatePicker} from "antd"
import type {ColumnsType} from "antd/es/table"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {useGetState, useMemoizedFn} from "ahooks"
import moment from "moment"
import "./LicenseAdminPage.scss"
import {failed, success, warn} from "@/utils/notification"
import {PaginationSchema} from "../../pages/invoker/schema"
import {showModal} from "@/utils/showModal"
import {callCopyToClipboard} from "@/utils/basic"

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
                <Button style={{width: 200}} type='primary' onClick={() => copyUserInfo()}>
                    复制
                </Button>
            </div>
        </div>
    )
}

interface CreateLicenseProps {
    onCancel: () => void
    refresh: () => void
}

const CreateLicense: React.FC<CreateLicenseProps> = (props) => {
    const {onCancel, refresh} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const onFinish = useMemoizedFn((values) => {
        console.log("values", values)
    })
    return (
        <div style={{marginTop: 24}}>
            <Form {...layout} form={form} onFinish={onFinish}>
                <Form.Item name='user_name' label='企业名称' rules={[{required: true, message: "该项为必选"}]}>
                    <Select
                        showSearch
                        optionFilterProp='children'
                        placeholder='请选择企业名称'
                        filterOption={(input, option) =>
                            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                        }
                        options={[
                            {
                                value: "jack",
                                label: "Jack"
                            },
                            {
                                value: "lucy",
                                label: "Lucy"
                            },
                            {
                                value: "tom",
                                label: "Tom"
                            }
                        ]}
                    />
                </Form.Item>
                <div style={{textAlign: "center"}}>
                    <Button style={{width: 200}} type='primary' htmlType='submit' loading={loading}>
                        确认
                    </Button>
                </div>
            </Form>
        </div>
    )
}

export interface LicenseFormProps {
    onCancel: () => void
    refresh: () => void
    editInfo: any
}

const layout = {
    labelCol: {span: 5},
    wrapperCol: {span: 16}
}

export interface CreateProps {
    user_name: string
}

const LicenseForm: React.FC<LicenseFormProps> = (props) => {
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
                    title: "生成成功",
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
                <Form.Item name='user_name' label='企业名称' rules={[{required: true, message: "该项为必填"}]}>
                    <Input placeholder='请输入企业名称' allowClear />
                </Form.Item>
                <Form.Item name='user_count' label='License总数' rules={[{required: true, message: "该项为必填"}]}>
                    <InputNumber placeholder='请输入License总数' style={{width: "100%"}} />
                </Form.Item>
                <Form.Item name='user_count1' label='用户总数' rules={[{required: true, message: "该项为必填"}]}>
                    <InputNumber placeholder='请输入用户总数' style={{width: "100%"}} />
                </Form.Item>
                <Form.Item name='user_count2' label='有效期' rules={[{required: true, message: "该项为必填"}]}>
                    <DatePicker
                        showTime
                        format='YYYY-MM-DD HH:mm:ss'
                        placeholder='点击这里设置有效期'
                        style={{width: "100%"}}
                    />
                </Form.Item>
                <div style={{textAlign: "center"}}>
                    <Button style={{width: 200}} type='primary' htmlType='submit' loading={loading}>
                        确认
                    </Button>
                </div>
            </Form>
        </div>
    )
}

export interface LicenseAdminPageProps {}

export interface QueryExecResultsParams {
    keywords: string
}

interface QueryProps {}
interface RemoveProps {
    uid: string[]
}
const LicenseAdminPage: React.FC<LicenseAdminPageProps> = (props) => {
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
    // 编辑项信息
    const [licenseFormShow, setLicenseFormShow] = useState<boolean>(false)
    const [editInfo, setEditInfo] = useState<API.UrmUserList>()
    // 生成License Modal
    const [createLicenseModal, setCreateLicenseModal] = useState<boolean>(false)

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
            title: "企业名称",
            dataIndex: "user_name",
            render: (text: string) => (
                <div>
                    <span style={{marginLeft: 10}}>{text}</span>
                </div>
            )
        },
        {
            title: "总数",
            dataIndex: "created_at",
            render: (text) => <span>{moment.unix(text).format("YYYY-MM-DD HH:mm")}</span>
        },
        {
            title: "已使用"
        },
        {
            title: "操作",
            render: (i) => (
                <Space>
                    <Button
                        size='small'
                        type='primary'
                        onClick={() => {
                            setEditInfo(i)
                            setLicenseFormShow(true)
                        }}
                    >
                        编辑
                    </Button>
                    <Popconfirm
                        title={"确定删除该企业吗？"}
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
        <div className='license-admin-page'>
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
                                    placeholder={"请输入企业名称进行搜索"}
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
                                    <Button
                                        type='primary'
                                        htmlType='submit'
                                        size='small'
                                        onClick={() => {
                                            setLicenseFormShow(true)
                                            setEditInfo(undefined)
                                        }}
                                    >
                                        添加企业
                                    </Button>
                                    <Button
                                        type='primary'
                                        htmlType='submit'
                                        size='small'
                                        onClick={() => {
                                            setCreateLicenseModal(true)
                                        }}
                                    >
                                        生成License
                                    </Button>
                                </Space>
                            </div>
                        </div>
                    )
                }}
                columns={columns}
                size={"small"}
                bordered={true}
                dataSource={data}
            />
            <Modal
                visible={licenseFormShow}
                title={editInfo ? "编辑企业" : "创建企业"}
                destroyOnClose={true}
                maskClosable={false}
                bodyStyle={{padding: "10px 24px 24px 24px"}}
                width={600}
                onCancel={() => setLicenseFormShow(false)}
                footer={null}
            >
                <LicenseForm editInfo={editInfo} onCancel={() => setLicenseFormShow(false)} refresh={() => update()} />
            </Modal>
            <Modal
                visible={createLicenseModal}
                title={"生成License"}
                destroyOnClose={true}
                maskClosable={false}
                bodyStyle={{padding: "10px 24px 24px 24px"}}
                width={600}
                onCancel={() => setCreateLicenseModal(false)}
                footer={null}
            >
                <CreateLicense onCancel={() => setCreateLicenseModal(false)} refresh={() => update()} />
            </Modal>
        </div>
    )
}

export default LicenseAdminPage
