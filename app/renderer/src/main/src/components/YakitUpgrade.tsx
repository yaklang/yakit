import React, {useEffect, useState} from "react";
import {Alert, Button, Card, Modal, Popconfirm, Progress, Space, Spin, Tag} from "antd";
import {failed, success} from "../utils/notification";
import {isEnterpriseEdition} from "@/utils/envfile";

const {ipcRenderer} = window.require("electron");

// 是否为企业版
export interface YakitUpgradeProp {
    onFinished: () => any
}


interface DownloadingTime {
    elapsed: number;
    remaining: number;
}

interface DownloadingSize {
    total: number;
    transferred: number;
}

interface DownloadingState {
    time: DownloadingTime;
    speed: number;
    percent: number;
    size: DownloadingSize;
}


export const YakitUpgrade: React.FC<YakitUpgradeProp> = (props) => {
    const [currentVersion, setCurrentVersion] = useState("")
    const [loading, setLoading] = useState(false);
    const [latestLoading, setLatestLoading] = useState(false);
    const [latestVersion, setLatestVersion] = useState("");
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<DownloadingState>();

    const queryLatestVersion = () => {
        setLatestLoading(true)
        ipcRenderer.invoke("query-latest-yakit-version").then((data: string) => {
            if (data.startsWith("v")) {
                data = data.substr(1)
            }
            setLatestVersion(data)
        }).catch((e: any) => {
            failed(`${e}`)
        }).finally(
            () => setTimeout(() => setLatestLoading(false), 300)
        )
    }

    const updateCurrent = () => {
        setLoading(true)
        ipcRenderer.invoke("yakit-version").then((data: string) => {
            setCurrentVersion(data)
        }).catch((e: any) => {
            failed(`${e}`)
        }).finally(
            () => setTimeout(() => setLoading(false), 300)
        )
    }

    useEffect(() => {
        ipcRenderer.on("download-yakit-engine-progress", async (e: any, state: DownloadingState) => {
            setDownloadProgress(state);
        })
        return () => {
            ipcRenderer.removeAllListeners("download-yakit-engine-progress")
        }
    }, [])


    useEffect(() => {
        updateCurrent()
        queryLatestVersion()

        // ipcRenderer.invoke("get-windows-install-dir").then(setWinPath).catch(() => {
        // }).finally()
    }, [])

    const install = (version: string) => {
        Modal.confirm({
            title: "Yakit 下载完毕",
            width: "50%",
            content: <>
                <Space direction={"vertical"}>
                    <Tag color={"purple"}>Yakit 安装包下载完毕</Tag>
                    <p/>
                    <Tag>选择 Ok/确定 允许打开 Yakit 安装包下载目录，用户双击安装</Tag>
                    <Tag>选择 Cancel 用户自行找到安装包</Tag>
                    <br/>
                    <Tag>linux/macOs 安装包存储在：~/yakit-projects/yak-engine</Tag>
                    <Tag>windows 安装包存储在：%HOME%/yakit-projects/yak-engine</Tag>
                </Space>
            </>,
            onOk: () => {
                ipcRenderer.invoke("install-yakit", latestVersion).then(() => {
                }).catch((err: any) => {
                })
            }

        })
    }

    const isLatest = currentVersion === latestVersion;
    const color = isLatest ? "green" : "red";
    return <Card
        size={"small"} bodyStyle={{padding: 0}} bordered={false}
    >
        <Space direction={"vertical"} style={{width: "100%"}}>
            <Spin spinning={loading}>
                <Alert message={<Space>
                    当前 Yakit 版本:
                    <Tag
                        color={color}
                    >{currentVersion}</Tag>
                    {isLatest ? <Tag color={"green"}>已是最新</Tag> : <Tag
                        color={"red"}
                    >Yakit 需要更新</Tag>}
                </Space>}/>
            </Spin>
            <Spin spinning={loading}>
                <Alert
                    type={"success"}
                    message={<Space>
                        Yakit 最新版本为：
                        <Tag color={"green"}>{latestVersion}</Tag>
                    </Space>}/>
            </Spin>
            <Spin spinning={downloading}>
                <div style={{display: "flex"}}>
                    <Space>
                        <Popconfirm
                            visible={(isLatest || loading || latestLoading) ? false : undefined}
                            title={`确定要更新版本: ${latestVersion}`}
                            onConfirm={e => {
                                setDownloading(true)
                                ipcRenderer.invoke("download-latest-yakit", latestVersion, isEnterpriseEdition()).then(() => {
                                    success("下载完毕")
                                    install(latestVersion)
                                }).catch((e: any) => {
                                    failed("下载失败")
                                }).finally(() => {
                                    setTimeout(() => setDownloading(false), 100)
                                })
                            }}
                        >
                            <Button
                                type={"primary"} disabled={isLatest || loading || latestLoading}
                            >
                                一键下载最新版 Yakit
                            </Button>
                        </Popconfirm>
                        <Button type={"link"} onClick={() => {
                            install(latestVersion)
                        }}>我已经下载，点此安装</Button>

                    </Space>
                    <div style={{width: "100%", textAlign: "right"}}>
                        <Button type="link" danger={true} onClick={() => {
                            ipcRenderer.invoke("install-yakit", latestVersion).then(() => {
                            }).catch((err: any) => {
                            })
                        }}>
                            删除安装包
                        </Button>
                    </div>
                </div>
            </Spin>
            {downloadProgress && <Progress percent={
                downloading ? Math.floor((downloadProgress?.percent || 0) * 100) : 100
            }/>}
            {downloadProgress && downloading && <Space>
                <Tag>剩余时间:{downloadProgress?.time.remaining}</Tag>
                <Tag>已下载用时:{downloadProgress?.time.elapsed}</Tag>
                <Tag>
                    下载速度:约{((downloadProgress?.speed || 0) / 1000000).toFixed(2)}M/s
                </Tag>
            </Space>}
        </Space>
    </Card>
};