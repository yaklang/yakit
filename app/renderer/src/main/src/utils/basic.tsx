import React, {useEffect, useRef, useState} from "react";
import {Spin, Tag, Button, Card, ButtonProps, Popconfirm, Space, Alert} from "antd";
import {XTerm} from "xterm-for-react";
import {ExecResult} from "../pages/invoker/schema";
import {showModal} from "./showModal";

export interface YakVersionProp {

}

const {ipcRenderer} = window.require("electron");

export const YakVersion: React.FC<YakVersionProp> = (props) => {
    const [version, setVersion] = useState<string>("dev")

    useEffect(() => {
        ipcRenderer.on("client-yak-version", async (e: any, data) => {
            setVersion(data)
        })

        ipcRenderer.invoke("yak-version")
        return () => {
            ipcRenderer.removeAllListeners("client-yak-version")
        }
    }, [])

    if (!version) {
        return <Spin tip={"正在加载 yak 版本"}/>
    }
    const isDev = version.toLowerCase().includes("dev");
    return <Tag color={isDev ? "red" : "geekblue"}>
        Yak-{version}
    </Tag>
};

export const YakitVersion: React.FC<YakVersionProp> = (props) => {
    const [version, setVersion] = useState<string>("dev")

    useEffect(() => {
        ipcRenderer.invoke("yakit-version").then(setVersion)
        return () => {
            ipcRenderer.removeAllListeners("yakit-version")
        }
    }, [])

    if (!version) {
        return <Spin tip={"正在加载 yakit 版本"}/>
    }
    const isDev = version.toLowerCase().includes("dev");
    return <Tag color={isDev ? "red" : "purple"}>
        Yakit-{version}
    </Tag>
};

export interface AutoUpdateYakModuleViewerProp {

}

export const AutoUpdateYakModuleViewer: React.FC<AutoUpdateYakModuleViewerProp> = (props) => {
    const xtermRef = useRef(null);
    const [end, setEnd] = useState(false);
    const [error, setError] = useState("");

    const write = (s: any) => {
        if (!xtermRef || !xtermRef.current) {
            return
        }

        if ((Buffer.from(s, "utf8") || []).length === 1) {
            let buf = Buffer.from(s, "utf8");
            switch (buf[0]) {
                case 127:
                    // @ts-ignore
                    xtermRef.current.terminal.write("\b \b");
                    return
                default:
                    // @ts-ignore
                    xtermRef.current.terminal.write(s);
                    return;
            }
        } else {
            // @ts-ignore
            xtermRef.current.terminal.write(s);
            return
        }
    };

    useEffect(() => {
        ipcRenderer.on("client-auto-update-yak-module-data", (e, data: ExecResult) => {
            let buffer = (Buffer.from(data.Raw as Uint8Array)).toString("utf8");
            write(buffer)
        });
        ipcRenderer.on("client-auto-update-yak-module-end", (e) => {
            setEnd(true)
        });
        ipcRenderer.on("client-auto-update-yak-module-error", (e, msg: any) => {
            setError(`${msg}`)
        });
        ipcRenderer.invoke("auto-update-yak-module")
        return () => {
            ipcRenderer.removeAllListeners("client-auto-update-yak-module-data")
            ipcRenderer.removeAllListeners("client-auto-update-yak-module-error")
            ipcRenderer.removeAllListeners("client-auto-update-yak-module-end")
        }
    }, [])

    return <Card title={"自动更新进度"}>
        <Space direction={"vertical"}>
            {error && <Alert type={"error"} message={error}/>}
            {end && <Alert type={"info"} message={"更新进程已结束"}/>}
            <XTerm ref={xtermRef} options={{convertEol: true}}/>
        </Space>
    </Card>;
};

export interface AutoUpdateYakModuleButtonProp extends ButtonProps {

}

export const AutoUpdateYakModuleButton: React.FC<AutoUpdateYakModuleButtonProp> = (props) => {
    return <Popconfirm
        title={"一键更新将会：1. 更新 Nuclei 可用模块(yak update-nuclei-poc)；2. 把模块加载到本地(db)"}
        onConfirm={e => {
            showModal({
                title: "自动更新 Yak 模块", content: <>
                    <AutoUpdateYakModuleViewer/>
                </>, width: "60%",
            })
        }}
    >
        <Button {...props}>
            一键更新 Yak 模块
        </Button>
    </Popconfirm>
};