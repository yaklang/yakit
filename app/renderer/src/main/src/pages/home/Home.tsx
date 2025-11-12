import React, {useEffect, useMemo, useRef, useState, ReactElement, CSSProperties} from "react"
import classNames from "classnames"
import {
    PublicBlastingIcon,
    PublicBruteIcon,
    PublicCodecIcon,
    PublicDNSLogIcon,
    PublicDirectoryScanningIcon,
    PublicMitmIcon,
    PublicPayloadGeneraterIcon,
    PublicPublicToolLightbulbIcon,
    PublicScanPortIcon,
    PublicSequenceAnimationIcon,
    PublicToolBasicCrawlerIcon,
    PublicToolCVEIcon,
    PublicToolDBDomainIcon,
    PublicToolDBHTTPHistoryIcon,
    PublicToolDBReportIcon,
    PublicToolDBRiskIcon,
    PublicToolDataCompareIcon,
    PublicToolICMPSizeLogIcon,
    PublicToolModScanPortIcon,
    PublicToolPayloadIcon,
    PublicToolPluginHubIcon,
    PublicToolReverseServerIcon,
    PublicToolScreenRecorderPageIcon,
    PublicToolScreenRecordingIcon,
    PublicToolScreenshotIcon,
    PublicToolShellReceiverIcon,
    PublicToolSpaceEngineIcon,
    PublicToolSubDomainCollectionIcon,
    PublicToolTCPPortLogIcon,
    PublicToolVulinboxIcon,
    PublicToolWebsocketFuzzerIcon,
    PublicToolYakScriptIcon,
    PublicWebFuzzerIcon
} from "@/routes/publicIcon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SolidCheckIcon, SolidExclamationIcon, SolidPlayIcon} from "@/assets/icon/solid"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {BlastingAnimationAemonstration} from "../fuzzer/HTTPFuzzerPage"
import {
    OutlineArrowrightIcon,
    OutlineBugIcon,
    OutlineChartbarIcon,
    OutlineChevronupIcon,
    OutlineDatabaseIcon,
    OutlineDesktopcomputerIcon,
    OutlineModScanPortDataIcon,
    OutlineQuestionmarkcircleIcon
} from "@/assets/icon/outline"
import {SequenceAnimationAemonstration} from "../fuzzer/FuzzerSequence/FuzzerSequence"
import {YakitRoute} from "@/enums/yakitRoute"
import emiter from "@/utils/eventBus/eventBus"
import {RouteToPageProps} from "../layout/publicMenu/PublicMenu"
import {usePluginToId} from "@/store/publicMenu"
import {ResidentPluginName} from "@/routes/newRoute"
import {Form, Tooltip} from "antd"
import {useDebounceEffect, useGetState, useInViewport, useMemoizedFn, useThrottleFn} from "ahooks"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {MITMConsts} from "../mitm/MITMConsts"
import {CacheDropDownGV, RemoteGV} from "@/yakitGV"
import {openABSFileLocated} from "@/utils/openWebsite"
import {yakitNotify} from "@/utils/notification"
import {YakitSystem} from "@/yakitGVDefine"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {ShieldCheckIcon as AllShieldCheckIcon} from "@/components/layout/globalStateIcon"
import {useScreenRecorder} from "@/store/screenRecorder"
import numeral from "numeral"
import {CloudDownloadIcon} from "@/assets/newIcon"
import {getEnvTypeByProjects, ProjectDescription} from "../softwareSettings/ProjectManage"
import {YakQueryHTTPFlowResponse} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {FieldName, Fields} from "../risks/RiskTable"
import {apiQueryYakScriptTotal} from "../plugins/utils"
import {YakitGetOnlinePlugin} from "../mitm/MITMServerHijacking/MITMPluginLocalList"
import {apiQueryPortsBase} from "../assetViewer/PortTable/utils"
import {QueryPortsRequest} from "../assetViewer/PortAssetPage"
import {getReleaseEditionName, isEnpriTrace, isEnpriTraceAgent} from "@/utils/envfile"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import ReactResizeDetector from "react-resize-detector"
import {SolidBorderDocumentTextIcon} from "@/assets/icon/colors"
import {CONST_DEFAULT_ENABLE_INITIAL_PLUGIN} from "../mitm/MITMPage"
import {PluginHubPageInfoProps} from "@/store/pageInfo"
import {WebsiteGV} from "@/enums/website"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {toMITMHacker} from "../hacker/httpHacker"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import styles from "./home.module.scss"

const {ipcRenderer} = window.require("electron")

export const convertToBytes = (size: number, unit: string) => {
    const units = {
        B: 1,
        KB: 1024,
        MB: 1024 ** 2,
        GB: 1024 ** 3,
        TB: 1024 ** 4
    }
    return size * (units[unit.toUpperCase()] || 1)
}

interface ToolInfo {
    label: string
    icon: ReactElement
    iconStyle?: CSSProperties
    desc: string
    rightIcon: ReactElement
    onClick: () => void
}

interface HomeProp {}
const Home: React.FC<HomeProp> = (props) => {
    const {t, i18n} = useI18nNamespaces(["yakitUi", "yakitRoute", "home"])
    const homeRef = useRef(null)
    const [inViewport] = useInViewport(homeRef)
    const {pluginToId} = usePluginToId()
    const isRunRef = useRef<boolean>(false)
    const [timeInterval, setTimeInterval, getTimeInterval] = useGetState<number>(5)
    const timeRef = useRef<any>(null)
    const [showMitmDropdown, setShowMitmDropdown] = useState<boolean>(false)
    const showMitmDropdownRef = useRef<boolean>(showMitmDropdown)
    const mitmDropdownRef = useRef<HTMLDivElement>(null)
    const [showMITMCertWarn, setShowMITMCertWarn] = useState<boolean>(false)
    const [form] = Form.useForm()
    const hostWatch = Form.useWatch("host", form)
    const portWatch = Form.useWatch("port", form)
    const [scanningCheck, setScanningCheck] = useState<string>("specialVulnerabilityDetection")
    const [showScanningDropdown, setShowScanningDropdown] = useState<boolean>(false)
    const scanningdropdownRef = useRef<HTMLDivElement>(null)
    const [pcap, setPcap] = useState<{
        IsPrivileged: boolean
        Advice: string
        AdviceVerbose: string
    }>({Advice: "unknown", AdviceVerbose: t("Home.pcapSupportInfoFailed"), IsPrivileged: false})
    const [system, setSystem] = useState<YakitSystem>("Darwin")
    const [pcapHintShow, setPcapHintShow] = useState<boolean>(false)
    const [pcapResult, setPcapResult] = useState<boolean>(false)
    const [pcapHintLoading, setPcapHintLoading] = useState<boolean>(false)
    const {screenRecorderInfo} = useScreenRecorder()
    const [searchToolVal, setSearchToolVal] = useState<string>("")
    const toolsList = useMemo(() => {
        return [
            {
                label: t("YakitRoute.YakRunner"),
                icon: <PublicToolYakScriptIcon />,
                iconStyle: {backgroundColor: "#8863f7", padding: 1},
                desc: t("YakitRoute.yaklangProgramming"),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.YakScript})
            },
            {
                label: t("Home.targetRangeVulinbox"),
                icon: <PublicToolVulinboxIcon />,
                desc: t("Home.built-inYakTargetRange", {name: t("YakitRoute.Yak")}),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.Beta_VulinboxManager})
            },
            {
                label: t("YakitRoute.Payload"),
                icon: <PublicToolPayloadIcon />,
                desc: t("YakitRoute.customPayload"),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.PayloadManager})
            },
            {
                label: t("YakitRoute.dataCompare"),
                icon: <PublicToolDataCompareIcon />,
                desc: t("YakitRoute.quicklyIdentifyDifferencesInData"),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.DataCompare})
            },
            {
                label: t("YakitRoute.cVEManagement"),
                icon: <PublicToolCVEIcon />,
                desc: t("YakitRoute.searchAndQueryCVEData"),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.DB_CVE})
            },
            {
                label: t("YakitRoute.pluginHub"),
                icon: <PublicToolPluginHubIcon />,
                iconStyle: {backgroundColor: "#F4736B", padding: 1},
                desc: t("YakitRoute.massiveYakitPluginsOne-ClickDownload"),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.Plugin_Hub})
            },
            {
                label: t("YakitRoute.portListener"),
                icon: <PublicToolShellReceiverIcon />,
                desc: t("YakitRoute.reverseShellTool"),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.ShellReceiver})
            },
            {
                label: t("YakitRoute.Websocket Fuzzer"),
                icon: <PublicToolWebsocketFuzzerIcon />,
                desc: t("YakitRoute.fuzzTestingForWebSocketPackets"),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.WebsocketFuzzer})
            },
            {
                label: t("YakitRoute.subdomainCollection"),
                icon: <PublicToolSubDomainCollectionIcon />,
                desc: t("Home.collectSubdomainsRelatedToTargetAssets"),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () =>
                    onMenu({
                        route: YakitRoute.Plugin_OP,
                        pluginId: pluginToId[ResidentPluginName.SubDomainCollection],
                        pluginName: ResidentPluginName.SubDomainCollection
                    })
            },
            {
                label: t("YakitRoute.basicCrawler"),
                icon: <PublicToolBasicCrawlerIcon />,
                desc: t("Home.collectAllPageInformationOfTargetAssets"),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () =>
                    onMenu({
                        route: YakitRoute.Plugin_OP,
                        pluginId: pluginToId[ResidentPluginName.BasicCrawler],
                        pluginName: ResidentPluginName.BasicCrawler
                    })
            },
            {
                label: t("YakitRoute.spaceEngine"),
                icon: <PublicToolSpaceEngineIcon />,
                desc: t("Home.integrateMultipleEnginesToCollectAssetInformation"),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.Space_Engine})
            },
            {
                label: t("YakitRoute.ICMP-SizeLog"),
                icon: <PublicToolICMPSizeLogIcon />,
                desc: t("YakitRoute.detectICMPCallbackViaPingWithSpecificPacketSize"),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.ICMPSizeLog})
            },
            {
                label: t("YakitRoute.TCP-PortLog"),
                icon: <PublicToolTCPPortLogIcon />,
                desc: t("YakitRoute.detectTCPCallbackViaRandomClosedPorts"),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.TCPPortLog})
            },
            {
                label: t("YakitRoute.reverseServer"),
                icon: <PublicToolReverseServerIcon />,
                desc: t("YakitRoute.simultaneouslyProvideHTTP/RMI/HTTPSReverseConnectionsOnOnePort"),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.ReverseServer_New})
            },
            {
                label: t("YakitRoute.History"),
                icon: <PublicToolDBHTTPHistoryIcon />,
                desc: t("YakitRoute.viewAndManageAllHistoricalTrafficFromMITMPluginsAndFuzzing"),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.DB_HTTPHistory})
            },
            {
                label: t("YakitRoute.report"),
                icon: <PublicToolDBReportIcon />,
                desc: t("YakitRoute.viewAndManageReportsGeneratedDuringScanning"),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.DB_Report})
            },
            {
                label: t("Home.vulnerabilityRiskStatistics"),
                icon: <PublicToolDBRiskIcon />,
                desc: t("YakitRoute.manageAllDetectedVulnerabilitiesAndRisks"),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.DB_Risk})
            },
            {
                label: t("YakitRoute.portAssets"),
                icon: <PublicToolModScanPortIcon />,
                desc: t("YakitRoute.manageAllDiscoveredPortAssets"),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.DB_Ports})
            },
            {
                label: t("YakitRoute.domainAssets"),
                icon: <PublicToolDBDomainIcon />,
                desc: t("YakitRoute.manageAllDiscoveredDomainAssets"),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.DB_Domain})
            },
            {
                label: t("Home.screenRecording"),
                icon: <PublicToolScreenRecordingIcon />,
                desc: t("Home.recordScreenActivities"),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => !screenRecorderInfo.isRecording && ipcRenderer.invoke("send-open-screenCap-modal")
            },
            {
                label: t("Home.screenshot"),
                icon: <PublicToolScreenshotIcon />,
                desc: t("Home.captureScreenIntoImage"),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => ipcRenderer.invoke("activate-screenshot")
            },
            {
                label: t("YakitRoute.recordingManagement"),
                icon: <PublicToolScreenRecorderPageIcon />,
                desc: t("YakitRoute.manageAllRecordedVideoFiles"),
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.ScreenRecorderPage})
            }
        ] as ToolInfo[]
    }, [screenRecorderInfo, i18n.language, pluginToId])
    const [curProjectInfo, setCurProjectInfo] = useState<ProjectDescription>()
    const [historyData, setHistoryData] = useState<number>(0)
    const [riskLevelData, setRiskLevelData] = useState<FieldName[]>([])
    const [portTotal, setPortTotal] = useState<number>(0)
    const [localPluginTotal, setLocalPluginTotal] = useState<number>(0)
    const [visibleOnline, setVisibleOnline] = useState<boolean>(false)

    useEffect(() => {
        showMitmDropdownRef.current = showMitmDropdown
    }, [showMitmDropdown])

    useEffect(() => {
        let timer: any = null
        getRemoteValue(RemoteGV.GlobalStateTimeInterval).then((time: any) => {
            setTimeInterval(+time || 5)
            if ((+time || 5) > 5) updateAllInfo()
            if (timer) clearInterval(timer)
            timer = setInterval(() => {
                setRemoteValue(RemoteGV.GlobalStateTimeInterval, `${getTimeInterval()}`)
            }, 20000)
        })

        getRemoteValue(CacheDropDownGV.MITMDefaultHostHistoryList).then((e) => {
            if (!!e) {
                try {
                    const obj = JSON.parse(e) || {}
                    form.setFieldsValue({host: obj.defaultValue})
                } catch (error) {
                    form.setFieldsValue({host: "127.0.0.1"})
                }
            } else {
                form.setFieldsValue({host: "127.0.0.1"})
            }
        })

        getRemoteValue(RemoteGV.HomeStartScanning).then((e) => {
            if (!!e) {
                setScanningCheck(e)
            } else {
                setScanningCheck("specialVulnerabilityDetection")
            }
        })

        // 获取系统
        ipcRenderer.invoke("fetch-system-name").then((systemName) => {
            setSystem(systemName)
        })

        // dropdown 点击外部关闭
        const handleClickOutside = (event) => {
            if (scanningdropdownRef.current && !scanningdropdownRef.current.contains(event.target)) {
                setShowScanningDropdown(false)
            }
            if (mitmDropdownRef.current && !mitmDropdownRef.current.contains(event.target)) {
                setTimeout(() => {
                    setShowMitmDropdown(false)
                }, 150)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    useDebounceEffect(
        () => {
            getRemoteValue(CacheDropDownGV.MITMDefaultHostHistoryList).then((e) => {
                if (!!e) {
                    try {
                        const obj = JSON.parse(e) || {}
                        form.setFieldsValue({host: obj.defaultValue})
                    } catch (error) {
                        form.setFieldsValue({host: "127.0.0.1"})
                    }
                } else {
                    form.setFieldsValue({host: "127.0.0.1"})
                }
            })
            getRemoteValue(MITMConsts.MITMDefaultPort).then((e) => {
                if (!!e) {
                    form.setFieldsValue({port: e})
                } else {
                    form.setFieldsValue({port: "8083"})
                }
            })
            getRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN).then((a) => {
                form.setFieldsValue({enableInitialPlugin: !!a})
            })

            updateProjectDbSize()
            undateHistoryData()
            undateRiskLevel()
            updatePortTotal()
            updateLocalPluginTotal()
        },
        [inViewport],
        {wait: 200}
    )

    // 修改查询间隔时间后
    useDebounceEffect(
        () => {
            if (timeRef.current) clearInterval(timeRef.current)
            timeRef.current = setInterval(updateAllInfo, timeInterval * 1000)

            return () => {
                isRunRef.current = false
                if (timeRef.current) clearInterval(timeRef.current)
                timeRef.current = null
            }
        },
        [timeInterval],
        {wait: 300}
    )

    const updateAllInfo = useMemoizedFn(() => {
        if (isRunRef.current) return
        isRunRef.current = true
        Promise.allSettled([updateMITMCert(), updatePcap()])
            .then((values) => {
                isRunRef.current = false
            })
            .catch(() => {})
    })

    // 打开页面
    const onMenu = (info: RouteToPageProps) => {
        if (!info.route) return
        emiter.emit("menuOpenPage", JSON.stringify(info))
    }
    // 打开页面 - 带参数
    const onMenuParams = (info: {route: YakitRoute; params: any}) => {
        if (!info.route) return
        emiter.emit("openPage", JSON.stringify(info))
    }

    // 获取是否安装MITM证书
    const updateMITMCert = useMemoizedFn(() => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("VerifySystemCertificate")
                .then((res) => {
                    if (res.valid) {
                        setShowMITMCertWarn(false)
                    } else {
                        setShowMITMCertWarn(true)
                    }
                    if (res.Reason != "") {
                        reject(`error-mitm-cert ${res.Reason}`)
                    }
                })
                .catch((e) => reject(`error-mitm-cert ${e}`))
                .finally(() => {
                    resolve("mitm-cert")
                })
        })
    })
    const showManualInstallGuide = useMemoizedFn(() => {
        const m = showYakitModal({
            type: "white",
            title: t("Home.generateAutoInstallScript"),
            width: "600px",
            centered: true,
            content: (
                <div style={{padding: 15}}>
                    {t("Home.pleaseFollowSteps")}
                    <br />
                    <br />
                    1. {t("Home.openScriptDir")}
                    <br />
                    2. {t("Home.runAutoInstallScript")}
                    <br />
                    3. {t("Home.installSuccessMessage")}
                    <br />
                    <br />
                    {t("Home.closeAppsBeforeRun")}
                    <br />
                    {t("Home.mitmReadyAfterInstall", {name: t("YakitRoute.MITM")})}
                    <br />
                    <br />
                    {t("Home.contactForHelp")}
                </div>
            ),
            onOk: () => {
                ipcRenderer
                    .invoke("generate-install-script", {})
                    .then((p: string) => {
                        if (p) {
                            openABSFileLocated(p)
                        } else {
                            yakitNotify("error", t("YakitNotification.generationFailed"))
                        }
                    })
                    .catch(() => {})
                m.destroy()
            }
        })
    })

    const renderAutoInstallSuggestion = (reason?: string) => {
        if (!reason) return null
        const lower = reason.toLowerCase()
        if (lower.includes("pkexec not found")) {
            return (
                <>
                    <br />
                    {t("home.cert.autoInstallPkexecHint")}
                </>
            )
        }
        if (lower.includes("authentication agent")) {
            return (
                <>
                    <br />
                    {t("home.cert.autoInstallAuthAgentHint")}
                </>
            )
        }
        return null
    }

    const showAutoInstallFailure = useMemoizedFn((reason?: string) => {
        const modal = showYakitModal({
            type: "white",
            title: t("home.cert.autoInstallFailedTitle"),
            width: "520px",
            centered: true,
            okText: t("home.cert.autoInstallFailedManualBtn"),
            cancelText: t("common.cancel"),
            content: (
                <div style={{padding: 15}}>
                    <div style={{marginBottom: 10}}>{t("home.cert.autoInstallFailedDesc")}</div>
                    <div style={{color: "var(--Colors-Use-Danger-Text)"}}>
                        {reason || t("home.cert.autoInstallUnknownError")}
                    </div>
                    {renderAutoInstallSuggestion(reason)}
                    <div style={{marginTop: 16}}>{t("home.cert.autoInstallGuideHint")}</div>
                </div>
            ),
            onOk: () => {
                modal.destroy()
                showManualInstallGuide()
            }
        })
    })

    // 下载安装MITM证书
    const handleAutoInstall = useMemoizedFn((e?: React.MouseEvent<HTMLElement>) => {
        e?.stopPropagation()
        yakitNotify("info", "正在尝试一键安装 MITM 证书，请允许系统弹窗/杀毒软件的权限请求")
        ipcRenderer
            .invoke("InstallMITMCertificate", {})
            .then((res: {Ok: boolean; Reason?: string}) => {
                if (res?.Ok) {
                    yakitNotify("success", "MITM 证书安装成功")
                    updateMITMCert()
                } else {
                    const reason = res?.Reason || "未知错误"
                    yakitNotify("error", `MITM 证书安装失败：${reason}`)
                    showAutoInstallFailure(reason)
                }
            })
            .catch((err) => {
                const reason = `${err}`
                yakitNotify("error", `MITM 证书安装失败：${reason}`)
                showAutoInstallFailure(reason)
            })
    })

    const handleManualInstall = useMemoizedFn((e?: React.MouseEvent<HTMLElement>) => {
        e?.stopPropagation()
        showManualInstallGuide()
    })


    // 爆破示例
    const handleBlastingExample = (animationType: string) => {
        const m = showYakitModal({
            type: "white",
            title: t("Home.webFuzzerDemo", {name: t("YakitRoute.WebFuzzer")}),
            width: 650,
            content: (
                <BlastingAnimationAemonstration
                    animationType={animationType}
                    videoStyle={{height: 410}}
                ></BlastingAnimationAemonstration>
            ),
            footer: null,
            centered: true,
            destroyOnClose: true,
            maskClosable: false
        })
    }

    // 演示动画
    const handleSequenceAnimation = (e) => {
        e.stopPropagation()
        const m = showYakitModal({
            type: "white",
            title: (
                <div className={styles["sequence-animation-pop-title"]}>
                    {t("Home.webFuzzerSequenceDemo", {name: t("YakitRoute.WebFuzzer")})}
                    <div
                        className={styles["subtitle-help-wrapper"]}
                        onClick={() => ipcRenderer.invoke("open-url", WebsiteGV.WebFuzzerAddress)}
                    >
                        <span className={styles["text-style"]}>{t("Home.officialDocs")}</span>
                        <OutlineQuestionmarkcircleIcon />
                    </div>
                </div>
            ),
            width: 650,
            content: <SequenceAnimationAemonstration></SequenceAnimationAemonstration>,
            footer: null,
            centered: true,
            destroyOnClose: true,
            maskClosable: false
        })
    }

    // 获取网卡操作权限
    const updatePcap = useMemoizedFn(() => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("IsPrivilegedForNetRaw", {})
                .then((res) => {
                    setPcap(res)
                    resolve("pcap")
                })
                .catch((e) => reject(`error-pcap ${e}`))
        })
    })

    // 开启PCAP权限
    const openPcapPower = useMemoizedFn(() => {
        setPcapHintLoading(true)
        ipcRenderer
            .invoke(`PromotePermissionForUserPcap`, {})
            .then(() => {
                setPcapResult(true)
            })
            .catch((e) => {
                yakitNotify("error", t("Home.pcapPermissionFailed") + `${e}`)
            })
            .finally(() => setPcapHintLoading(false))
    })

    // 开始扫描
    const handleOpenScanning = useMemoizedFn(() => {
        if (scanningCheck === "specialVulnerabilityDetection") {
            onMenu({route: YakitRoute.PoC})
        } else if (scanningCheck === "customDetection") {
            onMenu({route: YakitRoute.BatchExecutorPage})
        }
        setRemoteValue(RemoteGV.HomeStartScanning, scanningCheck)
    })

    // 工具箱渲染列表
    const renderToolsList = useMemo(() => {
        return searchToolVal
            ? toolsList.filter((v) => v.label.toLocaleLowerCase().includes(searchToolVal.toLocaleLowerCase()))
            : toolsList
    }, [searchToolVal, toolsList])

    // 项目名称
    const projectName = useMemo(() => {
        if (isEnpriTraceAgent()) return getReleaseEditionName()
        if (curProjectInfo?.ProjectName === "[temporary]") {
            return t("Home.temporary")
        } else {
            return curProjectInfo?.ProjectName ? curProjectInfo?.ProjectName : getReleaseEditionName()
        }
    }, [curProjectInfo, i18n.language])

    // 更新项目数据库大小
    const updateProjectDbSize = async () => {
        ipcRenderer
            .invoke("GetCurrentProjectEx", {
                Type: getEnvTypeByProjects()
            })
            .then((res: ProjectDescription) => {
                setCurProjectInfo(res)
            })
    }

    const judgeMoreTenGB = useMemo(() => {
        const arr: string[] = curProjectInfo?.FileSize.split(" ") || []
        if (arr[0] && arr[1]) {
            return convertToBytes(+arr[0], arr[1]) > convertToBytes(10, "GB")
        } else {
            return false
        }
    }, [curProjectInfo?.FileSize])

    // 更新流量数据
    const undateHistoryData = () => {
        const params = {
            SourceType: "mitm,scan,basic-crawler",
            WithPayload: false,
            Pagination: {
                Page: 1,
                Limit: 10,
                Order: "desc",
                OrderBy: "Id"
            }
        }
        ipcRenderer.invoke("QueryHTTPFlows", params).then((rsp: YakQueryHTTPFlowResponse) => {
            setHistoryData(rsp.Total)
        })
    }

    // 更新漏洞数据
    const undateRiskLevel = () => {
        ipcRenderer.invoke("QueryAvailableRiskLevel", {}).then((i: Fields) => {
            setRiskLevelData(i.Values)
        })
    }
    const riskLevelTotal = (verbose: string) => {
        return riskLevelData.find((item) => item.Verbose === verbose)?.Total || 0
    }

    // 更新端口数据
    const updatePortTotal = () => {
        const params: QueryPortsRequest = {
            Hosts: "",
            Ports: "",
            State: "open",
            Service: "",
            Title: "",
            TitleEffective: false,
            Keywords: "",
            ComplexSelect: "",
            RuntimeId: "",
            Pagination: {
                Limit: 20,
                Page: 1,
                OrderBy: "id",
                Order: "desc"
            },
            All: true,
            Order: "desc",
            OrderBy: "id"
        }
        apiQueryPortsBase(params).then((allRes) => {
            setPortTotal(Number(allRes.Total))
        })
    }

    // 更新本地插件
    const updateLocalPluginTotal = () => {
        apiQueryYakScriptTotal().then((res) => {
            setLocalPluginTotal(+res.Total)
        })
    }

    // 计算各个块的高度
    const mitmRef = useRef<any>(null)
    const webFuzzerRef = useRef<any>(null)
    const signlejumpRef = useRef<any>(null)
    const vulnerabilityRef = useRef<any>(null)
    const [watchWidth, setWatchWidth] = useState<number>(0)
    const adjustHeight = (container, wRadio: number, hRadio: number, minHeight: number, maxHeight: number) => {
        if (!container) return
        const width = container.getBoundingClientRect().width
        const height = (width * hRadio) / wRadio
        if (height > maxHeight) {
            container.style.height = maxHeight + "px"
            return
        }
        if (height < minHeight) {
            container.style.height = minHeight + "px"
            return
        }
        container.style.height = height + "px"
    }
    const calcMitmAndwebFuzzerMinHeight = () => {
        const screenWidth = document.body.getBoundingClientRect().width
        if (screenWidth <= 1220) return 350
        if (screenWidth <= 1920) return 400
        return 500
    }
    const calcMitmAndwebFuzzerMaxHeight = () => {
        const screenWidth = document.body.getBoundingClientRect().width
        if (screenWidth <= 1220) return 450
        if (screenWidth <= 1920) return 600
        return 650
    }
    const calcSignlejumpAndVulnerabilityMinHeight = () => {
        const screenWidth = document.body.getBoundingClientRect().width
        if (screenWidth <= 1220) return 260
        if (screenWidth <= 1920) return 275
        return 300
    }
    const calcSignlejumpAndVulnerabilityMaxHeight = () => {
        const screenWidth = document.body.getBoundingClientRect().width
        if (screenWidth <= 1220) return 275
        if (screenWidth <= 1920) return 290
        return 450
    }
    const resizeAdjustHeight = useThrottleFn(
        () => {
            adjustHeight(mitmRef.current, 16, 9, calcMitmAndwebFuzzerMinHeight(), calcMitmAndwebFuzzerMaxHeight())
            adjustHeight(webFuzzerRef.current, 16, 9, calcMitmAndwebFuzzerMinHeight(), calcMitmAndwebFuzzerMaxHeight())
            adjustHeight(
                signlejumpRef.current,
                16,
                9,
                calcSignlejumpAndVulnerabilityMinHeight(),
                calcSignlejumpAndVulnerabilityMaxHeight()
            )
            adjustHeight(
                vulnerabilityRef.current,
                16,
                9,
                calcSignlejumpAndVulnerabilityMinHeight(),
                calcSignlejumpAndVulnerabilityMaxHeight()
            )
        },
        {wait: 100}
    ).run
    useEffect(() => {
        resizeAdjustHeight()
    }, [watchWidth])

    return (
        <div className={styles["home-page-wrapper"]} ref={homeRef}>
            <YakitResizeBox
                isVer={false}
                lineDirection='left'
                firstNode={
                    <div className={styles["home-page-wrapper-left"]}>
                        <ReactResizeDetector
                            onResize={(w, h) => {
                                if (!w || !h) {
                                    return
                                }
                                setWatchWidth(w)
                            }}
                            handleHeight={true}
                        />
                        <div className={styles["left-row-wrapper"]}>
                            <div
                                ref={mitmRef}
                                className={classNames(styles["mitm-card"], styles["home-card"])}
                                onClick={() => {
                                    if (showMitmDropdown) return
                                    onMenu({route: YakitRoute.MITMHacker})
                                }}
                            >
                                <div className={styles["home-card-header"]}>
                                    <div className={styles["home-card-header-title"]}>
                                        <PublicMitmIcon className={styles["title-icon"]} />
                                        <span className={styles["title-text"]}>
                                            {t("YakitRoute.MITM Interactive Hijacking")}
                                        </span>
                                        <YakitButton
                                            type='outline1'
                                            style={{marginLeft: 8}}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onMenu({route: YakitRoute.HTTPHacker})
                                            }}
                                        >
                                            {t("Home.MITMHijackV1")}
                                        </YakitButton>
                                    </div>
                                    <div className={styles["home-card-header-desc"]}>
                                        {t("YakitRoute.mitmSslHijack")}
                                    </div>
                                </div>
                                {showMITMCertWarn && (
                                    <div className={styles["home-card-config-detection"]}>
                                        <div className={styles["config-detection-left"]}>
                                            <SolidExclamationIcon className={styles["exclamation-icon"]} />
                                            {t("Home.certNotConfigured")}
                                        </div>
                                        <div style={{display: "flex", alignItems: "center", gap: 8}}>
                                            <YakitButton
                                                type='text'
                                                className={styles["config-detection-btn"]}
                                                onClick={handleAutoInstall}
                                            >
                                                {t("home.cert.autoInstallButton")}
                                            </YakitButton>
                                            <YakitButton
                                                type='text'
                                                className={styles["config-detection-btn"]}
                                                onClick={handleManualInstall}
                                            >
                                                {t("home.cert.manualInstallButton")}
                                            </YakitButton>
                                        </div>
                                    </div>
                                )}
                                <div
                                    className={styles["mitm-cont-wrapper"]}
                                    // style={{backgroundImage: `url(${mitmBg})`}}
                                >
                                    <div className={styles["mitm-glass-effect"]}>
                                        <div className={styles["mitm-operation"]}>
                                            <div
                                                className={styles["mitm-operation-border"]}
                                                style={{border: "1px solid var(--Colors-Use-Main-Bg)", padding: 8}}
                                            >
                                                <div
                                                    className={styles["mitm-operation-border"]}
                                                    style={{
                                                        border: "1px solid var(--Colors-Use-Main-Focus)",
                                                        padding: 6
                                                    }}
                                                >
                                                    <div
                                                        className={styles["mitm-operation-border"]}
                                                        style={{
                                                            border: "1px solid var(--Colors-Use-Main-Border)",
                                                            padding: 4
                                                        }}
                                                    >
                                                        <div
                                                            className={styles["operation-btn-wrapper"]}
                                                            ref={mitmDropdownRef}
                                                        >
                                                            <div
                                                                className={styles["operation-btn-left"]}
                                                                style={{borderRadius: "40px 0 0 40px"}}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    toMITMHacker({
                                                                        immediatelyLaunchedInfo: {
                                                                            host: hostWatch || "127.0.0.1",
                                                                            port: portWatch || "8083",
                                                                            enableInitialPlugin:
                                                                                form.getFieldValue(
                                                                                    "enableInitialPlugin"
                                                                                ) === true
                                                                        }
                                                                    })
                                                                }}
                                                            >
                                                                <SolidPlayIcon className={styles["open-icon"]} />
                                                                {t("Home.hijackStart")}
                                                            </div>
                                                            <div
                                                                className={styles["operation-btn-right"]}
                                                                style={{borderRadius: "0 40px 40px 0"}}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setShowMitmDropdown(!showMitmDropdown)
                                                                }}
                                                            >
                                                                <OutlineChevronupIcon
                                                                    className={classNames(styles["title-icon"], {
                                                                        [styles["rotate-180"]]: !showMitmDropdown
                                                                    })}
                                                                />
                                                            </div>
                                                            <div
                                                                className={styles["operation-dropdown-wrapper"]}
                                                                style={{display: showMitmDropdown ? "block" : "none"}}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <Form
                                                                    form={form}
                                                                    layout={"horizontal"}
                                                                    labelCol={{span: 8}}
                                                                    wrapperCol={{span: 16}}
                                                                >
                                                                    <Form.Item
                                                                        label={t("Home.hostListen")}
                                                                        rules={[
                                                                            {
                                                                                required: true,
                                                                                message: t("Home.hostListen")
                                                                            }
                                                                        ]}
                                                                        name={"host"}
                                                                    >
                                                                        <YakitInput />
                                                                    </Form.Item>
                                                                    <Form.Item
                                                                        label={t("Home.portListen")}
                                                                        rules={[
                                                                            {
                                                                                required: true,
                                                                                message: t("Home.portListen")
                                                                            }
                                                                        ]}
                                                                        name={"port"}
                                                                    >
                                                                        <YakitInput />
                                                                    </Form.Item>
                                                                    <Form.Item
                                                                        label={t("Home.pluginEnable")}
                                                                        name='enableInitialPlugin'
                                                                        valuePropName='checked'
                                                                    >
                                                                        <YakitSwitch />
                                                                    </Form.Item>
                                                                </Form>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div
                                ref={webFuzzerRef}
                                className={classNames(styles["webFuzzer-card"], styles["home-card"])}
                                onClick={() => onMenu({route: YakitRoute.HTTPFuzzer})}
                            >
                                <div className={styles["home-card-header"]}>
                                    <div className={styles["home-card-header-title"]}>
                                        <PublicWebFuzzerIcon className={styles["title-icon"]} />
                                        <span className={styles["title-text"]}>{t("YakitRoute.WebFuzzer")}</span>
                                    </div>
                                    <div className={styles["home-card-header-desc"]}>
                                        {t("YakitRoute.fuzzBurpIntegration")}
                                    </div>
                                </div>
                                <div className={styles["example-blasting-wrapper"]}>
                                    <div className={styles["example-blasting-title"]}>
                                        <PublicBlastingIcon className={styles["example-blasting-icon"]} />
                                        <span className={styles["title-text"]}>{t("Home.exampleBruteforce")}</span>
                                    </div>
                                    <div className={styles["example-blasting-video-wrapper"]}>
                                        <div
                                            className={styles["example-blasting-video"]}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleBlastingExample("id")
                                            }}
                                        >
                                            {t("Home.bruteforceId")}
                                        </div>
                                        <div
                                            className={styles["example-blasting-video"]}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleBlastingExample("pwd")
                                            }}
                                        >
                                            {t("Home.bruteforcePassword")}
                                        </div>
                                        <div
                                            className={styles["example-blasting-video"]}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleBlastingExample("count")
                                            }}
                                        >
                                            {t("Home.bruteforceAccount")}
                                        </div>
                                    </div>
                                </div>
                                <div className={styles["sequence-animation-wrapper"]}>
                                    <div className={styles["sequence-animation-title"]}>
                                        <PublicSequenceAnimationIcon className={styles["sequence-animation-icon"]} />
                                        <span className={styles["title-text"]}>{t("Home.fuzzSequenceDemo")}</span>
                                    </div>
                                    <div className={styles["sequence-animation-desc"]}>
                                        {t("Home.fuzzWebNodeChain", {name: t("YakitRoute.WebFuzzer")})}
                                    </div>
                                    <div className={styles["sequence-animation-btn-wrapper"]}>
                                        <YakitButton
                                            icon={<SolidPlayIcon className={styles["animation-play-icon"]} />}
                                            className={styles["animation-btn"]}
                                            type='outline1'
                                            onClick={handleSequenceAnimation}
                                        >
                                            {t("Home.animationDemo")}
                                        </YakitButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={styles["left-row-wrapper"]}>
                            <div ref={signlejumpRef} className={styles["signle-jump-wrapper"]}>
                                <div
                                    className={styles["signle-jump-item"]}
                                    onClick={() => onMenu({route: YakitRoute.PayloadGenerater_New})}
                                >
                                    <div className={styles["signle-jump-item-cont"]}>
                                        <PublicPayloadGeneraterIcon className={styles["signle-jump-item-icon"]} />
                                        <div className={styles["signle-jump-item-cont-right"]}>
                                            <div className={styles["single-jump-cont-title"]}>
                                                {t("YakitRoute.Yso-Java Hack")}
                                            </div>
                                            <div className={styles["single-jump-cont-desc"]}>
                                                {t("YakitRoute.fuzzPayLoadDeserialization")}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className={styles["signle-jump-item"]}
                                    onClick={() => onMenu({route: YakitRoute.DNSLog})}
                                >
                                    <div className={styles["signle-jump-item-cont"]}>
                                        <PublicDNSLogIcon />
                                        <div className={styles["signle-jump-item-cont-right"]}>
                                            <div className={styles["single-jump-cont-title"]}>
                                                {t("YakitRoute.DNSLog")}
                                            </div>
                                            <div className={styles["single-jump-cont-desc"]}>
                                                {t("YakitRoute.subdomainAutoGenerate")}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className={styles["signle-jump-item"]}
                                    onClick={() => onMenu({route: YakitRoute.Codec})}
                                >
                                    <div className={styles["signle-jump-item-cont"]}>
                                        <PublicCodecIcon />
                                        <div className={styles["signle-jump-item-cont-right"]}>
                                            <div className={styles["single-jump-cont-title"]}>
                                                {t("YakitRoute.Codec")}
                                            </div>
                                            <div className={styles["single-jump-cont-desc"]}>
                                                {t("Home.codecPluginCustom")}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div
                                ref={vulnerabilityRef}
                                className={classNames(styles["vulnerability-scanning-card"], styles["home-card"])}
                            >
                                <div className={styles["home-card-header"]}>
                                    <div className={styles["home-card-header-title"]}>
                                        <PublicCodecIcon className={styles["title-icon"]} />
                                        <span className={styles["title-text"]}>{t("YakitRoute.vulnScan")}</span>
                                    </div>
                                    <div className={styles["home-card-header-desc"]}>{t("Home.vulnBatchScan")}</div>
                                </div>
                                <div className={styles["home-card-operation-btn-wrapper"]}>
                                    <div className={styles["operation-btn-wrapper"]} ref={scanningdropdownRef}>
                                        <div
                                            className={styles["operation-btn-left"]}
                                            style={{borderRadius: "40px 0 0 40px"}}
                                            onClick={handleOpenScanning}
                                        >
                                            <SolidPlayIcon className={styles["open-icon"]} />
                                            {t("YakitButton.startScan")}
                                        </div>
                                        <div
                                            className={styles["operation-btn-right"]}
                                            style={{borderRadius: "0 40px 40px 0"}}
                                            onClick={() => setShowScanningDropdown(!showScanningDropdown)}
                                        >
                                            <OutlineChevronupIcon
                                                className={classNames(styles["title-icon"], {
                                                    [styles["rotate-180"]]: !showScanningDropdown
                                                })}
                                            />
                                        </div>
                                        <div
                                            className={styles["operation-dropdown-wrapper"]}
                                            style={{display: showScanningDropdown ? "block" : "none"}}
                                        >
                                            {[
                                                {
                                                    label: t("YakitRoute.vulnTargetedScan"),
                                                    key: "specialVulnerabilityDetection"
                                                },
                                                {label: t("Home.vulnCustomScan"), key: "customDetection"}
                                            ].map((item) => (
                                                <div
                                                    className={classNames(styles["operation-dropdown-list-item"], {
                                                        [styles["active"]]: scanningCheck === item.key
                                                    })}
                                                    onClick={() => {
                                                        setScanningCheck(item.key)
                                                        setShowScanningDropdown(!showScanningDropdown)
                                                    }}
                                                    key={item.key}
                                                >
                                                    <span>{item.label}</span>
                                                    {scanningCheck === item.key && (
                                                        <SolidCheckIcon className={styles["check-icon"]} />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                {!pcap.IsPrivileged && system !== "Windows_NT" && (
                                    <div className={styles["home-card-config-detection"]}>
                                        <div className={styles["config-detection-left"]}>
                                            <SolidExclamationIcon className={styles["exclamation-icon"]} />
                                            {t("Home.netcardPermissionNotFixed")}
                                        </div>
                                        <YakitButton
                                            type='text'
                                            className={styles["config-detection-btn"]}
                                            onClick={() => {
                                                if (pcapHintShow) return
                                                setPcapHintShow(true)
                                            }}
                                        >
                                            {t("YakitButton.actionFixNow")}
                                        </YakitButton>
                                    </div>
                                )}
                                <YakitHint
                                    visible={pcapHintShow}
                                    heardIcon={pcapResult ? <AllShieldCheckIcon /> : undefined}
                                    title={pcapResult ? t("Home.netcardAccessGranted") : t("Home.netcardNoAccess")}
                                    width={600}
                                    content={
                                        pcapResult ? (
                                            <>{t("Home.netcardRepairWaiting")}</>
                                        ) : (
                                            <>
                                                {t("Home.linuxMacosPermission")}{" "}
                                                <YakitTag
                                                    enableCopy={true}
                                                    color='yellow'
                                                    copyText={`chmod +rw /dev/bpf*`}
                                                ></YakitTag>
                                                {t("Home.or")}{" "}
                                                <YakitTag
                                                    enableCopy={true}
                                                    color='purple'
                                                    copyText={`sudo chmod +rw /dev/bpf*`}
                                                ></YakitTag>
                                                {t("Home.rwPermissionAvailable")}
                                            </>
                                        )
                                    }
                                    okButtonText={t("Home.pcapEnablePermission")}
                                    cancelButtonText={pcapResult ? t("YakitButton.ok") : t("YakitButton.remindMeLater")}
                                    okButtonProps={{
                                        loading: pcapHintLoading,
                                        style: pcapResult ? {display: "none"} : undefined
                                    }}
                                    cancelButtonProps={{loading: !pcapResult && pcapHintLoading}}
                                    onOk={openPcapPower}
                                    onCancel={() => {
                                        setPcapResult(false)
                                        setPcapHintShow(false)
                                    }}
                                    footerExtra={
                                        pcapResult ? undefined : (
                                            <Tooltip title={`${pcap.AdviceVerbose}: ${pcap.Advice}`}>
                                                <YakitButton className={styles["btn-style"]} type='text' size='max'>
                                                    {t("YakitButton.manualFix")}
                                                </YakitButton>
                                            </Tooltip>
                                        )
                                    }
                                ></YakitHint>
                                <div className={styles["security-tools"]}>
                                    {isEnpriTrace() && (
                                        <div
                                            className={styles["security-tools-item"]}
                                            onClick={() =>
                                                onMenuParams({
                                                    route: YakitRoute.PoC,
                                                    params: {
                                                        type: 2,
                                                        defGroupKeywords: "两高一弱",
                                                        selectGroupListByKeyWord: ["两高一弱"]
                                                    }
                                                })
                                            }
                                        >
                                            <PublicBruteIcon className={styles["tools-icon"]} />
                                            <span className={styles["tools-text"]} title={t("Home.highHighLow")}>
                                                {t("Home.highHighLow")}
                                            </span>
                                        </div>
                                    )}
                                    <div
                                        className={styles["security-tools-item"]}
                                        onClick={() => onMenu({route: YakitRoute.Mod_ScanPort})}
                                    >
                                        <PublicScanPortIcon className={styles["tools-icon"]} />
                                        <span className={styles["tools-text"]} title={t("YakitRoute.portScan")}>
                                            {t("YakitRoute.portScan")}
                                        </span>
                                    </div>
                                    <div
                                        className={styles["security-tools-item"]}
                                        onClick={() => onMenu({route: YakitRoute.Mod_Brute})}
                                    >
                                        <PublicBruteIcon className={styles["tools-icon"]} />
                                        <span
                                            className={styles["tools-text"]}
                                            title={t("YakitRoute.weakPasswordCheck")}
                                        >
                                            {t("YakitRoute.weakPasswordCheck")}
                                        </span>
                                    </div>
                                    <div
                                        className={styles["security-tools-item"]}
                                        onClick={() =>
                                            onMenu({
                                                route: YakitRoute.Plugin_OP,
                                                pluginId: pluginToId[ResidentPluginName.DirectoryScanning],
                                                pluginName: ResidentPluginName.DirectoryScanning
                                            })
                                        }
                                    >
                                        <PublicDirectoryScanningIcon className={styles["tools-icon"]} />
                                        <span className={styles["tools-text"]} title={t("YakitRoute.dirBruteForce")}>
                                            {t("YakitRoute.dirBruteForce")}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                }
                firstRatio='90%'
                firstMinSize={800}
                firstNodeStyle={{padding: 0}}
                secondNode={
                    <div className={styles["home-page-wrapper-right"]}>
                        <div className={styles["tools-wrapper"]}>
                            <div className={styles["tools-title-wrapper"]}>
                                <PublicPublicToolLightbulbIcon className={styles["tools-title-icon"]} />
                                <span className={styles["tools-title-text"]}>{t("Home.toolbox")}</span>
                                <span className={styles["tools-title-desc"]}></span>
                            </div>
                            {t("Home.searchQuickFind")}
                            <div className={styles["tools-search-wrapper"]}>
                                <YakitInput.Search onSearch={(value) => setSearchToolVal(value)} allowClear />
                            </div>
                            <div className={styles["tools-list-wrapper"]}>
                                {renderToolsList.length ? (
                                    <>
                                        {renderToolsList.map((item) => (
                                            <div
                                                className={styles["tools-list-item"]}
                                                key={item.label}
                                                onClick={item.onClick}
                                            >
                                                <div className={styles["tools-item-left-wrapper"]}>
                                                    <div className={styles["tools-item-icon"]} style={item.iconStyle}>
                                                        {item.icon}
                                                    </div>
                                                    <span className={styles["tools-item-label"]}>{item.label}</span>
                                                </div>
                                                <div className={styles["tools-item-desc"]}>{item.desc}</div>
                                                <div className={styles["tools-item-right-icon"]}>{item.rightIcon}</div>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <YakitEmpty></YakitEmpty>
                                )}
                            </div>
                        </div>
                        <div className={styles["data-preview-wrapper"]}>
                            <div className={styles["data-preview-title"]}>
                                <SolidBorderDocumentTextIcon className={styles["data-preview-title-icon"]} />
                                <span className={styles["data-preview-title-text"]}>{projectName}</span>
                            </div>
                            <div className={styles["data-preview-item"]}>
                                <OutlineDatabaseIcon className={styles["data-preview-item-icon"]} />
                                <span className={styles["data-preview-item-text"]}>{t("HomeCom.projectDatabase")}</span>
                                <div className={styles["data-preview-item-cont"]}>
                                    {!judgeMoreTenGB ? (
                                        <span className={styles["data-preview-item-size"]}>
                                            {curProjectInfo?.FileSize}
                                        </span>
                                    ) : (
                                        <>
                                            <span
                                                className={styles["data-preview-item-size"]}
                                                style={{color: "#f6544a"}}
                                            >
                                                {curProjectInfo?.FileSize}
                                            </span>
                                            <Tooltip title={t("HomeCom.databaseTooLarge")}>
                                                <SolidExclamationIcon className={styles["database-warning-icon"]} />
                                            </Tooltip>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className={styles["data-preview-item"]}>
                                <OutlineChartbarIcon className={styles["data-preview-item-icon"]} />
                                <span className={styles["data-preview-item-text"]}>{t("Home.historyData")}</span>
                                <div
                                    className={classNames(
                                        styles["data-preview-item-cont"],
                                        styles["data-preview-item-cont-jump"]
                                    )}
                                    onClick={() => onMenu({route: YakitRoute.DB_HTTPHistory})}
                                >
                                    <span className={styles["data-preview-item-number"]}>
                                        {numeral(historyData).format("0,0")}
                                    </span>
                                </div>
                            </div>
                            {(riskLevelTotal("严重") ||
                                riskLevelTotal("高危") ||
                                riskLevelTotal("中危") ||
                                riskLevelTotal("低危")) > 0 ? (
                                <div
                                    className={styles["data-preview-item"]}
                                    style={{alignItems: "flex-start", marginTop: 6}}
                                >
                                    <OutlineBugIcon className={styles["data-preview-item-icon"]} />
                                    <span className={styles["data-preview-item-text"]}>
                                        {t("HomeCom.vulnerabilityData")}
                                    </span>
                                    <div className={styles["risk-tag-wrapper"]}>
                                        {riskLevelTotal("严重") ? (
                                            <div
                                                className={classNames(styles["risk-tag"], styles["seriousRisk-tag"])}
                                                onClick={() =>
                                                    onMenuParams({
                                                        route: YakitRoute.DB_Risk,
                                                        params: {SeverityList: ["critical"]}
                                                    })
                                                }
                                            >
                                                <div className={styles["risk-text"]}>{t("YakitTag.critical")}</div>
                                                <div className={styles["risk-num"]}>{riskLevelTotal("严重")}</div>
                                            </div>
                                        ) : null}
                                        {riskLevelTotal("高危") ? (
                                            <div
                                                className={classNames(styles["risk-tag"], styles["highRisk-tag"])}
                                                onClick={() =>
                                                    onMenuParams({
                                                        route: YakitRoute.DB_Risk,
                                                        params: {SeverityList: ["high"]}
                                                    })
                                                }
                                            >
                                                <div className={styles["risk-text"]}>{t("YakitTag.high")}</div>
                                                <div className={styles["risk-num"]}>{riskLevelTotal("高危")}</div>
                                            </div>
                                        ) : null}
                                        {riskLevelTotal("中危") ? (
                                            <div
                                                className={classNames(styles["risk-tag"], styles["mediumRisk-tag"])}
                                                onClick={() =>
                                                    onMenuParams({
                                                        route: YakitRoute.DB_Risk,
                                                        params: {SeverityList: ["warning"]}
                                                    })
                                                }
                                            >
                                                <div className={styles["risk-text"]}>{t("YakitTag.warning")}</div>
                                                <div className={styles["risk-num"]}>{riskLevelTotal("中危")}</div>
                                            </div>
                                        ) : null}
                                        {riskLevelTotal("低危") ? (
                                            <div
                                                className={classNames(styles["risk-tag"], styles["lowRisk-tag"])}
                                                onClick={() =>
                                                    onMenuParams({
                                                        route: YakitRoute.DB_Risk,
                                                        params: {SeverityList: ["low"]}
                                                    })
                                                }
                                            >
                                                <div className={styles["risk-text"]}>{t("YakitTag.low")}</div>
                                                <div className={styles["risk-num"]}>{riskLevelTotal("低危")}</div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            ) : null}
                            <div className={styles["data-preview-item"]}>
                                <OutlineModScanPortDataIcon className={styles["data-preview-item-icon"]} />
                                <span className={styles["data-preview-item-text"]}>{t("Home.portData")}</span>
                                <div
                                    className={classNames(
                                        styles["data-preview-item-cont"],
                                        styles["data-preview-item-cont-jump"]
                                    )}
                                >
                                    <span
                                        className={styles["data-preview-item-number"]}
                                        onClick={() => onMenu({route: YakitRoute.DB_Ports})}
                                    >
                                        {portTotal}
                                    </span>
                                </div>
                            </div>
                            <div className={styles["data-preview-item"]}>
                                <OutlineDesktopcomputerIcon className={styles["data-preview-item-icon"]} />
                                <span className={styles["data-preview-item-text"]}>{t("Home.localPlugin")}</span>
                                <div
                                    className={classNames(
                                        styles["data-preview-item-cont"],
                                        styles["data-preview-item-cont-jump"]
                                    )}
                                >
                                    {localPluginTotal < 30 ? (
                                        <YakitButton
                                            type='text'
                                            icon={<CloudDownloadIcon className={styles["download-btn-icon"]} />}
                                            onClick={() => setVisibleOnline(true)}
                                            style={{padding: 0}}
                                            className={styles["download-btn"]}
                                        >
                                            {t("YakitButton.oneClickDownload")}
                                        </YakitButton>
                                    ) : (
                                        <span
                                            className={styles["data-preview-item-number"]}
                                            onClick={() =>
                                                onMenuParams({
                                                    route: YakitRoute.Plugin_Hub,
                                                    params: {tabActive: "local"} as PluginHubPageInfoProps
                                                })
                                            }
                                        >
                                            {localPluginTotal}
                                        </span>
                                    )}
                                </div>
                                {visibleOnline && (
                                    <YakitGetOnlinePlugin
                                        visible={visibleOnline}
                                        setVisible={(v) => {
                                            setVisibleOnline(v)
                                            updateLocalPluginTotal()
                                        }}
                                        getContainer={
                                            document.getElementById(`main-operator-page-body-${YakitRoute.NewHome}`) ||
                                            undefined
                                        }
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                }
                secondRatio='10%'
                secondMinSize='350px'
            ></YakitResizeBox>
        </div>
    )
}

export default Home
