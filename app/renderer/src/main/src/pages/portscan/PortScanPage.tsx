import React, {useEffect, useRef, useState} from "react"
import {Button, Checkbox, Col, Divider, Form, Input, InputNumber, Row, Space, Spin, Tabs, Tag, Tooltip} from "antd"
import {InputInteger, InputItem, ManyMultiSelectForString, SelectOne, SwitchItem} from "../../utils/inputUtil"
import {randomString} from "../../utils/randomUtil"
import {ExecResult, YakScript} from "../invoker/schema"
import {failed, info, success} from "../../utils/notification"
import {writeExecResultXTerm, xtermClear} from "../../utils/xtermUtils"
import {OpenPortTableViewer} from "./PortTable"
import {ExtractExecResultMessageToYakitPort, YakitPort} from "../../components/yakitLogSchema"
import {PortAssetTable} from "../assetViewer/PortAssetPage"
import {PortAsset} from "../assetViewer/models"
import {PresetPorts} from "./schema"
import {useGetState, useMemoizedFn} from "ahooks"
import {queryYakScriptList} from "../yakitStore/network"
import {PluginList} from "../../components/PluginList"
import {showDrawer, showModal} from "../../utils/showModal"
import {PluginResultUI} from "../yakitStore/viewers/base"
import useHoldingIPCRStream from "../../hook/useHoldingIPCRStream"
import {CVXterm} from "../../components/CVXterm"
import {ContentUploadInput} from "../../components/functionTemplate/ContentUploadTextArea"
import {ReloadOutlined} from "@ant-design/icons"

import "./PortScanPage.css"
import {SimplePluginList} from "../../components/SimplePluginList"
import {isEnpriTrace} from "@/utils/envfile"
import {CreateReport} from "./CreateReport"
import {v4 as uuidv4} from "uuid"
import {StartBruteParams} from "../brute/BrutePage"

const {ipcRenderer} = window.require("electron")
const ScanPortTemplate = "scan-port-template"

export interface PortScanPageProp {
    sendTarget?: string
}

export interface PortScanParams {
    Targets: string
    Ports: string
    Mode: "syn" | "fingerprint" | "all"
    Proto: ("tcp" | "udp")[]
    Concurrent: number
    SynConcurrent: number
    Active: boolean
    FingerprintMode: "service" | "web" | "all"
    SaveToDB: boolean
    SaveClosedPorts: boolean
    TargetsFile?: string
    ScriptNames: string[]
    Proxy: string[]
    ProbeTimeout: number
    ProbeMax: number
    EnableCClassScan: boolean

    SkippedHostAliveScan?: boolean
    HostAlivePorts?: string

    ExcludeHosts?: string
    ExcludePorts?: string
    EnableBasicCrawler?: boolean
    EnableBrute?: boolean
    BasicCrawlerRequestMax?: number
}

const ScanKind: {[key: string]: string} = {
    syn: "SYN",
    fingerprint: "指纹",
    all: "SYN+指纹"
}
const ScanKindKeys: string[] = Object.keys(ScanKind)

export const defaultPorts =
    "21,22,443,445,80,8000-8004,3306,3389,5432,6379,8080-8084,7000-7005,9000-9002,8443,7443,9443,7080,8070"

export const PortScanPage: React.FC<PortScanPageProp> = (props) => {
    const [loading, setLoading] = useState(false)
    const [params, setParams, getParams] = useGetState<PortScanParams>({
        Ports: defaultPorts,
        Mode: "fingerprint",
        Targets: props.sendTarget ? JSON.parse(props.sendTarget || "[]").join(",") : "",
        Active: true,
        Concurrent: 50,
        FingerprintMode: "all",
        Proto: ["tcp"],
        SaveClosedPorts: false,
        SaveToDB: true,
        Proxy: [],
        ProbeTimeout: 7,
        ScriptNames: [],
        ProbeMax: 3,
        EnableCClassScan: false,
        HostAlivePorts: "22,80,443",
        EnableBasicCrawler: true,
        BasicCrawlerRequestMax: 5,
        SynConcurrent: 1000
    })
    const [token, setToken] = useState(randomString(40))
    const xtermRef = useRef(null)
    const [openPorts, setOpenPorts] = useState<YakitPort[]>([])
    // const [closedPorts, setClosedPorts] = useState<YakitPort[]>([])
    const [port, setPort] = useState<PortAsset>()

    const [uploadLoading, setUploadLoading] = useState(false)
    const [templatePort, setTemplatePort] = useState<string>()
    const openPort = useRef<YakitPort[]>([])
    // const closedPort = useRef<YakitPort[]>([])

    const [infoState, {reset, setXtermRef, resetAll}] = useHoldingIPCRStream(
        "scan-port",
        "PortScan",
        token,
        () => {},
        () => {},
        (obj, content) => content.data.indexOf("isOpen") > -1 && content.data.indexOf("port") > -1
    )

    useEffect(() => {
        setLoading(true)
        ipcRenderer
            .invoke("fetch-local-cache", ScanPortTemplate)
            .then((value: any) => {
                if (value) {
                    setTemplatePort(value || "")
                    // setTimeout(() => {
                    //     setParams({...getParams(), Ports: value || ""})
                    // }, 300)
                }
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => setLoading(false), 100)
            })
    }, [])

    useEffect(() => {
        if (!xtermRef) {
            return
        }

        ipcRenderer.on(`${token}-data`, async (e: any, data: ExecResult) => {
            if (data.IsMessage) {
                try {
                    let messageJsonRaw = Buffer.from(data.Message).toString("utf8")
                    let logInfo = ExtractExecResultMessageToYakitPort(JSON.parse(messageJsonRaw))
                    if (!logInfo) return

                    if (logInfo.isOpen) {
                        openPort.current.unshift(logInfo)
                    } else {
                        // closedPort.current.unshift(logInfo)
                    }
                } catch (e) {
                    failed("解析端口扫描结果失败...")
                }
            }
            writeExecResultXTerm(xtermRef, data)
        })
        ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
            failed(`[PortScan] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
            info("[PortScan] finished")
            setLoading(false)
        })

        const syncPorts = () => {
            if (openPort.current) setOpenPorts([...openPort.current])
            // if (closedPort.current) setClosedPorts([...closedPort.current])
        }

        syncPorts()
        let id = setInterval(syncPorts, 1000)
        return () => {
            clearInterval(id)
            ipcRenderer.invoke("cancel-PortScan", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [xtermRef])

    // 是否允许下载报告
    const [allowDownloadReport, setAllowDownloadReport] = useState<boolean>(false)
    // 获取最新的唯一标识UUID
    const uuid: string = uuidv4()
    const [_, setNowUUID, getNowUUID] = useGetState<string>(uuid)

    return (
        <div style={{width: "100%", height: "100%"}}>
            <Tabs className='scan-port-tabs no-theme-tabs' tabBarStyle={{marginBottom: 5}}>
                <Tabs.TabPane tab={"扫描端口操作台"} key={"scan"}>
                    <div className='scan-port-body'>
                        <div style={{width: 360, height: "100%"}}>
                            <SimplePluginList
                                pluginTypes={"port-scan,mitm"}
                                initialSelected={params.ScriptNames}
                                onSelected={(l) => {
                                    setParams({...params, ScriptNames: [...l]})
                                }}
                                sourceType='PORT_SCAN_PAGE'
                            />
                        </div>

                        <div className='right-container'>
                            <div style={{width: "100%"}}>
                                <Form
                                    labelAlign='right'
                                    labelCol={{span: 5}}
                                    onSubmitCapture={(e) => {
                                        e.preventDefault()

                                        if (!token) {
                                            failed("No Token Assigned")
                                            return
                                        }
                                        if (!params.Targets && !params.TargetsFile) {
                                            failed("需要设置扫描目标")
                                            return
                                        }

                                        setLoading(true)
                                        openPort.current = []
                                        // closedPort.current = []
                                        resetAll()
                                        xtermClear(xtermRef)
                                        // 企业版
                                        if (isEnpriTrace()) {
                                            setAllowDownloadReport(true)
                                            const TaskName = `${
                                                params.Targets.split(",")[0].split(/\n/)[0]
                                            }风险评估报告`
                                            const runTaskNameEx = TaskName + "-" + getNowUUID()
                                            let PortScanRequest = {...params, TaskName: runTaskNameEx}
                                            ipcRenderer.invoke(
                                                "SimpleDetect",
                                                {
                                                    LastRecord: {},
                                                    PortScanRequest
                                                },
                                                token
                                            )
                                        } else {
                                            ipcRenderer.invoke("PortScan", params, token)
                                        }
                                    }}
                                >
                                    <Spin spinning={uploadLoading}>
                                        <ContentUploadInput
                                            type='textarea'
                                            beforeUpload={(f) => {
                                                const typeArr: string[] = [
                                                    "text/plain",
                                                    ".csv",
                                                    ".xls",
                                                    ".xlsx",
                                                    "application/vnd.ms-excel",
                                                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                                ]
                                                if (!typeArr.includes(f.type)) {
                                                    failed(`${f.name}非txt、Excel文件，请上传txt、Excel格式文件！`)
                                                    return false
                                                }

                                                setUploadLoading(true)
                                                ipcRenderer
                                                    .invoke("fetch-file-content", (f as any).path)
                                                    .then((res) => {
                                                        let Targets = res
                                                        // 处理Excel格式文件
                                                        if (f.type !== "text/plain") {
                                                            let str = JSON.stringify(res)
                                                            Targets = str.replace(/(\[|\]|\{|\}|\")/g, "")
                                                        }
                                                        setParams({...params, Targets})
                                                        setTimeout(() => setUploadLoading(false), 100)
                                                    })
                                                return false
                                            }}
                                            item={{
                                                style: {textAlign: "left"},
                                                label: "扫描目标"
                                            }}
                                            textarea={{
                                                isBubbing: true,
                                                setValue: (Targets) => setParams({...params, Targets}),
                                                value: params.Targets,
                                                rows: 1,
                                                placeholder: "域名/主机/IP/IP段均可，逗号分隔或按行分割"
                                            }}
                                            suffixNode={
                                                loading ? (
                                                    <Button
                                                        className='form-submit-style'
                                                        type='primary'
                                                        danger
                                                        onClick={(e) => {
                                                            if (isEnpriTrace()) {
                                                                ipcRenderer.invoke("cancel-SimpleDetect", token)
                                                                return
                                                            }
                                                            ipcRenderer.invoke("cancel-PortScan", token)
                                                        }}
                                                    >
                                                        停止扫描
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        className='form-submit-style'
                                                        type='primary'
                                                        htmlType='submit'
                                                    >
                                                        开始扫描
                                                    </Button>
                                                )
                                            }
                                        />
                                    </Spin>

                                    <Form.Item label='预设端口' colon={false} className='form-item-margin'>
                                        <Checkbox.Group
                                            onChange={(value) => {
                                                let res: string = (value || [])
                                                    .map((i) => {
                                                        if (i === "template") return templatePort
                                                        // @ts-ignore
                                                        return PresetPorts[i] || ""
                                                    })
                                                    .join(",")
                                                if (!!res) {
                                                    setParams({...params, Ports: res})
                                                }
                                            }}
                                        >
                                            <Checkbox value={"top100"}>常见100端口</Checkbox>
                                            <Checkbox value={"topweb"}>常见 Web 端口</Checkbox>
                                            <Checkbox value={"top1000+"}>常见一两千</Checkbox>
                                            <Checkbox value={"topdb"}>常见数据库与 MQ</Checkbox>
                                            <Checkbox value={"topudp"}>常见 UDP 端口</Checkbox>
                                            {templatePort && <Checkbox value={"template"}>默认模板</Checkbox>}
                                        </Checkbox.Group>
                                    </Form.Item>

                                    <Form.Item label='扫描端口' colon={false} className='form-item-margin'>
                                        <Input.TextArea
                                            style={{width: "75%"}}
                                            rows={2}
                                            value={params.Ports}
                                            onChange={(e) => setParams({...params, Ports: e.target.value})}
                                        />
                                        <Space size={"small"} style={{marginBottom: 4}}>
                                            <Tooltip title={"保存为模版"}>
                                                <a
                                                    className='link-button-bfc'
                                                    onClick={() => {
                                                        if (!params.Ports) {
                                                            failed("请输入端口后再保存")
                                                            return
                                                        }
                                                        ipcRenderer
                                                            .invoke("set-local-cache", ScanPortTemplate, params.Ports)
                                                            .then(() => {
                                                                setTemplatePort(params.Ports)
                                                                success("保存成功")
                                                            })
                                                    }}
                                                >
                                                    保存
                                                </a>
                                            </Tooltip>
                                            <Tooltip title={"重置为默认扫描端口"}>
                                                <a
                                                    href={"#"}
                                                    onClick={() => {
                                                        setParams({...params, Ports: defaultPorts})
                                                    }}
                                                >
                                                    <ReloadOutlined />
                                                </a>
                                            </Tooltip>
                                        </Space>
                                    </Form.Item>

                                    <Form.Item label=' ' colon={false} className='form-item-margin'>
                                        <Space>
                                            <Tag>扫描模式:{ScanKind[params.Mode]}</Tag>
                                            <Tag>指纹并发:{params.Concurrent}</Tag>
                                            <Checkbox
                                                onClick={(e) => {
                                                    setParams({
                                                        ...params,
                                                        SkippedHostAliveScan: !params.SkippedHostAliveScan
                                                    })
                                                }}
                                                checked={params.SkippedHostAliveScan}
                                            >
                                                跳过主机存活检测
                                            </Checkbox>
                                            <Button
                                                type='link'
                                                size='small'
                                                onClick={() => {
                                                    showDrawer({
                                                        title: "设置高级参数",
                                                        width: "60%",
                                                        content: (
                                                            <>
                                                                <ScanPortForm
                                                                    defaultParams={params}
                                                                    setParams={setParams}
                                                                />
                                                            </>
                                                        )
                                                    })
                                                }}
                                            >
                                                更多参数
                                            </Button>
                                        </Space>
                                    </Form.Item>
                                </Form>
                            </div>
                            <Divider style={{margin: "5px 0"}} />
                            <div style={{flex: 1, overflow: "hidden"}}>
                                <Tabs
                                    className='scan-port-tabs'
                                    tabBarStyle={{marginBottom: 5}}
                                    tabBarExtraContent={
                                        isEnpriTrace() ? (
                                            <CreateReport
                                                infoState={infoState}
                                                runPluginCount={params.ScriptNames.length}
                                                targets={params.Targets}
                                                allowDownloadReport={allowDownloadReport}
                                                nowUUID={getNowUUID()}
                                                setAllowDownloadReport={setAllowDownloadReport}
                                                loading={loading}
                                            />
                                        ) : null
                                    }
                                >
                                    <Tabs.TabPane tab={"扫描端口列表"} key={"scanPort"} forceRender>
                                        <div style={{width: "100%", height: "100%", overflow: "hidden auto"}}>
                                            <Row style={{marginTop: 6}} gutter={6}>
                                                <Col span={24}>
                                                    <OpenPortTableViewer data={openPorts} />
                                                </Col>
                                                {/*<Col span={8}>*/}
                                                {/*    <ClosedPortTableViewer data={closedPorts}/>*/}
                                                {/*</Col>*/}
                                            </Row>
                                        </div>
                                    </Tabs.TabPane>
                                    <Tabs.TabPane tab={"插件日志"} key={"pluginPort"} forceRender>
                                        <div style={{width: "100%", height: "100%", overflow: "hidden auto"}}>
                                            <PluginResultUI
                                                loading={loading}
                                                progress={infoState.processState}
                                                results={infoState.messageState}
                                                risks={infoState.riskState}
                                                featureType={infoState.featureTypeState}
                                                feature={infoState.featureMessageState}
                                                statusCards={infoState.statusState}
                                            />
                                        </div>
                                    </Tabs.TabPane>
                                    <Tabs.TabPane tab={"Console"} key={"console"} forceRender>
                                        <div
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                overflow: "hidden auto",
                                                display: "flex",
                                                flexDirection: "column"
                                            }}
                                        >
                                            <div style={{textAlign: "right", marginBottom: 8}}>
                                                {loading ? (
                                                    <Tag color={"green"}>正在执行...</Tag>
                                                ) : (
                                                    <Tag>闲置中...</Tag>
                                                )}
                                            </div>

                                            <div style={{width: "100%", flex: 1, overflow: "hidden"}}>
                                                <CVXterm
                                                    ref={xtermRef}
                                                    options={{
                                                        convertEol: true,
                                                        disableStdin: true
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </Tabs.TabPane>
                                </Tabs>
                            </div>
                        </div>
                    </div>
                </Tabs.TabPane>
                <Tabs.TabPane tab={"端口资产管理"} key={"port"}>
                    <div style={{height: "100%", overflowY: "auto", padding: "0 6px"}}>
                        <PortAssetTable
                            onClicked={(i) => {
                                setPort(i)
                            }}
                        />
                    </div>
                </Tabs.TabPane>
            </Tabs>
        </div>
    )
}

interface ScanPortFormProp {
    defaultParams: PortScanParams
    setParams: (p: PortScanParams) => any
    // 简易企业版显示
    isSimpleDetectShow?: boolean
    // 简易版扫描速度
    deepLevel?: number
    // 简易版是否已修改速度
    isSetPort?: boolean
    // 简易版BruteParams参数更改
    bruteParams?: StartBruteParams
    setBruteParams?: (v: StartBruteParams) => void
}

export const ScanPortForm: React.FC<ScanPortFormProp> = (props) => {
    const {deepLevel, isSetPort, bruteParams, setBruteParams} = props
    const isSimpleDetectShow = props.isSimpleDetectShow || false
    const [params, setParams] = useState<PortScanParams>(props.defaultParams)
    const [simpleParams, setSimpleParams] = useState<StartBruteParams | undefined>(bruteParams)
    const [_, setPortroupValue, getPortroupValue] = useGetState<any[]>([])

    useEffect(() => {
        if (!params) return
        props.setParams({...params})
    }, [params])

    useEffect(() => {
        if (!simpleParams) return
        setBruteParams && setBruteParams({...simpleParams})
    }, [simpleParams])

    useEffect(() => {
        if (deepLevel && isSetPort) {
            switch (deepLevel) {
                case 3:
                    setPortroupValue(["fast"])
                    break
                case 2:
                    setPortroupValue(["middle"])
                    break
                case 1:
                    setPortroupValue(["slow"])
                    break
            }
        }
    }, [deepLevel])

    const typeArr: string[] = [
        "text/plain",
        ".csv",
        ".xls",
        ".xlsx",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ]
    return (
        <Form
            onSubmitCapture={(e) => {
                e.preventDefault()
            }}
            labelCol={{span: 5}}
            wrapperCol={{span: 14}}
        >
            {!isSimpleDetectShow && (
                <>
                    <SelectOne
                        label={"扫描模式"}
                        data={ScanKindKeys.map((item) => {
                            return {value: item, text: ScanKind[item]}
                        })}
                        help={"SYN 扫描需要 yak 启动时具有root"}
                        setValue={(Mode) => setParams({...params, Mode})}
                        value={params.Mode}
                    />
                    <SelectOne
                        label={"扫描协议"}
                        data={[
                            {text: "TCP", value: "tcp"},
                            {text: "UDP", value: "udp", disabled: params.Mode === "syn" || params.Mode === "all"}
                        ]}
                        setValue={(i) => setParams({...params, Proto: [i]})}
                        value={(params.Proto || []).length > 0 ? params.Proto[0] : "tcp"}
                    />
                </>
            )}

            {!isSimpleDetectShow && (params.Mode === "all" || params.Mode === "syn") && (
                <>
                    <Divider orientation={"left"}>SYN 配置</Divider>
                    <InputInteger
                        label={"SYN 并发"}
                        help={"每秒发送 SYN 数据包数量，可视为 SYN 并发量"}
                        value={params.SynConcurrent}
                        min={10}
                        setValue={(e) => setParams({...params, SynConcurrent: e})}
                    />
                </>
            )}
            {(params.Mode === "all" || params.Mode === "fingerprint") && (
                <>
                    <Divider orientation={"left"}>指纹扫描配置</Divider>
                    {isSimpleDetectShow && (
                        <>
                            <Form.Item label='预设端口' className='form-item-margin'>
                                <Checkbox.Group
                                    value={getPortroupValue()}
                                    onChange={(value) => {
                                        let res: string = (value || [])
                                            .map((i) => {
                                                // @ts-ignore
                                                return PresetPorts[i] || ""
                                            })
                                            .join(",")
                                        if (!!res) {
                                            setParams({...params, Ports: res})
                                        }
                                        setPortroupValue(value)
                                    }}
                                >
                                    <Checkbox value={"fast"}>快速默认端口</Checkbox>
                                    <Checkbox value={"middle"}>适中默认端口</Checkbox>
                                    <Checkbox value={"slow"}>慢速默认端口</Checkbox>
                                    <Checkbox value={"top100"}>常见100端口</Checkbox>
                                    <Checkbox value={"topweb"}>常见 Web 端口</Checkbox>
                                    <Checkbox value={"top1000+"}>常见一两千</Checkbox>
                                    <Checkbox value={"topdb"}>常见数据库与 MQ</Checkbox>
                                    <Checkbox value={"topudp"}>常见 UDP 端口</Checkbox>
                                    <Checkbox value={"defect"}>常见弱点端口</Checkbox>
                                </Checkbox.Group>
                            </Form.Item>

                            <Form.Item label='扫描端口' className='form-item-margin' style={{position: "relative"}}>
                                <Input.TextArea
                                    style={{width: "100%"}}
                                    rows={2}
                                    value={params.Ports}
                                    onChange={(e) => setParams({...params, Ports: e.target.value})}
                                />
                                <Space size={"small"} style={{marginLeft: 8, position: "absolute", bottom: 0}}>
                                    <Tooltip title={"重置为默认扫描端口"}>
                                        <a
                                            href={"#"}
                                            onClick={() => {
                                                setParams({...params, Ports: PresetPorts["top100"]})
                                            }}
                                        >
                                            <ReloadOutlined />
                                        </a>
                                    </Tooltip>
                                </Space>
                            </Form.Item>
                        </>
                    )}
                    <InputInteger
                        label={"指纹扫描并发"}
                        // help={"推荐最多同时扫描200个端口"}
                        value={params.Concurrent}
                        min={1}
                        // max={200}
                        setValue={(e) => setParams({...params, Concurrent: e})}
                    />
                    <SwitchItem
                        label={"主动模式"}
                        help={"允许指纹探测主动发包"}
                        setValue={(Active) => setParams({...params, Active})}
                        value={params.Active}
                    />
                    <SelectOne
                        label={"服务指纹级别"}
                        help={"级别越高探测的详细程度越多，主动发包越多，时间越长"}
                        data={[
                            {value: 1, text: "基础"},
                            {value: 3, text: "适中"},
                            {value: 7, text: "详细"},
                            {value: 100, text: "全部"}
                        ]}
                        value={params.ProbeMax}
                        setValue={(ProbeMax) => setParams({...params, ProbeMax})}
                    />
                    <InputInteger
                        label={"主动发包超时时间"}
                        help={"某些指纹的检测需要检查目标针对某一个探针请求的响应，需要主动发包"}
                        value={params.ProbeTimeout}
                        setValue={(ProbeTimeout) => setParams({...params, ProbeTimeout})}
                    />
                    {!isSimpleDetectShow && (
                        <ManyMultiSelectForString
                            label={"TCP 代理"}
                            help={
                                "支持 HTTP/Sock4/Sock4a/Socks5 协议，例如 http://127.0.0.1:7890  socks5://127.0.0.1:7890"
                            }
                            data={[
                                "http://127.0.0.1:7890",
                                "http://127.0.0.1:8082",
                                "socks5://127.0.0.1:8082",
                                "http://127.0.0.1:8083"
                            ].map((i) => {
                                return {value: i, label: i}
                            })}
                            value={(params.Proxy || []).join(",")}
                            mode={"tags"}
                            setValue={(e) => setParams({...params, Proxy: (e || "").split(",").filter((i) => !!i)})}
                        />
                    )}
                    <SelectOne
                        label={"高级指纹选项"}
                        data={[
                            {value: "web", text: "仅web指纹"},
                            {value: "service", text: "服务指纹"},
                            {value: "all", text: "全部指纹"}
                        ]}
                        setValue={(FingerprintMode) => setParams({...params, FingerprintMode})}
                        value={params.FingerprintMode}
                    />
                    {isSimpleDetectShow && simpleParams && setSimpleParams && (
                        <>
                            <Divider orientation={"left"}>弱口令配置</Divider>
                            <ContentUploadInput
                                type='textarea'
                                dragger={{
                                    disabled: false,
                                    accept:typeArr.join(",")
                                }}
                                beforeUpload={(f) => {
                                    
                                    if (!typeArr.includes(f.type)) {
                                        failed(`${f.name}非txt、Excel文件，请上传txt、Excel格式文件！`)
                                        return false
                                    }
                                    setSimpleParams({
                                        ...simpleParams,
                                        UsernameFile:f.path
                                    })
                                    return false
                                }}
                                item={{
                                    style: {textAlign: "left"},
                                    label: "用户字典:"
                                }}
                                textarea={{
                                    isBubbing: true,
                                    setValue: (Targets) => {
                                        setSimpleParams({
                                            ...simpleParams,
                                            UsernameFile:Targets
                                        })
                                    },
                                    value: simpleParams.UsernameFile,
                                    rows: 1,
                                    // placeholder: "域名/主机/IP/IP段均可，逗号分隔或按行分割",
                                    disabled: false
                                }}
                                otherHelpNode={
                                    <Checkbox
                                        checked={!simpleParams.ReplaceDefaultUsernameDict}
                                        style={{marginLeft: 16}}
                                        onChange={() => {
                                            setSimpleParams({
                                                ...simpleParams,
                                                ReplaceDefaultUsernameDict: !simpleParams.ReplaceDefaultUsernameDict
                                            })
                                        }}
                                    >
                                        同时使用默认用户字典
                                    </Checkbox>
                                }
                            />
                            <ContentUploadInput
                                type='textarea'
                                dragger={{
                                    disabled: false,
                                    accept:typeArr.join(",")
                                }}
                                beforeUpload={(f) => {
                                    if (!typeArr.includes(f.type)) {
                                        failed(`${f.name}非txt、Excel文件，请上传txt、Excel格式文件！`)
                                        return false
                                    }
                                    setSimpleParams({
                                        ...simpleParams,
                                        PasswordFile:f.path
                                    })
                                    return false
                                }}
                                item={{
                                    style: {textAlign: "left"},
                                    label: "密码字典:"
                                }}
                                textarea={{
                                    isBubbing: true,
                                    setValue: (Targets) => {
                                        setSimpleParams({
                                            ...simpleParams,
                                            PasswordFile:Targets
                                        })
                                    },
                                    value: simpleParams.PasswordFile,
                                    rows: 1,
                                    // placeholder: "域名/主机/IP/IP段均可，逗号分隔或按行分割",
                                    disabled: false
                                }}
                                otherHelpNode={
                                    <Checkbox
                                        checked={!simpleParams.ReplaceDefaultPasswordDict}
                                        style={{marginLeft: 16}}
                                        onChange={() => {
                                            setSimpleParams({
                                                ...simpleParams,
                                                ReplaceDefaultPasswordDict: !simpleParams.ReplaceDefaultPasswordDict
                                            })
                                        }}
                                    >
                                        同时使用默认密码字典
                                    </Checkbox>
                                }
                            />
                            <InputInteger
                                label={"目标并发"}
                                help={"同时爆破 n 个目标"}
                                value={simpleParams.Concurrent}
                                setValue={(e) => setSimpleParams({...simpleParams, Concurrent: e})}
                            />
                            <InputInteger
                                label={"目标内并发"}
                                help={"每个目标同时执行多少爆破任务"}
                                value={simpleParams.TargetTaskConcurrent}
                                setValue={(e) => setSimpleParams({...simpleParams, TargetTaskConcurrent: e})}
                            />
                            <SwitchItem
                                label={"自动停止"}
                                help={"遇到第一个爆破结果时终止任务"}
                                setValue={(OkToStop) => setSimpleParams({...simpleParams, OkToStop})}
                                value={simpleParams.OkToStop}
                            />
                            <InputInteger
                                label={"最小延迟"}
                                max={simpleParams.DelayMax}
                                min={0}
                                setValue={(DelayMin) => setSimpleParams({...simpleParams, DelayMin})}
                                value={simpleParams.DelayMin}
                            />
                            <InputInteger
                                label={"最大延迟"}
                                setValue={(DelayMax) => setSimpleParams({...simpleParams, DelayMax})}
                                value={simpleParams.DelayMax}
                                min={simpleParams.DelayMin}
                            />
                        </>
                    )}
                    <Divider orientation={"left"}>基础爬虫配置</Divider>
                    <Form.Item
                        label={"爬虫设置"}
                        help={"在发现网站内容是一个 HTTP(s) 服务后，进行最基础的爬虫以发现更多数据"}
                    >
                        <Space>
                            <Checkbox
                                onChange={(e) => setParams({...params, EnableBasicCrawler: e.target.value})}
                                checked={params.EnableBasicCrawler}
                            >
                                启用爬虫
                            </Checkbox>
                            <InputNumber
                                addonBefore={"爬虫请求数"}
                                value={params.BasicCrawlerRequestMax}
                                onChange={(e) => setParams({...params, BasicCrawlerRequestMax: e as number})}
                            />
                        </Space>
                    </Form.Item>
                </>
            )}

            <Divider orientation={"left"}>其他配置</Divider>
            <SwitchItem
                label={"扫描结果入库"}
                setValue={(SaveToDB) => {
                    setParams({...params, SaveToDB, SaveClosedPorts: false})
                }}
                value={params.SaveToDB}
            />
            {params.SaveToDB && (
                <SwitchItem
                    label={"保存关闭的端口"}
                    setValue={(SaveClosedPorts) => setParams({...params, SaveClosedPorts})}
                    value={params.SaveClosedPorts}
                />
            )}
            <SwitchItem
                label={"自动扫相关C段"}
                help={"可以把域名 /IP 转化为 C 段目标，直接进行扫描"}
                value={params.EnableCClassScan}
                setValue={(EnableCClassScan) => setParams({...params, EnableCClassScan})}
            />
            <SwitchItem
                label={"跳过主机存活检测"}
                help={"主机存活检测，根据当前用户权限使用 ICMP/TCP Ping 探测主机是否存活"}
                value={params.SkippedHostAliveScan}
                setValue={(SkippedHostAliveScan) => setParams({...params, SkippedHostAliveScan})}
            />
            {!params.SkippedHostAliveScan && (
                <>
                    <InputItem
                        label={"TCP Ping 端口"}
                        help={"配置 TCP Ping 端口：以这些端口是否开放作为 TCP Ping 依据"}
                        value={params.HostAlivePorts}
                        setValue={(HostAlivePorts) => setParams({...params, HostAlivePorts})}
                    />
                </>
            )}
            <InputItem
                label={"排除主机"}
                setValue={(ExcludeHosts) => setParams({...params, ExcludeHosts})}
                value={params.ExcludeHosts}
            />
            <InputItem
                label={"排除端口"}
                setValue={(ExcludePorts) => setParams({...params, ExcludePorts})}
                value={params.ExcludePorts}
            />
        </Form>
    )
}
