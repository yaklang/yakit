import React, {memo, useEffect, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {RenderMCPClientInfo, ServerSettingProps} from "./aiAgentType"
import {formatMCPResourceTemplates, formatMCPTools} from "./utils"
import {
    grpcCancelYakMcp,
    grpcCloseMCPClient,
    grpcConnectMCPClient,
    grpcCreateMCPClient,
    grpcDeleteMCPClient,
    grpcMCPClientCallTool,
    grpcStartYakMcp
} from "./grpc"
import {MCPTransportTypeList} from "./defaultConstant"
import {OutlinePlusIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {AddServerModal} from "./AddServerModal"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {ServerInfoModal} from "./ServerInfoModal"
import {randomString} from "@/utils/randomUtil"
import {yakitNotify} from "@/utils/notification"

import classNames from "classnames"
import styles from "./AIAgent.module.scss"

const {ipcRenderer} = window.require("electron")

export const ServerSetting: React.FC<ServerSettingProps> = memo((props) => {
    const initDefaultServer = useRef<boolean>(false)
    const [servers, setServers] = useState<RenderMCPClientInfo[]>([])

    // 初始默认MCP服务器
    useEffect(() => {
        console.log("initDefaultServer", initDefaultServer.current)
        ipcRenderer.on("yak-mcp-server-send", async (e, res: {URL: string}) => {
            initDefaultServer.current = true
            console.log("res", res)
            if (res && res.URL) {
                try {
                    const data: RenderMCPClientInfo = {
                        isDefault: true,
                        id: randomString(16),
                        type: "sse",
                        url: res.URL,
                        status: false
                    }
                    await grpcCreateMCPClient(data)
                    setServers((old) => {
                        const newList = [...old.filter((item) => !item.isDefault), data]
                        return newList
                    })

                    setTimeout(() => {
                        handleConnectServer(data.id)
                    }, 2000)
                } catch (error) {
                    yakitNotify("error", "获取默认MCP服务器失败: " + error)
                }
            }
        })
        grpcStartYakMcp().catch(() => {})

        return () => {
            initDefaultServer.current = false
            ipcRenderer.removeAllListeners("yak-mcp-server-send")
            grpcCancelYakMcp().catch(() => {})
        }
    }, [])

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
    const handleConnectServer = useMemoizedFn((id: string) => {
        const loading = connectLoading.includes(id)
        if (loading) return

        setConnectLoading((old) => [...old, id])
        grpcConnectMCPClient(id)
            .then((res) => {
                const {tools, resourceTemplates} = res
                console.log("res", JSON.stringify(res), resourceTemplates)
                setServers((old) => {
                    const newList = [...old]
                    const index = newList.findIndex((el) => el.id === id)
                    if (index > -1) {
                        newList[index].status = true
                        newList[index].originalData = res
                        newList[index].tools = formatMCPTools(tools)
                        newList[index].resourceTemplates = formatMCPResourceTemplates(resourceTemplates)
                        console.log(
                            "newList[index].resourceTemplates",
                            JSON.stringify(newList[index].resourceTemplates)
                        )
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
                                                title={item.args ? JSON.stringify(item.args) : "-"}
                                            >
                                                环境变量: {item.args ? JSON.stringify(item.args) : "-"}
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
                                            <YakitButton loading={connect} onClick={() => handleConnectServer(id)}>
                                                连接 
                                            </YakitButton>
                                        )}
                                        <YakitButton
                                            onClick={() => {
                                                grpcMCPClientCallTool(id)
                                                    .then(() => {})
                                                    .catch(() => {})
                                            }}
                                        >
                                            123
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
