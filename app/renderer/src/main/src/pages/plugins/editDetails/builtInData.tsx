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
    "暴力破解",
    "指纹识别",
    "目录爆破",
    "加解密工具",
    "威胁情报",
    "空间引擎",
    "AI工具"
]

/** @name Risk信息风险等级对应Tag组件颜色 */
export const RiskLevelToTag: Record<string, {color: string; name: string}> = {
    critical: {color: "serious", name: "严重"},
    high: {color: "danger", name: "高危"},
    warning: {color: "info", name: "中危"},
    low: {color: "yellow", name: "低危"},
    info: {color: "success", name: "信息"}
}
