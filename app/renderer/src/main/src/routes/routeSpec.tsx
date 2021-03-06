import React, {Suspense} from "react"
import {YakExecutor} from "../pages/invoker/YakExecutor"
import {
    AimOutlined,
    AppstoreOutlined,
    AuditOutlined,
    BugOutlined,
    CodeOutlined,
    EllipsisOutlined,
    FireOutlined,
    FunctionOutlined,
    OneToOneOutlined,
    RocketOutlined
} from "@ant-design/icons"
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
import {ReverseServerPage} from "../pages/reverse/ReverseServerPage"
import {RiskPage} from "../pages/risks/RiskPage"
import {DNSLogPage} from "../pages/dnslog/DNSLogPage"
import {HTTPFuzzerPage} from "../pages/fuzzer/HTTPFuzzerPage"
import {fuzzerInfoProp} from "../pages/MainOperator"
import {ICMPSizeLoggerPage} from "../pages/icmpsizelog/ICMPSizeLoggerPage"
import {RandomPortLogPage} from "../pages/randomPortLog/RandomPortLogPage"
import {ReportViewerPage} from "../pages/assetViewer/ReportViewerPage"
import {BatchExecutorPageEx} from "../pages/invoker/batch/BatchExecutorPageEx"
import {
    ReadOnlyBatchExecutorByMenuItem,
    ReadOnlyBatchExecutorByRecoverUid
} from "../pages/invoker/batch/ReadOnlyBatchExecutorByMenuItem"

const HTTPHacker = React.lazy(() => import("../pages/hacker/httpHacker"))
const CodecPage = React.lazy(() => import("../pages/codec/CodecPage"))

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

    // ??????????????????
    PoC = "poc",

    // Payload ??????
    PayloadManager = "payload-manager",

    // ????????????
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

    // Handler
    DataHandler = "data-handler", // include codec compare

    // ??????
    ReverseManager = `reverse`,
    ReverseServer = "reverse-server",
    ShellReceiver = "shellReceiver",
    DNSLog = "dnslog",
    ICMPSizeLog = "icmp-sizelog",
    TCPPortLog = "tcp-portlog",

    // ??????
    BatchExecutorPage = "batch-executor-page-ex",
    BatchExecutorRecover = "batch-executor-recover"
}

export interface MenuDataProps {
    key?: Route
    subMenuData?: MenuDataProps[]
    label: string
    icon: JSX.Element
    disabled?: boolean
    hidden?: boolean
}

export const NoScrollRoutes: Route[] = [Route.HTTPHacker, Route.Mod_Brute, Route.YakScript]

export const RouteMenuData: MenuDataProps[] = [
    {
        key: Route.PenTest,
        label: "??????????????????",
        icon: <AimOutlined />,
        subMenuData: [
            {key: Route.HTTPHacker, label: "MITM", icon: <FireOutlined />},
            {key: Route.HTTPFuzzer, label: "Web Fuzzer", icon: <AimOutlined />}
        ]
    },
    {
        key: Route.GeneralModule,
        label: "??????????????????",
        icon: <RocketOutlined />,
        subMenuData: [
            {key: Route.Mod_ScanPort, label: "????????????/??????", icon: <EllipsisOutlined />},
            {key: Route.Mod_Brute, label: "??????????????????", icon: <EllipsisOutlined />, disabled: false}
            // {key: Route.Mod_Subdomain, label: "???????????????", icon: <EllipsisOutlined/>, disabled: true},
            // {key: Route.Mod_Crawler, label: "????????????", icon: <EllipsisOutlined/>, disabled: true},
            // {key: Route.Mod_SpaceEngine, label: "????????????", icon: <EllipsisOutlined/>, disabled: true},
        ]
    },
    {
        key: Route.PoC,
        label: "??????????????????",
        icon: <FunctionOutlined />
    },

    {
        key: Route.ModManagerDetail,
        label: "????????????",
        icon: <AppstoreOutlined />,
        subMenuData: [
            {key: Route.ModManager, label: "????????????", icon: <AppstoreOutlined />},
            {key: Route.BatchExecutorPage, label: "??????????????????", icon: <AppstoreOutlined />}
        ]
    },

    {key: Route.PayloadManager, label: "Payload ??????", icon: <AuditOutlined />},
    {key: Route.YakScript, label: "Yak Runner", icon: <CodeOutlined />},
    {
        key: Route.ReverseManager,
        label: "????????????",
        icon: <AppstoreOutlined />,
        subMenuData: [
            {key: Route.ShellReceiver, label: "???????????????", icon: <OneToOneOutlined />},
            {key: Route.ReverseServer, label: "???????????????", icon: <OneToOneOutlined />},
            {key: Route.DNSLog, label: "DNSLog", icon: <OneToOneOutlined />},
            {key: Route.ICMPSizeLog, label: "ICMP-SizeLog", icon: <OneToOneOutlined />},
            {key: Route.TCPPortLog, label: "TCP-PortLog", icon: <OneToOneOutlined />}
        ]
    },
    {
        key: Route.DataHandler,
        label: "????????????",
        icon: <FunctionOutlined />,
        subMenuData: [
            {key: Route.Codec, label: "Codec", icon: <FireOutlined />},
            {key: Route.DataCompare, label: "????????????", icon: <OneToOneOutlined />}
        ]
    },

    {
        key: Route.Database,
        label: "?????????",
        icon: <FunctionOutlined />,
        subMenuData: [
            {key: Route.DB_HTTPHistory, label: "HTTP History", icon: <OneToOneOutlined />},
            {key: Route.DB_Ports, label: "????????????", icon: <OneToOneOutlined />},
            {key: Route.DB_Domain, label: "????????????", icon: <FireOutlined />},
            {key: Route.DB_ExecResults, label: "??????????????????", icon: <FireOutlined />},
            {key: Route.DB_Risk, label: "???????????????", icon: <BugOutlined />},
            {key: Route.DB_Report, label: "??????(Beta*)", icon: <FireOutlined />}
        ]
    },

    // ????????????
    {
        key: Route.BatchExecutorRecover,
        label: "?????????????????????????????????",
        icon: <FireOutlined />,
        disabled: true,
        hidden: true
    }
]

interface ComponentParams {
    // Route.HTTPFuzzer ??????
    isHttps?: boolean
    request?: string
    system?: string
    order?: string
    fuzzerParams?: fuzzerInfoProp
    // Route.Mod_ScanPort ??????
    scanportParams?: string
    // Route.Mod_Brute ??????
    bruteParams?: string
    recoverUid?: string
    recoverBaseProgress?: number
}

export const ContentByRoute = (r: Route | string, yakScriptId?: number, params?: ComponentParams): JSX.Element => {
    const routeStr = `${r}`
    // ?????????????????????????????? ID ??????????????????
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
            return <div>?????????</div>
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
                />
            )
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
        case Route.ReverseServer:
            return <ReverseServerPage />
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
        default:
            return <div />
    }
}
