import React, {useEffect, useState} from "react";
import {AutoCard} from "../../components/AutoCard";
import {Divider, Form, Space, Table, Tag} from "antd";
import {InputInteger, InputItem} from "../../utils/inputUtil";
import {randomInt} from "crypto";
import {useDebounce, useMemoizedFn} from "ahooks";
import {formatTimestamp} from "../../utils/timeUtil";

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
    const [size, setSize] = useState<number>(123);
    const [records, setRecords] = useState<ICMPSizeLoggerInfo[]>([]);

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

    useEffect(() => {
        update()
        let id = setInterval(update, 1000)
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


        }} layout={"inline"} size={"small"}>
            <InputInteger
                label={"设置 Ping 包大小"}
                setValue={setSize}
                value={size}
            />
        </Form>
    </Space>} bordered={false}>
        <Table<ICMPSizeLoggerInfo>
            size={"small"}
            dataSource={records}
            rowKey={i => `${i.CurrentRemoteAddr}`}
            pagination={false}
            columns={[
                {title: "ICMP/Ping 长度", render: (i: ICMPSizeLoggerInfo) => <Tag color={"geekblue"}>{i.Size}</Tag>},
                {title: "远端IP", dataIndex: "CurrentRemoteAddr"},
                {title: "触发时间",
                    render: (i: ICMPSizeLoggerInfo) => <Tag
                        color={"geekblue"}>{formatTimestamp(i.TriggerTimestamp)}</Tag>
                },
            ]}
        >

        </Table>
    </AutoCard>
};