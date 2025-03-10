import React, {useState} from "react"
import {useMemoizedFn} from "ahooks"
import {AIAgentServerInfo, ServerSettingProps} from "./aiAgentType"
import {OutlinePlusIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {AddServerModal} from "./AddServerModal"

import classNames from "classnames"
import styles from "./AIAgent.module.scss"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {AIAgentServerTypeList} from "./defaultConstant"
import {grpcConnectMCPServer} from "./grpc"
import {formatMCPToolsParams} from "./utils"

// const {ipcRenderer} = window.require("electron")

export const ServerSetting: React.FC<ServerSettingProps> = (props) => {
    const [servers, setServers] = useState<AIAgentServerInfo[]>([])

    const [addShow, setAddShow] = useState(false)
    const handleOpenAddServer = useMemoizedFn(() => {
        if (addShow) return
        setAddShow(true)
    })
    const handleCallbackAddServer = useMemoizedFn((result: boolean, info?: AIAgentServerInfo) => {
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
        grpcConnectMCPServer(id)
            .then((res) => {
                const {tools, resourcesTemplates} = res
                setServers((old) => {
                    const index = old.findIndex((el) => el.id === id)
                    old[index].status = true
                    old[index].tools = formatMCPToolsParams(tools.tools)
                    old[index].resourceTemplates = formatMCPToolsParams(resourcesTemplates.resourcesTemplates)
                    return [...old]
                })
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setConnectLoading((old) => old.filter((el) => el !== id))
                }, 200)
            })
    })
    // 断开
    const handleCloseServer = useMemoizedFn((id: string) => {})
    // 删除
    const handleDeleteServer = useMemoizedFn((id: string) => {})
    // 查看
    const handleViewServer = useMemoizedFn((id: string) => {})

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
                        const {id, type, status} = item
                        const find = AIAgentServerTypeList.find((el) => el.value === type)
                        const connect = connectLoading.includes(id)

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
                                    <YakitButton type='outline2' onClick={() => handleDeleteServer(id)}>
                                        删除
                                    </YakitButton>

                                    <div className={styles["btn-group"]}>
                                        {status && (
                                            <YakitButton type='outline2' onClick={() => handleCloseServer(id)}>
                                                断开
                                            </YakitButton>
                                        )}
                                        {status ? (
                                            <YakitButton onClick={() => handleViewServer(id)}>查看</YakitButton>
                                        ) : (
                                            <YakitButton loading={connect} onClick={() => handleConnectServer(id)}>
                                                连接
                                            </YakitButton>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <AddServerModal visible={addShow} onCallback={handleCallbackAddServer} />
        </div>
    )
}
