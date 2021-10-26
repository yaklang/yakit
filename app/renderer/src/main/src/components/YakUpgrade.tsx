import React, {useEffect, useState} from "react";
import {Alert, Button, Card, Popconfirm, Space, Spin, Tag} from "antd";
import {failed, success} from "../utils/notification";

const {ipcRenderer} = window.require("electron");

export interface YakUpgradeProp {

}

export const YakUpgrade: React.FC<YakUpgradeProp> = (props) => {
    const [currentVersion, setCurrentVersion] = useState("")
    const [loading, setLoading] = useState(false);
    const [latestLoading, setLatestLoading] = useState(false);
    const [latestVersion, setLatestVersion] = useState("");

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
            failed(`${e}`)
        }).finally(
            () => setTimeout(() => setLoading(false), 300)
        )
    }


    useEffect(() => {
        updateCurrent()
        queryLatestVersion()
    }, [])

    const isLatest = currentVersion === latestVersion;
    console.info(currentVersion, latestVersion, latestVersion === currentVersion)
    const color = isLatest ? "green" : "red";
    return <Card
        size={"small"}
    >
        <Space direction={"vertical"} style={{width: "100%"}}>
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
            <Popconfirm
                visible={(isLatest || loading || latestLoading) ? false : undefined}
                title={`确定要更新版本: ${latestVersion}`}
                onConfirm={e => {
                    ipcRenderer.invoke("download-latest-yak", latestVersion).then(() => {
                        success("下载完毕")
                    }).catch(e => {
                        failed("下载失败")
                    })
                }}
            >
                <Button
                    type={"primary"} disabled={isLatest || loading || latestLoading}
                >
                    一键更新 Yak 引擎
                </Button>
            </Popconfirm>
        </Space>
    </Card>
};