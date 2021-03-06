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
    BasicCrawlerRequestMax?: number
}

const ScanKind: { [key: string]: string } = {
    syn: "SYN",
    fingerprint: "??????",
    all: "SYN+??????"
}
const ScanKindKeys: string[] = Object.keys(ScanKind)

const defaultPorts =
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

    const [infoState, {reset}] = useHoldingIPCRStream(
        "scan-port",
        "PortScan",
        token,
        () => {
        },
        () => {
        },
        (obj, content) => content.data.indexOf("isOpen") > -1 && content.data.indexOf("port") > -1
    )

    useEffect(() => {
        setLoading(true)
        ipcRenderer
            .invoke("get-value", ScanPortTemplate)
            .then((value: any) => {
                if (value) {
                    setTemplatePort(value || "")
                    // setTimeout(() => {
                    //     setParams({...getParams(), Ports: value || ""})
                    // }, 300)
                }
            })
            .catch(() => {
            })
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
                    failed("??????????????????????????????...")
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

    return (
        <div style={{width: "100%", height: "100%"}}>
            <Tabs className='scan-port-tabs' tabBarStyle={{marginBottom: 5}}>
                <Tabs.TabPane tab={"?????????????????????"} key={"scan"}>
                    <div className='scan-port-body'>
                        <div style={{width: 360, height: "100%"}}>
                            <SimplePluginList
                                pluginTypes={"port-scan,mitm"}
                                initialSelected={params.ScriptNames}
                                onSelected={(l) => {
                                    setParams({...params, ScriptNames: [...l]})
                                }}
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
                                            failed("????????????????????????")
                                            return
                                        }

                                        setLoading(true)
                                        openPort.current = []
                                        // closedPort.current = []
                                        reset()
                                        xtermClear(xtermRef)
                                        ipcRenderer.invoke("PortScan", params, token)
                                    }}
                                >
                                    <Spin spinning={uploadLoading}>
                                        <ContentUploadInput
                                            type='textarea'
                                            beforeUpload={(f) => {
                                                if (f.type !== "text/plain") {
                                                    failed(`${f.name}???txt??????????????????txt???????????????`)
                                                    return false
                                                }

                                                setUploadLoading(true)
                                                ipcRenderer
                                                    .invoke("fetch-file-content", (f as any).path)
                                                    .then((res) => {
                                                        setParams({...params, Targets: res})
                                                        setTimeout(() => setUploadLoading(false), 100)
                                                    })
                                                return false
                                            }}
                                            item={{
                                                style: {textAlign: "left"},
                                                label: "????????????"
                                            }}
                                            textarea={{
                                                isBubbing: true,
                                                setValue: (Targets) => setParams({...params, Targets}),
                                                value: params.Targets,
                                                rows: 1,
                                                placeholder: "??????/??????/IP/IP???????????????????????????????????????"
                                            }}
                                            suffixNode={
                                                loading ? (
                                                    <Button
                                                        className='form-submit-style'
                                                        type='primary'
                                                        danger
                                                        onClick={(e) => ipcRenderer.invoke("cancel-PortScan", token)}
                                                    >
                                                        ????????????
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        className='form-submit-style'
                                                        type='primary'
                                                        htmlType='submit'
                                                    >
                                                        ????????????
                                                    </Button>
                                                )
                                            }
                                        />
                                    </Spin>

                                    <Form.Item label='????????????' colon={false} className='form-item-margin'>
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
                                            <Checkbox value={"top100"}>??????100??????</Checkbox>
                                            <Checkbox value={"topweb"}>?????? Web ??????</Checkbox>
                                            <Checkbox value={"top1000+"}>???????????????</Checkbox>
                                            <Checkbox value={"topdb"}>?????????????????? MQ</Checkbox>
                                            <Checkbox value={"topudp"}>?????? UDP ??????</Checkbox>
                                            {templatePort && <Checkbox value={"template"}>????????????</Checkbox>}
                                        </Checkbox.Group>
                                    </Form.Item>

                                    <Form.Item label='????????????' colon={false} className='form-item-margin'>
                                        <Input.TextArea
                                            style={{width: "75%"}}
                                            rows={2}
                                            value={params.Ports}
                                            onChange={(e) => setParams({...params, Ports: e.target.value})}
                                        />
                                        <Space size={"small"} style={{marginBottom: 4}}>
                                            <Tooltip title={"???????????????"}>
                                                <a
                                                    className='link-button-bfc'
                                                    onClick={() => {
                                                        if (!params.Ports) {
                                                            failed("???????????????????????????")
                                                            return
                                                        }
                                                        ipcRenderer
                                                            .invoke("set-value", ScanPortTemplate, params.Ports)
                                                            .then(() => {
                                                                setTemplatePort(params.Ports)
                                                                success("????????????")
                                                            })
                                                    }}
                                                >
                                                    ??????
                                                </a>
                                            </Tooltip>
                                            <Tooltip title={"???????????????????????????"}>
                                                <a
                                                    href={"#"}
                                                    onClick={() => {
                                                        setParams({...params, Ports: defaultPorts})
                                                    }}
                                                >
                                                    <ReloadOutlined/>
                                                </a>
                                            </Tooltip>
                                        </Space>
                                    </Form.Item>

                                    <Form.Item label=' ' colon={false} className='form-item-margin'>
                                        <Space>
                                            <Tag>????????????:{ScanKind[params.Mode]}</Tag>
                                            <Tag>????????????:{params.Concurrent}</Tag>
                                            <Checkbox
                                                onClick={(e) => {
                                                    setParams({
                                                        ...params,
                                                        SkippedHostAliveScan: !params.SkippedHostAliveScan
                                                    })
                                                }}
                                                checked={params.SkippedHostAliveScan}
                                            >
                                                ????????????????????????
                                            </Checkbox>
                                            <Button
                                                type='link'
                                                size='small'
                                                onClick={() => {
                                                    showDrawer({
                                                        title: "??????????????????",
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
                                                ????????????
                                            </Button>
                                        </Space>
                                    </Form.Item>
                                </Form>
                            </div>
                            <Divider style={{margin: "5px 0"}}/>
                            <div style={{flex: 1, overflow: "hidden"}}>
                                <Tabs className='scan-port-tabs' tabBarStyle={{marginBottom: 5}}>
                                    <Tabs.TabPane tab={"??????????????????"} key={"scanPort"} forceRender>
                                        <div style={{width: "100%", height: "100%", overflow: "hidden auto"}}>
                                            <div style={{textAlign: "right", marginBottom: 8}}>
                                                {loading ? (
                                                    <Tag color={"green"}>????????????...</Tag>
                                                ) : (
                                                    <Tag>?????????...</Tag>
                                                )}
                                            </div>

                                            <div style={{width: "100%", height: 178, overflow: "hidden"}}>
                                                <CVXterm
                                                    ref={xtermRef}
                                                    options={{
                                                        convertEol: true,
                                                        disableStdin: true
                                                    }}
                                                />
                                            </div>

                                            <Row style={{marginTop: 6}} gutter={6}>
                                                <Col span={24}>
                                                    <OpenPortTableViewer data={openPorts}/>
                                                </Col>
                                                {/*<Col span={8}>*/}
                                                {/*    <ClosedPortTableViewer data={closedPorts}/>*/}
                                                {/*</Col>*/}
                                            </Row>
                                        </div>
                                    </Tabs.TabPane>
                                    <Tabs.TabPane tab={"????????????"} key={"pluginPort"} forceRender>
                                        <div style={{width: "100%", height: "100%", overflow: "hidden auto"}}>
                                            <PluginResultUI
                                                loading={loading}
                                                progress={infoState.processState}
                                                results={infoState.messageState}
                                                featureType={infoState.featureTypeState}
                                                feature={infoState.featureMessageState}
                                                statusCards={infoState.statusState}
                                            />
                                        </div>
                                    </Tabs.TabPane>
                                </Tabs>
                            </div>
                        </div>
                    </div>
                </Tabs.TabPane>
                <Tabs.TabPane tab={"??????????????????"} key={"port"}>
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
}

const ScanPortForm: React.FC<ScanPortFormProp> = (props) => {
    const [params, setParams] = useState<PortScanParams>(props.defaultParams)

    useEffect(() => {
        if (!params) return
        props.setParams({...params})
    }, [params])

    return (
        <Form
            onSubmitCapture={(e) => {
                e.preventDefault()
            }}
            labelCol={{span: 5}}
            wrapperCol={{span: 14}}
        >
            <SelectOne
                label={"????????????"}
                data={ScanKindKeys.map((item) => {
                    return {value: item, text: ScanKind[item]}
                })}
                help={"SYN ???????????? yak ???????????????root"}
                setValue={(Mode) => setParams({...params, Mode})}
                value={params.Mode}
            />
            <SelectOne
                label={"????????????"}
                data={[
                    {text: "TCP", value: "tcp"},
                    {text: "UDP", value: "udp", disabled: params.Mode === "syn" || params.Mode === "all"}
                ]}
                setValue={(i) => setParams({...params, Proto: [i]})}
                value={(params.Proto || []).length > 0 ? params.Proto[0] : "tcp"}
            ></SelectOne>
            {(params.Mode === "all" || params.Mode === "syn") && (
                <>
                    <Divider orientation={"left"}>SYN ??????</Divider>
                    <InputInteger
                        label={"SYN ??????"}
                        help={"???????????? SYN ??????????????????????????? SYN ?????????"}
                        value={params.SynConcurrent}
                        min={10}
                        setValue={(e) => setParams({...params, SynConcurrent: e})}
                    />
                </>
            )}
            {(params.Mode === "all" || params.Mode === "fingerprint") && (
                <>
                    <Divider orientation={"left"}>??????????????????</Divider>
                    <InputInteger
                        label={"??????????????????"}
                        // help={"????????????????????????200?????????"}
                        value={params.Concurrent}
                        min={1}
                        // max={200}
                        setValue={(e) => setParams({...params, Concurrent: e})}
                    />
                    <SwitchItem
                        label={"????????????"}
                        help={"??????????????????????????????"}
                        setValue={(Active) => setParams({...params, Active})}
                        value={params.Active}
                    />
                    <SelectOne
                        label={"??????????????????"}
                        help={"???????????????????????????????????????????????????????????????????????????"}
                        data={[
                            {value: 1, text: "??????"},
                            {value: 3, text: "??????"},
                            {value: 7, text: "??????"},
                            {value: 100, text: "??????"}
                        ]}
                        value={params.ProbeMax}
                        setValue={(ProbeMax) => setParams({...params, ProbeMax})}
                    />
                    <InputInteger
                        label={"????????????????????????"}
                        help={"????????????????????????????????????????????????????????????????????????????????????????????????"}
                        value={params.ProbeTimeout}
                        setValue={(ProbeTimeout) => setParams({...params, ProbeTimeout})}
                    />
                    <ManyMultiSelectForString
                        label={"TCP ??????"}
                        help={"?????? HTTP/Sock4/Sock4a/Socks5 ??????????????? http://127.0.0.1:7890  socks5://127.0.0.1:7890"}
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
                    <SelectOne
                        label={"??????????????????"}
                        data={[
                            {value: "web", text: "???web??????"},
                            {value: "service", text: "????????????"},
                            {value: "all", text: "????????????"}
                        ]}
                        setValue={(FingerprintMode) => setParams({...params, FingerprintMode})}
                        value={params.FingerprintMode}
                    />
                    <Divider orientation={"left"}>??????????????????</Divider>
                    <Form.Item
                        label={"????????????"}
                        help={"?????????????????????????????? HTTP(s) ?????????????????????????????????????????????????????????"}
                    >
                        <Space>
                            <Checkbox
                                onChange={(e) => setParams({...params, EnableBasicCrawler: e.target.value})}
                                checked={params.EnableBasicCrawler}
                            >
                                ????????????
                            </Checkbox>
                            <InputNumber
                                addonBefore={"???????????????"}
                                value={params.BasicCrawlerRequestMax}
                                onChange={(e) => setParams({...params, BasicCrawlerRequestMax: e})}
                            />
                        </Space>
                    </Form.Item>
                </>
            )}

            <Divider orientation={"left"}>????????????</Divider>
            <SwitchItem
                label={"??????????????????"}
                setValue={(SaveToDB) => {
                    setParams({...params, SaveToDB, SaveClosedPorts: false})
                }}
                value={params.SaveToDB}
            />
            {params.SaveToDB && (
                <SwitchItem
                    label={"?????????????????????"}
                    setValue={(SaveClosedPorts) => setParams({...params, SaveClosedPorts})}
                    value={params.SaveClosedPorts}
                />
            )}
            <SwitchItem
                label={"???????????????C???"}
                help={"??????????????? /IP ????????? C ??????????????????????????????"}
                value={params.EnableCClassScan}
                setValue={(EnableCClassScan) => setParams({...params, EnableCClassScan})}
            />
            <SwitchItem
                label={"????????????????????????"}
                help={"??????????????????????????????????????????????????? ICMP/TCP Ping ????????????????????????"}
                value={params.SkippedHostAliveScan}
                setValue={(SkippedHostAliveScan) => setParams({...params, SkippedHostAliveScan})}
            />
            {!params.SkippedHostAliveScan && (
                <>
                    <InputItem
                        label={"TCP Ping ??????"}
                        help={"?????? TCP Ping ?????????????????????????????????????????? TCP Ping ??????"}
                        value={params.HostAlivePorts}
                        setValue={(HostAlivePorts) => setParams({...params, HostAlivePorts})}
                    />
                </>
            )}
            <InputItem
                label={"????????????"}
                setValue={(ExcludeHosts) => setParams({...params, ExcludeHosts})}
                value={params.ExcludeHosts}
            />
            <InputItem
                label={"????????????"}
                setValue={(ExcludePorts) => setParams({...params, ExcludePorts})}
                value={params.ExcludePorts}
            />
        </Form>
    )
}
