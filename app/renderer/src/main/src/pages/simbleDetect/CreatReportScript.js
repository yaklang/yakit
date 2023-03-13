export const CreatReportScript = `
yakit.AutoInitYakit()
loglevel(\`info\`)


createAt  = cli.Int("timestamp", cli.setRequired(true))
reportName = cli.String("report_name")
plugins = cli.Int("plugins",cli.setDefault(10))

if reportName == "" {
    reportName = "报告"
}

reportInstance = report.New()
defer func{
    err := recover()
    if err != nil {
        yakit.Info("扫描报告构建失败：%#v", err)
    }
    id = reportInstance.Save()
    yakit.Report(id)
}

severityToRisks = {}
targetToRisks = {}
riskAll = []
potentialRisks = []
noPotentialRisks = []
weakPassWordRisks = []
noWeakPassWordRisks = []

// 风险漏洞分组
// env.Get("YAK_RUNTIME_ID")
for riskInstance = range risk.YieldRiskByCreateAt(createAt) {
    //println(riskInstance.IP)
    // 按照级别分类 Risk
    // printf("#%v\\n", riskInstance)
    if severityToRisks[riskInstance.Severity] == undefined {
        severityToRisks[riskInstance.Severity] = []
    }
    severityToRisks[riskInstance.Severity] = append(severityToRisks[riskInstance.Severity], riskInstance)

    // 按照 IP 来分类 Risk
    if targetToRisks[riskInstance.IP] == undefined {
        targetToRisks[riskInstance.IP] = []
    }
    targetToRisks[riskInstance.IP] = append(targetToRisks[riskInstance.IP], riskInstance)

    if parseBool(riskInstance.IsPotential) {
        potentialRisks = append(potentialRisks, riskInstance)
    }else{
        noPotentialRisks = append(noPotentialRisks, riskInstance)
    }

    riskAll = append(riskAll, riskInstance)
}


criticalLens = 0
highLens = 0
warningLens = 0
lowLens = 0

for key,value = range severityToRisks {
    if str.Contains(key, "critical") {
        criticalLens = len(value)
    }
    if str.Contains(key, "high") {
        highLens = len(value)
    }
    if str.Contains(key, "warning") {
        warningLens = len(value)
    }
    if str.Contains(key, "low") {
        lowLens = len(value)
    }
}

if criticalLens > 0 {
    reportInstance.Raw({"type": "report-cover", "data": "critical"})
}
if criticalLens == 0 && highLens > 0 {
    reportInstance.Raw({"type": "report-cover", "data": "high"})
}
if criticalLens == 0 && highLens == 0 && warningLens > 0 {
    reportInstance.Raw({"type": "report-cover", "data": "warning"})
}
if criticalLens == 0 && highLens == 0 && warningLens == 0 && lowLens > 0 {
    reportInstance.Raw({"type": "report-cover", "data": "low"})
}
if criticalLens == 0 && highLens == 0 && warningLens == 0 && lowLens == 0 {
    reportInstance.Raw({"type": "report-cover", "data": "security"})
}

// 端口开放情况
portsLine = []
portChan := db.QueryPortsByCreateAt(createAt)~
for port :=range portChan{
    // println(sprintf("%s:%d",port.Host,port.Port))
     portsLine = append(portsLine, [
        port.Host,
        port.Port,
        port.ServiceType,
        port.HtmlTitle,
    ])
}


reportInstance.Title(reportName)

reportInstance.Markdown(\`# 1、项目概述

## 1.1 测试目的

本次安全测试是在公司授权下进行的，目的是分析网站系统安全现状，检测应用系统的漏洞和安全问题，从而全面了解和掌握应用系统的信息安全威胁和风险，为应用系统开展安全调优及加固建设提供依据，并指导实施调优及加固工作，具体的目标包括：帮助客户理解应用系统当前的安全状况，发现授权目标系统的安全漏洞；对所检测出的漏洞作出具体分析和加固建议。

## 1.2 安全测试原则

本次安全测试工作中严格遵循以下原则：

### 1.2.1 标准性原则

测试方案的设计和实施应依据行业、国家、国际的相关标准进行；

主要参考标准如下：

1. GB/T 20270-2006 信息安全技术 网络基础安全技术要求；
1. GB/T 20271-2006 信息安全技术 信息系统通用安全技术要求；
1. GB/T 20984-2007 信息安全技术 信息安全风险评估规范；
1. ISO 27001:2013 信息技术 安全技术 信息安全管理体系要求；
1. ISO 27002:2013 信息技术 安全技术 信息安全控制实用细则；
1. ISO 13335:2001信息技术 信息安全管理指南；
1. Cobit5:2012信息系统和技术控制目标；
1. IATF 16949:2016 信息保障技术框架。

### 1.2.2 规范性原则

服务提供商的工作过程和所有文档，应具有很好的规范性，以便于项目的跟踪和控制；

### 1.2.3 最小影响原则

测试工作应尽量避免影响系统和网络的正常运行，不对正常运行的系统和网络构成破坏和造成停产；

### 1.2.4 保密原则

测试的过程和结果应严格保密，不能泄露测试项目所涉及的任何打印和电子形式的有效数据和文件。

# 2、测试方法

## 2.1 概述

安全测试工作主要是对于已经采取了安全防护措施（安全产品、安全服务）或者即将采用安全防护措施的用户而言，明确网络当前的安全现状并对下一步的安全建设有重大的指导意义。渗透测试服务用于验证在当前的安全防护措施下网络、系统抵抗攻击者攻击的能力。

安全测试目的是发现网络、系统和应用层面存在的安全漏洞和隐患，并提出相应的整改建议。

## 2.2 风险等级说明

|  风险等级   | 等级划分依据  |
|  ----  | ----  |
| <font color="#da4943">严重</font>  | 1) 直接获取核心系统服务器权限的漏洞。包括但不仅限于核心系统服务器的任意命令执行、上传获取 WebShell、SQL 注入获取系统权限、远程代码执行漏洞等；<br/> 2) 严重的敏感信息泄露。包括但不仅限于重要数据的 SQL 注入（例如重要的账号密码）、包含敏感信息的源文件压缩包泄露。 |
| <font color="#d83931">高危</font>  | 1) 高风险的信息泄露，包括但不限于可以获取一般数据的 SQL 注入漏洞、源代码泄露以及任意文件读取和下载漏洞等；<br/> 2) 越权访问，包括但不限于绕过验证直接访问管理后台、后台登录弱口令、以及其它服务的弱口令等。 |
| <font color="#dc9b02">中危</font>  | 1) 需交互才能影响用户的漏洞。包括但不限于能够造成切实危害的存储型 XSS，重要的敏感操作 CSRF；<br/> 2) 普通信息泄露。包括但不仅限于获取用户敏感信息等；<br/> 3) 普通越权操作。包括但不仅限于越权查看非核心的信息、记录等；<br/> 4）普通逻辑设计缺陷。包括但不仅限于短信验证绕过、邮件验证绕过。 |
| <font color="#43ab42">低危</font>  | 1) 有一定价值的轻微信息泄露。比如 phpinfo、测试数据泄露等；<br/> 2) 逻辑设计缺陷。包括但不仅限于图形验证码绕过；<br/> 3）有一定轻微影响的反射型 XSS、URL 跳转、非重要的敏感操作 CSRF 漏洞等。 |

# 3、测试结果概述

## 3.1 总体安全现状

以下是本次测试的总体安全现状:
\`)

// 检测端口扫描结果
// targetRawLen = len(str.ParseStringToHosts(targetRaw))
// redlinePortsLen = len(str.ParseStringToPorts(ports)) + len(str.ParseStringToPorts(ports))
reportInstance.Markdown(sprintf("共扫描端口：【%v】个，涉及主机：【%v】个，每台主机涉及端口：【%v】个", 2000, 2, 1000))

// 输出漏洞图相关的内容
total := len(riskAll)
reportInstance.Markdown(sprintf("本次测试风险漏洞共【%v】个，其中<font color='#da4943'>严重</font>漏洞有【%v】个，<font color='#d83931'>高危</font>漏洞有【%v】个，<font color='#dc9b02'>中危</font>漏洞有【%v】个，<font color='#43ab42'>低危</font>漏洞有【%v】个，附录含有漏洞详情，如有需求请及时修复。", total, criticalLens, highLens, warningLens, lowLens))


reportInstance.Markdown("#### 漏洞汇总")
// reportInstance.BarGraphHorizontal(v2 /*type: ...any*/)
reportInstance.Raw({"type": "bar-graph", "data": [{"name": "严重漏洞", "value": criticalLens}, {"name": "高危漏洞", "value": highLens},  {"name": "中危漏洞", "value": warningLens}, {"name": "低危漏洞", "value": lowLens}], "color": ["#f70208","#f9c003","#2ab150","#5c9cd5"]})


// 端口扫描统计展示
reportInstance.Markdown("## 3.2 端口扫描统计")
reportInstance.Table(["地址", "端口", "指纹", "网站标题"], portsLine...)

// 插件扫描状态表格展示
reportInstance.Markdown("## 3.3 插件扫描状态统计")
reportInstance.Markdown(sprintf("涉及扫描插件：%v个", plugins))



// 风险统计展示
reportInstance.Markdown("## 3.4 风险统计")
reportInstance.Markdown("### 3.4.1 漏洞统计列表")



if len(noPotentialRisks) == 0 {
    reportInstance.Markdown("无漏洞信息")
}else{
    _line = []
    for index,info = range noPotentialRisks {
        level = "-"
        if str.Contains(info.Severity, "critical") { level = "严重" }
        if str.Contains(info.Severity, "high") { level = "高危" }
        if str.Contains(info.Severity, "warning") { level = "中危" }
        if str.Contains(info.Severity, "low") { level = "低危"}

        _line = append(_line, [
            index + 1,
            info.IP,
            info.TitleVerbose,
            level,
        ])
    }
    reportInstance.Table(["序号", "网站地址", "漏洞情况", "威胁风险"], _line...)
}

showPotentialLine = []
for _, riskIns := range potentialRisks {
    level = "-"
    if str.Contains(riskIns.Severity, "critical") { level = "严重" }
    if str.Contains(riskIns.Severity, "high") { level = "高危" }
    if str.Contains(riskIns.Severity, "warning") { level = "中危" }
    if str.Contains(riskIns.Severity, "low") { level = "低危"}

    if len(showPotentialLine) < 10 {
        showPotentialLine = append(showPotentialLine, [
            riskIns.TitleVerbose,
            riskIns.IP,
            riskIns.RiskTypeVerbose,
            level,
        ])
    }
    if len(showPotentialLine) == 10 {
        showPotentialLine = append(showPotentialLine, [
            "更多风险请在附录中查看",
            "",
            "",
            "",
        ])
    }
}
if len(potentialRisks) != 0 {
    reportInstance.Markdown(sprintf("### 3.4.2 合规检查风险列表"))
    reportInstance.Markdown(\`合规检查是根据多年的经验， 通过扫描检查出危险系统及组件的版本。合规检查风险不是会造成实际损失的漏洞，可跟技术人员评估后，决定是否升级系统版本。\`)
    reportInstance.Table(["漏洞标题", "地址", "漏洞类型", "漏洞级别"], showPotentialLine...)
}


showWeakPassWordLine = []
for _, riskIns := range weakPassWordRisks {
    level = "-"
    if str.Contains(riskIns.Severity, "critical") { level = "严重" }
    if str.Contains(riskIns.Severity, "high") { level = "高危" }
    if str.Contains(riskIns.Severity, "warning") { level = "中危" }
    if str.Contains(riskIns.Severity, "low") { level = "低危"}

    if len(showWeakPassWordLine) < 10 {
        showWeakPassWordLine = append(showWeakPassWordLine, [
            riskIns.TitleVerbose,
            riskIns.IP,
            riskIns.RiskTypeVerbose,
            level,
        ])
    }
    if len(showWeakPassWordLine) == 10 {
        showWeakPassWordLine = append(showWeakPassWordLine, [
            "更多风险请在附录中查看",
            "",
            "",
            "",
        ])
    }
}

if len(weakPassWordRisks) != 0 {
    reportInstance.Markdown(sprintf("### 3.4.3 弱口令风险列表"))
    reportInstance.Markdown(\`合规检查是根据多年的经验， 通过扫描检查出危险系统及组件的版本。合规检查风险不是会造成实际损失的漏洞，可跟技术人员评估后，决定是否升级系统版本。\`)
    reportInstance.Table(["弱口令类型", "地址", "用户名", "密码"], showPotentialLine...)
}


// 后续整改建议
reportInstance.Markdown("# 4、后续整改建议")
if criticalLens > 0 || highLens > 0 {
    reportInstance.Markdown(sprintf(\`本次测试风险漏洞共%v个，其中<font color='#da4943'>严重</font>漏洞有%v个，<font color='#d83931'>高危</font>漏洞有%v个，<font color='#dc9b02'>中危</font>漏洞有%v个，<font color='#43ab42'>低危</font>漏洞有%v个。存在的潜在风险较大，请尽快部署安全防护策略和安全防护技术手段，落实安全评估和日常安全扫描，做到安全漏洞及时发现及时修复，切实提升系统安全防护能力。\`, total, criticalLens, highLens, warningLens, lowLens))
}
if criticalLens == 0 && highLens == 0 && warningLens > 0 {
    reportInstance.Markdown(sprintf(\`本次测试风险漏洞共%v个，其中<font color='#da4943'>严重</font>漏洞有%v个，<font color='#d83931'>高危</font>漏洞有%v个，<font color='#dc9b02'>中危</font>漏洞有%v个，<font color='#43ab42'>低危</font>漏洞有%v个。存在潜在风险，请尽快部署安全防护策略和安全防护技术手段，落实安全评估和日常安全扫描，做到安全漏洞及时发现及时修复，切实提升系统安全防护能力。\`, total, criticalLens, highLens, warningLens, lowLens))
    }
if criticalLens == 0 && highLens == 0 && warningLens == 0 {
    reportInstance.Markdown(sprintf(\`本次测试风险漏洞共%v个，其中<font color='#da4943'>严重</font>漏洞有%v个，<font color='#d83931'>高危</font>漏洞有%v个，<font color='#dc9b02'>中危</font>漏洞有%v个，<font color='#43ab42'>低危</font>漏洞有%v个。整体安全防护良好。\`, total, criticalLens, highLens, warningLens, lowLens))
}

reportInstance.Markdown("# 附录：")

// 漏洞等级分类数组
criticalRisks = []
highRisks = []
warningRisks = []
lowRisks = []
// 合规检查等级分类数组
criticalPotentialRisks = []
highPotentialRisks = []
warningPotentialRisks = []
lowPotentialRisks = []

for target,risks = range targetToRisks {
    if target == "" {
        continue
    }

    for _,riskIns := range risks {
        if str.Contains(riskIns.Severity, "critical") {
            if parseBool(riskIns.IsPotential) {
                criticalPotentialRisks = append(criticalPotentialRisks, riskIns)
            } else {
                criticalRisks = append(criticalRisks, riskIns)
            }
        }
        if str.Contains(riskIns.Severity, "high") {
            if parseBool(riskIns.IsPotential) {
                highPotentialRisks = append(highPotentialRisks, riskIns)
            } else {
                highRisks = append(highRisks, riskIns)
            }
        }
        if str.Contains(riskIns.Severity, "warning") {
            if parseBool(riskIns.IsPotential) {
                warningPotentialRisks = append(warningPotentialRisks, riskIns)
            } else {
                warningRisks = append(warningRisks, riskIns)
            }
        }
        if str.Contains(riskIns.Severity, "low") {
            if parseBool(riskIns.IsPotential) {
                lowPotentialRisks = append(lowPotentialRisks, riskIns)
            } else {
                lowRisks = append(lowRisks, riskIns)
            }
        }
    }
}

func showReport(risks) {
    for _, riskIns := range risks {
            reportInstance.Markdown(sprintf(\` #### %v

漏洞级别：%v

漏洞类型：%v
\` , riskIns.TitleVerbose, riskIns.Severity, riskIns.RiskTypeVerbose))

            payload, _ = codec.StrconvUnquote(riskIns.Payload)
            if payload == "" {
                payload = riskIns.Payload
            }
            if payload != "" {
                reportInstance.Markdown(sprintf("Payload: \\n\\n%v", payload))
            }

            request, _ = codec.StrconvUnquote(riskIns.QuotedRequest)
            response, _ = codec.StrconvUnquote(riskIns.QuotedResponse)

            if len(request) > 0 {
                reportInstance.Markdown("##### HTTP Request")
                reportInstance.Code(request)
            }

            if len(response) > 0 {
                reportInstance.Markdown("##### HTTP Response")
                reportInstance.Code(response)
            }
        }
}

reportInstance.Markdown("## 漏洞详情与复现依据")

if len(criticalRisks) > 0 {
    reportInstance.Markdown(sprintf("### 严重漏洞详情"))
    showReport(criticalRisks)
}
if len(highRisks) > 0 {
    reportInstance.Markdown(sprintf("### 高危漏洞详情"))
    showReport(highRisks)
}
if len(warningRisks) > 0 {
    reportInstance.Markdown(sprintf("### 中危漏洞详情"))
    showReport(warningRisks)
}
if len(lowRisks) > 0 {
    reportInstance.Markdown(sprintf("### 低危漏洞详情"))
    showReport(lowRisks)
}
if len(criticalRisks)== 0 && len(highRisks)== 0 && len(warningRisks)== 0 && len(lowRisks)== 0 {
    reportInstance.Markdown(sprintf("暂无漏洞"))
}

reportInstance.Markdown("## 合规检查风险详情")

if len(criticalPotentialRisks) > 0 {
    reportInstance.Markdown(sprintf("### 严重漏洞详情"))
    showReport(criticalPotentialRisks)
}
if len(highPotentialRisks) > 0 {
    reportInstance.Markdown(sprintf("### 高危漏洞详情"))
    showReport(highPotentialRisks)
}
if len(warningPotentialRisks) > 0 {
    reportInstance.Markdown(sprintf("### 中危漏洞详情"))
    showReport(warningPotentialRisks)
}
if len(lowPotentialRisks) > 0 {
    reportInstance.Markdown(sprintf("### 低危漏洞详情"))
    showReport(lowPotentialRisks)
}
if len(criticalPotentialRisks)== 0 && len(highPotentialRisks)== 0 && len(warningPotentialRisks)== 0 && len(lowPotentialRisks)== 0 {
    reportInstance.Markdown(sprintf("暂无风险"))
}
`