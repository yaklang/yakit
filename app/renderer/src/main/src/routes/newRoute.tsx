import React, {ReactNode, Suspense} from "react"
import i18n from "@/i18n/i18n"
import {ShellReceiver} from "../pages/reverseShellReceiver/shellReceiver"
import {PcapXDemo} from "@/components/playground/PcapXDemo"
import {DataCompare} from "../pages/compare/DataCompare"
import {HTTPHistory} from "../components/HTTPHistory"
import {PortAssetTable} from "../pages/assetViewer/PortAssetPage"
import {DomainAssetPage} from "../pages/assetViewer/DomainAssetPage"
import {RiskPage} from "../pages/risks/RiskPage"
import {DNSLogPage} from "../pages/dnslog/DNSLogPage"
import {ICMPSizeLoggerPage} from "../pages/icmpsizelog/ICMPSizeLoggerPage"
import {RandomPortLogPage} from "../pages/randomPortLog/RandomPortLogPage"
import {ReportViewerPage} from "../pages/assetViewer/ReportViewerPage"
import {StartFacadeServerParams} from "../pages/reverseServer/ReverseServer_New"
import {JavaPayloadPage} from "@/pages/payloadGenerater/NewJavaPayloadPage"
import {NewReverseServerPage} from "@/pages/reverseServer/NewReverseServerPage"
import {AccountAdminPage} from "@/pages/loginOperationMenu/AccountAdminPage"
import {RoleAdminPage} from "@/pages/loginOperationMenu/RoleAdminPage"
import {HoleCollectPage} from "@/pages/loginOperationMenu/HoleCollectPage"
import {LicenseAdminPage} from "@/pages/loginOperationMenu/LicenseAdminPage"
import {TrustListPage} from "@/pages/loginOperationMenu/TrustListPage"
import {ChaosMakerPage} from "@/pages/chaosmaker/ChaosMaker"
import {ScreenRecorderPage} from "@/pages/screenRecorder/ScreenRecorderPage"
import {CVEViewer} from "@/pages/cve/CVEViewer"
import {YakJavaDecompiler} from "@/pages/yakJavaDecompiler/YakJavaDecompiler"
import {PageLoading} from "./PageLoading"
import {
    PrivateOutlineAIAgentIcon,
    PrivateOutlineAuditCodeIcon,
    PrivateOutlineAuditHoleIcon,
    PrivateOutlineBasicCrawlerIcon,
    PrivateOutlineBatchPluginIcon,
    PrivateOutlineBruteIcon,
    PrivateOutlineCVEIcon,
    PrivateOutlineCodeScanIcon,
    PrivateOutlineCodecIcon,
    PrivateOutlineDNSLogIcon,
    PrivateOutlineDataCompareIcon,
    PrivateOutlineDefaultPluginIcon,
    PrivateOutlineDirectoryScanningIcon,
    PrivateOutlineDomainIcon,
    PrivateOutlineFingerprintManageIcon,
    PrivateOutlineHTTPHistoryIcon,
    PrivateOutlineICMPSizeLogIcon,
    PrivateOutlineMitmIcon,
    PrivateOutlinePayloadGeneraterIcon,
    PrivateOutlinePluginStoreIcon,
    PrivateOutlinePocIcon,
    PrivateOutlinePortsIcon,
    PrivateOutlineProjectManagerIcon,
    PrivateOutlineReportIcon,
    PrivateOutlineReverseServerIcon,
    PrivateOutlineRiskIcon,
    PrivateOutlineRuleManagementIcon,
    PrivateOutlineScanPortIcon,
    PrivateOutlineShellReceiverIcon,
    PrivateOutlineSpaceEngineIcon,
    PrivateOutlineSubDomainCollectionIcon,
    PrivateOutlineTCPPortLogIcon,
    PrivateOutlineWebFuzzerIcon,
    PrivateOutlineWebsocketFuzzerIcon,
    PrivateSolidAIAgentIcon,
    PrivateSolidAuditCodeIcon,
    PrivateSolidAuditHoleIcon,
    PrivateSolidBasicCrawlerIcon,
    PrivateSolidBatchPluginIcon,
    PrivateSolidBruteIcon,
    PrivateSolidCVEIcon,
    PrivateSolidCodeScanIcon,
    PrivateSolidCodecIcon,
    PrivateSolidDNSLogIcon,
    PrivateSolidDataCompareIcon,
    PrivateSolidDefaultPluginIcon,
    PrivateSolidDirectoryScanningIcon,
    PrivateSolidDomainIcon,
    PrivateSolidFingerprintManageIcon,
    PrivateSolidHTTPHistoryIcon,
    PrivateSolidICMPSizeLogIcon,
    PrivateSolidMitmIcon,
    PrivateSolidPayloadGeneraterIcon,
    PrivateSolidPluginStoreIcon,
    PrivateSolidPocIcon,
    PrivateSolidPortsIcon,
    PrivateSolidProjectManagerIcon,
    PrivateSolidReportIcon,
    PrivateSolidReverseServerIcon,
    PrivateSolidRiskIcon,
    PrivateSolidRuleManagementIcon,
    PrivateSolidScanPortIcon,
    PrivateSolidShellReceiverIcon,
    PrivateSolidSpaceEngineIcon,
    PrivateSolidSubDomainCollectionIcon,
    PrivateSolidTCPPortLogIcon,
    PrivateSolidWebFuzzerIcon,
    PrivateSolidWebsocketFuzzerIcon
} from "./privateIcon"
import {ControlAdminPage} from "@/pages/dynamicControl/DynamicControl"
import {DebugMonacoEditorPage} from "@/pages/debugMonaco/DebugMonacoEditorPage"
import {VulinboxManager} from "@/pages/vulinbox/VulinboxManager"
import {DiagnoseNetworkPage} from "@/pages/diagnoseNetwork/DiagnoseNetworkPage"
import HTTPFuzzerPage, {AdvancedConfigShowProps} from "@/pages/fuzzer/HTTPFuzzerPage"
import {ErrorBoundary} from "react-error-boundary"
import {PageItemProps} from "@/pages/layout/mainOperatorContent/renderSubPage/RenderSubPageType"
import {WebShellViewer} from "@/pages/webShell/WebShellViewer"
import {WebShellDetail} from "@/pages/webShell/models"
import {WebShellDetailOpt} from "@/pages/webShell/WebShellDetailOpt"
import {
    FuzzerParamItem,
    AdvancedConfigValueProps
} from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {HTTPResponseExtractor} from "@/pages/fuzzer/MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {ConfigNetworkPage} from "@/components/configNetwork/ConfigNetworkPage"
import {PluginManage} from "@/pages/plugins/manage/PluginManage"
import {OnlineJudgment} from "@/pages/plugins/onlineJudgment/OnlineJudgment"
import {isCommunityEdition, isIRify} from "@/utils/envfile"
import {NewPayload} from "@/pages/payloadManager/newPayload"
import {NewCodec} from "@/pages/codec/NewCodec"
import {DataStatistics} from "@/pages/dataStatistics/DataStatistics"
import {PluginBatchExecutor} from "@/pages/plugins/pluginBatchExecutor/pluginBatchExecutor"
import {
    AddYakitScriptPageInfoProps,
    AuditCodePageInfoProps,
    BrutePageInfoProps,
    CodeScanPageInfoProps,
    HTTPHackerPageInfoProps,
    MITMHackerPageInfoProps,
    HTTPHistoryAnalysisPageInfo,
    ModifyNotepadPageInfoProps,
    PluginBatchExecutorPageInfoProps,
    PocPageInfoProps,
    RiskPageInfoProps,
    ScanPortPageInfoProps,
    SimpleDetectPageInfoProps,
    SpaceEnginePageInfoProps,
    WebsocketFuzzerPageInfoProps,
    AIForgeEditorPageInfoProps,
    AIToolEditorPageInfoProps,
    YakRunnerScanHistoryPageInfoProps,
    RuleManagementPageInfoProps,
    AuditHoleInfoProps
} from "@/store/pageInfo"
import {SpaceEnginePage} from "@/pages/spaceEngine/SpaceEnginePage"
import {SinglePluginExecution} from "@/pages/plugins/singlePluginExecution/SinglePluginExecution"
import {YakPoC} from "@/pages/securityTool/yakPoC/YakPoC"
import {NewPortScan} from "@/pages/securityTool/newPortScan/NewPortScan"
import {NewBrute} from "@/pages/securityTool/newBrute/NewBrute"
import {
    CommunityDeprecatedFirstMenu,
    CommunityDeprecatedSecondMenu,
    EnterpriseDeprecatedFirstMenu,
    EnterpriseDeprecatedSecondMenu
} from "./deprecatedMenu"
import {SimpleDetect} from "@/pages/simpleDetect/SimpleDetect"
import {YakitRoute} from "../enums/yakitRoute"
import {YakRunner} from "@/pages/yakRunner/YakRunner"
import {YakRunnerCodeScan} from "@/pages/yakRunnerCodeScan/YakRunnerCodeScan"
import {YakRunnerAuditCode} from "@/pages/yakRunnerAuditCode/YakRunnerAuditCode"
import {AddYakitPlugin} from "@/pages/pluginEditor/addYakitPlugin/AddYakitPlugin"
import {WebsocketFuzzer} from "@/pages/websocket/WebsocketFuzzer"
import {YakRunnerProjectManager} from "@/pages/YakRunnerProjectManager/YakRunnerProjectManager"
import {RuleManagement} from "@/pages/ruleManagement/RuleManagement"
import {YakRunnerAuditHole} from "@/pages/yakRunnerAuditHole/YakRunnerAuditHole"
import {Misstatement} from "@/pages/misstatement/Misstatement"
import {SystemConfig} from "@/pages/systemConfig/SystemConfig"
import {HTTPHistoryAnalysis} from "@/pages/hTTPHistoryAnalysis/HTTPHistoryAnalysis"
import {ShortcutKeyPageName} from "@/utils/globalShortcutKey/events/pageMaps"
import {ShortcutKey} from "@/pages/shortcutKey/ShortcutKey"
import {getNotepadNameByEdition} from "@/pages/layout/NotepadMenu/utils"
import {ShortcutKeyList} from "@/pages/shortcutKey/ShortcutKey"
import {AIAgent} from "@/pages/ai-agent/AIAgent"

const HTTPHacker = React.lazy(() => import("../pages/hacker/httpHacker"))
const MITMHacker = React.lazy(() => import("@/pages/mitm/MITMHacker/MITMHacker"))
const Home = React.lazy(() => import("@/pages/home/Home"))
const IRifyHome = React.lazy(() => import("@/pages/home/IRifyHome"))
const WebFuzzerPage = React.lazy(() => import("@/pages/fuzzer/WebFuzzerPage/WebFuzzerPage"))
const PluginHub = React.lazy(() => import("@/pages/pluginHub/pluginHub/PluginHub"))
const ModifyNotepad = React.lazy(() => import("@/pages/notepadManage/modifyNotepad/ModifyNotepad"))
const NotepadManage = React.lazy(() => import("@/pages/notepadManage/notepadManage/NotepadManage"))
const FingerprintManage = React.lazy(() => import("@/pages/fingerprintManage/FingerprintManage"))
const SsaResDiff = React.lazy(() => import("@/pages/ssaResDiff/SsaResDiff"))
const KnowledgeBase = React.lazy(() => import("@/pages/KnowledgeBase/KnowledgeBasePage"))
const ForgeEditor = React.lazy(() => import("@/pages/aiForge/forgeEditor/ForgeEditor"))
const AIToolEditor = React.lazy(() => import("@/pages/aiTool/AIToolEditor/AIToolEditor"))
const YakRunnerScanHistory = React.lazy(() => import("@/pages/yakRunnerScanHistory/YakRunnerScanHistory"))

/**
 * @description 页面路由对应的页面信息
 * * label-页面名称
 * * describe(非必需)-页面描述语
 */
export const YakitRouteToPageInfo: Record<
    YakitRoute,
    {label: string; labelUi?: string; describe?: string; describeUi?: string}
> = {
    "new-home": {label: "首页", labelUi: "YakitRoute.home"},
    httpHacker: {
        label: "MITM 交互式劫持 v1",
        labelUi: "YakitRoute.MITM",
        describeUi: "YakitRoute.mitmSslHijack"
    },
    "mitm-hijack": {
        label: "MITM 交互式劫持",
        labelUi: "YakitRoute.MITM",
        describeUi: "YakitRoute.mitmSslHijack"
    },
    httpFuzzer: {
        label: "Web Fuzzer",
        labelUi: "YakitRoute.WebFuzzer",
        describeUi: "YakitRoute.fuzzBurpIntegration"
    },
    "websocket-fuzzer": {
        label: "Websocket Fuzzer",
        labelUi: "YakitRoute.Websocket Fuzzer",
        describeUi: "YakitRoute.fuzzTestingForWebSocketPackets"
    },
    codec: {
        label: "Codec",
        labelUi: "YakitRoute.Codec",
        describeUi: "YakitRoute.dataProcessingDescription"
    },
    dataCompare: {
        label: "数据对比",
        labelUi: "YakitRoute.dataCompare",
        describeUi: "YakitRoute.quicklyIdentifyDifferencesInData"
    },
    "scan-port": {
        label: "端口/指纹扫描",
        labelUi: "YakitRoute.portAndFingerprintScan",
        describeUi: "YakitRoute.portScanDescription"
    },
    poc: {
        label: "专项漏洞检测",
        labelUi: "YakitRoute.vulnTargetedScan",
        describeUi: "YakitRoute.vulnerabilityDetectionDescription"
    },
    "plugin-op": {label: "插件", labelUi: "YakitRoute.plugin"},
    brute: {
        label: "弱口令检测",
        labelUi: "YakitRoute.weakPasswordCheck",
        describeUi: "YakitRoute.bruteForceDescription"
    },
    "plugin-hub": {
        label: "插件仓库",
        labelUi: "YakitRoute.pluginHub",
        describeUi: "YakitRoute.massiveYakitPluginsOne-ClickDownload"
    },
    "batch-executor-page-ex": {
        label: "批量执行",
        labelUi: "YakitRoute.batchExecute",
        describeUi: "YakitRoute.batchPOCScan"
    },
    dnslog: {
        label: "DNSLog",
        labelUi: "YakitRoute.DNSLog",
        describeUi: "YakitRoute.subdomainAutoGenerate"
    },
    "icmp-sizelog": {
        label: "ICMP-SizeLog",
        labelUi: "YakitRoute.ICMP-SizeLog",
        describeUi: "YakitRoute.detectICMPCallbackViaPingWithSpecificPacketSize"
    },
    "tcp-portlog": {
        label: "TCP-PortLog",
        labelUi: "YakitRoute.TCP-PortLog",
        describeUi: "YakitRoute.detectTCPCallbackViaRandomClosedPorts"
    },
    PayloadGenerater_New: {
        label: "Yso-Java Hack",
        labelUi: "YakitRoute.Yso-Java Hack",
        describeUi: "YakitRoute.fuzzPayLoadDeserialization"
    },
    ReverseServer_New: {
        label: "反连服务器",
        labelUi: "YakitRoute.reverseServer",
        describeUi: "YakitRoute.simultaneouslyProvideHTTP/RMI/HTTPSReverseConnectionsOnOnePort"
    },
    shellReceiver: {
        label: "端口监听器",
        labelUi: "YakitRoute.portListener",
        describeUi: "YakitRoute.reverseShellTool"
    },
    "db-http-request": {
        label: "History",
        labelUi: "YakitRoute.History",
        describeUi: "YakitRoute.viewAndManageAllHistoricalTrafficFromMITMPluginsAndFuzzing"
    },
    "db-http-request-analysis": {label: "流量分析器", labelUi: "YakitRoute.historyAnalyzer"},
    "db-reports-results": {
        label: "报告",
        labelUi: "YakitRoute.report",
        describeUi: "YakitRoute.viewAndManageReportsGeneratedDuringScanning"
    },
    "db-risks": {
        label: "漏洞",
        labelUi: "YakitRoute.vulnerability",
        describeUi: "YakitRoute.manageAllDetectedVulnerabilitiesAndRisks"
    },
    misstatement: {label: "误报记录", labelUi: "YakitRoute.falsePositiveRecords"},
    "db-ports": {label: "端口", labelUi: "YakitRoute.port", describeUi: "YakitRoute.manageAllDiscoveredPortAssets"},
    "db-domains": {
        label: "域名",
        labelUi: "YakitRoute.domain",
        describeUi: "YakitRoute.manageAllDiscoveredDomainAssets"
    },
    cve: {label: "CVE 管理", labelUi: "YakitRoute.cVEManagement", describeUi: "YakitRoute.searchAndQueryCVEData"},
    yakScript: {
        label: "Yak Runner",
        labelUi: "YakitRoute.YakRunner",
        describeUi: "YakitRoute.yaklangProgramming"
    },
    "payload-manager": {
        label: "字典管理",
        labelUi: "YakitRoute.Payload",
        describeUi: "YakitRoute.customPayload"
    },
    "account-admin-page": {label: "用户管理", labelUi: "YakitRoute.userManagement"},
    "role-admin-page": {label: "角色管理", labelUi: "YakitRoute.roleManagement"},
    "hole-collect-page": {label: "漏洞汇总", labelUi: "YakitRoute.vulnerabilitySummary"},
    "license-admin-page": {label: "License管理", labelUi: "YakitRoute.licenseManagement"},
    "trust-list-admin-page": {label: "用户管理", labelUi: "YakitRoute.userManagement"},
    "plug-in-admin-page": {label: "插件权限", labelUi: "YakitRoute.pluginPermissions"},
    "control-admin-page": {label: "远程管理", labelUi: "YakitRoute.remoteManagement"},
    "batch-executor-recover": {
        label: "继续任务：批量执行插件",
        labelUi: "YakitRoute.continueTaskBatchExecutePlugin"
    },
    "packet-scan-page": {label: "数据包扫描", labelUi: "YakitRoute.packetScan"},
    "add-yakit-script": {label: "新建插件", labelUi: "YakitRoute.createPlugin"},
    "simple-detect": {label: "安全检测", labelUi: "YakitRoute.securityCheck"},
    "screen-recorder-page": {
        label: "录屏管理",
        labelUi: "YakitRoute.recordingManagement",
        describeUi: "YakitRoute.manageAllRecordedVideoFiles"
    },
    "db-chaosmaker": {label: "BAS实验室", labelUi: "YakitRoute.BASLab"},
    "beta-debug-monaco-editor": {label: "插件编辑器", labelUi: "YakitRoute.pluginEditor"},
    "beta-vulinbox-manager": {label: "Vulinbox 管理器", labelUi: "YakitRoute.vulinboxManager"},
    "beta-diagnose-network": {label: "网络异常诊断", labelUi: "YakitRoute.networkDiagnosis"},
    "beta-config-network": {label: "全局配置", labelUi: "YakitRoute.globalConfig"},
    "plugin-audit": {label: "插件管理", labelUi: "YakitRoute.pluginManagement"},
    "**beta-debug-traffic-analize": {label: "流量分析", labelUi: "YakitRoute.trafficAnalysis"},
    "beta-webshell-manager": {label: "网站管理", labelUi: "YakitRoute.websiteManagement"},
    "beta-webshell-opt": {label: "WebShell 实例", labelUi: "YakitRoute.webShellInstance"},
    data_statistics: {label: "数据统计", labelUi: "YakitRoute.dataStatistics"},
    "space-engine": {label: "空间引擎", labelUi: "YakitRoute.spaceEngine"},
    "yakrunner-code-scan": {
        label: "代码扫描",
        labelUi: "YakitRoute.codeScan",
        describeUi: "YakitRoute.richRuleLibrary"
    },
    "yakrunner-audit-code": {
        label: "代码审计",
        labelUi: "YakitRoute.codeAudit",
        describeUi: "YakitRoute.auditRuleCodeAnalysis"
    },
    "yakrunner-project-manager": {label: "项目管理", labelUi: "YakitRoute.projectManagement"},
    yakrunner_scanHistory: {label: "项目历史", labelUi: "YakitRoute.scanHistory"},
    "rule-management": {
        label: "规则管理",
        labelUi: "YakitRoute.ruleManagement",
        describeUi: "YakitRoute.customAuditRules"
    },
    "notepad-manage": {label: `${getNotepadNameByEdition()}`},
    "modify-notepad": {
        label: i18n.language === "en" ? `Edit ${getNotepadNameByEdition()}` : `编辑${getNotepadNameByEdition()}`
    },
    "yakrunner-audit-hole": {label: "审计漏洞", labelUi: "YakitRoute.auditVulnerability"},
    "system-config": {label: "系统配置", labelUi: "YakitRoute.systemConfig"},
    "yak-java-decompiler": {label: "Java 反编译", labelUi: "YakitRoute.javaDecompile"},
    "shortcut-key": {label: "快捷键设置", labelUi: "YakitRoute.shortcutSettings"},
    "fingerprint-manage": {label: "指纹库", labelUi: "YakitRoute.fingerprintDatabase"},
    "ai-agent": {label: "AIAgent", labelUi: "YakitRoute.AIAgent"},
    "ssa-result-diff": {label: "ssa-result-diff", labelUi: "YakitRoute.ssa-result-diff"},
    "ai-repository": {label: "知识库", labelUi: "YakitRoute.ai-repository"},
    "add-ai-forge": {label: "新建 Forge", labelUi: "YakitRoute.createForge"},
    "modify-ai-forge": {label: "编辑 Forge", labelUi: "YakitRoute.editForge"},
    "add-ai-tool": {label: "新建 Tool", labelUi: "YakitRoute.createTool"},
    "modify-ai-tool": {label: "编辑 Tool", labelUi: "YakitRoute.editTool"}
}
/** 页面路由(无法多开的页面) */
export const SingletonPageRoute: YakitRoute[] = [
    YakitRoute.NewHome,
    YakitRoute.HTTPHacker,
    YakitRoute.MITMHacker,
    YakitRoute.Plugin_Hub,
    YakitRoute.DNSLog,
    YakitRoute.ICMPSizeLog,
    YakitRoute.TCPPortLog,
    YakitRoute.DB_HTTPHistory,
    YakitRoute.DB_Report,
    YakitRoute.DB_Risk,
    YakitRoute.Misstatement,
    YakitRoute.DB_Ports,
    YakitRoute.DB_Domain,
    YakitRoute.DB_CVE,
    YakitRoute.YakScript,
    YakitRoute.PayloadManager,
    YakitRoute.AccountAdminPage,
    YakitRoute.RoleAdminPage,
    YakitRoute.HoleCollectPage,
    YakitRoute.LicenseAdminPage,
    YakitRoute.TrustListPage,
    YakitRoute.AddYakitScript,
    YakitRoute.DB_ChaosMaker,
    YakitRoute.ScreenRecorderPage,
    YakitRoute.ControlAdminPage,
    YakitRoute.Beta_VulinboxManager,
    YakitRoute.Beta_DiagnoseNetwork,
    YakitRoute.Beta_ConfigNetwork,
    YakitRoute.Beta_DebugTrafficAnalize,
    YakitRoute.Plugin_Audit,
    YakitRoute.Beta_WebShellManager,
    YakitRoute.Data_Statistics,
    YakitRoute.YakRunner_Audit_Code,
    YakitRoute.YakRunner_Project_Manager,
    YakitRoute.YakRunner_ScanHistory,
    YakitRoute.Rule_Management,
    YakitRoute.Notepad_Manage,
    YakitRoute.YakRunner_Audit_Hole,
    YakitRoute.System_Config,
    YakitRoute.Yak_Java_Decompiler,
    YakitRoute.ShortcutKey,
    YakitRoute.FingerprintManage,
    YakitRoute.AI_Agent,
    YakitRoute.Ssa_Result_Diff,
    YakitRoute.AddAIForge,
    YakitRoute.ModifyAIForge,
    YakitRoute.AddAITool,
    YakitRoute.ModifyAITool,
   
    YakitRoute.AI_REPOSITORY
]
/** 不需要软件安全边距的页面路由 */
export const NoPaddingRoute: YakitRoute[] = [
    YakitRoute.PayloadGenerater_New,
    YakitRoute.ReverseServer_New,
    YakitRoute.DataCompare,
    YakitRoute.YakScript,
    YakitRoute.HTTPHacker,
    YakitRoute.MITMHacker,
    YakitRoute.Plugin_Hub,
    YakitRoute.ICMPSizeLog,
    YakitRoute.TCPPortLog,
    YakitRoute.DNSLog,
    YakitRoute.NewHome,
    YakitRoute.DB_CVE,
    YakitRoute.HTTPFuzzer,
    YakitRoute.DB_Ports,
    YakitRoute.DB_HTTPHistory,
    YakitRoute.DB_HTTPHistoryAnalysis,
    YakitRoute.Plugin_Audit,
    YakitRoute.AddYakitScript,
    YakitRoute.PayloadManager,
    YakitRoute.Data_Statistics,
    YakitRoute.BatchExecutorPage,
    YakitRoute.Codec,
    YakitRoute.Space_Engine,
    YakitRoute.Plugin_OP,
    YakitRoute.PoC,
    YakitRoute.Mod_ScanPort,
    YakitRoute.Mod_Brute,
    YakitRoute.SimpleDetect,
    YakitRoute.DB_Risk,
    YakitRoute.Misstatement,
    YakitRoute.ShellReceiver,
    YakitRoute.YakRunner_Code_Scan,
    YakitRoute.YakRunner_Audit_Code,
    YakitRoute.YakRunner_Project_Manager,
    YakitRoute.YakRunner_ScanHistory,
    YakitRoute.Rule_Management,
    YakitRoute.Modify_Notepad,
    YakitRoute.Notepad_Manage,
    YakitRoute.YakRunner_Audit_Hole,
    YakitRoute.Yak_Java_Decompiler,
    YakitRoute.ShortcutKey,
    YakitRoute.FingerprintManage,
    YakitRoute.AI_Agent,
    YakitRoute.Ssa_Result_Diff,
    YakitRoute.AddAIForge,
    YakitRoute.ModifyAIForge,
    YakitRoute.AddAITool,
    YakitRoute.ModifyAITool,
  
    YakitRoute.AI_REPOSITORY
]
/** 无滚动条的页面路由 */
export const NoScrollRoutes: YakitRoute[] = [
    YakitRoute.HTTPHacker,
    YakitRoute.MITMHacker,
    YakitRoute.Mod_Brute,
    YakitRoute.YakScript,
    YakitRoute.AI_Agent,
    YakitRoute.ShortcutKey,
    YakitRoute.YakRunner_ScanHistory
]
/** 一级tab固定展示tab  */
export const defaultFixedTabs: YakitRoute[] = [
    YakitRoute.NewHome,
    YakitRoute.DB_HTTPHistory,
    YakitRoute.DB_HTTPHistoryAnalysis
]
/** 一级tab固定展示tab支持多开页面 */
export const defaultFixedTabsNoSinglPageRoute: YakitRoute[] = [YakitRoute.DB_HTTPHistoryAnalysis]
/** 用户退出登录后，需自动关闭的页面 */
export const LogOutCloseRoutes: YakitRoute[] = [YakitRoute.Plugin_Audit, YakitRoute.Data_Statistics]

export interface ComponentParams {
    // 是否跳转到新开页面 默认跳转
    openFlag?: boolean
    // Route.HTTPFuzzer 参数---start
    isHttps?: boolean
    request?: string
    system?: string
    advancedConfigValue?: AdvancedConfigValueProps
    advancedConfigShow?: AdvancedConfigShowProps | null
    hotPatchCode?: string
    // Route.HTTPFuzzer 参数---end

    // order?: string
    /**@param id 页面唯一标识id HTTPFuzzer/SimpleDetect必须要有的，其他页面可以不用 */
    id?: string
    /**@param groupId HTTPFuzzer必须要有的，其他页面可以不用 */
    groupId?: string
    /**@name webFuzzer变量参数 */
    params?: FuzzerParamItem[]
    /**@name webFuzzer提取器参数 */
    extractors?: HTTPResponseExtractor[]

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

    // 编辑插件
    editPluginId?: number

    // webshell info
    webshellInfo?: WebShellDetail
    /**批量执行页面参数 */
    pluginBatchExecutorPageInfo?: PluginBatchExecutorPageInfoProps
    /**专项漏洞页面 */
    pocPageInfo?: PocPageInfoProps
    /**弱口令页面 */
    brutePageInfo?: BrutePageInfoProps
    /**端口扫描页面 */
    scanPortPageInfo?: ScanPortPageInfoProps
    /**空间引擎页面 */
    spaceEnginePageInfo?: SpaceEnginePageInfoProps
    /**简易版 安全检测页面 */
    simpleDetectPageInfo?: SimpleDetectPageInfoProps
    /**webSocket页面 */
    websocketFuzzerPageInfo?: WebsocketFuzzerPageInfoProps
    /**流量分析器页面 */
    hTTPHistoryAnalysisPageInfo?: HTTPHistoryAnalysisPageInfo
    /**新建插件页面 */
    addYakitScriptPageInfo?: AddYakitScriptPageInfoProps
    /**漏洞与风险统计页面 */
    riskPageInfoProps?: RiskPageInfoProps
    /**MITM劫持页面 v1 */
    hTTPHackerPageInfoProps?: HTTPHackerPageInfoProps
    /**代码审计页面 */
    auditCodePageInfo?: AuditCodePageInfoProps
    auditHolePageInfo?: AuditHoleInfoProps
    /**代码扫描页面 */
    codeScanPageInfo?: CodeScanPageInfoProps
    /**记事本编辑页面 */
    modifyNotepadPageInfo?: ModifyNotepadPageInfoProps
    /** hTTPHacker v2 新版 */
    mitmHackerPageInfo?: MITMHackerPageInfoProps

    /** 快捷键配置页面信息 */
    shortcutKeyPage?: ShortcutKeyPageName

    /** 编辑 forge 模板 */
    modifyAIForgePageInfo?: AIForgeEditorPageInfoProps

    /** 编辑 ai tool 页面 */
    modifyAIToolPageInfo?: AIToolEditorPageInfoProps
    /** 扫描历史页面 */
    yakRunnerScanHistoryPageInfo?: YakRunnerScanHistoryPageInfoProps
    /** 规则管理页面 */
    ruleManagementPageInfo?: RuleManagementPageInfoProps
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
                        <div style={{padding: "20px", fontFamily: "monospace"}}>
                            <h3>页面发生错误</h3>
                            <p>逻辑性崩溃，请关闭重试！</p>
                            <div style={{marginTop: "16px"}}>
                                <h4>错误信息:</h4>
                                <pre style={{                background: "var(--Colors-Use-Neutral-Bg)", padding: "8px", borderRadius: "4px"}}>
                                    {error?.message}
                                </pre>
                            </div>
                            <div style={{marginTop: "16px"}}>
                                <h4>错误堆栈:</h4>
                                <pre
                                    style={{
                                         background: "var(--Colors-Use-Neutral-Bg)",
                                        padding: "8px",
                                        borderRadius: "4px",
                                        maxHeight: "300px",
                                        overflow: "auto",
                                        fontSize: "12px"
                                    }}
                                >
                                    {error?.stack || "无堆栈信息"}
                                </pre>
                            </div>
                            <div style={{marginTop: "16px"}}>
                                <h4>组件信息:</h4>
                                <pre style={{background: "var(--Colors-Use-Neutral-Bg)", padding: "8px", borderRadius: "4px"}}>
                                    组件名称: {WrappedComponent?.name || WrappedComponent?.displayName || "未知组件"}
                                </pre>
                            </div>
                            <div style={{marginTop: "16px"}}>
                                <h4>传入参数:</h4>
                                <pre
                                    style={{
                                        background: "var(--Colors-Use-Neutral-Bg)",
                                        padding: "8px",
                                        borderRadius: "4px",
                                        maxHeight: "200px",
                                        overflow: "auto",
                                        fontSize: "12px"
                                    }}
                                >
                                    {JSON.stringify(props, null, 2)}
                                </pre>
                            </div>
                            <button
                                onClick={resetErrorBoundary}
                                style={{
                                    marginTop: "16px",
                                    padding: "8px 16px",
                                    background: "var(--Colors-Use-Blue-Primary)",
                                    color:"var(--Colors-Use-Blue-On-Primary)",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                }}
                            >
                                重试
                            </button>
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
            return <>{isIRify() ? <IRifyHome /> : <Home />}</>
        case YakitRoute.HTTPHacker:
            return (
                <Suspense fallback={<PageLoading />}>
                    <HTTPHacker />
                </Suspense>
            )
        case YakitRoute.MITMHacker:
            return (
                <Suspense fallback={<PageLoading />}>
                    <MITMHacker />
                </Suspense>
            )
        case YakitRoute.HTTPFuzzer:
            return (
                <Suspense fallback={<PageLoading />}>
                    <WebFuzzerPage defaultType='config' id={params?.id || ""}>
                        <HTTPFuzzerPage system={params?.system} id={params?.id || ""} />
                    </WebFuzzerPage>
                </Suspense>
            )
        case YakitRoute.WebsocketFuzzer:
            return <WebsocketFuzzer pageId={params?.id || ""} />
        case YakitRoute.Codec:
            return <NewCodec id={params?.id || ""} />
        case YakitRoute.DataCompare:
            return <DataCompare leftData={params?.leftData} rightData={params?.rightData} />
        case YakitRoute.Mod_ScanPort:
            return <NewPortScan id={params?.id || ""} />
        case YakitRoute.PoC:
            return <YakPoC pageId={params?.id || ""} />
        case YakitRoute.Plugin_OP:
            if (!yakScriptId || !+yakScriptId) return <div />
            return <SinglePluginExecution yakScriptId={yakScriptId || 0} />
        case YakitRoute.Mod_Brute:
            return <NewBrute id={params?.id || ""} />
        case YakitRoute.Plugin_Hub:
            return (
                <Suspense fallback={<PageLoading />}>
                    <PluginHub />
                </Suspense>
            )
        case YakitRoute.BatchExecutorPage:
            return <PluginBatchExecutor id={params?.id || ""} />
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
            return <ShellReceiver />
        case YakitRoute.DB_HTTPHistory:
            return <HTTPHistory pageType='History' />
        case YakitRoute.DB_HTTPHistoryAnalysis:
            return <HTTPHistoryAnalysis pageId={params?.id || ""} />
        case YakitRoute.DB_Report:
            return <ReportViewerPage />
        case YakitRoute.DB_Risk:
            return <RiskPage />
        case YakitRoute.Misstatement:
            return <Misstatement />
        case YakitRoute.DB_Ports:
            return <PortAssetTable />
        case YakitRoute.DB_Domain:
            return <DomainAssetPage />
        case YakitRoute.DB_CVE:
            return <CVEViewer />
        case YakitRoute.YakScript:
            return <YakRunner />
        case YakitRoute.PayloadManager:
            return <NewPayload />
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
        case YakitRoute.ControlAdminPage:
            return <ControlAdminPage />
        case YakitRoute.AddYakitScript:
            return <AddYakitPlugin />
        case YakitRoute.SimpleDetect:
            return <SimpleDetect pageId={params?.id || ""} />
        case YakitRoute.ScreenRecorderPage:
            return <ScreenRecorderPage />
        case YakitRoute.DB_ChaosMaker:
            return <ChaosMakerPage />
        case YakitRoute.Beta_DebugTrafficAnalize:
            return <PcapXDemo />
        case YakitRoute.Beta_DebugMonacoEditor:
            return <DebugMonacoEditorPage />
        case YakitRoute.Beta_VulinboxManager:
            return <VulinboxManager />
        case YakitRoute.Beta_DiagnoseNetwork:
            return <DiagnoseNetworkPage />
        case YakitRoute.Beta_ConfigNetwork:
            return <ConfigNetworkPage />
        case YakitRoute.Plugin_Audit:
            return (
                <OnlineJudgment isJudgingLogin={true}>
                    <PluginManage />
                </OnlineJudgment>
            )
        case YakitRoute.Beta_WebShellManager:
            return <WebShellViewer />
        case YakitRoute.Beta_WebShellOpt:
            return (
                <WebShellDetailOpt id={(params?.id || "") + ""} webshellInfo={params?.webshellInfo as WebShellDetail} />
            )
        case YakitRoute.Data_Statistics:
            return <DataStatistics />
        case YakitRoute.Space_Engine:
            return <SpaceEnginePage pageId={params?.id || ""} />
        case YakitRoute.YakRunner_Code_Scan:
            return <YakRunnerCodeScan pageId={params?.id || ""} />
        case YakitRoute.YakRunner_Audit_Code:
            return <YakRunnerAuditCode auditCodePageInfo={params?.auditCodePageInfo} />
        case YakitRoute.YakRunner_Project_Manager:
            return <YakRunnerProjectManager />
        case YakitRoute.YakRunner_ScanHistory:
            return <YakRunnerScanHistory />
        case YakitRoute.Rule_Management:
            return <RuleManagement ruleManagementPageInfo={params?.ruleManagementPageInfo} />
        case YakitRoute.Notepad_Manage:
            return <NotepadManage />
        case YakitRoute.Modify_Notepad:
            return <ModifyNotepad pageId={params?.id || ""} />
        case YakitRoute.YakRunner_Audit_Hole:
            return <YakRunnerAuditHole />
        case YakitRoute.System_Config:
            return <SystemConfig />
        case YakitRoute.Yak_Java_Decompiler:
            return <YakJavaDecompiler />
        case YakitRoute.AI_Agent:
            return <AIAgent />
        case YakitRoute.ShortcutKey:
            return <ShortcutKeyList />
        case YakitRoute.FingerprintManage:
            return <FingerprintManage />
        case YakitRoute.Ssa_Result_Diff:
            return <SsaResDiff />
        case YakitRoute.AI_REPOSITORY:
            return <KnowledgeBase />
        case YakitRoute.AddAIForge:
            return <ForgeEditor />
        case YakitRoute.ModifyAIForge:
            return <ForgeEditor isModify={true} />

        case YakitRoute.AddAITool:
            return <AIToolEditor pageId={params?.id || ""} />
        case YakitRoute.ModifyAITool:
            return <AIToolEditor pageId={params?.id || ""} isModify={true} />

        default:
            return <div />
    }
}

export const RouteToPageItem = withRouteToPage(RouteToPage)

/** @name 菜单中内定插件的插件名称(不是展示名称) */
export enum ResidentPluginName {
    SubDomainCollection = "子域名收集",
    BasicCrawler = "基础爬虫",
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
    labelUi?: string
    describe?: string
    describeUi?: string
    yakScriptId?: number
    yakScripName?: string
    children?: PublicRouteMenuProps[]
}
/**
 * @name public版菜单配置数据
 * @description 注意! 该数据只在折叠菜单时使用，展开菜单的渲染并未使用该数据，如需调整展开菜单，请在组件MenuMode内修改
 */
export const PublicRouteMenu: PublicRouteMenuProps[] = isIRify()
    ? [
          {
              page: undefined,
              label: "代码审计",
              labelUi: "YakitRoute.codeAudit",
              children: [
                  {
                      page: YakitRoute.YakRunner_Project_Manager,
                      ...YakitRouteToPageInfo[YakitRoute.YakRunner_Project_Manager]
                  },
                  {
                      page: YakitRoute.YakRunner_Audit_Code,
                      ...YakitRouteToPageInfo[YakitRoute.YakRunner_Audit_Code]
                  },
                  {
                      page: YakitRoute.YakRunner_Code_Scan,
                      ...YakitRouteToPageInfo[YakitRoute.YakRunner_Code_Scan]
                  },
                  {
                      page: YakitRoute.Rule_Management,
                      ...YakitRouteToPageInfo[YakitRoute.Rule_Management]
                  },
                  {
                      page: YakitRoute.YakRunner_Audit_Hole,
                      ...YakitRouteToPageInfo[YakitRoute.YakRunner_Audit_Hole]
                  },
                  {
                      page: YakitRoute.Yak_Java_Decompiler,
                      ...YakitRouteToPageInfo[YakitRoute.Yak_Java_Decompiler]
                  }
              ]
          },
          {
              page: undefined,
              label: "数据库",
              labelUi: "YakitRoute.database",
              children: [{page: YakitRoute.DB_Report, ...YakitRouteToPageInfo[YakitRoute.DB_Report]}]
          }
          //   {
          //       page: undefined,
          //       label: "AI",
          //       children: [{page: YakitRoute.AI_Agent, ...YakitRouteToPageInfo[YakitRoute.AI_Agent]}]
          //   }
      ]
    : [
          {
              page: undefined,
              label: "渗透测试",
              labelUi: "YakitRoute.penTest",
              children: [
                  {
                      page: YakitRoute.MITMHacker,
                      ...YakitRouteToPageInfo[YakitRoute.MITMHacker]
                  },
                  {
                      page: undefined,
                      label: "Fuzzer",
                      labelUi: "YakitRoute.fuzzer",
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
              labelUi: "YakitRoute.securityTools",
              children: [
                  {
                      page: YakitRoute.Mod_ScanPort,
                      ...YakitRouteToPageInfo[YakitRoute.Mod_ScanPort]
                  },
                  {page: YakitRoute.PoC, ...YakitRouteToPageInfo[YakitRoute.PoC]},
                  {
                      page: YakitRoute.Plugin_OP,
                      label: "子域名收集",
                      labelUi: "YakitRoute.subdomainCollection",
                      yakScripName: ResidentPluginName.SubDomainCollection
                  },
                  {
                      page: YakitRoute.Plugin_OP,
                      label: "基础爬虫",
                      labelUi: "YakitRoute.basicCrawler",
                      yakScripName: ResidentPluginName.BasicCrawler
                  },
                  {page: YakitRoute.Space_Engine, ...YakitRouteToPageInfo[YakitRoute.Space_Engine]},
                  {
                      page: undefined,
                      label: "爆破与未授权检测",
                      labelUi: "YakitRoute.bruteForceAndUnauthorizedCheck",
                      children: [
                          {
                              page: YakitRoute.Mod_Brute,
                              ...YakitRouteToPageInfo[YakitRoute.Mod_Brute]
                          },
                          {
                              page: YakitRoute.Plugin_OP,
                              label: "目录扫描",
                              labelUi: "YakitRoute.directoryScan",
                              yakScripName: ResidentPluginName.DirectoryScanning
                          }
                      ]
                  }
              ]
          },
          {
              page: undefined,
              label: "插件",
              labelUi: "YakitRoute.plugin",
              children: [
                  {
                      page: YakitRoute.Plugin_Hub,
                      ...YakitRouteToPageInfo[YakitRoute.Plugin_Hub]
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
              labelUi: "YakitRoute.reverseConnection",
              children: [
                  {
                      page: undefined,
                      label: "反连触发器",
                      labelUi: "YakitRoute.reverseTrigger",
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
                      labelUi: "YakitRoute.revHack",
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
              labelUi: "YakitRoute.database",
              children: [
                  {
                      page: YakitRoute.DB_HTTPHistory,
                      ...YakitRouteToPageInfo[YakitRoute.DB_HTTPHistory]
                  },
                  {page: YakitRoute.DB_Report, ...YakitRouteToPageInfo[YakitRoute.DB_Report]},
                  {page: YakitRoute.DB_Risk, ...YakitRouteToPageInfo[YakitRoute.DB_Risk]},
                  {page: YakitRoute.DB_Ports, ...YakitRouteToPageInfo[YakitRoute.DB_Ports]},
                  {page: YakitRoute.DB_Domain, ...YakitRouteToPageInfo[YakitRoute.DB_Domain]},
                  {page: YakitRoute.FingerprintManage, ...YakitRouteToPageInfo[YakitRoute.FingerprintManage]},
                  {page: YakitRoute.DB_CVE, ...YakitRouteToPageInfo[YakitRoute.DB_CVE]}
              ]
          }
          //   {
          //       page: undefined,
          //       label: "AI",
          //       children: [{page: YakitRoute.AI_Agent, ...YakitRouteToPageInfo[YakitRoute.AI_Agent]}]
          //   }
      ]
/**
 * @name public版常用插件列表
 * @description 注意！该列表内保存的都为插件的名称
 */
export const PublicCommonPlugins: PublicRouteMenuProps[] = [
    {
        page: undefined,
        label: "基础工具",
        children: [
            "web登录页面用户名密码爆破",
            "基础爬虫",
            "字典生成器",
            "无头浏览器模拟点击爬虫",
            "综合目录扫描与爆破",
            "fuzztag表格生成",
            "按行去重"
        ].map((item) => {
            return {page: YakitRoute.Plugin_OP, label: item, yakScripName: item}
        })
    },
    {
        page: undefined,
        label: "子域名收集",
        children: ["子域名收集&漏洞扫描", "IP批量查询", "主动指纹探测", "ICP备案查询", "瞅一下"].map((item) => {
            return {page: YakitRoute.Plugin_OP, label: item, yakScripName: item}
        })
    }
]

/** private版菜单项属性 */
export interface PrivateRouteMenuProps {
    page: YakitRoute | undefined
    label: string
    labelUi?: string
    icon?: ReactNode
    hoverIcon?: JSX.Element
    describe?: string
    describeUi?: string
    yakScriptId?: number
    yakScripName?: string
    children?: PrivateRouteMenuProps[]
}
/** 软件内定插件菜单的icon */
export const getFixedPluginIcon = (name: string) => {
    switch (name) {
        case "基础爬虫":
            return <PrivateOutlineBasicCrawlerIcon />
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
    [YakitRoute.MITMHacker]: {
        page: YakitRoute.MITMHacker,
        icon: <PrivateOutlineMitmIcon />,
        hoverIcon: <PrivateSolidMitmIcon />,
        ...YakitRouteToPageInfo[YakitRoute.MITMHacker]
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
    [YakitRoute.Plugin_Hub]: {
        page: YakitRoute.Plugin_Hub,
        icon: <PrivateOutlinePluginStoreIcon />,
        hoverIcon: <PrivateSolidPluginStoreIcon />,
        ...YakitRouteToPageInfo[YakitRoute.Plugin_Hub]
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
        hoverIcon: <PrivateSolidReverseServerIcon />,
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
    [YakitRoute.YakRunner_Audit_Code]: {
        page: YakitRoute.YakRunner_Audit_Code,
        icon: <PrivateOutlineAuditCodeIcon />,
        hoverIcon: <PrivateSolidAuditCodeIcon />,
        ...YakitRouteToPageInfo[YakitRoute.YakRunner_Audit_Code]
    },
    [YakitRoute.YakRunner_Audit_Hole]: {
        page: YakitRoute.YakRunner_Audit_Hole,
        icon: <PrivateOutlineAuditHoleIcon />,
        hoverIcon: <PrivateSolidAuditHoleIcon />,
        ...YakitRouteToPageInfo[YakitRoute.YakRunner_Audit_Hole]
    },
    [YakitRoute.YakRunner_Project_Manager]: {
        page: YakitRoute.YakRunner_Project_Manager,
        icon: <PrivateOutlineProjectManagerIcon />,
        hoverIcon: <PrivateSolidProjectManagerIcon />,
        ...YakitRouteToPageInfo[YakitRoute.YakRunner_Project_Manager]
    },
    [YakitRoute.YakRunner_Code_Scan]: {
        page: YakitRoute.YakRunner_Code_Scan,
        icon: <PrivateOutlineCodeScanIcon />,
        hoverIcon: <PrivateSolidCodeScanIcon />,
        ...YakitRouteToPageInfo[YakitRoute.YakRunner_Code_Scan]
    },
    [YakitRoute.Rule_Management]: {
        page: YakitRoute.Rule_Management,
        icon: <PrivateOutlineRuleManagementIcon />,
        hoverIcon: <PrivateSolidRuleManagementIcon />,
        ...YakitRouteToPageInfo[YakitRoute.Rule_Management]
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
    [YakitRoute.DB_HTTPHistory]: {
        page: YakitRoute.DB_HTTPHistory,
        icon: <PrivateOutlineHTTPHistoryIcon />,
        hoverIcon: <PrivateSolidHTTPHistoryIcon />,
        ...YakitRouteToPageInfo[YakitRoute.DB_HTTPHistory]
    },
    [YakitRoute.FingerprintManage]: {
        page: YakitRoute.FingerprintManage,
        icon: <PrivateOutlineFingerprintManageIcon />,
        hoverIcon: <PrivateSolidFingerprintManageIcon />,
        ...YakitRouteToPageInfo[YakitRoute.FingerprintManage]
    },
    [YakitRoute.DB_CVE]: {
        page: YakitRoute.DB_CVE,
        icon: <PrivateOutlineCVEIcon />,
        hoverIcon: <PrivateSolidCVEIcon />,
        ...YakitRouteToPageInfo[YakitRoute.DB_CVE]
    },
    [YakitRoute.Space_Engine]: {
        page: YakitRoute.Space_Engine,
        icon: <PrivateOutlineSpaceEngineIcon />,
        hoverIcon: <PrivateSolidSpaceEngineIcon />,
        ...YakitRouteToPageInfo[YakitRoute.Space_Engine]
    },
    [YakitRoute.Yak_Java_Decompiler]: {
        page: YakitRoute.Yak_Java_Decompiler,
        icon: <PrivateOutlineAuditHoleIcon />,
        hoverIcon: <PrivateSolidAuditHoleIcon />,
        ...YakitRouteToPageInfo[YakitRoute.Yak_Java_Decompiler]
    }
    // [YakitRoute.AI_Agent]: {
    //     page: YakitRoute.AI_Agent,
    //     icon: <PrivateOutlineAIAgentIcon />,
    //     hoverIcon: <PrivateSolidAIAgentIcon />,
    //     ...YakitRouteToPageInfo[YakitRoute.AI_Agent]
    // }
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
export const InvalidFirstMenuItem = isCommunityEdition()
    ? CommunityDeprecatedFirstMenu.join("|")
    : EnterpriseDeprecatedFirstMenu.join("|")
/**
 * @name 强制删除用户端的无效菜单项集合
 * @description 该菜单数据为开发者迭代版本所产生的已消失的页面菜单项
 * @description 每个菜单项由 '|' 字符进行分割
 */
export const InvalidPageMenuItem = isCommunityEdition()
    ? CommunityDeprecatedSecondMenu.join("|")
    : EnterpriseDeprecatedSecondMenu.join("|")
/**
 * @name private版专家模式菜单配置数据
 * @description 修改只对专家模式有效，别的模式需取对应模式数据进行修改
 */
export const PrivateExpertRouteMenu: PrivateRouteMenuProps[] = isIRify()
    ? [
          {
              page: undefined,
              label: "代码审计",
              labelUi: "YakitRoute.codeAudit",
              children: [
                  PrivateAllMenus[YakitRoute.YakRunner_Project_Manager],
                  PrivateAllMenus[YakitRoute.YakRunner_Audit_Code],
                  PrivateAllMenus[YakitRoute.YakRunner_Code_Scan],
                  PrivateAllMenus[YakitRoute.Rule_Management],
                  PrivateAllMenus[YakitRoute.YakRunner_Audit_Hole],
                  PrivateAllMenus[YakitRoute.Yak_Java_Decompiler]
              ]
          },
          {
              page: undefined,
              label: "数据库",
              labelUi: "YakitRoute.database",
              children: routeToChildren([YakitRoute.DB_Report])
          }
          //   {
          //       page: undefined,
          //       label: "AI",
          //       children: routeToChildren([YakitRoute.AI_Agent])
          //   }
      ]
    : [
          {
              page: undefined,
              label: "手工渗透",
              labelUi: "YakitRoute.manualPenTest",
              children: routeToChildren([YakitRoute.MITMHacker, YakitRoute.HTTPFuzzer, YakitRoute.WebsocketFuzzer])
          },
          {
              page: undefined,
              label: "安全工具",
              labelUi: "YakitRoute.securityTools",
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
                  PrivateAllMenus[YakitRoute.Space_Engine],
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
              labelUi: "YakitRoute.vulnTargetedScan",
              children: routeToChildren([YakitRoute.PoC])
          },
          {
              page: undefined,
              label: "插件",
              labelUi: "YakitRoute.plugin",
              children: routeToChildren([YakitRoute.Plugin_Hub, YakitRoute.BatchExecutorPage])
          },
          {
              page: undefined,
              label: "反连",
              labelUi: "YakitRoute.reverseConnection",
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
              labelUi: "YakitRoute.dataProcessing",
              children: routeToChildren([YakitRoute.Codec, YakitRoute.DataCompare])
          },
          {
              page: undefined,
              label: "数据库",
              labelUi: "YakitRoute.database",
              children: routeToChildren([
                  YakitRoute.DB_Report,
                  YakitRoute.DB_Ports,
                  YakitRoute.DB_Risk,
                  YakitRoute.DB_Domain,
                  YakitRoute.DB_HTTPHistory,
                  YakitRoute.FingerprintManage,
                  YakitRoute.DB_CVE
              ])
          }
          //   {
          //       page: undefined,
          //       label: "AI",
          //       children: routeToChildren([YakitRoute.AI_Agent])
          //   }
      ]

/**
 * @name private版扫描模式菜单配置数据
 * @description 修改只对扫描模式有效，别的模式需取对应模式数据进行修改
 */
export const PrivateScanRouteMenu: PrivateRouteMenuProps[] = [
    {
        page: undefined,
        label: "安全工具",
        labelUi: "YakitRoute.securityTools",
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
            PrivateAllMenus[YakitRoute.Space_Engine],
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
        labelUi: "YakitRoute.vulnTargetedScan",
        children: routeToChildren([YakitRoute.PoC])
    },
    {
        page: undefined,
        label: "插件",
        labelUi: "YakitRoute.plugin",
        children: routeToChildren([YakitRoute.Plugin_Hub, YakitRoute.BatchExecutorPage])
    },
    {
        page: undefined,
        label: "数据处理",
        labelUi: "YakitRoute.dataProcessing",
        children: routeToChildren([YakitRoute.Codec, YakitRoute.DataCompare])
    },
    {
        page: undefined,
        label: "数据库",
        labelUi: "YakitRoute.database",
        children: routeToChildren([
            YakitRoute.DB_Report,
            YakitRoute.DB_Ports,
            YakitRoute.DB_Risk,
            YakitRoute.DB_Domain,
            YakitRoute.DB_HTTPHistory,
            YakitRoute.FingerprintManage,
            YakitRoute.DB_CVE
        ])
    }
    //   {
    //       page: undefined,
    //       label: "AI",
    //       children: routeToChildren([YakitRoute.AI_Agent])
    //   }
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
        labelUi: "YakitRoute.securityCheck",
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
        labelUi: "YakitRoute.plugin",
        children: [
            {
                page: YakitRoute.Plugin_Hub,
                icon: <PrivateOutlinePluginStoreIcon />,
                hoverIcon: <PrivateSolidPluginStoreIcon />,
                ...YakitRouteToPageInfo[YakitRoute.Plugin_Hub]
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
        labelUi: "YakitRoute.database",
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
