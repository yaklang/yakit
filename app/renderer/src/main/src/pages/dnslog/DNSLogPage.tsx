import React, {useEffect, useState} from "react";
import {AutoCard} from "../../components/AutoCard";
import {Alert, Button, Form, Space, Table, Tag} from "antd";
import {useMemoizedFn} from "ahooks";
import {failed} from "../../utils/notification";
import {CopyableField, SwitchItem} from "../../utils/inputUtil";
import {formatDate, formatTimestamp} from "../../utils/timeUtil";
import {YakEditor} from "../../utils/editors";
import { getReleaseEditionName } from "@/utils/envfile";

export interface DNSLogPageProp {

}

const {ipcRenderer} = window.require("electron");

/*
* message DNSLogEvent {
  string DNSType = 1;
  string Token = 2;
  string Domain = 3;
  string RemoteAddr = 4;
  string RemoteIP = 5;
  int32 RemotePort = 6;
  bytes Raw = 7;
  int64 Timestamp = 8;
}
* */
interface DNSLogEvent {
    DNSType: string
    Token: string
    Domain: string
    RemoteAddr: string
    RemoteIP: string
    RemotePort: number
    Raw: Uint8Array
    Timestamp: number
    Index?: number
}

export const DNSLogPage: React.FC<DNSLogPageProp> = (props) => {
    const [token, setToken] = useState("");
    const [domain, setDomain] = useState("");
    const [records, setRecords] = useState<DNSLogEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [onlyARecord, setOnlyARecord] = useState(true);

    const updateToken = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer.invoke("RequireDNSLogDomain", {Addr: ""}).then((rsp: { Domain: string, Token: string }) => {
            setToken(rsp.Token);
            setDomain(rsp.Domain);
        }).catch(e => {
            failed(`error: ${e}`)
            setToken("")
            setDomain("")
        }).finally(() => setTimeout(() => setLoading(false), 300))
    });

    useEffect(() => {
        if (!token) {
            return
        }

        const id = setInterval(() => {
            ipcRenderer.invoke("QueryDNSLogByToken", {Token: token}).then((rsp: { Events: DNSLogEvent[] }) => {
                setRecords(rsp.Events.filter(i => {
                    if (onlyARecord) {
                        return i.DNSType === "A"
                    }
                    return true
                }).map((i, index) => {
                    return {...i, Index: index}
                }).reverse())
            })
        }, 1000)
        return () => {
            clearInterval(id)
        }
    }, [token])

    const tokenDomain = `${domain}`

    return <AutoCard title={<Space>
        DNSLog
        <div style={{color: "#999"}}>
            使用 {getReleaseEditionName()} 自带的 DNSLog 反连服务
        </div>
        <Form onSubmitCapture={e => {
            e.preventDefault()

            updateToken()
        }} layout={"inline"} size={"small"}>
            <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                <Button type="primary" htmlType="submit"> 生成一个可用域名 </Button>
            </Form.Item>
        </Form>
    </Space>} bordered={false}>
        <Space direction={"vertical"} style={{width: "100%"}}>
            {token !== "" && <Alert type={"success"} message={<div>
                当前激活域名为 <CopyableField noCopy={false} text={tokenDomain}/>
            </div>}/>}
            <Space>
                <Form size={"small"}>
                    <SwitchItem formItemStyle={{
                        marginBottom: 0,
                    }} label={"只看A记录"} value={onlyARecord} setValue={setOnlyARecord}/>
                </Form>
            </Space>
            <Table<DNSLogEvent>
                size={"small"}
                loading={loading}
                dataSource={records}
                rowKey={i => `${i.Index}`}
                expandable={{
                    expandRowByClick: true,
                    expandedRowRender: (i: DNSLogEvent) => {
                        return <div style={{width: "100%", height: 300}}>
                            <AutoCard style={{padding: 0}} bodyStyle={{padding: 0}}>
                                <YakEditor readOnly={true} valueBytes={i.Raw} bytes={true}/>
                            </AutoCard>
                        </div>
                    }
                }}
                pagination={false}
                columns={[
                    {title: "域名", dataIndex: "Domain"},
                    {title: "DNS类型", dataIndex: "DNSType"},
                    {title: "远端IP", dataIndex: "RemoteIP"},
                    {
                        title: "Timestamp", render: (i: DNSLogEvent) => {
                            return <Tag color={"geekblue"}>{formatTimestamp(i.Timestamp)}</Tag>
                        }
                    },
                ]}
            />
        </Space>
    </AutoCard>
};