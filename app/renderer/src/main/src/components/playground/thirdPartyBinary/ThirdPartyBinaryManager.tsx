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
import {YakitRoute} from "@/enums/yakitRoute"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const {ipcRenderer} = window.require("electron")
const {Text} = Typography

export interface ThirdPartyBinary {
    Name: string
    Description: string
    InstallPath: string
}

export interface ThirdPartyBinaryManagerProps {}

// Status component for each binary
const BinaryStatusTag: React.FC<{binary: ThirdPartyBinary; checkBinaryReady: (name: string) => Promise<boolean>}> = ({
    binary,
    checkBinaryReady
}) => {
    const {t} = useI18nNamespaces(["playground"])
    const [ready, setReady] = useState<boolean | null>(null)

    useEffect(() => {
        if (binary.InstallPath) {
            checkBinaryReady(binary.Name).then(setReady)
        }
    }, [binary, checkBinaryReady])

    if (!binary.InstallPath) {
        return <YakitTag color='red'>{t("ThirdPartyBinaryManager.notInstalled")}</YakitTag>
    }

    if (ready === null) {
            return <YakitTag>{t("ThirdPartyBinaryManager.checking")}</YakitTag>
    }

        return ready ? (
            <YakitTag color='green'>{t("ThirdPartyBinaryManager.ready")}</YakitTag>
        ) : (
            <YakitTag color='warning'>{t("ThirdPartyBinaryManager.abnormal")}</YakitTag>
        )
}

export const ThirdPartyBinaryManager: React.FC<ThirdPartyBinaryManagerProps> = (props) => {
    const {t} = useI18nNamespaces(["playground"])
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
        ipcRenderer
            .invoke("ListThirdPartyBinary", {})
            .then((res: {Binaries: ThirdPartyBinary[]}) => {
                setBinaries(res.Binaries || [])
            })
            .catch((err) => {
                failed(t("ThirdPartyBinaryManager.fetchListFailed", {error: String(err)}))
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
            failed(t("ThirdPartyBinaryManager.installError", {error: String(error)}))
        })
        ipcRenderer.on(`${installToken}-end`, (e, data) => {
            info(t("ThirdPartyBinaryManager.installFinished"))
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

            ipcRenderer
                .invoke(
                    "InstallThirdPartyBinary",
                    {
                        Name: name,
                        Proxy: proxy || "",
                        Force: force || false
                    },
                    newToken
                )
                .then(() => {
                    info(t("ThirdPartyBinaryManager.installStarting", {name}))
                })
                .catch((err) => {
                    failed(t("ThirdPartyBinaryManager.installFailed", {error: String(err)}))
                    setInstallLoading(false)
                })
        })
    })

    // Uninstall binary
    const handleUninstall = useMemoizedFn((name: string) => {
        setLoading(true)
        ipcRenderer
            .invoke("UninstallThirdPartyBinary", {Name: name})
            .then(() => {
                success(t("ThirdPartyBinaryManager.uninstallSuccess", {name}))
                fetchBinaries()
            })
            .catch((err) => {
                failed(t("ThirdPartyBinaryManager.uninstallFailed", {error: String(err)}))
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

            const argsArray = args ? args.split(" ").filter((arg: string) => arg.trim()) : []
            const token = randomString(50)

            ipcRenderer
                .invoke(
                    "StartThirdPartyBinary",
                    {
                        Name: selectedBinary.Name,
                        Args: argsArray
                    },
                    token
                )
                .then(() => {
                    info(t("ThirdPartyBinaryManager.startSuccess", {name: selectedBinary.Name}))
                    setStartVisible(false)
                    startForm.resetFields()
                    setSelectedBinary(null)
                })
                .catch((err) => {
                    failed(t("ThirdPartyBinaryManager.startFailed", {error: String(err)}))
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
            title: t("ThirdPartyBinaryManager.name"),
            dataIndex: "Name",
            key: "Name",
            width: 150,
            render: (text: string) => <Text strong>{text}</Text>
        },
        {
            title: t("ThirdPartyBinaryManager.description"),
            dataIndex: "Description",
            key: "Description",
            ellipsis: true,
            render: (text: string) => <Text type='secondary'>{text}</Text>
        },
        {
            title: t("ThirdPartyBinaryManager.installPath"),
            dataIndex: "InstallPath",
            key: "InstallPath",
            width: 200,
            ellipsis: true,
            render: (text: string) => text || <Text type='secondary'>{t("ThirdPartyBinaryManager.notInstalled")}</Text>
        },
        {
            title: t("ThirdPartyBinaryManager.status"),
            key: "status",
            width: 100,
            render: (_: any, record: ThirdPartyBinary) => (
                <BinaryStatusTag binary={record} checkBinaryReady={checkBinaryReady} />
            )
        },
        {
            title: t("ThirdPartyBinaryManager.actions"),
            key: "action",
            width: 150,
            render: (_: any, record: ThirdPartyBinary) => (
                <Space>
                    {record.InstallPath ? (
                        <>
                            <YakitButton
                                type='primary'
                                size='small'
                                icon={<OutlinePlayIcon />}
                                onClick={() => openStartModal(record)}
                                disabled={loading}
                            >
                                {t("ThirdPartyBinaryManager.start")}
                            </YakitButton>
                            <YakitButton
                                danger
                                size='small'
                                icon={<OutlineTrashIcon />}
                                onClick={() => handleUninstall(record.Name)}
                                disabled={loading}
                            >
                                {t("ThirdPartyBinaryManager.uninstall")}
                            </YakitButton>
                        </>
                    ) : (
                        <YakitButton
                            type='primary'
                            size='small'
                            icon={<OutlineDownloadIcon />}
                            onClick={() => {
                                setInstallVisible(true)
                                installForm.setFieldsValue({name: record.Name})
                            }}
                            disabled={loading}
                        >
                            {t("ThirdPartyBinaryManager.install")}
                        </YakitButton>
                    )}
                </Space>
            )
        }
    ]

    return (
        <div className={styles["third-party-binary-manager"]}>
            <AutoCard
                title={t("ThirdPartyBinaryManager.title")}
                size='small'
                extra={
                    <Space>
                        <YakitButton
                            type='primary'
                            icon={<OutlineDownloadIcon />}
                            onClick={() => setInstallVisible(true)}
                            disabled={loading}
                        >
                            {t("ThirdPartyBinaryManager.installNewTool")}
                        </YakitButton>
                        <YakitButton icon={<OutlineRefreshIcon />} onClick={fetchBinaries} loading={refreshLoading}>
                            {t("ThirdPartyBinaryManager.refresh")}
                        </YakitButton>
                    </Space>
                }
                bodyStyle={{padding: 8}}
            >
                <AutoSpin spinning={loading}>
                    <Table
                        dataSource={binaries}
                        columns={columns}
                        rowKey='Name'
                        pagination={{
                            pageSize: 10,
                            simple: true,
                            size: "small"
                        }}
                        size='small'
                    />
                </AutoSpin>
            </AutoCard>

            {/* Install Modal */}
            <YakitModal
                title={t("ThirdPartyBinaryManager.installModalTitle")}
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
                        key='cancel'
                        onClick={() => {
                            if (installLoading) {
                                cancelInstall()
                            } else {
                                setInstallVisible(false)
                                installForm.resetFields()
                            }
                        }}
                    >
                        {installLoading ? t("ThirdPartyBinaryManager.cancelInstall") : t("ThirdPartyBinaryManager.cancel")}
                    </YakitButton>,
                    <YakitButton
                        key='install'
                        type='primary'
                        loading={installLoading}
                        onClick={handleInstall}
                        disabled={installLoading}
                    >
                        {installLoading ? t("ThirdPartyBinaryManager.installing") : t("ThirdPartyBinaryManager.startInstall")}
                    </YakitButton>
                ]}
                getContainer={
                    document.getElementById(`main-operator-page-body-${YakitRoute.Beta_DebugMonacoEditor}`) || undefined
                }
            >
                {installLoading ? (
                    <div>
                        <Progress
                            percent={installProgress}
                            format={(percent) => t("ThirdPartyBinaryManager.completedPercent", {percent: percent ?? 0})}
                            style={{marginBottom: 16}}
                        />
                        <div
                            style={{
                                maxHeight: 200,
                                overflow: "auto",
                                backgroundColor: "var(--Colors-Use-Neutral-Bg)",
                                padding: 8,
                                borderRadius: 4,
                                fontSize: 12,
                                fontFamily: "monospace"
                            }}
                        >
                            {installLogs.map((log, index) => (
                                <div key={index} style={{marginBottom: 4}}>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <Form form={installForm} layout='vertical'>
                        <Form.Item label={t("ThirdPartyBinaryManager.toolName")} name='name' rules={[{required: true, message: t("ThirdPartyBinaryManager.enterToolName")}]}>
                            <YakitInput placeholder={t("ThirdPartyBinaryManager.enterToolNamePlaceholder")} />
                        </Form.Item>

                        <Form.Item label={t("ThirdPartyBinaryManager.proxySettings")} name='proxy'>
                            <YakitInput placeholder={t("ThirdPartyBinaryManager.proxyPlaceholder")} />
                        </Form.Item>

                        <Form.Item label={t("ThirdPartyBinaryManager.forceReinstall")} name='force' valuePropName='checked'>
                            <YakitSwitch />
                        </Form.Item>
                    </Form>
                )}
            </YakitModal>

            {/* Start Modal */}
            <YakitModal
                title={t("ThirdPartyBinaryManager.startModalTitle", {name: selectedBinary?.Name || ""})}
                visible={startVisible}
                onCancel={() => {
                    setStartVisible(false)
                    startForm.resetFields()
                    setSelectedBinary(null)
                }}
                width={500}
                footer={[
                    <YakitButton
                        key='cancel'
                        onClick={() => {
                            setStartVisible(false)
                            startForm.resetFields()
                            setSelectedBinary(null)
                        }}
                    >
                        {t("ThirdPartyBinaryManager.cancel")}
                    </YakitButton>,
                    <YakitButton key='start' type='primary' onClick={handleStart}>
                        {t("ThirdPartyBinaryManager.startExecution")}
                    </YakitButton>
                ]}
            >
                <Form form={startForm} layout='vertical'>
                    <Form.Item label={t("ThirdPartyBinaryManager.commandLineArgs")} name='args'>
                        <YakitInput placeholder={t("ThirdPartyBinaryManager.commandLineArgsPlaceholder")} />
                    </Form.Item>

                    {selectedBinary && (
                        <div>
                            <Divider />
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Text strong>{t("ThirdPartyBinaryManager.toolName")}: </Text>
                                    <br />
                                    <Text>{selectedBinary.Name}</Text>
                                </Col>
                                <Col span={12}>
                                    <Text strong>{t("ThirdPartyBinaryManager.installPath")}: </Text>
                                    <br />
                                    <Text type='secondary' ellipsis>
                                        {selectedBinary.InstallPath}
                                    </Text>
                                </Col>
                            </Row>
                            <Row style={{marginTop: 8}}>
                                <Col span={24}>
                                    <Text strong>{t("ThirdPartyBinaryManager.description")}: </Text>
                                    <br />
                                    <Text type='secondary'>{selectedBinary.Description}</Text>
                                </Col>
                            </Row>
                        </div>
                    )}
                </Form>
            </YakitModal>
        </div>
    )
}
