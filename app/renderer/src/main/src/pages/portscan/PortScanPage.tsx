import React, { useEffect, useRef, useState } from "react"
import { Checkbox, Divider, Form, Input, InputNumber, Space, Tooltip } from "antd"
import { InputInteger, InputItem, ManyMultiSelectForString, SelectOne, SwitchItem } from "../../utils/inputUtil"
import { failed, yakitInfo } from "../../utils/notification"
import { PresetPorts } from "./schema"
import { useGetState, useMemoizedFn } from "ahooks"
import { ContentUploadInput } from "../../components/functionTemplate/ContentUploadTextArea"
import { DeleteOutlined, PaperClipOutlined, ReloadOutlined } from "@ant-design/icons"

import "./PortScanPage.css"
import { YakitSelect } from "@/components/yakitUI/YakitSelect/YakitSelect"
import { SelectOptionProps } from "@/pages/fuzzer/HTTPFuzzerPage"
import { PcapMetadata } from "@/models/Traffic"
import { GlobalNetworkConfig } from "@/components/configNetwork/ConfigNetworkPage"
import { YakitButton } from "@/components/yakitUI/YakitButton/YakitButton"
import { HybridScanPluginConfig } from "@/models/HybridScan"
import { StartBruteParams } from "../securityTool/newBrute/NewBruteType"
import { useI18nNamespaces } from "@/i18n/useI18nNamespaces"

const { ipcRenderer } = window.require("electron")
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

export const ScanKind: { [key: string]: string } = {
    syn: "SYN",
    fingerprint: "fingerprint",
    all: "syn+fingerprint"
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
    const { t } = useI18nNamespaces(["portscan"])
    const { deepLevel, isSetPort, bruteParams, setBruteParams, setInterface, isSetInterface } = props
    const isSimpleDetectShow = props.isSimpleDetectShow || false
    const [params, setParams] = useState<PortScanParams>(props.defaultParams)
    const [simpleParams, setSimpleParams] = useState<StartBruteParams | undefined>(bruteParams)
    const [_, setPortroupValue, getPortroupValue] = useGetState<any[]>([])
    const [usernamesValue, setUsernamesValue] = useState<string>()
    const [passwordsValue, setPasswordsValue] = useState<string>()
    useEffect(() => {
        if (!params) return
        props.setParams({ ...params })
    }, [params])

    useEffect(() => {
        if (!simpleParams) return
        let bruteParams = {
            ...simpleParams,
            Usernames: usernamesValue ? usernamesValue.split(/\n|,/) : [],
            Passwords: passwordsValue ? passwordsValue.split(/\n|,/) : []
        }

        setBruteParams && setBruteParams({ ...bruteParams })
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
            const { SynScanNetInterface } = rsp
            ipcRenderer.invoke("GetPcapMetadata", {}).then((data: PcapMetadata) => {
                if (!data || data.AvailablePcapDevices.length === 0) {
                    return
                }
                const interfaceList = data.AvailablePcapDevices.map((item) => ({
                    label: `${item.NetInterfaceName}-(${item.IP})`,
                    value: item.Name
                }))
                if (SynScanNetInterface.length === 0 && !isSetInterface) {
                    setParams({ ...params, SynScanNetInterface: data.DefaultPublicNetInterface.NetInterfaceName })
                }
                setNetInterfaceList(interfaceList)
                if (SynScanNetInterface.length !== 0 && !isSetInterface) {
                    setParams({ ...params, SynScanNetInterface })
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
                yakitInfo(t("portscan.updateConfigSuccess"))
            })
    })

    return (
        <Form
            onSubmitCapture={(e) => {
                e.preventDefault()
            }}
            labelCol={{ span: 5 }}
            wrapperCol={{ span: 14 }}
        >
            {!isSimpleDetectShow && (
                <>
                    <SelectOne
                        label={t("portscan.scanMode")}
                        data={ScanKindKeys.map((item) => {
                            let text = ScanKind[item];
                            if (item === "fingerprint") text = t("portscan.fingerprint");
                            if (item === "all") text = "SYN+" + t("portscan.fingerprint");
                            return { value: item, text: text }
                        })}
                        help={t("portscan.synNeedRoot")}
                        setValue={(Mode) => setParams({ ...params, Mode })}
                        value={params.Mode}
                    />
                    <SelectOne
                        label={t("portscan.scanProto")}
                        data={[
                            { text: "TCP", value: "tcp" },
                            { text: "UDP", value: "udp", disabled: params.Mode === "syn" || params.Mode === "all" }
                        ]}
                        setValue={(i) => setParams({ ...params, Proto: [i] })}
                        value={(params.Proto || []).length > 0 ? params.Proto[0] : "tcp"}
                    />
                </>
            )}
            {(params.Mode === "all" || params.Mode === "syn") && (
                <>
                    <Divider orientation={"left"}>{t("portscan.networkCardConfig")}</Divider>
                    <Form.Item label={<span>{t("portscan.networkCardSelect")}</span>}>
                        <YakitSelect
                            showSearch
                            options={netInterfaceList}
                            placeholder={t("portscan.pleaseSelect")}
                            size='small'
                            value={params.SynScanNetInterface}
                            onChange={(netInterface) => {
                                setInterface && setInterface(true)
                                setParams({ ...params, SynScanNetInterface: netInterface })
                            }}
                            maxTagCount={100}
                        />
                        <YakitButton onClick={updateGlobalNetworkConfig} size='small'>
                            {t("portscan.syncToGlobalNetworkConfig")}
                        </YakitButton>
                    </Form.Item>
                </>
            )}
            {!isSimpleDetectShow && (params.Mode === "all" || params.Mode === "syn") && (
                <>
                    <Divider orientation={"left"}>{t("portscan.synConfig")}</Divider>
                    <InputInteger
                        label={t("portscan.synConcurrent")}
                        help={t("portscan.synConcurrentHelp")}
                        value={params.SynConcurrent}
                        min={10}
                        setValue={(e) => setParams({ ...params, SynConcurrent: e })}
                    />
                </>
            )}
            {(params.Mode === "all" || params.Mode === "fingerprint") && (
                <>
                    <Divider orientation={"left"}>{t("portscan.fingerprintScanConfig")}</Divider>
                    {isSimpleDetectShow && (
                        <>
                            <Form.Item label={t("portscan.presetPort")} className='form-item-margin'>
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
                                            setParams({ ...params, Ports: res })
                                        }
                                        setPortroupValue(value)
                                    }}
                                >
                                    <Checkbox value={"fast"}>{t("portscan.fast")}</Checkbox>
                                    <Checkbox value={"middle"}>{t("portscan.middle")}</Checkbox>
                                    <Checkbox value={"slow"}>{t("portscan.slow")}</Checkbox>
                                    <Checkbox value={"top100"}>{t("portscan.top100")}</Checkbox>
                                    <Checkbox value={"topweb"}>{t("portscan.topweb")}</Checkbox>
                                    <Checkbox value={"top1000+"}>{t("portscan.top1000+")}</Checkbox>
                                    <Checkbox value={"topdb"}>{t("portscan.topdb")}</Checkbox>
                                    <Checkbox value={"topudp"}>{t("portscan.topudp")}</Checkbox>
                                    <Checkbox value={"defect"}>{t("portscan.defect")}</Checkbox>
                                    <Checkbox value={"all"}>{t("portscan.all")}</Checkbox>
                                </Checkbox.Group>
                            </Form.Item>

                            <Form.Item label={t("portscan.scanPort")} className='form-item-margin' style={{ position: "relative" }}>
                                <Input.TextArea
                                    style={{ width: "100%" }}
                                    rows={2}
                                    value={params.Ports}
                                    onChange={(e) => setParams({ ...params, Ports: e.target.value })}
                                />
                                <Space size={"small"} style={{ marginLeft: 8, position: "absolute", bottom: 0 }}>
                                    <Tooltip title={t("portscan.resetToDefaultPort")}>
                                        <a
                                            href={"#"}
                                            onClick={() => {
                                                setParams({ ...params, Ports: PresetPorts["top100"] })
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
                        label={t("portscan.fingerprintScanConcurrency")}
                        // help={"推荐最多同时扫描200个端口"}
                        value={params.Concurrent}
                        min={1}
                        // max={200}
                        setValue={(e) => setParams({ ...params, Concurrent: e })}
                    />
                    <SwitchItem
                        label={t("portscan.activeMode")}
                        help={t("portscan.activeModeHelp")}
                        setValue={(Active) => setParams({ ...params, Active })}
                        value={params.Active}
                    />
                    <SelectOne
                        label={t("portscan.serviceFingerprintLevel")}
                        help={t("portscan.serviceFingerprintLevelHelp")}
                        data={[
                            { value: 1, text: t("portscan.basic") },
                            { value: 3, text: t("portscan.middle") },
                            { value: 7, text: t("portscan.detailed") },
                            { value: 100, text: t("portscan.all") }
                        ]}
                        value={params.ProbeMax}
                        setValue={(ProbeMax) => setParams({ ...params, ProbeMax })}
                    />
                    <InputInteger
                        label={t("portscan.activePacketTimeout")}
                        help={t("portscan.activePacketTimeoutHelp")}
                        value={params.ProbeTimeout}
                        setValue={(ProbeTimeout) => setParams({ ...params, ProbeTimeout })}
                    />
                    {!isSimpleDetectShow && (
                        <ManyMultiSelectForString
                            label={t("portscan.tcpProxy")}
                            help={t("portscan.tcpProxyHelp")}
                            data={[
                                "http://127.0.0.1:7890",
                                "http://127.0.0.1:8082",
                                "socks5://127.0.0.1:8082",
                                "http://127.0.0.1:8083"
                            ].map((i) => {
                                return { value: i, label: i }
                            })}
                            value={(params.Proxy || []).join(",")}
                            mode={"tags"}
                            setValue={(e) => setParams({ ...params, Proxy: (e || "").split(",").filter((i) => !!i) })}
                        />
                    )}
                    <SelectOne
                        label={t("portscan.advancedFingerprintOptions")}
                        data={[
                            { value: "web", text: t("portscan.onlyWebFingerprint") },
                            { value: "service", text: t("portscan.serviceFingerprint") },
                            { value: "all", text: t("portscan.allFingerprint") }
                        ]}
                        setValue={(FingerprintMode) => setParams({ ...params, FingerprintMode })}
                        value={params.FingerprintMode}
                    />
                    {isSimpleDetectShow && simpleParams && setSimpleParams && (
                        <>
                            <Divider orientation={"left"}>{t("portscan.bruteForceConfig")}</Divider>
                            <ContentUploadInput
                                type='textarea'
                                dragger={{
                                    disabled: false,
                                    accept: typeArr.join(",")
                                }}
                                beforeUpload={(f) => {
                                    if (!typeArr.includes(f.type)) {
                                        failed(t("portscan.invalidFileType", { name: f.name }))
                                        return false
                                    }
                                    setSimpleParams({
                                        ...simpleParams,
                                        UsernameFile: f.path
                                    })
                                    return false
                                }}
                                item={{
                                    style: { textAlign: "left" },
                                    label: t("portscan.userDict")
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
                                            style={{ marginLeft: 16 }}
                                            onChange={() => {
                                                setSimpleParams({
                                                    ...simpleParams,
                                                    ReplaceDefaultUsernameDict: !simpleParams.ReplaceDefaultUsernameDict
                                                })
                                            }}
                                        >
                                            {t("portscan.useDefaultUserDict")}
                                        </Checkbox>
                                        {simpleParams.UsernameFile && (
                                            <div>
                                                <PaperClipOutlined />
                                                <span style={{ marginLeft: 6, color: "#198fff" }}>
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
                                        failed(t("portscan.invalidFileType", { name: f.name }))
                                        return false
                                    }
                                    setSimpleParams({
                                        ...simpleParams,
                                        PasswordFile: f.path
                                    })
                                    return false
                                }}
                                item={{
                                    style: { textAlign: "left" },
                                    label: t("portscan.passwordDict")
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
                                            style={{ marginLeft: 16 }}
                                            onChange={() => {
                                                setSimpleParams({
                                                    ...simpleParams,
                                                    ReplaceDefaultPasswordDict: !simpleParams.ReplaceDefaultPasswordDict
                                                })
                                            }}
                                        >
                                            {t("portscan.useDefaultPasswordDict")}
                                        </Checkbox>
                                        {simpleParams.PasswordFile && (
                                            <div>
                                                <PaperClipOutlined />
                                                <span style={{ marginLeft: 6, color: "#198fff" }}>
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
                                label={t("portscan.targetConcurrent")}
                                help={t("portscan.targetConcurrentHelp")}
                                value={simpleParams.Concurrent}
                                setValue={(e) => setSimpleParams({ ...simpleParams, Concurrent: e })}
                            />
                            <InputInteger
                                label={t("portscan.innerTargetConcurrent")}
                                help={t("portscan.innerTargetConcurrentHelp")}
                                value={simpleParams.TargetTaskConcurrent}
                                setValue={(e) => setSimpleParams({ ...simpleParams, TargetTaskConcurrent: e })}
                            />
                            <SwitchItem
                                label={t("portscan.autoStop")}
                                help={t("portscan.autoStopHelp")}
                                setValue={(OkToStop) => setSimpleParams({ ...simpleParams, OkToStop })}
                                value={simpleParams.OkToStop}
                            />
                            <InputInteger
                                label={t("portscan.minDelay")}
                                max={simpleParams.DelayMax}
                                min={0}
                                setValue={(DelayMin) => setSimpleParams({ ...simpleParams, DelayMin })}
                                value={simpleParams.DelayMin}
                            />
                            <InputInteger
                                label={t("portscan.maxDelay")}
                                setValue={(DelayMax) => setSimpleParams({ ...simpleParams, DelayMax })}
                                value={simpleParams.DelayMax}
                                min={simpleParams.DelayMin}
                            />
                        </>
                    )}
                    <Divider orientation={"left"}>{t("portscan.basicCrawlerConfig")}</Divider>
                    <Form.Item
                        label={t("portscan.crawlerSettings")}
                        help={t("portscan.crawlerSettingsHelp")}
                    >
                        <Space>
                            <Checkbox
                                onChange={(e) => setParams({ ...params, EnableBasicCrawler: e.target.checked })}
                                checked={params.EnableBasicCrawler}
                            >
                                {t("portscan.enableCrawler")}
                            </Checkbox>
                            <InputNumber
                                addonBefore={t("portscan.crawlerRequestCount")}
                                value={params.BasicCrawlerRequestMax}
                                onChange={(e) => setParams({ ...params, BasicCrawlerRequestMax: e as number })}
                            />
                        </Space>
                    </Form.Item>
                </>
            )}

            <Divider orientation={"left"}>{t("portscan.otherConfig")}</Divider>
            <SwitchItem
                label={t("portscan.saveToDB")}
                setValue={(SaveToDB) => {
                    setParams({ ...params, SaveToDB, SaveClosedPorts: false })
                }}
                value={params.SaveToDB}
            />
            {params.SaveToDB && (
                <SwitchItem
                    label={t("portscan.saveClosedPorts")}
                    setValue={(SaveClosedPorts) => setParams({ ...params, SaveClosedPorts })}
                    value={params.SaveClosedPorts}
                />
            )}
            <SwitchItem
                label={t("portscan.autoScanCClass")}
                help={t("portscan.autoScanCClassHelp")}
                value={params.EnableCClassScan}
                setValue={(EnableCClassScan) => setParams({ ...params, EnableCClassScan })}
            />
            <SwitchItem
                label={t("portscan.skipHostAliveScan")}
                help={t("portscan.hostAliveScanHelp")}
                value={params.SkippedHostAliveScan}
                setValue={(SkippedHostAliveScan) => setParams({ ...params, SkippedHostAliveScan })}
            />
            {!params.SkippedHostAliveScan && (
                <>
                    <InputInteger
                        label={t("portscan.hostAliveConcurrent")}
                        value={params.HostAliveConcurrent}
                        setValue={(HostAliveConcurrent) => setParams({ ...params, HostAliveConcurrent })}
                    />
                    <InputItem
                        label={t("portscan.tcpPingPort")}
                        help={t("portscan.tcpPingPortHelp")}
                        value={params.HostAlivePorts}
                        setValue={(HostAlivePorts) => setParams({ ...params, HostAlivePorts })}
                    />
                </>
            )}
            <InputItem
                label={t("portscan.excludeHosts")}
                setValue={(ExcludeHosts) => setParams({ ...params, ExcludeHosts })}
                value={params.ExcludeHosts}
            />
            <InputItem
                label={t("portscan.excludePorts")}
                setValue={(ExcludePorts) => setParams({ ...params, ExcludePorts })}
                value={params.ExcludePorts}
            />
        </Form>
    )
}
