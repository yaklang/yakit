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
        ExtraTag: ["登陆点"],
        VerboseName: "登陆点"
    },
    {
        Rule: "(?is)(\u003cform.*type=.*?text.*?type=.*?password.*?onclick=.*?\u003c/form.*?\u003e)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 6,
        ExtraTag: ["登陆（验证码）"],
        VerboseName: "登陆（验证码）"
    },
    {
        Rule: "(?is)\u003cform.*enctype=.*?multipart/form-data.*?type=.*?file.*?\u003c/form\u003e",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 7,
        ExtraTag: ["文件上传点"],
        VerboseName: "文件上传点"
    },
    {
        Rule: "(file=|path=|url=|lang=|src=|menu=|meta-inf=|web-inf=|filename=|topic=|page=｜_FilePath=|target=)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 8,
        ExtraTag: ["文件包含参数"],
        VerboseName: "文件包含参数"
    },
    {
        Rule: "((cmd=)|(exec=)|(command=)|(execute=)|(ping=)|(query=)|(jump=)|(code=)|(reg=)|(do=)|(func=)|(arg=)|(option=)|(load=)|(process=)|(step=)|(read=)|(function=)|(feature=)|(exe=)|(module=)|(payload=)|(run=)|(daemon=)|(upload=)|(dir=)|(download=)|(log=)|(ip=)|(cli=))|(ipaddress=)|(txt=)|(case=)|(count=)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 9,
        ExtraTag: ["命令注入参数"],
        VerboseName: "命令注入参数"
    },
    {
        Rule: '\\b(([^\u003c\u003e()[\\]\\\\.,;:\\s@"]+(\\.[^\u003c\u003e()[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+(cn|com|edu|gov|int|mil|net|org|biz|info|pro|name|museum|coop|aero|xxx|idv)))\\b',
        Color: "green",
        EnableForResponse: true,
        EnableForBody: true,
        Index: 10,
        ExtraTag: ["email泄漏"],
        VerboseName: "email泄漏"
    },
    {
        Rule: "\\b(?:(?:\\+|00)86)?1(?:(?:3[\\d])|(?:4[5-79])|(?:5[0-35-9])|(?:6[5-7])|(?:7[0-8])|(?:8[\\d])|(?:9[189]))\\d{8}\\b",
        Color: "green",
        EnableForResponse: true,
        EnableForBody: true,
        Index: 11,
        ExtraTag: ["手机号泄漏"],
        VerboseName: "手机号泄漏"
    },
    {
        Rule: "((\\[client\\])|\\[(mysql\\])|(\\[mysqld\\]))",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 12,
        ExtraTag: ["MySQL配置"],
        VerboseName: "MySQL配置"
    },
    {
        Rule: "\\b[1-9]\\d{5}(?:18|19|20)\\d{2}(?:0[1-9]|10|11|12)(?:0[1-9]|[1-2]\\d|30|31)\\d{3}[\\dXx]\\b",
        Color: "green",
        EnableForResponse: true,
        EnableForBody: true,
        Index: 13,
        ExtraTag: ["身份证"],
        VerboseName: "身份证"
    },
    {
        Rule: "[-]+BEGIN [^\\s]+ PRIVATE KEY[-]",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForBody: true,
        Index: 14,
        ExtraTag: ["RSA私钥"],
        VerboseName: "RSA私钥"
    },
    {
        Rule: "([A|a]ccess[K|k]ey[S|s]ecret)|([A|a]ccess[K|k]ey[I|i][d|D])|([Aa](ccess|CCESS)_?[Kk](ey|EY))|([Aa](ccess|CCESS)_?[sS](ecret|ECRET))|(([Aa](ccess|CCESS)_?(id|ID|Id)))|([Ss](ecret|ECRET)_?[Kk](ey|EY))",
        Color: "yellow",
        EnableForResponse: true,
        EnableForBody: true,
        Index: 15,
        ExtraTag: ["OSS Key"],
        VerboseName: "OSS Key"
    },
    {
        Rule: "[\\w-.]+\\.oss\\.aliyuncs\\.com",
        Color: "red",
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 16,
        ExtraTag: ["AliyunOSS"],
        VerboseName: "AliyunOSS"
    },
    {
        Rule: "\\b((127\\.0\\.0\\.1)|(localhost)|(10\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})|(172\\.((1[6-9])|(2\\d)|(3[01]))\\.\\d{1,3}\\.\\d{1,3})|(192\\.168\\.\\d{1,3}\\.\\d{1,3}))\\b",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 17,
        ExtraTag: ["IP地址"],
        VerboseName: "IP地址"
    },
    {
        Rule: "(=deleteMe|rememberMe=)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        Index: 18,
        ExtraTag: ["Shiro"],
        VerboseName: "Shiro"
    },
    {
        Rule: "(?is)^{.*}$",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForBody: true,
        Index: 19,
        ExtraTag: ["JSON传输"],
        VerboseName: "JSON传输"
    },
    {
        Rule: "(?is)^\u003c\\?xml.*\u003csoap:Body\u003e",
        Color: "green",
        EnableForRequest: true,
        EnableForBody: true,
        Index: 20,
        ExtraTag: ["SOAP请求"],
        VerboseName: "SOAP请求"
    },
    {
        Rule: "(?is)^\u003c\\?xml.*\u003e$",
        Color: "green",
        EnableForRequest: true,
        EnableForBody: true,
        Index: 21,
        ExtraTag: ["XML请求"],
        VerboseName: "XML请求"
    },
    {
        Rule: "(?i)(Authorization: .*)|(www-Authenticate: ((Basic)|(Bearer)|(Digest)|(HOBA)|(Mutual)|(Negotiate)|(OAuth)|(SCRAM-SHA-1)|(SCRAM-SHA-256)|(vapid)))",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        Index: 22,
        ExtraTag: ["HTTP认证头"],
        VerboseName: "HTTP认证头"
    },
    {
        Rule: "(GET.*\\w+=\\w+)|(?is)(POST.*\\n\\n.*\\w+=\\w+)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 23,
        ExtraTag: ["SQL注入测试点"],
        VerboseName: "SQL注入测试点"
    },
    {
        Rule: "(GET.*\\w+=\\w+)|(?is)(POST.*\\n\\n.*\\w+=\\w+)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 24,
        ExtraTag: ["XPath注入测试点"],
        VerboseName: "XPath注入测试点"
    },
    {
        Rule: "((POST.*?wsdl)|(GET.*?wsdl)|(xml=)|(\u003c\\?xml )|(\u0026lt;\\?xml))|((POST.*?asmx)|(GET.*?asmx))",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 25,
        ExtraTag: ["XXE测试点"],
        VerboseName: "XXE测试点"
    },
    {
        Rule: "(file=|path=|url=|lang=|src=|menu=|meta-inf=|web-inf=|filename=|topic=|page=｜_FilePath=|target=｜filepath=)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 26,
        ExtraTag: ["文件下载参数"],
        VerboseName: "文件下载参数"
    },
    {
        Rule: "((ueditor\\.(config|all)\\.js))",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 27,
        ExtraTag: ["UEditor测试点"],
        VerboseName: "UEditor测试点"
    },
    {
        Rule: "(kindeditor\\-(all\\-min|all)\\.js)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 28,
        ExtraTag: ["KindEditor测试点"],
        VerboseName: "KindEditor测试点"
    },
    {
        Rule: "((callback=)|(url=)|(request=)|(redirect_to=)|(jump=)|(to=)|(link=)|(domain=))",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 29,
        ExtraTag: ["Url重定向参数"],
        VerboseName: "Url重定向参数"
    },
    {
        Rule: "(wap=|url=|link=|src=|source=|display=|sourceURl=|imageURL=|domain=)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 30,
        ExtraTag: ["SSRF测试参数"],
        VerboseName: "SSRF测试参数"
    },
    {
        Rule: "((GET|POST|http[s]?).*\\.(do|action))[^a-zA-Z]",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 31,
        ExtraTag: ["Struts2测试点"],
        VerboseName: "Struts2测试点"
    },
    {
        Rule: "((GET|POST|http[s]?).*?\\?.*?(token=|session\\w+=))",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 32,
        ExtraTag: ["Session/Token测试点"],
        VerboseName: "Session/Token测试点"
    },
    {
        Rule: "((AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[a-zA-Z0-9]{16})",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 33,
        ExtraTag: ["Amazon AK"],
        VerboseName: "Amazon AK"
    },
    {
        Rule: "(Directory listing for|Parent Directory|Index of|folder listing:)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 34,
        ExtraTag: ["目录枚举点"],
        VerboseName: "目录枚举点"
    },
    {
        Rule: "(\u003c.*?Unauthorized)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 35,
        ExtraTag: ["非授权页面点"],
        VerboseName: "非授权页面点"
    },
    {
        Rule: "((\"|')?[u](ser|name|ame|sername)(\"|'|\\s)?(:|=).*?,)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 36,
        ExtraTag: ["用户名泄漏点"],
        VerboseName: "用户名泄漏点"
    },
    {
        Rule: "((\"|')?[p](ass|wd|asswd|assword)(\"|'|\\s)?(:|=).*?,)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 37,
        ExtraTag: ["密码泄漏点"],
        VerboseName: "密码泄漏点"
    },
    {
        Rule: "(((([a-zA-Z0-9._-]+\\.s3|s3)(\\.|\\-)+[a-zA-Z0-9._-]+|[a-zA-Z0-9._-]+\\.s3|s3)\\.amazonaws\\.com)|(s3:\\/\\/[a-zA-Z0-9-\\.\\_]+)|(s3.console.aws.amazon.com\\/s3\\/buckets\\/[a-zA-Z0-9-\\.\\_]+)|(amzn\\.mws\\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})|(ec2-[0-9-]+.cd-[a-z0-9-]+.compute.amazonaws.com)|(us[_-]?east[_-]?1[_-]?elb[_-]?amazonaws[_-]?com))",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 38,
        ExtraTag: ["Amazon AWS URL"],
        VerboseName: "Amazon AWS URL"
    },
    {
        Rule: "(?is)(\u003cform.*type=.*?text.*?\u003c/form.*?\u003e)",
        Color: "green",
        EnableForResponse: true,
        EnableForBody: true,
        Index: 39,
        ExtraTag: ["HTTP XSS测试点"],
        VerboseName: "HTTP XSS测试点"
    },
    {
        Rule: "(?i)(\u003ctitle\u003e.*?(后台|admin).*?\u003c/title\u003e)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 40,
        ExtraTag: ["后台登陆"],
        VerboseName: "后台登陆"
    },
    {
        Rule: "((ghp|ghu)\\_[a-zA-Z0-9]{36})",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 41,
        ExtraTag: ["GithubAccessToken"],
        VerboseName: "GithubAccessToken"
    },
    {
        Rule: "((access=)|(adm=)|(admin=)|(alter=)|(cfg=)|(clone=)|(config=)|(create=)|(dbg=)|(debug=)|(delete=)|(disable=)|(edit=)|(enable=)|(exec=)|(execute=)|(grant=)|(load=)|(make=)|(modify=)|(rename=)|(reset=)|(root=)|(shell=)|(test=)|(toggl=))",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 42,
        ExtraTag: ["调试参数"],
        VerboseName: "调试参数"
    },
    {
        Rule: "(jdbc:[a-z:]+://[A-Za-z0-9\\.\\-_:;=/@?,\u0026]+)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 43,
        ExtraTag: ["JDBC连接参数"],
        VerboseName: "JDBC连接参数"
    },
    {
        Rule: "(ey[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9._-]{10,}|ey[A-Za-z0-9_\\/+-]{10,}\\.[A-Za-z0-9._\\/+-]{10,})",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 44,
        ExtraTag: ["JWT 测试点"],
        VerboseName: "JWT 测试点"
    },
    {
        Rule: "(?i)(jsonp_[a-z0-9]+)|((_?callback|_cb|_call|_?jsonp_?)=)",
        Color: "green",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 45,
        ExtraTag: ["JSONP 测试点"],
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
        ExtraTag: ["Wecom Key(Secret)"],
        VerboseName: "Wecom Key(Secret)"
    },
    {
        Rule: "(https://outlook\\.office\\.com/webhook/[a-z0-9@-]+/IncomingWebhook/[a-z0-9-]+/[a-z0-9-]+)",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 47,
        ExtraTag: ["MicrosoftTeams Webhook"],
        VerboseName: "MicrosoftTeams Webhook"
    },
    {
        Rule: "https://creator\\.zoho\\.com/api/[A-Za-z0-9/\\-_\\.]+\\?authtoken=[A-Za-z0-9]+",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 48,
        ExtraTag: ["Zoho Webhook"],
        VerboseName: "Zoho Webhook"
    },
    {
        Rule: '([a-zA-Z]:\\\\(\\w+\\\\)+|[a-zA-Z]:\\\\\\\\(\\w+\\\\\\\\)+)|(/(bin|dev|home|media|opt|root|sbin|sys|usr|boot|data|etc|lib|mnt|proc|run|srv|tmp|var)/[^\u003c\u003e()[\\],;:\\s"]+/)',
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForBody: true,
        Index: 49,
        ExtraTag: ["操作系统路径"],
        VerboseName: "操作系统路径"
    },
    {
        Rule: "(javax\\.faces\\.ViewState)",
        Color: "blue",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 50,
        ExtraTag: ["Java反序列化测试点"],
        VerboseName: "Java反序列化测试点"
    },
    {
        Rule: "(sonar.{0,50}(?:\"|\\'|`)?[0-9a-f]{40}(?:\"|\\'|`)?)",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 51,
        ExtraTag: ["Sonarqube Token"],
        VerboseName: "Sonarqube Token"
    },
    {
        Rule: "((us(-gov)?|ap|ca|cn|eu|sa)-(central|(north|south)?(east|west)?)-\\d)",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 52,
        ExtraTag: ["Amazon AWS Region泄漏"],
        VerboseName: "Amazon AWS Region泄漏"
    },
    {
        Rule: "(=(https?://.*|https?%3(a|A)%2(f|F)%2(f|F).*))",
        Color: "blue",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 53,
        ExtraTag: ["URL作为参数"],
        VerboseName: "URL作为参数"
    },
    {
        Rule: "(ya29\\.[0-9A-Za-z_-]+)",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 54,
        ExtraTag: ["Oauth Access Key"],
        VerboseName: "Oauth Access Key"
    },
    {
        Rule: "(Error report|in your SQL syntax|mysql_fetch_array|mysql_connect()|org.apache.catalina)",
        Color: "red",
        EnableForRequest: true,
        EnableForResponse: true,
        EnableForHeader: true,
        EnableForBody: true,
        Index: 55,
        ExtraTag: ["网站出错"],
        VerboseName: "网站出错"
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
        const value = Buffer.from(JSON.stringify(defaultConfig.map((item) => ({...item, NoReplace: true}))))
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
