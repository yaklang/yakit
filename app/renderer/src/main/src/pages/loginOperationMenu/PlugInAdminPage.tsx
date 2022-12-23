import React, {ReactNode, useEffect, useRef, useState} from "react"
import {Table, Space, Button, Input, Modal, Form, Popconfirm, Tag, Avatar, TreeSelect} from "antd"
import type {ColumnsType} from "antd/es/table"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {useGetState, useMemoizedFn} from "ahooks"
import moment from "moment"
import styles from "./PlugInAdminPage.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import {PaginationSchema} from "../../pages/invoker/schema"
import {showModal} from "@/utils/showModal"
import {ItemSelects} from "@/components/baseTemplate/FormItemUtil"
import {OnlineUserItem} from "@/components/OnlineUserItem/OnlineUserItem"
import {GithubOutlined, QqOutlined, WechatOutlined, UserOutlined} from "@ant-design/icons"
import debounce from "lodash/debounce"
import {UserQuery} from "./TrustListPage"
const {TreeNode} = TreeSelect
const {ipcRenderer} = window.require("electron")

export interface ShowUserInfoProps extends API.NewUrmResponse {
    onClose: () => void
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
    const [userList, setUserList] = useState<API.UserOrdinaryResponse>({
        data: []
    })
    const [appid, setAppid] = useState<string>("")
    const [currentUser, setCurrentUser] = useState<string>()
    const onFinish = useMemoizedFn((values) => {
        if (!appid) {
            info("请先选择用户")
            return
        }
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

    const onSelectUser = useMemoizedFn((option: any) => {
        setAppid(option.title)
        setCurrentUser(option.value)
    })

    const treeData = [
        {
            title: "Node1",
            value: "0-0",
            children: [
                {
                    title: "Child Node1",
                    value: "0-0-1"
                },
                {
                    title: "Child Node2",
                    value: "0-0-2"
                }
            ]
        },
        {
            title: "Node2",
            value: "0-1"
        }
    ]

    return (
        <div style={{marginTop: 24}}>
            <Form {...layout} form={form} onFinish={onFinish}>
                <Form.Item name='user_name' label='用户名' rules={[{required: true, message: "该项为必填"}]}>
                    {/* <Input placeholder='请输入账号用户名' allowClear /> */}
                    <ItemSelects
                        isItem={false}
                        select={{
                            showSearch: true,
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
                    />
                </Form.Item>
                <Form.Item name='user_name1' label='插件权限' rules={[{required: true, message: "该项为必填"}]}>
                    <TreeSelect
                        showSearch
                        style={{width: "100%"}}
                        treeData={treeData}
                        dropdownStyle={{maxHeight: 400, overflow: "auto"}}
                        placeholder='请选择插件权限'
                        allowClear
                        multiple
                        treeDefaultExpandAll
                    />
                </Form.Item>
                <div style={{textAlign: "center"}}>
                    <Button type='primary' htmlType='submit' loading={loading}>
                        添加
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
const PlugInAdminPage: React.FC<AccountAdminPageProp> = (props) => {
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

    const columns: ColumnsType<API.UrmUserList> = [
        {
            title: "用户名",
            dataIndex: "user_name",
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
            title: "插件权限"
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
                    <Button size={"small"} type='link'>
                        复制
                    </Button>
                    <Button size='small' type='link'>
                        编辑
                    </Button>
                    <Popconfirm
                        title={"确定删除该用户吗？"}
                        onConfirm={() => {
                            onRemove([i.uid])
                        }}
                    >
                        <Button size={"small"} danger={true} type='link'>
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
                        <div className={styles["table-title"]}>
                            <div className={styles["filter"]}>
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
                            <div className={styles["operation"]}>
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
                                        添加插件
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
                width={520}
                onCancel={() => setCreateUserShow(false)}
                footer={null}
            >
                <CreateUserForm onCancel={() => setCreateUserShow(false)} refresh={() => update()} />
            </Modal>
        </div>
    )
}

export default PlugInAdminPage
