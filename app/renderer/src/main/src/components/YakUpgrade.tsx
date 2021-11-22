import React, {useEffect, useState} from "react";
import {Alert, Button, Card, Modal, Popconfirm, Popover, Progress, Space, Spin, Tag, Typography} from "antd";
import {failed, success} from "../utils/notification";

const {ipcRenderer} = window.require("electron");

export interface YakUpgradeProp {
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

const {Text} = Typography;

export const YakUpgrade: React.FC<YakUpgradeProp> = (props) => {
    const [currentVersion, setCurrentVersion] = useState("")
    const [loading, setLoading] = useState(false);
    const [latestLoading, setLatestLoading] = useState(false);
    const [latestVersion, setLatestVersion] = useState("");
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<DownloadingState>();
    const [winPath, setWinPath] = useState("");
    const [platformArch, setPlatformArch] = useState("");

    const queryLatestVersion = () => {
        setLatestLoading(true)
        ipcRenderer.invoke("query-latest-yak-version").then((data: string) => {
            setLatestVersion(data)
        }).catch(e => {
            failed(`${e}`)
        }).finally(
            () => setTimeout(() => setLatestLoading(false), 300)
        )
    }

    const updateCurrent = () => {
        setLoading(true)
        ipcRenderer.invoke("get-current-yak").then((data: string) => {
            setCurrentVersion(data)
        }).catch(e => {
            setCurrentVersion("")
            failed(<>
                获取 Yak 引擎当前版本失败，请按提示安装即可<Popover content={`${e}`}>
                <Button size={"small"} type={"link"}>错误详情</Button>
            </Popover>
            </>)
        }).finally(
            () => setTimeout(() => setLoading(false), 300)
        )
    }

    useEffect(() => {
        ipcRenderer.invoke("get-platform-and-arch").then((e: string) => {
            setPlatformArch(e)
        })

        ipcRenderer.on("download-yak-engine-progress", async (e: any, state: DownloadingState) => {
            setDownloadProgress(state);
        })
        return () => {
            ipcRenderer.removeAllListeners("download-yak-engine-progress")
        }
    }, [])


    useEffect(() => {
        updateCurrent()
        queryLatestVersion()

        ipcRenderer.invoke("get-windows-install-dir").then(setWinPath).catch(() => {
        }).finally()
    }, [])

    const install = (version: string) => {
        Modal.confirm({
            title: "Yak 核心引擎下载完毕，将会自动更新到系统目录",
            width: "40%",
            content: <>
                <Space direction={"vertical"}>
                    {(platformArch.startsWith("darwin-") || platformArch === "") &&
                    <Tag color={"purple"}>*nix 系统下会安装在 /usr/local/bin/yak </Tag>}
                    {platformArch.startsWith("darwin-arm64") &&
                    <Space direction={"vertical"}>
                        <Tag color={"purple"}>macOS m1(pro/max) 用户需要检查 Rosetta 2 环境，如需要手动安装，如下：</Tag>
                        <Text mark={false} code={true} copyable={true}>softwareupdate --install-rosetta</Text>
                    </Space>
                    }
                    {platformArch.startsWith("win") && <Tag color={""}>windows 系统下会安装在 {winPath} </Tag>}
                    <p/>
                    <Tag>选择 Ok 允许 Yakit 操作</Tag>
                    <Tag>选择 Cancel 用户可以手动更新 %PATH%</Tag>
                </Space>
            </>,
            onOk: () => {
                ipcRenderer.invoke("install-yak-engine", latestVersion).then(() => {
                    success("安装成功，如未生效，重启 Yakit 即可")
                }).catch(err => {
                    failed("安装失败")
                }).finally(updateCurrent)
            }

        })
    }

    const isLatest = currentVersion === latestVersion;
    const color = isLatest ? "green" : "red";
    return <Card
        size={"small"} bodyStyle={{padding: 0}} bordered={false}
    >
        <Space direction={"vertical"} style={{width: "100%"}}>
            {platformArch === "darwin-arm64" && <Alert
                type={"error"}
                message={<>
                    当前系统为({platformArch})，如果未安装 Rosetta 2, 无法运行 Yak 核心引擎
                    <br/>
                    <br/>
                    <div>运行以下命令可手动安装 Rosetta，如已安装可忽略</div>
                    <Text mark={false} code={true} copyable={true}>softwareupdate --install-rosetta</Text>
                </>}
            />}
            <Spin spinning={loading}>
                <Alert message={<Space>
                    当前本地安装的 Yak 核心引擎版本为:
                    <Tag
                        color={color}
                    >{currentVersion}</Tag>
                    {isLatest ? <Tag color={"green"}>已是最新</Tag> : <Tag
                        color={"red"}
                    >Yak 引擎需要更新</Tag>}
                </Space>}/>
            </Spin>
            <Spin spinning={loading}>
                <Alert
                    type={"success"}
                    message={<Space>
                        当前最新的 Yak 引擎版本为
                        <Tag color={"green"}>{latestVersion}</Tag>
                    </Space>}/>
            </Spin>
            <Spin spinning={downloading}>
                <Space>
                    <Popconfirm
                        visible={(isLatest || loading || latestLoading) ? false : undefined}
                        title={`确定要更新版本: ${latestVersion}`}
                        onConfirm={e => {
                            setDownloading(true)
                            ipcRenderer.invoke("download-latest-yak", latestVersion).then(() => {
                                success("下载完毕")
                                install(latestVersion)
                            }).catch(e => {
                                failed("下载失败")
                            }).finally(() => {
                                setTimeout(() => setDownloading(false), 100)
                            })
                        }}
                    >
                        <Button
                            type={"primary"} disabled={isLatest || loading || latestLoading}
                        >
                            一键更新 Yak 引擎
                        </Button>
                    </Popconfirm>
                    <Button type={"link"} onClick={() => {
                        install(latestVersion)
                    }}>我已经下载，点此安装</Button>
                </Space>
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