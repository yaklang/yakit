import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakEditor} from "@/utils/editors"
import {failed, info} from "@/utils/notification"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {Spin} from "antd"
import React, {useEffect, useState} from "react"
import {MITMRuleExportProps, MITMRuleImportProps} from "./MITMRuleConfigureType"
import styles from "./MITMRuleConfigure.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useMemoizedFn} from "ahooks"

const {ipcRenderer} = window.require("electron")

const defaultConfig = [
    {
        Rule: "(?i)(jsonp_[a-z0-9]+)|((_?callback|_cb|_call|_?jsonp_?)=)",
        Color: "yellow",
        EnableForRequest: true,
        EnableForHeader: true,
        Index: 1,
        ExtraTag: ["疑似JSONP"]
    },
    {
        Rule: "(?i)((password)|(pass)|(secret)|(mima))['\"]?\\s*[\\:\\=]",
        Color: "red",
        EnableForRequest: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 2,
        ExtraTag: ["登陆/密码传输"]
    },
    {
        Rule: "(?i)((access|admin|api|debug|auth|authorization|gpg|ops|ray|deploy|s3|certificate|aws|app|application|docker|es|elastic|elasticsearch|secret)[-_]{0,5}(key|token|secret|secretkey|pass|password|sid|debug))|(secret|password)([\"']?\\s*:\\s*|\\s*=\\s*)",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 3,
        ExtraTag: ["敏感信息"]
    },
    {
        Rule: "(BEGIN PUBLIC KEY).*?(END PUBLIC KEY)",
        Color: "purple",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 4,
        ExtraTag: ["公钥传输"]
    },
    {
        Rule: "(?is)(\u003cform.*type=.*?text.*?type=.*?password.*?\u003c/form.*?\u003e)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 5,
        ExtraTag: ["login_pre_test"],
        VerboseName: "login_pre_test"
    },
    {
        Rule: "(?is)(\u003cform.*type=.*?text.*?type=.*?password.*?onclick=.*?\u003c/form.*?\u003e)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 6,
        ExtraTag: ["login_captcha_pre_test"],
        VerboseName: "login_captcha_pre_test"
    },
    {
        Rule: "(?is)\u003cform.*enctype=.*?multipart/form-data.*?type=.*?file.*?\u003c/form\u003e",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 7,
        ExtraTag: ["file_upload_pre_test"],
        VerboseName: "file_upload_pre_test"
    },
    {
        Rule: "(file=|path=|url=|lang=|src=|menu=|meta-inf=|web-inf=|filename=|topic=|page=｜_FilePath=|target=)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 8,
        ExtraTag: ["file_include_pre_test"],
        VerboseName: "file_include_pre_test"
    },
    {
        Rule: "((cmd=)|(exec=)|(command=)|(execute=)|(ping=)|(query=)|(jump=)|(code=)|(reg=)|(do=)|(func=)|(arg=)|(option=)|(load=)|(process=)|(step=)|(read=)|(function=)|(feature=)|(exe=)|(module=)|(payload=)|(run=)|(daemon=)|(upload=)|(dir=)|(download=)|(log=)|(ip=)|(cli=))|(ipaddress=)|(txt=)|(case=)|(count=)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 9,
        ExtraTag: ["code_inject_pre_test"],
        VerboseName: "code_inject_pre_test"
    },
    {
        Rule: '\\b(([^\u003c\u003e()[\\]\\\\.,;:\\s@"]+(\\.[^\u003c\u003e()[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+(cn|com|edu|gov|int|mil|net|org|biz|info|pro|name|museum|coop|aero|xxx|idv)))\\b',
        Color: "green",
        EnableForResponse: true,
        EnableForBody: true,
        Index: 10,
        ExtraTag: ["emailleak_in_url"],
        VerboseName: "emailleak_in_url"
    },
    {
        Rule: "\\b(?:(?:\\+|00)86)?1(?:(?:3[\\d])|(?:4[5-79])|(?:5[0-35-9])|(?:6[5-7])|(?:7[0-8])|(?:8[\\d])|(?:9[189]))\\d{8}\\b",
        Color: "green",
        EnableForResponse: true,
        EnableForBody: true,
        Index: 11,
        ExtraTag: ["phoneleak_in_url"],
        VerboseName: "phoneleak_in_url"
    },
    {
        Rule: "((\\[client\\])|\\[(mysql\\])|(\\[mysqld\\]))",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 12,
        ExtraTag: ["mysql_conf_in_url"],
        VerboseName: "mysql_conf_in_url"
    },
    {
        Rule: "\\b[1-9]\\d{5}(?:18|19|20)\\d{2}(?:0[1-9]|10|11|12)(?:0[1-9]|[1-2]\\d|30|31)\\d{3}[\\dXx]\\b",
        Color: "green",
        EnableForResponse: true,
        EnableForBody: true,
        Index: 13,
        ExtraTag: ["chinese_id_card_leak_in_url"],
        VerboseName: "chinese_id_card_leak_in_url"
    },
    {
        Rule: "[-]+BEGIN [^\\s]+ PRIVATE KEY[-]",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForBody: true,
        Index: 14,
        ExtraTag: ["ssh_rsa_private_key_in_url"],
        VerboseName: "ssh_rsa_private_key_in_url"
    },
    {
        Rule: "([A|a]ccess[K|k]ey[S|s]ecret)|([A|a]ccess[K|k]ey[I|i][d|D])|([Aa](ccess|CCESS)_?[Kk](ey|EY))|([Aa](ccess|CCESS)_?[sS](ecret|ECRET))|(([Aa](ccess|CCESS)_?(id|ID|Id)))|([Ss](ecret|ECRET)_?[Kk](ey|EY))",
        Color: "yellow",
        EnableForResponse: true,
        EnableForBody: true,
        Index: 15,
        ExtraTag: ["oss_in_url"],
        VerboseName: "oss_in_url"
    },
    {
        Rule: "[\\w-.]+\\.oss\\.aliyuncs\\.com",
        Color: "red",
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 16,
        ExtraTag: ["aliyun_oss_url_in_url"],
        VerboseName: "aliyun_oss_url_in_url"
    },
    {
        Rule: "\\b((127\\.0\\.0\\.1)|(localhost)|(10\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})|(172\\.((1[6-9])|(2\\d)|(3[01]))\\.\\d{1,3}\\.\\d{1,3})|(192\\.168\\.\\d{1,3}\\.\\d{1,3}))\\b",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 17,
        ExtraTag: ["ip_address_in_url"],
        VerboseName: "ip_address_in_url"
    },
    {
        Rule: "(=deleteMe|rememberMe=)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        Index: 18,
        ExtraTag: ["shiro_pre_test"],
        VerboseName: "shiro_pre_test"
    },
    {
        Rule: "(?is)^{.*}$",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForBody: true,
        Index: 19,
        ExtraTag: ["json_req_pre_test"],
        VerboseName: "json_req_pre_test"
    },
    {
        Rule: "(?is)^\u003c\\?xml.*\u003csoap:Body\u003e",
        Color: "green",
        EnableForRequest: true,
        EnableForBody: true,
        Index: 20,
        ExtraTag: ["soap_req_pre_test"],
        VerboseName: "soap_req_pre_test"
    },
    {
        Rule: "(?is)^\u003c\\?xml.*\u003e$",
        Color: "green",
        EnableForRequest: true,
        EnableForBody: true,
        Index: 21,
        ExtraTag: ["xml_req_pre_test"],
        VerboseName: "xml_req_pre_test"
    },
    {
        Rule: "(?i)(Authorization: .*)|(www-Authenticate: ((Basic)|(Bearer)|(Digest)|(HOBA)|(Mutual)|(Negotiate)|(OAuth)|(SCRAM-SHA-1)|(SCRAM-SHA-256)|(vapid)))",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        Index: 22,
        ExtraTag: ["authorization_header_pre_test"],
        VerboseName: "authorization_header_pre_test"
    },
    {
        Rule: "(GET.*\\w+=\\w+)|(?is)(POST.*\\n\\n.*\\w+=\\w+)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 23,
        ExtraTag: ["sql_Inject_pre_test"],
        VerboseName: "sql_Inject_pre_test"
    },
    {
        Rule: "(GET.*\\w+=\\w+)|(?is)(POST.*\\n\\n.*\\w+=\\w+)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 24,
        ExtraTag: ["xpath_inject_pre_test"],
        VerboseName: "xpath_inject_pre_test"
    },
    {
        Rule: "((POST.*?wsdl)|(GET.*?wsdl)|(xml=)|(\u003c\\?xml )|(\u0026lt;\\?xml))|((POST.*?asmx)|(GET.*?asmx))",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 25,
        ExtraTag: ["xxe_pre_test"],
        VerboseName: "xxe_pre_test"
    },
    {
        Rule: "(file=|path=|url=|lang=|src=|menu=|meta-inf=|web-inf=|filename=|topic=|page=｜_FilePath=|target=｜filepath=)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 26,
        ExtraTag: ["file_download_pre_test"],
        VerboseName: "file_download_pre_test"
    },
    {
        Rule: "((ueditor\\.(config|all)\\.js))",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 27,
        ExtraTag: ["ueditor_pre_test"],
        VerboseName: "ueditor_pre_test"
    },
    {
        Rule: "(kindeditor\\-(all\\-min|all)\\.js)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 28,
        ExtraTag: ["kindeditor_pre_test"],
        VerboseName: "kindeditor_pre_test"
    },
    {
        Rule: "((callback=)|(url=)|(request=)|(redirect_to=)|(jump=)|(to=)|(link=)|(domain=))",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 29,
        ExtraTag: ["url_redirect_pre_test"],
        VerboseName: "url_redirect_pre_test"
    },
    {
        Rule: "(wap=|url=|link=|src=|source=|display=|sourceURl=|imageURL=|domain=)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 30,
        ExtraTag: ["ssrf_pre_test"],
        VerboseName: "ssrf_pre_test"
    },
    {
        Rule: "((GET|POST|http[s]?).*\\.(do|action))",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 31,
        ExtraTag: ["struts2_pre_test"],
        VerboseName: "struts2_pre_test"
    },
    {
        Rule: "((GET|POST|http[s]?).*?\\?.*?(token=|session\\w+=))",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 32,
        ExtraTag: ["session_token_pre_test"],
        VerboseName: "session_token_pre_test"
    },
    {
        Rule: "((AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[a-zA-Z0-9]{16})",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 33,
        ExtraTag: ["amazon_accesskey_id_in_url"],
        VerboseName: "amazon_accesskey_id_in_url"
    },
    {
        Rule: "(Directory listing for|Parent Directory|Index of|folder listing:)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 34,
        ExtraTag: ["dir_list_pre_test"],
        VerboseName: "dir_list_pre_test"
    },
    {
        Rule: "(\u003c.*?Unauthorized)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 35,
        ExtraTag: ["unauthorized_access_pre_test"],
        VerboseName: "unauthorized_access_pre_test"
    },
    {
        Rule: "((\"|')?[u](ser|name|ame|sername)(\"|'|\\s)?(:|=).*?,)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 36,
        ExtraTag: ["usernameleak_in_url"],
        VerboseName: "usernameleak_in_url"
    },
    {
        Rule: "((\"|')?[p](ass|wd|asswd|assword)(\"|'|\\s)?(:|=).*?,)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 37,
        ExtraTag: ["passwordeak_in_url"],
        VerboseName: "passwordeak_in_url"
    },
    {
        Rule: "(((([a-zA-Z0-9._-]+\\.s3|s3)(\\.|\\-)+[a-zA-Z0-9._-]+|[a-zA-Z0-9._-]+\\.s3|s3)\\.amazonaws\\.com)|(s3:\\/\\/[a-zA-Z0-9-\\.\\_]+)|(s3.console.aws.amazon.com\\/s3\\/buckets\\/[a-zA-Z0-9-\\.\\_]+)|(amzn\\.mws\\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})|(ec2-[0-9-]+.cd-[a-z0-9-]+.compute.amazonaws.com)|(us[_-]?east[_-]?1[_-]?elb[_-]?amazonaws[_-]?com))",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 38,
        ExtraTag: ["amazon_aws_url_in_url"],
        VerboseName: "amazon_aws_url_in_url"
    },
    {
        Rule: "(?is)(\u003cform.*type=.*?text.*?\u003c/form.*?\u003e)",
        Color: "green",
        EnableForResponse: true,
        EnableForBody: true,
        Index: 39,
        ExtraTag: ["http_xss_pre_test"],
        VerboseName: "http_xss_pre_test"
    },
    {
        Rule: "(?i)(\u003ctitle\u003e.*?(后台|admin).*?\u003c/title\u003e)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 40,
        ExtraTag: ["backend_http_login_pre_test"],
        VerboseName: "backend_http_login_pre_test"
    },
    {
        Rule: "((ghp|ghu)\\_[a-zA-Z0-9]{36})",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 41,
        ExtraTag: ["github_access_token_in_url"],
        VerboseName: "github_access_token_in_url"
    },
    {
        Rule: "((access=)|(adm=)|(admin=)|(alter=)|(cfg=)|(clone=)|(config=)|(create=)|(dbg=)|(debug=)|(delete=)|(disable=)|(edit=)|(enable=)|(exec=)|(execute=)|(grant=)|(load=)|(make=)|(modify=)|(rename=)|(reset=)|(root=)|(shell=)|(test=)|(toggl=))",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 42,
        ExtraTag: ["debug_logic_parameters_pre_test"],
        VerboseName: "debug_logic_parameters_pre_test"
    },
    {
        Rule: "(jdbc:[a-z:]+://[A-Za-z0-9\\.\\-_:;=/@?,\u0026]+)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 43,
        ExtraTag: ["jdbc_connection_string_in_url"],
        VerboseName: "jdbc_connection_string_in_url"
    },
    {
        Rule: "(ey[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9._-]{10,}|ey[A-Za-z0-9_\\/+-]{10,}\\.[A-Za-z0-9._\\/+-]{10,})",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 44,
        ExtraTag: ["json_web_token_in_url"],
        VerboseName: "json_web_token_in_url"
    },
    {
        Rule: "(?i)(jsonp_[a-z0-9]+)|((_?callback|_cb|_call|_?jsonp_?)=)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 45,
        ExtraTag: ["jsonp_pre_test"],
        VerboseName: "jsonp_pre_test"
    },
    {
        Rule: "([c|C]or[p|P]id|[c|C]orp[s|S]ecret)",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 46,
        ExtraTag: ["wecom_key_in_url"],
        VerboseName: "wecom_key_in_url"
    },
    {
        Rule: "(https://outlook\\.office\\.com/webhook/[a-z0-9@-]+/IncomingWebhook/[a-z0-9-]+/[a-z0-9-]+)",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 47,
        ExtraTag: ["microsoft_teams_webhook_in_url"],
        VerboseName: "microsoft_teams_webhook_in_url"
    },
    {
        Rule: "https://creator\\.zoho\\.com/api/[A-Za-z0-9/\\-_\\.]+\\?authtoken=[A-Za-z0-9]+",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 48,
        ExtraTag: ["zoho_webhook_in_url"],
        VerboseName: "zoho_webhook_in_url"
    },
    {
        Rule: '([a-zA-Z]:\\\\(\\w+\\\\)+|[a-zA-Z]:\\\\\\\\(\\w+\\\\\\\\)+)|(/(bin|dev|home|media|opt|root|sbin|sys|usr|boot|data|etc|lib|mnt|proc|run|srv|tmp|var)/[^\u003c\u003e()[\\],;:\\s"]+/)',
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForBody: true,
        Index: 49,
        ExtraTag: ["windows/linux_file/dir_path_in_url"],
        VerboseName: "windows/linux_file/dir_path_in_url"
    },
    {
        Rule: "(javax\\.faces\\.ViewState)",
        Color: "blue",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 50,
        ExtraTag: ["java_deserialization_pre_test"],
        VerboseName: "java_deserialization_pre_test"
    },
    {
        Rule: "(sonar.{0,50}(?:\"|\\'|`)?[0-9a-f]{40}(?:\"|\\'|`)?)",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 51,
        ExtraTag: ["sonarqube_token_in_url"],
        VerboseName: "sonarqube_token_in_url"
    },
    {
        Rule: "((us(-gov)?|ap|ca|cn|eu|sa)-(central|(north|south)?(east|west)?)-\\d)",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 52,
        ExtraTag: ["amazon_aws_region_pre_test"],
        VerboseName: "amazon_aws_region_pre_test"
    },
    {
        Rule: "(=(https?://.*|https?%3(a|A)%2(f|F)%2(f|F).*))",
        Color: "blue",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 53,
        ExtraTag: ["url_as_a_value_pre_test"],
        VerboseName: "url_as_a_value_pre_test"
    },
    {
        Rule: "(ya29\\.[0-9A-Za-z_-]+)",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 54,
        ExtraTag: ["oauth_access_key_pre_test"],
        VerboseName: "oauth_access_key_pre_test"
    },
    {
        Rule: "(Error report|in your SQL syntax|mysql_fetch_array|mysql_connect()|org.apache.catalina)",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 55,
        ExtraTag: ["app_err_pre_test"],
        VerboseName: "app_err_pre_test"
    }
]

export const MITMRuleExport: React.FC<MITMRuleExportProps> = (props) => {
    const {visible, setVisible} = props
    const [value, setValue] = useState<Uint8Array>(new Uint8Array())
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        ipcRenderer
            .invoke("ExportMITMReplacerRules", {})
            .then((r: {JsonRaw: Uint8Array}) => {
                setValue(r.JsonRaw)
            })
            .catch((e) => {
                failed(`导出失败：${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    }, [visible])
    return (
        <YakitModal
            title='导出配置 JSON'
            visible={visible}
            onCancel={() => setVisible(false)}
            okText='另存为'
            width={960}
            closable={true}
            onOk={() => {
                saveABSFileToOpen("yakit-mitm-replacer-rules-config.json", value)
            }}
            wrapClassName='old-theme-html'
        >
            <Spin spinning={loading}>
                <div style={{height: 466}}>
                    <YakEditor type={"json"} value={new Buffer(value).toString("utf8")} readOnly={true} />
                </div>
            </Spin>
        </YakitModal>
    )
}

export const MITMRuleImport: React.FC<MITMRuleImportProps> = (props) => {
    const {visible, setVisible, onOk} = props
    const [params, setParams] = useState<{JsonRaw: Uint8Array; ReplaceAll: boolean}>({
        JsonRaw: new Uint8Array(),
        ReplaceAll: false
    })
    const [loading, setLoading] = useState(false)
    const onImport = useMemoizedFn(() => {
        if (!new Buffer(params.JsonRaw).toString("utf8")) {
            failed("请填入数据!")
            return
        }
        try {
            let rules = JSON.parse(new Buffer(params.JsonRaw).toString("utf8")).map((item, index) => ({
                ...item,
                Index: index + 1
            }))
            ipcRenderer
                .invoke("ImportMITMReplacerRules", {...params, JsonRaw: Buffer.from(JSON.stringify(rules))})
                .then((e) => {
                    if (onOk) {
                        onOk()
                    } else {
                        setVisible(false)
                    }
                    info("导入成功")
                })
                .catch((e) => {
                    failed("导入失败:" + e)
                })
        } catch (error) {
            failed("导入失败:" + error)
        }
    })
    const onUseDefaultConfig = useMemoizedFn(() => {
        const value = Buffer.from(JSON.stringify(defaultConfig))
        setLoading(true)
        setParams({ReplaceAll: false, JsonRaw: value})
        setTimeout(() => setLoading(false), 300)
    })
    return (
        <YakitModal
            title='从 JSON 中导入'
            subTitle={
                <div className={styles["modal-subTitle"]}>
                    <span>可复制 JSON 代码到方框区域内</span>
                    <YakitButton type='text' onClick={() => onUseDefaultConfig()}>
                        使用默认配置
                    </YakitButton>
                </div>
            }
            visible={visible}
            onCancel={() => setVisible(false)}
            okText='导入'
            width={960}
            closable={true}
            onOk={() => onImport()}
            footerExtra={
                <div className={styles["modal-footer-extra"]}>
                    <span className={styles["modal-footer-extra-text"]}>全部替换</span>
                    <YakitSwitch
                        onChange={(ReplaceAll) => setParams({...params, ReplaceAll})}
                        checked={params.ReplaceAll}
                    />
                </div>
            }
            wrapClassName='old-theme-html'
        >
            <Spin spinning={loading}>
                <div style={{height: 466}}>
                    <YakEditor
                        triggerId={loading}
                        type={"json"}
                        value={new Buffer(params.JsonRaw).toString("utf8")}
                        setValue={(e) => {
                            setParams({...params, JsonRaw: Buffer.from(e)})
                        }}
                    />
                </div>
            </Spin>
        </YakitModal>
    )
}
