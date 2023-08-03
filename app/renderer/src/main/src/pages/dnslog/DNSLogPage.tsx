import React, {useEffect, useState} from "react"
import {AutoCard} from "../../components/AutoCard"
import {Alert, Button, Select, Form, Space, Table, Tag, Spin} from "antd"
import {useGetState, useMemoizedFn} from "ahooks"
import {failed, info, yakitFailed} from "../../utils/notification"
import {CopyableField, SwitchItem} from "../../utils/inputUtil"
import {formatTimestamp} from "../../utils/timeUtil"
import {YakEditor} from "../../utils/editors"
import {getReleaseEditionName, isEnpriTraceAgent} from "@/utils/envfile";
import {SelectItem} from "@/utils/SelectItem";
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect";
import {ProjectDescription} from "@/pages/softwareSettings/ProjectManage";
import {SelectOptionProps} from "@/pages/fuzzer/HTTPFuzzerPage";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {QueryYakScriptsResponse, YakScript} from "@/pages/invoker/schema";
import {queryYakScriptList} from "@/pages/yakitStore/network";
import {CodecType} from "@/utils/encodec";

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
    const [autoQuery, setAutoQuery] = useState(false);
    const [isLocal, setIsLocal] = useState(false);
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
            .invoke("RequireDNSLogDomain", {Addr: "", DNSMode: selectedMode, UseLocal: isLocal})
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

    const queryDNSLogByToken = () => {
        console.log("QueryDNSLogByToken ", token, selectedMode);
        ipcRenderer.invoke("QueryDNSLogByToken", {Token: token, DNSMode: selectedMode, UseLocal: isLocal}).then((rsp: {
            Events: DNSLogEvent[]
        }) => {
            setRecords(
                rsp.Events.filter((i) => {
                    if (getOnlyARecord()) {
                        return i.DNSType === "A";
                    }
                    return true;
                })
                    .map((i, index) => {
                        return {...i, Index: index};
                    })
                    .reverse()
            );
        });
    };

    useEffect(() => {
        if (!token || !autoQuery) {
            return;
        }
        setRecords([]);

        const id = setInterval(() => {
            queryDNSLogByToken();
        }, 5000);

        return () => {
            console.log("clearInterval ", id);
            clearInterval(id);
        };
    }, [token, autoQuery]);

    const tokenDomain = `${domain}`
    const [selectLoading, setSelectLoading] = useState<boolean>(true)

    const selectDropdown = useMemoizedFn((originNode: React.ReactNode) => {
        return (
            <div>
                <Spin spinning={selectLoading}>{originNode}</Spin>
            </div>
        )
    })
    const [platforms, setPlatforms] = useState<string[]>([]);

    const querySupportedDnsLogPlatforms = () => {
        // 调用后端API获取支持的平台
        ipcRenderer.invoke("QuerySupportedDnsLogPlatforms", {}).then((rsp) => {
            if (rsp && rsp.Platforms) {
                setPlatforms(["dnstunnel.run", ...rsp.Platforms]);
            }
        }).catch((err) => {
            failed(err);
        });
    };

    // 您可以在组件加载时调用此函数
    useEffect(() => {
        querySupportedDnsLogPlatforms();
    }, []);
    const [params, setParams] = useState();
    const [scriptNamesList, setScriptNamesList] = useState<SelectOptionProps[]>([]) // 代理代表
    useEffect(() => {
        queryYakScriptList(
            "codec",
            (i: YakScript[], total) => {
                if (!total || total == 0) {
                    return
                }
                i.map((script) => {
                    script.ScriptName
                } )
            },
            undefined,
            10,
            undefined,
            undefined,
            undefined,
            undefined,
            ["allow-custom-http-packet-mutate"],
        )

    }, [])
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
                        <Form.Item colon={false} label={" "} style={
                            {
                                marginBottom: 0, display: 'flex', alignItems: 'center',
                                justifyContent: 'space-between', // 这里可以确保组件在一行上
                                flexWrap: 'nowrap'
                            }}>
                            <Select
                                showSearch
                                placeholder='生成一个可用域名'
                                optionFilterProp='children'
                                onChange={value => setSelectedMode(value)} // 保存选中的值

                            >
                                {platforms.map((item, index) => (
                                    <Option key={index} value={item}>
                                        {item}
                                    </Option>
                                ))}
                            </Select>
                            <Button type='primary' htmlType='submit'>
                                {" "}
                                生成一个可用域名{" "}
                            </Button>
                            <SwitchItem
                                formItemStyle={{
                                    marginBottom: 0,
                                    marginLeft: 10

                                }}
                                label={"Use Local"}
                                value={isLocal}
                                setValue={setIsLocal}
                            />
                        </Form.Item>
                    </Form>
                </Space>
            }
            bordered={false}
            style={{overflowY: 'auto'}}
        >
            <Space direction={"vertical"} style={{width: "100%"}}>
                <Form
                    labelCol={{span: 5}} wrapperCol={{span: 14}}
                    onSubmitCapture={e => {
                        e.preventDefault()

                        updateToken()
                    }}
                    size={"small"}
                >
                    <Form.Item
                        label={
                            <span>
                                DNSLOG插件
                            </span>
                        }
                        name='ScriptNames'

                    >
                        <YakitSelect
                            allowClear
                            options={scriptNamesList}
                            placeholder='请选择...'
                            mode='tags'
                            size='small'
                            value={"aaaaa"}
                            // onChange={ScriptNames => setParams({...params, ScriptNames})}
                            maxTagCount={10}
                        />
                    </Form.Item>
                    <Form.Item colon={false} label={" "}>
                        <YakitButton type="primary" htmlType="submit"> 执行检测 </YakitButton>
                    </Form.Item>
                </Form>
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
                    <Form size={"small"} style={{display: 'flex', alignItems: 'center'}}>
                        <SwitchItem
                            formItemStyle={{
                                marginBottom: 0,
                                marginRight: 10 // 添加右侧间隔
                            }}
                            label={"只看A记录"}
                            value={onlyARecord}
                            setValue={(flag) => {
                                setOnlyARecord(flag)
                                sendMenuDnslog({token, domain, onlyARecord: flag})
                            }}
                        />
                        <SwitchItem
                            formItemStyle={{
                                marginBottom: 0,
                                marginRight: 10 // 添加右侧间隔

                            }}
                            label={"自动刷新记录"}
                            value={autoQuery}
                            setValue={setAutoQuery}
                        />
                        <Button type='primary' onClick={queryDNSLogByToken}>刷新记录</Button> {/* 这里添加了新按钮 */}
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
