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
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

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
    UserFingerprintFiles: string[]
    UserFingerprintFilesStr?: string
    EnableFingerprintGroup: boolean
    FingerprintGroup: string[]
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
    SkipCveBaseLine?: boolean
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
    const {t} = useI18nNamespaces(["portscan", "yakitUi"])
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
            globalNetworkConfig.current = rsp
            const {SynScanNetInterface} = rsp
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
                yakitInfo(t("ScanPortForm.updateConfigSuccess"))
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
                        label={t("ScanPortForm.scanMode")}
                        data={ScanKindKeys.map((item) => {
                            return {value: item, text: ScanKind[item]}
                        })}
                        help={t("ScanPortForm.synNeedRoot")}
                        setValue={(Mode) => setParams({...params, Mode})}
                        value={params.Mode}
                    />
                    <SelectOne
                        label={t("ScanPortForm.scanProto")}
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
                    <Divider orientation={"left"}>{t("ScanPortForm.networkCardConfig")}</Divider>
                    <Form.Item label={<span>{t("ScanPortForm.networkCardSelect")}</span>}>
                        <YakitSelect
                            showSearch
                            options={netInterfaceList}
                            placeholder={t("YakitSelect.pleaseSelect")}
                            size='small'
                            value={params.SynScanNetInterface}
                            onChange={(netInterface) => {
                                setInterface && setInterface(true)
                                setParams({...params, SynScanNetInterface: netInterface})
                            }}
                            maxTagCount={100}
                        />
                        <YakitButton onClick={updateGlobalNetworkConfig} size='small'>
                            {t("ScanPortForm.syncToGlobalNetworkConfig")}
                        </YakitButton>
                    </Form.Item>
                </>
            )}
            {!isSimpleDetectShow && (params.Mode === "all" || params.Mode === "syn") && (
                <>
                    <Divider orientation={"left"}>{t("ScanPortForm.synConfig")}</Divider>
                    <InputInteger
                        label={t("ScanPortForm.synConcurrent")}
                        help={t("ScanPortForm.synConcurrentHelp")}
                        value={params.SynConcurrent}
                        min={10}
                        setValue={(e) => setParams({...params, SynConcurrent: e})}
                    />
                </>
            )}
            {(params.Mode === "all" || params.Mode === "fingerprint") && (
                <>
                    <Divider orientation={"left"}>{t("ScanPortForm.fingerprintScanConfig")}</Divider>
                    {isSimpleDetectShow && (
                        <>
                            <Form.Item label={t("ScanPortForm.presetPort")} className='form-item-margin'>
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
                                    <Checkbox value={"fast"}>{t("ScanPortForm.fast")}</Checkbox>
                                    <Checkbox value={"middle"}>{t("ScanPortForm.middle")}</Checkbox>
                                    <Checkbox value={"slow"}>{t("ScanPortForm.slow")}</Checkbox>
                                    <Checkbox value={"top100"}>{t("ScanPortForm.top100")}</Checkbox>
                                    <Checkbox value={"topweb"}>{t("ScanPortForm.topweb")}</Checkbox>
                                    <Checkbox value={"top1000+"}>{t("ScanPortForm.top1000")}</Checkbox>
                                    <Checkbox value={"topdb"}>{t("ScanPortForm.topdb")}</Checkbox>
                                    <Checkbox value={"topudp"}>{t("ScanPortForm.topudp")}</Checkbox>
                                    <Checkbox value={"defect"}>{t("ScanPortForm.defect")}</Checkbox>
                                    <Checkbox value={"all"}>{t("ScanPortForm.all")}</Checkbox>
                                </Checkbox.Group>
                            </Form.Item>

                            <Form.Item
                                label={t("ScanPortForm.scanPort")}
                                className='form-item-margin'
                                style={{position: "relative"}}
                            >
                                <Input.TextArea
                                    style={{width: "100%"}}
                                    rows={2}
                                    value={params.Ports}
                                    onChange={(e) => setParams({...params, Ports: e.target.value})}
                                />
                                <Space size={"small"} style={{marginLeft: 8, position: "absolute", bottom: 0}}>
                                    <Tooltip title={t("ScanPortForm.resetToDefaultPort")}>
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
                        label={t("ScanPortForm.fingerprintScanConcurrency")}
                        // help={"推荐最多同时扫描200个端口"}
                        value={params.Concurrent}
                        min={1}
                        // max={200}
                        setValue={(e) => setParams({...params, Concurrent: e})}
                    />
                    <SwitchItem
                        label={t("ScanPortForm.activeMode")}
                        help={t("ScanPortForm.activeModeHelp")}
                        setValue={(Active) => setParams({...params, Active})}
                        value={params.Active}
                    />
                    <SelectOne
                        label={t("ScanPortForm.serviceFingerprintLevel")}
                        help={t("ScanPortForm.serviceFingerprintLevelHelp")}
                        data={[
                            {value: 1, text: t("ScanPortForm.basic")},
                            {value: 3, text: "适中"},
                            {value: 7, text: t("ScanPortForm.detailed")},
                            {value: 100, text: "全部"}
                        ]}
                        value={params.ProbeMax}
                        setValue={(ProbeMax) => setParams({...params, ProbeMax})}
                    />
                    <InputInteger
                        label={t("ScanPortForm.activePacketTimeout")}
                        help={t("ScanPortForm.activePacketTimeoutHelp")}
                        value={params.ProbeTimeout}
                        setValue={(ProbeTimeout) => setParams({...params, ProbeTimeout})}
                    />
                    {!isSimpleDetectShow && (
                        <ManyMultiSelectForString
                            label={t("ScanPortForm.tcpProxy")}
                            help={t("ScanPortForm.tcpProxyHelp")}
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
                        label={t("ScanPortForm.advancedFingerprintOptions")}
                        data={[
                            {value: "web", text: t("ScanPortForm.onlyWebFingerprint")},
                            {value: "service", text: t("ScanPortForm.serviceFingerprint")},
                            {value: "all", text: t("ScanPortForm.allFingerprint")}
                        ]}
                        setValue={(FingerprintMode) => setParams({...params, FingerprintMode})}
                        value={params.FingerprintMode}
                    />
                    {isSimpleDetectShow && simpleParams && setSimpleParams && (
                        <>
                            <Divider orientation={"left"}>{t("ScanPortForm.bruteForceConfig")}</Divider>
                            <ContentUploadInput
                                type='textarea'
                                dragger={{
                                    disabled: false,
                                    accept: typeArr.join(",")
                                }}
                                beforeUpload={(f) => {
                                    if (!typeArr.includes(f.type)) {
                                        failed(t("ScanPortForm.invalidFileType", {name: f.name}))
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
                                    label: t("ScanPortForm.userDict")
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
                                            {t("ScanPortForm.useDefaultUserDict")}
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
                                        failed(t("ScanPortForm.invalidFileType", {name: f.name}))
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
                                    label: t("ScanPortForm.passwordDict")
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
                                            {t("ScanPortForm.useDefaultPasswordDict")}
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
                                label={t("ScanPortForm.targetConcurrent")}
                                help={t("ScanPortForm.targetConcurrentHelp")}
                                value={simpleParams.Concurrent}
                                setValue={(e) => setSimpleParams({...simpleParams, Concurrent: e})}
                            />
                            <InputInteger
                                label={t("ScanPortForm.innerTargetConcurrent")}
                                help={t("ScanPortForm.innerTargetConcurrentHelp")}
                                value={simpleParams.TargetTaskConcurrent}
                                setValue={(e) => setSimpleParams({...simpleParams, TargetTaskConcurrent: e})}
                            />
                            <SwitchItem
                                label={t("ScanPortForm.autoStop")}
                                help={t("ScanPortForm.autoStopHelp")}
                                setValue={(OkToStop) => setSimpleParams({...simpleParams, OkToStop})}
                                value={simpleParams.OkToStop}
                            />
                            <InputInteger
                                label={t("ScanPortForm.minDelay")}
                                max={simpleParams.DelayMax}
                                min={0}
                                setValue={(DelayMin) => setSimpleParams({...simpleParams, DelayMin})}
                                value={simpleParams.DelayMin}
                            />
                            <InputInteger
                                label={t("ScanPortForm.maxDelay")}
                                setValue={(DelayMax) => setSimpleParams({...simpleParams, DelayMax})}
                                value={simpleParams.DelayMax}
                                min={simpleParams.DelayMin}
                            />
                        </>
                    )}
                    <Divider orientation={"left"}>{t("ScanPortForm.basicCrawlerConfig")}</Divider>
                    <Form.Item label={t("ScanPortForm.crawlerSettings")} help={t("ScanPortForm.crawlerSettingsHelp")}>
                        <Space>
                            <Checkbox
                                onChange={(e) => setParams({...params, EnableBasicCrawler: e.target.checked})}
                                checked={params.EnableBasicCrawler}
                            >
                                {t("ScanPortForm.enableCrawler")}
                            </Checkbox>
                            <InputNumber
                                addonBefore={t("ScanPortForm.crawlerRequestCount")}
                                value={params.BasicCrawlerRequestMax}
                                onChange={(e) => setParams({...params, BasicCrawlerRequestMax: e as number})}
                            />
                        </Space>
                    </Form.Item>
                </>
            )}

            <Divider orientation={"left"}>{t("ScanPortForm.otherConfig")}</Divider>
            <SwitchItem
                label={t("ScanPortForm.saveToDB")}
                setValue={(SaveToDB) => {
                    setParams({...params, SaveToDB, SaveClosedPorts: false})
                }}
                value={params.SaveToDB}
            />
            {params.SaveToDB && (
                <SwitchItem
                    label={t("ScanPortForm.saveClosedPorts")}
                    setValue={(SaveClosedPorts) => setParams({...params, SaveClosedPorts})}
                    value={params.SaveClosedPorts}
                />
            )}
            <SwitchItem
                label={t("ScanPortForm.autoScanCClass")}
                help={t("ScanPortForm.autoScanCClassHelp")}
                value={params.EnableCClassScan}
                setValue={(EnableCClassScan) => setParams({...params, EnableCClassScan})}
            />
            <SwitchItem
                label={t("ScanPortForm.skipHostAliveScan")}
                help={t("ScanPortForm.hostAliveScanHelp")}
                value={params.SkippedHostAliveScan}
                setValue={(SkippedHostAliveScan) => setParams({...params, SkippedHostAliveScan})}
            />
            {!params.SkippedHostAliveScan && (
                <>
                    <InputInteger
                        label={t("ScanPortForm.hostAliveConcurrent")}
                        value={params.HostAliveConcurrent}
                        setValue={(HostAliveConcurrent) => setParams({...params, HostAliveConcurrent})}
                    />
                    <InputItem
                        label={t("ScanPortForm.tcpPingPort")}
                        help={t("ScanPortForm.tcpPingPortHelp")}
                        value={params.HostAlivePorts}
                        setValue={(HostAlivePorts) => setParams({...params, HostAlivePorts})}
                    />
                </>
            )}
            <InputItem
                label={t("ScanPortForm.excludeHosts")}
                setValue={(ExcludeHosts) => setParams({...params, ExcludeHosts})}
                value={params.ExcludeHosts}
            />
            <InputItem
                label={t("ScanPortForm.excludePorts")}
                setValue={(ExcludePorts) => setParams({...params, ExcludePorts})}
                value={params.ExcludePorts}
            />
        </Form>
    )
}
