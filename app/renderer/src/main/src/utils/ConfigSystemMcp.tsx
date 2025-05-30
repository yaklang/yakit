import React, {useMemo, useState} from "react"
import {Form} from "antd"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import classNames from "classnames"
import {useMemoizedFn} from "ahooks"
import {randomString} from "./randomUtil"
import {yakitNotify} from "./notification"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {SystemInfo} from "@/constants/hardware"
import {OutlineXIcon} from "@/assets/icon/outline"
import {useMcpStore} from "@/store/mcp"
import styles from "./ConfigSystemProxy.module.scss"
const {ipcRenderer} = window.require("electron")

interface StartMcpServerRequest {
    Host: string
    Port: number
    Tool?: string[]
    DisableTool?: string[]
    Resource?: string[]
    DisableResource?: string[]
    Script?: string[]
    EnableAll: boolean
}
export interface StartMcpServerResponse {
    Status: "starting" | "configured" | "running" | "heartbeat" | "stopped" | "error"
    Message: string
    ServerUrl: string
}
interface ConfigMcpProp {
    onClose: () => void
}

const ConfigMcp: React.FC<ConfigMcpProp> = (props) => {
    const {onClose} = props
    const [mcpUrl, setMcpUrl] = useState(SystemInfo.mode === "remote" ? "0.0.0.0:11432" : "127.0.0.1:11432")
    const {mcpToken, setMcpToken, mcpCurrent, setMcpCurrent, mcpServerUrl, setMcpServerUrl} = useMcpStore()

    const enableMcp = useMemo(() => {
        if (!mcpCurrent) return false
        if (["stopped", "error"].includes(mcpCurrent.Status)) {
            return false
        }
        if (!mcpServerUrl) return false
        return true
    }, [mcpCurrent?.Status, mcpServerUrl])

    const onSetMcp = useMemoizedFn(() => {
        if (mcpUrl.trim() === "") {
            yakitNotify("error", "启动地址不能为空")
            return
        }
        // 校验 host:port 格式
        const match = mcpUrl.match(/^([a-zA-Z0-9.\-]+):(\d{1,5})$/)
        if (!match) {
            yakitNotify("error", "启动地址格式错误，例如：127.0.0.1:11432")
            return
        }
        const host = match[1]
        const port = parseInt(match[2], 10)
        if (port < 1 || port > 65535) {
            yakitNotify("error", "端口号必须在1~65535之间")
            return
        }

        const params: StartMcpServerRequest = {
            Host: host,
            Port: port,
            EnableAll: true
        }
        const token = randomString(40)
        setMcpToken(token)
        ipcRenderer.invoke("StartMcpServer", params, token).catch((err) => {
            yakitNotify("error", "启用MCP失败: " + err)
        })
    })

    const cancelMcp = () => {
        ipcRenderer.invoke(`cancel-StartMcpServer`, mcpToken)
        ipcRenderer.removeAllListeners(`${mcpToken}-data`)
        ipcRenderer.removeAllListeners(`${mcpToken}-error`)
        ipcRenderer.removeAllListeners(`${mcpToken}-end`)
    }

    return (
        <div className={styles["config-system-proxy"]}>
            <div className={styles["config-system-proxy-heard"]}>
                <div className={styles["config-system-proxy-title"]}>Yak Mcp</div>
                <OutlineXIcon className={styles["close-icon"]} onClick={onClose} />
            </div>
            <div
                className={classNames(styles["config-system-proxy-status-success"], {
                    [styles["config-system-proxy-status-danger"]]: !enableMcp
                })}
            >
                当前状态：
                <span>{enableMcp ? "已启用" : "未启用"}</span>
            </div>
            <Form layout='vertical' style={{padding: "0 24px 24px"}}>
                <Form.Item label='启动地址：' help='yak以SSE方式启动mcp，在需要使用mcp的地方填入启动地址即可'>
                    {enableMcp ? (
                        <YakitTag
                            enableCopy={true}
                            color='blue'
                            copyText={mcpServerUrl}
                            style={{position: "relative", top: "-8px"}}
                        ></YakitTag>
                    ) : (
                        <YakitInput
                            addonBefore='http://'
                            value={mcpUrl}
                            onChange={(e) => {
                                setMcpUrl(e.target.value)
                            }}
                            size='large'
                        />
                    )}
                </Form.Item>
                <div className={styles["config-system-proxy-btns"]}>
                    <YakitButton type='outline2' size='large' onClick={onClose}>
                        取消
                    </YakitButton>
                    {enableMcp ? (
                        <YakitButton
                            size='large'
                            colors='danger'
                            onClick={() => {
                                cancelMcp()
                                yakitNotify("info", "MCP 服务已停止")
                                setMcpCurrent(undefined)
                                setMcpServerUrl("")
                                setMcpToken("")
                            }}
                        >
                            停用
                        </YakitButton>
                    ) : (
                        <YakitButton colors='primary' size='large' onClick={onSetMcp}>
                            启用
                        </YakitButton>
                    )}
                </div>
            </Form>
        </div>
    )
}

export const showConfigMcpForm = () => {
    const m = showYakitModal({
        title: null,
        width: 500,
        footer: null,
        closable: false,
        centered: true,
        hiddenHeader: true,
        content: (
            <>
                <ConfigMcp
                    onClose={() => {
                        m.destroy()
                    }}
                />
            </>
        )
    })
}
