import React, {useEffect, useState} from "react";
import {CopyableField, SelectOne} from "../utils/inputUtil";
import {Button, Card, Col, Form, List, Popconfirm, Row, Space, Tag} from "antd";
import ReactJson from "react-json-view";
import {success} from "../utils/notification";

export interface YakLocalProcessProp {

}

const {ipcRenderer} = window.require("electron");

interface yakProcess {
    port: number,
    pid: number
}

export const YakLocalProcess: React.FC<YakLocalProcessProp> = (props) => {
    const [process, setProcess] = useState<yakProcess[]>([]);
    const [loading, setLoading] = useState(false);
    const [shouldAutoStart, setShouldAutoStart] = useState(false);

    const update = () => {
        let noProcess = true;
        ipcRenderer.invoke("ps-yak-grpc").then((i: yakProcess[]) => {
            setProcess(i.map((element: yakProcess) => {
                noProcess = false;
                return {port: element.port, pid: element.pid}
            }).filter(i => i.port >= 1))
        }).finally(() => {
            if (noProcess) {
                setShouldAutoStart(true)
            }
        })
    }

    useEffect(() => {
        update()
    }, [])

    useEffect(() => {
        if (shouldAutoStart) {
            ipcRenderer.invoke("start-local-yak-grpc-server").then(port => {
                success(`在 localhost:${port} 启动了 yak 引擎`)
            }).finally(() => {
                update()
            })
        }
    }, [shouldAutoStart])

    return <>
        <Form.Item label={" "} colon={false}>
            <div style={{width: "100%"}}>
                <Row>
                    <Col span={5}/>
                    <Col span={14}>
                        <Card
                            title={"本地 Yak 进程管理"}
                            size={"small"}
                            extra={[
                                <Space>
                                    <Button size={"small"}>普通权限启动</Button>
                                    <Button size={"small"} type={"primary"}>管理员(sudo)启动</Button>
                                </Space>
                            ]}
                        >
                            {process.length > 0 && <List
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
                                                        <Tag color={"green"}>{i.pid}</Tag>
                                                        <CopyableField
                                                            text={`yak grpc --port ${i.port}`} width={300}
                                                        />
                                                    </Space>
                                                </Col>
                                                <Col span={12}>
                                                    <div style={{width: "100%", textAlign: "right"}}>
                                                        <Space>
                                                            <Button size={"small"} type={"primary"}>连接引擎</Button>
                                                            <Popconfirm
                                                                title={"将会强制关闭该进程"}
                                                                onConfirm={() => {
                                                                    ipcRenderer.invoke("kill-yak-grpc", i.pid).finally(update)
                                                                }}
                                                            >
                                                                <Button
                                                                    size={"small"} danger={true}
                                                                >关闭引擎</Button>
                                                            </Popconfirm>
                                                        </Space>
                                                    </div>
                                                </Col>
                                            </Row>
                                        </Card>
                                    </List.Item>
                                }}
                            >

                            </List>}
                        </Card>
                    </Col>
                    <Col span={5}/>
                </Row>
            </div>

        </Form.Item>
    </>
};