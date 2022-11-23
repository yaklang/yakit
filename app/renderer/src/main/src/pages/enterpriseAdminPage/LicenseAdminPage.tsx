import React, {useEffect, useState} from "react"
import {Table, Space, Button, Input, Modal, Form, Popconfirm, Tag, Select, InputNumber, DatePicker, Spin} from "antd"
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

interface SelectDataProps {
    value: number
    label: string
}

interface LicenseProps {
    company: string
    license: string
    maxUser: number
}

const CreateLicense: React.FC<CreateLicenseProps> = (props) => {
    const {onCancel, refresh} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const [selectLoading, setSelectLoading] = useState<boolean>(true)
    const [data, setData, getData] = useGetState<API.CompanyLicenseConfigList[]>([])
    const [selectData, setSelectData, getSelectData] = useGetState<SelectDataProps[]>([])
    // 企业名称分页
    const [pagination, setPagination, getPagination] = useGetState<PaginationSchema>({
        Limit: 20,
        Order: "desc",
        OrderBy: "updated_at",
        Page: 1
    })

    useEffect(() => {
        update()
    }, [])

    const update = (page?: number, limit?: number, keywords: string = "", reload: boolean = false) => {
        setSelectLoading(true)
        const paginationProps = {
            page: page || 1,
            limit: limit || pagination.Limit
        }

        NetWorkApi<QueryProps, API.CompanyLicenseConfigResponse>({
            method: "get",
            url: "company/license/config",
            params: {
                keywords,
                ...paginationProps
            }
        })
            .then((res) => {
                let data = res.data || []
                const newData = data.map((item) => ({
                    value: item.id,
                    label: item.company
                }))
                if (reload) {
                    setData([...data])
                    setSelectData([...newData])
                } else {
                    setData([...getData(), ...data])
                    setSelectData([...getSelectData(), ...newData])
                }
            })
            .catch((err) => {
                failed("查看license失败：" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setSelectLoading(false)
                }, 200)
            })
    }

    const onFinish = useMemoizedFn((values) => {
        setLoading(true)
        const {id, license} = values
        const selectDate = data.filter((item) => item.id === id)[0]
        const {company, maxUser} = selectDate
        console.log("selectDate", selectDate)
        let params = {
            license,
            company,
            maxUser
        }
        NetWorkApi<LicenseProps, API.NewUrmResponse>({
            method: "post",
            url: "license/activation",
            data: params
        })
            .then((res: API.NewUrmResponse) => {
                console.log("返回结果：", res)
                onCancel()
                // const m = showModal({
                //     title: "生成成功",
                //     content: <ShowUserInfo user_name={user_name} password={password} onClose={() => m.destroy()} />
                // })
                // return m
                // refresh()
            })
            .catch((err) => {
                failed("企业操作失败：" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })

    const selectDropdown = useMemoizedFn((originNode: React.ReactNode) => {
        return (
            <div>
                <Spin spinning={selectLoading}>{originNode}</Spin>
            </div>
        )
    })

    return (
        <div style={{marginTop: 24}}>
            <Form {...layout} form={form} onFinish={onFinish}>
                <Form.Item name='id' label='企业名称' rules={[{required: true, message: "该项为必选"}]}>
                    <Select
                        showSearch
                        optionFilterProp='children'
                        placeholder='请选择企业名称'
                        filterOption={(input, option) =>
                            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                        }
                        options={selectData}
                        onSearch={(value) => {
                            update(1, undefined, value, true)
                        }}
                        onPopupScroll={(e) => {
                            console.log("加载")
                            const {target} = e
                            const ref: HTMLDivElement = target as unknown as HTMLDivElement
                            if (ref.scrollTop + ref.offsetHeight + 20 >= ref.scrollHeight) {
                                update(getPagination().Page + 1)
                            }
                        }}
                        dropdownRender={(originNode: React.ReactNode) => selectDropdown(originNode)}
                    />
                </Form.Item>
                <Form.Item name='license' label='申请码' rules={[{required: true, message: "该项为必选"}]}>
                    <Input.TextArea placeholder='请输入申请码' allowClear rows={13} />
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
    const {onCancel, refresh, editInfo} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)

    useEffect(() => {
        if (editInfo) {
            form.setFieldsValue({
                company: editInfo.company,
                maxActivationNum: editInfo.maxActivationNum,
                maxUser: editInfo.maxUser,
                durationDate: moment.unix(editInfo.durationDate)
            })
        }
    }, [])

    const onFinish = useMemoizedFn((values) => {
        let params = {
            ...values,
            durationDate: values.durationDate.unix()
        }
        if (editInfo?.id) params.id = editInfo?.id
        NetWorkApi<CreateProps, API.NewUrmResponse>({
            method: "post",
            url: "company/license/config",
            data: params
        })
            .then((res: API.NewUrmResponse) => {
                console.log("返回结果：", res)
                const {user_name, password} = res
                onCancel()
                refresh()
            })
            .catch((err) => {
                failed("企业操作失败：" + err)
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
                <Form.Item name='company' label='企业名称' rules={[{required: true, message: "该项为必填"}]}>
                    <Input placeholder='请输入企业名称' allowClear />
                </Form.Item>
                <Form.Item
                    name='maxActivationNum'
                    label='License总数'
                    rules={[{required: true, message: "该项为必填"}]}
                >
                    <InputNumber placeholder='请输入License总数' style={{width: "100%"}} />
                </Form.Item>
                <Form.Item name='maxUser' label='用户总数' rules={[{required: true, message: "该项为必填"}]}>
                    <InputNumber placeholder='请输入用户总数' style={{width: "100%"}} />
                </Form.Item>
                <Form.Item name='durationDate' label='有效期' rules={[{required: true, message: "该项为必填"}]}>
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
    id: number
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
    const [data, setData] = useState<API.CompanyLicenseConfigList[]>([])
    const [total, setTotal] = useState<number>(0)
    // 编辑项信息
    const [licenseFormShow, setLicenseFormShow] = useState<boolean>(false)
    const [editInfo, setEditInfo] = useState<API.CompanyLicenseConfigList>()
    // 生成License Modal
    const [createLicenseModal, setCreateLicenseModal] = useState<boolean>(false)

    const update = (page?: number, limit?: number, order?: string, orderBy?: string) => {
        setLoading(true)
        const paginationProps = {
            page: page || 1,
            limit: limit || pagination.Limit
        }

        NetWorkApi<QueryProps, API.CompanyLicenseConfigResponse>({
            method: "get",
            url: "company/license/config",
            params: {
                ...params,
                ...paginationProps
            }
        })
            .then((res) => {
                console.log("数据源：", res)
                // const newData = res.data.map((item) => ({...item}))
                setData(res.data || [])
                setPagination({...pagination, Limit: res.pagemeta.limit})
                setTotal(res.pagemeta.total)
            })
            .catch((err) => {
                failed("查看license失败：" + err)
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

    const onRemove = (id: number) => {
        NetWorkApi<RemoveProps, API.NewUrmResponse>({
            method: "delete",
            url: "company/license/config",
            data: {
                id
            }
        })
            .then((res) => {
                console.log("返回结果：", res)
                success("删除企业成功")
                update()
            })
            .catch((err) => {
                failed("删除企业失败：" + err)
            })
            .finally(() => {})
    }

    const columns: ColumnsType<API.CompanyLicenseConfigList> = [
        {
            title: "企业名称",
            dataIndex: "company"
        },
        {
            title: "总数",
            dataIndex: "maxActivationNum"
        },
        {
            title: "已使用",
            dataIndex: "useActivationNum"
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
                            onRemove(i.id)
                        }}
                    >
                        <Button size={"small"} danger={true}>
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
            width: 140
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
                rowKey={(row) => row.id}
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
