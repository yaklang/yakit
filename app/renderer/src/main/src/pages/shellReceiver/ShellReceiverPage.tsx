import React, {useEffect, useState} from "react";
import {Button, Modal, notification, PageHeader, Popconfirm, Space, Spin, Tabs, Tag} from "antd";
import {showModal} from "../../utils/showModal";
import {CreateShellReceiverForm} from "./CreateShellReceiver";
import {failed, info, success} from "../../utils/notification";
import {ShellItem} from "./ShellItem";

export interface ShellReceiverPageProp {

}

const {ipcRenderer} = window.require("electron");

export const ShellReceiverPage: React.FC<ShellReceiverPageProp> = (props) => {
    const [addrs, setAddrs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [updatingAddrs, setUpdatingAddrs] = useState(true);
    
    const waitingSyncAddr = () => {
        setUpdatingAddrs(true)
    };
    const removeListenPort = (addr: string) => {
        waitingSyncAddr()
        ipcRenderer.invoke("listening-port-cancel", addr)
    }
    const startListenPort = (addr: string) => {
        if (!addr.includes(":")) {
            failed(`无法启动端口监听程序，端口格式不合理: [${addr}]`)
            return
        }

        const result = addr.split(":", 2);
        const host = result[0];
        const port = result[1];
        if (!host || !port) {
            failed(`无法解析主机/端口`)
            return;
        }

        if (addrs.includes(addr)) {
            Modal.error({title: "该地址已经被占用: " + addr})
            failed("该地址已经被占用: " + addr)
            return;
        }

        setLoading(true)
        setTimeout(() => {
            ipcRenderer.invoke("listening-port", host, port).then(() => {
                success("监听端口成功")
            }).catch((e: any) => {
                failed(`ERROR: ${JSON.stringify(e)}`)
            }).finally(() => {
                waitingSyncAddr()
                setTimeout(() => setLoading(false), 300)
            })
        }, 500)
    };

    useEffect(() => {
        const id = setInterval(() => {
            ipcRenderer.invoke("listening-port-query-addrs").then(r => {
                setAddrs(r)
            }).finally(() => {
                if (updatingAddrs) {
                    setUpdatingAddrs(false)
                }
            })
        }, 1000)
        return () => {
            clearInterval(id)
        }
    }, [])


    const createForm = () => {
        const m = showModal({
            title: "开始监听一个 Yak 所属服务器的端口",
            width: "50%",
            content: <>
                <CreateShellReceiverForm onCheck={addr => {
                    return true
                }} onCreated={(addr) => {
                    startListenPort(addr);
                    m.destroy()
                }}/>
            </>
        })
    }

    useEffect(() => {
        const errorKey = "client-listening-port-end";
        ipcRenderer.on(errorKey, (e: any, data: any) => {
            Modal.info({title: `端口[${data}]被关闭`})
        })
        return () => {
            ipcRenderer.removeAllListeners(errorKey)
        }
    }, [])

    return <>
        <PageHeader title={"Reverse Shell Receiver"} subTitle={<Space>
            {/*<Button type={"primary"}>开启端口并监听</Button>*/}
            <div>反弹 Shell 接收工具，可以在服务器上开启一个端口，进行监听，并进行交互。</div>
        </Space>}>

        </PageHeader>
        <Spin spinning={loading || updatingAddrs}>
            <Tabs type={"editable-card"} onEdit={(key, action) => {
                if (action === "add") {
                    createForm()
                } else if (action === "remove") {
                    removeListenPort(`${key}`)
                }
            }}>
                {(addrs || []).length > 0 ? addrs.map(e => {
                    return <Tabs.TabPane key={e} tab={`${e}`} closable={false}>
                        <ShellItem addr={e} removeListenPort={removeListenPort}/>
                    </Tabs.TabPane>
                }) : <Tabs.TabPane closable={false} key={"empty"} tab={"开始监听端口"}>
                    <CreateShellReceiverForm
                        title={"开始监听：在服务器上开启一个端口"}
                        onCheck={addr => {
                            return true
                        }} onCreated={(addr) => {
                        startListenPort(addr);
                    }}/>
                </Tabs.TabPane>}
            </Tabs>
        </Spin>
    </>
};