import React, {Suspense} from "react";
import {YakExecutor} from "../pages/invoker/YakExecutor";
import {
    AimOutlined,
    AppstoreOutlined,
    AuditOutlined,
    CodeOutlined,
    EllipsisOutlined,
    FireOutlined,
    BugOutlined,
    FunctionOutlined,
    OneToOneOutlined,
    RocketOutlined,
} from "@ant-design/icons";
// import {HTTPHacker} from "../pages/hacker/httpHacker";
// import {CodecPage} from "../pages/codec/CodecPage";
import {ShellReceiverPage} from "../pages/shellReceiver/ShellReceiverPage";
import {YakBatchExecutors} from "../pages/invoker/batch/YakBatchExecutors";
import {YakScriptManagerPage} from "../pages/invoker/YakScriptManager";
import {PayloadManagerPage} from "../pages/payloadManager/PayloadManager";
import {PortScanPage} from "../pages/portscan/PortScanPage";
import {YakitStorePage} from "../pages/yakitStore/YakitStorePage";
import {PluginOperator} from "../pages/yakitStore/PluginOperator";
import {failed} from "../utils/notification";
import {BrutePage} from "../pages/brute/BrutePage";
import {DataCompare} from "../pages/compare/DataCompare"
import {HTTPHistory} from "../components/HTTPHistory";
import {PortAssetTable} from "../pages/assetViewer/PortAssetPage";
import {ExecResultsViewer} from "../pages/invoker/batch/ExecMessageViewer";
import {YakScriptExecResultTable} from "../components/YakScriptExecResultTable";
import {DomainAssetPage} from "../pages/assetViewer/DomainAssetPage";
import {ReverseServerPage} from "../pages/reverse/ReverseServerPage";
import {RiskPage} from "../pages/risks/RiskPage";
import {DNSLogPage} from "../pages/dnslog/DNSLogPage";
import {BatchExecutorPage} from "../pages/invoker/batch/BatchExecutorPage";
import {HTTPFuzzerPage} from "../pages/fuzzer/HTTPFuzzerPage";
import {fuzzerInfoProp} from "../pages/MainOperator";
import {ICMPSizeLoggerPage} from "../pages/icmpsizelog/ICMPSizeLoggerPage";
import {RandomPortLogPage} from "../pages/randomPortLog/RandomPortLogPage";

const HTTPHacker = React.lazy(() => import("../pages/hacker/httpHacker"));
const CodecPage = React.lazy(() => import("../pages/codec/CodecPage"));

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
    HTTPFuzzer = "httpFuzzer",

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
    DB_Risk = "db-risks",

    // Handler
    DataHandler = "data-handler",  // include codec compare

    // 反连
    ReverseManager = `reverse`,
    ReverseServer = "reverse-server",
    ShellReceiver = "shellReceiver",
    DNSLog = "dnslog",
    ICMPSizeLog = "icmp-sizelog",
    TCPPortLog = "tcp-portlog",

    // 测试
    BatchExecutorPage = "batch-executor-page-ex",
}

export interface MenuDataProps {
    key?: Route
    subMenuData?: MenuDataProps[],
    label: string
    icon: JSX.Element
    disabled?: boolean
}

export const NoScrollRoutes: Route[] = [
    Route.HTTPHacker,
    Route.Mod_Brute,
    Route.YakScript
];

export const RouteMenuData: MenuDataProps[] = [
    // {key: Route.MITM, label: "HTTP(S) 中间人劫持", icon: <FireOutlined/>},
    {
        key: Route.PenTest, label: "手工渗透测试", icon: <AimOutlined/>,
        subMenuData: [
            {key: Route.HTTPHacker, label: "MITM", icon: <FireOutlined/>},
            {key: Route.HTTPFuzzer, label: "Web Fuzzer", icon: <AimOutlined/>},
        ],
    },
    {
        key: Route.GeneralModule, label: "基础安全工具", icon: <RocketOutlined/>,
        subMenuData: [
            {key: Route.Mod_ScanPort, label: "扫描端口/指纹", icon: <EllipsisOutlined/>},
            {key: Route.Mod_Brute, label: "爆破与未授权", icon: <EllipsisOutlined/>, disabled: false},
            // {key: Route.Mod_Subdomain, label: "子域名发现", icon: <EllipsisOutlined/>, disabled: true},
            // {key: Route.Mod_Crawler, label: "基础爬虫", icon: <EllipsisOutlined/>, disabled: true},
            // {key: Route.Mod_SpaceEngine, label: "空间引擎", icon: <EllipsisOutlined/>, disabled: true},
        ],
    },
    {
        key: Route.PoC, label: "专项漏洞检测",
        icon: <FunctionOutlined/>,
    },

    {
        key: Route.ModManagerDetail, label: "插件管理", icon: <AppstoreOutlined/>,
        subMenuData: [
            {key: Route.ModManager, label: "插件仓库", icon: <AppstoreOutlined/>},
            {key: Route.BatchExecutorPage, label: "插件批量执行", icon: <AppstoreOutlined/>},
        ]
    },

    {key: Route.PayloadManager, label: "Payload 管理", icon: <AuditOutlined/>},
    {key: Route.YakScript, label: "Yak Runner", icon: <CodeOutlined/>},
    {
        key: Route.ReverseManager, label: "反连管理", icon: <AppstoreOutlined/>,
        subMenuData: [
            {key: Route.ShellReceiver, label: "端口监听器", icon: <OneToOneOutlined/>},
            {key: Route.ReverseServer, label: "反连服务器", icon: <OneToOneOutlined/>},
            {key: Route.DNSLog, label: "DNSLog", icon: <OneToOneOutlined/>},
            {key: Route.ICMPSizeLog, label: "ICMP-SizeLog", icon: <OneToOneOutlined/>},
            {key: Route.TCPPortLog, label: "TCP-PortLog", icon: <OneToOneOutlined/>},
        ]
    },
    {
        key: Route.DataHandler, label: "数据处理",
        icon: <FunctionOutlined/>,
        subMenuData: [
            {key: Route.Codec, label: "Codec", icon: <FireOutlined/>},
            {key: Route.DataCompare, label: "数据对比", icon: <OneToOneOutlined/>},
        ],
    },

    {
        key: Route.Database, label: "数据库",
        icon: <FunctionOutlined/>,
        subMenuData: [
            {key: Route.DB_HTTPHistory, label: "HTTP History", icon: <OneToOneOutlined/>},
            {key: Route.DB_Ports, label: "端口资产", icon: <OneToOneOutlined/>},
            {key: Route.DB_Domain, label: "域名资产", icon: <FireOutlined/>},
            {key: Route.DB_ExecResults, label: "插件执行结果", icon: <FireOutlined/>},
            {key: Route.DB_Risk, label: "漏洞与风险", icon: <BugOutlined/>},
        ],
    },
    // {
    //     key: Route.IGNORE, label: "常用工具包", icon: <FireOutlined/>,
    //     subMenuData: [
    //         {key: Route.Codec, label: "编码与解码", icon: <EllipsisOutlined/>},
    //         {key: Route.ShellReceiver, label: "端口开放助手", icon: <FireOutlined/>},
    //     ],
    // },
]

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
}

export const ContentByRoute = (r: Route | string, yakScriptId?: number, params?: ComponentParams): JSX.Element => {
    const routeStr = `${r}`;
    if (routeStr.startsWith("plugin:")) {
        let id = -1;
        try {
            let splitList = routeStr.split(":");
            let idRaw = splitList.reverse().shift();
            id = parseInt(idRaw || "");
        } catch (e) {
            failed(`Loading PluginKey: ${r} failed`)
        }
        return <PluginOperator
            yakScriptId={yakScriptId || id} size={"big"}
            fromMenu={true}
        />
    }

    switch (r) {
        // case Route.HistoryRequests:
        //     return <HistoryPage/>
        // case Route.MITM:
        //     return <MITMPage/>
        case Route.ShellReceiver:
            return <ShellReceiverPage/>
        case Route.WebShellManager:
            return <div>待开发</div>
        case Route.PoC:
            return <YakBatchExecutors keyword={"poc"} verbose={"Poc"}/>
        case Route.YakScript:
            return <YakExecutor/>
        case Route.HTTPHacker:
            return <Suspense fallback={<div>loading</div>}>
                <HTTPHacker/>
            </Suspense>
        case Route.HTTPFuzzer:
            return <HTTPFuzzerPage isHttps={params?.isHttps} request={params?.request} system={params?.system}
                                   order={params?.order} fuzzerParams={params?.fuzzerParams}/>
        case Route.Codec:
            return <CodecPage/>
        case Route.ModManager:
            return <YakitStorePage/>
        case Route.PayloadManager:
            return <PayloadManagerPage/>
        case Route.Mod_ScanPort:
            return <PortScanPage sendTarget={params?.scanportParams}/>
        case Route.Mod_Brute:
            return <BrutePage sendTarget={params?.bruteParams}/>
        case Route.DataCompare:
            return <DataCompare/>
        case Route.DB_HTTPHistory:
            return <HTTPHistory/>
        case Route.DB_Ports:
            return <PortAssetTable/>
        case Route.DB_Domain:
            return <DomainAssetPage/>
        case Route.DB_ExecResults:
            return <YakScriptExecResultTable/>
        case Route.ReverseServer:
            return <ReverseServerPage/>
        case Route.DB_Risk:
            return <RiskPage/>
        case Route.DNSLog:
            return <DNSLogPage/>
        case Route.ICMPSizeLog:
            return <ICMPSizeLoggerPage/>
        case Route.TCPPortLog:
            return <RandomPortLogPage/>
        case Route.BatchExecutorPage:
            return <BatchExecutorPage/>
        default:
            return <div/>
    }
}