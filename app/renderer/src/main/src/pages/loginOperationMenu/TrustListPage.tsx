import {API} from "@/services/swagger/resposeType"
import React, {useEffect, useMemo, useRef, useState} from "react"
import {useCreation, useDebounceFn, useMemoizedFn, useUpdateEffect} from "ahooks"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Avatar, Divider, Form} from "antd"
import {GithubOutlined, QqOutlined, WechatOutlined, UserOutlined} from "@ant-design/icons"
import moment from "moment"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {useCampare} from "@/hook/useCompare/useCompare"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {TrashIcon} from "@/assets/newIcon"
import {NetWorkApi} from "@/services/fetch"
import {yakitNotify} from "@/utils/notification"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import debounce from "lodash/debounce"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {OnlineUserItem} from "@/components/OnlineUserItem/OnlineUserItem"
import styles from "./TrustListPage.module.scss"
interface UserListRequest {
    keywords: string
    limit: number
    page: number
    orderBy: string
    order: string
}
export interface TrustListPageProp {}
export const TrustListPage: React.FC<TrustListPageProp> = (props) => {
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectList, setSelectList] = useState<API.UserList[]>([])
    const isInitRequestRef = useRef<boolean>(true)
    const [query, setQuery] = useState<UserListRequest>({
        keywords: "",
        page: 1,
        limit: 20,
        orderBy: "updated_at",
        order: "desc"
    })
    const [loading, setLoading] = useState(false)
    const [response, setResponse] = useState<API.UserListResponse>({
        data: [],
        pagemeta: {
            page: 1,
            limit: 20,
            total: 0,
            total_page: 0
        }
    })
    const [createUserShow, setCreateUserShow] = useState<boolean>(false)

    useEffect(() => {
        update(1)
    }, [])

    const judgeAvatar = (record) => {
        const {head_img, name} = record
        return head_img && !!head_img.length ? (
            <Avatar size={20} src={head_img} />
        ) : (
            <Avatar size={20} style={{backgroundColor: "var(--yakit-primary-6)"}}>
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

    const columns: ColumnsTypeProps[] = [
        {
            title: "用户",
            dataKey: "name",
            width: 450,
            render: (text, record) => (
                <div style={{display: "flex", alignItems: "center"}}>
                    {judgeAvatar(record)}
                    <div style={{paddingLeft: 10, flex: 1}}>
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
            dataKey: "role",
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
                    case "auditor":
                        role = "审核员"
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
            dataKey: "created_at",
            ellipsis: true,
            render: (text) => <span>{moment.unix(text).format("YYYY-MM-DD HH:mm")}</span>
        },
        {
            title: "操作",
            dataKey: "action",
            width: 80,
            fixed: "right",
            render: (_, record: API.UserList) => (
                <>
                    <YakitPopconfirm
                        title={"确定移除该用户吗？"}
                        onConfirm={() => {
                            onRemoveSingle(record.appid, record.id)
                        }}
                        placement='right'
                    >
                        <YakitButton type='text' colors='danger'>
                            移除
                        </YakitButton>
                    </YakitPopconfirm>
                </>
            )
        }
    ]

    const compareSelectList = useCampare(selectList)
    const selectedRowKeys = useCreation(() => {
        return selectList.map((item) => item.appid)
    }, [compareSelectList])
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, compareSelectList, response.pagemeta.total])
    const onSelectAll = useMemoizedFn((newSelectedRowKeys: string[], selected: API.UserList[], checked: boolean) => {
        if (checked) {
            setAllCheck(true)
            setSelectList(response.data)
        } else {
            setAllCheck(false)
            setSelectList([])
        }
    })
    const onChangeCheckboxSingle = useMemoizedFn((c: boolean, key: string, selectedRows: API.UserList) => {
        if (c) {
            setSelectList((s) => [...s, selectedRows])
        } else {
            setAllCheck(false)
            setSelectList((s) => s.filter((ele) => ele.appid !== selectedRows.appid))
        }
    })

    const queyChangeUpdateData = useDebounceFn(
        () => {
            // 初次不通过此处请求数据
            if (!isInitRequestRef.current) {
                update(1)
            }
        },
        {wait: 300}
    ).run

    useUpdateEffect(() => {
        queyChangeUpdateData()
    }, [query])

    const update = useMemoizedFn((page: number) => {
        const params: UserListRequest = {
            ...query,
            page
        }
        const isInit = page === 1
        isInitRequestRef.current = false
        if (isInit) {
            setLoading(true)
        }
        NetWorkApi<UserListRequest, API.UserListResponse>({
            method: "get",
            url: "user",
            params: params
        })
            .then((res) => {
                const d = isInit ? res.data : response.data.concat(res.data)
                setResponse({
                    ...res,
                    data: d
                })
                if (isInit) {
                    setIsRefresh((prevIsRefresh) => !prevIsRefresh)
                    setSelectList([])
                    setAllCheck(false)
                } else {
                    if (allCheck) {
                        setSelectList(d)
                    }
                }
            })
            .catch((e) => {
                yakitNotify("error", "获取账号列表失败：" + e)
            })
            .finally(() => {
                setLoading(false)
            })
    })

    const onRemoveSingle = (appid: string, id: number) => {
        NetWorkApi<API.UpdateUserRole, API.NewUrmResponse>({
            method: "post",
            url: "user",
            data: {
                appid: [appid],
                operation: "remove"
            }
        })
            .then((res) => {
                yakitNotify("success", "删除用户成功")
                setSelectList((s) => s.filter((ele) => ele.id !== id))
                setResponse({
                    data: response.data.filter((item) => item.id !== id),
                    pagemeta: {
                        ...response.pagemeta,
                        total: response.pagemeta.total - 1 > 0 ? response.pagemeta.total - 1 : 0
                    }
                })
            })
            .catch((err) => {
                yakitNotify("error", "删除账号失败：" + err)
            })
    }

    const onRemoveMultiple = () => {
        setLoading(true)
        NetWorkApi<API.UpdateUserRole, API.NewUrmResponse>({
            method: "post",
            url: "user",
            data: {
                appid: selectedRowKeys,
                operation: "remove"
            }
        })
            .then((res) => {
                yakitNotify("success", "删除用户成功")
                setQuery((prevQuery) => ({
                    ...prevQuery,
                    page: 1
                }))
                setSelectList([])
                setAllCheck(false)
            })
            .catch((err) => {
                yakitNotify("error", "删除账号失败：" + err)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    }

    return (
        <div className={styles["trustListPage"]}>
            <TableVirtualResize<API.UserList>
                loading={loading}
                query={query}
                isRefresh={isRefresh}
                titleHeight={42}
                title={
                    <div className={styles["virtual-table-header-wrap"]}>
                        <div className={styles["virtual-table-heard-left"]}>
                            <div className={styles["virtual-table-heard-left-item"]}>
                                <span className={styles["virtual-table-heard-left-text"]}>Total</span>
                                <span className={styles["virtual-table-heard-left-number"]}>
                                    {response.pagemeta.total}
                                </span>
                            </div>
                            <Divider type='vertical' />
                            <div className={styles["virtual-table-heard-left-item"]}>
                                <span className={styles["virtual-table-heard-left-text"]}>Selected</span>
                                <span className={styles["virtual-table-heard-left-number"]}>{selectNum}</span>
                            </div>
                        </div>
                    </div>
                }
                extra={
                    <div className={styles["newTrustListPage-table-extra"]}>
                        <YakitInput.Search
                            placeholder={"请输入用户名进行搜索"}
                            enterButton={true}
                            style={{width: 200}}
                            onSearch={(value) => {
                                setQuery((prevQuery) => ({...prevQuery, keywords: value}))
                            }}
                        />
                        <YakitPopconfirm
                            title={"确定删除选择的用户吗？不可恢复"}
                            onConfirm={(e) => {
                                e?.stopPropagation()
                                onRemoveMultiple()
                            }}
                            placement='bottomRight'
                            disabled={selectNum === 0}
                        >
                            <YakitButton
                                type='outline1'
                                colors='danger'
                                icon={<TrashIcon />}
                                disabled={selectNum === 0}
                            >
                                批量移除
                            </YakitButton>
                        </YakitPopconfirm>
                        <YakitButton size='small' onClick={() => setCreateUserShow(!createUserShow)}>
                            添加用户
                        </YakitButton>
                    </div>
                }
                data={response.data}
                enableDrag={false}
                renderKey='appid'
                columns={columns}
                useUpAndDown
                pagination={{
                    total: response.pagemeta.total,
                    limit: response.pagemeta.limit,
                    page: response.pagemeta.page,
                    onChange: (page) => {
                        update(page)
                    }
                }}
                rowSelection={{
                    isAll: allCheck,
                    type: "checkbox",
                    selectedRowKeys,
                    onSelectAll,
                    onChangeCheckboxSingle
                }}
            ></TableVirtualResize>
            <YakitModal
                visible={createUserShow}
                title={"添加用户"}
                destroyOnClose={true}
                maskClosable={false}
                bodyStyle={{padding: "10px 24px 24px 24px"}}
                width={500}
                onCancel={() => setCreateUserShow(false)}
                footer={null}
            >
                <CreateUserForm
                    onCancel={() => setCreateUserShow(false)}
                    refresh={() =>
                        setQuery((prevQuery) => ({
                            ...prevQuery,
                            page: 1
                        }))
                    }
                />
            </YakitModal>
        </div>
    )
}

interface UserQuery {
    keywords: string
    role?: string
}
interface CreateUserFormProps {
    onCancel: () => void
    refresh: () => void
}
const CreateUserForm: React.FC<CreateUserFormProps> = (props) => {
    const {onCancel, refresh} = props
    const [form] = Form.useForm()
    const appidRef = useRef<string>("")
    const [userList, setUserList] = useState<API.UserOrdinaryResponse>({
        data: []
    })
    const [loading, setLoading] = useState<boolean>(false)

    const onAdd = useMemoizedFn((values) => {
        const param = {
            appid: [appidRef.current],
            operation: "add",
            role: values.role
        }
        setLoading(true)
        NetWorkApi<API.UpdateUserRole, API.ActionSucceeded>({
            method: "post",
            url: "user",
            data: param
        })
            .then((res) => {
                onCancel()
                refresh()
            })
            .catch((err) => {
                yakitNotify("error", "增加失败：" + err)
            })
            .finally(() => {
                setLoading(false)
            })
    })

    const onClear = useMemoizedFn(() => {
        setUserList({
            data: []
        })
        form.setFieldsValue({name: ""})
        appidRef.current = ""
    })

    const getUserList = debounce(
        useMemoizedFn((value: string) => {
            if (!value) {
                onClear()
                return
            }
            NetWorkApi<UserQuery, API.UserOrdinaryResponse>({
                method: "get",
                url: "user/ordinary",
                params: {
                    keywords: value
                }
            })
                .then((res) => {
                    const {data = []} = res
                    setUserList({data: data || []})
                })
                .catch((err) => {
                    yakitNotify("error", "获取普通用户失败：" + err)
                })
        }),
        300
    )

    return (
        <Form
            form={form}
            initialValues={{name: "", role: "trusted"}}
            layout={"horizontal"}
            labelCol={{span: 8}}
            wrapperCol={{span: 15}}
            onFinish={onAdd}
        >
            <Form.Item label='添加用户' name='name' rules={[{required: true, message: "添加用户必填"}]}>
                <YakitSelect
                    showSearch
                    allowClear
                    onClear={onClear}
                    onSelect={(_, option: any) => {
                        form.setFieldsValue({name: option.record.name})
                        appidRef.current = option.record.appid
                    }}
                    onSearch={getUserList}
                    placeholder='请输入完整的用户名'
                    optionLabelProp='name'
                >
                    {userList.data.map((item) => {
                        return (
                            <YakitSelect.Option key={item.appid} value={item.name} title={item.appid} record={item}>
                                <OnlineUserItem info={item} />
                            </YakitSelect.Option>
                        )
                    })}
                </YakitSelect>
            </Form.Item>
            <Form.Item label='选择角色' name='role'>
                <YakitSelect
                    options={[
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
                        {
                            value: "auditor",
                            label: "审核员"
                        }
                    ]}
                    placeholder='请选择角色'
                ></YakitSelect>
            </Form.Item>
            <div style={{textAlign: "right"}}>
                <YakitButton htmlType='submit' loading={loading}>
                    添加
                </YakitButton>
            </div>
        </Form>
    )
}
