import React, {useEffect, useRef, useState} from "react"
import {PortScanExecuteExtraFormValue} from "./NewPortScanType"
import {Checkbox, Form, FormInstance, Tooltip} from "antd"
import {useCreation, useMemoizedFn} from "ahooks"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import styles from "./NewPortScanExtraParamsDrawer.module.scss"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {ScanKind, ScanKindKeys, defaultPorts} from "@/pages/portscan/PortScanPage"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SelectOptionProps} from "@/pages/fuzzer/HTTPFuzzerPage"
import {GlobalNetworkConfig, defaultParams} from "@/components/configNetwork/ConfigNetworkPage"
import {PcapMetadata} from "@/models/Traffic"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {defPortScanExecuteExtraFormValue} from "./NewPortScan"
import {yakitInfo} from "@/utils/notification"
import {apiGetGlobalNetworkConfig, apiGetPcapMetadata, apiSetGlobalNetworkConfig} from "@/pages/spaceEngine/utils"
import cloneDeep from "lodash/cloneDeep"
import {OutlineRefreshIcon} from "@/assets/icon/outline"
import {CheckboxValueType} from "antd/lib/checkbox/Group"
import {PresetPorts} from "@/pages/portscan/schema"
import {isEnpriTraceAgent} from "@/utils/envfile"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"
import {grpcFetchLocalFingerprintGroupList} from "@/pages/fingerprintManage/api"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const {YakitPanel} = YakitCollapse

interface NewPortScanExtraParamsDrawerProps {
    extraParamsValue: PortScanExecuteExtraFormValue
    visible: boolean
    onSave: (v: PortScanExecuteExtraFormValue) => void
}
/**其他配置 */
const defaultOtherSetting = {
    SaveToDB: defPortScanExecuteExtraFormValue.SaveToDB,
    SaveClosedPorts: defPortScanExecuteExtraFormValue.SaveClosedPorts,
    EnableCClassScan: defPortScanExecuteExtraFormValue.EnableCClassScan,
    SkippedHostAliveScan: defPortScanExecuteExtraFormValue.SkippedHostAliveScan,
    HostAliveConcurrent: defPortScanExecuteExtraFormValue.HostAliveConcurrent,
    ExcludeHosts: defPortScanExecuteExtraFormValue.ExcludeHosts,
    ExcludePorts: defPortScanExecuteExtraFormValue.ExcludePorts
}
/**爬虫设置 */
const defaultReptileSetting = {
    EnableBasicCrawler: defPortScanExecuteExtraFormValue.EnableBasicCrawler,
    BasicCrawlerRequestMax: defPortScanExecuteExtraFormValue.BasicCrawlerRequestMax,
    BasicCrawlerEnableJSParser: defPortScanExecuteExtraFormValue.BasicCrawlerEnableJSParser
}
/**指纹扫描配置 */
const defaultFingerprintSetting = {
    Concurrent: defPortScanExecuteExtraFormValue.Concurrent,
    Active: defPortScanExecuteExtraFormValue.Active,
    ProbeMax: defPortScanExecuteExtraFormValue.ProbeMax,
    ProbeTimeout: defPortScanExecuteExtraFormValue.ProbeTimeout,
    Proxy: defPortScanExecuteExtraFormValue.Proxy,
    FingerprintMode: defPortScanExecuteExtraFormValue.FingerprintMode,
    UserFingerprintFilesStr: defPortScanExecuteExtraFormValue.UserFingerprintFilesStr,
    EnableFingerprintGroup: defPortScanExecuteExtraFormValue.EnableFingerprintGroup,
    FingerprintGroup: defPortScanExecuteExtraFormValue.FingerprintGroup
}
/** SYN 配置 */
const defaultSYNSetting = {
    SynConcurrent: defPortScanExecuteExtraFormValue.SynConcurrent
}
/** 网卡配置 */
const defaultNetworkCard = {
    SynScanNetInterface: defPortScanExecuteExtraFormValue.SynScanNetInterface
}
const defaultExtraParamsFormValue = {
    网卡配置: defaultNetworkCard,
    "SYN 配置": defaultSYNSetting,
    指纹扫描配置: defaultFingerprintSetting,
    基础爬虫配置: defaultReptileSetting,
    其他配置: defaultOtherSetting
}
const NewPortScanExtraParamsDrawer: React.FC<NewPortScanExtraParamsDrawerProps> = React.memo((props) => {
    const {t} = useI18nNamespaces(["portscan", "yakitUi"])
    const {extraParamsValue, visible, onSave} = props
    const [form] = Form.useForm()
    useEffect(() => {
        if (visible) {
            form.setFieldsValue({...extraParamsValue})
        }
    }, [visible, extraParamsValue])
    const onClose = useMemoizedFn(() => {
        onSaveSetting()
    })
    const onSaveSetting = useMemoizedFn(() => {
        form.validateFields().then((formValue) => {
            onSave(formValue)
        })
    })
    return (
        <YakitDrawer
            className={styles["port-scan-execute-extra-params-drawer"]}
            visible={visible}
            onClose={onClose}
            width='65%'
            title={t("NewPortScanExecuteContent.extraParams")}
        >
            <Form size='small' labelWrap={true} labelCol={{span: 6}} wrapperCol={{span: 18}} form={form}>
                <NewPortScanExtraParams form={form} visible={visible} />
                <div className={styles["to-end"]}>{t("YakitEmpty.end_of_list")}</div>
            </Form>
        </YakitDrawer>
    )
})
export default NewPortScanExtraParamsDrawer

interface NewPortScanExtraParamsProps {
    form: FormInstance<PortScanExecuteExtraFormValue>
    visible: boolean
}
const NewPortScanExtraParams: React.FC<NewPortScanExtraParamsProps> = React.memo((props) => {
    const {t} = useI18nNamespaces(["portscan", "yakitUi"])
    const {form, visible} = props

    const [activeKey, setActiveKey] = useState<string[]>([
        "网卡配置",
        "SYN 配置",
        "指纹扫描配置",
        "基础爬虫配置",
        "其他配置"
    ])

    const mode = Form.useWatch("Mode", form)

    const protoList = useCreation(() => {
        return [
            {label: "TCP", value: "tcp"},
            {label: "UDP", value: "udp", disabled: mode === "syn" || mode === "all"}
        ]
    }, [mode])
    const onReset = useMemoizedFn((key) => {
        const value = defaultExtraParamsFormValue[key]
        form.setFieldsValue({
            ...value
        })
    })
    /**mode syn 对应的配置 */
    const synCollapseNode = useMemoizedFn(() => {
        return (
            <>
                <NetworkCardSettingsPanel key='网卡配置' visible={visible} />
                <YakitPanel
                    header={t("ScanPortForm.synConfig")}
                    key='SYN 配置'
                    extra={
                        <YakitButton
                            type='text'
                            colors='danger'
                            size='small'
                            onClick={(e) => {
                                e.stopPropagation()
                                onReset("SYN 配置")
                            }}
                        >
                            {t("YakitButton.reset")}
                        </YakitButton>
                    }
                >
                    <Form.Item
                        label={t("ScanPortForm.synConcurrent")}
                        name='SynConcurrent'
                        extra={t("ScanPortForm.synConcurrentHelp")}
                        style={{marginBottom: 0}}
                    >
                        <YakitInputNumber type='horizontal' min={0} />
                    </Form.Item>
                </YakitPanel>
            </>
        )
    })
    const renderContent = useMemoizedFn(() => {
        switch (mode) {
            // SYN
            case "syn":
                return (
                    <>
                        {synCollapseNode()}
                        <ScanOtherSettingsPanel key='其他配置' />
                    </>
                )
            //指纹
            case "fingerprint":
                return (
                    <>
                        <FingerprintSettingsPanel key='指纹扫描配置' />
                        <BasicCrawlerSettingsPanel key='基础爬虫配置' />
                        <ScanOtherSettingsPanel key='其他配置' />
                    </>
                )
            // all SYN+指纹
            default:
                return (
                    <>
                        {synCollapseNode()}
                        <FingerprintSettingsPanel key='指纹扫描配置' />
                        <BasicCrawlerSettingsPanel key='基础爬虫配置' />
                        <ScanOtherSettingsPanel key='其他配置' />
                    </>
                )
        }
    })
    return (
        <div className={styles["port-scan-params-wrapper"]}>
            <Form.Item
                label={t("ScanPortForm.scanMode")}
                name='Mode'
                initialValue='fingerprint'
                extra={t("ScanPortForm.synNeedRoot")}
            >
                <YakitRadioButtons
                    buttonStyle='solid'
                    options={ScanKindKeys.map((item) => ({
                        value: item,
                        label: ScanKind[item]
                    }))}
                />
            </Form.Item>
            <Form.Item label={t("ScanPortForm.scanProto")} name='scanProtocol' initialValue='tcp'>
                <YakitRadioButtons buttonStyle='solid' options={protoList} />
            </Form.Item>
            <YakitCollapse
                destroyInactivePanel={false}
                defaultActiveKey={activeKey}
                activeKey={activeKey}
                onChange={(key) => setActiveKey(key as string[])}
                bordered={false}
            >
                {renderContent()}
            </YakitCollapse>
        </div>
    )
})

interface NetworkCardSettingsPanelProps {
    visible: boolean
    key: string
}
/**网卡配置 */
export const NetworkCardSettingsPanel: React.FC<NetworkCardSettingsPanelProps> = React.memo((props) => {
    const {t} = useI18nNamespaces(["portscan", "yakitUi"])
    const {visible, key, ...restProps} = props
    const [netInterfaceList, setNetInterfaceList] = useState<SelectOptionProps[]>([]) // 代理代表

    const globalNetworkConfig = useRef<GlobalNetworkConfig | undefined>(cloneDeep(defaultParams))
    const form = Form.useFormInstance()
    useEffect(() => {
        if (!visible) return
        apiGetGlobalNetworkConfig()
            .then((rsp: GlobalNetworkConfig) => {
                globalNetworkConfig.current = rsp
                apiGetPcapMetadata().then((data: PcapMetadata) => {
                    if (!data || data.AvailablePcapDevices.length === 0) {
                        return
                    }
                    const interfaceList = data.AvailablePcapDevices.map((item) => ({
                        label: `${item.NetInterfaceName}-(${item.IP})`,
                        value: item.Name
                    }))
                    setNetInterfaceList(interfaceList)
                })
            })
            .catch(() => {
                globalNetworkConfig.current = undefined
            })
    }, [visible])
    const updateGlobalNetworkConfig = useMemoizedFn((e) => {
        e.stopPropagation()
        if (!globalNetworkConfig.current) return
        const synScanNetInterface = form.getFieldValue("SynScanNetInterface")
        const params: GlobalNetworkConfig = {
            ...globalNetworkConfig.current,
            SynScanNetInterface: synScanNetInterface
        }
        apiSetGlobalNetworkConfig(params).then(() => {
            yakitInfo(t("ScanPortForm.updateConfigSuccess"))
        })
    })
    const onReset = useMemoizedFn(() => {
        const value = defaultExtraParamsFormValue["网卡配置"]
        form.setFieldsValue({
            ...value
        })
    })
    return (
        <>
            <YakitPanel
                {...restProps} // 仅为了让Panel正确得渲染/展开折叠，暂无其他作用
                header={t("ScanPortForm.networkCardConfig")}
                key={key}
                extra={
                    <YakitButton
                        type='text'
                        colors='danger'
                        size='small'
                        onClick={(e) => {
                            e.stopPropagation()
                            onReset()
                        }}
                    >
                        {t("YakitButton.reset")}
                    </YakitButton>
                }
                className={styles["form-Panel"]}
            >
                <Form.Item
                    label={t("ScanPortForm.networkCardSelect")}
                    extra={
                        !isEnpriTraceAgent() && (
                            <YakitButton type='text' style={{paddingLeft: 0}} onClick={updateGlobalNetworkConfig}>
                                {t("ScanPortForm.syncToGlobalNetworkConfig")}
                            </YakitButton>
                        )
                    }
                    name='SynScanNetInterface'
                    style={{marginBottom: 0}}
                >
                    <YakitSelect allowClear placeholder={t("YakitSelect.pleaseSelect")} options={netInterfaceList} />
                </Form.Item>
            </YakitPanel>
        </>
    )
})

interface FingerprintSettingsPanelProps {
    isSimpleDetect?: boolean
    key: string
}
/**指纹扫描配置 */
export const FingerprintSettingsPanel: React.FC<FingerprintSettingsPanelProps> = React.memo((props) => {
    const {t} = useI18nNamespaces(["portscan", "yakitUi"])
    const {key, isSimpleDetect, ...restProps} = props
    const form = Form.useFormInstance()

    /**选择预设端口设置Ports值 */
    const onCheckPresetPort = useMemoizedFn((checkedValue: CheckboxValueType[]) => {
        let res: string = (checkedValue || [])
            .map((i) => {
                return PresetPorts[i as string] || ""
            })
            .join(",")
        if (checkedValue.includes("all")) {
            res = PresetPorts["all"] || ""
        }

        if (!!res) {
            form.setFieldsValue({Ports: res})
        }
    })
    const onReset = useMemoizedFn(() => {
        const value = defaultExtraParamsFormValue["指纹扫描配置"]
        if (isSimpleDetect) {
            form.setFieldsValue({
                ...value,
                Ports: PresetPorts["fast"],
                presetPort: ["fast"]
            })
        } else {
            form.setFieldsValue({
                ...value
            })
        }
    })
    const onResetPort = useMemoizedFn(() => {
        form.setFieldsValue({Ports: PresetPorts["fast"], presetPort: ["fast"]})
    })

    const enableFingerprintGroup = Form.useWatch("EnableFingerprintGroup")
    const [groupsOptions, setGroupsOptions] = useState<{label: string; value: string}[]>([
        {label: t("FingerprintSettingsPanel.allOption"), value: ""}
    ]) // 选全部的时候，默认传给后端的是空数组
    const onFingerprintGroupFocus = useMemoizedFn(() => {
        grpcFetchLocalFingerprintGroupList()
            .then(({Data}) => {
                const arr =
                    Data.map((item) => {
                        return {label: item.GroupName, value: item.GroupName}
                    }) || []
                arr.unshift({label: t("FingerprintSettingsPanel.allOption"), value: ""})
                setGroupsOptions(arr)
            })
            .catch(() => {})
    })

    return (
        <>
            <YakitPanel
                {...restProps} // 仅为了让Panel正确得渲染/展开折叠，暂无其他作用
                header={t("ScanPortForm.fingerprintScanConfig")}
                key={key}
                extra={
                    <YakitButton
                        type='text'
                        colors='danger'
                        size='small'
                        onClick={(e) => {
                            e.stopPropagation()
                            onReset()
                        }}
                    >
                        {t("YakitButton.reset")}
                    </YakitButton>
                }
            >
                {isSimpleDetect && (
                    <>
                        <Form.Item label={t("ScanPortForm.presetPort")} name='presetPort'>
                            <Checkbox.Group
                                className={styles["preset-port-group-wrapper"]}
                                onChange={onCheckPresetPort}
                            >
                                <YakitCheckbox value={"fast"}>{t("ScanPortForm.fast")}</YakitCheckbox>
                                <YakitCheckbox value={"middle"}>{t("ScanPortForm.middle")}</YakitCheckbox>
                                <YakitCheckbox value={"slow"}>{t("ScanPortForm.slow")}</YakitCheckbox>
                                <YakitCheckbox value={"top100"}>{t("ScanPortForm.top100")}</YakitCheckbox>
                                <YakitCheckbox value={"topweb"}>{t("ScanPortForm.topweb")}</YakitCheckbox>
                                <YakitCheckbox value={"top1000+"}>{t("ScanPortForm.top1000")}</YakitCheckbox>
                                <YakitCheckbox value={"topdb"}>{t("ScanPortForm.topdb")}</YakitCheckbox>
                                <YakitCheckbox value={"topudp"}>{t("ScanPortForm.topudp")}</YakitCheckbox>
                                <YakitCheckbox value={"defect"}>{t("ScanPortForm.defect")}</YakitCheckbox>
                                <YakitCheckbox value={"all"}>{t("ScanPortForm.all")}</YakitCheckbox>
                            </Checkbox.Group>
                        </Form.Item>
                        <Form.Item
                            label={t("ScanPortForm.scanPort")}
                            name='Ports'
                            extra={
                                <div className={styles["ports-form-extra"]}>
                                    <Tooltip title={t("ScanPortForm.resetToDefaultPort")}>
                                        <YakitButton type='text' icon={<OutlineRefreshIcon />} onClick={onResetPort}>
                                            {t("NewPortScanExecuteForm.defaultConfig")}
                                        </YakitButton>
                                    </Tooltip>
                                </div>
                            }
                            rules={[{required: true, message: "请输入扫描端口"}]}
                            initialValue={defaultPorts}
                        >
                            <YakitInput.TextArea rows={3} />
                        </Form.Item>
                    </>
                )}
                <Form.Item label={t("ScanPortForm.fingerprintScanConcurrency")} name='Concurrent'>
                    <YakitInputNumber type='horizontal' min={1} />
                </Form.Item>
                <Form.Item
                    label={t("ScanPortForm.activeMode")}
                    name='Active'
                    valuePropName='checked'
                    extra={t("ScanPortForm.activeModeHelp")}
                >
                    <YakitSwitch />
                </Form.Item>
                <Form.Item
                    label={t("ScanPortForm.serviceFingerprintLevel")}
                    name='ProbeMax'
                    extra={t("ScanPortForm.serviceFingerprintLevelHelp")}
                >
                    <YakitRadioButtons
                        buttonStyle='solid'
                        options={[
                            {value: 1, label: t("ScanPortForm.basic")},
                            {value: 3, label: "适中"},
                            {value: 7, label: t("ScanPortForm.detailed")},
                            {value: 100, label: t("FingerprintSettingsPanel.allOption")}
                        ]}
                    />
                </Form.Item>
                <Form.Item
                    label={t("ScanPortForm.activePacketTimeout")}
                    name='ProbeTimeout'
                    extra={t("ScanPortForm.activePacketTimeoutHelp")}
                >
                    <YakitInputNumber type='horizontal' min={1} />
                </Form.Item>
                <Form.Item label={t("ScanPortForm.tcpProxy")} name='Proxy' extra={t("ScanPortForm.tcpProxyHelp")}>
                    <YakitSelect
                        allowClear
                        placeholder={t("YakitSelect.pleaseSelect")}
                        options={[
                            "http://127.0.0.1:7890",
                            "http://127.0.0.1:8082",
                            "socks5://127.0.0.1:8082",
                            "http://127.0.0.1:8083"
                        ].map((i) => {
                            return {value: i, label: i}
                        })}
                        mode='tags'
                    />
                </Form.Item>
                <Form.Item label={t("ScanPortForm.advancedFingerprintOptions")} name='FingerprintMode'>
                    <YakitRadioButtons
                        buttonStyle='solid'
                        options={[
                            {value: "web", label: t("ScanPortForm.onlyWebFingerprint")},
                            {value: "service", label: t("ScanPortForm.serviceFingerprint")},
                            {value: "all", label: t("ScanPortForm.allFingerprint")}
                        ]}
                    />
                </Form.Item>
                {!isSimpleDetect && (
                    <>
                        <YakitFormDragger
                            formItemProps={{
                                name: "UserFingerprintFilesStr",
                                label: t("FingerprintSettingsPanel.customFingerprint")
                            }}
                            accept='.yaml,.yml'
                            help={t("FingerprintSettingsPanel.dragYamlFilesHelp")}
                            selectType='file'
                            multiple={true}
                        />
                        <Form.Item label={t("FingerprintSettingsPanel.useFingerprintLib")}>
                            <div className={styles["form-no-style-wrapper"]}>
                                <Form.Item noStyle name='EnableFingerprintGroup' valuePropName='checked'>
                                    <YakitSwitch />
                                </Form.Item>
                                <Form.Item noStyle name='FingerprintGroup'>
                                    <YakitSelect
                                        mode='multiple'
                                        autoFocus
                                        disabled={!enableFingerprintGroup}
                                        options={groupsOptions}
                                        onFocus={onFingerprintGroupFocus}
                                        onChange={(value) => {
                                            const val = value[value.length - 1]
                                            if (val !== "" && val !== undefined) {
                                                form.setFieldsValue({
                                                    FingerprintGroup: value.filter((item) => item)
                                                })
                                            } else {
                                                form.setFieldsValue({FingerprintGroup: [""]})
                                            }
                                        }}
                                    />
                                </Form.Item>
                            </div>
                        </Form.Item>
                    </>
                )}
            </YakitPanel>
        </>
    )
})

interface BasicCrawlerSettingsPanelProps {
    key: string
}
/** 基础爬虫配置 */
export const BasicCrawlerSettingsPanel: React.FC<BasicCrawlerSettingsPanelProps> = React.memo((props) => {
    const {t} = useI18nNamespaces(["portscan", "yakitUi"])
    const {key, ...restProps} = props
    const form = Form.useFormInstance()
    const enableBasicCrawler = Form.useWatch("EnableBasicCrawler", form)
    const onReset = useMemoizedFn(() => {
        const value = defaultExtraParamsFormValue["基础爬虫配置"]
        form.setFieldsValue({
            ...value
        })
    })
    return (
        <>
            <YakitPanel
                {...restProps} // 仅为了让Panel正确得渲染/展开折叠，暂无其他作用
                header={t("ScanPortForm.basicCrawlerConfig")}
                key={key}
                extra={
                    <YakitButton
                        type='text'
                        colors='danger'
                        size='small'
                        onClick={(e) => {
                            e.stopPropagation()
                            onReset()
                        }}
                    >
                        {t("YakitButton.reset")}
                    </YakitButton>
                }
            >
                <Form.Item label={t("ScanPortForm.crawlerSettings")} extra={t("ScanPortForm.crawlerSettingsHelp")}>
                    <div className={styles["form-no-style-wrapper"]}>
                        <Form.Item noStyle name='EnableBasicCrawler' valuePropName='checked'>
                            <YakitCheckbox />
                        </Form.Item>
                        <Form.Item noStyle name='BasicCrawlerRequestMax'>
                            <YakitInputNumber min={1} addonBefore={t("ScanPortForm.crawlerRequestCount")} />
                        </Form.Item>
                    </div>
                </Form.Item>
                {enableBasicCrawler && (
                    <Form.Item
                        label={t("FingerprintSettingsPanel.jsSsaParser")}
                        name='BasicCrawlerEnableJSParser'
                        valuePropName='checked'
                        extra={t("FingerprintSettingsPanel.jsSsaParserHelp")}
                    >
                        <YakitSwitch />
                    </Form.Item>
                )}
            </YakitPanel>
        </>
    )
})

interface ScanOtherSettingsPanelProps {
    key: string
}
export const ScanOtherSettingsPanel: React.FC<ScanOtherSettingsPanelProps> = React.memo((props) => {
    const {t} = useI18nNamespaces(["portscan", "yakitUi"])
    const {key, ...restProps} = props
    const form = Form.useFormInstance()
    const skippedHostAliveScan = Form.useWatch("SkippedHostAliveScan", form)
    const saveToDB = Form.useWatch("SaveToDB", form)
    const onReset = useMemoizedFn(() => {
        const value = defaultExtraParamsFormValue["其他配置"]
        form.setFieldsValue({
            ...value
        })
    })
    return (
        <>
            <YakitPanel
                {...restProps} // 仅为了让Panel正确得渲染/展开折叠，暂无其他作用
                header={t("ScanPortForm.otherConfig")}
                key={key}
                extra={
                    <YakitButton
                        type='text'
                        colors='danger'
                        size='small'
                        onClick={(e) => {
                            e.stopPropagation()
                            onReset()
                        }}
                    >
                        {t("YakitButton.reset")}
                    </YakitButton>
                }
            >
                <Form.Item label={t("ScanPortForm.saveToDB")} name='SaveToDB' valuePropName='checked'>
                    <YakitSwitch />
                </Form.Item>
                {saveToDB && (
                    <>
                        <Form.Item
                            label={t("ScanPortForm.saveClosedPorts")}
                            name='SaveClosedPorts'
                            valuePropName='checked'
                        >
                            <YakitSwitch />
                        </Form.Item>
                    </>
                )}

                <Form.Item
                    label={t("ScanPortForm.autoScanCClass")}
                    name='EnableCClassScan'
                    valuePropName='checked'
                    extra={t("ScanPortForm.autoScanCClassHelp")}
                >
                    <YakitSwitch />
                </Form.Item>
                <Form.Item
                    label={t("ScanPortForm.skipHostAliveScan")}
                    name='SkippedHostAliveScan'
                    valuePropName='checked'
                    extra={t("ScanPortForm.hostAliveScanHelp")}
                >
                    <YakitSwitch />
                </Form.Item>
                {!skippedHostAliveScan && (
                    <>
                        <Form.Item label={t("ScanPortForm.hostAliveConcurrent")} name='HostAliveConcurrent'>
                            <YakitInputNumber type='horizontal' min={1} />
                        </Form.Item>
                        <Form.Item
                            label={t("ScanPortForm.tcpPingPort")}
                            name='HostAlivePorts'
                            extra={t("ScanPortForm.tcpPingPortHelp")}
                        >
                            <YakitInput placeholder={t("YakitInput.please_enter")} />
                        </Form.Item>
                    </>
                )}

                <Form.Item label={t("ScanPortForm.excludeHosts")} name='ExcludeHosts'>
                    <YakitInput placeholder={t("YakitInput.please_enter")} />
                </Form.Item>
                <Form.Item label={t("ScanPortForm.excludePorts")} name='ExcludePorts'>
                    <YakitInput placeholder={t("YakitInput.please_enter")} />
                </Form.Item>
            </YakitPanel>
        </>
    )
})
