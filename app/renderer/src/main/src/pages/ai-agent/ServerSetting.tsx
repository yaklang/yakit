import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useControllableValue, useMemoizedFn} from "ahooks"
import {MCPServerProps, RenderMCPClientInfo, ServerChatInfo, ServerChatProps, ServerSettingProps} from "./aiAgentType"
import {formatMCPResourceTemplates, formatMCPTools, formatTime} from "./utils"
import {
    grpcCancelYakMcp,
    grpcCloseMCPClient,
    grpcConnectMCPClient,
    grpcDeleteMCPClient,
    grpcMCPClientCallTool,
    grpcStartYakMcp
} from "./grpc"
import {MCPTransportTypeList} from "./defaultConstant"
import {OutlineClockIcon, OutlinePencilaltIcon, OutlinePlusIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {AddServerModal, AIAgentEmpty, AIAgentTask, EditChatNameModal} from "./UtilModals"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {ServerInfoModal} from "./ServerInfoModal"
import {randomString} from "@/utils/randomUtil"
import {yakitNotify} from "@/utils/notification"
import cloneDeep from "lodash/cloneDeep"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteAIAgentGV} from "@/enums/aiAgent"
import useMCPData from "./useMCPData"
import {Input, Tooltip} from "antd"
import {SolidChatalt2Icon, SolidPaperairplaneIcon} from "@/assets/icon/solid"

import classNames from "classnames"
import styles from "./AIAgent.module.scss"

const {ipcRenderer} = window.require("electron")

export const MCPServer: React.FC<MCPServerProps> = memo((props) => {
    const wrapper = useRef<HTMLDivElement>(null)
    const [servers, setServers] = useState<RenderMCPClientInfo[]>([])
    useEffect(() => {
        setTimeout(() => {
            setServers([])
        }, 1000)
    }, [])
    return (
        <div ref={wrapper} className={styles["mcp-server"]}>
            <ServerSetting servers={servers} setServers={setServers} />
            <div className={styles["server-chat-wrapper"]}>
                <ServerChat getContainer={wrapper.current || undefined} servers={servers} />
            </div>
        </div>
    )
})

const ServerSetting: React.FC<ServerSettingProps> = memo((props) => {
    const [servers, setServers] = useControllableValue<RenderMCPClientInfo[]>(props, {
        defaultValue: [],
        valuePropName: "servers",
        trigger: "setServers"
    })

    // 读取缓存客户端配置信息
    const handleReadCacheClientSetting = useMemoizedFn(() => {
        getRemoteValue(RemoteAIAgentGV.MCPClientList)
            .then((res) => {
                if (!res) return
                try {
                    const cache = JSON.parse(res) as RenderMCPClientInfo[]
                    setServers((old) => {
                        const cacheIDs = cache.map((item) => item.id)
                        const arr = old.filter((item) => !cacheIDs.includes(item.id))
                        return [...arr, ...cache]
                    })
                } catch (error) {}
            })
            .catch(() => {})
    })
    // 缓存客户端配置信息
    const handleCacheClientSetting = useMemoizedFn(() => {
        const cache =
            servers
                .filter((item) => !item.isDefault)
                .map((item) => {
                    const el = cloneDeep(item)
                    el.status = false
                    delete el.originalData
                    delete el.tools
                    delete el.resourceTemplates
                    return el
                }) || []
        setRemoteValue(RemoteAIAgentGV.MCPClientList, JSON.stringify(cache))
    })

    // 初始默认MCP服务器
    // 监听已启动的 MCP 客户端异常退出情况
    // useEffect(() => {
    //     ipcRenderer.on("yak-mcp-server-send", async (e, res: {URL: string}) => {
    //         if (res && res.URL) {
    //             try {
    //                 const data: RenderMCPClientInfo = {
    //                     isDefault: true,
    //                     id: randomString(16),
    //                     type: "sse",
    //                     url: res.URL,
    //                     status: false
    //                 }
    //                 setServers((old) => {
    //                     const newList = [...old.filter((item) => !item.isDefault), data]
    //                     return newList
    //                 })
    //                 setTimeout(() => {
    //                     handleConnectServer(data)
    //                 }, 2000)
    //             } catch (error) {
    //                 yakitNotify("error", "获取默认MCP服务器失败: " + error)
    //             }
    //         }
    //         handleReadCacheClientSetting()
    //     })
    //     grpcStartYakMcp().catch(() => {})

    //     ipcRenderer.on("mcp-client-error", (e, id: string, error: string) => {
    //         yakitNotify("error", `MCP(id:${id})异常退出: ${error}`)
    //         setServers((old) =>
    //             old.map((item) => {
    //                 if (item.id === id) item.status = false
    //                 return item
    //             })
    //         )
    //     })

    //     return () => {
    //         ipcRenderer.removeAllListeners("yak-mcp-server-send")
    //         ipcRenderer.removeAllListeners("mcp-client-error")
    //         grpcCancelYakMcp().catch(() => {})
    //         handleCacheClientSetting()
    //     }
    // }, [])

    const [addShow, setAddShow] = useState(false)
    const handleOpenAddServer = useMemoizedFn(() => {
        if (addShow) return
        setAddShow(true)
    })
    const handleCallbackAddServer = useMemoizedFn((result: boolean, info?: RenderMCPClientInfo) => {
        if (result) {
            if (info) setServers([...servers, info])
        }
        setAddShow(false)
    })

    const [connectLoading, setConnectLoading] = useState<string[]>([])
    // 连接
    const handleConnectServer = useMemoizedFn((info: RenderMCPClientInfo) => {
        const {id} = info
        const loading = connectLoading.includes(id)
        if (loading) return

        setConnectLoading((old) => [...old, id])
        grpcConnectMCPClient(info)
            .then((res) => {
                const {tools, resourceTemplates} = res
                console.log("res", JSON.stringify(res))
                setServers((old) => {
                    const newList = [...old]
                    const index = newList.findIndex((el) => el.id === id)
                    if (index > -1) {
                        newList[index].status = true
                        newList[index].originalData = res
                        newList[index].tools = formatMCPTools(tools)
                        newList[index].resourceTemplates = formatMCPResourceTemplates(resourceTemplates)
                    }
                    return [...newList]
                })
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setConnectLoading((old) => old.filter((el) => el !== id))
                }, 200)
            })
    })

    // 断开服务器-重置状态
    const handleResetServerInfo = useMemoizedFn((id: string) => {
        setServers((old) => {
            const newList = [...old]
            const index = newList.findIndex((el) => el.id === id)
            if (index > -1) {
                newList[index].status = false
                delete newList[index].originalData
                delete newList[index].tools
                delete newList[index].resourceTemplates
            }
            return [...newList]
        })
    })

    const [closeLoading, setCloseLoading] = useState<string[]>([])
    // 断开
    const handleCloseServer = useMemoizedFn((id: string) => {
        const loading = closeLoading.includes(id)
        if (loading) return

        setCloseLoading((old) => [...old, id])
        grpcCloseMCPClient(id)
            .then(() => {
                handleResetServerInfo(id)
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setCloseLoading((old) => old.filter((el) => el !== id))
                }, 200)
            })
    })
    // 删除
    const handleDeleteServer = useMemoizedFn((id: string) => {
        const loading = closeLoading.includes(id)
        if (loading) return

        setCloseLoading((old) => [...old, id])
        grpcDeleteMCPClient(id)
            .then(() => {
                setServers((old) => old.filter((el) => el.id !== id))
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setCloseLoading((old) => old.filter((el) => el !== id))
                }, 200)
            })
    })

    const viewInfo = useRef<RenderMCPClientInfo>()
    const [viewShow, setViewShow] = useState(false)
    // 查看
    const handleViewServer = useMemoizedFn((info: RenderMCPClientInfo) => {
        if (viewShow) return
        viewInfo.current = info
        setViewShow(true)
    })
    const handleCancelViewServer = useMemoizedFn(() => {
        setViewShow(false)
        viewInfo.current = undefined
    })

    const {onStart, onClose} = useMCPData()
    const handleStart = useMemoizedFn((token: string) => {
        const id = randomString(10)
        onStart(
            id,
            (progress) => {
                console.log("progress", progress)
            },
            (data) => {
                console.log("data", data)
            },
            (error) => {
                console.log("error", error)
            }
        )
        grpcMCPClientCallTool({
            clientID: token,
            taskID: id,
            request: {
                name: "longRunningOperation",
                arguments: {
                    duration: 20,
                    steps: 40
                }
            }
        })
            .then(() => {})
            .catch(() => {})
    })

    return (
        <div className={styles["server-setting"]}>
            <div className={styles["setting-header"]}>
                <div className={styles["header-style"]}>MCP服务器配置</div>
                <div className={styles["description-style"]}>
                    Modal Context Protocol(MCP)提供了标准化的 AI 模型上下文通信协议，支持 stdio 和 sse 连接方式
                </div>
            </div>

            <div className={styles["setting-list"]}>
                <div className={styles["list-header"]}>
                    <div className={styles["header-style"]}>服务器列表</div>
                    <YakitButton type='text2' onClick={handleOpenAddServer}>
                        添加
                        <OutlinePlusIcon />
                    </YakitButton>
                </div>

                <div className={styles["list-body"]}>
                    {servers.map((item) => {
                        const {id, type, status, isDefault} = item
                        const find = MCPTransportTypeList.find((el) => el.value === type)
                        const connect = connectLoading.includes(id)
                        const close = closeLoading.includes(id)

                        return (
                            <div key={id} className={styles["server-wrapper"]}>
                                <div className={styles["server-header"]}>
                                    <div className={styles["header-style"]}>{find?.label || "异常"}</div>
                                    <YakitTag>{status ? "已连接" : "未连接"}</YakitTag>
                                </div>

                                <div className={styles["server-content"]}>
                                    <div
                                        className={classNames(styles["line-style"], "yakit-content-single-ellipsis")}
                                        title={item.id || "-"}
                                    >
                                        id: {item.id || "-"}
                                    </div>
                                    {type === "sse" && (
                                        <div
                                            className={classNames(
                                                styles["line-style"],
                                                "yakit-content-single-ellipsis"
                                            )}
                                            title={item.url || "-"}
                                        >
                                            地址: {item.url || "-"}
                                        </div>
                                    )}
                                    {type === "stdio" && (
                                        <>
                                            <div
                                                className={classNames(
                                                    styles["line-style"],
                                                    "yakit-content-single-ellipsis"
                                                )}
                                                title={item.command || "-"}
                                            >
                                                可执行文件: {item.command || "-"}
                                            </div>
                                            <div
                                                className={classNames(
                                                    styles["line-style"],
                                                    "yakit-content-single-ellipsis"
                                                )}
                                                title={(item.args || []).toString() || "-"}
                                            >
                                                参数: {(item.args || []).toString() || "-"}
                                            </div>
                                            <div
                                                className={classNames(
                                                    styles["line-style"],
                                                    "yakit-content-single-ellipsis"
                                                )}
                                                title={item.args ? JSON.stringify(item.env) : "-"}
                                            >
                                                环境变量: {item.args ? JSON.stringify(item.env) : "-"}
                                            </div>
                                            <div
                                                className={classNames(
                                                    styles["line-style"],
                                                    "yakit-content-single-ellipsis"
                                                )}
                                                title={item.cwd || "-"}
                                            >
                                                工作目录: {item.cwd || "-"}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className={styles["server-footer"]}>
                                    {isDefault ? (
                                        <div></div>
                                    ) : (
                                        <YakitButton
                                            loading={close}
                                            type='outline2'
                                            onClick={() => handleDeleteServer(id)}
                                        >
                                            删除
                                        </YakitButton>
                                    )}

                                    <div className={styles["btn-group"]}>
                                        {status && !isDefault && (
                                            <YakitButton
                                                loading={close}
                                                type='outline2'
                                                onClick={() => handleCloseServer(id)}
                                            >
                                                断开
                                            </YakitButton>
                                        )}
                                        {isDefault && !status ? (
                                            <YakitButton loading={true}>连接中</YakitButton>
                                        ) : status ? (
                                            <YakitButton onClick={() => handleViewServer(item)}>查看</YakitButton>
                                        ) : (
                                            <YakitButton loading={connect} onClick={() => handleConnectServer(item)}>
                                                连接
                                            </YakitButton>
                                        )}
                                        <YakitButton
                                            onClick={() => {
                                                handleStart(id)
                                            }}
                                        >
                                            123
                                        </YakitButton>
                                        <YakitButton
                                            onClick={() => {
                                                onClose(id)
                                            }}
                                        >
                                            stop
                                        </YakitButton>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <AddServerModal visible={addShow} onCallback={handleCallbackAddServer} />

            {viewInfo.current && (
                <ServerInfoModal info={viewInfo.current} visible={viewShow} onCancel={handleCancelViewServer} />
            )}
        </div>
    )
})

const ServerChat: React.FC<ServerChatProps> = memo((props) => {
    const {getContainer, servers} = props

    const [chats, setChats] = useState<ServerChatInfo[]>([
        {id: "1", name: "测试1", time: Date.now()},
        {id: "2", name: "测试2", time: Date.now()},
        {id: "3", name: "测试3", time: Date.now()}
    ])
    const [activeChat, setActiveChat] = useState<string>("1")

    // #region 历史对话框相关功能
    const [showHistory, setShowHistory] = useState(false)
    const handleChangeShowHistory = useMemoizedFn(() => {
        setShowHistory((old) => !old)
    })

    const editInfo = useRef<ServerChatInfo>()
    const [editShow, setEditShow] = useState(false)
    // 没有编辑名称，如果需求完成还没有调整，直接删除编辑名称功能的相关代码
    const handleOpenEditName = useMemoizedFn((info: ServerChatInfo) => {
        if (editShow) return
        editInfo.current = info
        setEditShow(true)
    })
    const handleCallbackEditName = useMemoizedFn((result: boolean, info?: ServerChatInfo) => {
        if (result && info) {
            setChats((old) => {
                return old.map((item) => {
                    if (item.id === info.id) {
                        return info
                    }
                    return item
                })
            })
        }
        setEditShow(false)
        editInfo.current = undefined
    })
    const [delLoading, setDelLoading] = useState<string[]>([])
    const handleDeleteChat = useMemoizedFn((id: string) => {
        const isLoading = delLoading.includes(id)
        if (isLoading) return
        const findIndex = chats.findIndex((item) => item.id === id)
        if (findIndex === -1) {
            yakitNotify("error", "未找到对应的对话")
            return
        }
        setDelLoading((old) => [...old, id])
        let active = findIndex === chats.length - 1 ? chats[findIndex - 1].id : chats[findIndex + 1].id
        setChats((old) => {
            old.splice(findIndex, 1)
            return [...old]
        })
        if (activeChat !== id) active = ""
        active && setActiveChat(active)
        setTimeout(() => {
            setDelLoading((old) => old.filter((el) => el !== id))
        }, 200)
    })
    // #endregion

    const [loading, setLoading] = useState(false)
    const [question, setQuestion] = useState("")
    const isQuestion = useMemo(() => {
        return question && question.trim()
    }, [question])
    const [isExec, setIsExec] = useState(false)

    /** 自定义问题提问 */
    const onBtnSubmit = useMemoizedFn(() => {
        if (loading || !isQuestion) return
    })

    return (
        <div className={styles["server-chat"]}>
            <div className={styles["server-chat-header"]}>
                <div className={styles["header-title"]}>AI-Agent</div>
                <div className={styles["header-extra"]}>
                    {/* <YakitButton icon={<OutlinePlusIcon />}>新会话</YakitButton> */}
                    <YakitButton
                        type='text2'
                        icon={<OutlineClockIcon />}
                        title='历史对话'
                        onClick={handleChangeShowHistory}
                    />
                </div>
            </div>

            <div className={styles["server-chat-body"]}>
                <div className={styles["chat-wrapper"]}>
                    <div className={styles["chat-answer"]}>
                        {/* <AIAgentEmpty /> */}
                        <AIAgentTask />
                    </div>

                    <div className={styles["chat-question"]}>
                        <div className={styles["question-box"]}>
                            <Input.TextArea
                                className={styles["question-textArea"]}
                                bordered={false}
                                placeholder='请下发任务, AI-Agent将执行(shift + enter 换行)'
                                value={question}
                                autoSize={true}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyDown={(e) => {
                                    const keyCode = e.keyCode ? e.keyCode : e.key
                                    const shiftKey = e.shiftKey
                                    if (keyCode === 13 && shiftKey) {
                                        e.stopPropagation()
                                        e.preventDefault()
                                        setQuestion(`${question}\n`)
                                    }
                                    if (keyCode === 13 && !shiftKey) {
                                        e.stopPropagation()
                                        e.preventDefault()
                                        onBtnSubmit()
                                    }
                                }}
                            />

                            <div className={styles["question-footer"]}>
                                <div
                                    className={classNames(styles["single-btn"], {
                                        [styles["single-btn-active"]]: isExec
                                    })}
                                    onClick={() => setIsExec((old) => !old)}
                                >
                                    直接执行,不询问
                                </div>
                                <div className={styles["footer-divider"]}></div>
                                <YakitButton
                                    disabled={!isQuestion}
                                    icon={<SolidPaperairplaneIcon />}
                                    onClick={onBtnSubmit}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={classNames(styles["history-wrapper"], {[styles["history-hidden"]]: !showHistory})}>
                    {chats.map((item) => {
                        const {id, name, time} = item
                        const delStatus = delLoading.includes(id)
                        return (
                            <div
                                key={id}
                                className={classNames(styles["history-item"], {
                                    [styles["history-item-active"]]: activeChat === id
                                })}
                                onClick={() => setActiveChat(id)}
                            >
                                <div className={styles["item-info"]}>
                                    <div className={styles["item-icon"]}>
                                        <SolidChatalt2Icon />
                                    </div>
                                    <div className={styles["info-wrapper"]}>
                                        <div
                                            className={classNames(
                                                styles["info-title"],
                                                "yakit-content-single-ellipsis"
                                            )}
                                            title={name}
                                        >
                                            {name}
                                        </div>
                                        <div className={styles["info-time"]}>{formatTime(time)}</div>
                                    </div>
                                </div>

                                <div className={styles["item-extra"]}>
                                    {/* <Tooltip
                                        title={"编辑对话标题"}
                                        placement='topRight'
                                        overlayClassName={styles["history-item-extra-tooltip"]}
                                    >
                                        <YakitButton
                                            type='text2'
                                            icon={<OutlinePencilaltIcon />}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleOpenEditName(item)
                                            }}
                                        />
                                    </Tooltip> */}
                                    <Tooltip
                                        title={"删除任务"}
                                        placement='topRight'
                                        overlayClassName={styles["history-item-extra-tooltip"]}
                                    >
                                        <YakitButton
                                            loading={delStatus}
                                            type='text2'
                                            icon={<OutlineTrashIcon />}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDeleteChat(id)
                                            }}
                                        />
                                    </Tooltip>
                                </div>
                            </div>
                        )
                    })}
                    {editInfo.current && (
                        <EditChatNameModal
                            getContainer={getContainer}
                            info={editInfo.current}
                            visible={editShow}
                            onCallback={handleCallbackEditName}
                        />
                    )}
                </div>
            </div>
        </div>
    )
})
