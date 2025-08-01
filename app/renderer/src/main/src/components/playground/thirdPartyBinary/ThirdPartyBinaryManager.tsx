import React, {useEffect, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {Table} from "antd"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {AutoSpin} from "@/components/AutoSpin"
import {Form, Space, Typography, Row, Col, Divider, Progress} from "antd"
import {useMemoizedFn, useGetState} from "ahooks"
import {randomString} from "@/utils/randomUtil"
import {failed, success, info} from "@/utils/notification"
import {ExecResult} from "@/pages/invoker/schema"
import {Uint8ArrayToString} from "@/utils/str"
import styles from "./ThirdPartyBinaryManager.module.scss"
import {
    OutlineDownloadIcon,
    OutlinePlayIcon,
    OutlineStopIcon,
    OutlineTrashIcon,
    OutlineRefreshIcon
} from "@/assets/icon/outline"

const {ipcRenderer} = window.require("electron")
const {Text} = Typography

export interface ThirdPartyBinary {
    Name: string
    Description: string
    InstallPath: string
}

export interface ThirdPartyBinaryManagerProps {}

// Status component for each binary
const BinaryStatusTag: React.FC<{binary: ThirdPartyBinary, checkBinaryReady: (name: string) => Promise<boolean>}> = ({binary, checkBinaryReady}) => {
    const [ready, setReady] = useState<boolean | null>(null)
    
    useEffect(() => {
        if (binary.InstallPath) {
            checkBinaryReady(binary.Name).then(setReady)
        }
    }, [binary, checkBinaryReady])
    
    if (!binary.InstallPath) {
        return <YakitTag color="red">未安装</YakitTag>
    }
    
    if (ready === null) {
        return <YakitTag>检查中...</YakitTag>
    }
    
    return ready ? (
        <YakitTag color="green">就绪</YakitTag>
    ) : (
        <YakitTag color="warning">异常</YakitTag>
    )
}

export const ThirdPartyBinaryManager: React.FC<ThirdPartyBinaryManagerProps> = (props) => {
    const [binaries, setBinaries] = useState<ThirdPartyBinary[]>([])
    const [loading, setLoading] = useState(false)
    const [refreshLoading, setRefreshLoading] = useState(false)
    
    // Install modal state
    const [installVisible, setInstallVisible] = useState(false)
    const [installForm] = Form.useForm()
    const [installLoading, setInstallLoading] = useState(false)
    const [installToken, setInstallToken] = useState(randomString(50))
    const [installProgress, setInstallProgress] = useState(0)
    const [installLogs, setInstallLogs, getInstallLogs] = useGetState<string[]>([])
    
    // Start modal state
    const [startVisible, setStartVisible] = useState(false)
    const [startForm] = Form.useForm()
    const [selectedBinary, setSelectedBinary] = useState<ThirdPartyBinary | null>(null)

    // Fetch binaries list
    const fetchBinaries = useMemoizedFn(() => {
        setRefreshLoading(true)
        ipcRenderer.invoke("ListThirdPartyBinary", {})
            .then((res: {Binaries: ThirdPartyBinary[]}) => {
                setBinaries(res.Binaries || [])
            })
            .catch((err) => {
                failed(`获取二进制文件列表失败: ${err}`)
            })
            .finally(() => {
                setRefreshLoading(false)
            })
    })

    // Check if binary is ready
    const checkBinaryReady = useMemoizedFn(async (name: string) => {
        try {
            const res = await ipcRenderer.invoke("IsThirdPartyBinaryReady", {Name: name})
            return res.IsReady
        } catch (err) {
            return false
        }
    })

    // Install progress stream handling
    useEffect(() => {
        ipcRenderer.on(`${installToken}-data`, async (e, data: ExecResult) => {
            if (data.Progress > 0) {
                setInstallProgress(Math.ceil(data.Progress))
                return
            }
            if (!data.IsMessage) {
                return
            }
            setInstallLogs([...getInstallLogs(), Uint8ArrayToString(data.Message)])
        })
        ipcRenderer.on(`${installToken}-error`, (e, error) => {
            failed(`[InstallThirdPartyBinary] error: ${error}`)
        })
        ipcRenderer.on(`${installToken}-end`, (e, data) => {
            info("[InstallThirdPartyBinary] finished")
            setInstallLoading(false)
            fetchBinaries()
            setTimeout(() => {
                setInstallVisible(false)
                setInstallProgress(0)
                setInstallLogs([])
                installForm.resetFields()
            }, 1000)
        })
        return () => {
            ipcRenderer.invoke("cancel-InstallThirdPartyBinary", installToken)
            ipcRenderer.removeAllListeners(`${installToken}-data`)
            ipcRenderer.removeAllListeners(`${installToken}-error`)
            ipcRenderer.removeAllListeners(`${installToken}-end`)
        }
    }, [installToken])

    // Install binary
    const handleInstall = useMemoizedFn(() => {
        installForm.validateFields().then((values) => {
            const {name, proxy, force} = values
            setInstallProgress(0)
            setInstallLogs([])
            setInstallLoading(true)
            const newToken = randomString(50)
            setInstallToken(newToken)
            
            ipcRenderer.invoke("InstallThirdPartyBinary", {
                Name: name,
                Proxy: proxy || "",
                Force: force || false
            }, newToken).then(() => {
                info(`开始安装 ${name}`)
            }).catch((err) => {
                failed(`安装失败: ${err}`)
                setInstallLoading(false)
            })
        })
    })

    // Uninstall binary
    const handleUninstall = useMemoizedFn((name: string) => {
        setLoading(true)
        ipcRenderer.invoke("UninstallThirdPartyBinary", {Name: name})
            .then(() => {
                success(`卸载 ${name} 成功`)
                fetchBinaries()
            })
            .catch((err) => {
                failed(`卸载失败: ${err}`)
            })
            .finally(() => {
                setLoading(false)
            })
    })

    // Start binary
    const handleStart = useMemoizedFn(() => {
        startForm.validateFields().then((values) => {
            const {args} = values
            if (!selectedBinary) return
            
            const argsArray = args ? args.split(' ').filter((arg: string) => arg.trim()) : []
            const token = randomString(50)
            
            ipcRenderer.invoke("StartThirdPartyBinary", {
                Name: selectedBinary.Name,
                Args: argsArray
            }, token).then(() => {
                info(`启动 ${selectedBinary.Name} 成功`)
                setStartVisible(false)
                startForm.resetFields()
                setSelectedBinary(null)
            }).catch((err) => {
                failed(`启动失败: ${err}`)
            })
        })
    })

    // Cancel install
    const cancelInstall = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-InstallThirdPartyBinary", installToken)
        setInstallLoading(false)
    })

    // Open start modal
    const openStartModal = useMemoizedFn((binary: ThirdPartyBinary) => {
        setSelectedBinary(binary)
        setStartVisible(true)
        startForm.resetFields()
    })

    useEffect(() => {
        fetchBinaries()
    }, [])

    const columns = [
        {
            title: "名称",
            dataIndex: "Name",
            key: "Name",
            width: 150,
            render: (text: string) => <Text strong>{text}</Text>
        },
        {
            title: "描述",
            dataIndex: "Description",
            key: "Description",
            ellipsis: true,
            render: (text: string) => <Text type="secondary">{text}</Text>
        },
        {
            title: "安装路径",
            dataIndex: "InstallPath", 
            key: "InstallPath",
            width: 200,
            ellipsis: true,
            render: (text: string) => text || <Text type="secondary">未安装</Text>
        },
        {
            title: "状态",
            key: "status",
            width: 100,
            render: (_: any, record: ThirdPartyBinary) => (
                <BinaryStatusTag binary={record} checkBinaryReady={checkBinaryReady} />
            )
        },
        {
            title: "操作",
            key: "action",
            width: 150,
            render: (_: any, record: ThirdPartyBinary) => (
                <Space>
                    {record.InstallPath ? (
                        <>
                            <YakitButton
                                type="primary"
                                size="small"
                                icon={<OutlinePlayIcon />}
                                onClick={() => openStartModal(record)}
                                disabled={loading}
                            >
                                启动
                            </YakitButton>
                            <YakitButton
                                danger
                                size="small"
                                icon={<OutlineTrashIcon />}
                                onClick={() => handleUninstall(record.Name)}
                                disabled={loading}
                            >
                                卸载
                            </YakitButton>
                        </>
                    ) : (
                        <YakitButton
                            type="primary"
                            size="small"
                            icon={<OutlineDownloadIcon />}
                            onClick={() => {
                                setInstallVisible(true)
                                installForm.setFieldsValue({name: record.Name})
                            }}
                            disabled={loading}
                        >
                            安装
                        </YakitButton>
                    )}
                </Space>
            )
        }
    ]

    return (
        <div className={styles["third-party-binary-manager"]}>
            <AutoCard
                title="第三方二进制文件管理"
                size="small"
                extra={
                    <Space>
                        <YakitButton
                            type="primary"
                            icon={<OutlineDownloadIcon />}
                            onClick={() => setInstallVisible(true)}
                            disabled={loading}
                        >
                            安装新工具
                        </YakitButton>
                        <YakitButton
                            icon={<OutlineRefreshIcon />}
                            onClick={fetchBinaries}
                            loading={refreshLoading}
                        >
                            刷新
                        </YakitButton>
                    </Space>
                }
                bodyStyle={{padding: 8}}
            >
                <AutoSpin spinning={loading}>
                    <Table
                        dataSource={binaries}
                        columns={columns}
                        rowKey="Name"
                        pagination={{
                            pageSize: 10,
                            simple: true,
                            size: "small"
                        }}
                        size="small"
                    />
                </AutoSpin>
            </AutoCard>

            {/* Install Modal */}
            <YakitModal
                title="安装第三方工具"
                visible={installVisible}
                onCancel={() => {
                    if (!installLoading) {
                        setInstallVisible(false)
                        installForm.resetFields()
                    }
                }}
                width={500}
                footer={[
                    <YakitButton
                        key="cancel"
                        onClick={() => {
                            if (installLoading) {
                                cancelInstall()
                            } else {
                                setInstallVisible(false)
                                installForm.resetFields()
                            }
                        }}
                    >
                        {installLoading ? "取消安装" : "取消"}
                    </YakitButton>,
                    <YakitButton
                        key="install"
                        type="primary"
                        loading={installLoading}
                        onClick={handleInstall}
                        disabled={installLoading}
                    >
                        {installLoading ? "安装中..." : "开始安装"}
                    </YakitButton>
                ]}
            >
                {installLoading ? (
                    <div>
                        <Progress
                            percent={installProgress}
                            format={(percent) => `已完成 ${percent}%`}
                            style={{marginBottom: 16}}
                        />
                        <div style={{
                            maxHeight: 200,
                            overflow: "auto",
                            backgroundColor: "#f5f5f5",
                            padding: 8,
                            borderRadius: 4,
                            fontSize: 12,
                            fontFamily: "monospace"
                        }}>
                            {installLogs.map((log, index) => (
                                <div key={index} style={{marginBottom: 4}}>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <Form form={installForm} layout="vertical">
                        <Form.Item
                            label="工具名称"
                            name="name"
                            rules={[{required: true, message: "请输入工具名称"}]}
                        >
                            <YakitInput placeholder="请输入要安装的工具名称" />
                        </Form.Item>
                        
                        <Form.Item
                            label="代理设置"
                            name="proxy"
                        >
                            <YakitInput placeholder="可选：http://proxy:port" />
                        </Form.Item>
                        
                        <Form.Item
                            label="强制重新安装"
                            name="force"
                            valuePropName="checked"
                        >
                            <YakitSwitch />
                        </Form.Item>
                    </Form>
                )}
            </YakitModal>

            {/* Start Modal */}
            <YakitModal
                title={`启动 ${selectedBinary?.Name}`}
                visible={startVisible}
                onCancel={() => {
                    setStartVisible(false)
                    startForm.resetFields()
                    setSelectedBinary(null)
                }}
                width={500}
                footer={[
                    <YakitButton
                        key="cancel"
                        onClick={() => {
                            setStartVisible(false)
                            startForm.resetFields()
                            setSelectedBinary(null)
                        }}
                    >
                        取消
                    </YakitButton>,
                    <YakitButton
                        key="start"
                        type="primary"
                        onClick={handleStart}
                    >
                        开始执行
                    </YakitButton>
                ]}
            >
                <Form form={startForm} layout="vertical">
                    <Form.Item
                        label="命令行参数"
                        name="args"
                    >
                        <YakitInput placeholder="可选：输入命令行参数，空格分隔" />
                    </Form.Item>
                    
                    {selectedBinary && (
                        <div>
                            <Divider />
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Text strong>工具名称:</Text><br />
                                    <Text>{selectedBinary.Name}</Text>
                                </Col>
                                <Col span={12}>
                                    <Text strong>安装路径:</Text><br />
                                    <Text type="secondary" ellipsis>{selectedBinary.InstallPath}</Text>
                                </Col>
                            </Row>
                            <Row style={{marginTop: 8}}>
                                <Col span={24}>
                                    <Text strong>描述:</Text><br />
                                    <Text type="secondary">{selectedBinary.Description}</Text>
                                </Col>
                            </Row>
                        </div>
                    )}
                </Form>
            </YakitModal>
        </div>
    )
} 