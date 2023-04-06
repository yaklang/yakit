import React, {useEffect, useState} from "react"
import {CopyableField} from "../utils/inputUtil"
import {Button, Card, Col, Empty, Form, List, Popconfirm, Row, Space, Tag, Tooltip} from "antd"
import {failed, info} from "../utils/notification"
import {showModal} from "../utils/showModal"
import {YakUpgrade} from "../components/YakUpgrade"
import {useMemoizedFn} from "ahooks"
import {ToolOutlined} from "@ant-design/icons"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";

export interface YakLocalProcessProp {
    onConnected?: (port: number, host: string) => any
    onProcess?: (procs: yakProcess[]) => any
    justClose?: boolean
}

const {ipcRenderer} = window.require("electron")

export interface yakProcess {
    port: number
    pid: number
    cmd: string
    origin: any
}

export const YakLocalProcess: React.FC<YakLocalProcessProp> = (props) => {
    const [process, setProcess] = useState<yakProcess[]>([])
    const [shouldAutoStart, setShouldAutoStart] = useState(false)
    const [installed, setInstalled] = useState(false)
    const [psIng, setPsIng] = useState(false)
    const [notified, setNotified] = useState(false)

    // 检查是不是 windows
    const [isWindows, setIsWindows] = useState(false)
    const notWindows = !isWindows

    // 检查默认数据库是不是又问题？
    const [databaseError, setDatabaseError] = useState("")
    let databaseErrorVerbose: React.ReactNode = databaseError
    switch (databaseError) {
        case "not allow to write":
            databaseErrorVerbose = "数据库无权限写入"
            break
        case "no such file or directory":
            databaseErrorVerbose = (
                <div>
                    <Tooltip title={"直接启动引擎即可"}>无本地数据库</Tooltip>
                </div>
            )
    }

    const update = useMemoizedFn(() => {
        let noProcess = true
        ipcRenderer.invoke("is-yak-engine-installed").then((ok) => {
            setInstalled(ok)
        })

        if (psIng) {
            return
        }
        setPsIng(true)
        ipcRenderer
            .invoke("ps-yak-grpc")
            .then((i: yakProcess[]) => {
                setNotified(false)
                setProcess(
                    i
                        .map((element: yakProcess) => {
                            noProcess = false
                            return {
                                port: element.port,
                                pid: element.pid,
                                cmd: element.cmd,
                                origin: element.origin
                            }
                        })
                        .filter((i) => true)
                )
            })
            .catch((e) => {
                if (!notified) {
                    failed(`PS | GREP yak failed ${e}`)
                    setNotified(true)
                }
            })
            .finally(() => {
                if (noProcess) {
                    setShouldAutoStart(true)
                }
                setPsIng(false)
            })

        ipcRenderer.invoke("is-windows").then((i: boolean) => {
            setIsWindows(i)
        })

        ipcRenderer.invoke("check-local-database").then((e) => {
            setDatabaseError(e)
        })
    })

    useEffect(() => {
        update()

        let id = setInterval(update, 1000)
        return () => {
            clearInterval(id)
        }
    }, [])

    useEffect(() => {
        props.onProcess && props.onProcess([...process])
    }, [process])

    const promptInstallYakEngine = () => {
        let m = showModal({
            keyboard: false,
            title: "引擎安装与升级",
            width: "50%",
            content: (
                <>
                    <YakUpgrade
                        onFinished={() => {
                            m.destroy()
                        }}
                    />
                </>
            )
        })
    }

    const startYakGRPCServer = (sudo: boolean) => {
        ipcRenderer
            .invoke("start-local-yak-grpc-server", {
                sudo
            })
            .then(() => {
                info("启动 yak grpc 进程成功")
            })
            .catch((e: Error) => {
                const flag = `${e.message}`
                if (flag.includes(`uninstall yak engine`)) {
                    failed("未安装 Yak 引擎")
                    promptInstallYakEngine()
                    return
                }
                failed(`${e.message}`)
            })
            .finally(() => {
                update()
            })
    }

    const databaseMeetError = notWindows && installed && databaseError !== ""

    return (
        <>
            <Form.Item label={" "} colon={false}>
                <div style={{width: "100%"}}>
                    <Row>
                        <Col span={2}/>
                        <Col span={20}>
                            <Card
                                title={
                                    <Space>
                                        <div>本地 Yak 进程管理</div>
                                        {!installed && <Tag color={"red"}>引擎未安装</Tag>}
                                        {notWindows && installed && databaseError !== "" && (
                                            <Space size={0}>
                                                <Tag color={"red"}>{databaseErrorVerbose}</Tag>
                                                <Popconfirm
                                                    title={"尝试修复数据库写权限（可能要求 ROOT 权限）"}
                                                    onConfirm={(e) => {
                                                        ipcRenderer
                                                            .invoke("fix-local-database")
                                                            .then((e) => {
                                                                info("修复成功")
                                                            })
                                                            .catch((e) => {
                                                                failed(`修复数据库权限错误：${e}`)
                                                            })
                                                    }}
                                                >
                                                    <Button
                                                        type={"link"}
                                                        size={"small"}
                                                        icon={
                                                            <>
                                                                <ToolOutlined/>
                                                            </>
                                                        }
                                                    />
                                                </Popconfirm>
                                            </Space>
                                        )}
                                    </Space>
                                }
                                size={"small"}
                                extra={
                                    process.length > 0 && (!props.justClose) && (
                                        <Space>
                                            <Button
                                                size={"small"}
                                                onClick={() => {
                                                    startYakGRPCServer(false)
                                                }}
                                                disabled={databaseMeetError}
                                            >
                                                普通权限启动
                                            </Button>
                                            <Popconfirm
                                                title={"以管理员权限启动"}
                                                onConfirm={() => {
                                                    startYakGRPCServer(true)
                                                }}
                                                disabled={databaseMeetError}
                                            >
                                                <Button size={"small"} type={"primary"} disabled={databaseMeetError}>
                                                    管理员(sudo)启动
                                                </Button>
                                            </Popconfirm>
                                        </Space>
                                    )
                                }
                            >
                                {process.length > 0 ? (
                                    <List
                                        dataSource={process}
                                        renderItem={(i: yakProcess) => {
                                            return (
                                                <List.Item key={i.pid}>
                                                    <Card
                                                        size={"small"}
                                                        style={{width: "100%"}}
                                                        bordered={false}
                                                        hoverable={true}
                                                    >
                                                        <Row>
                                                            <Col span={12} style={{textAlign: "left"}}>
                                                                <Space>
                                                                    <Tag color={"green"}>PID: {i.pid}</Tag>
                                                                    <CopyableField
                                                                        text={`yak grpc --port ${
                                                                            i.port === 0 ? "获取中" : i.port
                                                                        }`}
                                                                        width={300}
                                                                    />
                                                                </Space>
                                                            </Col>
                                                            <Col span={12}>
                                                                <div style={{width: "100%", textAlign: "right"}}>
                                                                    <Space>
                                                                        {!props.justClose && <Button
                                                                            size={"small"}
                                                                            type={"primary"}
                                                                            disabled={!props.onConnected}
                                                                            loading={i.port <= 0}
                                                                            onClick={() => {
                                                                                props.onConnected &&
                                                                                props.onConnected(
                                                                                    i.port,
                                                                                    "localhost"
                                                                                )
                                                                            }}
                                                                        >
                                                                            连接引擎
                                                                        </Button>}
                                                                        <Popconfirm
                                                                            title={"将会强制关闭该进程"}
                                                                            onConfirm={() => {
                                                                                ipcRenderer
                                                                                    .invoke("kill-yak-grpc", i.pid)
                                                                                    .catch((e: any) => {
                                                                                    })
                                                                                    .finally(update)
                                                                            }}
                                                                        >
                                                                            <Button size={"small"} danger={true}>
                                                                                关闭引擎
                                                                            </Button>
                                                                        </Popconfirm>
                                                                        <Button
                                                                            type={"link"}
                                                                            size={"small"}
                                                                            onClick={() => {
                                                                                showModal({
                                                                                    title: "YakProcess 详情",
                                                                                    content: (
                                                                                        <>
                                                                                            {JSON.stringify(i)}
                                                                                        </>
                                                                                    )
                                                                                })
                                                                            }}
                                                                        >
                                                                            details
                                                                        </Button>
                                                                    </Space>
                                                                </div>
                                                            </Col>
                                                        </Row>
                                                    </Card>
                                                </List.Item>
                                            )
                                        }}
                                    />
                                ) : (
                                    <div>{
                                        props.justClose ? (
                                            <Empty description={"没有已知的引擎进程"}/>
                                        ) : (
                                            <Space>
                                                <Button
                                                    onClick={() => {
                                                        startYakGRPCServer(false)
                                                    }}
                                                    disabled={databaseMeetError}
                                                >
                                                    普通权限启动
                                                </Button>
                                                <Popconfirm
                                                    title={"以管理员权限启动，解锁全部 yak 引擎功能"}
                                                    onConfirm={() => {
                                                        startYakGRPCServer(true)
                                                    }}
                                                    disabled={databaseMeetError}
                                                >
                                                    <Button disabled={databaseMeetError} type={"primary"}>
                                                        管理员(sudo)启动
                                                    </Button>
                                                </Popconfirm>
                                            </Space>
                                        )
                                    }</div>
                                )}
                            </Card>
                        </Col>
                        <Col span={2}/>
                    </Row>
                </div>
            </Form.Item>
        </>
    )
}
