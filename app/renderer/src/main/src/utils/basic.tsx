import React, {useEffect, useRef, useState} from "react";
import {Spin, Tag, Button, Card, ButtonProps, Popconfirm, Space, Alert, Badge, Timeline} from "antd";
import {XTerm} from "xterm-for-react";
import {ExecResult} from "../pages/invoker/schema";
import {showModal} from "./showModal";
import {failed} from "./notification";
import {openExternalWebsite} from "./openWebsite";
import {ExecResultLog, ExecResultMessage} from "../pages/invoker/batch/ExecMessageViewer";
import {LogLevelToCode} from "../components/HTTPFlowTable";
import {YakitLogFormatter} from "../pages/invoker/YakitLogFormatter";

export interface YakVersionProp {

}

const {ipcRenderer} = window.require("electron");

export const YakVersion: React.FC<YakVersionProp> = (props) => {
    const [version, setVersion] = useState<string>("dev")
    const [latestVersion, setLatestVersion] = useState("");


    useEffect(() => {
        ipcRenderer.invoke("query-latest-yak-version").then((data: string) => {
            setLatestVersion(data)
        }).catch(() => {
        }).finally(
        )

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

    const newVersion = latestVersion !== "" && latestVersion !== version

    if (!newVersion) {
        return <Tag color={isDev ? "red" : "geekblue"}>
            Yak-{version}
        </Tag>
    }

    return <div>
        <Badge dot={newVersion}>
            <Button size={"small"} type={"primary"}
                    onClick={() => {
                        if (!newVersion) {
                            return
                        }

                        showModal({
                            title: "有新的 Yak 核心引擎可升级！",
                            content: <>
                                如果你现在不是很忙
                                <br/>
                                我们推荐您退出当前引擎，点击欢迎界面的
                                <br/>
                                "安装/升级 Yak 引擎" 来免费升级
                            </>
                        })
                    }}>
                Yak-{version}
            </Button>
        </Badge>
    </div>
};

export const YakitVersion: React.FC<YakVersionProp> = (props) => {
    const [version, setVersion] = useState<string>("dev")
    const [latestVersion, setLatestVersion] = useState("");

    useEffect(() => {
        ipcRenderer.invoke("query-latest-yakit-version").then(nv => {
            setLatestVersion(nv)
        })
        ipcRenderer.invoke("yakit-version").then(v => setVersion(`v${v}`))
    }, [])

    if (!version) {
        return <Spin tip={"正在加载 yakit 版本"}/>
    }
    const isDev = version.toLowerCase().includes("dev");
    const newVersion = latestVersion !== "" && latestVersion !== version

    if (!newVersion) {
        return <Tag color={isDev ? "red" : "geekblue"}>
            Yakit-{version}
        </Tag>
    }

    return <div>
        <Badge dot={newVersion}>
            <Button size={"small"} type={"primary"} onClick={() => {
                if (!newVersion) {
                    return
                }

                showModal({
                    title: "有新的 Yakit 版本可升级！",
                    content: <>
                        如果你现在不是很忙
                        <br/>
                        我们推荐您进入 <Button
                        type={"primary"}
                        onClick={() => {
                            openExternalWebsite("https://github.com/yaklang/yakit/releases")
                        }}
                    >Yakit Github 发布界面</Button> 下载最新版并升级！
                    </>
                })
            }}>
                Yakit-{version}
            </Button>
        </Badge>
    </div>
};

export interface AutoUpdateYakModuleViewerProp {

}

export const AutoUpdateYakModuleViewer: React.FC<AutoUpdateYakModuleViewerProp> = (props) => {
    const [end, setEnd] = useState(false);
    const [error, setError] = useState("");
    const [msg, setMsgs] = useState<ExecResultMessage[]>([]);

    useEffect(() => {
        const messages: ExecResultMessage[] = []
        ipcRenderer.on("client-auto-update-yak-module-data", (e, data: ExecResult) => {
            if (data.IsMessage) {
                try {
                    let obj: ExecResultMessage = JSON.parse(Buffer.from(data.Message).toString("utf8"));
                    messages.unshift(obj)
                } catch (e) {

                }
            }
        });
        ipcRenderer.on("client-auto-update-yak-module-end", (e) => {
            setEnd(true)

        });
        ipcRenderer.on("client-auto-update-yak-module-error", (e, msg: any) => {
            setError(`${msg}`)
        });
        ipcRenderer.invoke("auto-update-yak-module")
        let id = setInterval(() => setMsgs([...messages]), 1000)
        return () => {
            clearInterval(id);
            ipcRenderer.removeAllListeners("client-auto-update-yak-module-data")
            ipcRenderer.removeAllListeners("client-auto-update-yak-module-error")
            ipcRenderer.removeAllListeners("client-auto-update-yak-module-end")
        }
    }, [])

    return <Card title={"自动更新进度"}>
        <Space direction={"vertical"} style={{width: "100%"}} size={12}>
            {error && <Alert type={"error"} message={error}/>}
            {end && <Alert type={"info"} message={"更新进程已结束"}/>}
            <Timeline pending={!end} style={{marginTop: 20}}>
                {(msg || []).filter(i => i.type === "log").map(i => i.content as ExecResultLog).map(e => {
                    return <Timeline.Item color={LogLevelToCode(e.level)}>
                        <YakitLogFormatter data={e.data} level={e.level} timestamp={e.timestamp}/>
                    </Timeline.Item>
                })}
            </Timeline>
        </Space>
    </Card>;
};

export interface AutoUpdateYakModuleButtonProp extends ButtonProps {

}

export const AutoUpdateYakModuleButton: React.FC<AutoUpdateYakModuleButtonProp> = (props) => {
    return <Popconfirm
        title={"一键更新将更新 yakit-store 中的内容与更新 nuclei templates 到本地"}
        onConfirm={e => {
            showModal({
                title: "自动更新 Yak 模块", content: <>
                    <AutoUpdateYakModuleViewer/>
                </>, width: "60%",
            })
        }}
    >
        <Button {...props}>
            更新 Yakit 插件商店
        </Button>
    </Popconfirm>
};