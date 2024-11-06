import React, {useEffect, useMemo, useRef, useState, ReactElement, CSSProperties} from "react"
import classNames from "classnames"
import styles from "./home.module.scss"
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
import {useDebounceEffect, useDebounceFn, useGetState, useInViewport, useMemoizedFn, useThrottleFn} from "ahooks"
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
import {ProjectDescription} from "../softwareSettings/ProjectManage"
import {YakQueryHTTPFlowResponse} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {FieldName, Fields} from "../risks/RiskTable"
import {apiQueryYakScriptTotal} from "../plugins/utils"
import {YakitGetOnlinePlugin} from "../mitm/MITMServerHijacking/MITMPluginLocalList"
import {apiQueryPortsBase} from "../assetViewer/PortTable/utils"
import {QueryPortsRequest} from "../assetViewer/PortAssetPage"
import mitmBg from "../../assets/mitm-bg.png"
import {getReleaseEditionName, isEnpriTrace, isEnpriTraceAgent} from "@/utils/envfile"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import ReactResizeDetector from "react-resize-detector"
import {SolidBorderDocumentTextIcon} from "@/assets/icon/colors"
import {CONST_DEFAULT_ENABLE_INITIAL_PLUGIN} from "../mitm/MITMPage"
import {PluginHubPageInfoProps} from "@/store/pageInfo"
import {WebsiteGV} from "@/enums/website"
const {ipcRenderer} = window.require("electron")

interface ToolInfo {
    label: string
    icon: ReactElement
    iconStyle?: CSSProperties
    desc: string
    rightIcon: ReactElement
    onClick: () => void
}

export interface HomeProp {}
const Home: React.FC<HomeProp> = (props) => {
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
    }>({Advice: "unknown", AdviceVerbose: "无法获取 PCAP 支持信息", IsPrivileged: false})
    const [system, setSystem] = useState<YakitSystem>("Darwin")
    const [pcapHintShow, setPcapHintShow] = useState<boolean>(false)
    const [pcapResult, setPcapResult] = useState<boolean>(false)
    const [pcapHintLoading, setPcapHintLoading] = useState<boolean>(false)
    const {screenRecorderInfo} = useScreenRecorder()
    const [searchToolVal, setSearchToolVal] = useState<string>("")
    const toolsList = useMemo(() => {
        return [
            {
                label: "YakRunner",
                icon: <PublicToolYakScriptIcon />,
                iconStyle: {backgroundColor: "#8863f7", padding: 1},
                desc: "Yak语言编辑器",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.YakScript})
            },
            {
                label: "靶场 Vulinbox",
                icon: <PublicToolVulinboxIcon />,
                desc: "Yak自带靶场",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.Beta_VulinboxManager})
            },
            {
                label: "Payload",
                icon: <PublicToolPayloadIcon />,
                desc: "Payload字典管理",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.PayloadManager})
            },
            {
                label: "数据对比",
                icon: <PublicToolDataCompareIcon />,
                desc: "快速识别不同数据",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.DataCompare})
            },
            {
                label: "CVE 管理",
                icon: <PublicToolCVEIcon />,
                desc: "搜索查询CVE数据",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.DB_CVE})
            },
            {
                label: "插件仓库",
                icon: <PublicToolPluginHubIcon />,
                iconStyle: {backgroundColor: "#F4736B", padding: 1},
                desc: "海量Yakit插件一键下载",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.Plugin_Hub})
            },
            {
                label: "端口监听器",
                icon: <PublicToolShellReceiverIcon />,
                desc: "监听端口并进行交互",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.ShellReceiver})
            },
            {
                label: "Websocket Fuzzer",
                icon: <PublicToolWebsocketFuzzerIcon />,
                desc: "对Websocket数据包进行模糊测试",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.WebsocketFuzzer})
            },
            {
                label: "子域名收集",
                icon: <PublicToolSubDomainCollectionIcon />,
                desc: "收集目标资产关联的子域名",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () =>
                    onMenu({
                        route: YakitRoute.Plugin_OP,
                        pluginId: pluginToId[ResidentPluginName.SubDomainCollection],
                        pluginName: ResidentPluginName.SubDomainCollection
                    })
            },
            {
                label: "基础爬虫",
                icon: <PublicToolBasicCrawlerIcon />,
                desc: "收集目标资产的所有页面信息",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () =>
                    onMenu({
                        route: YakitRoute.Plugin_OP,
                        pluginId: pluginToId[ResidentPluginName.BasicCrawler],
                        pluginName: ResidentPluginName.BasicCrawler
                    })
            },
            {
                label: "空间引擎",
                icon: <PublicToolSpaceEngineIcon />,
                desc: "集合多种引擎，一键收集资产信息",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.Space_Engine})
            },
            {
                label: "ICMP-SizeLog",
                icon: <PublicToolICMPSizeLogIcon />,
                desc: "使用 ping 携带特定长度数据包判定 ICMP反连",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.ICMPSizeLog})
            },
            {
                label: "TCP-PortLog",
                icon: <PublicToolTCPPortLogIcon />,
                desc: "使用未开放的随机端口来判定 TCP 反连",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.TCPPortLog})
            },
            {
                label: "反连服务器",
                icon: <PublicToolReverseServerIcon />,
                desc: "同时在一个端口同时实现 HTTP / RMI / HTTPS 等协议的反连",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.ReverseServer_New})
            },
            {
                label: "History",
                icon: <PublicToolDBHTTPHistoryIcon />,
                desc: "查看并操作所有劫持、插件、Fuzz发出的所有历史流量",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.DB_HTTPHistory})
            },
            {
                label: "报告",
                icon: <PublicToolDBReportIcon />,
                desc: "查看并管理扫描时生成的报告",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.DB_Report})
            },
            {
                label: "漏洞与风险统计",
                icon: <PublicToolDBRiskIcon />,
                desc: "管理扫描出的所有漏洞和风险信息",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.DB_Risk})
            },
            {
                label: "端口资产",
                icon: <PublicToolModScanPortIcon />,
                desc: "管理扫描出的所有端口资产",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.DB_Ports})
            },
            {
                label: "域名资产",
                icon: <PublicToolDBDomainIcon />,
                desc: "管理扫描出的所有域名资产",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.DB_Domain})
            },
            {
                label: "录屏",
                icon: <PublicToolScreenRecordingIcon />,
                desc: "录制屏幕操作",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => !screenRecorderInfo.isRecording && ipcRenderer.invoke("send-open-screenCap-modal")
            },
            {
                label: "截屏",
                icon: <PublicToolScreenshotIcon />,
                desc: "截取屏幕信息形成图片",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => ipcRenderer.invoke("activate-screenshot")
            },
            {
                label: "录屏管理",
                icon: <PublicToolScreenRecorderPageIcon />,
                desc: "管理录屏形成的所有视频文件",
                rightIcon: <OutlineArrowrightIcon />,
                onClick: () => onMenu({route: YakitRoute.ScreenRecorderPage})
            }
        ] as ToolInfo[]
    }, [screenRecorderInfo])
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

    // 下载安装MITM证书
    const handleDownMitmCert = (e) => {
        e.stopPropagation()
        const m = showYakitModal({
            title: "生成自动安装脚本",
            width: "600px",
            centered: true,
            content: (
                <div style={{padding: 15}}>
                    请按照以下步骤进行操作：
                    <br />
                    <br />
                    1. 点击确定后将会打开脚本存放的目录。
                    <br />
                    2. 双击打开 "auto-install-cert.bat/auto-install-cert.sh" 的文件执行安装。
                    <br />
                    3. 如果安装成功，您将看到“Certificate successfully installed.”的提示。
                    <br />
                    <br />
                    请确保在运行脚本之前关闭任何可能会阻止安装的应用程序。
                    <br />
                    安装完成后，您将能够顺利使用 MITM。
                    <br />
                    <br />
                    如有任何疑问或需要进一步帮助，请随时联系我们。
                </div>
            ),
            onOk: () => {
                ipcRenderer
                    .invoke("generate-install-script", {})
                    .then((p: string) => {
                        if (p) {
                            openABSFileLocated(p)
                        } else {
                            yakitNotify("error", "生成失败")
                        }
                    })
                    .catch(() => {})
                m.destroy()
            }
        })
    }

    // 爆破示例
    const handleBlastingExample = (animationType: string) => {
        const m = showYakitModal({
            type: "white",
            title: "WebFuzzer 爆破动画演示",
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
                    WebFuzzer 序列动画演示
                    <div
                        className={styles["subtitle-help-wrapper"]}
                        onClick={() => ipcRenderer.invoke("open-url", WebsiteGV.WebFuzzerAddress)}
                    >
                        <span className={styles["text-style"]}>官方帮助文档</span>
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
                yakitNotify("error", `提升 Pcap 用户权限失败：${e}`)
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
            return "临时项目"
        } else {
            return curProjectInfo?.ProjectName ? curProjectInfo?.ProjectName : getReleaseEditionName()
        }
    }, [curProjectInfo])

    // 更新项目数据库大小
    const updateProjectDbSize = async () => {
        ipcRenderer.invoke("GetCurrentProject").then((res: ProjectDescription) => {
            setCurProjectInfo(res)
        })
    }
    const convertToBytes = (size: number, unit: string) => {
        const units = {
            B: 1,
            KB: 1024,
            MB: 1024 ** 2,
            GB: 1024 ** 3,
            TB: 1024 ** 4
        }
        return size * (units[unit.toUpperCase()] || 1)
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
        if (screenWidth <= 1220) return 315
        if (screenWidth <= 1920) return 400
        return 500
    }
    const calcMitmAndwebFuzzerMaxHeight = () => {
        const screenWidth = document.body.getBoundingClientRect().width
        if (screenWidth <= 1220) return 400
        if (screenWidth <= 1920) return 600
        return 650
    }
    const calcSignlejumpAndVulnerabilityMinHeight = () => {
        const screenWidth = document.body.getBoundingClientRect().width
        if (screenWidth <= 1220) return 215
        if (screenWidth <= 1920) return 275
        return 300
    }
    const calcSignlejumpAndVulnerabilityMaxHeight = () => {
        const screenWidth = document.body.getBoundingClientRect().width
        if (screenWidth <= 1220) return 220
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
                                    onMenu({route: YakitRoute.HTTPHacker})
                                }}
                            >
                                <div className={styles["home-card-header"]}>
                                    <div className={styles["home-card-header-title"]}>
                                        <PublicMitmIcon className={styles["title-icon"]} />
                                        <span className={styles["title-text"]}>MITM 交互式劫持</span>
                                    </div>
                                    <div className={styles["home-card-header-desc"]}>
                                        安装 SSL/TLS
                                        证书，劫持浏览器所有流量请求、响应数据包，提供手动劫持与被动扫描两种模式
                                    </div>
                                </div>
                                {showMITMCertWarn && (
                                    <div className={styles["home-card-config-detection"]}>
                                        <div className={styles["config-detection-left"]}>
                                            <SolidExclamationIcon className={styles["exclamation-icon"]} />
                                            检测到证书未配置
                                        </div>
                                        <YakitButton
                                            type='text'
                                            className={styles["config-detection-btn"]}
                                            onClick={handleDownMitmCert}
                                        >
                                            下载安装
                                        </YakitButton>
                                    </div>
                                )}
                                <div
                                    className={styles["mitm-cont-wrapper"]}
                                    style={{backgroundImage: `url(${mitmBg})`}}
                                >
                                    <div className={styles["mitm-glass-effect"]}>
                                        <div className={styles["mitm-operation"]}>
                                            <div
                                                className={styles["mitm-operation-border"]}
                                                style={{border: "1px solid var(--yakit-primary-1)", padding: 8}}
                                            >
                                                <div
                                                    className={styles["mitm-operation-border"]}
                                                    style={{border: "1px solid var(--yakit-primary-2)", padding: 6}}
                                                >
                                                    <div
                                                        className={styles["mitm-operation-border"]}
                                                        style={{border: "1px solid var(--yakit-primary-3)", padding: 4}}
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
                                                                    onMenuParams({
                                                                        route: YakitRoute.HTTPHacker,
                                                                        params: {
                                                                            immediatelyLaunchedInfo: {
                                                                                host: hostWatch || "127.0.0.1",
                                                                                port: portWatch || "8083",
                                                                                enableInitialPlugin:
                                                                                    form.getFieldValue(
                                                                                        "enableInitialPlugin"
                                                                                    ) === true
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            >
                                                                <SolidPlayIcon className={styles["open-icon"]} />
                                                                启动劫持
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
                                                                        label={"监听主机"}
                                                                        rules={[{required: true, message: `监听主机`}]}
                                                                        name={"host"}
                                                                    >
                                                                        <YakitInput />
                                                                    </Form.Item>
                                                                    <Form.Item
                                                                        label={"监听端口"}
                                                                        rules={[{required: true, message: `监听端口`}]}
                                                                        name={"port"}
                                                                    >
                                                                        <YakitInput />
                                                                    </Form.Item>
                                                                    <Form.Item
                                                                        label='启用插件'
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
                                        <span className={styles["title-text"]}>WebFuzzer</span>
                                    </div>
                                    <div className={styles["home-card-header-desc"]}>
                                        通过核心模糊测试标签语法，实现了对 Burpsuite 的 Repeater 和 Intruder 的完美整合
                                    </div>
                                </div>
                                <div className={styles["example-blasting-wrapper"]}>
                                    <div className={styles["example-blasting-title"]}>
                                        <PublicBlastingIcon className={styles["example-blasting-icon"]} />
                                        <span className={styles["title-text"]}>爆破示例</span>
                                    </div>
                                    <div className={styles["example-blasting-video-wrapper"]}>
                                        <div
                                            className={styles["example-blasting-video"]}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleBlastingExample("id")
                                            }}
                                        >
                                            爆破 ID
                                        </div>
                                        <div
                                            className={styles["example-blasting-video"]}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleBlastingExample("pwd")
                                            }}
                                        >
                                            爆破密码
                                        </div>
                                        <div
                                            className={styles["example-blasting-video"]}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleBlastingExample("count")
                                            }}
                                        >
                                            爆破账户
                                        </div>
                                    </div>
                                </div>
                                <div className={styles["sequence-animation-wrapper"]}>
                                    <div className={styles["sequence-animation-title"]}>
                                        <PublicSequenceAnimationIcon className={styles["sequence-animation-icon"]} />
                                        <span className={styles["title-text"]}>Fuzz 序列动画演示</span>
                                    </div>
                                    <div className={styles["sequence-animation-desc"]}>
                                        将多个 Web Fuzzer 节点串联起来，实现更复杂的逻辑与功能
                                    </div>
                                    <div className={styles["sequence-animation-btn-wrapper"]}>
                                        <YakitButton
                                            icon={<SolidPlayIcon className={styles["animation-play-icon"]} />}
                                            className={styles["animation-btn"]}
                                            type='outline1'
                                            onClick={handleSequenceAnimation}
                                        >
                                            演示动画
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
                                            <div className={styles["single-jump-cont-title"]}>Yso-Java Hack</div>
                                            <div className={styles["single-jump-cont-desc"]}>
                                                配置序列化 Payload 或恶意类，测试反序列化、类加载、JNDI 漏洞利用等
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
                                            <div className={styles["single-jump-cont-title"]}>DNSLog</div>
                                            <div className={styles["single-jump-cont-desc"]}>
                                                自动生成一个子域名，任何查询到这个子域名的 IP 被集合展示在列表中
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
                                            <div className={styles["single-jump-cont-title"]}>Codec</div>
                                            <div className={styles["single-jump-cont-desc"]}>
                                                加解密与编码，可通过插件自定义数据处理方法
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
                                        <span className={styles["title-text"]}>漏洞扫描</span>
                                    </div>
                                    <div className={styles["home-card-header-desc"]}>
                                        可自由选择需要的 POC 进行批量漏洞检测，或选择设置好的分组进行专项漏洞扫描
                                    </div>
                                </div>
                                <div className={styles["home-card-operation-btn-wrapper"]}>
                                    <div className={styles["operation-btn-wrapper"]} ref={scanningdropdownRef}>
                                        <div
                                            className={styles["operation-btn-left"]}
                                            style={{borderRadius: "40px 0 0 40px"}}
                                            onClick={handleOpenScanning}
                                        >
                                            <SolidPlayIcon className={styles["open-icon"]} />
                                            开始扫描
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
                                                {label: "专项漏洞检测", key: "specialVulnerabilityDetection"},
                                                {label: "自定义检测", key: "customDetection"}
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
                                            检测到网卡权限未修复
                                        </div>
                                        <YakitButton
                                            type='text'
                                            className={styles["config-detection-btn"]}
                                            onClick={() => {
                                                if (pcapHintShow) return
                                                setPcapHintShow(true)
                                            }}
                                        >
                                            去修复
                                        </YakitButton>
                                    </div>
                                )}
                                <YakitHint
                                    visible={pcapHintShow}
                                    heardIcon={pcapResult ? <AllShieldCheckIcon /> : undefined}
                                    title={pcapResult ? "已有网卡操作权限" : "当前引擎不具有网卡操作权限"}
                                    content={
                                        pcapResult
                                            ? "网卡修复需要时间，请耐心等待"
                                            : "Linux 与 MacOS 可通过设置权限与组为用户态赋予网卡完全权限"
                                    }
                                    okButtonText='开启 PCAP 权限'
                                    cancelButtonText={pcapResult ? "知道了～" : "稍后再说"}
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
                                                    手动修复
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
                                            <span className={styles["tools-text"]}>两高一弱</span>
                                        </div>
                                    )}
                                    <div
                                        className={styles["security-tools-item"]}
                                        onClick={() => onMenu({route: YakitRoute.Mod_ScanPort})}
                                    >
                                        <PublicScanPortIcon className={styles["tools-icon"]} />
                                        <span className={styles["tools-text"]}>端口扫描</span>
                                    </div>
                                    <div
                                        className={styles["security-tools-item"]}
                                        onClick={() => onMenu({route: YakitRoute.Mod_Brute})}
                                    >
                                        <PublicBruteIcon className={styles["tools-icon"]} />
                                        <span className={styles["tools-text"]}>弱口令检测</span>
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
                                        <span className={styles["tools-text"]}>目录爆破</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                }
                firstRatio='90%'
                firstMinSize='800px'
                firstNodeStyle={{padding: 0}}
                secondNode={
                    <div className={styles["home-page-wrapper-right"]}>
                        <div className={styles["tools-wrapper"]}>
                            <div className={styles["tools-title-wrapper"]}>
                                <PublicPublicToolLightbulbIcon className={styles["tools-title-icon"]} />
                                <span className={styles["tools-title-text"]}>工具箱</span>
                                <span className={styles["tools-title-desc"]}>可通过搜索快速查找软件功能</span>
                            </div>
                            <div className={styles["tools-search-wrapper"]}>
                                <YakitInput.Search allowClear={true} onSearch={(value) => setSearchToolVal(value)} />
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
                                <span className={styles["data-preview-item-text"]}>项目数据库</span>
                                <div className={styles["data-preview-item-cont"]}>
                                    {!judgeMoreTenGB ? (
                                        <span className={styles["data-preview-item-number"]}>
                                            {curProjectInfo?.FileSize}
                                        </span>
                                    ) : (
                                        <>
                                            <span
                                                className={styles["data-preview-item-number"]}
                                                style={{color: "#f6544a"}}
                                            >
                                                {curProjectInfo?.FileSize}
                                            </span>
                                            <Tooltip title='数据库过大，为避免影响使用，建议创建新项目。'>
                                                <SolidExclamationIcon className={styles["database-warning-icon"]} />
                                            </Tooltip>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className={styles["data-preview-item"]}>
                                <OutlineChartbarIcon className={styles["data-preview-item-icon"]} />
                                <span className={styles["data-preview-item-text"]}>流量数据</span>
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
                                    <span className={styles["data-preview-item-text"]}>漏洞数据</span>
                                    <div className={styles["risk-tag-wrapper"]}>
                                        {riskLevelTotal("严重") ? (
                                            <div
                                                className={classNames(styles["risk-tag"], styles["seriousRisk-tag"])}
                                                onClick={() =>
                                                    onMenuParams({
                                                        route: YakitRoute.DB_Risk,
                                                        params: {SeverityList: ["严重"]}
                                                    })
                                                }
                                            >
                                                <div className={styles["risk-text"]}>严重</div>
                                                <div className={styles["risk-num"]}>{riskLevelTotal("严重")}</div>
                                            </div>
                                        ) : null}
                                        {riskLevelTotal("高危") ? (
                                            <div
                                                className={classNames(styles["risk-tag"], styles["highRisk-tag"])}
                                                onClick={() =>
                                                    onMenuParams({
                                                        route: YakitRoute.DB_Risk,
                                                        params: {SeverityList: ["高危"]}
                                                    })
                                                }
                                            >
                                                <div className={styles["risk-text"]}>高危</div>
                                                <div className={styles["risk-num"]}>{riskLevelTotal("高危")}</div>
                                            </div>
                                        ) : null}
                                        {riskLevelTotal("中危") ? (
                                            <div
                                                className={classNames(styles["risk-tag"], styles["mediumRisk-tag"])}
                                                onClick={() =>
                                                    onMenuParams({
                                                        route: YakitRoute.DB_Risk,
                                                        params: {SeverityList: ["中危"]}
                                                    })
                                                }
                                            >
                                                <div className={styles["risk-text"]}>中危</div>
                                                <div className={styles["risk-num"]}>{riskLevelTotal("中危")}</div>
                                            </div>
                                        ) : null}
                                        {riskLevelTotal("低危") ? (
                                            <div
                                                className={classNames(styles["risk-tag"], styles["lowRisk-tag"])}
                                                onClick={() =>
                                                    onMenuParams({
                                                        route: YakitRoute.DB_Risk,
                                                        params: {SeverityList: ["低危"]}
                                                    })
                                                }
                                            >
                                                <div className={styles["risk-text"]}>低危</div>
                                                <div className={styles["risk-num"]}>{riskLevelTotal("低危")}</div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            ) : null}
                            <div className={styles["data-preview-item"]}>
                                <OutlineModScanPortDataIcon className={styles["data-preview-item-icon"]} />
                                <span className={styles["data-preview-item-text"]}>端口数据</span>
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
                                <span className={styles["data-preview-item-text"]}>本地插件</span>
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
                                            一键下载
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
