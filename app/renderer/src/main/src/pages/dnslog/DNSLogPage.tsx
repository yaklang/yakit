import React, {useEffect, useState} from "react"
import {AutoCard} from "../../components/AutoCard"
import {Alert, Button, Select, Form, Space, Table, Tag, Spin} from "antd"
import {useGetState, useMemoizedFn} from "ahooks"
import {failed} from "../../utils/notification"
import {CopyableField, SwitchItem} from "../../utils/inputUtil"
import {formatTimestamp} from "../../utils/timeUtil"
import {YakEditor} from "../../utils/editors"
import {getReleaseEditionName} from "@/utils/envfile";
import {SelectItem} from "@/utils/SelectItem";
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect";
import {ProjectDescription} from "@/pages/softwareSettings/ProjectManage";

export interface DNSLogPageProp {
}

const {ipcRenderer} = window.require("electron")

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
export interface DNSLogEvent {
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

const {Option} = Select


export const DNSLogPage: React.FC<DNSLogPageProp> = (props) => {
    const [token, setToken, getToken] = useGetState("")
    const [domain, setDomain, getDomain] = useGetState("")
    const [records, setRecords, getRecords] = useGetState<DNSLogEvent[]>([])
    const [loading, setLoading] = useState(false)
    const [onlyARecord, setOnlyARecord, getOnlyARecord] = useGetState(true)

    const [expandRows, setExpandRows] = useState<string[]>([])

    useEffect(() => {
        // 初始化-查看菜单是否开启dnslog并请求获取参数
        ipcRenderer.invoke("dnslog-page-to-menu")
        // 获取菜单发送的配置参数
        ipcRenderer.on(
            "dnslog-menu-to-page-callback",
            (e, data: { token: string; domain: string; onlyARecord: boolean }) => {
                setOnlyARecord(data.onlyARecord)
                if (getToken() !== data.token || getDomain() !== data.domain) {
                    setToken(data.token || "")
                    setDomain(data.domain || "")
                }
            }
        )
        // 查看单条数据的详情
        ipcRenderer.on("dnslog-info-details-callback", (e, info: DNSLogEvent) => {
            for (let item of getRecords()) {
                if (item.RemoteAddr === info.RemoteAddr && item.Timestamp === info.Timestamp) {
                    setExpandRows(item.Index !== undefined ? [`${item.Index}`] : [])
                    break
                }
            }
        })

        return () => {
            ipcRenderer.removeAllListeners("dnslog-menu-to-page-callback")
        }
    }, [])

    // 同步给菜单里dnslog新的参数
    const sendMenuDnslog = useMemoizedFn((data: { token: string; domain: string; onlyARecord: boolean }) => {
        ipcRenderer.invoke("dnslog-page-change-menu", data)
    })
    const [selectedMode, setSelectedMode] = useState(""); // 在组件状态中保存选中的值

    const updateToken = useMemoizedFn(() => {
        setLoading(true)
        console.log("updateToken selectedMode ", selectedMode)
        ipcRenderer
            .invoke("RequireDNSLogDomain", {Addr: "", DNSMode: selectedMode})
            .then((rsp: { Domain: string; Token: string }) => {
                setToken(rsp.Token)
                setDomain(rsp.Domain)
                sendMenuDnslog({token: rsp.Token, domain: rsp.Domain, onlyARecord: onlyARecord})
            })
            .catch((e) => {
                failed(`error: ${e}`)
                setToken("")
                setDomain("")
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        if (!token) {
            return
        }
        setRecords([])

        const id = setInterval(() => {
            console.log("QueryDNSLogByToken ", token, selectedMode)
            ipcRenderer.invoke("QueryDNSLogByToken", {Token: token, DNSMode: selectedMode}).then((rsp: {
                Events: DNSLogEvent[]
            }) => {
                setRecords(
                    rsp.Events.filter((i) => {
                        if (getOnlyARecord()) {
                            return i.DNSType === "A"
                        }
                        return true
                    })
                        .map((i, index) => {
                            return {...i, Index: index}
                        })
                        .reverse()
                )
            })
        }, 2000)
        console.log("asdf1 ", id)
        return () => {
            console.log("clearInterval ", id)
            clearInterval(id)
        }
    }, [token])

    const tokenDomain = `${domain}`
    const [selectLoading, setSelectLoading] = useState<boolean>(true)

    const selectDropdown = useMemoizedFn((originNode: React.ReactNode) => {
        return (
            <div>
                <Spin spinning={selectLoading}>{originNode}</Spin>
            </div>
        )
    })
    const [projectList, setProjectList] = useState(["dnslog.cn", "-"])

    return (
        <AutoCard
            title={
                <Space>
                    DNSLog
                    <div style={{color: "#999"}}>
                        使用 {getReleaseEditionName()} 自带的 DNSLog 反连服务
                    </div>
                    <Form
                        onSubmitCapture={(e) => {
                            e.preventDefault()

                            updateToken()
                        }}
                        layout={"inline"}
                        size={"small"}
                    >
                        <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                            <Select
                                showSearch
                                placeholder='生成一个可用域名'
                                optionFilterProp='children'
                                onChange={value => setSelectedMode(value)} // 保存选中的值

                            >
                                {projectList.map((item, index) => (
                                    <Option key={index} value={item}>
                                        {item}
                                    </Option>
                                ))}
                            </Select>
                            <Button type='primary' htmlType='submit'>
                                {" "}
                                生成一个可用域名{" "}
                            </Button>


                        </Form.Item>
                    </Form>
                </Space>
            }
            bordered={false}
            style={{overflowY: 'auto'}}
        >
            <Space direction={"vertical"} style={{width: "100%"}}>
                {token !== "" && (
                    <Alert
                        type={"success"}
                        message={
                            <div>
                                当前激活域名为 <CopyableField noCopy={false} text={tokenDomain}/>
                            </div>
                        }
                    />
                )}
                <Space>
                    <Form size={"small"}>
                        <SwitchItem
                            formItemStyle={{
                                marginBottom: 0
                            }}
                            label={"只看A记录"}
                            value={onlyARecord}
                            setValue={(flag) => {
                                setOnlyARecord(flag)
                                sendMenuDnslog({token, domain, onlyARecord: flag})
                            }}
                        />
                    </Form>
                </Space>
                <Table<DNSLogEvent>
                    size={"small"}
                    loading={loading}
                    dataSource={records}
                    rowKey={(i) => `${i.Index}`}
                    expandable={{
                        expandedRowKeys: expandRows,
                        expandRowByClick: true,
                        expandedRowRender: (i: DNSLogEvent) => {
                            return (
                                <div style={{width: "100%", height: 300}}>
                                    <AutoCard style={{padding: 0}} bodyStyle={{padding: 0}}>
                                        <YakEditor readOnly={true} valueBytes={i.Raw} bytes={true}/>
                                    </AutoCard>
                                </div>
                            )
                        },
                        onExpandedRowsChange: (rows) => setExpandRows((rows as string[]) || [])
                    }}
                    pagination={false}
                    columns={[
                        {title: "域名", dataIndex: "Domain"},
                        {title: "DNS类型", dataIndex: "DNSType"},
                        {title: "远端IP", dataIndex: "RemoteIP"},
                        {
                            title: "Timestamp",
                            render: (i: DNSLogEvent) => {
                                return <Tag color={"geekblue"}>{formatTimestamp(i.Timestamp)}</Tag>
                            }
                        }
                    ]}
                />
            </Space>
        </AutoCard>
    )
}
