import React, {useEffect, useState} from "react"
import {Table, Space, Form, Tag, Avatar} from "antd"
import {GithubOutlined, QqOutlined, WechatOutlined, UserOutlined} from "@ant-design/icons"
import {ItemSelects} from "@/components/baseTemplate/FormItemUtil"
import {useGetState, useMemoizedFn} from "ahooks"
import type {ColumnsType} from "antd/es/table"
import debounce from "lodash/debounce"
import moment from "moment"
import {failed, success, info} from "@/utils/notification"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {OnlineUserItem} from "@/components/OnlineUserItem/OnlineUserItem"
import {PaginationSchema} from "@/pages/invoker/schema"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"

import "./TrustListPage.scss"

export interface UserQuery {
    keywords: string
    role?: string
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
    const [currentUser, setCurrentUser] = useState<string>()
    const [userList, setUserList] = useState<API.UserOrdinaryResponse>({
        data: []
    })
    const [appid, setAppid] = useState<string>("")
    const [role, setRole] = useState<string>("trusted")

    const onAdd = useMemoizedFn(() => {
        if (!appid) {
            info("请先选择用户")
            return
        }
        const param = {
            appid: [appid],
            operation: "add",
            role
        }
        setLoading(true)
        NetWorkApi<API.UpdateUserRole, API.ActionSucceeded>({
            method: "post",
            url: "user",
            data: param
        })
            .then((res) => {
                setAppid("")
                setRole("trusted")
                setCurrentUser("")
                onCancel()
                refresh()
                setUserList({
                    data: []
                })
            })
            .catch((err) => {
                failed("增加信任用户失败：" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })

    const onSelectUser = useMemoizedFn((option: any) => {
        setAppid(option.title)
        setCurrentUser(option.value)
    })

    const onClear = useMemoizedFn(() => {
        setUserList({
            data: []
        })
        setAppid("")
        setCurrentUser("")
    })

    const getUserList = debounce(
        useMemoizedFn((str: string) => {
            if (!str) {
                onClear()
                return
            }
            NetWorkApi<UserQuery, API.UserOrdinaryResponse>({
                method: "get",
                url: "user/ordinary",
                params: {
                    keywords: str || "all"
                }
            })
                .then((res) => {
                    setUserList(res)
                })
                .catch((err) => {
                    failed("获取普通用户失败：" + err)
                })
                .finally(() => {
                    setTimeout(() => setLoading(false), 200)
                })
        }),
        500
    )

    const onSelectRole = useMemoizedFn((role) => {
        setRole(role.value)
    })
    return (
        <div style={{marginTop: 24}} className='trust-list-admin-page-container'>
            <Form {...layout} form={form} onFinish={() => onAdd()}>
                <div className='add-account-body' style={{marginLeft: 50}}>
                    <span>添加用户：</span>
                    <ItemSelects
                        isItem={false}
                        select={{
                            showSearch: true,
                            wrapperStyle: {width: 360},
                            allowClear: true,
                            onClear: onClear,
                            data: userList.data || [],
                            optValue: "name",
                            optText: "appid",
                            optKey: "appid",
                            placeholder: "请输入完整的用户名",
                            optionLabelProp: "name",
                            value: currentUser,
                            onSelect: (_, option: any) => {
                                onSelectUser(option)
                            },
                            onSearch: getUserList,
                            renderOpt: (info: API.UserList) => {
                                return <OnlineUserItem info={info} />
                            }
                        }}
                    ></ItemSelects>
                </div>

                <div style={{marginLeft: 50}}>
                    <span>选择角色：</span>
                    <ItemSelects
                        isItem={false}
                        select={{
                            showSearch: true,
                            wrapperStyle: {width: 360},
                            allowClear: true,
                            onClear: onClear,
                            data: [
                                {
                                    value: "trusted",
                                    label: "信任用户"
                                },
                                {
                                    value: "admin",
                                    label: "管理员"
                                },
                                {
                                    value: "licenseAdmin",
                                    label: "License管理员"
                                },
                                {
                                    value: "operate",
                                    label: "运营专员"
                                },
                                // {
                                //     value: "auditor",
                                //     label: "审核员"
                                // }
                            ],
                            optValue: "value",
                            optText: "label",
                            placeholder: "请选择角色",
                            optionLabelProp: "title",
                            value: role,
                            onSelect: (_, option: any) => onSelectRole(option),
                            renderOpt: (info) => info.label
                        }}
                    ></ItemSelects>
                </div>
                <div style={{textAlign: "center", marginTop: 20}}>
                    <YakitButton htmlType='submit' loading={loading}>
                        添加
                    </YakitButton>
                </div>
            </Form>
        </div>
    )
}

export interface TrustListPageProp {}

export interface QueryTrustListFilterParams {
    keywords: string
}

interface QueryProps {}
export const TrustListPage: React.FC<TrustListPageProp> = (props) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [createUserShow, setCreateUserShow] = useState<boolean>(false)
    const [params, setParams, getParams] = useGetState<QueryTrustListFilterParams>({
        keywords: ""
    })
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const [pagination, setPagination] = useState<PaginationSchema>({
        Limit: 20,
        Order: "desc",
        OrderBy: "updated_at",
        Page: 1
    })
    const [data, setData] = useState<API.UserList[]>([])
    const [total, setTotal] = useState<number>(0)

    const update = (page?: number, limit?: number, order?: string, orderBy?: string) => {
        setLoading(true)
        const paginationProps = {
            page: page || 1,
            limit: limit || pagination.Limit
        }

        NetWorkApi<QueryProps, API.UserListResponse>({
            method: "get",
            url: "user",
            params: {
                ...params,
                ...paginationProps
            }
        })
            .then((res) => {
                const dataSource = res.data ?? []
                const newData = dataSource.map((item) => ({...item}))
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
        onChange: (selectedRowKeys, selectedRows: API.UserList[]) => {
            let newArr = selectedRows.map((item) => item.appid)
            setSelectedRowKeys(newArr)
        }
    }

    const onRemove = (appid: string[]) => {
        NetWorkApi<API.UpdateUserRole, API.NewUrmResponse>({
            method: "post",
            url: "user",
            data: {
                appid,
                operation: "remove"
            }
        })
            .then((res) => {
                success("删除用户成功")
                update()
            })
            .catch((err) => {
                failed("删除账号失败：" + err)
            })
            .finally(() => {})
    }

    const judgeAvatar = (record) => {
        const {head_img, name} = record
        return head_img && !!head_img.length ? (
            <Avatar size={32} src={head_img} />
        ) : (
            <Avatar size={32} style={{backgroundColor: "rgb(245, 106, 0)"}}>
                {name && name.slice(0, 1)}
            </Avatar>
        )
    }

    const judgeSource = (record) => {
        switch (record.from_platform) {
            case "company":
                return <UserOutlined />
            case "github":
                return <GithubOutlined />
            case "wechat":
                return <WechatOutlined />
            case "qq":
                return <QqOutlined />
            default:
                return <>--</>
        }
    }

    const columns: ColumnsType<API.UserList> = [
        {
            title: "用户",
            dataIndex: "name",
            render: (text: string, record) => (
                <div style={{display: "flex"}}>
                    <div style={{width: 32, display: "flex", alignItems: "center"}}>{judgeAvatar(record)}</div>

                    <div style={{paddingLeft: 10, flex: 1, lineHeight: "32px"}}>
                        <div>
                            {text}
                            <span style={{paddingLeft: 4}}>{judgeSource(record)}</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "用户角色",
            dataIndex: "role",
            render: (text) => {
                let role = text
                switch (text) {
                    case "admin":
                        role = "管理员"
                        break
                    case "superAdmin":
                        role = "超级管理员"
                        break
                    case "licenseAdmin":
                        role = "License管理员"
                        break
                    case "trusted":
                        role = "信任用户"
                        break
                    case "operate":
                        role = "运营专员"
                        break
                    // case "auditor":
                    //     role = "审核员"
                    //     break
                    default:
                        role = "--"
                        break
                }
                return role
            }
        },
        {
            title: "创建时间",
            dataIndex: "created_at",
            render: (text) => <span>{moment.unix(text).format("YYYY-MM-DD HH:mm")}</span>
        },
        {
            title: "操作",
            render: (i) => (
                <YakitPopconfirm
                    title={"确定移除该用户吗？"}
                    onConfirm={() => {
                        onRemove([i.appid])
                    }}
                    placement='right'
                >
                    <YakitButton type='text' colors='danger'>
                        移除
                    </YakitButton>
                </YakitPopconfirm>
            ),
            width: 100
        }
    ]
    return (
        <div className='trust-list-admin-page'>
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
                                <YakitInput.Search
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
                                        <YakitPopconfirm
                                            title={"确定删除选择的用户吗？不可恢复"}
                                            onConfirm={() => {
                                                onRemove(selectedRowKeys)
                                            }}
                                        >
                                            <YakitButton size='small'>批量移除</YakitButton>
                                        </YakitPopconfirm>
                                    ) : (
                                        <YakitButton size='small' disabled={true}>
                                            批量移除
                                        </YakitButton>
                                    )}
                                    <YakitButton size='small' onClick={() => setCreateUserShow(!createUserShow)}>
                                        添加用户
                                    </YakitButton>
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
            <YakitModal
                visible={createUserShow}
                title={"添加用户"}
                destroyOnClose={true}
                maskClosable={false}
                bodyStyle={{padding: "10px 24px 24px 24px"}}
                width={600}
                onCancel={() => setCreateUserShow(false)}
                footer={null}
            >
                <CreateUserForm onCancel={() => setCreateUserShow(false)} refresh={() => update()} />
            </YakitModal>
        </div>
    )
}
