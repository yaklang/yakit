import React, {memo, ReactNode, useEffect, useRef, useState} from "react"
import {List, Select,Table, Space, Button, Input, Modal, Form, Popconfirm, Tag, Avatar} from "antd"
import {GithubOutlined, QqOutlined, WechatOutlined, UserOutlined} from "@ant-design/icons"
import {ItemSelects} from "@/components/baseTemplate/FormItemUtil"
import {useGetState, useMemoizedFn} from "ahooks"
import type {SelectProps} from "antd/es/select"
import type {ColumnsType} from "antd/es/table"
import debounce from "lodash/debounce"
import moment from "moment"
import "./TrustListPage.scss"
import {failed, success, warn, info} from "@/utils/notification"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {OnlineUserItem} from "@/components/OnlineUserItem/OnlineUserItem"
import {PaginationSchema} from "@/pages/invoker/schema"

const {Search} = Input

export const PlatformIcon: {[key: string]: ReactNode} = {
    github: <GithubOutlined />,
    wechat: <WechatOutlined />,
    qq: <QqOutlined />
}
export interface TrustListProp {
    appid: string
    created_at: number | null
    from_platform: string
    head_img: string | undefined
    wechatHeadImg: string | null
    id: number | null
    name: string | undefined
    tags: string[] | null
    updated_at: number | null
}

export interface ListReturnType {
    data: TrustListProp[]
    pagemeta: null | {
        limit: number | null
        page: number | null
        total: number | undefined
        total_page: number | null
    }
}

interface UserListQuery extends API.PageMeta {
    keywords: string
}

export interface UserQuery {
    keywords: string
    role?: string
}

interface AddOrRemoveUserProps {
    appid: string
    operation: string
}
export interface DebounceSelectProps<ValueType = any> extends Omit<SelectProps<ValueType>, "options" | "children"> {
    fetchOptions: (search: string) => Promise<ValueType[]>
    debounceTimeout?: number
}

export const TrustListPage1: React.FC = memo(() => {
    const [userList, setUserList] = useState<API.UserOrdinaryResponse>({
        data: []
    })
    const [currentUser, setCurrentUser] = useState<string>()
    const [trustUserData, setTrustUserData] = useState<API.UserListResponse>({
        data: [],
        pagemeta: {
            total_page: 0,
            total: 0,
            page: 1,
            limit: 20
        }
    })
    const [loading, setLoading] = useState(false)
    const [removeLoading, setRemoveLoading] = useState(false)
    const [appid, setAppid] = useState<string>("")
    const [role, setRole] = useState<string>("trusted")
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
    const getTrustUserList = useMemoizedFn((value: string = "all", page: number = 1, pageSize: number = 12) => {
        const param: UserListQuery = {
            page,
            limit: pageSize,
            total: 0,
            total_page: 0,
            keywords: value
        }
        NetWorkApi<UserListQuery, API.UserListResponse>({
            method: "get",
            url: "user",
            params: param
        })
            .then((res) => {
                setTrustUserData(res)
            })
            .catch((err) => {
                failed("获取信任用户失败：" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })

    useEffect(() => {
        getTrustUserList()
    }, [])

    const onSelectUser = useMemoizedFn((option: any) => {
        setAppid(option.title)
        setCurrentUser(option.value)
    })

    const onSelectRole = useMemoizedFn((role) => {
        setRole(role.value)
    })

    const onAddOrRemove = useMemoizedFn((appid: string, operation: string, isSetLoading: boolean) => {
        if (!appid) {
            info("请先选择用户")
            return
        }
        const param = {
            appid,
            operation,
            role
        }
        if (isSetLoading) setLoading(true)
        NetWorkApi<AddOrRemoveUserProps, API.ActionSucceeded>({
            method: "post",
            url: "user",
            data: param
        })
            .then((res) => {
                setAppid("")
                setRole("trusted")
                setCurrentUser("")
                getTrustUserList()
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
                    setRemoveLoading(false)
                }, 200)
            })
    })

    const onRemove = useMemoizedFn((appid: string) => {
        setAppid(appid)
        setRemoveLoading(true)
        onAddOrRemove(appid, "remove", false)
    })

    return (
        <div className='trust-list-container'>
            <div className='add-account-body'>
                <span>添加用户:</span>
                <ItemSelects
                    isItem={false}
                    select={{
                        showSearch: true,
                        style: {width: 360},
                        className: "add-select",
                        allowClear: true,
                        onClear: onClear,
                        data: userList.data || [],
                        optValue: "name",
                        optText: "appid",
                        placeholder: "请输入完整的用户名",
                        optionLabelProp: "name",
                        value: currentUser,
                        onSelect: (_, option: any) => onSelectUser(option),
                        onSearch: getUserList,
                        renderOpt: (info: API.UserList) => {
                            return <OnlineUserItem info={info} />
                        }
                    }}
                ></ItemSelects>
                <Button
                    className='add-btn'
                    type='primary'
                    loading={loading}
                    onClick={() => onAddOrRemove(appid, "add", true)}
                >
                    添加
                </Button>
            </div>
            <div>
                <span>选择角色：</span>
                <ItemSelects
                    isItem={false}
                    select={{
                        showSearch: true,
                        style: {width: 360},
                        className: "add-select",
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
                            }
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

            <div className='added-account-body'>
                <div className='added-header'>
                    <span className='header-title'>信任用户/管理员列表</span>
                </div>
                <Search
                    placeholder='请输入用户名进行搜索'
                    onSearch={(val: string) => getTrustUserList(val || "all")}
                    style={{width: 480}}
                    allowClear
                    onChange={(e) => {
                        if (!e.target.value) getTrustUserList("all")
                    }}
                />
                <div className='added-list'>
                    <List<API.UserList>
                        grid={{gutter: 12, column: 4}}
                        dataSource={trustUserData.data || []}
                        pagination={{
                            size: "small",
                            defaultCurrent: 1,
                            pageSize: 12,
                            showSizeChanger: false,
                            total: trustUserData?.pagemeta?.total || 0,
                            // hideOnSinglePage: true,
                            showTotal: (total, rang) => <Tag>{`Total ${total}`}</Tag>,
                            onChange: (page, pageSize) => getTrustUserList("all", page, pageSize)
                        }}
                        loading={loading}
                        renderItem={(item: API.UserList, index: number) => {
                            return (
                                <List.Item key={item.id}>
                                    <div className='list-opt'>
                                        <div>
                                            <img src={item.head_img} className='opt-img' />
                                        </div>
                                        <div className='opt-author'>
                                            <div className='author-name content-ellipsis' title={item.name}>
                                                {item.name}
                                            </div>
                                            <div className='author-info'>
                                                <div className='author-icon'>{PlatformIcon[item.from_platform]}</div>
                                                <div className='author-role'>
                                                    {item.role === "trusted" && "信任用户"}
                                                    {item.role === "admin" && "管理员"},
                                                    {item.role === "licenseAdmin" && "License管理员"}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <Button
                                                loading={removeLoading && appid === item.appid}
                                                className='opt-remove'
                                                type='link'
                                                danger
                                                onClick={() => onRemove(item.appid)}
                                            >
                                                移除
                                            </Button>
                                        </div>
                                    </div>
                                </List.Item>
                            )
                        }}
                    ></List>
                </div>
            </div>
        </div>
    )
})

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

    const onAdd = useMemoizedFn((appid: string, operation: string, isSetLoading: boolean) => {
        if (!appid) {
            info("请先选择用户")
            return
        }
        const param = {
            appid,
            operation,
            role
        }
        if (isSetLoading) setLoading(true)
        NetWorkApi<AddOrRemoveUserProps, API.ActionSucceeded>({
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
            <Form {...layout} form={form} onFinish={() => onAdd(appid, "add", true)}>
                <div className='add-account-body' style={{marginLeft:50}}>
                <span>添加用户：</span>
                <ItemSelects
                    isItem={false}
                    select={{
                        showSearch: true,
                        style: {width: 360},
                        allowClear: true,
                        onClear: onClear,
                        data: userList.data || [],
                        optValue: "name",
                        optText: "appid",
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
            
                <div style={{marginLeft:50}}>
                <span>选择角色：</span>
                <ItemSelects
                    isItem={false}
                    select={{
                        showSearch: true,
                        style: {width: 360},
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
                            },{
                                value: "licenseAdmin",
                                label:"License管理员"
                            }
                        ],
                        optValue: "value",
                        optText: "label",
                        placeholder: "请选择角色",
                        optionLabelProp: "title",
                        value: role,
                        onSelect: (_, option: any) => onSelectRole(option),
                        renderOpt: (info) => info.label
                    }}
                ></ItemSelects></div>
                <div style={{textAlign: "center",marginTop:20}}>
                    <Button type='primary' htmlType='submit' loading={loading}>
                        添加
                    </Button>
                </div>
            </Form>
        </div>
    )
}

export interface TrustListPageProp {}

export interface QueryExecResultsParams {
    keywords: string
}

interface QueryProps {}
interface RemoveProps {
    id: string[]
}
export const TrustListPage: React.FC<TrustListPageProp> = (props) => {
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
                console.log("数据源：", res)
                const newData = res.data.map((item) => ({...item}))

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
            // let newArr = selectedRowKeys.map((item)=>parseInt(item))
            setSelectedRowKeys(selectedRowKeys)
        }
    }

    const onRemove = (id: string[]) => {
        console.log(id, "uid")
        NetWorkApi<RemoveProps, API.NewUrmResponse>({
            method: "delete",
            url: "urm",
            data: {
                id
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

    const judgeSource = (record) =>{
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
                return <>--</>;
        }
    }

    const columns: ColumnsType<API.UserList> = [
        {
            title: "用户",
            dataIndex: "name",
            render: (text: string, record) => (
                <div style={{display: "flex"}}>
                    <div style={{width: 32,display:"flex",alignItems:"center"}}>{judgeAvatar(record)}</div>

                    <div style={{paddingLeft: 10, flex: 1}}>
                        <div>{text}</div>
                        <div>{judgeSource(record)}</div>
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
                <Space>
                    <Popconfirm
                        title={"确定删除该用户吗？"}
                        onConfirm={() => {
                            onRemove([i.id])
                        }}
                    >
                        <Button size={"small"} danger={true}>
                            移除
                        </Button>
                    </Popconfirm>
                </Space>
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
                                                批量移除
                                            </Button>
                                        </Popconfirm>
                                    ) : (
                                        <Button type='primary' size='small' disabled={true}>
                                            批量移除
                                        </Button>
                                    )}
                                    <Button
                                        type='primary'
                                        htmlType='submit'
                                        size='small'
                                        onClick={() => setCreateUserShow(!createUserShow)}
                                    >
                                        添加用户
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
                title={"添加用户"}
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
