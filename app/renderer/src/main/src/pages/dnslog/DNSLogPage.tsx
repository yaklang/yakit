import React, {useEffect, useRef, useState} from "react"
import {Select, Form, Space, Divider, Row, Col} from "antd"
import {useCreation, useDebounceFn, useGetState, useMemoizedFn} from "ahooks"
import {failed, warn} from "../../utils/notification"
import {formatTimestamp} from "../../utils/timeUtil"
import {getReleaseEditionName} from "@/utils/envfile"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {SelectOptionProps} from "@/pages/fuzzer/HTTPFuzzerPage"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakScript} from "@/pages/invoker/schema"
import {queryYakScriptList} from "@/pages/yakitStore/network"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {ReloadOutlined} from "@ant-design/icons"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {DnslogMenuToPage} from "../layout/publicMenu/MenuDNSLog"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {YakitCard} from "@/components/yakitUI/YakitCard/YakitCard"
import styles from "./DNSLogPage.module.scss"
import {Uint8ArrayToString} from "@/utils/str"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import useGetSetState from "../pluginHub/hooks/useGetSetState"
import { useI18nNamespaces } from "@/i18n/useI18nNamespaces"
export interface DNSLogPageProp {}

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
    RawStr: string // 前端展示
    Timestamp: number
    Index?: number
}

const {Option} = Select

export interface SendMenuDnslogProps {
    dnsLogType: "builtIn" | "custom"
    token: string
    domain: string
    onlyARecord: boolean
    DNSMode?: string
    UseLocal?: boolean
}

export const DNS_LOG_PAGE_UPDATE_TOKEN = "DNS_LOG_PAGE_UPDATE_TOKEN"
export const DNS_LOG_COMMON_CACHE = "DNS_LOG_COMMON_CACHE"

export const DNSLogPage: React.FC<DNSLogPageProp> = (props) => {
    const [token, setToken, getToken] = useGetState("")
    const [domain, setDomain, getDomain] = useGetState("")
    const [records, setRecords, getRecords] = useGetState<DNSLogEvent[]>([])
    const [loading, setLoading] = useState(false)
    const [btnLoading, setBtnLoading] = useState(false)
    const [onlyARecord, setOnlyARecord, getOnlyARecord] = useGetSetState(false)
    const [autoQuery, setAutoQuery] = useState(false)
    const [isLocal, setIsLocal, getIsLocal] = useGetState(true)
    const [expandRows, setExpandRows] = useState<string[]>([])
    const [dnsLogType, setDnsLogType, getDnsLogType] = useGetState<"builtIn" | "custom">("builtIn")
    const [selectedMode, setSelectedMode, getSelectedMode] = useGetState<string>() // 在组件状态中保存选中的值
    const DNS_LOG_PAGE_UPDATE_TOKEN_CACHE = "DNS_LOG_PAGE_UPDATE_TOKEN_CACHE"
    const DNS_LOG_PAGE_UPDATE_TOKEN_SCRIPT_CACHE = "DNS_LOG_PAGE_UPDATE_TOKEN_SCRIPT_CACHE"
    const openDetails = useRef<DNSLogEvent>()
    const clearTimestamp = useRef<number>(0)
    const {t, i18n} = useI18nNamespaces(["yakitUi"])
    

    useEffect(() => {
        // 初始化-查看菜单是否开启dnslog并请求获取参数fDNS_LOG_PAGE_UPDATE_TOKEN_SCRIPT_CACHE
        ipcRenderer.invoke("dnslog-page-to-menu")
        // 获取菜单发送的配置参数
        ipcRenderer.on("dnslog-menu-to-page-callback", (e, data: DnslogMenuToPage) => {
            if (data.isReset) {
                // 重置
                reset()
            } else {
                setOnlyARecord(data.onlyARecord)
                if (getToken() !== data.token || getDomain() !== data.domain) {
                    setToken(data.token || "")
                    setDomain(data.domain || "")
                    setDnsLogType("builtIn")
                    setSelectedMode(data.dnsMode)
                    setIsLocal(data.useLocal)
                    queryDNSLogByToken()
                }
            }
        })
        // 查看单条数据的详情
        ipcRenderer.on("dnslog-info-details-callback", (e, info: DNSLogEvent) => {
            openDetails.current = info
            if (getRecords().length > 0) {
                openDetailsItem()
            } else {
                if (token) {
                    dnsLogType === "builtIn" ? queryDNSLogByToken() : queryDNSLogTokenByScript()
                }
            }
        })

        return () => {
            ipcRenderer.removeAllListeners("dnslog-menu-to-page-callback")
        }
    }, [])

    // 重置
    const reset = useMemoizedFn(() => {
        setToken("")
        setDomain("")
        setSelectCurDns(undefined)
        setRecords([])
        setLoading(false)
        setBtnLoading(false)
        setDnsLogType("builtIn")
        setExpandRows([])
    })

    // 打开单条数据
    const openDetailsItem = useMemoizedFn(() => {
        if (openDetails.current) {
            for (let item of getRecords()) {
                if (
                    item.RemoteAddr === openDetails.current.RemoteAddr &&
                    item.Timestamp === openDetails.current.Timestamp
                ) {
                    setExpandRows(item.Index !== undefined ? [`${item.Index}`] : [])
                    break
                }
            }
            openDetails.current = undefined
        }
    })

    // 同步给菜单里dnslog新的参数
    const sendMenuDnslog = useMemoizedFn((data: SendMenuDnslogProps) => {
        ipcRenderer.invoke("dnslog-page-change-menu", data)
    })

    const updateToken = useMemoizedFn(() => {
        setBtnLoading(true)
        setLoading(true)
        const DNSMode = selectedMode || ""
        const UseLocal = selectedMode === "内置" ? false : isLocal

        ipcRenderer
            .invoke("RequireDNSLogDomain", {
                Addr: "",
                DNSMode,
                UseLocal
            })
            .then((rsp: {Domain: string; Token: string}) => {
                setToken(rsp.Token)
                setDomain(rsp.Domain)
                sendMenuDnslog({
                    dnsLogType: getDnsLogType(),
                    token: rsp.Token,
                    domain: rsp.Domain,
                    onlyARecord: getOnlyARecord(),
                    DNSMode,
                    UseLocal
                })
            })
            .catch((e) => {
                failed(`error: ${e}`)
                setToken("")
                setDomain("")
            })
            .finally(() => {
                // 用于 MenuDNSLog 生成域名时读取此处数据
                setRemoteValue(
                    DNS_LOG_PAGE_UPDATE_TOKEN,
                    JSON.stringify({
                        type: "builtIn",
                        Addr: "",
                        DNSMode,
                        UseLocal: DNSMode === "内置" ? false : UseLocal
                    })
                )
                // 用于缓存历史勾选项
                setRemoteValue(
                    DNS_LOG_PAGE_UPDATE_TOKEN_CACHE,
                    JSON.stringify({DNSMode: selectedMode || "", UseLocal: isLocal})
                )
                setTimeout(() => {
                    setBtnLoading(false)
                    setLoading(false)
                }, 300)
            })
    })

    const queryDNSLogByToken = (loading = true) => {
        loading && setLoading(true)

        ipcRenderer
            .invoke("QueryDNSLogByToken", {
                Token: getToken(),
                DNSMode: getSelectedMode() || "",
                UseLocal: getSelectedMode() === "内置" ? false : getIsLocal()
            })
            .then((rsp: {Events: DNSLogEvent[]}) => {
                const clearTime = clearTimestamp.current
                setRecords(
                    rsp.Events.filter((i) => {
                        // 筛选时间戳之后的记录
                        if (clearTime > 0 && +i.Timestamp <= clearTime) {
                            return false
                        }
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
            .finally(() => {
                setLoading(false)
                if (openDetails.current) openDetailsItem()
            })
    }

    const tokenDomain = `${domain}`

    const [platforms, setPlatforms] = useState<string[]>([])

    const querySupportedDnsLogPlatforms = () => {
        // 调用后端API获取支持的平台
        ipcRenderer
            .invoke("QuerySupportedDnsLogPlatforms", {})
            .then((rsp) => {
                if (rsp && rsp.Platforms) {
                    let newArr: string[] = ["内置", ...rsp.Platforms]
                    setPlatforms(newArr)
                    getRemoteValue(DNS_LOG_PAGE_UPDATE_TOKEN_CACHE).then((data) => {
                        if (!data) {
                            setSelectedMode(newArr[0])
                            sendMenuDnslog({
                                dnsLogType,
                                token,
                                domain,
                                onlyARecord,
                                DNSMode: newArr[0],
                                UseLocal: false
                            })
                        } else {
                            const obj = JSON.parse(data)
                            const {DNSMode, UseLocal} = obj
                            setSelectedMode(DNSMode)
                            const local = DNSMode === "内置" ? false : UseLocal
                            setIsLocal(local)
                            sendMenuDnslog({
                                dnsLogType,
                                token,
                                domain,
                                onlyARecord,
                                DNSMode: DNSMode,
                                UseLocal: local
                            })
                        }
                    })
                }
            })
            .catch((err) => {
                failed(err)
            })
    }

    // 您可以在组件加载时调用此函数
    useEffect(() => {
        querySupportedDnsLogPlatforms()
    }, [])
    const [params, setParams] = useState<string>()
    const [scriptNamesList, setScriptNamesList] = useState<SelectOptionProps[]>([]) // 代理代表
    useEffect(() => {
        queryYakScriptList(
            "yak",
            (i: YakScript[], total) => {
                if (!total || total == 0) {
                    return
                }
                const scriptNames = i.map((item) => ({label: item.ScriptName, value: item.ScriptName}))
                setScriptNamesList(scriptNames)
                getRemoteValue(DNS_LOG_PAGE_UPDATE_TOKEN_SCRIPT_CACHE).then((data) => {
                    if (!data) {
                        setParams(i[0].ScriptName)
                    } else {
                        const obj = JSON.parse(data)
                        const {ScriptName} = obj
                        setParams(ScriptName)
                    }
                })
            },
            undefined,
            10,
            undefined,
            undefined,
            undefined,
            undefined,
            ["custom-dnslog-platform"]
        )
    }, [])

    useEffect(() => {
        getRemoteValue(DNS_LOG_COMMON_CACHE).then((data) => {
            if (!data) return
            else {
                try {
                    let obj = JSON.parse(data)
                    setAutoQuery(obj.autoQuery)
                } catch (error) {}
            }
        })
    }, [])

    const updateTokenByScript = useMemoizedFn(() => {
        setLoading(true)
        setBtnLoading(true)
        ipcRenderer
            .invoke("RequireDNSLogDomainByScript", {ScriptName: params || ""})
            .then((rsp: {Domain: string; Token: string}) => {
                setToken(rsp.Token)
                setDomain(rsp.Domain)
                sendMenuDnslog({
                    dnsLogType: getDnsLogType(),
                    token: rsp.Token,
                    domain: rsp.Domain,
                    onlyARecord: getOnlyARecord()
                })
            })
            .catch((e) => {
                failed(`error: ${e}`)
                setToken("")
                setDomain("")
            })
            .finally(() => {
                if (params && params?.length > 0) {
                    // 用于 MenuDNSLog 生成域名时读取此处数据
                    setRemoteValue(DNS_LOG_PAGE_UPDATE_TOKEN, JSON.stringify({type: "custom", ScriptName: params}))
                    // 用于缓存历史勾选项
                    setRemoteValue(DNS_LOG_PAGE_UPDATE_TOKEN_SCRIPT_CACHE, JSON.stringify({ScriptName: params}))
                }
                setTimeout(() => {
                    setLoading(false)
                    setBtnLoading(false)
                }, 300)
            })
    })

    const queryDNSLogTokenByScript = (loading = true) => {
        loading && setLoading(true)
        ipcRenderer
            .invoke("QueryDNSLogTokenByScript", {Token: token, ScriptName: params || ""})
            .then((rsp: {Events: DNSLogEvent[]}) => {
                const clearTime = clearTimestamp.current
                setRecords(
                    rsp.Events.filter((i) => {
                        // 筛选时间戳之后的记录
                        if (clearTime > 0 && +i.Timestamp <= clearTime) {
                            return false
                        }
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
            .finally(() => {
                setLoading(false)
            })
    }

    useEffect(() => {
        if (!token || !autoQuery) {
            return
        }
        setRecords([])
        setSelectCurDns(undefined)
        dnsLogType === "builtIn" ? queryDNSLogByToken() : queryDNSLogTokenByScript()
        const id = setInterval(() => {
            dnsLogType === "builtIn" ? queryDNSLogByToken(false) : queryDNSLogTokenByScript(false)
        }, 5000)

        return () => {
            clearInterval(id)
        }
    }, [token, autoQuery])

    const [selectCurDnss, setSelectCurDns] = useState<DNSLogEvent>()
    const onSetCurrentRow = useDebounceFn(
        (rowDate: DNSLogEvent | undefined) => {
            setSelectCurDns(rowDate ? {...rowDate, RawStr: Uint8ArrayToString(rowDate.Raw)} : undefined)
        },
        {wait: 200, leading: true}
    ).run

    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "50%",
            secondRatio: "50%"
        }
        if (!selectCurDnss) {
            p.firstRatio = "100%"
            p.secondRatio = "0%"
        }
        return {
            ...p,
            secondNodeStyle: {
                display: !selectCurDnss ? "none" : "",
                padding: !selectCurDnss ? 0 : undefined
            },
            lineStyle: {display: !selectCurDnss ? "none" : ""}
        }
    }, [selectCurDnss])

    const manuallyRefresh = useMemoizedFn(() => {
        if (token.length === 0) {
            warn("请先生成可用域名")
            return
        }
        dnsLogType === "builtIn" ? queryDNSLogByToken() : queryDNSLogTokenByScript()
    })

    const onClickClear = useMemoizedFn(() => {
        setSelectCurDns(undefined)
        const currentTimestamp = Math.floor(Date.now() / 1000)
        clearTimestamp.current = currentTimestamp
        setRecords((pre) => pre.filter(({Timestamp}) => +Timestamp > currentTimestamp))
    })

    return (
        <YakitResizeBox
            isVer={true}
            firstNode={
                <YakitCard
                    className={styles["DNSLogPage-card"]}
                    headStyle={{
                        height: 100,
                        minHeight: 100,
                        boxSizing: "content-box"
                    }}
                    bodyStyle={{padding: 0, width: "100%", height: "calc(100% - 100px)"}}
                    title={
                        <div className={styles["DNSLogPage-card-title"]}>
                            <Space>
                                <div style={{color: "var(--Colors-Use-Neutral-Text-1-Title)"}}>DNSLog</div>
                                <div style={{color: "var(--Colors-Use-Neutral-Text-3-Secondary)"}}>
                                    使用 {getReleaseEditionName()} 自带的 DNSLog 反连服务
                                </div>
                            </Space>
                            <div
                                style={{
                                    display: "flex",
                                    gap: 16,
                                    paddingTop: 12,
                                    borderRadius: 4
                                }}
                            >
                                <YakitRadioButtons
                                    value={dnsLogType}
                                    onChange={(e) => {
                                        setToken("")
                                        setDomain("")
                                        setDnsLogType(e.target.value)
                                    }}
                                    buttonStyle='solid'
                                    options={[
                                        {
                                            value: "builtIn",
                                            label: "内置"
                                        },
                                        {
                                            value: "custom",
                                            label: "自定义"
                                        }
                                    ]}
                                />
                                {dnsLogType === "builtIn" && (
                                    <Form
                                        onSubmitCapture={(e) => {
                                            e.preventDefault()
                                            updateToken()
                                        }}
                                        layout='inline'
                                        size={"small"}
                                    >
                                        <Form.Item label={<span>内置DNSLog</span>}>
                                            <YakitSelect
                                                showSearch
                                                placeholder='请选择...'
                                                optionFilterProp='children'
                                                value={selectedMode}
                                                onChange={(value) => {
                                                    setToken("")
                                                    setSelectedMode(value)
                                                }} // 保存选中的值
                                                style={{width: 240}}
                                                size='small'
                                            >
                                                {platforms.map((item, index) => (
                                                    <YakitSelect.Option key={index} value={item}>
                                                        {item}
                                                    </YakitSelect.Option>
                                                ))}
                                            </YakitSelect>
                                        </Form.Item>
                                        {selectedMode !== "内置" && (
                                            <Form.Item
                                                style={{
                                                    marginBottom: 0,
                                                    marginRight: 10 // 添加右侧间隔isLocal
                                                }}
                                                label={"使用本地"}
                                            >
                                                <YakitSwitch checked={isLocal} onChange={setIsLocal} />
                                            </Form.Item>
                                        )}
                                        <Divider
                                            style={{top: 6, margin: "0px 16px 0px 0px", height: "1em"}}
                                            type={"vertical"}
                                        />
                                        <Form.Item colon={false} style={{height: 24}}>
                                            <YakitButton type='primary' htmlType='submit' loading={btnLoading}>
                                                生成一个可用域名
                                            </YakitButton>
                                        </Form.Item>
                                    </Form>
                                )}
                                {dnsLogType === "custom" && (
                                    <Form
                                        layout='inline'
                                        onSubmitCapture={(e) => {
                                            e.preventDefault()
                                            updateTokenByScript()
                                        }}
                                        size={"small"}
                                    >
                                        <Form.Item label={<span>DNSLog插件</span>}>
                                            <YakitSelect
                                                showSearch
                                                options={scriptNamesList}
                                                placeholder='请选择...'
                                                size='small'
                                                value={params}
                                                onChange={(ScriptNames) => {
                                                    setParams(ScriptNames)
                                                }}
                                                maxTagCount={10}
                                                style={{width: 240}}
                                            />
                                        </Form.Item>
                                        <Divider
                                            style={{top: 6, margin: "0px 16px 0px 0px", height: "1em"}}
                                            type={"vertical"}
                                        />
                                        <Form.Item colon={false} style={{height: 24}}>
                                            <YakitButton type='primary' htmlType='submit' loading={btnLoading}>
                                                生成一个可用域名
                                            </YakitButton>
                                        </Form.Item>
                                    </Form>
                                )}
                            </div>
                            {token !== "" && (
                                <Row style={{marginTop: 5}} align='bottom'>
                                    <Col style={{fontSize: 12, color: "var(--Colors-Use-Neutral-Text-1-Title)"}}>
                                        当前激活域名为：
                                    </Col>
                                    <Col>
                                        <YakitTag enableCopy={true} color='blue' copyText={tokenDomain}></YakitTag>
                                    </Col>
                                </Row>
                            )}
                        </div>
                    }
                >
                    <div className={styles["DNSLogPage-card-body"]}>
                        <TableVirtualResize<DNSLogEvent>
                            isRefresh={loading}
                            renderTitle={
                                <div className={styles["DNSLogPage-table-title"]}>
                                    <Form size={"small"} layout='inline'>
                                        <Form.Item
                                            style={{
                                                marginBottom: 0,
                                                marginRight: 10 // 添加右侧间隔
                                            }}
                                            label={"只看A记录"}
                                        >
                                            <YakitSwitch
                                                checked={onlyARecord}
                                                onChange={(flag) => {
                                                    setOnlyARecord(flag)
                                                    sendMenuDnslog({
                                                        dnsLogType,
                                                        token,
                                                        domain,
                                                        onlyARecord: flag
                                                    })
                                                    if (flag) {
                                                        setRecords((prev) => {
                                                            return prev
                                                                .filter((i) => i.DNSType === "A")
                                                                .map((i, index) => {
                                                                    return {...i, Index: index}
                                                                })
                                                                .reverse()
                                                        })
                                                    } else {
                                                        setTimeout(() => {
                                                            manuallyRefresh()
                                                        }, 100)
                                                    }
                                                }}
                                            />
                                        </Form.Item>
                                        <Form.Item
                                            style={{
                                                marginBottom: 0,
                                                marginRight: 10 // 添加右侧间隔
                                            }}
                                            label={"自动刷新记录"}
                                        >
                                            <YakitSwitch
                                                checked={autoQuery}
                                                onChange={(val) => {
                                                    setAutoQuery(val)
                                                    setRemoteValue(
                                                        DNS_LOG_COMMON_CACHE,
                                                        JSON.stringify({autoQuery: val})
                                                    )
                                                }}
                                            />
                                        </Form.Item>
                                    </Form>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <YakitButton
                                            type='outline1'
                                            onClick={onClickClear}
                                            danger
                                            disabled={!records.length}
                                        >
                                            {t("YakitButton.reset")}
                                        </YakitButton>
                                        <YakitButton
                                            size={"small"}
                                            type={"text"}
                                            onClick={manuallyRefresh}
                                            icon={<ReloadOutlined style={{position: "relative", top: 2}} />}
                                        />
                                    </div>
                                </div>
                            }
                            renderKey='Index'
                            data={records}
                            pagination={{
                                total: records.length,
                                limit: 1,
                                page: 20,
                                onChange: () => {}
                            }}
                            loading={loading}
                            columns={[
                                {title: "域名", dataKey: "Domain"},
                                {title: "类型", dataKey: "DNSType"},
                                {title: "远端IP", dataKey: "RemoteIP"},
                                {
                                    title: "Timestamp",
                                    dataKey: "Timestamp",
                                    render: (i: number) => {
                                        return <YakitTag color={"blue"}>{formatTimestamp(i)}</YakitTag>
                                    }
                                }
                            ]}
                            onSetCurrentRow={onSetCurrentRow}
                        />
                    </div>
                </YakitCard>
            }
            secondNode={<>{selectCurDnss && <YakitEditor readOnly={true} value={selectCurDnss.RawStr} />}</>}
            firstMinSize={80}
            secondMinSize={200}
            lineDirection='top'
            {...ResizeBoxProps}
        ></YakitResizeBox>
    )
}
