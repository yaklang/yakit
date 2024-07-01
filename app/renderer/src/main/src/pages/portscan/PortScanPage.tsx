import React, {useEffect, useRef, useState} from "react"
import {Checkbox, Divider, Form, Input, InputNumber, Space, Tooltip} from "antd"
import {InputInteger, InputItem, ManyMultiSelectForString, SelectOne, SwitchItem} from "../../utils/inputUtil"
import {failed, yakitInfo} from "../../utils/notification"
import {PresetPorts} from "./schema"
import {useGetState, useMemoizedFn} from "ahooks"
import {ContentUploadInput} from "../../components/functionTemplate/ContentUploadTextArea"
import {DeleteOutlined, PaperClipOutlined, ReloadOutlined} from "@ant-design/icons"

import "./PortScanPage.css"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {SelectOptionProps} from "@/pages/fuzzer/HTTPFuzzerPage"
import {PcapMetadata} from "@/models/Traffic"
import {GlobalNetworkConfig} from "@/components/configNetwork/ConfigNetworkPage"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {HybridScanPluginConfig} from "@/models/HybridScan"
import {StartBruteParams} from "../securityTool/newBrute/NewBruteType"

const {ipcRenderer} = window.require("electron")
export const ScanPortTemplate = "scan-port-template"

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
    UserFingerprintFiles: string
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

    SynScanNetInterface?: string
    HostAliveConcurrent?: number
    /**插件条件的配置 */
    LinkPluginConfig?: HybridScanPluginConfig
    /**爬虫是否启用 JS 解析 */
    BasicCrawlerEnableJSParser?: boolean
    TaskName?: string
}

export const ScanKind: {[key: string]: string} = {
    syn: "SYN",
    fingerprint: "指纹",
    all: "SYN+指纹"
}
export const ScanKindKeys: string[] = Object.keys(ScanKind)

export const defaultPorts =
    "21,22,443,445,80,8000-8004,3306,3389,5432,6379,8080-8084,7000-7005,9000-9002,8443,7443,9443,7080,8070"

interface ScanPortFormProp {
    defaultParams: PortScanParams
    setParams: (p: PortScanParams) => any
    // 网卡选择是否被修改
    isSetInterface?: boolean
    setInterface?: (v: boolean) => void
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
    const {deepLevel, isSetPort, bruteParams, setBruteParams, setInterface, isSetInterface} = props
    const isSimpleDetectShow = props.isSimpleDetectShow || false
    const [params, setParams] = useState<PortScanParams>(props.defaultParams)
    const [simpleParams, setSimpleParams] = useState<StartBruteParams | undefined>(bruteParams)
    const [_, setPortroupValue, getPortroupValue] = useGetState<any[]>([])
    const [usernamesValue, setUsernamesValue] = useState<string>()
    const [passwordsValue, setPasswordsValue] = useState<string>()
    useEffect(() => {
        if (!params) return
        props.setParams({...params})
    }, [params])

    useEffect(() => {
        if (!simpleParams) return
        let bruteParams = {
            ...simpleParams,
            Usernames: usernamesValue ? usernamesValue.split(/\n|,/) : [],
            Passwords: passwordsValue ? passwordsValue.split(/\n|,/) : []
        }

        setBruteParams && setBruteParams({...bruteParams})
    }, [simpleParams, usernamesValue, passwordsValue])

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

    const [netInterfaceList, setNetInterfaceList] = useState<SelectOptionProps[]>([]) // 代理代表
    const globalNetworkConfig = useRef<GlobalNetworkConfig>()
    useEffect(() => {
        ipcRenderer.invoke("GetGlobalNetworkConfig", {}).then((rsp: GlobalNetworkConfig) => {
            console.log("GetGlobalNetworkConfig", rsp)
            globalNetworkConfig.current = rsp
            const {SynScanNetInterface} = rsp
            console.log("SynScanNetInterface", SynScanNetInterface)
            ipcRenderer.invoke("GetPcapMetadata", {}).then((data: PcapMetadata) => {
                if (!data || data.AvailablePcapDevices.length === 0) {
                    return
                }
                const interfaceList = data.AvailablePcapDevices.map((item) => ({
                    label: `${item.NetInterfaceName}-(${item.IP})`,
                    value: item.Name
                }))
                if (SynScanNetInterface.length === 0 && !isSetInterface) {
                    setParams({...params, SynScanNetInterface: data.DefaultPublicNetInterface.NetInterfaceName})
                }
                setNetInterfaceList(interfaceList)
                if (SynScanNetInterface.length !== 0 && !isSetInterface) {
                    setParams({...params, SynScanNetInterface})
                }
            })
        })
    }, [])

    const updateGlobalNetworkConfig = useMemoizedFn(() => {
        ipcRenderer
            .invoke("SetGlobalNetworkConfig", {
                ...globalNetworkConfig.current,
                SynScanNetInterface: params.SynScanNetInterface
            })
            .then(() => {
                yakitInfo("更新配置成功")
            })
    })

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
            {(params.Mode === "all" || params.Mode === "syn") && (
                <>
                    <Divider orientation={"left"}>网卡配置</Divider>
                    <Form.Item label={<span>网卡选择</span>}>
                        <YakitSelect
                            showSearch
                            options={netInterfaceList}
                            placeholder='请选择...'
                            size='small'
                            value={params.SynScanNetInterface}
                            onChange={(netInterface) => {
                                setInterface && setInterface(true)
                                setParams({...params, SynScanNetInterface: netInterface})
                            }}
                            maxTagCount={100}
                        />
                        <YakitButton onClick={updateGlobalNetworkConfig} size='small'>
                            同步到全局网络配置
                        </YakitButton>
                    </Form.Item>
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
                                        if (value.includes("all")) {
                                            res = PresetPorts["all"] || ""
                                        }
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
                                    <Checkbox value={"defect"}>常见弱口令端口</Checkbox>
                                    <Checkbox value={"all"}>全端口</Checkbox>
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
                                    accept: typeArr.join(",")
                                }}
                                beforeUpload={(f) => {
                                    if (!typeArr.includes(f.type)) {
                                        failed(`${f.name}非txt、Excel文件，请上传txt、Excel格式文件！`)
                                        return false
                                    }
                                    setSimpleParams({
                                        ...simpleParams,
                                        UsernameFile: f.path
                                    })
                                    return false
                                }}
                                item={{
                                    style: {textAlign: "left"},
                                    label: "用户字典:"
                                }}
                                textarea={{
                                    isBubbing: true,
                                    setValue: (Usernames) => {
                                        setUsernamesValue(Usernames)
                                    },
                                    value: usernamesValue,
                                    rows: 1,
                                    // placeholder: "域名/主机/IP/IP段均可，逗号分隔或按行分割",
                                    disabled: false
                                }}
                                otherHelpNode={
                                    <>
                                        <Checkbox
                                            checked={simpleParams.ReplaceDefaultUsernameDict}
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
                                        {simpleParams.UsernameFile && (
                                            <div>
                                                <PaperClipOutlined />
                                                <span style={{marginLeft: 6, color: "#198fff"}}>
                                                    {simpleParams.UsernameFile}
                                                </span>
                                                <DeleteOutlined
                                                    onClick={() => {
                                                        setSimpleParams({
                                                            ...simpleParams,
                                                            UsernameFile: undefined
                                                        })
                                                    }}
                                                    className='port-scan-upload-del'
                                                />
                                            </div>
                                        )}
                                    </>
                                }
                            />
                            <ContentUploadInput
                                type='textarea'
                                dragger={{
                                    disabled: false,
                                    accept: typeArr.join(",")
                                }}
                                beforeUpload={(f) => {
                                    if (!typeArr.includes(f.type)) {
                                        failed(`${f.name}非txt、Excel文件，请上传txt、Excel格式文件！`)
                                        return false
                                    }
                                    setSimpleParams({
                                        ...simpleParams,
                                        PasswordFile: f.path
                                    })
                                    return false
                                }}
                                item={{
                                    style: {textAlign: "left"},
                                    label: "密码字典:"
                                }}
                                textarea={{
                                    isBubbing: true,
                                    setValue: (item) => {
                                        setPasswordsValue(item)
                                    },
                                    value: passwordsValue,
                                    rows: 1,
                                    // placeholder: "域名/主机/IP/IP段均可，逗号分隔或按行分割",
                                    disabled: false
                                }}
                                otherHelpNode={
                                    <>
                                        <Checkbox
                                            checked={simpleParams.ReplaceDefaultPasswordDict}
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
                                        {simpleParams.PasswordFile && (
                                            <div>
                                                <PaperClipOutlined />
                                                <span style={{marginLeft: 6, color: "#198fff"}}>
                                                    {simpleParams.PasswordFile}
                                                </span>
                                                <DeleteOutlined
                                                    onClick={() => {
                                                        setSimpleParams({
                                                            ...simpleParams,
                                                            PasswordFile: undefined
                                                        })
                                                    }}
                                                    className='port-scan-upload-del'
                                                />
                                            </div>
                                        )}
                                    </>
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
                                onChange={(e) => setParams({...params, EnableBasicCrawler: e.target.checked})}
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
                    <InputInteger
                        label={"存活检测并发"}
                        value={params.HostAliveConcurrent}
                        setValue={(HostAliveConcurrent) => setParams({...params, HostAliveConcurrent})}
                    />
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
