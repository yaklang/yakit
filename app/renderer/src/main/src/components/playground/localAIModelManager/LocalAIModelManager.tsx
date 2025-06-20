import React, {useEffect, useRef, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {EngineConsole} from "@/pages/engineConsole/EngineConsole"
import {failed, info, success} from "@/utils/notification"
import {Alert, Form, Progress, Space, Tag, Table} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {randomString} from "@/utils/randomUtil"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {ExecResult} from "@/pages/invoker/schema"
import {Uint8ArrayToString} from "@/utils/str"
import {useGetState, useMemoizedFn} from "ahooks"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import classNames from "classnames"
import styles from "./LocalAIModelManager.module.scss"
import {ReloadOutlined, DownloadOutlined, PlayCircleOutlined, StopOutlined} from "@ant-design/icons"

const {ipcRenderer} = window.require("electron")

export interface LocalAIModelManagerProps {}

interface LocalModelConfig {
    Name: string
    Type: string
    FileName: string
    DownloadURL: string
    Description: string
    DefaultPort: number
}

interface StartLocalModelParams {
    ModelName: string
    Host: string
    Port: number
}

export const LocalAIModelManager: React.FC<LocalAIModelManagerProps> = React.memo((props) => {
    const [supportedModels, setSupportedModels] = useState<LocalModelConfig[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedModel, setSelectedModel] = useState<string>("")
    const [runningModels, setRunningModels] = useState<Set<string>>(new Set())
    const [modelTokens, setModelTokens] = useState<Map<string, string>>(new Map())
    const [modelReadyStates, setModelReadyStates] = useState<Map<string, boolean>>(new Map())
    const [checkingModelStates, setCheckingModelStates] = useState<boolean>(false)
    const [llamaServerReady, setLlamaServerReady] = useState<boolean>(false)
    const [llamaServerChecking, setLlamaServerChecking] = useState<boolean>(true)
    
    // 使用 ref 保存最新的 modelTokens，用于组件卸载时清理
    const modelTokensRef = useRef<Map<string, string>>(new Map())
    
    // 同步 modelTokens 到 ref
    useEffect(() => {
        modelTokensRef.current = modelTokens
    }, [modelTokens])
    
    // 检查Llama服务器是否准备就绪
    const checkLlamaServerReady = useMemoizedFn(() => {
        setLlamaServerChecking(true)
        ipcRenderer
            .invoke("IsLlamaServerReady", {})
            .then((res: {Ok: boolean; Reason: string}) => {
                setLlamaServerReady(res.Ok)
                if (!res.Ok) {
                    info(`Llama服务器未准备就绪: ${res.Reason}`)
                }
            })
            .catch((e) => {
                failed(`检查Llama服务器状态失败: ${e}`)
                setLlamaServerReady(false)
            })
            .finally(() => {
                setLlamaServerChecking(false)
            })
    })

    // 获取支持的模型列表
    const fetchSupportedModels = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer
            .invoke("GetSupportedLocalModels", {})
            .then((res: {Models: LocalModelConfig[]}) => {
                setSupportedModels(res.Models || [])
                if (res.Models && res.Models.length > 0 && !selectedModel) {
                    setSelectedModel(res.Models[0].Name)
                }
            })
            .catch((e) => {
                failed(`获取支持的模型列表失败: ${e}`)
            })
            .finally(() => {
                setLoading(false)
            })
    })

    // 检查单个模型是否准备就绪
    const checkModelReady = useMemoizedFn((modelName: string) => {
        return ipcRenderer
            .invoke("IsLocalModelReady", {ModelName: modelName})
            .then((res: {Ok: boolean; Reason: string}) => res.Ok)
            .catch(() => false)
    })

    // 检查所有模型的准备状态
    const checkAllModelsReady = useMemoizedFn(async () => {
        if (supportedModels.length === 0) return
        
        setCheckingModelStates(true)
        const newReadyStates = new Map<string, boolean>()
        
        try {
            // 并行检查所有模型状态
            const checks = supportedModels.map(async (model) => {
                try {
                    const isReady = await checkModelReady(model.Name)
                    newReadyStates.set(model.Name, isReady)
                } catch (e) {
                    newReadyStates.set(model.Name, false)
                }
            })
            
            await Promise.all(checks)
            setModelReadyStates(newReadyStates)
        } catch (e) {
            failed(`检查模型状态失败: ${e}`)
        } finally {
            setCheckingModelStates(false)
        }
    })

    // 停止模型
    const stopModel = useMemoizedFn((modelName: string) => {
        const token = modelTokens.get(modelName)
        if (!token) {
            failed(`未找到模型 ${modelName} 的运行标识`)
            return
        }
        
        ipcRenderer.invoke("cancel-StartLocalModel", token)
            .then(() => {
                success(`模型 ${modelName} 已停止`)
                setRunningModels(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(modelName)
                    return newSet
                })
                setModelTokens(prev => {
                    const newMap = new Map(prev)
                    newMap.delete(modelName)
                    return newMap
                })
            })
            .catch((e) => {
                failed(`停止模型失败: ${e}`)
            })
    })

    useEffect(() => {
        // 先检查Llama服务器状态
        checkLlamaServerReady()
    }, [])

    useEffect(() => {
        // 当Llama服务器准备就绪时，获取支持的模型列表
        if (llamaServerReady) {
            fetchSupportedModels()
        }
    }, [llamaServerReady])

    // 当支持的模型列表更新时，检查所有模型状态
    useEffect(() => {
        if (supportedModels.length > 0) {
            checkAllModelsReady()
        }
    }, [supportedModels])

    // 组件卸载时停止所有运行的模型
    useEffect(() => {
        return () => {
            // 停止所有运行的模型
            modelTokensRef.current.forEach((token, modelName) => {
                console.log(`Stopping model ${modelName} with token ${token}`)
                ipcRenderer.invoke("cancel-StartLocalModel", token).catch(e => {
                    console.error(`Failed to stop model ${modelName}:`, e)
                })
            })
        }
    }, [])

    const columns = [
        {
            title: "模型名称",
            dataIndex: "Name",
            key: "Name",
            render: (text: string, record: LocalModelConfig) => (
                <div className={styles["model-info"]}>
                    <div className={styles["model-name"]}>{text}</div>
                    <div className={styles["model-type"]}>{record.Type}</div>
                </div>
            )
        },
        {
            title: "描述",
            dataIndex: "Description",
            key: "Description",
            ellipsis: true
        },
        {
            title: "状态",
            key: "status",
            width: 180,
            render: (_, record: LocalModelConfig) => {
                const isRunning = runningModels.has(record.Name)
                const isReady = modelReadyStates.get(record.Name)
                
                return (
                    <Space>
                        <Tag 
                            color={isRunning ? "green" : "default"}
                            className={classNames(styles["status-tag"], {
                                [styles.running]: isRunning,
                                [styles.stopped]: !isRunning
                            })}
                        >
                            {isRunning ? "运行中" : "已停止"}
                        </Tag>
                        <Tag 
                            color={isReady === true ? "blue" : isReady === false ? "red" : "default"}
                            className={styles["ready-tag"]}
                        >
                            {isReady === true ? "已就绪" : isReady === false ? "未就绪" : "检查中"}
                        </Tag>
                    </Space>
                )
            }
        },
        {
            title: "操作",
            key: "action",
            width: 200,
            render: (_, record: LocalModelConfig) => {
                const isRunning = runningModels.has(record.Name)
                const isReady = modelReadyStates.get(record.Name)
                
                return (
                    <div className={styles["action-buttons"]}>
                        <YakitButton
                            type="text"
                            size="small"
                            onClick={() => {
                                const m = showYakitModal({
                                    title: "下载模型",
                                    width: "50%",
                                    content: (
                                        <div style={{margin: 20}}>
                                            <DownloadModelPrompt
                                                modelName={record.Name}
                                                onFinished={() => {
                                                    m.destroy()
                                                    fetchSupportedModels()
                                                    // 下载完成后重新检查模型状态
                                                    setTimeout(() => {
                                                        checkAllModelsReady()
                                                    }, 1000)
                                                }}
                                            />
                                        </div>
                                    ),
                                    footer: null
                                })
                            }}
                        >
                            <DownloadOutlined />
                            下载
                        </YakitButton>
                        
                        {/* 只有当模型已就绪时才显示启动/停止按钮 */}
                        {isReady === true && (
                            isRunning ? (
                                <YakitPopconfirm
                                    title={`确定要停止模型 ${record.Name} 吗？`}
                                    onConfirm={() => stopModel(record.Name)}
                                >
                                    <YakitButton type="text" size="small" colors="danger">
                                        <StopOutlined />
                                        停止
                                    </YakitButton>
                                </YakitPopconfirm>
                            ) : (
                                <YakitButton
                                    type="text"
                                    size="small"
                                    onClick={() => {
                                        const m = showYakitModal({
                                            title: `启动模型 - ${record.Name}`,
                                            width: "50%",
                                            content: (
                                                <div style={{margin: 20}}>
                                                    <StartModelForm
                                                        modelConfig={record}
                                                        onCancel={() => m.destroy()}
                                                        onSuccess={(modelName, token) => {
                                                            setRunningModels(prev => new Set(prev).add(modelName))
                                                            setModelTokens(prev => new Map(prev).set(modelName, token))
                                                            m.destroy()
                                                        }}
                                                    />
                                                </div>
                                            ),
                                            footer: null
                                        })
                                    }}
                                >
                                    <PlayCircleOutlined />
                                    启动
                                </YakitButton>
                            )
                        )}
                    </div>
                )
            }
        }
    ]

    return (
        <div className={styles["local-ai-model-manager"]}>
            <AutoCard
                size="small"
                bordered={true}
                title={
                    <Space>
                        <div>本地AI模型管理器</div>
                        {llamaServerReady ? (
                            <Tag color="green">Llama服务器已准备</Tag>
                        ) : (
                            <Tag color="red">Llama服务器未准备</Tag>
                        )}
                        <YakitButton
                            type="text"
                            onClick={() => {
                                checkLlamaServerReady()
                                if (llamaServerReady) {
                                    fetchSupportedModels()
                                    // 获取模型列表后会自动检查模型状态
                                }
                            }}
                            icon={<ReloadOutlined />}
                            loading={llamaServerChecking || loading || checkingModelStates}
                        />
                        {!llamaServerReady && (
                            <YakitButton
                                type="outline1"
                                onClick={() => {
                                    const m = showYakitModal({
                                        title: "安装模型环境",
                                        width: "50%",
                                        content: (
                                            <div style={{margin: 20}}>
                                                <InstallModelPrompt
                                                    onFinished={() => {
                                                        m.destroy()
                                                        checkLlamaServerReady()
                                                    }}
                                                />
                                            </div>
                                        ),
                                        footer: null
                                    })
                                }}
                            >
                                安装环境
                            </YakitButton>
                        )}
                    </Space>
                }
                bodyStyle={{padding: 0, overflow: "hidden", height: "100%", display: "flex", flexDirection: "row"}}
            >
                <div style={{flex: 1, overflow: "hidden", maxHeight: "100%"}}>
                    <YakitResizeBox
                        isVer={false}
                        firstNode={
                            <div style={{padding: 16, overflow: "auto", height: "100%"}}>
                                {llamaServerChecking ? (
                                    <div style={{textAlign: "center", padding: "50px 0"}}>
                                        <YakitSpin size="large" />
                                        <div style={{marginTop: 16, color: "var(--yakit-text-color)"}}>
                                            正在检查Llama服务器状态...
                                        </div>
                                    </div>
                                ) : !llamaServerReady ? (
                                    // Llama服务器未准备就绪，显示安装页面
                                    <div className={styles["alert-container"]}>
                                        <Alert
                                            type="warning"
                                            message={
                                                <div>
                                                    <h2 style={{fontSize: 18, fontWeight: 600, marginBottom: 16}}>
                                                        Llama服务器未准备就绪
                                                    </h2>
                                                    <p style={{marginBottom: 16}}>
                                                        检测到Llama服务器环境尚未安装或未正确配置。请先安装运行环境后再使用本地AI模型功能。
                                                    </p>
                                                    <div style={{marginBottom: 16}}>
                                                        <h4 style={{fontSize: 16, fontWeight: 600, marginBottom: 8}}>
                                                            安装将包含：
                                                        </h4>
                                                        <ul style={{paddingLeft: 24, margin: 0}}>
                                                            <li>Llama.cpp 运行环境</li>
                                                        </ul>
                                                    </div>
                                                    <YakitButton
                                                        type="primary"
                                                        size="large"
                                                        onClick={() => {
                                                            const m = showYakitModal({
                                                                title: "安装Llama服务器环境",
                                                                width: "50%",
                                                                content: (
                                                                    <div style={{margin: 20}}>
                                                                        <InstallModelPrompt
                                                                            onFinished={() => {
                                                                                m.destroy()
                                                                                checkLlamaServerReady()
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ),
                                                                footer: null
                                                            })
                                                        }}
                                                        style={{marginTop: 16}}
                                                    >
                                                        立即安装环境
                                                    </YakitButton>
                                                </div>
                                            }
                                        />
                                    </div>
                                ) : (
                                    // Llama服务器已准备就绪，显示模型管理页面
                                    <>
                                        <div className={styles["alert-container"]}>
                                            <Alert
                                                type="info"
                                                message={
                                                    <div>
                                                        <h2 style={{fontSize: 18, fontWeight: 600, marginBottom: 16}}>
                                                            本地AI模型管理
                                                        </h2>
                                                        <p style={{marginBottom: 16}}>
                                                            本地AI模型管理器用于管理本地AI模型，支持一键下载和安装模型，支持模型状态监控和管理。通过本地模型服务，可以实现本地化AI服务，无需依赖云端服务，例如：
                                                            <ul style={{paddingLeft: 24, margin: 0}}>
                                                                <li>搜索功能</li>
                                                                <li>AI意图分析</li>
                                                                <li>AI对话</li>
                                                                <li>AI代码生成</li>
                                                                <li>AI代码审计</li>
                                                                <li>AI Agent</li>
                                                            </ul>
                                                        </p>

                                                        <h3 style={{fontSize: 16, fontWeight: 600, marginBottom: 12}}>
                                                            功能特性
                                                        </h3>
                                                        <div style={{marginBottom: 16}}>
                                                            <ul style={{paddingLeft: 24, margin: 0}}>
                                                                <li>一键下载和安装模型</li>
                                                                <li>模型状态监控和管理</li>
                                                            </ul>
                                                        </div>
                                                        <h3 style={{fontSize: 16, fontWeight: 600, marginBottom: 12}}>
                                                            安装须知
                                                        </h3>
                                                        <div style={{marginBottom: 16}}>
                                                            <ul style={{paddingLeft: 24, margin: 0}}>
                                                                <li>MAC 系统在下载后，需要执行 <code>sudo xattr -r -d com.apple.quarantine ~/yakit-projects/projects/libs/llama-server</code> 命令，允许llama-server可执行。</li>
                                                            </ul>
                                                        </div>
                                                        <div
                                                            style={{
                                                                marginTop: 16,
                                                                padding: 12,
                                                                backgroundColor: "#f5f5f5",
                                                                borderRadius: 4
                                                            }}
                                                        >
                                                            注意：首次使用需要先安装模型运行环境，部分模型文件较大，请确保有足够的磁盘空间和网络带宽。
                                                        </div>
                                                    </div>
                                                }
                                            />
                                        </div>

                                        <div style={{marginTop: 16}}>
                                            <h3 style={{fontSize: 16, fontWeight: 600, marginBottom: 12}}>
                                                可用模型列表
                                            </h3>
                                            {supportedModels.length > 0 ? (
                                                <Table
                                                    className={styles["model-table"]}
                                                    columns={columns}
                                                    dataSource={supportedModels}
                                                    rowKey="Name"
                                                    pagination={false}
                                                    size="small"
                                                    loading={loading}
                                                />
                                            ) : (
                                                <YakitEmpty description="暂无可用模型，请先安装环境" />
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        }
                        secondNode={
                            <div style={{height: "100%", maxHeight: "100%"}}>
                                <EngineConsole />
                            </div>
                        }
                    />
                </div>
            </AutoCard>
        </div>
    )
})

// 安装模型环境组件
interface InstallModelPromptProps {
    onFinished: () => void
}

const InstallModelPrompt: React.FC<InstallModelPromptProps> = React.memo((props) => {
    const [token, setToken] = useState(randomString(60))
    const [data, setData, getData] = useGetState<string[]>([])
    const [percent, setPercent] = useState(0)
    const [loading, setLoading] = useState(false)
    const [hasError, setHasError] = useState(false)
    const [proxy, setProxy] = useState<string>("")
    const [started, setStarted] = useState(false)

    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {
            if (data.Progress > 0) {
                setPercent(Math.ceil(data.Progress))
                return
            }
            if (!data.IsMessage) {
                return
            }
            setData([...getData(), Uint8ArrayToString(data.Message)])
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[InstallLlamaServer] error: ${error}`)
            setHasError(true)
            setLoading(false)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            setLoading(false)
            if (!hasError) {
                info("[InstallLlamaServer] finished")
                props.onFinished()
            }
        })
        return () => {
            ipcRenderer.invoke("cancel-InstallLlamaServer", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [hasError])

    const startInstall = useMemoizedFn(() => {
        setHasError(false) // 重置错误状态
        setStarted(true)
        ipcRenderer.invoke("InstallLlamaServer", {Proxy: proxy}, token).then(() => {
            success("正在安装模型环境")
            setLoading(true)
        })
    })

    useEffect(() => {
        return () => {
            ipcRenderer.invoke("cancel-InstallLlamaServer", token)
        }
    }, [token])

    return (
        <Space direction="vertical" style={{width: "100%"}}>
            {!started ? (
                <div className={styles["form-container"]}>
                    <Form
                        labelCol={{span: 5}}
                        wrapperCol={{span: 16}}
                        onSubmitCapture={(e) => {
                            e.preventDefault()
                            startInstall()
                        }}
                        size="small"
                    >
                        <Form.Item label="代理设置" help="可选，用于下载加速。格式: http://proxy:port 或 socks5://proxy:port">
                            <YakitInput
                                value={proxy}
                                onChange={(e) => setProxy(e.target.value)}
                                placeholder="留空则不使用代理"
                            />
                        </Form.Item>

                        <Form.Item colon={false} label=" ">
                            <YakitButton 
                                type="primary" 
                                htmlType="submit"
                                size="large"
                                style={{marginBottom: 8}}
                            >
                                开始安装环境
                            </YakitButton>
                        </Form.Item>
                    </Form>
                </div>
            ) : (
                <>
                    <div className={styles["download-progress"]}>
                        <Progress
                            strokeColor="#F28B44"
                            trailColor="#F0F2F5"
                            percent={percent}
                            format={(percent) => `安装进度 ${percent}%`}
                        />
                    </div>
                    <div className={styles["download-progress-messages"]}>
                        {data.map((item, index) => (
                            <p key={index}>{item}</p>
                        ))}
                    </div>
                </>
            )}
        </Space>
    )
})

// 下载模型组件
interface DownloadModelPromptProps {
    modelName: string
    onFinished: () => void
}

const DownloadModelPrompt: React.FC<DownloadModelPromptProps> = React.memo((props) => {
    const [token, setToken] = useState(randomString(60))
    const [data, setData, getData] = useGetState<string[]>([])
    const [percent, setPercent] = useState(0)
    const [loading, setLoading] = useState(false)
    const [hasError, setHasError] = useState(false)
    const [proxy, setProxy] = useState<string>("")
    const [started, setStarted] = useState(false)

    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {
            if (data.Progress > 0) {
                setPercent(Math.ceil(data.Progress))
                return
            }
            if (!data.IsMessage) {
                return
            }
            setData([...getData(), Uint8ArrayToString(data.Message)])
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[DownloadLocalModel] error: ${error}`)
            setHasError(true)
            setLoading(false)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            setLoading(false)
            if (!hasError) {
                info(`[DownloadLocalModel] 模型 ${props.modelName} 下载完成`)
                props.onFinished()
            }
        })
        return () => {
            ipcRenderer.invoke("cancel-DownloadLocalModel", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [hasError])

    const startDownload = useMemoizedFn(() => {
        setHasError(false) // 重置错误状态
        setStarted(true)
        ipcRenderer.invoke("DownloadLocalModel", {ModelName: props.modelName, Proxy: proxy}, token).then(() => {
            success(`正在下载模型 ${props.modelName}`)
            setLoading(true)
        })
    })

    useEffect(() => {
        return () => {
            ipcRenderer.invoke("cancel-DownloadLocalModel", token)
        }
    }, [token])

    return (
        <Space direction="vertical" style={{width: "100%"}}>
            {!started ? (
                <div className={styles["form-container"]}>
                    <div style={{marginBottom: 16}}>
                        <h4>下载模型: {props.modelName}</h4>
                    </div>
                    <Form
                        labelCol={{span: 5}}
                        wrapperCol={{span: 16}}
                        onSubmitCapture={(e) => {
                            e.preventDefault()
                            startDownload()
                        }}
                        size="small"
                    >
                        <Form.Item label="代理设置" help="可选，用于下载加速。格式: http://proxy:port 或 socks5://proxy:port">
                            <YakitInput
                                value={proxy}
                                onChange={(e) => setProxy(e.target.value)}
                                placeholder="留空则不使用代理"
                            />
                        </Form.Item>

                        <Form.Item colon={false} label=" ">
                            <YakitButton 
                                type="primary" 
                                htmlType="submit"
                                size="large"
                                style={{marginBottom: 8}}
                            >
                                开始下载模型
                            </YakitButton>
                        </Form.Item>
                    </Form>
                </div>
            ) : (
                <>
                    <div style={{marginBottom: 16}}>
                        <h4>下载模型: {props.modelName}</h4>
                    </div>
                    <div className={styles["download-progress"]}>
                        <Progress
                            strokeColor="#F28B44"
                            trailColor="#F0F2F5"
                            percent={percent}
                            format={(percent) => `下载进度 ${percent}%`}
                        />
                    </div>
                    <div className={styles["download-progress-messages"]}>
                        {data.map((item, index) => (
                            <p key={index}>{item}</p>
                        ))}
                    </div>
                </>
            )}
        </Space>
    )
})

// 启动模型表单组件
interface StartModelFormProps {
    modelConfig: LocalModelConfig
    onSuccess: (modelName: string, token: string) => void
    onCancel: () => void
}

const StartModelForm: React.FC<StartModelFormProps> = React.memo((props) => {
    const [params, setParams] = useState<StartLocalModelParams>({
        ModelName: props.modelConfig.Name,
        Host: "127.0.0.1",
        Port: props.modelConfig.DefaultPort || 8080
    })
    const cancel = useMemoizedFn(() => {
        props.onCancel()
    })
    const [token, setToken] = useState(randomString(60))
    const [loading, setLoading] = useState(false)
    const [hasError, setHasError] = useState(false)

    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {
            
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[StartLocalModel] error: ${error}`)
            setHasError(true)
            setLoading(false)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            // 模型运行结束
            info(`模型 ${props.modelConfig.Name} 运行结束`)
        })
        return () => {
            // 只清理事件监听器，不取消模型启动
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [hasError])

    const handleSubmit = useMemoizedFn(() => {
        setLoading(true)
        setHasError(false) // 重置错误状态
        ipcRenderer.invoke("StartLocalModel", params, token)
            .then(() => {
                // 启动成功
                setLoading(false)
                success(`模型 ${props.modelConfig.Name} 启动成功`)
                props.onSuccess(props.modelConfig.Name, token)
            })
            .catch((e) => {
                failed(`启动模型失败: ${e}`)
                setLoading(false)
            })
    })

    return (
        <div className={styles["form-container"]}>
            <Form
                labelCol={{span: 5}}
                wrapperCol={{span: 14}}
                onSubmitCapture={(e) => {
                    e.preventDefault()
                    handleSubmit()
                }}
                size="small"
            >
                <Form.Item label="模型名称">
                    <YakitInput value={params.ModelName} disabled />
                </Form.Item>

                <Form.Item label="主机地址">
                    <YakitInput 
                        value={params.Host} 
                        onChange={(e) => setParams({...params, Host: e.target.value})} 
                    />
                </Form.Item>

                <Form.Item label="端口">
                    <YakitInputNumber
                        value={params.Port}
                        onChange={(value) => setParams({...params, Port: Number(value) || 8080})}
                        min={1}
                        max={65535}
                    />
                </Form.Item>

                <Form.Item colon={false} label=" ">
                    <YakitButton 
                        type="primary" 
                        htmlType="submit" 
                        loading={loading}
                        style={{marginBottom: 8}}
                    >
                        启动模型
                    </YakitButton>
                </Form.Item>
            </Form>
        </div>
    )
})
