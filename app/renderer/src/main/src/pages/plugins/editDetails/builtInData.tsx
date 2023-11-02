import {PluginParamDataProps} from "../pluginsType"

/**
 * @name 插件数据修改时-内置的tags列表数据
 */
export const BuiltInTags: string[] = [
    "IOT",
    "主流CMS",
    "中间件",
    "代码研发",
    "功能类型",
    "应用类型",
    "网络设备",
    "大数据平台",
    "数据库服务",
    "虚拟化服务",
    "邮件服务器",
    "集权管控类",
    "主流应用框架",
    "协同办公套件",
    "通用漏洞检测",
    "主流第三方服务",
    "信息收集",
    "数据处理",
    "用户名密码爆破",
    "指纹识别",
    "目录爆破"
]

/**
 * @name 插件类型为port-scan(端口扫描)时，内置的两个参数配置信息
 */
export const PortScanPluginParams: Record<string, PluginParamDataProps> = {
    target: {
        Field: "target",
        FieldVerbose: "扫描的目标",
        TypeVerbose: "string",
        Required: true,
        DefaultValue: "",
        Help: ""
    },
    ports: {
        Field: "ports",
        FieldVerbose: "端口",
        TypeVerbose: "string",
        Required: false,
        DefaultValue: "80",
        Help: ""
    }
}
