import React, {ReactNode, useEffect, useRef, useState} from "react"
import {Table, Space, Button, Input, Modal, Radio, Avatar, Spin, DatePicker, Menu} from "antd"
import locale from "antd/es/date-picker/locale/zh_CN"
import {API} from "@/services/swagger/resposeType"
import {callCopyToClipboard} from "@/utils/basic"
import {useDebounceFn, useGetState, useMemoizedFn} from "ahooks"
import moment from "moment"
import {failed, success, warn} from "@/utils/notification"
import {NetWorkApi} from "@/services/fetch"
import {PaginationSchema} from "@/pages/invoker/schema"
import {ControlMyselfIcon, ControlOtherIcon} from "@/assets/icons"
import styles from "./DynamicControl.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {ContentUploadInput} from "@/components/functionTemplate/ContentUploadTextArea"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {VirtualTable} from "./VirtualTable"
import {QueryYakScriptsResponse} from "../invoker/schema"
import {VirtualColumns} from "./VirtualTable"
import {DynamicStatusProps, UserInfoProps, useStore, yakitDynamicStatus} from "@/store"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import { getReleaseEditionName } from "@/utils/envfile"
const {TextArea} = Input
const {ipcRenderer} = window.require("electron")
const {RangePicker} = DatePicker
export interface ControlOperationProps {
    controlName: string
}

// 控制中 - 禁止操作
export const ControlOperation: React.FC<ControlOperationProps> = (props) => {
    const {controlName} = props
    const {userInfo} = useStore()
    const {dynamicStatus} = yakitDynamicStatus()
    // 关闭远程控制
    const closeControl = () => {
        ipcRenderer.invoke("kill-dynamic-control")
        // 立即退出界面
        ipcRenderer.invoke("lougin-out-dynamic-control-page")
        remoteOperation(false, dynamicStatus, userInfo)
    }
    return (
        <div className={styles["control-operation"]}>
            <div className={styles["control-operation-box"]}>
                <div className={styles["control-operation-title"]}>远程控制中</div>
                <div className={styles["control-operation-seconend-title"]}>
                    已被用户 {controlName} 远程控制，请勿关闭 {getReleaseEditionName()}
                </div>
                <div className={styles["control-operation-img"]}>
                    <ControlMyselfIcon />
                </div>
                <YakitButton
                    onClick={closeControl}
                    size='max'
                    type='danger'
                    className={styles["control-operation-btn"]}
                >
                    退出远程
                </YakitButton>
                <div className={styles["control-operation-left-bg"]}></div>
                <div className={styles["control-operation-right-bg"]}></div>
            </div>
        </div>
    )
}

export interface ControlMyselfProps {
    goBack: () => void
}

export interface ResultObjProps {
    id: string
    note: string
    port: number
    host: string
    pubpem: string
    secret: string
}

export interface ResposeProps {
    alive: boolean
}

// 受控端
export const ControlMyself: React.FC<ControlMyselfProps> = (props) => {
    const {goBack} = props
    const [loading, setLoading] = useState<boolean>(true)
    const [textArea, setTextArea] = useState<string>()
    const {userInfo} = useStore()
    const {dynamicStatus, setDynamicStatus} = yakitDynamicStatus()
    const [restartBtn, setRestartBtn] = useState<boolean>(false)
    const [restartLoading, setRestartLoading] = useState<boolean>(false)

    // 10秒内获取不到密钥则切换按钮（杀掉进程-重新获取）
    const judgeLoading = () => {
        setRestartLoading(false)
        setTimeout(() => {
            if (loading) {
                setRestartBtn(true)
            }
        }, 1000 * 10)
    }

    const run = () => {
        /* 
            受控端步骤
            1.通过/remote/tunnel获取ip与password
        */
        NetWorkApi<any, API.RemoteTunnelResponse>({
            url: "remote/tunnel",
            method: "get"
        })
            .then((data) => {
                const {server, secret, gen_tls_crt} = data
                // 2.启动远程控制服务
                ipcRenderer
                    .invoke("start-dynamic-control", {note: userInfo.companyName, server, secret, gen_tls_crt})
                    .then((respose: ResposeProps) => {
                        // 如若服务已启动 且10秒内获取不到密钥则切换按钮（杀掉进程-重新获取）
                        if (respose.alive) {
                            judgeLoading()
                        }
                        // 3.获取密钥
                        NetWorkApi<any, API.RemoteOperationResponse>({
                            url: "remote/operation",
                            method: "get",
                            params: {
                                note: userInfo.companyName
                            }
                        })
                            .then((res) => {
                                const {data} = res
                                if (Array.isArray(data) && data.length > 0) {
                                    const {auth, id, note, port, host} = data[0]
                                    const {pubpem, secret} = JSON.parse(auth)
                                    setRemoteValue("REMOTE_OPERATION_ID", id)
                                    let resultObj = {
                                        id,
                                        note,
                                        port,
                                        host,
                                        pubpem,
                                        secret
                                    }
                                    const showData = unReadable(resultObj)
                                    // 用于受控主动退出通知
                                    setDynamicStatus({...dynamicStatus, ...resultObj})
                                    setTextArea(showData)
                                    setLoading(false)
                                } else {
                                    failed(`获取远程连接信息/复制密钥失败`)
                                }
                            })
                            .catch((err) => {
                                failed(`获取远程连接信息/复制密钥失败:${err}`)
                            })
                            .finally(() => {})
                    })
                    .catch((e) => {
                        failed(`远程连接失败:${e}`)
                    })
            })
            .catch((err) => {
                failed(`获取server/secret失败:${err}`)
            })
            .finally(() => {})
    }

    useEffect(() => {
        // ipcRenderer.invoke("kill-dynamic-control").finally(() => {
        run()
        // })
    }, [])

    return (
        <div className={styles["control-myself"]}>
            <Spin spinning={loading}>
                <TextArea
                    value={textArea}
                    className={styles["text-area"]}
                    autoSize={{minRows: 3, maxRows: 10}}
                    disabled
                />
            </Spin>
            <div className={styles["btn-box"]}>
                <YakitButton type='outline2' style={{marginRight: 8}} onClick={goBack}>
                    返回上一步
                </YakitButton>
                {restartBtn ? (
                    <YakitButton
                        loading={restartLoading}
                        onClick={() => {
                            setRestartLoading(true)
                            ipcRenderer.invoke("kill-dynamic-control").finally(() => {
                                setRestartBtn(false)
                                run()
                            })
                        }}
                    >
                        重启服务
                    </YakitButton>
                ) : (
                    <YakitButton
                        loading={loading}
                        onClick={() => {
                            ipcRenderer.invoke("set-copy-clipboard", textArea)
                            success("复制成功")
                        }}
                    >
                        复制密钥
                    </YakitButton>
                )}
            </div>
        </div>
    )
}

export interface ControlOtherProps {
    goBack: () => void
    runControl: (v: string, url: string) => void
}

// 控制端
export const ControlOther: React.FC<ControlOtherProps> = (props) => {
    const {goBack, runControl} = props
    const [textAreaValue, setTextAreaValue] = useState<string>("")
    const [uploadLoading, setUploadLoading] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)

    const onFinish = () => {
        const resultObj: ResultObjProps|undefined = readable(textAreaValue)
        if (resultObj&&resultObj?.id) {
            NetWorkApi<any, API.RemoteStatusResponse>({
                method: "get",
                url: "remote/status",
                params: {
                    tunnel: resultObj?.id
                }
            }).then((res) => {
                if (res.status) {
                    warn("由于远程目标已在远程控制中，暂无法连接")
                } else {
                    // 如有受控端服务则杀掉
                    ipcRenderer.invoke("kill-dynamic-control")
                    setLoading(true)
                    getRemoteValue(RemoteGV.HttpSetting).then((setting) => {
                        if (!setting) return
                        const value = JSON.parse(setting)
                        let url = value.BaseUrl
                        // 切换到自动远程连接
                        runControl(JSON.stringify(resultObj), url)
                    })
                }
            })
        } else {
            failed("密钥格式有误")
        }
    }
    return (
        <div className={styles["control-other"]}>
            <Spin spinning={uploadLoading}>
                <ContentUploadInput
                    type='textarea'
                    beforeUpload={(f) => {
                        const typeArr: string[] = [
                            "text/plain",
                            ".csv",
                            ".xls",
                            ".xlsx",
                            "application/vnd.ms-excel",
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        ]
                        if (!typeArr.includes(f.type)) {
                            failed(`${f.name}非txt、Excel文件，请上传txt、Excel格式文件！`)
                            return false
                        }

                        setUploadLoading(true)
                        ipcRenderer.invoke("fetch-file-content", (f as any).path).then((res) => {
                            let Targets = res
                            // 处理Excel格式文件
                            if (f.type !== "text/plain") {
                                let str = JSON.stringify(res)
                                Targets = str.replace(/(\[|\]|\{|\}|\")/g, "")
                            }
                            setTextAreaValue(Targets)
                            setTimeout(() => setUploadLoading(false), 100)
                        })
                        return false
                    }}
                    item={{help: <></>}}
                    textarea={{
                        className: "text-area",
                        isBubbing: true,
                        setValue: (value) => setTextAreaValue(value),
                        value: textAreaValue,
                        autoSize: {minRows: 3, maxRows: 10},
                        placeholder: "请将链接密钥粘贴/输入到文本框中"
                    }}
                />
            </Spin>
            <div className={styles["btn-box"]}>
                <YakitButton type='outline2' style={{marginRight: 8}} onClick={goBack}>
                    返回上一步
                </YakitButton>
                <YakitButton onClick={() => onFinish()} loading={loading} disabled={textAreaValue.length === 0}>
                    远程连接
                </YakitButton>
            </div>
        </div>
    )
}

export interface SelectControlTypeProps {
    onControlMyself: (v: boolean) => void
    onControlOther: (v: boolean) => void
}

// 控制模式选择
export const SelectControlType: React.FC<SelectControlTypeProps> = (props) => {
    const {onControlMyself, onControlOther} = props
    return (
        <div className={styles["select-control-type"]}>
            <div className={styles["type-box"]} onClick={() => onControlMyself(true)}>
                <div className={styles["type-img"]}>
                    <ControlMyselfIcon />
                </div>
                <div className={styles["type-content"]}>
                    <div className={styles["type-title"]}>受控端</div>
                    <div className={styles["type-text"]}>生成邀请密钥</div>
                </div>
            </div>
            <div className={styles["type-box"]} onClick={() => onControlOther(true)}>
                <div className={styles["type-img"]}>
                    <ControlOtherIcon />
                </div>
                <div className={styles["type-content"]}>
                    <div className={styles["type-title"]}>控制端</div>
                    <div className={styles["type-text"]}>可通过受控端分享的密钥远程控制他的 客户端</div>
                </div>
            </div>
        </div>
    )
}

export interface DynamicControlProps {
    isShow: boolean
    onCancle: () => void
    mainTitle: string
    secondTitle: string
    children?: React.ReactNode
    width?: number
}

export const DynamicControl: React.FC<DynamicControlProps> = (props) => {
    const {isShow, onCancle, children, mainTitle, secondTitle, width} = props
    return (
        <Modal
            visible={isShow}
            destroyOnClose={true}
            maskClosable={false}
            bodyStyle={{padding: "18px 24px 24px 24px"}}
            width={width || 448}
            onCancel={() => onCancle()}
            footer={null}
            centered
        >
            <div className={styles["dynamic-control"]}>
                <div className={styles["title-box"]}>
                    <div className={styles["main-title"]}>{mainTitle}</div>
                    <div className={styles["second-title"]}>{secondTitle}</div>
                </div>
                {children}
            </div>
        </Modal>
    )
}

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
                <Button type='primary' onClick={() => copyUserInfo()}>
                    复制
                </Button>
            </div>
        </div>
    )
}

export interface ControlAdminPageProps {}
export interface AccountAdminPageProp {}

export interface QueryExecResultsParams {
    keywords: string
}
interface QueryProps {}

const defaultPagination = {
    Limit: 20,
    Order: "desc",
    OrderBy: "updated_at",
    Page: 1
}
export const ControlAdminPage: React.FC<ControlAdminPageProps> = (props) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [resetLoading, setResetLoading] = useState<boolean>(false)
    const [params, setParams, getParams] = useGetState<API.GetRemoteWhere>({
        user_name: ""
    })
    const [pagination, setPagination] = useGetState<PaginationSchema>(defaultPagination)
    const [data, setData] = useState<API.RemoteLists[]>([])
    const [total, setTotal] = useState<number>(0)
    const [hasMore, setHasMore] = useState<boolean>(true)
    const updateLoadMore = useDebounceFn(
        (page: number) => {
            if (page > Math.ceil(total / pagination.Limit)) {
                setHasMore(false)
                return
            }
            setLoading(true)
            setHasMore(true)
            const paginationProps = {
                page: page || 1,
                limit: pagination.Limit
            }

            NetWorkApi<QueryProps, API.RemoteResponse>({
                method: "get",
                url: "remote/list",
                params: {
                    ...paginationProps
                },
                data: {
                    ...getParams()
                }
            })
                .then((res) => {
                    if (Array.isArray(res?.data)) {
                        setData([...data, ...res?.data])
                    }
                    setPagination({...pagination, Limit: res.pagemeta.limit, Page: res.pagemeta.page})
                    setTotal(res.pagemeta.total)
                })
                .catch((err) => {
                    failed("获取远程管理列表失败：" + err)
                })
                .finally(() => {
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                })
        },
        {wait: 200}
    )

    const update = (page?: number, limit?: number) => {
        setResetLoading(true)
        const paginationProps = {
            page: page || 1,
            limit: limit || pagination.Limit
        }
        NetWorkApi<QueryProps, API.RemoteResponse>({
            method: "get",
            url: "remote/list",
            params: {
                ...paginationProps
            },
            data: {
                ...getParams()
            }
        })
            .then((res) => {
                setData(res?.data || [])
                setPagination({...pagination, Limit: res.pagemeta.limit, Page: res.pagemeta.page})
                setTotal(res.pagemeta.total)
            })
            .catch((err) => {
                failed("获取远程管理列表失败：" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setResetLoading(false)
                }, 200)
            })
    }

    useEffect(() => {
        update(1)
    }, [getParams().start_time, getParams().end_time, getParams().status])

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

    const columns: VirtualColumns[] = [
        {
            title: "控制端",
            render: (record) => {
                return (
                    <div>
                        {judgeAvatar({head_img: record?.head_img, user_name: record?.user_name})}
                        <span style={{marginLeft: 10}}>{record?.user_name}</span>
                    </div>
                )
            }
        },
        {
            title: "远程地址",
            dataIndex: "addr",
            render: (text) => <span>{text}</span>
        },
        {
            title: "开始时间",
            dataIndex: "created_at",
            render: (text) => <span>{moment.unix(text).format("YYYY-MM-DD HH:mm")}</span>
        },
        {
            title: "结束时间",
            dataIndex: "updated_at",
            render: (text, record) => {
                return <span>{record.status ? "-" : moment.unix(text).format("YYYY-MM-DD HH:mm")}</span>
            }
        },
        {
            title: "状态",
            dataIndex: "status",
            render: (i: boolean) => {
                return (
                    <div className={styles["radio-status"]}>
                        {i ? (
                            <Radio className={styles["radio-status-active"]} defaultChecked={true}>
                                远程中
                            </Radio>
                        ) : (
                            <Radio disabled={true} checked={true}>
                                已结束
                            </Radio>
                        )}
                    </div>
                )
            },
            width: 100,
            filterProps: {
                // popoverDirection:"left",
                filterRender: () => (
                    <YakitMenu
                        selectedKeys={undefined}
                        data={[
                            {
                                key: "all",
                                label: "全部"
                            },
                            {
                                key: "true",
                                label: "远程中"
                            },
                            {
                                key: "false",
                                label: "已结束"
                            }
                        ]}
                        onClick={({key}) => setParams({...getParams(), status: key === "all" ? undefined : key})}
                    ></YakitMenu>
                )
            }
        }
    ]
    return (
        <div className={styles["control-admin-page"]}>
            <Spin spinning={resetLoading}>
                <div className={styles["operation"]}>
                    <div className={styles["left-select"]}>
                        <div className={styles["title-box"]}>远程管理</div>

                        <span className={styles["total-box"]}>
                            <span className={styles["title"]}>Total</span>{" "}
                            <span className={styles["content"]}>{total}</span>
                        </span>
                    </div>

                    <div className={styles["right-filter"]}>
                        <div className={styles["date-time-search"]}>
                            <RangePicker
                                style={{width: 200}}
                                size='small'
                                locale={locale}
                                onChange={(value) => {
                                    if (value) {
                                        setParams({
                                            ...getParams(),
                                            start_time: moment(value[0]).unix(),
                                            end_time: moment(value[1]).unix()
                                        })
                                    } else {
                                        setParams({...getParams(), start_time: undefined, end_time: undefined})
                                    }
                                }}
                            />
                        </div>
                        <YakitInput.Search
                            placeholder={"请输入用户名"}
                            enterButton={true}
                            size='middle'
                            style={{width: 200}}
                            value={params.user_name}
                            onChange={(e) => {
                                setParams({...getParams(), user_name: e.target.value})
                            }}
                            allowClear={false}
                            onSearch={() => {
                                update(1)
                            }}
                        />
                    </div>
                </div>
                <div className={styles["virtual-table-box"]}>
                    <VirtualTable
                        loading={loading}
                        hasMore={hasMore}
                        columns={columns}
                        dataSource={data}
                        loadMoreData={() => updateLoadMore.run(pagination.Page + 1)}
                    />
                </div>
            </Spin>
        </div>
    )
}

/** 通知是否远程连接 */
export const remoteOperation = (status: boolean, dynamicStatus: DynamicStatusProps, userInfo?: UserInfoProps) => {
    const {id, host, port, secret, note} = dynamicStatus
    return new Promise(async (resolve, reject) => {
        NetWorkApi<API.RemoteOperationRequest, API.ActionSucceeded>({
        url: "remote/operation",
        method: "post",
        data: {
            tunnel: id,
            addr: `${host}:${port}`,
            auth: secret,
            note,
            status
        }
    })
        .then((data) => {
            if (data.ok) {}
        })
        .catch((err) => {
            failed(`连接远程/取消失败:${err}`)
        })
        .finally(() => {
            resolve(true)
        })
    })
}

/** 数据内容不可读 */
export const unReadable = (resultObj: ResultObjProps) => {
    return `${resultObj.id},${resultObj.note},${resultObj.port},${resultObj.host},${resultObj.pubpem},${resultObj.secret}`
}

/** 数据内容可读 */
export const readable = (v: string) => {
    try {
        let arr = v.split(",")
        let obj: ResultObjProps = {
            id: arr[0],
            note: arr[1],
            port: parseInt(arr[2]),
            host: arr[3],
            pubpem: arr[4],
            secret: arr[5]
        }
        return obj
    } catch (error) {
        return
    }
}
