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
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
interface UserListRequest {
    keywords: string
    limit: number
    page: number
    orderBy: string
    order: string
}
export interface TrustListPageProp {}
export const TrustListPage: React.FC<TrustListPageProp> = (props) => {
    const {t} = useI18nNamespaces(["admin", "yakitUi"])
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
            <Avatar size={20} style={{backgroundColor: "var(--Colors-Use-Main-Pressed)"}}>
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
            title: t("TrustListPage.user"),
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
            title: t("TrustListPage.userRole"),
            dataKey: "role",
            render: (text) => {
                let role = text
                switch (text) {
                    case "admin":
                        role = t("TrustListPage.administrator")
                        break
                    case "superAdmin":
                        role = t("TrustListPage.superAdministrator")
                        break
                    case "licenseAdmin":
                        role = t("TrustListPage.licenseAdministrator")
                        break
                    case "trusted":
                        role = t("TrustListPage.trustedUser")
                        break
                    case "operate":
                        role = t("TrustListPage.operationsSpecialist")
                        break
                    case "auditor":
                        role = t("TrustListPage.auditor")
                        break
                    default:
                        role = "--"
                        break
                }
                return role
            }
        },
        {
            title: t("TrustListPage.createdAt"),
            dataKey: "created_at",
            ellipsis: true,
            render: (text) => <span>{moment.unix(text).format("YYYY-MM-DD HH:mm")}</span>
        },
        {
            title: t("YakitTable.action"),
            dataKey: "action",
            width: 80,
            fixed: "right",
            render: (_, record: API.UserList) => (
                <>
                    <YakitPopconfirm
                        title={t("TrustListPage.confirmRemoveUser")}
                        onConfirm={() => {
                            onRemoveSingle(record.appid, record.id)
                        }}
                        placement='right'
                    >
                        <YakitButton type='text' colors='danger'>
                            {t("YakitButton.remove")}
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
                const data = res.data || []
                const d = isInit ? data : response.data.concat(data)
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
                yakitNotify("error", t("TrustListPage.getAccountListFailed", {error: e}))
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
                yakitNotify("success", t("TrustListPage.deleteUserSuccess"))
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
                yakitNotify("error", t("TrustListPage.deleteUserFailed", {error: err}))
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
                yakitNotify("success", t("TrustListPage.deleteUserSuccess"))
                setQuery((prevQuery) => ({
                    ...prevQuery,
                    page: 1
                }))
                setSelectList([])
                setAllCheck(false)
            })
            .catch((err) => {
                yakitNotify("error", t("TrustListPage.deleteUserFailed", {error: err}))
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
                            placeholder={t("AccountAdminPage.searchUserPlaceholder")}
                            enterButton={true}
                            style={{width: 200}}
                            onSearch={(value) => {
                                setQuery((prevQuery) => ({...prevQuery, keywords: value}))
                            }}
                        />
                        <YakitPopconfirm
                            title={t("TrustListPage.confirmDeleteSelectedUsers")}
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
                                {t("YakitButton.batchRemove")}
                            </YakitButton>
                        </YakitPopconfirm>
                        <YakitButton size='small' onClick={() => setCreateUserShow(!createUserShow)}>
                            {t("TrustListPage.addUser")}
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
                title={t("TrustListPage.addUser")}
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
    const {t} = useI18nNamespaces(["admin", "yakitUi"])
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
                yakitNotify("error", t("CreateUserForm.addFailed", {error: err}))
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
                    yakitNotify("error", t("CreateUserForm.getNormalUserFailed", {error: err}))
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
            <Form.Item
                label={t("TrustListPage.addUser")}
                name='name'
                rules={[{required: true, message: t("CreateUserForm.addUserRequired")}]}
            >
                <YakitSelect
                    showSearch
                    allowClear
                    onClear={onClear}
                    onSelect={(_, option: any) => {
                        form.setFieldsValue({name: option.record.name + "_" + option.record.appid})
                        appidRef.current = option.record.appid
                    }}
                    onSearch={getUserList}
                    placeholder={t("CreateUserForm.inputFullUsername")}
                    optionLabelProp='lable'
                >
                    {userList.data.map((item) => {
                        return (
                            <YakitSelect.Option
                                key={item.appid}
                                value={item.name + "_" + item.appid}
                                title={item.appid}
                                lable={item.name}
                                record={item}
                            >
                                <OnlineUserItem info={item} />
                            </YakitSelect.Option>
                        )
                    })}
                </YakitSelect>
            </Form.Item>
            <Form.Item label={t("CreateUserForm.selectRole")} name='role'>
                <YakitSelect
                    options={[
                        {
                            value: "trusted",
                            label: t("TrustListPage.trustedUser")
                        },
                        {
                            value: "admin",
                            label: t("TrustListPage.administrator")
                        },
                        {
                            value: "licenseAdmin",
                            label: t("TrustListPage.licenseAdministrator")
                        },
                        {
                            value: "operate",
                            label: t("TrustListPage.operationsSpecialist")
                        },
                        {
                            value: "auditor",
                            label: t("TrustListPage.auditor")
                        }
                    ]}
                    placeholder={t("CreateUserForm.selectRolePlaceholder")}
                ></YakitSelect>
            </Form.Item>
            <div style={{textAlign: "right"}}>
                <YakitButton htmlType='submit' loading={loading}>
                    {t("YakitButton.add")}
                </YakitButton>
            </div>
        </Form>
    )
}
