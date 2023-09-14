import React, {ReactNode, Suspense} from "react"
import {YakExecutor} from "../pages/invoker/YakExecutor"
import {ShellReceiverPage} from "../pages/shellReceiver/ShellReceiverPage"
import {YakBatchExecutors} from "../pages/invoker/batch/YakBatchExecutors"
import {PayloadManagerPage} from "../pages/payloadManager/PayloadManager"
import {PortScanPage} from "../pages/portscan/PortScanPage"
import {PluginOperator} from "../pages/yakitStore/PluginOperator"
import {failed} from "../utils/notification"
import {BrutePage} from "../pages/brute/BrutePage"
import {DataCompare} from "../pages/compare/DataCompare"
import {HTTPHistory} from "../components/HTTPHistory"
import {PortAssetTable} from "../pages/assetViewer/PortAssetPage"
import {DomainAssetPage} from "../pages/assetViewer/DomainAssetPage"
import {RiskPage} from "../pages/risks/RiskPage"
import {DNSLogPage} from "../pages/dnslog/DNSLogPage"
import {fuzzerInfoProp} from "../pages/MainOperator"
import {ICMPSizeLoggerPage} from "../pages/icmpsizelog/ICMPSizeLoggerPage"
import {RandomPortLogPage} from "../pages/randomPortLog/RandomPortLogPage"
import {ReportViewerPage} from "../pages/assetViewer/ReportViewerPage"
import {BatchExecutorPageEx} from "../pages/invoker/batch/BatchExecutorPageEx"
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
import {HoleCollectPage} from "@/pages/loginOperationMenu/HoleCollectPage"
import LicenseAdminPage from "@/pages/loginOperationMenu/LicenseAdminPage"
import PlugInAdminPage from "@/pages/loginOperationMenu/PlugInAdminPage"
import {TrustListPage} from "@/pages/loginOperationMenu/TrustListPage"
import {SimpleDetect} from "@/pages/simpleDetect/SimpleDetect"
import {EngineConsole} from "@/pages/engineConsole/EngineConsole"
import {ChaosMakerPage} from "@/pages/chaosmaker/ChaosMaker"
import {ScreenRecorderPage} from "@/pages/screenRecorder/ScreenRecorderPage"
import {CVEViewer} from "@/pages/cve/CVEViewer"
import {PageLoading} from "./PageLoading"
import {
    PrivateOutlineBasicCrawlerIcon,
    PrivateOutlineBatchPluginIcon,
    PrivateOutlineBruteIcon,
    PrivateOutlineCVEIcon,
    PrivateOutlineCodecIcon,
    PrivateOutlineDNSLogIcon,
    PrivateOutlineDataCompareIcon,
    PrivateOutlineDefaultPluginIcon,
    PrivateOutlineDirectoryScanningIcon,
    PrivateOutlineDomainIcon,
    PrivateOutlineHTTPHistoryIcon,
    PrivateOutlineICMPSizeLogIcon,
    PrivateOutlineMitmIcon,
    PrivateOutlinePayloadGeneraterIcon,
    PrivateOutlinePluginLocalIcon,
    PrivateOutlinePluginOwnerIcon,
    PrivateOutlinePluginStoreIcon,
    PrivateOutlinePocIcon,
    PrivateOutlinePortsIcon,
    PrivateOutlineReportIcon,
    PrivateOutlineReverseServerIcon,
    PrivateOutlineRiskIcon,
    PrivateOutlineScanPortIcon,
    PrivateOutlineShellReceiverIcon,
    PrivateOutlineSpaceEngineIcon,
    PrivateOutlineSubDomainCollectionIcon,
    PrivateOutlineTCPPortLogIcon,
    PrivateOutlineWebFuzzerIcon,
    PrivateOutlineWebsiteTreeIcon,
    PrivateOutlineWebsocketFuzzerIcon,
    PrivateSolidBasicCrawlerIcon,
    PrivateSolidBatchPluginIcon,
    PrivateSolidBruteIcon,
    PrivateSolidCVEIcon,
    PrivateSolidCodecIcon,
    PrivateSolidDNSLogIcon,
    PrivateSolidDataCompareIcon,
    PrivateSolidDefaultPluginIcon,
    PrivateSolidDirectoryScanningIcon,
    PrivateSolidDomainIcon,
    PrivateSolidHTTPHistoryIcon,
    PrivateSolidICMPSizeLogIcon,
    PrivateSolidMitmIcon,
    PrivateSolidPayloadGeneraterIcon,
    PrivateSolidPluginLocalIcon,
    PrivateSolidPluginOwnerIcon,
    PrivateSolidPluginStoreIcon,
    PrivateSolidPocIcon,
    PrivateSolidPortsIcon,
    PrivateSolidReportIcon,
    PrivateSolidRiskIcon,
    PrivateSolidScanPortIcon,
    PrivateSolidShellReceiverIcon,
    PrivateSolidSpaceEngineIcon,
    PrivateSolidSubDomainCollectionIcon,
    PrivateSolidTCPPortLogIcon,
    PrivateSolidWebFuzzerIcon,
    PrivateSolidWebsiteTreeIcon,
    PrivateSolidWebsocketFuzzerIcon
} from "./privateIcon"
import {PluginStore} from "@/pages/yakitStore/store/PluginStore"
import {PluginOwner} from "@/pages/yakitStore/owner/PluginOwner"
import {PluginLocal} from "@/pages/yakitStore/local/PluginLocal"
import {ControlAdminPage} from "@/pages/dynamicControl/DynamicControl"
import {PluginDebuggerPage} from "@/pages/pluginDebugger/PluginDebuggerPage"
import {DebugMonacoEditorPage} from "@/pages/debugMonaco/DebugMonacoEditorPage"
import {WebsiteTreeViewer} from "@/pages/yakitStore/viewers/WebsiteTree"
import {VulinboxManager} from "@/pages/vulinbox/VulinboxManager"
import {DiagnoseNetworkPage} from "@/pages/diagnoseNetwork/DiagnoseNetworkPage"
import {NewCodecPage} from "@/pages/new-codec/NewCodecPage"
import HTTPFuzzerPage from "@/pages/fuzzer/HTTPFuzzerPage"
import {ErrorBoundary} from "react-error-boundary"
import {PageItemProps} from "@/pages/layout/mainOperatorContent/renderSubPage/RenderSubPageType"
import { FuzzerParamItem, AdvancedConfigValueProps } from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import { HTTPResponseExtractor } from "@/pages/fuzzer/MatcherAndExtractionCard/MatcherAndExtractionCardType"

const HTTPHacker = React.lazy(() => import("../pages/hacker/httpHacker"))
const CodecPage = React.lazy(() => import("../pages/codec/CodecPage"))
const NewHome = React.lazy(() => import("@/pages/newHome/NewHome"))
const WebFuzzerPage = React.lazy(() => import("@/pages/fuzzer/WebFuzzerPage/WebFuzzerPage"))

/** 渲染端所有页面枚举 */
export enum YakitRoute {
    /** 首页 */
    NewHome = "new-home",
    /** 手动渗透 */
    HTTPHacker = "httpHacker",
    HTTPFuzzer = "httpFuzzer",
    WebsocketFuzzer = "websocket-fuzzer",
    Codec = "codec",
    DataCompare = "dataCompare",
    /** 基础工具 */
    Mod_ScanPort = "scan-port",
    PoC = "poc",
    Plugin_OP = "plugin-op",
    Mod_Brute = "brute",
    /** 插件 */
    Plugin_Store = "plugin-store",
    Plugin_Owner = "plugin-owner",
    Plugin_Local = "plugin-local",
    BatchExecutorPage = "batch-executor-page-ex",
    /** 反连 */
    DNSLog = "dnslog",
    ICMPSizeLog = "icmp-sizelog",
    TCPPortLog = "tcp-portlog",
    PayloadGenerater_New = "PayloadGenerater_New",
    ReverseServer_New = "ReverseServer_New",
    ShellReceiver = "shellReceiver",
    /** 数据库 */
    DB_HTTPHistory = "db-http-request",
    DB_Report = "db-reports-results",
    DB_Risk = "db-risks",
    DB_Ports = "db-ports",
    DB_Domain = "db-domains",
    WebsiteTree = "website-tree",
    DB_CVE = "cve",
    /** 独立功能页面 */
    // Yak-Runner页面
    YakScript = "yakScript",
    // Payload页面
    PayloadManager = "payload-manager",
    // 私有版用户管理
    AccountAdminPage = "account-admin-page",
    RoleAdminPage = "role-admin-page",
    HoleCollectPage = "hole-collect-page",
    LicenseAdminPage = "license-admin-page",
    // 公开版用户管理
    TrustListPage = "trust-list-admin-page",
    PlugInAdminPage = "plug-in-admin-page",
    // 远程管理
    ControlAdminPage = "control-admin-page",
    // 插件批量页面中未完成页面的点击弹出页面
    BatchExecutorRecover = "batch-executor-recover",
    // http-history页面右键菜单"数据包扫描"生成页面
    PacketScanPage = "packet-scan-page",
    // 新建插件页面
    AddYakitScript = "add-yakit-script",
    // 插件日志-单条详情页面
    YakitPluginJournalDetails = "yakit-plugin-journal-details",
    // 我的插件回收站页面
    OnlinePluginRecycleBin = "online-plugin-recycle-bin",
    /** 简易版专属 */
    SimpleDetect = "simpleDetect",
    // 录屏管理器
    ScreenRecorderPage = "screen-recorder-page",
    // 全局功能-试验性功能-BAS实验室
    DB_ChaosMaker = "db-chaosmaker",
    // 调试插件的功能
    Beta_DebugPlugin = "beta-debug-plugin",
    // 调试插件编辑器
    Beta_DebugMonacoEditor = "beta-debug-monaco-editor",
    // 靶场调试
    Beta_VulinboxManager = "beta-vulinbox-manager",
    // 网络调试
    Beta_DiagnoseNetwork = "beta-diagnose-network",
    //新版codec
    Beta_Codec = "beta-codec"
}
/**
 * @description 页面路由对应的页面信息
 * * label-页面名称
 * * describe(非必需)-页面描述语
 */
export const YakitRouteToPageInfo: Record<YakitRoute, {label: string; describe?: string}> = {
    "new-home": {label: "首页"},
    httpHacker: {
        label: "MITM 交互式劫持",
        describe: "安装 SSL/TLS 证书，劫持浏览器所有流量请求、响应数据包，提供手动劫持与被动扫描两种模式"
    },
    httpFuzzer: {
        label: "Web Fuzzer",
        describe: "通过核心模糊测试标签语法，实现了对 Burpsuite 的 Repeater 和 Intruder 的完美整合"
    },
    "websocket-fuzzer": {label: "Websocket Fuzzer"},
    codec: {
        label: "Codec",
        describe: "可对数据进行各种处理（包括加密、解密、反序列化、Json 处理等等），还可通过插件自定义数据处理方法"
    },
    dataCompare: {label: "数据对比", describe: "将数据进行对比，快速识别不同处"},
    "scan-port": {
        label: "端口/指纹扫描",
        describe: "对 IP、IP段、域名等端口进行 SYN、指纹检测、可编写插件进行检测、满足更个性化等需求"
    },
    poc: {label: "专项漏洞检测", describe: "通过预制漏洞源码，对特定目标进行专项漏洞检测，可以自定义新增 POC 种类"},
    "plugin-op": {label: "插件"},
    brute: {label: "弱口令检测", describe: "对目标的登录账号、密码等进行爆破，在爆破前会进行未授权检测"},
    "plugin-store": {label: "插件商店", describe: "目前插件为6大类型，可根据需要灵活编写插件，支持从插件商店下载插件"},
    "plugin-owner": {label: "我的插件"},
    "plugin-local": {label: "本地插件"},
    "batch-executor-page-ex": {label: "批量执行", describe: "自由选择需要的 POC 进行批量漏洞检测"},
    dnslog: {label: "DNSLog", describe: "自动生成一个子域名，任何查询到这个子域名的 IP 被集合展示在列表中"},
    "icmp-sizelog": {label: "ICMP-SizeLog", describe: "使用 ping 携带特定长度数据包判定 ICMP 反连"},
    "tcp-portlog": {label: "TCP-PortLog", describe: "使用未开放的随机端口来判定 TCP 反连"},
    PayloadGenerater_New: {label: "Yso-Java Hack", describe: "配置序列化 Payload 或恶意类"},
    ReverseServer_New: {
        label: "反连服务器",
        describe: "使用协议端口复用技术，同时在一个端口同时实现 HTTP / RMI / HTTPS 等协议的反连"
    },
    shellReceiver: {
        label: "端口监听器",
        describe: "反弹 Shell 接收工具，可以在服务器上开启一个端口，进行监听，并进行交互"
    },
    "db-http-request": {label: "History"},
    "db-reports-results": {label: "报告"},
    "db-risks": {label: "漏洞"},
    "db-ports": {label: "端口"},
    "db-domains": {label: "域名"},
    "website-tree": {label: "网站树"},
    cve: {label: "CVE 管理"},
    yakScript: {label: "Yak Runner", describe: "使用特有的 Yaklang 进行编程，直接调用引擎最底层能力 POC 种类"},
    "payload-manager": {
        label: "Payload",
        describe: "通过上传文件、手动删改等，自定义 Payload，可在爆破和 Web Fuzzer 中进行使用"
    },
    "account-admin-page": {label: "用户管理"},
    "role-admin-page": {label: "角色管理"},
    "hole-collect-page": {label: "漏洞汇总"},
    "license-admin-page": {label: "License管理"},
    "trust-list-admin-page": {label: "用户管理"},
    "plug-in-admin-page": {label: "插件权限"},
    "control-admin-page": {label: "远程管理"},
    "batch-executor-recover": {label: "继续任务：批量执行插件"},
    "packet-scan-page": {label: "数据包扫描"},
    "add-yakit-script": {label: "新建插件"},
    "yakit-plugin-journal-details": {label: "插件修改详情"},
    "online-plugin-recycle-bin": {label: "线上插件回收站"},
    simpleDetect: {label: "安全检测"},
    "screen-recorder-page": {label: "录屏管理"},
    "db-chaosmaker": {label: "BAS实验室"},
    "beta-debug-plugin": {label: "插件调试"},
    "beta-debug-monaco-editor": {label: "插件编辑器"},
    "beta-vulinbox-manager": {label: "Vulinbox 管理器"},
    "beta-diagnose-network": {label: "网络异常诊断"},
    "beta-codec": {label: "新版codec"}
}
/** 页面路由(无法多开的页面) */
export const SingletonPageRoute: YakitRoute[] = [
    YakitRoute.NewHome,
    YakitRoute.HTTPHacker,
    YakitRoute.PoC,
    YakitRoute.Plugin_Store,
    YakitRoute.Plugin_Owner,
    YakitRoute.Plugin_Local,
    YakitRoute.BatchExecutorPage,
    YakitRoute.DNSLog,
    YakitRoute.ICMPSizeLog,
    YakitRoute.TCPPortLog,
    YakitRoute.ShellReceiver,
    YakitRoute.DB_HTTPHistory,
    YakitRoute.DB_Report,
    YakitRoute.DB_Risk,
    YakitRoute.DB_Ports,
    YakitRoute.DB_Domain,
    YakitRoute.WebsiteTree,
    YakitRoute.DB_CVE,
    YakitRoute.YakScript,
    YakitRoute.PayloadManager,
    YakitRoute.AccountAdminPage,
    YakitRoute.RoleAdminPage,
    YakitRoute.HoleCollectPage,
    YakitRoute.LicenseAdminPage,
    YakitRoute.TrustListPage,
    YakitRoute.PlugInAdminPage,
    YakitRoute.AddYakitScript,
    YakitRoute.OnlinePluginRecycleBin,
    YakitRoute.DB_ChaosMaker,
    YakitRoute.ScreenRecorderPage,
    YakitRoute.ControlAdminPage,
    YakitRoute.Beta_VulinboxManager,
    YakitRoute.Beta_DiagnoseNetwork,
    YakitRoute.Beta_Codec
]
/** 不需要软件安全边距的页面路由 */
export const NoPaddingRoute: YakitRoute[] = [
    YakitRoute.PayloadGenerater_New,
    YakitRoute.DataCompare,
    YakitRoute.YakScript,
    // YakitRoute.HTTPHacker,
    YakitRoute.Plugin_Store,
    YakitRoute.Plugin_Owner,
    YakitRoute.Plugin_Local,
    YakitRoute.ICMPSizeLog,
    YakitRoute.TCPPortLog,
    YakitRoute.DNSLog,
    YakitRoute.NewHome,
    YakitRoute.DB_CVE,
    YakitRoute.HTTPFuzzer,
    YakitRoute.WebsiteTree,
    YakitRoute.DB_Ports
]
/** 无滚动条的页面路由 */
export const NoScrollRoutes: YakitRoute[] = [YakitRoute.HTTPHacker, YakitRoute.Mod_Brute, YakitRoute.YakScript]

export interface ComponentParams {
    // Route.HTTPFuzzer 参数
    isHttps?: boolean
    isGmTLS?: boolean
    request?: string
    system?: string
    advancedConfigValue?: AdvancedConfigValueProps
    // order?: string
    /**@param id 页面唯一标识id HTTPFuzzer/SimpleDetect必须要有的，其他页面可以不用 */
    id?: string
    /**@param groupId HTTPFuzzer必须要有的，其他页面可以不用 */
    groupId?: string
    /**@name webFuzzer变量参数 */
    params?:FuzzerParamItem[]
    /**@name webFuzzer提取器参数 */
    extractors?:HTTPResponseExtractor[]

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
    recoverTaskName?: string

    // 数据对比
    leftData?: string
    rightData?: string
}

function withRouteToPage(WrappedComponent) {
    return function WithPage(props) {
        return (
            <ErrorBoundary
                FallbackComponent={({error, resetErrorBoundary}) => {
                    if (!error) {
                        return <div>未知错误</div>
                    }
                    return (
                        <div>
                            <p>逻辑性崩溃，请关闭重试！</p>
                            <pre>{error?.message}</pre>
                        </div>
                    )
                }}
            >
                <WrappedComponent {...props} />
            </ErrorBoundary>
        )
    }
}

export const RouteToPage: (props: PageItemProps) => ReactNode = (props) => {
    const {routeKey, yakScriptId, params} = props
    switch (routeKey) {
        case YakitRoute.NewHome:
            return <NewHome />
        case YakitRoute.HTTPHacker:
            return (
                <Suspense fallback={<PageLoading />}>
                    <HTTPHacker />
                </Suspense>
            )
        case YakitRoute.HTTPFuzzer:
            return (
                <Suspense fallback={<PageLoading />}>
                    <WebFuzzerPage type='config' id={params?.id || ""}>
                        <HTTPFuzzerPage
                            isHttps={params?.isHttps}
                            isGmTLS={params?.isGmTLS}
                            request={params?.request}
                            system={params?.system}
                            id={params?.id || ""}
                            shareContent={params?.shareContent}
                            advancedConfigValue={params?.advancedConfigValue}
                        />
                    </WebFuzzerPage>
                </Suspense>
            )
        case YakitRoute.WebsocketFuzzer:
            return <WebsocketFuzzer tls={params?.wsTls} request={params?.wsRequest} />
        case YakitRoute.Codec:
            return <CodecPage />
        case YakitRoute.DataCompare:
            return <DataCompare leftData={params?.leftData} rightData={params?.rightData}/>
        case YakitRoute.Mod_ScanPort:
            return <PortScanPage sendTarget={params?.scanportParams} />
        case YakitRoute.PoC:
            return <YakBatchExecutors keyword={"poc"} verbose={"Poc"} />
        case YakitRoute.Plugin_OP:
            if (!yakScriptId || !+yakScriptId) return <div />
            return <PluginOperator yakScriptId={yakScriptId || 0} yakScriptName='' size={"big"} fromMenu={true} />
        case YakitRoute.Mod_Brute:
            return <BrutePage sendTarget={params?.bruteParams} />
        case YakitRoute.Plugin_Store:
            return <PluginStore />
        case YakitRoute.Plugin_Owner:
            return <PluginOwner />
        case YakitRoute.Plugin_Local:
            return <PluginLocal />
        case YakitRoute.BatchExecutorPage:
            return <BatchExecutorPageEx />
        case YakitRoute.DNSLog:
            return <DNSLogPage />
        case YakitRoute.ICMPSizeLog:
            return <ICMPSizeLoggerPage />
        case YakitRoute.TCPPortLog:
            return <RandomPortLogPage />
        case YakitRoute.PayloadGenerater_New:
            return <JavaPayloadPage />
        case YakitRoute.ReverseServer_New:
            return <NewReverseServerPage />
        case YakitRoute.ShellReceiver:
            return <ShellReceiverPage />
        case YakitRoute.DB_HTTPHistory:
            return <HTTPHistory />
        case YakitRoute.DB_Report:
            return <ReportViewerPage />
        case YakitRoute.DB_Risk:
            return <RiskPage />
        case YakitRoute.DB_Ports:
            return <PortAssetTable />
        case YakitRoute.DB_Domain:
            return <DomainAssetPage />
        case YakitRoute.WebsiteTree:
            return <WebsiteTreeViewer />
        case YakitRoute.DB_CVE:
            return <CVEViewer />
        case YakitRoute.YakScript:
            return <YakExecutor />
        case YakitRoute.PayloadManager:
            return <PayloadManagerPage />
        case YakitRoute.AccountAdminPage:
            return <AccountAdminPage />
        case YakitRoute.RoleAdminPage:
            return <RoleAdminPage />
        case YakitRoute.HoleCollectPage:
            return <HoleCollectPage />
        case YakitRoute.LicenseAdminPage:
            return <LicenseAdminPage />
        case YakitRoute.TrustListPage:
            return <TrustListPage />
        case YakitRoute.PlugInAdminPage:
            return <PlugInAdminPage />
        case YakitRoute.ControlAdminPage:
            return <ControlAdminPage />
        case YakitRoute.BatchExecutorRecover:
            return (
                <ReadOnlyBatchExecutorByRecoverUid
                    Uid={params?.recoverUid}
                    BaseProgress={params?.recoverBaseProgress}
                />
            )
        case YakitRoute.PacketScanPage:
            return (
                <PacketScanner
                    HttpFlowIds={params?.packetScan_FlowIds}
                    Https={params?.packetScan_Https}
                    HttpRequest={params?.packetScan_HttpRequest}
                    Keyword={params?.packetScan_Keyword}
                />
            )
        case YakitRoute.AddYakitScript:
            return <AddYakitScript />
        case YakitRoute.YakitPluginJournalDetails:
            return <YakitPluginJournalDetails YakitPluginJournalDetailsId={params?.YakScriptJournalDetailsId || 0} />
        case YakitRoute.OnlinePluginRecycleBin:
            return <OnlinePluginRecycleBin />
        case YakitRoute.SimpleDetect:
            return (
                <SimpleDetect
                    tabId={params?.id || ""}
                    Uid={params?.recoverUid}
                    BaseProgress={params?.recoverBaseProgress}
                    YakScriptOnlineGroup={params?.recoverOnlineGroup}
                    TaskName={params?.recoverTaskName}
                />
            )
        case YakitRoute.ScreenRecorderPage:
            return <ScreenRecorderPage />
        case YakitRoute.DB_ChaosMaker:
            return <ChaosMakerPage />
        case YakitRoute.Beta_DebugPlugin:
            return <PluginDebuggerPage />
        case YakitRoute.Beta_DebugMonacoEditor:
            return <DebugMonacoEditorPage />
        case YakitRoute.Beta_VulinboxManager:
            return <VulinboxManager />
        case YakitRoute.Beta_DiagnoseNetwork:
            return <DiagnoseNetworkPage />
        case YakitRoute.Beta_Codec:
            return <NewCodecPage />
        default:
            return <div />
    }
}

export const RouteToPageItem = withRouteToPage(RouteToPage)

/** @name 菜单中内定插件的插件名称(不是展示名称) */
export enum ResidentPluginName {
    SubDomainCollection = "子域名收集",
    BasicCrawler = "基础爬虫",
    SpaceEngine = "空间引擎集成版本",
    DirectoryScanning = "综合目录扫描与爆破"
}

/** @name 数据库一级菜单项属性 */
export interface DatabaseFirstMenuProps {
    /** @name 一级菜单展示名 */
    Group: string
    /** @name 二级菜单项集合 */
    Items: DatabaseSecondMenuProps[]
    /** @name 一级菜单顺序位 */
    GroupSort: number
    /** @name 菜单模式 */
    Mode: string
    /** @name 一级菜单初始值 */
    GroupLabel: string
}
/** @name 数据库二级菜单项属性 */
export interface DatabaseSecondMenuProps {
    /** @name 插件id */
    YakScriptId: number
    /** @name 插件名称 */
    YakScriptName: string
    /** @name 插件头像 */
    HeadImg?: string
    /** @name 菜单模式 */
    Mode: string
    /** @name 二级菜单顺序位 */
    VerboseSort: number
    /** @name 一级菜单顺序位 */
    GroupSort: number
    /** @name 二级菜单路由 */
    Route: string
    /** @name 二级菜单展示名 */
    Verbose: string
    /** @name 二级菜单初始值 */
    VerboseLabel: string
    /** @name 一级菜单展示名 */
    Group: string
    /** @name 一级菜单初始值 */
    GroupLabel: string
}
/**
 * @name 数据库转化的前端数据属性
 * @param route 菜单路由
 * @param label 菜单显示名称
 * @param menuName 菜单代码名(前端代码中定义的名)
 * @param pluginId 插件id
 * @param pluginName 插件名称
 * @param children 子集
 */
export interface DatabaseMenuItemProps {
    route: YakitRoute | undefined
    label: string
    menuName: string
    pluginId: number
    pluginName: string
    HeadImg?: string
    children?: DatabaseMenuItemProps[]
}
/** @name 数据库菜单数据转换为前端数据 */
export const databaseConvertData = (data: DatabaseFirstMenuProps[]) => {
    const menus: DatabaseMenuItemProps[] = []
    for (let item of data) {
        const menu: DatabaseMenuItemProps = {
            route: undefined,
            label: item.Group,
            menuName: item.GroupLabel || item.Group,
            pluginId: 0,
            pluginName: "",
            children: []
        }
        if (item.Items && item.Items.length > 0) {
            for (let subItem of item.Items) {
                const subMenu: DatabaseMenuItemProps = {
                    route: subItem.Route as YakitRoute,
                    label: subItem.Verbose,
                    menuName: subItem.VerboseLabel || subItem.YakScriptName || subItem.Verbose,
                    pluginId: +subItem.YakScriptId || 0,
                    pluginName: subItem.YakScriptName || "",
                    HeadImg: subItem.HeadImg || undefined
                }
                menu.children?.push(subMenu)
            }
        } else {
            menu.children = undefined
        }
        menus.push(menu)
    }
    return menus
}

/** public版菜单项属性 */
export interface PublicRouteMenuProps {
    page: YakitRoute | undefined
    label: string
    describe?: string
    yakScriptId?: number
    yakScripName?: string
    children?: PublicRouteMenuProps[]
}
/**
 * @name public版菜单配置数据
 * @description 注意! 该数据只在折叠菜单时使用，展开菜单的渲染并未使用该数据，如需调整展开菜单，请在组件MenuMode内修改
 */
export const PublicRouteMenu: PublicRouteMenuProps[] = [
    {
        page: undefined,
        label: "渗透测试",
        children: [
            {
                page: YakitRoute.HTTPHacker,
                ...YakitRouteToPageInfo[YakitRoute.HTTPHacker]
            },
            {
                page: undefined,
                label: "Fuzzer",
                children: [
                    {
                        page: YakitRoute.HTTPFuzzer,
                        ...YakitRouteToPageInfo[YakitRoute.HTTPFuzzer]
                    },
                    {
                        page: YakitRoute.WebsocketFuzzer,
                        ...YakitRouteToPageInfo[YakitRoute.WebsocketFuzzer]
                    }
                ]
            },
            {page: YakitRoute.Codec, ...YakitRouteToPageInfo[YakitRoute.Codec]},
            {
                page: YakitRoute.DataCompare,
                ...YakitRouteToPageInfo[YakitRoute.DataCompare]
            }
        ]
    },
    {
        page: undefined,
        label: "安全工具",
        children: [
            {
                page: YakitRoute.Mod_ScanPort,
                ...YakitRouteToPageInfo[YakitRoute.Mod_ScanPort]
            },
            {page: YakitRoute.PoC, ...YakitRouteToPageInfo[YakitRoute.PoC]},
            {page: YakitRoute.Plugin_OP, label: "子域名收集", yakScripName: ResidentPluginName.SubDomainCollection},
            {
                page: YakitRoute.Plugin_OP,
                label: "基础爬虫",
                yakScripName: ResidentPluginName.BasicCrawler,
                describe: "通过爬虫可快速了解网站的整体架构"
            },
            {page: YakitRoute.Plugin_OP, label: "空间引擎", yakScripName: ResidentPluginName.SpaceEngine},
            {
                page: undefined,
                label: "爆破与未授权检测",
                children: [
                    {
                        page: YakitRoute.Mod_Brute,
                        ...YakitRouteToPageInfo[YakitRoute.Mod_Brute]
                    },
                    {
                        page: YakitRoute.Plugin_OP,
                        label: "目录扫描",
                        yakScripName: ResidentPluginName.DirectoryScanning,
                        describe: "带有内置字典的综合目录扫描与爆破"
                    }
                ]
            }
        ]
    },
    {
        page: undefined,
        label: "插件",
        children: [
            {
                page: YakitRoute.Plugin_Store,
                ...YakitRouteToPageInfo[YakitRoute.Plugin_Store]
            },
            {
                page: YakitRoute.Plugin_Owner,
                ...YakitRouteToPageInfo[YakitRoute.Plugin_Owner]
            },
            {
                page: YakitRoute.Plugin_Local,
                ...YakitRouteToPageInfo[YakitRoute.Plugin_Local]
            },
            {
                page: YakitRoute.BatchExecutorPage,
                ...YakitRouteToPageInfo[YakitRoute.BatchExecutorPage]
            }
        ]
    },
    {
        page: undefined,
        label: "反连",
        children: [
            {
                page: undefined,
                label: "反连触发器",
                children: [
                    {
                        page: YakitRoute.DNSLog,
                        ...YakitRouteToPageInfo[YakitRoute.DNSLog]
                    },
                    {
                        page: YakitRoute.ICMPSizeLog,
                        ...YakitRouteToPageInfo[YakitRoute.ICMPSizeLog]
                    },
                    {
                        page: YakitRoute.TCPPortLog,
                        ...YakitRouteToPageInfo[YakitRoute.TCPPortLog]
                    }
                ]
            },
            {
                page: undefined,
                label: "RevHack",
                children: [
                    {
                        page: YakitRoute.PayloadGenerater_New,
                        ...YakitRouteToPageInfo[YakitRoute.PayloadGenerater_New]
                    },
                    {
                        page: YakitRoute.ReverseServer_New,
                        ...YakitRouteToPageInfo[YakitRoute.ReverseServer_New]
                    }
                ]
            },
            {
                page: YakitRoute.ShellReceiver,
                ...YakitRouteToPageInfo[YakitRoute.ShellReceiver]
            }
        ]
    },
    {
        page: undefined,
        label: "数据库",
        children: [
            {
                page: YakitRoute.DB_HTTPHistory,
                ...YakitRouteToPageInfo[YakitRoute.DB_HTTPHistory]
            },
            {page: YakitRoute.DB_Report, ...YakitRouteToPageInfo[YakitRoute.DB_Report]},
            {page: YakitRoute.DB_Risk, ...YakitRouteToPageInfo[YakitRoute.DB_Risk]},
            {page: YakitRoute.DB_Ports, ...YakitRouteToPageInfo[YakitRoute.DB_Ports]},
            {page: YakitRoute.DB_Domain, ...YakitRouteToPageInfo[YakitRoute.DB_Domain]},
            {page: YakitRoute.WebsiteTree, ...YakitRouteToPageInfo[YakitRoute.WebsiteTree]},
            {page: YakitRoute.DB_CVE, ...YakitRouteToPageInfo[YakitRoute.DB_CVE]}
        ]
    }
]
/**
 * @name public版常用插件列表
 * @description 注意！该列表内保存的都为插件的名称
 */
export const PublicCommonPlugins: PublicRouteMenuProps[] = [
    {
        page: undefined,
        label: "子域名收集",
        children: ["crt子域名收集", "纯暴力子域名收集", "SEO综合查询", "被动子域名收集"].map((item) => {
            return {page: YakitRoute.Plugin_OP, label: item, yakScripName: item}
        })
    },
    {
        page: undefined,
        label: "基础工具",
        children: [
            "域名、IP提取",
            "域名批量转IP并查CDN",
            "IP反查域名",
            "批量备案查询",
            "空间引擎集成版本",
            "网站信息获取",
            "主域名提取",
            "杀软匹配tasklist /svc",
            "按行去重",
            "api提取"
        ].map((item) => {
            return {page: YakitRoute.Plugin_OP, label: item, yakScripName: item}
        })
    }
]

/** private版菜单项属性 */
export interface PrivateRouteMenuProps {
    page: YakitRoute | undefined
    label: string
    icon?: ReactNode
    hoverIcon?: JSX.Element
    describe?: string
    yakScriptId?: number
    yakScripName?: string
    children?: PrivateRouteMenuProps[]
}
/** 软件内定插件菜单的icon */
export const getFixedPluginIcon = (name: string) => {
    switch (name) {
        case "基础爬虫":
            return <PrivateOutlineBasicCrawlerIcon />
        case "空间引擎集成版本":
            return <PrivateOutlineSpaceEngineIcon />
        case "子域名收集":
            return <PrivateOutlineSubDomainCollectionIcon />
        case "综合目录扫描与爆破":
            return <PrivateOutlineDirectoryScanningIcon />
        default:
            return <PrivateOutlineDefaultPluginIcon />
    }
}
/** 软件内定插件菜单的hover-icon */
export const getFixedPluginHoverIcon = (name: string) => {
    switch (name) {
        case "基础爬虫":
            return <PrivateSolidBasicCrawlerIcon />
        case "空间引擎集成版本":
            return <PrivateSolidSpaceEngineIcon />
        case "子域名收集":
            return <PrivateSolidSubDomainCollectionIcon />
        case "综合目录扫描与爆破":
            return <PrivateSolidDirectoryScanningIcon />
        default:
            return <PrivateSolidDefaultPluginIcon />
    }
}
/** 软件内定插件菜单的describe */
export const getFixedPluginDescribe = (name: string) => {
    switch (name) {
        case "基础爬虫":
            return "通过爬虫可快速了解网站的整体架构"
        case "空间引擎集成版本":
            return ""
        case "子域名收集":
            return ""
        case "综合目录扫描与爆破":
            return "带有内置字典的综合目录扫描与爆破"
        default:
            return ""
    }
}

/**
 * @name 可以配置和展示的菜单项
 * @description 主要使用-编辑菜单中的系统功能列表
 */
export const PrivateAllMenus: Record<string, PrivateRouteMenuProps> = {
    [YakitRoute.HTTPHacker]: {
        page: YakitRoute.HTTPHacker,
        icon: <PrivateOutlineMitmIcon />,
        hoverIcon: <PrivateSolidMitmIcon />,
        ...YakitRouteToPageInfo[YakitRoute.HTTPHacker]
    },
    [YakitRoute.HTTPFuzzer]: {
        page: YakitRoute.HTTPFuzzer,
        icon: <PrivateOutlineWebFuzzerIcon />,
        hoverIcon: <PrivateSolidWebFuzzerIcon />,
        ...YakitRouteToPageInfo[YakitRoute.HTTPFuzzer]
    },
    [YakitRoute.WebsocketFuzzer]: {
        page: YakitRoute.WebsocketFuzzer,
        icon: <PrivateOutlineWebsocketFuzzerIcon />,
        hoverIcon: <PrivateSolidWebsocketFuzzerIcon />,
        ...YakitRouteToPageInfo[YakitRoute.WebsocketFuzzer]
    },
    [YakitRoute.Mod_Brute]: {
        page: YakitRoute.Mod_Brute,
        icon: <PrivateOutlineBruteIcon />,
        hoverIcon: <PrivateSolidBruteIcon />,
        ...YakitRouteToPageInfo[YakitRoute.Mod_Brute]
    },
    [YakitRoute.Mod_ScanPort]: {
        page: YakitRoute.Mod_ScanPort,
        icon: <PrivateOutlineScanPortIcon />,
        hoverIcon: <PrivateSolidScanPortIcon />,
        ...YakitRouteToPageInfo[YakitRoute.Mod_ScanPort]
    },
    [YakitRoute.PoC]: {
        page: YakitRoute.PoC,
        icon: <PrivateOutlinePocIcon />,
        hoverIcon: <PrivateSolidPocIcon />,
        ...YakitRouteToPageInfo[YakitRoute.PoC]
    },
    [YakitRoute.Plugin_Store]: {
        page: YakitRoute.Plugin_Store,
        icon: <PrivateOutlinePluginStoreIcon />,
        hoverIcon: <PrivateSolidPluginStoreIcon />,
        ...YakitRouteToPageInfo[YakitRoute.Plugin_Store]
    },
    [YakitRoute.Plugin_Owner]: {
        page: YakitRoute.Plugin_Owner,
        icon: <PrivateOutlinePluginOwnerIcon />,
        hoverIcon: <PrivateSolidPluginOwnerIcon />,
        ...YakitRouteToPageInfo[YakitRoute.Plugin_Owner]
    },
    [YakitRoute.Plugin_Local]: {
        page: YakitRoute.Plugin_Local,
        icon: <PrivateOutlinePluginLocalIcon />,
        hoverIcon: <PrivateSolidPluginLocalIcon />,
        ...YakitRouteToPageInfo[YakitRoute.Plugin_Local]
    },
    [YakitRoute.BatchExecutorPage]: {
        page: YakitRoute.BatchExecutorPage,
        icon: <PrivateOutlineBatchPluginIcon />,
        hoverIcon: <PrivateSolidBatchPluginIcon />,
        ...YakitRouteToPageInfo[YakitRoute.BatchExecutorPage]
    },
    [YakitRoute.ShellReceiver]: {
        page: YakitRoute.ShellReceiver,
        icon: <PrivateOutlineShellReceiverIcon />,
        hoverIcon: <PrivateSolidShellReceiverIcon />,
        ...YakitRouteToPageInfo[YakitRoute.ShellReceiver]
    },
    [YakitRoute.ReverseServer_New]: {
        page: YakitRoute.ReverseServer_New,
        icon: <PrivateOutlineReverseServerIcon />,
        hoverIcon: <PrivateSolidShellReceiverIcon />,
        ...YakitRouteToPageInfo[YakitRoute.ReverseServer_New]
    },
    [YakitRoute.DNSLog]: {
        page: YakitRoute.DNSLog,
        icon: <PrivateOutlineDNSLogIcon />,
        hoverIcon: <PrivateSolidDNSLogIcon />,
        ...YakitRouteToPageInfo[YakitRoute.DNSLog]
    },
    [YakitRoute.ICMPSizeLog]: {
        page: YakitRoute.ICMPSizeLog,
        icon: <PrivateOutlineICMPSizeLogIcon />,
        hoverIcon: <PrivateSolidICMPSizeLogIcon />,
        ...YakitRouteToPageInfo[YakitRoute.ICMPSizeLog]
    },
    [YakitRoute.TCPPortLog]: {
        page: YakitRoute.TCPPortLog,
        icon: <PrivateOutlineTCPPortLogIcon />,
        hoverIcon: <PrivateSolidTCPPortLogIcon />,
        ...YakitRouteToPageInfo[YakitRoute.TCPPortLog]
    },
    [YakitRoute.PayloadGenerater_New]: {
        page: YakitRoute.PayloadGenerater_New,
        icon: <PrivateOutlinePayloadGeneraterIcon />,
        hoverIcon: <PrivateSolidPayloadGeneraterIcon />,
        ...YakitRouteToPageInfo[YakitRoute.PayloadGenerater_New]
    },
    [YakitRoute.Codec]: {
        page: YakitRoute.Codec,
        icon: <PrivateOutlineCodecIcon />,
        hoverIcon: <PrivateSolidCodecIcon />,
        ...YakitRouteToPageInfo[YakitRoute.Codec]
    },
    [YakitRoute.DataCompare]: {
        page: YakitRoute.DataCompare,
        icon: <PrivateOutlineDataCompareIcon />,
        hoverIcon: <PrivateSolidDataCompareIcon />,
        ...YakitRouteToPageInfo[YakitRoute.DataCompare]
    },
    [YakitRoute.DB_Report]: {
        page: YakitRoute.DB_Report,
        icon: <PrivateOutlineReportIcon />,
        hoverIcon: <PrivateSolidReportIcon />,
        ...YakitRouteToPageInfo[YakitRoute.DB_Report]
    },
    [YakitRoute.DB_Ports]: {
        page: YakitRoute.DB_Ports,
        icon: <PrivateOutlinePortsIcon />,
        hoverIcon: <PrivateSolidPortsIcon />,
        ...YakitRouteToPageInfo[YakitRoute.DB_Ports]
    },
    [YakitRoute.DB_Risk]: {
        page: YakitRoute.DB_Risk,
        icon: <PrivateOutlineRiskIcon />,
        hoverIcon: <PrivateSolidRiskIcon />,
        ...YakitRouteToPageInfo[YakitRoute.DB_Risk]
    },
    [YakitRoute.DB_Domain]: {
        page: YakitRoute.DB_Domain,
        icon: <PrivateOutlineDomainIcon />,
        hoverIcon: <PrivateSolidDomainIcon />,
        ...YakitRouteToPageInfo[YakitRoute.DB_Domain]
    },
    [YakitRoute.WebsiteTree]: {
        page: YakitRoute.WebsiteTree,
        icon: <PrivateOutlineWebsiteTreeIcon />,
        hoverIcon: <PrivateSolidWebsiteTreeIcon />,
        ...YakitRouteToPageInfo[YakitRoute.WebsiteTree]
    },
    [YakitRoute.DB_HTTPHistory]: {
        page: YakitRoute.DB_HTTPHistory,
        icon: <PrivateOutlineHTTPHistoryIcon />,
        hoverIcon: <PrivateSolidHTTPHistoryIcon />,
        ...YakitRouteToPageInfo[YakitRoute.DB_HTTPHistory]
    },
    [YakitRoute.DB_CVE]: {
        page: YakitRoute.DB_CVE,
        icon: <PrivateOutlineCVEIcon />,
        hoverIcon: <PrivateSolidCVEIcon />,
        ...YakitRouteToPageInfo[YakitRoute.DB_CVE]
    }
}
// 通过传入的 YakitRoute数组 快速生成页面数据数组
const routeToChildren: (route: (YakitRoute | ResidentPluginName)[]) => PrivateRouteMenuProps[] = (route) => {
    const menus: PrivateRouteMenuProps[] = []
    for (let name of route) {
        if (PrivateAllMenus[name]) menus.push(PrivateAllMenus[name])
    }
    return menus
}
/**
 * @name 强制删除用户端的无效一级菜单项集合
 * @description 该菜单数据为开发者迭代版本所产生的已消失的一级菜单项
 * @description 每个菜单项由 '|' 字符进行分割
 */
export const InvalidFirstMenuItem = ""
/**
 * @name 强制删除用户端的无效菜单项集合
 * @description 该菜单数据为开发者迭代版本所产生的已消失的页面菜单项
 * @description 每个菜单项由 '|' 字符进行分割
 */
export const InvalidPageMenuItem = "项目管理(Beta*)|插件执行结果|"
/**
 * @name private版专家模式菜单配置数据
 * @description 修改只对专家模式有效，别的模式需取对应模式数据进行修改
 */
export const PrivateExpertRouteMenu: PrivateRouteMenuProps[] = [
    {
        page: undefined,
        label: "手工渗透",
        children: routeToChildren([YakitRoute.HTTPHacker, YakitRoute.HTTPFuzzer, YakitRoute.WebsocketFuzzer])
    },
    {
        page: undefined,
        label: "安全工具",
        children: [
            PrivateAllMenus[YakitRoute.Mod_Brute],
            {
                page: YakitRoute.Plugin_OP,
                label: "基础爬虫",
                icon: getFixedPluginIcon(ResidentPluginName.BasicCrawler),
                hoverIcon: getFixedPluginHoverIcon(ResidentPluginName.BasicCrawler),
                describe: getFixedPluginDescribe(ResidentPluginName.BasicCrawler),
                yakScripName: ResidentPluginName.BasicCrawler
            },
            {
                page: YakitRoute.Plugin_OP,
                label: "空间引擎",
                icon: getFixedPluginIcon(ResidentPluginName.SpaceEngine),
                hoverIcon: getFixedPluginHoverIcon(ResidentPluginName.SpaceEngine),
                describe: getFixedPluginDescribe(ResidentPluginName.SpaceEngine),
                yakScripName: ResidentPluginName.SpaceEngine
            },
            PrivateAllMenus[YakitRoute.Mod_ScanPort],
            {
                page: YakitRoute.Plugin_OP,
                label: "子域名收集",
                icon: getFixedPluginIcon(ResidentPluginName.SubDomainCollection),
                hoverIcon: getFixedPluginHoverIcon(ResidentPluginName.SubDomainCollection),
                describe: getFixedPluginDescribe(ResidentPluginName.SubDomainCollection),
                yakScripName: ResidentPluginName.SubDomainCollection
            },
            {
                page: YakitRoute.Plugin_OP,
                label: "目录扫描",
                icon: getFixedPluginIcon(ResidentPluginName.DirectoryScanning),
                hoverIcon: getFixedPluginHoverIcon(ResidentPluginName.DirectoryScanning),
                describe: getFixedPluginDescribe(ResidentPluginName.DirectoryScanning),
                yakScripName: ResidentPluginName.DirectoryScanning
            }
        ]
    },
    {
        page: undefined,
        label: "专项漏洞检测",
        children: routeToChildren([YakitRoute.PoC])
    },
    {
        page: undefined,
        label: "插件",
        children: routeToChildren([
            YakitRoute.Plugin_Store,
            YakitRoute.Plugin_Owner,
            YakitRoute.Plugin_Local,
            YakitRoute.BatchExecutorPage
        ])
    },
    {
        page: undefined,
        label: "反连",
        children: routeToChildren([
            YakitRoute.ShellReceiver,
            YakitRoute.ReverseServer_New,
            YakitRoute.DNSLog,
            YakitRoute.ICMPSizeLog,
            YakitRoute.TCPPortLog,
            YakitRoute.PayloadGenerater_New
        ])
    },
    {
        page: undefined,
        label: "数据处理",
        children: routeToChildren([YakitRoute.Codec, YakitRoute.DataCompare])
    },
    {
        page: undefined,
        label: "数据库",
        children: routeToChildren([
            YakitRoute.DB_Report,
            YakitRoute.DB_Ports,
            YakitRoute.DB_Risk,
            YakitRoute.DB_Domain,
            YakitRoute.WebsiteTree,
            YakitRoute.DB_HTTPHistory,
            YakitRoute.DB_CVE
        ])
    }
]
/**
 * @name private版扫描模式菜单配置数据
 * @description 修改只对扫描模式有效，别的模式需取对应模式数据进行修改
 */
export const PrivateScanRouteMenu: PrivateRouteMenuProps[] = [
    {
        page: undefined,
        label: "安全工具",
        children: [
            PrivateAllMenus[YakitRoute.Mod_Brute],
            {
                page: YakitRoute.Plugin_OP,
                label: "基础爬虫",
                icon: getFixedPluginIcon(ResidentPluginName.BasicCrawler),
                hoverIcon: getFixedPluginHoverIcon(ResidentPluginName.BasicCrawler),
                describe: getFixedPluginDescribe(ResidentPluginName.BasicCrawler),
                yakScripName: ResidentPluginName.BasicCrawler
            },
            {
                page: YakitRoute.Plugin_OP,
                label: "空间引擎",
                icon: getFixedPluginIcon(ResidentPluginName.SpaceEngine),
                hoverIcon: getFixedPluginHoverIcon(ResidentPluginName.SpaceEngine),
                describe: getFixedPluginDescribe(ResidentPluginName.SpaceEngine),
                yakScripName: ResidentPluginName.SpaceEngine
            },
            PrivateAllMenus[YakitRoute.Mod_ScanPort],
            {
                page: YakitRoute.Plugin_OP,
                label: "子域名收集",
                icon: getFixedPluginIcon(ResidentPluginName.SubDomainCollection),
                hoverIcon: getFixedPluginHoverIcon(ResidentPluginName.SubDomainCollection),
                describe: getFixedPluginDescribe(ResidentPluginName.SubDomainCollection),
                yakScripName: ResidentPluginName.SubDomainCollection
            },
            {
                page: YakitRoute.Plugin_OP,
                label: "目录扫描",
                icon: getFixedPluginIcon(ResidentPluginName.DirectoryScanning),
                hoverIcon: getFixedPluginHoverIcon(ResidentPluginName.DirectoryScanning),
                describe: getFixedPluginDescribe(ResidentPluginName.DirectoryScanning),
                yakScripName: ResidentPluginName.DirectoryScanning
            }
        ]
    },
    {
        page: undefined,
        label: "专项漏洞检测",
        children: routeToChildren([YakitRoute.PoC])
    },
    {
        page: undefined,
        label: "插件",
        children: routeToChildren([
            YakitRoute.Plugin_Store,
            YakitRoute.Plugin_Owner,
            YakitRoute.Plugin_Local,
            YakitRoute.BatchExecutorPage
        ])
    },
    {
        page: undefined,
        label: "数据处理",
        children: routeToChildren([YakitRoute.Codec, YakitRoute.DataCompare])
    },
    {
        page: undefined,
        label: "数据库",
        children: routeToChildren([
            YakitRoute.DB_Report,
            YakitRoute.DB_Ports,
            YakitRoute.DB_Risk,
            YakitRoute.DB_Domain,
            YakitRoute.WebsiteTree,
            YakitRoute.DB_HTTPHistory,
            YakitRoute.DB_CVE
        ])
    }
]
/**
 * @name private版简易版菜单配置数据
 * @description !注意 简易版暂时不能进行菜单编辑,开放编辑请参考专家或扫描模式的菜单数据结构
 * @description 修改只对简易版有效，别的模式需取对应模式数据进行修改
 */
export const PrivateSimpleRouteMenu: PrivateRouteMenuProps[] = [
    {
        page: undefined,
        label: "安全检测",
        children: [
            {
                page: YakitRoute.SimpleDetect,
                icon: <PrivateOutlinePocIcon />,
                hoverIcon: <PrivateSolidPocIcon />,
                ...YakitRouteToPageInfo[YakitRoute.SimpleDetect]
            }
        ]
    },
    {
        page: undefined,
        label: "插件",
        children: [
            {
                page: YakitRoute.Plugin_Store,
                icon: <PrivateOutlinePluginStoreIcon />,
                hoverIcon: <PrivateSolidPluginStoreIcon />,
                ...YakitRouteToPageInfo[YakitRoute.Plugin_Store]
            },
            {
                page: YakitRoute.Plugin_Owner,
                icon: <PrivateOutlinePluginOwnerIcon />,
                hoverIcon: <PrivateSolidPluginOwnerIcon />,
                ...YakitRouteToPageInfo[YakitRoute.Plugin_Owner]
            },
            {
                page: YakitRoute.Plugin_Local,
                icon: <PrivateOutlinePluginLocalIcon />,
                hoverIcon: <PrivateSolidPluginLocalIcon />,
                ...YakitRouteToPageInfo[YakitRoute.Plugin_Local]
            },
            {
                page: YakitRoute.BatchExecutorPage,
                icon: <PrivateOutlineBatchPluginIcon />,
                hoverIcon: <PrivateSolidBatchPluginIcon />,
                ...YakitRouteToPageInfo[YakitRoute.BatchExecutorPage]
            }
        ]
    },
    {
        page: undefined,
        label: "数据库",
        children: [
            {
                page: YakitRoute.DB_Report,
                icon: <PrivateOutlineReportIcon />,
                hoverIcon: <PrivateSolidReportIcon />,
                ...YakitRouteToPageInfo[YakitRoute.DB_Report]
            },
            {
                page: YakitRoute.DB_Ports,
                icon: <PrivateOutlinePortsIcon />,
                hoverIcon: <PrivateSolidPortsIcon />,
                ...YakitRouteToPageInfo[YakitRoute.DB_Ports]
            },
            {
                page: YakitRoute.DB_Risk,
                icon: <PrivateOutlineRiskIcon />,
                hoverIcon: <PrivateSolidRiskIcon />,
                ...YakitRouteToPageInfo[YakitRoute.DB_Risk]
            }
        ]
    }
]
// 要全部删除，但是里面的内容还没确定好
export enum Route {
    WebsocketHistory = "websocket-history",
    // 获取标准输出流
    AttachEngineCombinedOutput = "attach-engine-combined-output"
}
// 要全部删除，但是里面的内容还没确定好
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
        return <PluginOperator yakScriptId={yakScriptId || id} yakScriptName='' size={"big"} fromMenu={true} />
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
        case Route.WebsocketHistory:
            return <WebsocketFlowHistory />

        case Route.AttachEngineCombinedOutput:
            return <EngineConsole />
        default:
            return <div />
    }
}
