import React, {memo, ReactNode, useEffect, useRef, useState} from "react"
import {Button, Input, List, Tag} from "antd"
import {GithubOutlined, QqOutlined, WechatOutlined, SearchOutlined} from "@ant-design/icons"
import {ItemSelects} from "@/components/baseTemplate/FormItemUtil"
import type {SelectProps} from "antd/es/select"
import debounce from "lodash/debounce"
import "./TrustList.scss"
import {failed, info} from "@/utils/notification"
import {useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {OnlineUserItem} from "@/components/OnlineUserItem/OnlineUserItem"

const {Search} = Input
const {ipcRenderer, contextBridge} = window.require("electron")

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

export const TrustList: React.FC = memo(() => {
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
                                            <div className="author-info">
                                                <div className='author-icon'>{PlatformIcon[item.from_platform]}</div>
                                                <div className="author-role">
                                                    {item.role === "trusted" && "信任用户"}
                                                    {item.role === "admin" && "管理员"}
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
