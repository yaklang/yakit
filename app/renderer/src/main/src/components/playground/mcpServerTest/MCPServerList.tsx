import React, {useEffect, useState} from "react"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {Form} from "antd"
import {MCPServer, MCPServerFormData, MCPServerListProps} from "./types"
import {failed, success} from "@/utils/notification"
import styles from "./MCPServerManager.module.scss"

const {ipcRenderer} = window.require("electron")

export const MCPServerList: React.FC<MCPServerListProps> = (props) => {
    const {selectedServerId, onSelectServer, onRefresh} = props
    const [servers, setServers] = useState<MCPServer[]>([])
    const [loading, setLoading] = useState(false)
    const [keyword, setKeyword] = useState("")
    const [addModalVisible, setAddModalVisible] = useState(false)
    const [form] = Form.useForm()

    useEffect(() => {
        loadServers()
    }, [keyword])

    const loadServers = async () => {
        setLoading(true)
        try {
            const response = await ipcRenderer.invoke("GetAllMCPServers", {
                Keyword: keyword,
                Pagination: {
                    Page: 1,
                    Limit: 100
                },
                IsShowToolList: false
            })
            setServers(response.MCPServers || [])
        } catch (error: any) {
            failed(`加载MCP Server列表失败: ${error}`)
        } finally {
            setLoading(false)
        }
    }

    const handleAddServer = async (values: MCPServerFormData) => {
        try {
            await ipcRenderer.invoke("AddMCPServer", values)
            success("添加MCP Server成功")
            setAddModalVisible(false)
            form.resetFields()
            loadServers()
            onRefresh()
        } catch (error: any) {
            failed(`添加MCP Server失败: ${error}`)
        }
    }

    const handleDeleteServer = async (id: number) => {
        try {
            await ipcRenderer.invoke("DeleteMCPServer", {ID: id})
            success("删除MCP Server成功")
            loadServers()
            onRefresh()
        } catch (error: any) {
            failed(`删除MCP Server失败: ${error}`)
        }
    }

    return (
        <div className={styles["list-container"]}>
            <div className={styles["list-header"]}>
                <YakitInput
                    placeholder='搜索服务器名称'
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    style={{flex: 1}}
                />
                <YakitButton type='primary' onClick={() => setAddModalVisible(true)}>
                    添加服务器
                </YakitButton>
            </div>

            <div className={styles["list-content"]}>
                {servers.length === 0 ? (
                    <div className={styles["empty-state"]}>
                        {loading ? "加载中..." : "暂无MCP Server"}
                    </div>
                ) : (
                    servers.map((server) => (
                        <div
                            key={server.ID}
                            className={`${styles["server-item"]} ${
                                selectedServerId === server.ID ? styles["selected"] : ""
                            }`}
                            onClick={() => onSelectServer(server)}
                        >
                            <div className={styles["item-title"]}>{server.Name}</div>
                            <div className={styles["item-type"]}>类型: {server.Type}</div>
                            <div className={styles["item-info"]}>
                                {server.Type === "sse" ? `URL: ${server.URL}` : `命令: ${server.Command}`}
                            </div>
                            <div className={styles["item-actions"]}>
                                <YakitButton
                                    size='small'
                                    danger
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteServer(server.ID)
                                    }}
                                >
                                    删除
                                </YakitButton>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <YakitModal
                title='添加MCP Server'
                visible={addModalVisible}
                onCancel={() => {
                    setAddModalVisible(false)
                    form.resetFields()
                }}
                onOk={() => form.submit()}
                width={600}
            >
                <Form form={form} onFinish={handleAddServer} layout='vertical'>
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
                        initialValue='stdio'
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
                </Form>
            </YakitModal>
        </div>
    )
}

