import React, {useEffect, useState} from "react";
import {AutoCard} from "../../components/AutoCard";
import {Alert, Button, Divider, Form, Space, Spin, Table, Tag} from "antd";
import {CopyableField, InputInteger} from "../../utils/inputUtil";
import {useDebounce, useMemoizedFn} from "ahooks";
import {formatTimestamp} from "../../utils/timeUtil";
import {success} from "../../utils/notification";
import {ReloadOutlined} from "@ant-design/icons";

export interface ICMPSizeLoggerPageProp {

}

const {ipcRenderer} = window.require("electron");

interface ICMPSizeLoggerInfo {
    Size: number
    CurrentRemoteAddr: string
    Histories: string[]
    CurrentRemoteCachedConnectionCount: number
    SizedCachedHistoryConnectionCount: number
    TriggerTimestamp: number
    Timestamp: number
    Hash: string
}

export const ICMPSizeLoggerPage: React.FC<ICMPSizeLoggerPageProp> = (props) => {
    const [size, setSize] = useState<number>(0);
    const [records, setRecords] = useState<ICMPSizeLoggerInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [host, setHost] = useState("");

    const sizeNow = useDebounce(size, {maxWait: 500});

    const update = useMemoizedFn(() => {
        ipcRenderer.invoke("QueryICMPTrigger", {
            Length: sizeNow,
        }).then((data: { Notification?: ICMPSizeLoggerInfo[] }) => {
            if (data?.Notification) {
                setRecords(data.Notification)
            }
        }).catch(e => {
            setRecords([])
        })
    })

    const refreshSize = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer.invoke("RequireICMPRandomLength", {}).then((d: { Length: number } | any) => {
            setSize(d.Length)
            setRecords([])
        }).catch(() => {
        }).finally(() => {
            setTimeout(() => setLoading(false), 100)
        })
    })

    useEffect(() => {
        if (sizeNow < 100) {
            refreshSize()
            return
        }

        update()
        let id = setInterval(update, 4000)
        return () => {
            clearInterval(id)
        }
    }, [sizeNow])

    return <AutoCard title={<Space>
        ICMP Size Logger
        <div style={{color: "#999", fontSize: 12}}>
            使用 ping 携带特定长度数据包判定 ICMP 反连
        </div>
        <Divider type={"vertical"}/>
        <Form onSubmitCapture={e => {
            e.preventDefault()

            setLoading(true)
            ipcRenderer.invoke("RequireICMPRandomLength", {}).then((d: { Length: number, ExternalHost: string } | any) => {
                setSize(d.Length)
                setHost(d.ExternalHost)
                setRecords([])
            }).finally(() => {
                setTimeout(() => setLoading(false), 300)
            })
        }} layout={"inline"} size={"small"}>
            <InputInteger
                disable={true}
                label={"设置 Ping 包大小"}
                setValue={setSize}
                value={size}
            />
            <Form.Item colon={false} label={" "}>
                <Space>
                    <Button disabled={loading} type="primary" htmlType="submit"> 随机生成可用长度 </Button>
                    <Button disabled={loading} type="link" onClick={() => {
                        update()
                    }} icon={<ReloadOutlined/>}> 刷新 </Button>
                </Space>
            </Form.Item>
        </Form>
    </Space>} bordered={false}>
        <Space style={{width: "100%"}} direction={"vertical"}>
            <Alert type={"success"} message={<Space direction={"vertical"} style={{width: "100%"}}>
                <h4>ICMP Size Logger 是一个通过 Ping 包大小来判断 ICMP 反连的 ICMP 记录器</h4>
                <Space>
                    <div>在 Windows 系统中，使用</div>
                    {host === "" || sizeNow <= 0 ? <Spin/> :
                        <CopyableField mark={true} text={`ping -l ${sizeNow} ${host}`}/>}
                    <div>命令</div>
                </Space>
                <Space>
                    <div>在 MacOS/Linux/*nix 系统中，使用</div>
                    {host === "" || sizeNow <= 0 ? <Spin/> :
                        <CopyableField mark={true} text={`ping -c 4 -s ${sizeNow} ${host}`}/>}
                    <div>命令</div>
                </Space>
            </Space>}>

            </Alert>
            <Table<ICMPSizeLoggerInfo>
                size={"small"}
                dataSource={records}
                rowKey={i => `${i.CurrentRemoteAddr}`}
                pagination={false}
                columns={[
                    {title: "ICMP/Ping 长度", render: (i: ICMPSizeLoggerInfo) => <Tag color={"geekblue"}>{sizeNow}</Tag>},
                    {title: "远端IP", dataIndex: "CurrentRemoteAddr"},
                    {
                        title: "触发时间",
                        render: (i: ICMPSizeLoggerInfo) => <Tag
                            color={"geekblue"}>{formatTimestamp(i.TriggerTimestamp)}</Tag>
                    },
                ]}
            >

            </Table>
        </Space>
    </AutoCard>
};