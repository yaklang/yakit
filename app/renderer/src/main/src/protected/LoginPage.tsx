import React, {useEffect, useState} from "react";
import {AutoCard} from "../components/AutoCard";
import {Button, Col, Form, notification, Row, Space} from "antd";
import {InputItem, SwitchItem} from "../utils/inputUtil";
import {saveAuthInfo} from "./YakRemoteAuth";
import {useMemoizedFn} from "ahooks";
import {failed, info} from "../utils/notification";
import {yakProcess} from "./YakLocalProcess";

export interface LoginPageProp {
    username: string
    password: string
    onConnected: (port: number, host: string) => any
}

const {ipcRenderer} = window.require("electron");

export const LoginPage: React.FC<LoginPageProp> = (props) => {
    const [loginUser, setLoginUser] = useState("");
    const [loginPass, setLoginPass] = useState("");
    const [localLoading, setLocalLoading] = useState(true);
    const [process, setProcess] = useState<yakProcess[]>([]);
    const [isInstalled, setInstalled] = useState(false);
    const [psIng, setPsIng] = useState(false);
    const [shouldAutoStart, setShouldAutoStart] = useState(false);
    const [sudo, setSudo] = useState(false);

    const login = useMemoizedFn((newHost?: string, newPort?: number) => {
        setLocalLoading(true)
        let params = {
            host: newHost,
            port: newPort,
        };
        ipcRenderer.invoke("connect-yak", {...params}).then(() => {
            props.onConnected(newPort || 8087, newHost || "127.0.0.1")
        }).catch(() => {
            notification["error"]({message: "设置 Yak gRPC 引擎地址失败"})
        }).finally(() => {
            setTimeout(() => {
                setLocalLoading(false)
            }, 200);
        })
    });

    const update = useMemoizedFn(() => {
        let noProcess = true;
        ipcRenderer.invoke("is-yak-engine-installed").then(ok => {
            setInstalled(ok)
        });

        if (psIng) {
            return
        }
        setPsIng(true)
        ipcRenderer.invoke("ps-yak-grpc").then((i: yakProcess[]) => {
            setProcess(i.map((element: yakProcess) => {
                noProcess = false;
                return {
                    port: element.port,
                    pid: element.pid,
                    cmd: element.cmd,
                    origin: element.origin,
                }
            }).filter(i => true))
        }).catch(e => {
        }).finally(() => {
            setPsIng(false)
        })
    });

    useEffect(() => {
        update()
        let id = setInterval(() => {
            update()
        }, 1000)
        return () => clearInterval(id)
    }, [])

    const startYakGRPCServer = useMemoizedFn((sudo: boolean) => {
        ipcRenderer.invoke("start-local-yak-grpc-server", {
            sudo,
        }).then(() => {
            info("启动 yak grpc 进程成功")
        }).catch((e: Error) => {
            const flag = `${e.message}`;
            if (flag.includes(`uninstall yak engine`)) {
                failed("未安装 Yak 引擎")
                return
            }
            failed(`${e.message}`)
        }).finally(() => {
            update()
        })
    });

    useEffect(() => {
        if (!shouldAutoStart) {
            return
        }
        if (process.length <= 0) {
            return
        }

        const loginLocal = () => {
            login("127.0.0.1", process[0].port)
        }
        loginLocal()
        let id = setInterval(() => {
            loginLocal()
        }, 1000)
        return () => clearInterval(id)
    }, [shouldAutoStart, process, login])

    return <Row style={{marginTop: 150}}>
        <Col span={4}>

        </Col>
        <Col span={16}>
            <AutoCard style={{width: 800}}>
                <Form onSubmitCapture={e => {
                    e.preventDefault()

                    if (props.password === loginPass && props.username === loginUser) {
                        if (process.length <= 0) {
                            startYakGRPCServer(sudo)
                        }
                        setShouldAutoStart(true)
                    }
                }} labelCol={{span: 5}} wrapperCol={{span: 14}}>
                    <InputItem required={true} label={"用户名"} value={loginUser} setValue={setLoginUser}/>
                    <InputItem required={true} label={"密码"} type={"password"} value={loginPass}
                               setValue={setLoginPass}/>
                    <SwitchItem label={"管理员权限启动"} value={sudo} setValue={setSudo}/>
                    <Form.Item colon={false} label={" "}>
                        <Space>
                            <Button type="primary" htmlType="submit"> 登陆检测平台 </Button>
                            {(process || []).length > 0 && <Button type="link" danger={true} onClick={() => {
                                (process || []).map(i => {
                                    ipcRenderer.invoke("kill-yak-grpc", i.pid).catch((e: any) => {
                                    })
                                })
                            }}> 关闭全部进程[{process.length}]</Button>}
                        </Space>
                    </Form.Item>
                </Form>
            </AutoCard>
        </Col>
        <Col span={1}>

        </Col>
    </Row>
};