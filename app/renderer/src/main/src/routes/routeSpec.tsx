import react from "react";
import {PortListening} from "../pages/PortListening";
import {YakExecutor} from "../pages/invoker/YakExecutor";
import {
    FireOutlined, CodeOutlined, OneToOneOutlined,
    EllipsisOutlined, AimOutlined, FunctionOutlined,
    AppstoreOutlined, AuditOutlined, RocketOutlined,
} from "@ant-design/icons";
import {MITMPage} from "../pages/mitm/MITMPage";
import {HistoryPage} from "../pages/history/HistoryPage";
import {HTTPFuzzerPage} from "../pages/fuzzer/HTTPFuzzerPage";
import {HTTPHacker} from "../pages/hacker/httpHacker";
import {CodecPage} from "../pages/codec/CodecPage";
import {ShellReceiverPage} from "../pages/shellReceiver/ShellReceiverPage";
import {YakBatchExecutor} from "../pages/invoker/batch/YakBatchExecutor";
import {YakScriptManagerPage} from "../pages/invoker/YakScriptManager";
import {PayloadManagerPage} from "../pages/payloadManager/PayloadManager";
import {PortScanPage} from "../pages/portscan/PortScanPage";

export enum Route {
    MITM = "mitm",
    YakScript = "yakScript",
    ShellReceiver = "shellReceiver",
    Codec = "codec",
    WebShellManager = "webShellManager",
    HistoryRequests = "historyRequests",
    HTTPFuzzer = "httpFuzzer",
    HTTPHacker = "httpHacker",
    IGNORE = "ignore",

    ModManager = "mod-manager",

    // 具体漏洞内容
    PoC = "poc",
    PoC_Struts = "struts",
    PoC_Thinkphp = "thinkphp",
    PoC_Tomcat = "tomcat",
    PoC_WebLogic = "weblogic",
    PoC_Spring = "spring",
    PoC_Wordpress = "wordpress",
    PoC_Jenkins = "jenkins",
    PoC_IIS = "iis",
    PoC_ElasticSearch = "elasticsearch",
    PoC_SeeyouOA = "seeyouoa",
    PoC_Exchange = "exchange",
    PoC_TongDaOA = "tongdaoa",
    PoC_PhpMyAdmin = "phpmyadmin",
    PoC_Nexus = "nexus",
    PoC_Laravel = "laravel",
    PoC_JBoss = "jboss",
    PoC_ColdFusion = "coldfusion",
    PoC_ActiveMQ = "activemq",

    // Payload 管理
    PayloadManager = "payload-manager",

    // 通用模块
    GeneralModule = "general-module",
    Mod_ScanPort = "scan-port",
    Mod_Subdomain = "subdomain",
    Mod_Brute = "brute",
}

interface MenuDataProps {
    key?: Route
    subMenuData?: MenuDataProps[],
    label: string
    icon: JSX.Element
    disabled?: boolean
}

export const RouteMenuData: MenuDataProps[] = [
    // {key: Route.HTTPFuzzer, label: "Web Fuzzer", icon: <AimOutlined/>},
    // {key: Route.MITM, label: "HTTP(S) 中间人劫持", icon: <FireOutlined/>},
    {
        key: Route.HTTPHacker, label: "手工渗透测试", icon: <AimOutlined/>,
    },
    {
        key: Route.GeneralModule, label: "通用模块", icon: <RocketOutlined/>,
        subMenuData: [
            {key: Route.Mod_ScanPort, label: "扫描端口/指纹", icon: <EllipsisOutlined/>},
            {key: Route.Mod_Subdomain, label: "子域名发现", icon: <EllipsisOutlined/>, disabled: true},
            {key: Route.Mod_Brute, label: "爆破", icon: <EllipsisOutlined/>, disabled: true},
        ],
    },
    {
        key: Route.PoC, label: "专项漏洞检测",
        icon: <FunctionOutlined/>,
        subMenuData: [
            {key: Route.PoC_Struts, label: "Struts", icon: <EllipsisOutlined/>},
            {key: Route.PoC_Thinkphp, label: "ThinkPHP", icon: <EllipsisOutlined/>},
            {key: Route.PoC_Tomcat, label: "Tomcat", icon: <EllipsisOutlined/>},
            {key: Route.PoC_WebLogic, label: "Weblogic", icon: <EllipsisOutlined/>},
            {key: Route.PoC_Spring, label: "Spring", icon: <EllipsisOutlined/>},
            {key: Route.PoC_Jenkins, label: "Jenkins", icon: <EllipsisOutlined/>},
            {key: Route.PoC_IIS, label: "IIS", icon: <EllipsisOutlined/>},
            {key: Route.PoC_ElasticSearch, label: "ElasticSearch", icon: <EllipsisOutlined/>},
            {key: Route.PoC_SeeyouOA, label: "致远 OA", icon: <EllipsisOutlined/>},
            {key: Route.PoC_Exchange, label: "Exchange", icon: <EllipsisOutlined/>},
            {key: Route.PoC_TongDaOA, label: "通达 OA", icon: <EllipsisOutlined/>},
            {key: Route.PoC_PhpMyAdmin, label: "PhpMyAdmin", icon: <EllipsisOutlined/>},
            {key: Route.PoC_Nexus, label: "Nexus", icon: <EllipsisOutlined/>},
            {key: Route.PoC_Laravel, label: "Laravel", icon: <EllipsisOutlined/>},
            {key: Route.PoC_JBoss, label: "JBoss", icon: <EllipsisOutlined/>},
            {key: Route.PoC_ColdFusion, label: "ColdFusion", icon: <EllipsisOutlined/>},
            {key: Route.PoC_ActiveMQ, label: "ActiveMQ", icon: <EllipsisOutlined/>},
            {key: Route.PoC_Wordpress, label: "Wordpress", icon: <EllipsisOutlined/>},
        ],
    },

    {key: Route.ModManager, label: "模块管理器", icon: <AppstoreOutlined/>},
    {key: Route.PayloadManager, label: "Payload 管理", icon: <AuditOutlined/>},
    {key: Route.YakScript, label: "Yak Runner", icon: <CodeOutlined/>},
    {key: Route.Codec, label: "编码与解码", icon: <FireOutlined/>},
    {key: Route.ShellReceiver, label: "端口监听器", icon: <OneToOneOutlined/>},

    // {
    //     key: Route.IGNORE, label: "常用工具包", icon: <FireOutlined/>,
    //     subMenuData: [
    //         {key: Route.Codec, label: "编码与解码", icon: <EllipsisOutlined/>},
    //         {key: Route.ShellReceiver, label: "端口开放助手", icon: <FireOutlined/>},
    //     ],
    // },
]

export const ContentByRoute = (r: Route): JSX.Element => {
    switch (r) {
        // case Route.HistoryRequests:
        //     return <HistoryPage/>
        // case Route.MITM:
        //     return <MITMPage/>
        // case Route.HTTPFuzzer:
        //     return <HTTPFuzzerPage/>
        case Route.ShellReceiver:
            return <ShellReceiverPage/>
        case Route.WebShellManager:
            return <div>待开发</div>
        case Route.PoC_Thinkphp:
            return <YakBatchExecutor keyword={"thinkphp"} verbose={"ThinkPHP"}/>
        case Route.PoC_Struts:
            return <YakBatchExecutor keyword={"struts"} verbose={"Struts"}/>
        case Route.PoC_ActiveMQ:
            return <YakBatchExecutor keyword={"activeMQ,ActiveMQ,activemq"} verbose={"ActiveMQ"}/>
        case Route.PoC_ColdFusion:
            return <YakBatchExecutor keyword={"ColdFusion,coldfusion"} verbose={"ColdFusion"}/>
        case Route.PoC_ElasticSearch:
            return <YakBatchExecutor
                verbose={"ElasticSearch"}
                keyword={"elasticsearch,ElasticSearch,Elastic Search"}
            />
        case Route.PoC_Exchange:
            return <YakBatchExecutor keyword={"exchange"} verbose={"Exchange"}/>
        case Route.PoC_IIS:
            return <YakBatchExecutor keyword={"iis,IIS"} verbose={"IIS"}/>
        case Route.PoC_JBoss:
            return <YakBatchExecutor keyword={"Jboss,JBoss,jboss"} verbose={"JBoss"}/>
        case Route.PoC_Jenkins:
            return <YakBatchExecutor keyword={"jenkins,Jenkins"} verbose={"Jenkins"}/>
        case Route.PoC_Laravel:
            return <YakBatchExecutor keyword={"laravel,Laravel"} verbose={"Laravel"}/>
        case Route.PoC_Nexus:
            return <YakBatchExecutor keyword={"Nexus,nexus"} verbose={"Nexus"}/>
        case Route.PoC_PhpMyAdmin:
            return <YakBatchExecutor keyword={"phpmyadmin,PhpMyAdmin,PHPMyAdmin,Phpmyadmin"} verbose={"PhpMyAdmin"}/>
        case Route.PoC_SeeyouOA:
            return <YakBatchExecutor keyword={"SeeyouOA,seeyou_oa,seeyouoa,seeyou,Seeyou,致远,Zhiyuan,zhiyuan"}
                                     verbose={"致远 OA"}/>
        case Route.PoC_Tomcat:
            return <YakBatchExecutor keyword={"tomcat,Tomcat"} verbose={"Tomcat"}/>
        case Route.PoC_Spring:
            return <YakBatchExecutor keyword={"spring"} verbose={"Spring"}/>
        case Route.PoC_TongDaOA:
            return <YakBatchExecutor keyword={"tongdaoa,TongdaOa,TongDa,TongDaOA"} verbose={"通达 OA"}/>
        case Route.PoC_WebLogic:
            return <YakBatchExecutor keyword={"weblogic,Weblogic"} verbose={"Weblogic"}/>
        case Route.PoC_Wordpress:
            return <YakBatchExecutor keyword={"wordpress"} verbose={"Wordpress"}/>
        case Route.YakScript:
            return <YakExecutor/>
        case Route.HTTPHacker:
            return <HTTPHacker/>
        case Route.Codec:
            return <CodecPage/>
        case Route.ModManager:
            return <YakScriptManagerPage/>
        case Route.PayloadManager:
            return <PayloadManagerPage/>
        case Route.Mod_ScanPort:
            return <PortScanPage/>
        default:
            return <div/>
    }
}