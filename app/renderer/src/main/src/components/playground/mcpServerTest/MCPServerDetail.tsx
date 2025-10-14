import React, {useEffect, useState} from "react"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {Form} from "antd"
import {MCPServer, MCPServerFormData, MCPServerDetailProps} from "./types"
import {failed, success} from "@/utils/notification"
import styles from "./MCPServerManager.module.scss"

const {ipcRenderer} = window.require("electron")

export const MCPServerDetail: React.FC<MCPServerDetailProps> = (props) => {
    const {server, onRefresh} = props
    const [editModalVisible, setEditModalVisible] = useState(false)
    const [form] = Form.useForm()
    const [detailedServer, setDetailedServer] = useState<MCPServer>()
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (server) {
            loadServerDetail()
        } else {
            setDetailedServer(undefined)
        }
    }, [server])

    const loadServerDetail = async () => {
        if (!server) return
        setLoading(true)
        try {
            const response = await ipcRenderer.invoke("GetAllMCPServers", {
                ID: server.ID,
                IsShowToolList: true
            })
            if (response.MCPServers && response.MCPServers.length > 0) {
                setDetailedServer(response.MCPServers[0])
            }
        } catch (error: any) {
            failed(`加载服务器详情失败: ${error}`)
        } finally {
            setLoading(false)
        }
    }

    const handleEditServer = async (values: MCPServerFormData) => {
        if (!server) return
        try {
            await ipcRenderer.invoke("UpdateMCPServer", {
                ID: server.ID,
                ...values
            })
            success("更新MCP Server成功")
            setEditModalVisible(false)
            form.resetFields()
            loadServerDetail()
            onRefresh()
        } catch (error: any) {
            failed(`更新MCP Server失败: ${error}`)
        }
    }

    const openEditModal = () => {
        if (server) {
            form.setFieldsValue({
                Name: server.Name,
                Type: server.Type,
                URL: server.URL,
                Command: server.Command,
                Enable: server.Enable
            })
            setEditModalVisible(true)
        }
    }

    if (!server) {
        return (
            <div className={styles["detail-container"]}>
                <div className={styles["detail-empty"]}>请选择一个MCP Server查看详情</div>
            </div>
        )
    }

    return (
        <div className={styles["detail-container"]}>
            <div className={styles["server-info"]}>
                <div style={{marginBottom: 12}}>
                    <YakitButton type='primary' onClick={openEditModal}>
                        编辑
                    </YakitButton>
                </div>

                <div className={styles["info-item"]}>
                    <div className={styles["info-label"]}>服务器ID</div>
                    <div className={styles["info-value"]}>{server.ID}</div>
                </div>

                <div className={styles["info-item"]}>
                    <div className={styles["info-label"]}>服务器名称</div>
                    <div className={styles["info-value"]}>{server.Name}</div>
                </div>

                <div className={styles["info-item"]}>
                    <div className={styles["info-label"]}>服务器状态</div>
                    <div className={styles["info-value"]}>
                        <YakitTag color={server.Enable ? "success" : "danger"}>
                            {server.Enable ? "已启用" : "已禁用"}
                        </YakitTag>
                    </div>
                </div>

                <div className={styles["info-item"]}>
                    <div className={styles["info-label"]}>服务器类型</div>
                    <div className={styles["info-value"]}>{server.Type}</div>
                </div>

                {server.Type === "sse" ? (
                    <div className={styles["info-item"]}>
                        <div className={styles["info-label"]}>服务器URL</div>
                        <div className={styles["info-value"]}>{server.URL}</div>
                    </div>
                ) : (
                    <div className={styles["info-item"]}>
                        <div className={styles["info-label"]}>执行命令</div>
                        <div className={styles["info-value"]}>{server.Command}</div>
                    </div>
                )}
            </div>

            <div className={styles["tools-section"]}>
                <div className={styles["tools-title"]}>工具列表</div>
                {loading ? (
                    <div>加载工具列表中...</div>
                ) : (
                    <div className={styles["tools-list"]}>
                        {detailedServer?.Tools && detailedServer.Tools.length > 0 ? (
                            detailedServer.Tools.map((tool, idx) => (
                                <div key={idx} className={styles["tool-item"]}>
                                    <div className={styles["tool-name"]}>{tool.Name}</div>
                                    <div className={styles["tool-desc"]}>{tool.Description}</div>
                                    {tool.Params && tool.Params.length > 0 && (
                                        <div className={styles["tool-params"]}>
                                            <div style={{fontWeight: 500, marginBottom: 4}}>参数:</div>
                                            {tool.Params.map((param, paramIdx) => (
                                                  <div key={paramIdx} className={styles["param-item"]}>
                                                      <span className={styles["param-name"]}>{param.Name}</span>
                                                     {param.Required && (
                                                          <span className={styles["param-required"]}>*</span>
                                                      )}
                                                    <span style={{color: "#666", marginLeft: 4}}>
                                                        ({param.Type})
                                                    </span>
                                                    {param.Description && (
                                                        <span style={{marginLeft: 4}}>- {param.Description}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div style={{color: "#999", textAlign: "center", padding: "20px 0"}}>
                                该服务器暂无工具
                            </div>
                        )}
                    </div>
                )}
            </div>

            <YakitModal
                title='编辑MCP Server'
                visible={editModalVisible}
                onCancel={() => {
                    setEditModalVisible(false)
                    form.resetFields()
                }}
                onOk={() => form.submit()}
                width={600}
            >
                <Form form={form} onFinish={handleEditServer} layout='vertical'>
                    <Form.Item
                        label='服务器名称'
                        name='Name'
                        rules={[{required: true, message: "请输入服务器名称"}]}
                    >
                        <YakitInput placeholder='请输入服务器名称' />
                    </Form.Item>

                    <Form.Item
                        label='服务器类型'
                        name='Type'
                        rules={[{required: true, message: "请选择服务器类型"}]}
                    >
                        <YakitSelect
                            options={[
                                {value: "stdio", label: "Stdio"},
                                {value: "sse", label: "SSE"}
                            ]}
                        />
                    </Form.Item>

                    <Form.Item noStyle shouldUpdate={(prev, curr) => prev.Type !== curr.Type}>
                        {({getFieldValue}) => {
                            const type = getFieldValue("Type")
                            if (type === "sse") {
                                return (
                                    <Form.Item
                                        label='服务器URL'
                                        name='URL'
                                        rules={[{required: true, message: "请输入服务器URL"}]}
                                    >
                                        <YakitInput placeholder='例如: http://localhost:3000/sse' />
                                    </Form.Item>
                                )
                            } else {
                                return (
                                    <Form.Item
                                        label='执行命令'
                                        name='Command'
                                        rules={[{required: true, message: "请输入执行命令"}]}
                                    >
                                        <YakitInput placeholder='例如: npx -y @modelcontextprotocol/server-filesystem /path' />
                                    </Form.Item>
                                )
                            }
                        }}
                    </Form.Item>

                    <Form.Item label='启用服务器' name='Enable' valuePropName='checked'>
                        <YakitSwitch />
                    </Form.Item>
                </Form>
            </YakitModal>
        </div>
    )
}

