import React, {useEffect, useState} from "react";
import {XTerm} from "xterm-for-react";
import {
    Space, PageHeader, Form,
    Input, InputNumber,
    Button, Spin,
} from "antd";

const FormItem = Form.Item;
const {ipcRenderer} = window.require("electron");

export const PortListening = (props) => {
    const xtermRef = React.useRef(null)
    const [status, setStatus] = useState("wait");
    const [host, setHost] = useState("0.0.0.0");
    const [port, setPort] = useState(8085);
    const [haveConnIn, setHaveConnIn] = useState(false);

    const write = (s) => {
        if (!xtermRef || !xtermRef.current) {
            return
        }

        if ((Buffer.from(s, "utf8") || []).length === 1) {
            let buf = Buffer.from(s, "utf8");
            switch (buf[0]) {
                case 127:
                    xtermRef.current.terminal.write("\b");
                    ipcRenderer.invoke("listening-port-input", "\b")
                    return
                default:
                    xtermRef.current.terminal.write(s);
                    ipcRenderer.invoke("listening-port-input", s)
                    return;
            }
        } else {
            xtermRef.current.terminal.write(s);
            ipcRenderer.invoke("listening-port-input", s)
            return
        }
    };

    useEffect(() => {
        if (status === "wait") setHaveConnIn(false);
    }, [status])

    useEffect(() => {
        if (!xtermRef || !xtermRef.current) {
            return
        }
        // You can call any method in XTerm.js by using 'xterm xtermRef.current.terminal.[What you want to call]
        // @ts-ignore
        const terminal = xtermRef.current.terminal;
        terminal.writeln(`Welcome to Yak Connection From: ${host}:${port}`)
    }, [xtermRef])

    useEffect(() => {
        const handler = (e, data) => {
            if (data?.raw && xtermRef?.current && xtermRef.current?.terminal) {
                // let str = String.fromCharCode.apply(null, data.raw);
                xtermRef.current.terminal.write(
                    String.fromCharCode.apply(null, data.raw).replace("\n", "\n\r"),
                );
                setHaveConnIn(true)
            }
        }
        ipcRenderer.on("client-listening-port-data", handler)
        return () => {
            ipcRenderer.removeListener("client-listening-port-data", handler)
        }
    }, [])

    return <div>
        <PageHeader title={'监听端口'}>

        </PageHeader>
        {((() => {
            switch (status) {
                case "wait":
                    return <div>
                        <Form layout={"inline"} onSubmitCapture={e => {
                            e.preventDefault()

                            ipcRenderer.invoke("listening-port", host, port)
                            setStatus("listening")
                        }}>
                            <FormItem label={"监听本机地址"}>
                                <Input value={host} onChange={e => setHost(e.target.value)}/>
                            </FormItem>
                            <FormItem label={"监听本机地址"}>
                                <InputNumber
                                    min={1} max={65535}
                                    value={port} onChange={e => setPort(e)}
                                />
                            </FormItem>
                            <FormItem>
                                <Button type={"primary"} htmlType={"submit"}>开始监听当前端口</Button>
                            </FormItem>
                        </Form>
                    </div>
                case "listening":
                    // @ts-ignore
                    return (
                        <Space direction={"vertical"}>
                            <Space>
                                <Button danger={true} onClick={() => {
                                    if (xtermRef.current?.terminal) {
                                        xtermRef.current?.terminal.clear()
                                    }
                                }}>清除缓存</Button>
                                <Button danger={true} type={"primary"} onClick={() => {
                                    ipcRenderer.invoke("listening-port-cancel")
                                    setStatus("wait")
                                }}>取消</Button>

                            </Space>
                            <Spin spinning={!haveConnIn} tip={"正在等待 TCP 连接连入..."}>

                                <XTerm ref={xtermRef} onKey={({key, event}) => {
                                    if (key.charCodeAt(0) == 13) {
                                        write("\n")
                                    }
                                    write(key)
                                }}/>
                            </Spin>
                        </Space>
                    )
                default:
                    return "DEFAULT"
            }
        })())}
    </div>


};