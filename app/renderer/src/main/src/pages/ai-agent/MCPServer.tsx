import React, {memo, useEffect, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {RenderMCPClientInfo, MCPServerProps} from "./aiAgentType"
import {formatMCPResourceTemplates, formatMCPTools} from "./utils"
import {
    grpcCancelYakMcp,
    grpcCloseMCPClient,
    grpcConnectMCPClient,
    grpcDeleteMCPClient,
    grpcMCPClientCallTool,
    grpcStartYakMcp
} from "./grpc"
import {MCPTransportTypeList} from "./defaultConstant"
import {OutlinePlusIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {AddServerModal} from "./UtilModals"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {ServerInfoModal} from "./ServerInfoModal"
import {randomString} from "@/utils/randomUtil"
import {yakitNotify} from "@/utils/notification"
import cloneDeep from "lodash/cloneDeep"
import {setRemoteValue} from "@/utils/kv"
import {RemoteAIAgentGV} from "@/enums/aiAgent"
import useMCPData from "./useMCPData"
import useStore from "./useContext/useStore"
import useDispatcher from "./useContext/useDispatcher"

import classNames from "classnames"
import styles from "./AIAgent.module.scss"

const {ipcRenderer} = window.require("electron")

export const MCPServer: React.FC<MCPServerProps> = memo((props) => {
    const {mcpServers} = useStore()
    const {setMCPServers, getMCPServers} = useDispatcher()

    // 缓存客户端配置信息
    const handleCacheClientSetting = useMemoizedFn(() => {
        if (!getMCPServers) return
        const cache =
            getMCPServers()
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

    /**
     * 初始默认MCP服务器
     * 监听已启动的 MCP 客户端异常退出情况
     */
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
    //                 setMCPServers &&
    //                     setMCPServers((old) => {
    //                         const newList = [...old.filter((item) => !item.isDefault), data]
    //                         return newList
    //                     })
    //                 setTimeout(() => {
    //                     handleConnectServer(data)
    //                 }, 2000)
    //             } catch (error) {
    //                 yakitNotify("error", "获取默认MCP服务器失败: " + error)
    //             }
    //         }
    //     })
    //     grpcStartYakMcp().catch(() => {})

    //     ipcRenderer.on("mcp-client-error", (e, id: string, error: string) => {
    //         yakitNotify("error", `MCP(id:${id})异常退出: ${error}`)
    //         setMCPServers &&
    //             setMCPServers((old) =>
    //                 old.map((item) => {
    //                     if (item.id === id) item.status = false
    //                     return item
    //                 })
    //             )
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
            if (info && setMCPServers) setMCPServers([...mcpServers, info])
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
                setMCPServers &&
                    setMCPServers((old) => {
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
        setMCPServers &&
            setMCPServers((old) => {
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
                setMCPServers && setMCPServers((old) => old.filter((el) => el.id !== id))
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
        <div className={styles["mcp-server"]}>
            <div className={styles["servers-header"]}>
                <div className={styles["header-style"]}>MCP服务器配置</div>
                <div className={styles["description-style"]}>
                    Modal Context Protocol(MCP)提供了标准化的 AI 模型上下文通信协议，支持 stdio 和 sse 连接方式
                </div>
            </div>

            <div className={styles["servers-list"]}>
                <div className={styles["list-header"]}>
                    <div className={styles["header-style"]}>服务器列表</div>
                    <YakitButton type='text2' onClick={handleOpenAddServer}>
                        添加
                        <OutlinePlusIcon />
                    </YakitButton>
                </div>

                <div className={styles["list-body"]}>
                    {mcpServers.map((item) => {
                        const {id, type, status, isDefault} = item
                        const find = MCPTransportTypeList.find((el) => el.value === type)
                        const connect = connectLoading.includes(id)
                        const close = closeLoading.includes(id)

                        return (
                            <div key={id} className={styles["server-item"]}>
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
