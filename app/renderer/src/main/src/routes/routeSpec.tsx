import React, {Suspense} from "react"
import {YakExecutor} from "../pages/invoker/YakExecutor"
import {AuditOutlined, CodeOutlined} from "@ant-design/icons"
// import {HTTPHacker} from "../pages/hacker/httpHacker";
// import {CodecPage} from "../pages/codec/CodecPage";
import {ShellReceiverPage} from "../pages/shellReceiver/ShellReceiverPage"
import {YakBatchExecutors} from "../pages/invoker/batch/YakBatchExecutors"
import {PayloadManagerPage} from "../pages/payloadManager/PayloadManager"
import {PortScanPage} from "../pages/portscan/PortScanPage"
import {YakitStorePage} from "../pages/yakitStore/YakitStorePage"

import {PluginOperator} from "../pages/yakitStore/PluginOperator"
import {failed} from "../utils/notification"
import {BrutePage} from "../pages/brute/BrutePage"
import {DataCompare} from "../pages/compare/DataCompare"
import {HTTPHistory} from "../components/HTTPHistory"
import {PortAssetTable} from "../pages/assetViewer/PortAssetPage"
import {YakScriptExecResultTable} from "../components/YakScriptExecResultTable"
import {DomainAssetPage} from "../pages/assetViewer/DomainAssetPage"
import {RiskPage} from "../pages/risks/RiskPage"
import {DNSLogPage} from "../pages/dnslog/DNSLogPage"
import {HTTPFuzzerPage} from "../pages/fuzzer/HTTPFuzzerPage"
import {fuzzerInfoProp} from "../pages/MainOperator"
import {ICMPSizeLoggerPage} from "../pages/icmpsizelog/ICMPSizeLoggerPage"
import {RandomPortLogPage} from "../pages/randomPortLog/RandomPortLogPage"
import {ReportViewerPage} from "../pages/assetViewer/ReportViewerPage"
import {BatchExecutorPageEx} from "../pages/invoker/batch/BatchExecutorPageEx"
// import {ReverseServerPage} from "../pages/reverse/ReverseServerPage"
// import {PayloadGeneraterPage} from "../pages/payloadGenerater/PayloadGeneraterPage"
// import {PayloadGenerater_New} from "../pages/payloadGenerater/JavaPayloadPage"
import {StartFacadeServerParams} from "../pages/reverseServer/ReverseServer_New"

import {
    ReadOnlyBatchExecutorByMenuItem,
    ReadOnlyBatchExecutorByRecoverUid
} from "../pages/invoker/batch/ReadOnlyBatchExecutorByMenuItem"
import {PacketScanner} from "@/pages/packetScanner/PacketScanner"
import {AddYakitScript} from "@/pages/yakitStore/AddYakitScript/AddYakitScript"
import {WebsocketFuzzer} from "@/pages/websocket/WebsocketFuzzer"
import {WebsocketFlowHistory} from "@/pages/websocket/WebsocketFlowHistory"
import {YakitPluginJournalDetails} from "@/pages/yakitStore/YakitPluginOnlineJournal/YakitPluginJournalDetails"
import {OnlinePluginRecycleBin} from "@/pages/yakitStore/OnlinePluginRecycleBin/OnlinePluginRecycleBin"
import {JavaPayloadPage} from "@/pages/payloadGenerater/NewJavaPayloadPage"
import {NewReverseServerPage} from "@/pages/reverseServer/NewReverseServerPage"
import AccountAdminPage from "@/pages/loginOperationMenu/AccountAdminPage"
import RoleAdminPage from "@/pages/loginOperationMenu/RoleAdminPage"
import LicenseAdminPage from "@/pages/loginOperationMenu/LicenseAdminPage"
import PlugInAdminPage from "@/pages/loginOperationMenu/PlugInAdminPage"
import {TrustListPage} from "@/pages/loginOperationMenu/TrustListPage"
import { SimbleDetect } from "@/pages/simbleDetect/SimbleDetect";
import {
    MenuDomainAssetsIcon,
    MenuHTTPHistoryIcon,
    MenuBasicCrawlerIcon,
    MenuBlastingAndUnauthorizedTestingIcon,
    MenuCodecIcon,
    MenuComprehensiveCatalogScanningAndBlastingIcon,
    MenuDataComparisonIcon,
    MenuDNSLogIcon,
    MenuICMPSizeLogIcon,
    MenuMITMInteractiveHijackingIcon,
    MenuPluginBatchExecutionIcon,
    MenuPluginWarehouseIcon,
    MenuPortListenerIcon,
    MenuPortScanningIcon,
    MenuReverseConnectionServerIcon,
    MenuSpecialVulnerabilityDetectionIcon,
    MenuTCPPortLogIcon,
    MenuWebFuzzerIcon,
    MenuYsoJavaHackIcon,
    MenuPlugExecutionResultsIcon,
    MenuPortAssetsIcon,
    MenuReportIcon,
    MenuSpaceEngineHunterIcon,
    MenuSubDomainCollectionIcon,
    MenuVulnerabilityRiskIcon,
    MenuWebsocketFuzzerIcon,
    MenuDefaultPluginIcon,
    MenuBatchVulnerabilityDetectionIcon
} from "@/pages/customizeMenu/icon/menuIcon"
import {EngineConsole} from "@/pages/engineConsole/EngineConsole"
import {
    MenuSolidBasicCrawlerIcon,
    MenuSolidBlastingAndUnauthorizedTestingIcon,
    MenuSolidCodecIcon,
    MenuSolidComprehensiveCatalogScanningAndBlastingIcon,
    MenuSolidDataComparisonIcon,
    MenuSolidDefaultPluginIcon,
    MenuSolidDNSLogIcon,
    MenuSolidDomainAssetsIcon,
    MenuSolidHTTPHistoryIcon,
    MenuSolidICMPSizeLogIcon,
    MenuSolidMITMInteractiveHijackingIcon,
    MenuSolidPlugExecutionResultsIcon,
    MenuSolidPluginBatchExecutionIcon,
    MenuSolidPluginWarehouseIcon,
    MenuSolidPortAssetsIcon,
    MenuSolidPortListenerIcon,
    MenuSolidPortScanningIcon,
    MenuSolidReportIcon,
    MenuSolidReverseConnectionServerIcon,
    MenuSolidSpaceEngineHunterIcon,
    MenuSolidSpecialVulnerabilityDetectionIcon,
    MenuSolidSubDomainCollectionIcon,
    MenuSolidTCPPortLogIcon,
    MenuSolidVulnerabilityRiskIcon,
    MenuSolidWebFuzzerIcon,
    MenuSolidWebsocketFuzzerIcon,
    MenuSolidYsoJavaHackIcon,
    MenuSolidBatchVulnerabilityDetectionIcon,
} from "@/pages/customizeMenu/icon/solidMenuIcon"
import {ProjectPage} from "@/pages/projects/ProjectPage"

const HTTPHacker = React.lazy(() => import("../pages/hacker/httpHacker"))
const CodecPage = React.lazy(() => import("../pages/codec/CodecPage"))
const NewHome = React.lazy(() => import("@/pages/newHome/NewHome"))
export enum Route {
    MITM = "mitm",
    YakScript = "yakScript",
    Codec = "codec",
    WebShellManager = "webShellManager",
    HistoryRequests = "historyRequests",
    IGNORE = "ignore",
    DataCompare = "dataCompare",

    ModManagerDetail = "mod-manager-detail",
    ModManager = "mod-manager",
    ModManagerLegacy = "mod-manager-legacy",

    PenTest = "pen-test",
    HTTPHacker = "httpHacker",
    SimbleDetect = "simbleDetect",
    HTTPFuzzer = "httpFuzzer",
    WebsocketFuzzer = "websocket-fuzzer",
    WebsocketHistory = "websocket-history",

    // 具体漏洞内容
    PoC = "poc",

    // Payload 管理
    PayloadManager = "payload-manager",

    // 通用模块
    GeneralModule = "general-module",
    Mod_ScanPort = "scan-port",
    Mod_Subdomain = "subdomain",
    Mod_Brute = "brute",
    Mod_Crawler = "basic-crawler",
    Mod_SpaceEngine = "spaceengine",

    // DB
    Database = "database",
    DB_Ports = "db-ports",
    DB_HTTPHistory = "db-http-request",
    DB_Domain = "db-domains",
    DB_ExecResults = "db-exec-results",
    DB_Report = "db-reports-results",
    DB_Risk = "db-risks",
    DB_Projects = "db-projects",

    // Handler
    DataHandler = "data-handler", // include codec compare

    // 反连
    PayloadGenerater_New = "PayloadGenerater_New",
    ReverseServer_New = "ReverseServer_New",
    // PayloadGenerater = "payload-generater",
    ReverseManager = `reverse`,
    // ReverseServer = "reverse-server",
    ShellReceiver = "shellReceiver",
    DNSLog = "dnslog",
    ICMPSizeLog = "icmp-sizelog",
    TCPPortLog = "tcp-portlog",

    // 测试
    BatchExecutorPage = "batch-executor-page-ex",
    BatchExecutorRecover = "batch-executor-recover",

    // 数据包扫描
    PacketScanPage = "packet-scan-page",

    // 插件
    AddYakitScript = "add-yakit-script",
    YakitPluginJournalDetails = "yakit-plugin-journal-details",
    OnlinePluginRecycleBin = "online-plugin-recycle-bin",

    // 管理
    AccountAdminPage = "account-admin-page", // 用户管理
    RoleAdminPage = "role-admin-page", // 角色管理
    LicenseAdminPage = "license-admin-page", // license管理
    TrustListPage = "trust-list-admin-page", // 信任用户管理
    PlugInAdminPage = "plug-in-admin-page", // 插件权限管理
    // 获取标准输出流
    AttachEngineCombinedOutput = "attach-engine-combined-output",

    // 首页
    NewHome = "new-home"
}

export function RouteNameToVerboseName(r: string) {
    switch (r) {
        case "packet-scan-page":
            return "数据包扫描"
        case "batch-executor-recover":
            return "批量继续执行"
        case "websocket-fuzzer":
            return "Websocket Fuzzer"
        case "add-yakit-script":
            return "新建插件"
        case "yakit-plugin-journal-details":
            return "插件修改详情"
        case "online-plugin-recycle-bin":
            return "线上插件回收站"
        case "payload-manager":
            return "Payload"
        case "yakScript":
            return "Yak Runner"
        case "httpFuzzer":
            return "Web Fuzzer"
        case "simbleDetect":
            return "安全检测"
        default:
            return r
    }
}
/**
 * @description:菜单属性
 * @param {string} id
 * @param {Route} key 路由的跳转页面
 * @param {MenuDataProps[]} subMenuData 子菜单数据
 * @param {string} label 展示的菜单名称
 * @param {JSX.Element} icon 展示的图标
 * @param {boolean} hidden 是否隐藏
 * @param {string} describe 描述
 * @param {number} yakScriptId 如果该路由为插件时的插件id
 * @param {string} yakScripName 插件名称
 * @param {string} menuPattern 菜单模式 novice新手模式 expert专家模式 simple-ee企业版简易模式
 * @param {number} MenuSort 菜单排序字段
 */
export interface MenuDataProps {
    id: string
    key?: Route
    subMenuData?: MenuDataProps[]
    label: string
    icon?: JSX.Element
    hoverIcon?: JSX.Element
    disabled?: boolean
    hidden?: boolean
    describe?: string
    yakScriptId?: number
    yakScripName?: string
    menuPattern?: ("novice"|"expert")[]
    /**
     * @description: 父级的分组名称
     */
    Group?: string
    /**
     * @description: 后端接口需要的排序字段
     */
    MenuSort?: number
}

export const NoScrollRoutes: Route[] = [Route.HTTPHacker, Route.Mod_Brute, Route.YakScript]

interface ComponentParams {
    // Route.HTTPFuzzer 参数
    isHttps?: boolean
    request?: string
    system?: string
    order?: string
    fuzzerParams?: fuzzerInfoProp

    // Route.Mod_ScanPort 参数
    scanportParams?: string

    // Route.Mod_Brute 参数
    bruteParams?: string
    recoverUid?: string
    recoverBaseProgress?: number

    // Route.PacketScanPage 参数
    packetScan_FlowIds?: number[]
    packetScan_Https?: boolean
    packetScan_HttpRequest?: Uint8Array
    packetScan_Keyword?: string

    // 分享的初始化参数
    shareContent?: string

    // websocket fuzzer 相关
    wsTls?: boolean
    wsRequest?: Uint8Array

    // yakit 插件日志详情参数
    YakScriptJournalDetailsId?: number
    // facade server参数
    facadeServerParams?: StartFacadeServerParams
    classGeneraterParams?: {[key: string]: any}
    classType?: string

    // 简易企业版 - 安全检测
    recoverOnlineGroup?: string
}

export const ContentByRoute = (r: Route | string, yakScriptId?: number, params?: ComponentParams): JSX.Element => {
    const routeStr = `${r}`
    // 处理社区插件（以插件 ID 添加的情况）
    if (routeStr.startsWith("plugin:")) {
        let id = -1
        try {
            let splitList = routeStr.split(":")
            let idRaw = splitList.reverse().shift()
            id = parseInt(idRaw || "")
        } catch (e) {
            failed(`Loading PluginKey: ${r} failed`)
        }
        return <PluginOperator yakScriptId={yakScriptId || id} size={"big"} fromMenu={true} />
    }

    if (routeStr.startsWith("batch:")) {
        let batchMenuItemId = 0
        try {
            let splitList = routeStr.split(":")
            let verbose = splitList.reverse().shift()
            batchMenuItemId = parseInt(verbose || "0")
        } catch (e) {
            failed(`Loading PluginKey: ${r} failed`)
        }
        return <ReadOnlyBatchExecutorByMenuItem MenuItemId={batchMenuItemId} />
    }
    switch (r) {
        case Route.ShellReceiver:
            return <ShellReceiverPage />
        case Route.WebShellManager:
            return <div>待开发</div>
        case Route.PoC:
            return <YakBatchExecutors keyword={"poc"} verbose={"Poc"} />
        case Route.YakScript:
            return <YakExecutor />
        case Route.HTTPHacker:
            return (
                <Suspense fallback={<div>loading</div>}>
                    <HTTPHacker />
                </Suspense>
            )
        case Route.HTTPFuzzer:
            return (
                <HTTPFuzzerPage
                    isHttps={params?.isHttps}
                    request={params?.request}
                    system={params?.system}
                    order={params?.order}
                    fuzzerParams={params?.fuzzerParams}
                    shareContent={params?.shareContent}
                />
            )
        case Route.NewHome:
            return <NewHome/>
        case Route.SimbleDetect:
            return <SimbleDetect Uid={params?.recoverUid}
            BaseProgress={params?.recoverBaseProgress}
            YakScriptOnlineGroup={params?.recoverOnlineGroup}
            />
        case Route.WebsocketFuzzer:
            return <WebsocketFuzzer tls={params?.wsTls} request={params?.wsRequest} />
        case Route.Codec:
            return <CodecPage />
        case Route.ModManager:
            return <YakitStorePage />
        case Route.PayloadManager:
            return <PayloadManagerPage />
        case Route.Mod_ScanPort:
            return <PortScanPage sendTarget={params?.scanportParams} />
        case Route.Mod_Brute:
            return <BrutePage sendTarget={params?.bruteParams} />
        case Route.DataCompare:
            return <DataCompare />
        case Route.DB_HTTPHistory:
            return <HTTPHistory />
        case Route.DB_Ports:
            return <PortAssetTable />
        case Route.DB_Domain:
            return <DomainAssetPage />
        case Route.DB_ExecResults:
            return <YakScriptExecResultTable />
        // case Route.ReverseServer:
        //     return <ReverseServerPage />
        // case Route.PayloadGenerater:
        //     return <PayloadGeneraterPage />
        case Route.PayloadGenerater_New:
            return <JavaPayloadPage />
        case Route.ReverseServer_New:
            return <NewReverseServerPage />
        case Route.DB_Risk:
            return <RiskPage />
        case Route.DNSLog:
            return <DNSLogPage />
        case Route.ICMPSizeLog:
            return <ICMPSizeLoggerPage />
        case Route.TCPPortLog:
            return <RandomPortLogPage />
        case Route.BatchExecutorPage:
            // return <BatchExecutorPage/>
            return <BatchExecutorPageEx />
        case Route.DB_Report:
            return <ReportViewerPage />
        case Route.BatchExecutorRecover:
            return (
                <ReadOnlyBatchExecutorByRecoverUid
                    Uid={params?.recoverUid}
                    BaseProgress={params?.recoverBaseProgress}
                />
            )
        case Route.PacketScanPage:
            return (
                <PacketScanner
                    HttpFlowIds={params?.packetScan_FlowIds}
                    Https={params?.packetScan_Https}
                    HttpRequest={params?.packetScan_HttpRequest}
                    Keyword={params?.packetScan_Keyword}
                />
            )
        case Route.AddYakitScript:
            return <AddYakitScript />
        case Route.WebsocketHistory:
            return <WebsocketFlowHistory />
        case Route.YakitPluginJournalDetails:
            return <YakitPluginJournalDetails YakitPluginJournalDetailsId={params?.YakScriptJournalDetailsId || 0} />
        case Route.OnlinePluginRecycleBin:
            return <OnlinePluginRecycleBin />
        case Route.AccountAdminPage:
            return <AccountAdminPage />
        case Route.RoleAdminPage:
            return <RoleAdminPage />
        case Route.LicenseAdminPage:
            return <LicenseAdminPage />
        case Route.TrustListPage:
            return <TrustListPage />
        case Route.PlugInAdminPage:
            return <PlugInAdminPage />
        case Route.AttachEngineCombinedOutput:
            return <EngineConsole />
        case Route.DB_Projects:
            return <ProjectPage />
        default:
            return <div />
    }
}

/**
 * @description: 系统默认菜单数据
 */
export const DefaultRouteMenuData: MenuDataProps[] = [
    {
        id: "1",
        label: "手工渗透",
        subMenuData: [
            {
                id: "1-1",
                key: Route.HTTPHacker,
                label: "MITM 交互式劫持",
                icon: <MenuMITMInteractiveHijackingIcon />,
                hoverIcon: <MenuSolidMITMInteractiveHijackingIcon />,
                describe: "安装 SSL/TLS 证书，劫持浏览器所有流量请求、响应数据包，提供手动劫持与被动扫描两种模式"
            },
            {
                id: "1-2",
                key: Route.HTTPFuzzer,
                label: "Web Fuzzer",
                icon: <MenuWebFuzzerIcon />,
                hoverIcon: <MenuSolidWebFuzzerIcon />,
                describe: "通过核心模糊测试标签语法，实现了对 Burpsuite 的 Repeater 和 Intruder 的完美整合"
            },
            {
                id: "1-3",
                key: Route.WebsocketFuzzer,
                label: "Websocket Fuzzer",
                icon: <MenuWebsocketFuzzerIcon />,
                hoverIcon: <MenuSolidWebsocketFuzzerIcon />
            }
            // {
            //     id: "1-4",
            //     key: Route.PayloadGenerater_New,
            //     label: "Yso-Java Hack",
            //     icon: <MenuYsoJavaHackIcon />,
            //     describe: "配置序列化 Payload 或恶意类"
            // }
        ]
    },
    {
        id: "2",
        label: "基础工具",
        menuPattern: ["novice","expert"],
        key: Route.GeneralModule,
        subMenuData: [
            {
                id: "2-1",
                key: Route.Mod_Brute,
                label: "爆破与未授权检测",
                icon: <MenuBlastingAndUnauthorizedTestingIcon />,
                hoverIcon: <MenuSolidBlastingAndUnauthorizedTestingIcon />,
                describe: "对目标的登录账号、密码等进行爆破，在爆破前会进行未授权检测"
            },
            {
                id: "2-2",
                key: undefined,
                label: "基础爬虫",
                yakScripName: "基础爬虫",
                icon: <MenuBasicCrawlerIcon />,
                hoverIcon: <MenuSolidBasicCrawlerIcon />,
                describe: "通过爬虫可快速了解网站的整体架构"
            },
            {
                id: "2-3",
                key: undefined,
                label: "空间引擎: Hunter",
                yakScripName: "空间引擎: Hunter",
                icon: <MenuSpaceEngineHunterIcon />,
                hoverIcon: <MenuSolidSpaceEngineHunterIcon />
            },
            {
                id: "2-4",
                key: Route.Mod_ScanPort,
                label: "端口/指纹扫描",
                icon: <MenuPortScanningIcon />,
                hoverIcon: <MenuSolidPortScanningIcon />,
                describe: "对 IP、IP段、域名等端口进行 SYN、指纹检测、可编写插件进行检测、满足更个性化等需求"
            },
            {
                id: "2-5",
                key: undefined,
                label: "子域名收集",
                yakScripName: "子域名收集",
                icon: <MenuSubDomainCollectionIcon />,
                hoverIcon: <MenuSolidSubDomainCollectionIcon />
            },
            {
                id: "2-6",
                key: undefined,
                label: "综合目录扫描与爆破",
                yakScripName: "综合目录扫描与爆破",
                icon: <MenuComprehensiveCatalogScanningAndBlastingIcon />,
                hoverIcon: <MenuSolidComprehensiveCatalogScanningAndBlastingIcon />,
                describe: "带有内置字典的综合目录扫描与爆破"
            }
        ]
    },
    {
        id: "3",
        label: "专项漏洞检测",
        menuPattern: ["novice","expert"],
        subMenuData: [
            {
                id: "3-1",
                key: Route.PoC,
                label: "专项漏洞检测",
                icon: <MenuSpecialVulnerabilityDetectionIcon />,
                hoverIcon: <MenuSolidSpecialVulnerabilityDetectionIcon />,
                describe: "通过预制漏洞源码，对特定目标进行专项漏洞检测，可以自定义新增 POC 种类"
            }
        ]
    },
    {
        id: "4",
        label: "插件",
        menuPattern: ["novice","expert"],
        subMenuData: [
            {
                id: "4-1",
                key: Route.ModManager,
                label: "插件仓库",
                icon: <MenuPluginWarehouseIcon />,
                hoverIcon: <MenuSolidPluginWarehouseIcon />,
                describe: "目前插件为 6 大类型，可根据需要灵活编写插件，支持从 GitHub 加载插件"
            },
            {
                id: "4-2",
                key: Route.BatchExecutorPage,
                label: "插件批量执行",
                icon: <MenuPluginBatchExecutionIcon />,
                hoverIcon: <MenuSolidPluginBatchExecutionIcon />,
                describe: "自由选择需要的 POC 进行批量漏洞检测"
            }
        ]
    },
    // {id: "5", key: Route.PayloadManager, label: "Payload 管理", icon: <AuditOutlined />},
    // {id: "6", key: Route.YakScript, label: "Yak Runner", icon: <CodeOutlined />},
    {
        id: "7",
        label: "反连",
        subMenuData: [
            {
                id: "7-1",
                key: Route.ShellReceiver,
                label: "端口监听器",
                icon: <MenuPortListenerIcon />,
                hoverIcon: <MenuSolidPortListenerIcon />,
                describe: "反弹 Shell 接收工具，可以在服务器上开启一个端口，进行监听，并进行交互"
            },
            {
                id: "7-2",
                key: Route.ReverseServer_New,
                label: "反连服务器",
                icon: <MenuReverseConnectionServerIcon />,
                hoverIcon: <MenuSolidReverseConnectionServerIcon />,
                describe: "使用协议端口复用技术，同时在一个端口同时实现 HTTP / RMI / HTTPS 等协议的反连"
            },
            {
                id: "7-3",
                key: Route.DNSLog,
                label: "DNSLog",
                icon: <MenuDNSLogIcon />,
                hoverIcon: <MenuSolidDNSLogIcon />,
                describe: "自动生成一个子域名，任何查询到这个子域名的 IP 被集合展示在列表中"
            },
            {
                id: "7-4",
                key: Route.ICMPSizeLog,
                label: "ICMP-SizeLog",
                icon: <MenuICMPSizeLogIcon />,
                hoverIcon: <MenuSolidICMPSizeLogIcon />,
                describe: "使用 ping 携带特定长度数据包判定 ICMP 反连"
            },
            {
                id: "7-5",
                key: Route.TCPPortLog,
                label: "TCP-PortLog",
                icon: <MenuTCPPortLogIcon />,
                hoverIcon: <MenuSolidTCPPortLogIcon />,
                describe: "使用未开放的随机端口来判定 TCP 反连"
            },
            {
                id: "7-6",
                key: Route.PayloadGenerater_New,
                label: "Yso-Java Hack",
                icon: <MenuYsoJavaHackIcon />,
                hoverIcon: <MenuSolidYsoJavaHackIcon />,
                describe: "配置序列化 Payload 或恶意类"
            }
        ]
    },
    {
        id: "8",
        label: "数据处理",
        menuPattern: ["novice","expert"],
        subMenuData: [
            {
                id: "8-1",
                key: Route.Codec,
                label: "Codec",
                icon: <MenuCodecIcon />,
                hoverIcon: <MenuSolidCodecIcon />,
                describe:
                    "可对数据进行各种处理（包括加密、解密、反序列化、Json 处理等等），还可通过插件自定义数据处理方法"
            },
            {
                id: "8-2",
                key: Route.DataCompare,
                label: "数据对比",
                icon: <MenuDataComparisonIcon />,
                hoverIcon: <MenuSolidDataComparisonIcon />,
                describe: "将数据进行对比，快速识别不同处"
            }
        ]
    },
    {
        id: "9",
        label: "数据库",
        menuPattern: ["novice","expert"],
        subMenuData: [
            {
                id: "9-1",
                key: Route.DB_Report,
                label: "报告",
                icon: <MenuReportIcon />,
                hoverIcon: <MenuSolidReportIcon />
            },
            {
                id: "9-2",
                key: Route.DB_ExecResults,
                label: "插件执行结果",
                icon: <MenuPlugExecutionResultsIcon />,
                hoverIcon: <MenuSolidPlugExecutionResultsIcon />
            },
            {
                id: "9-3",
                key: Route.DB_Ports,
                label: "端口资产",
                icon: <MenuPortAssetsIcon />,
                hoverIcon: <MenuSolidPortAssetsIcon />
            },
            {
                id: "9-4",
                key: Route.DB_Risk,
                label: "漏洞与风险",
                icon: <MenuVulnerabilityRiskIcon />,
                hoverIcon: <MenuSolidVulnerabilityRiskIcon />
            },
            {
                id: "9-5",
                key: Route.DB_Domain,
                label: "域名资产",
                icon: <MenuDomainAssetsIcon />,
                hoverIcon: <MenuSolidDomainAssetsIcon />
            },
            {
                id: "9-6",
                key: Route.DB_HTTPHistory,
                label: "HTTP History",
                icon: <MenuHTTPHistoryIcon />,
                hoverIcon: <MenuSolidHTTPHistoryIcon />
            },
            // {
            //     id: "9-7",
            //     key: Route.AttachEngineCombinedOutput,
            //     label: "引擎 Console",
            //     icon: <MenuDefaultPluginIcon />,
            //     hoverIcon: <MenuSolidDefaultPluginIcon />
            // },
            {
                id: "9-8",
                key: Route.DB_Projects,
                label: "项目管理(Beta*)",
                icon: <MenuDefaultPluginIcon />,
                hoverIcon: <MenuSolidDefaultPluginIcon />
            }
        ]
    },
    /**
        * @description: 企业版简易版菜单
    */
]

/**
 * @description: 隐藏的菜单
 */
export const HiddenMenuData: MenuDataProps[] = [
    {
        id: "Route.BatchExecutorRecover",
        key: Route.BatchExecutorRecover,
        label: "继续任务：批量执行插件",
        disabled: true,
        hidden: true
    },
    {
        id: "Route.AccountAdminPage",
        key: Route.AccountAdminPage,
        label: "用户管理",
        disabled: true,
        hidden: true
    },
    {
        id: "Route.RoleAdminPage",
        key: Route.RoleAdminPage,
        label: "角色管理",
        disabled: true,
        hidden: true
    },
    {
        id: "Route.LicenseAdminPage",
        key: Route.LicenseAdminPage,
        label: "License管理",
        disabled: true,
        hidden: true
    },
    {
        id: "Route.TrustListPage",
        key: Route.TrustListPage,
        label: "用户管理",
        disabled: true,
        hidden: true
    },
    {
        id: "Route.PlugInAdminPage",
        key: Route.PlugInAdminPage,
        label: "插件权限",
        disabled: true,
        hidden: true
    },
    {
        id: "Route.NewHome",
        key: Route.NewHome,
        label: "首页",
        disabled: true,
        hidden: true
    }
]

export const SimbleDataBaseMenu: MenuDataProps[] = [
    {
        id: "10",
        label: "安全检测",
        subMenuData: [
            {
                id: "10-1",
                key: Route.SimbleDetect,
                label: "安全检测",
                icon: <MenuBatchVulnerabilityDetectionIcon />,
                hoverIcon: <MenuSolidBatchVulnerabilityDetectionIcon />,
                describe: ""
            },
        ]
    },{
    id: "9",
        label: "数据库",
        subMenuData: [
            {
                id: "9-1",
                key: Route.DB_Report,
                label: "报告",
                icon: <MenuReportIcon />,
                hoverIcon: <MenuSolidReportIcon />
            },
            {
                id: "9-2",
                key: Route.DB_ExecResults,
                label: "插件执行结果",
                icon: <MenuPlugExecutionResultsIcon />,
                hoverIcon: <MenuSolidPlugExecutionResultsIcon />
            },
            {
                id: "9-3",
                key: Route.DB_Ports,
                label: "端口资产",
                icon: <MenuPortAssetsIcon />,
                hoverIcon: <MenuSolidPortAssetsIcon />
            },
        ]
}]