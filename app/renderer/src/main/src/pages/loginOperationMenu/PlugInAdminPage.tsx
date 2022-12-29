import React, {ReactNode, useEffect, useRef, useState} from "react"
import {Table, Space, Button, Input, Modal, Form, Popconfirm, Tag, Avatar, TreeSelect, Checkbox, Tooltip} from "antd"
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
import type {TreeSelectProps} from "antd"
import type {DefaultOptionType} from "antd/es/select"
import {FormInstance} from "antd/es/form/Form"

export interface PluglnTreeSelectProps {
    form: FormInstance<any>
    itemInfo:API.UserAuthorityList|undefined
}

export interface PluginGroupProps {
    is_private?: boolean
    keyword?: string
    type?: string
}

export const PluglnTreeSelectItem: React.FC<PluglnTreeSelectProps> = (props) => {
    const {form,itemInfo} = props
    const [treeLoadedKeys, setTreeLoadedKeys] = useState<any>([])
    const [selectedAll, setSelectedAll] = useState<boolean>(false)
    // 受控模式控制浮层
    const [open, setOpen] = useState(false)
    const PluginType = {
        yak: "YAK 插件",
        mitm: "MITM 插件",
        "packet-hack": "数据包扫描",
        "port-scan": "端口扫描插件",
        codec: "CODEC插件",
        nuclei: "YAML POC"
    }
    const [treeData, setTreeData] = useState<Omit<DefaultOptionType, "label">[]>([])
    const [checkAllId, setCheckAllId, getCheckAllId] = useGetState<number[]>([])
    const [isShowCheckAll, setIsShowCheckAll] = useState<boolean>(true)

    useEffect(() => {
        getPluginGroup()
    }, [])

    const getPluginGroup = () => {
        let params: any = {
            is_private: true
        }
        NetWorkApi<PluginGroupProps, API.PluginGroupListResponse>({
            method: "get",
            url: "plugin/group",
            params
        })
            .then((res: API.PluginGroupListResponse) => {
                if (Array.isArray(res.data)) {
                    let checkAllIdArr: number[] = []
                    const newArr = res.data.map((item) => {
                        return {
                            key: item.type,
                            value: item.type,
                            title: PluginType[item.type],
                            isLeaf: item.typeList ? false : true,
                            children: item.typeList
                                ? item.typeList
                                      .filter((itemIn) => itemIn.script_name.length > 0)
                                      .map((itemIn) => {
                                          checkAllIdArr.push(itemIn.id)
                                          return {
                                              key: itemIn.id,
                                              value: itemIn.id,
                                              title: itemIn.script_name
                                          }
                                      })
                                : null
                        }
                    })

                    if(itemInfo){
                        const treeSelect = itemInfo.plugin?itemInfo.plugin.map((item)=>({label:item.script_name,value:item.id})):[]
                        treeSelect.length===checkAllIdArr.length&&setSelectedAll(true)
                        form.setFieldsValue({
                            treeSelect
                        })
                    }

                    setCheckAllId(checkAllIdArr)
                    setTreeData(newArr)
                } else {
                    setTreeData([])
                    setCheckAllId([])
                }
            })
            .catch((err) => {
                failed("失败：" + err)
            })
            .finally(() => {})
    }

    const onChange = (newValue: number[], label, extra) => {
        if (newValue.length === getCheckAllId().length) {
            setSelectedAll(true)
        } else {
            setSelectedAll(false)
        }
    }

    const selectDropdown = useMemoizedFn((originNode: React.ReactNode) => {
        return (
            <>
                {isShowCheckAll && (
                    <Checkbox
                        checked={selectedAll}
                        style={{padding: "0 0px 4px 24px", width: "100%"}}
                        onChange={(e) => {
                            const {checked} = e.target
                            setSelectedAll(checked)
                            if (checked) {
                                form.setFieldsValue({
                                    treeSelect: checkAllId
                                })
                            } else {
                                form.setFieldsValue({
                                    treeSelect: []
                                })
                            }
                        }}
                    >
                        全部
                    </Checkbox>
                )}
                {originNode}
            </>
        )
    })

    return (
        <Form.Item name='treeSelect' label='插件权限' rules={[{required: true, message: "该项为必填"}]}>
            <TreeSelect
                onSearch={(value) => {
                    value.length > 0 && setIsShowCheckAll(false)
                }}
                onSelect={() => {
                    setIsShowCheckAll(true)
                }}
                showSearch={true}
                treeNodeFilterProp='title'
                style={{width: "100%"}}
                dropdownStyle={{maxHeight: 400, overflow: "auto"}}
                placeholder='请选择插件权限'
                treeCheckable={true}
                onChange={onChange}
                treeData={treeData}
                allowClear
                maxTagCount={selectedAll ? 0 : 10}
                maxTagPlaceholder={(omittedValues)=>selectedAll ? "全部" : <>+ {omittedValues.length} ...</>}
                dropdownRender={(originNode: React.ReactNode) => selectDropdown(originNode)}
                open={open}
                onDropdownVisibleChange={(visible) => setOpen(visible)}
                treeLoadedKeys={treeLoadedKeys}
                treeExpandedKeys={treeLoadedKeys}
                onTreeExpand={(expandedKeys) => {
                    setTreeLoadedKeys(expandedKeys)
                }}
            />
        </Form.Item>
    )
}

export interface ShowUserInfoProps extends API.NewUrmResponse {
    onClose: () => void
}

export interface CreateUserFormProps {
    // 是否是编辑
    isEdit:boolean
    itemInfo:API.UserAuthorityList|undefined
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
    const {isEdit,itemInfo,onCancel, refresh} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const [userList, setUserList] = useState<API.UserOrdinaryResponse>({
        data: []
    })
    const [appid, setAppid] = useState<number[]>([])
    const [currentUser, setCurrentUser] = useState<string[]>([])

    useEffect(()=>{
        if(isEdit&&itemInfo){
            const user_name = itemInfo?.user_name?[itemInfo?.user_name]:[]
            setCurrentUser(user_name)
            const user_id = itemInfo?.user_id?[itemInfo?.user_id]:[]
            setAppid(user_id)
        }
    },[])

    const onFinish = useMemoizedFn((values) => {
        if (appid.length === 0) {
            info("请先选择用户")
            return
        }
        const {treeSelect} = values
        const pluginIds: string = treeSelect.join(",")

        NetWorkApi<API.UserAuthorityRequest, API.NewUrmResponse>({
            method: "post",
            url: "user/authority",
            data: {
                userIds: appid,
                pluginIds
            }
        })
            .then((res: API.NewUrmResponse) => {
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
        setAppid([])
        setCurrentUser([])
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
        const title = option.map((item) => item.record.id)
        const value = option.map((item) => item.value)
        setAppid(title)
        setCurrentUser(value)
    })

    return (
        <div style={{marginTop: 24}}>
            <Form {...layout} form={form} onFinish={onFinish}>
                <Form.Item name='name' label='用户名'>
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
                            optKey: "appid",
                            placeholder: "请输入完整的用户名",
                            optionLabelProp: "name",
                            value: currentUser,
                            mode: "multiple",
                            onChange: (_, option: any) => {
                                onSelectUser(option)
                            },
                            onSearch: getUserList,
                            renderOpt: (info: API.UserList) => {
                                return <OnlineUserItem info={info} />
                            },
                            disabled:isEdit
                        }}
                    />
                </Form.Item>
                <PluglnTreeSelectItem form={form} itemInfo={itemInfo}/>
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
    userIds: number[]
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
    const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
    const [pagination, setPagination] = useState<PaginationSchema>({
        Limit: 20,
        Order: "desc",
        OrderBy: "updated_at",
        Page: 1
    })
    const [data, setData] = useState<API.UserAuthorityList[]>([])
    const [total, setTotal] = useState<number>(0)
    const [isEditModal,setIsEditModal] = useState<boolean>(false)
    const [itemInfo,setItemInfo] = useState<API.UserAuthorityList>()

    const update = (page?: number, limit?: number, order?: string, orderBy?: string) => {
        setLoading(true)
        const paginationProps = {
            page: page || 1,
            limit: limit || pagination.Limit
        }

        NetWorkApi<QueryProps, API.UserAuthorityListResponse>({
            method: "get",
            url: "user/authority",
            params: {
                ...params,
                ...paginationProps
            }
        })
            .then((res) => {
                setData(res.data || [])
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
        onChange: (selectedRowKeys, selectedRows: API.UserAuthorityList[]) => {
            let newArr = selectedRows.map((item) => item.user_id || 0)
            setSelectedRowKeys(newArr)
        }
    }

    const onRemove = (userIds: number[]) => {
        NetWorkApi<RemoveProps, API.NewUrmResponse>({
            method: "delete",
            url: "user/authority",
            data: {
                userIds
            }
        })
            .then((res) => {
                success("删除用户成功")
                update()
            })
            .catch((err) => {
                failed("删除失败：" + err)
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

    const columns: ColumnsType<API.UserAuthorityList> = [
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
            title: "插件权限",
            dataIndex: "plugin",
            render: (text) => {
                const content: string = Array.isArray(text) ? text.map((item) => item.script_name).join("，") : ""
                return (
                    <Button
                        size={"small"}
                        type='link'
                        onClick={() => {
                            const m = showModal({
                                title: "插件权限",
                                content: <div style={{maxHeight: 520, overflow: "auto"}}>{content}</div>
                            })
                            return m
                        }}
                    >
                        {text && text.length}
                    </Button>
                )
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
                    <Button size={"small"} type='link' onClick={()=>{
                        setIsEditModal(false)
                        setItemInfo(i)
                        setCreateUserShow(!createUserShow)
                    }}>
                        复制
                    </Button>
                    <Button size='small' type='link' onClick={()=>{
                        setIsEditModal(true)
                        setItemInfo(i)
                        setCreateUserShow(!createUserShow)
                    }}>
                        编辑
                    </Button>
                    <Popconfirm
                        title={"确定删除该用户吗？"}
                        onConfirm={() => {
                            onRemove([i.user_id])
                        }}
                    >
                        <Button size={"small"} danger={true} type='link'>
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),width:160
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
                rowKey={(row) => row.appid}
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
                                        onClick={() => {
                                            setIsEditModal(false)
                                            setCreateUserShow(!createUserShow)
                                            setItemInfo(undefined)
                                        }}
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
                title={isEditModal?"编辑插件":"添加插件"}
                destroyOnClose={true}
                maskClosable={false}
                bodyStyle={{padding: "10px 24px 24px 24px"}}
                width={520}
                onCancel={() => setCreateUserShow(false)}
                footer={null}
            >
                <CreateUserForm isEdit={isEditModal} itemInfo={itemInfo} onCancel={() => setCreateUserShow(false)} refresh={() => update()} />
            </Modal>
        </div>
    )
}

export default PlugInAdminPage
