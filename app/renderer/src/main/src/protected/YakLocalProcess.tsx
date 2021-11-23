import React, {useEffect, useState} from "react";
import {CopyableField, SelectOne} from "../utils/inputUtil";
import {Button, Card, Col, Form, List, Modal, Popconfirm, Row, Space, Tag} from "antd";
import ReactJson from "react-json-view";
import {failed, success} from "../utils/notification";
import {showModal} from "../utils/showModal";
import {YakUpgrade} from "../components/YakUpgrade";

export interface YakLocalProcessProp {
    onConnected?: (port: number, host: string) => any
}

const {ipcRenderer} = window.require("electron");

interface yakProcess {
    port: number
    pid: number
    cmd: string
    origin: any
}

export const YakLocalProcess: React.FC<YakLocalProcessProp> = (props) => {
    const [process, setProcess] = useState<yakProcess[]>([]);
    const [loading, setLoading] = useState(false);
    const [shouldAutoStart, setShouldAutoStart] = useState(false);
    const [installed, setInstalled] = useState(false);

    const update = () => {
        let noProcess = true;
        ipcRenderer.invoke("is-yak-engine-installed").then(ok => {
            setInstalled(ok)
        })
        ipcRenderer.invoke("ps-yak-grpc").then((i: yakProcess[]) => {
            setProcess(i.map((element: yakProcess) => {
                noProcess = false;
                return {port: element.port, pid: element.pid, cmd: element.cmd, origin: element.origin}
            }).filter(i => true))
        }).finally(() => {
            if (noProcess) {
                setShouldAutoStart(true)
            }
        })
    }

    useEffect(() => {
        update()

        let id = setInterval(update, 1000);
        return () => {
            clearInterval(id);
        }
    }, [])

    const promptInstallYakEngine = () => {
        let m = showModal({
            keyboard: false,
            title: "引擎安装与升级",
            width: "50%",
            content: <>
                <YakUpgrade onFinished={() => {
                    m.destroy()
                }}/>
            </>
        })
    }

    const startYakGRPCServer = (sudo: boolean) => {
        ipcRenderer.invoke("start-local-yak-grpc-server", {
            sudo,
        }).catch((e: Error) => {
            const flag = `${e.message}`;
            if (flag.includes(`cannot find '/usr/local/bin'`)) {
                failed("未安装 Yak 引擎（找不到 /usr/local/bin 目录）")
                promptInstallYakEngine()
                return
            }
            if (flag.includes(`uninstall yak engine`)) {
                failed("未安装 Yak 引擎")
                promptInstallYakEngine()
                return
            }
            // failed(`${e.message}`)
        }).finally(() => {
            update()
        })
    }

    return <>
        <Form.Item label={" "} colon={false}>
            <div style={{width: "100%"}}>
                <Row>
                    <Col span={5}/>
                    <Col span={14}>
                        <Card
                            title={<Space>
                                <div>本地 Yak 进程管理</div>
                                {!installed && <Tag color={"red"}>引擎未安装</Tag>}
                            </Space>}
                            size={"small"}
                            extra={
                                process.length > 0 && <Space>
                                    <Button size={"small"} onClick={() => {
                                        startYakGRPCServer(false)
                                    }}>普通权限启动</Button>
                                    <Popconfirm title={"以管理员权限启动"} onConfirm={() => {
                                        startYakGRPCServer(true)
                                    }}>
                                        <Button size={"small"} type={"primary"}>管理员(sudo)启动</Button>
                                    </Popconfirm>
                                </Space>
                            }
                        >
                            {process.length > 0 ? <List
                                dataSource={process}
                                renderItem={(i: yakProcess) => {
                                    return <List.Item
                                        key={i.pid}
                                    >
                                        <Card
                                            size={"small"} style={{width: "100%"}} bordered={false} hoverable={true}
                                        >
                                            <Row>
                                                <Col span={12} style={{textAlign: "left"}}>
                                                    <Space>
                                                        <Tag color={"green"}>PID: {i.pid}</Tag>
                                                        <CopyableField
                                                            text={`yak grpc --port ${i.port}`} width={300}
                                                        />
                                                    </Space>
                                                </Col>
                                                <Col span={12}>
                                                    <div style={{width: "100%", textAlign: "right"}}>
                                                        <Space>
                                                            <Button size={"small"} type={"primary"}
                                                                    disabled={!props.onConnected}
                                                                    onClick={() => {
                                                                        props.onConnected && props.onConnected(
                                                                            i.port, "localhost")
                                                                    }}
                                                            >连接引擎</Button>
                                                            <Popconfirm
                                                                title={"将会强制关闭该进程"}
                                                                onConfirm={() => {
                                                                    ipcRenderer.invoke("kill-yak-grpc", i.pid).catch(e => {

                                                                    }).finally(update)
                                                                }}
                                                            >
                                                                <Button
                                                                    size={"small"} danger={true}
                                                                >关闭引擎</Button>
                                                            </Popconfirm>
                                                            <Button
                                                                type={"link"} size={"small"}
                                                                onClick={() => {
                                                                    showModal({
                                                                        title: "YakProcess 详情",
                                                                        content: <>
                                                                            <ReactJson src={i}/>
                                                                        </>
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
                                }}
                            >

                            </List> : <Space>
                                <Button onClick={() => {
                                    startYakGRPCServer(false)
                                }}>普通权限启动</Button>
                                <Popconfirm title={"以管理员权限启动，解锁全部 yak 引擎功能"} onConfirm={() => {
                                    startYakGRPCServer(true)
                                }}>
                                    <Button type={"primary"}>管理员(sudo)启动</Button>
                                </Popconfirm>
                            </Space>}
                        </Card>
                    </Col>
                    <Col span={5}/>
                </Row>
            </div>

        </Form.Item>
    </>
};