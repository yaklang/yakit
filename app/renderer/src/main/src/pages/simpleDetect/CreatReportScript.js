export const CreatReportScript = `
yakit.AutoInitYakit()
loglevel(\`info\`)


// createAt  = cli.Int("timestamp", cli.setRequired(true))
taskName  = cli.String("task_name", cli.setRequired(true))
runtimeID = cli.String("runtime_id", cli.setRequired(true))
hostTotal = cli.Int("host_total", cli.setRequired(true))
portTotal = cli.Int("port_total", cli.setDefault(0))
pingAliveHostTotal = cli.Int("ping_alive_host_total", cli.setDefault(0))
reportName = cli.String("report_name")
plugins = cli.Int("plugins",cli.setDefault(10))

if reportName == "" {
    reportName = "报告"
}

reportInstance = report.New()
reportInstance.From("simple-detect")
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
for riskInstance = range risk.YieldRiskByRuntimeId(runtimeID) {
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
    
    if riskInstance.RiskTypeVerbose == "弱口令" {
        weakPassWordRisks = append(weakPassWordRisks, riskInstance)
    } else {
        noWeakPassWordRisks = append(noWeakPassWordRisks, riskInstance)
    }

    riskAll = append(riskAll, riskInstance)
}


criticalLens = 0
highLens = 0
warningLens = 0
lowLens = 0

for key, value = range severityToRisks {
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
aliveHostCountList = []
openPortCount = 0

portChan := db.QueryPortsByTaskName(taskName)~
for port :=range portChan{
    openPortCount +=1
    if port.Host not in aliveHostCountList {
        aliveHostCountList = append(aliveHostCountList,port.Host)
    }
    // println(sprintf("%s:%d",port.Host,port.Port))
     /*portsLine = append(portsLine, [
        port.Host,
        port.Port,
        port.ServiceType,
        port.HtmlTitle,
    ])*/
    portsLine = append(
        portsLine,
        [port.Host, port.Port, port.Proto, port.ServiceType, port.HtmlTitle],
    )
}


aliveHostCount = len(aliveHostCountList)

if pingAliveHostTotal > 0{
    aliveHostCount = pingAliveHostTotal
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
\`)

// 检测端口扫描结果
// targetRawLen = len(str.ParseStringToHosts(targetRaw))
// redlinePortsLen = len(str.ParseStringToPorts(ports)) + len(str.ParseStringToPorts(ports))
totalTasks = hostTotal * portTotal

riskGrade = "低危"
if criticalLens > 0{
    riskGrade = "超危"
} else if highLens > 0{
    riskGrade = "高危"
} else if warningLens > 0{
     riskGrade = "中危"
}

reportInstance.Markdown(sprintf(\`
本次测试的总体安全现状如下：
- 风险等级：%v
- 扫描端口数：%v个
- 开放端口数：%v个
- 存活主机数：%v个
- 扫描主机数：%v个
- 每台主机涉及端口数：%v个

\`, riskGrade, totalTasks,openPortCount,aliveHostCount, hostTotal, portTotal))
// 输出漏洞图相关的内容
total := criticalLens + highLens + warningLens + lowLens
reportInstance.Markdown(sprintf(\`
本次测试发现以下漏洞与合规风险：

- 总数：**%v**个
- 严重：<span style="color:#8B0000;font-weight:bold">%v个</span>
- 高危：<span style="color:#FF4500;font-weight:bold">%v个</span>
- 中危：<span style="color:#FFA500;font-weight:bold">%v个</span>
- 低危：<span style="color:#008000;font-weight:bold">%v个</span>

附录含有漏洞详情，如有需求请及时修复。

\`, total, criticalLens, highLens, warningLens, lowLens))


// reportInstance.Markdown("#### 漏洞汇总")
// reportInstance.Raw({"type": "bar-graph", "data": [{"name": "严重漏洞", "value": criticalLens}, {"name": "高危漏洞", "value": highLens},  {"name": "中危漏洞", "value": warningLens}, {"name": "低危漏洞", "value": lowLens}], "color": ["#f70208","#f9c003","#2ab150","#5c9cd5"]})
reportInstance.Raw({"type": "bar-graph", "title": "漏洞与合规风险汇总", "data": [{"name": "严重漏洞", "value": criticalLens}, {"name": "高危漏洞", "value": highLens}, {"name": "中危漏洞", "value": warningLens}, {"name": "低危漏洞", "value": lowLens}], "color": ["#f70208", "#f9c003", "#2ab150", "#5c9cd5"]})

// IP 漏洞信息统计

ipRisksStr = []

// 漏洞等级分类数组
criticalRisks = []
highRisks = []
warningRisks = []
lowRisks = []
secureRisks = []
// 合规检查等级分类数组
criticalPotentialRisks = []
highPotentialRisks = []
warningPotentialRisks = []
lowPotentialRisks = []
secureCountScaleRisks = []

// 存活资产统计
criticalCountScale = 0
highCountScale = 0
warningCountScale = 0
lowCountScale = 0
secureCountScale = 0

for target,risks = range targetToRisks {
    if target == "" {
        continue
    }
    criticalCount = 0
    highCount = 0
    warningCount = 0
    lowCount = 0
    secureCount = 0
    riskLevel = "安全"
    isRiskKye = []
    for _, riskIns := range risks {
        if  riskIns.RiskType == "dnslog" || riskIns.RiskTypeVerbose == "DNSLOG" {
            isRiskKye = append(isRiskKye, riskIns)
        }
        if str.Contains(riskIns.Severity, "critical") {
            criticalCount++
            if parseBool(riskIns.IsPotential) {
                criticalPotentialRisks = append(criticalPotentialRisks, riskIns)
            } else {
                criticalRisks = append(criticalRisks, riskIns)
            }
        }
        if str.Contains(riskIns.Severity, "high") {
            highCount++
            if parseBool(riskIns.IsPotential) {
                highPotentialRisks = append(highPotentialRisks, riskIns)
            } else {
                highRisks = append(highRisks, riskIns)
            }
        }
        if str.Contains(riskIns.Severity, "warning") {
            warningCount++
            if parseBool(riskIns.IsPotential) {
                warningPotentialRisks = append(warningPotentialRisks, riskIns)
            } else {
                warningRisks = append(warningRisks, riskIns)
            }
        }
        if str.Contains(riskIns.Severity, "low") {
            lowCount++
            if parseBool(riskIns.IsPotential) {
                lowPotentialRisks = append(lowPotentialRisks, riskIns)
            } else {
                lowRisks = append(lowRisks, riskIns)
            }
        }
       if  str.Contains(riskIns.Severity, "info") && riskIns.RiskType != "dnslog"  {
           secureCount++
            if parseBool(riskIns.IsPotential) {
                secureCountScaleRisks = append(secureCountScaleRisks, riskIns)
            } else {
                secureRisks = append(secureRisks, riskIns)
            }
       }
        
    }
    colorTag = ""
    if criticalCount > 0 {
      riskLevel = "超危"
      colorTag = "#8B0000"
      criticalCountScale = criticalCountScale + 1
    } else if highCount > 0 {
      riskLevel = "高危"
      colorTag = "#FF4500"
      highCountScale = highCountScale + 1
    } else if warningCount > 0 {
      riskLevel = "中危"
      colorTag = "#FFA500"
      warningCountScale = warningCountScale + 1
    } else if lowCount > 0 {
      riskLevel = "低风险"
      colorTag = "#008000"
      lowCountScale = lowCountScale + 1
    } else if secureCount > 0 {
      secureCountScale = secureCountScale + 1
    }
    
    allCount = criticalCount +highCount + warningCount + lowCount
    if len(isRiskKye) == 0 {
        ipRisksStr = append(ipRisksStr, {
        "资产": {"value": target, "jump_link": target, "sort": 1},
        "风险等级": {"value": riskLevel,"color": colorTag, "sort": 2},
        "严重风险": {"value": criticalCount, "color": "#8B0000", "sort": 3 },
        "高风险": {"value": highCount, "color": "#FF4500", "sort": 4 },
        "中风险": {"value": warningCount, "color": "#FFA500", "sort": 5 },
        "低风险": {"value": lowCount, "color": "#008000", "sort": 6 },
        "总计": {"value": allCount, "sort": 7}
    })
    }
    
}

// reportInstance.Raw({"type": "pie-graph", "title":"存活资产统计", "data": [{"name": "超危", "value": criticalCountScale}, {"name": "高危", "value": highCountScale}, {"name": "中危", "value": warningCountScale}, {"name": "低危", "value": lowCountScale}, {"name": "安全", "value": secureCountScale}, {"name": "存活资产", "value": aliveHostCount, "direction": "center"} ], "color": ["#f2637b", "#fbd438", "#4ecb73", "#59d4d4", "#39a1ff", "#ffffff"]})

aliveHostList = []
aliveHostKey = 0
for aliveHost = range db.QueryAliveHost(runtimeID) {
    aliveHostKey = aliveHostKey + 1
    aliveHostList = append(aliveHostList, {
        "序号": { "value": aliveHostKey, "sort": 1},
        "存活资产": { "value": aliveHost.IP, "sort": 2}
    })
}
if len(aliveHostList) == 0 {
    for _, host := range aliveHostCountList{
        aliveHostKey = aliveHostKey + 1
        aliveHostList = append(aliveHostList, {
            "序号": { "value": aliveHostKey, "sort": 1},
            "存活资产": { "value": host, "sort": 2}
        })
    }
}

reportInstance.Raw({"type": "pie-graph", "title":"存活资产统计", "data": [{"name": "存活资产", "value": len(aliveHostList), "color": "#43ab42"}, {"name": "未知", "value": hostTotal-len(aliveHostList), "color": "#bfbfbf"}, {"name": "总资产", "value": hostTotal, "direction": "center", "color": "#ffffff"} ]})
reportInstance.Raw({"type": "pie-graph", "title":"风险资产统计", "data": [{"name": "超危", "value": criticalCountScale, "color":"#f2637b"}, {"name": "高危", "value": highCountScale, "color":"#fbd438"}, {"name": "中危", "value": warningCountScale, "color": "#4ecb73"}, {"name": "低危", "value": lowCountScale, "color": "#59d4d4"}, {"name": "安全", "value": aliveHostCount-len(ipRisksStr), "color": "#43ab42"}, {"name": "存活资产统计", "value": aliveHostCount, "direction": "center", "color": "#ffffff"} ]})

reportInstance.Markdown("#### 存活资产汇总")
if len(aliveHostList) > 0 {
    reportInstance.Markdown("存活资产列表会显示所有存活资产，如有漏洞与风险会展示在风险资产列表中，未在风险资产列表中出现则默认为安全。")
    reportInstance.Raw( json.dumps({ "type": "potential-risks-list", "data": aliveHostList }))
} else {
    reportInstance.Markdown("暂无存活资产")
}

reportInstance.Markdown("#### 风险资产汇总")
if len(ipRisksStr) > 0 {
    ipRisksList := json.dumps({ "type": "risk-list", "data": ipRisksStr })
    reportInstance.Raw(ipRisksList)
} else {
    reportInstance.Markdown("暂无资产汇总")
}

// 端口扫描统计展示
reportInstance.Markdown("## 3.2 端口扫描统计")
reportInstance.SearchTable(
    ["地址", "端口", "协议", "指纹", "网站标题"],
    portsLine...,
)

// 风险统计展示
reportInstance.Markdown("## 3.3 风险统计")

reportInstance.Markdown("### 3.3.1 漏洞统计")
loopholeCriticalLens = 0
loopholeHighLens = 0
loopholeWarningLens = 0
loopholeLowLens = 0
if len(noPotentialRisks) == 0 {
    reportInstance.Raw({"type": "report-cover", "data": "security"})
} else {
    for index, info = range noPotentialRisks {

        if str.Contains(info.Severity, "critical") {
            loopholeCriticalLens = loopholeCriticalLens + 1
        }

        if str.Contains(info.Severity, "high") {
            loopholeHighLens = loopholeHighLens + 1
        }

        if str.Contains(info.Severity, "warning") {
            loopholeWarningLens = loopholeWarningLens + 1
        }

        if str.Contains(info.Severity, "low") {
           loopholeLowLens = loopholeLowLens + 1
        }
    }

}
if loopholeCriticalLens > 0 || loopholeHighLens > 0 || loopholeWarningLens > 0 || loopholeLowLens > 0 {
    reportInstance.Raw({"type": "bar-graph", "data": [{"name": "严重漏洞", "value": loopholeCriticalLens}, {"name": "高危漏洞", "value": loopholeHighLens}, {"name": "中危漏洞", "value": loopholeWarningLens}, {"name": "低危漏洞", "value": loopholeLowLens}], "color": ["#f70208", "#f9c003", "#2ab150", "#5c9cd5"]})
} else {
    reportInstance.Markdown("暂无数据")
}

reportInstance.Markdown("### 3.3.2 漏洞统计列表")

if len(noPotentialRisks) == 0 {
    reportInstance.Markdown("无漏洞信息")
} else {
    _line = []
    for index, info = range noPotentialRisks {
        level = "-"
        if str.Contains(info.Severity, "critical") {
            level = "严重"
        }

        if str.Contains(info.Severity, "high") {
            level = "高危"
        }

        if str.Contains(info.Severity, "warning") {
            level = "中危"
        }

        if str.Contains(info.Severity, "low") {
            level = "低危"
        }
        
        titleVerbose = info.TitleVerbose
        if titleVerbose == "" {
            titleVerbose = info.Title
        }
        if info.RiskTypeVerbose != "DNSLOG" {
            _line = append(_line, {
                "序号": { "value": index + 1, "sort": 1},
                "网站地址": { "value": sprintf(\`%v:%v\`, info.IP, info.Port), "sort": 2},
                "漏洞情况": { "value": titleVerbose, "sort": 3},
                "威胁风险": { "value": level, "sort": 4}
            })
        }
    }
    potentialRisksList := json.dumps({ "type": "potential-risks-list", "data": _line })
    reportInstance.Raw(potentialRisksList)
}

showPotentialLine = []
complianceRiskCriticalCount = 0
complianceRiskHighCount = 0
complianceRiskWarningCount = 0
complianceRiskLowCount = 0
cpp = cve.NewStatistics("PotentialPie")
println(len(potentialRisks))
for i, riskIns := range potentialRisks {

    level = "-"
    if str.Contains(riskIns.Severity, "critical") {
        level = "严重"
        complianceRiskCriticalCount ++
    }
    if str.Contains(riskIns.Severity, "high") {
        level = "高危"
        complianceRiskHighCount ++
    }
    if str.Contains(riskIns.Severity, "warning") {
        level = "中危"
        complianceRiskWarningCount ++
    }
    if str.Contains(riskIns.Severity, "low") {
        level = "低危"
        complianceRiskLowCount ++
    }
    
    c = cve.GetCVE(riskIns.CVE)
    cweNameZh="-"
    if len(c.CWE) !=0 {
        ccwe = cwe.Get(c.CWE)
        if ccwe != nil{
            cweNameZh =  ccwe.NameZh
        }
    }
    
    cveStr = riskIns.CVE
    if len(cveStr) ==0 {
        cveStr = "-"
    }
    if len(showPotentialLine) < 10 {
        title = riskIns.Title
        try {
          if str.Contains(riskIns.Title,": -") {
            title = str.SplitN(riskIns.Title,": -",2)[1]
          } else if str.Contains(riskIns.Title,":") && str.Contains(riskIns.Title,"CVE-") {
            title = str.SplitN(riskIns.Title,":",2)[1]
          }
        }catch err {
             yakit.Info("Title %v", err)
        }
        
        showPotentialLine = append(
            showPotentialLine,
            [cveStr, title, sprintf(\`%v:%v\`, riskIns.IP, riskIns.Port), cweNameZh, level],
        )
    }
    
    cpp.Feed(c)
    yakit.SetProgress((float(i) / float(len(potentialRisks) - 1)))
    if len(showPotentialLine) == 10 {
        showPotentialLine = append(
            showPotentialLine,
            ["更多风险请在附录中查看...", "", "", "", ""],
        )
    }
}
if len(potentialRisks) != 0 {
    
    reportInstance.Markdown(sprintf("### 3.3.3 合规检查风险统计"))
    for _, gp := range cpp.ToGraphs(){
        aa = json.dumps(gp)
        reportInstance.Raw(aa)
        if gp.Name == "AttentionRing"{
             reportInstance.Markdown(sprintf(\`|  风险等级   | 等级划分依据  |
|  ----  | ----  |
| <font color="#da4943">通过网络无需认证且易于攻击</font>  | 这种漏洞类型指的是攻击者可以通过互联网或者内部网络等方式，<font color="#da4943">无需进行任何身份认证</font>就能够轻易地攻击目标系统或应用程序。通常，这种漏洞会暴露在网络端口、协议、服务等方面，攻击者**很容易**利用其漏洞来实现远程控制、拒绝服务攻击、数据窃取等攻击行为。这种漏洞对于网络安全威胁性较高，需要及时采取相应的安全措施来防范和修复。 |
| <font color="#dc9b02">攻击通过网络无需认证</font>  | 这种漏洞类型指的是攻击者可以通过互联网或者内部网络等方式，利用特定的漏洞或技术手段来<font color="#dc9b02">绕过身份验证或者访问控制机制</font>，从而获取系统或应用程序中敏感信息或者实现非法操作。这种漏洞通常涉及到系统或应用程序中存在的逻辑错误、缺陷或者安全配置问题，攻击者可以通过这些漏洞从外部或内部进入系统，发起攻击行为。这种漏洞需要综合考虑网络架构、身份认证、授权机制等多个方面来解决，确保系统或应用程序的安全和可靠性。 |
| <font color="#43ab42">通过网络攻击</font>  | 这种漏洞类型指的是攻击者可以通过互联网或者内部网络等方式，利用<font color="#43ab42">已知或未知的漏洞</font>来实现对目标系统或应用程序的攻击。这种攻击通常涉及到系统或应用程序中的某个软件组件或者功能模块，攻击者可以通过针对这些组件或模块的漏洞发起攻击，例如代码注入、文件包含、SQL 注入等方式。这种漏洞需要及时更新系统或应用程序中的软件版本，并加强安全测试和审计等手段，确保系统或应用程序的安全性和可靠性。|\`))
        }
    }
    reportInstance.Markdown(sprintf("### 3.3.4 合规检查风险列表"))
    
    if(complianceRiskCriticalCount > 0 || complianceRiskHighCount > 0 || complianceRiskHighCount > 0 || complianceRiskWarningCount > 0) {
        reportInstance.Raw({"type": "bar-graph", "title": "合规漏洞严重程度统计", "data": [{"name": "严重", "value": complianceRiskCriticalCount}, {"name": "高危", "value": complianceRiskHighCount}, {"name": "中危", "value": complianceRiskWarningCount}, {"name": "低危", "value": complianceRiskLowCount}], "color": ["#f70208", "#f9c003", "#2ab150", "#5c9cd5"]})
    }
    reportInstance.Markdown(\`合规检查是根据多年的经验， 通过扫描检查出危险系统及组件的版本。合规检查风险不是会造成实际损失的漏洞，可跟技术人员评估后，决定是否升级系统版本。\`)
    reportInstance.Table(["CVE编号", "漏洞标题", "地址", "CWE类型", "漏洞级别"], showPotentialLine...)
} else {
    reportInstance.Markdown(sprintf("### 3.3.3 合规风险资产图"))
    reportInstance.Markdown("无风险资产图")

    reportInstance.Markdown(sprintf("### 3.3.4 合规检查风险列表"))
    reportInstance.Markdown("无合规检查风险")
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
     reportInstance.Markdown(sprintf("### 3.3.5 弱口令风险列表"))
     reportInstance.Markdown(sprintf(\`对资产进行弱口令检测，检测到 %v 个弱口令，请尽快修复\`, len(weakPassWordRisks)))
     showWeakPassWordFormLine = []
     for k, riskIns := range weakPassWordRisks {
         level = "-"
         if str.Contains(riskIns.Severity, "critical") {
             level = "严重"
         }

         if str.Contains(riskIns.Severity, "high") {
             level = "高危"
         }

         if str.Contains(riskIns.Severity, "warning") {
             level = "中危"
         }

         if str.Contains(riskIns.Severity, "low") {
             level = "低危"
         }

         showWeakPassWordFormLine = append(
             showWeakPassWordFormLine,
             [k+1, riskIns.IP, riskIns.TitleVerbose, level],
         )
     }

     reportInstance.Table(
         ["序号", "网站地址", "漏洞标题", "威胁风险"],
         showWeakPassWordFormLine...,
     )
} else {
    reportInstance.Markdown(sprintf("### 3.3.5 弱口令风险列表"))
    reportInstance.Markdown("对资产进行弱口令检测，检测到 0 个弱口令，暂无弱口令风险")
}


// 后续整改建议
reportInstance.Markdown("# 4、后续整改建议")
if criticalLens > 0 || highLens > 0 {
    reportInstance.Markdown(sprintf(\`本次测试风险漏洞共%v个，其中<font color='#da4943'>严重</font>漏洞有%v个，<font color='#d83931'>高危</font>漏洞有%v个，<font color='#dc9b02'>中危</font>漏洞有%v个，<font color='#43ab42'>低危</font>漏洞有%v个。存在的潜在风险较大，请尽快部署安全防护策略和安全防护技术手段，落实安全评估和日常安全扫描，做到安全漏洞及时发现及时修复，切实提升系统安全防护能力。\`, total, criticalLens, highLens, warningLens, lowLens))
} else if criticalLens == 0 && highLens == 0 && warningLens > 0 {
    reportInstance.Markdown(sprintf(\`本次测试风险漏洞共%v个，其中<font color='#da4943'>严重</font>漏洞有%v个，<font color='#d83931'>高危</font>漏洞有%v个，<font color='#dc9b02'>中危</font>漏洞有%v个，<font color='#43ab42'>低危</font>漏洞有%v个。存在潜在风险，请尽快部署安全防护策略和安全防护技术手段，落实安全评估和日常安全扫描，做到安全漏洞及时发现及时修复，切实提升系统安全防护能力。\`, total, criticalLens, highLens, warningLens, lowLens))
} else if criticalLens == 0 && highLens == 0 && warningLens == 0 {
    reportInstance.Markdown(sprintf(\`本次测试风险漏洞共%v个，其中<font color='#da4943'>严重</font>漏洞有%v个，<font color='#d83931'>高危</font>漏洞有%v个，<font color='#dc9b02'>中危</font>漏洞有%v个，<font color='#43ab42'>低危</font>漏洞有%v个。整体安全防护良好。\`, total, criticalLens, highLens, warningLens, lowLens))
}

reportInstance.Markdown("# 附录：")

// 检索漏洞详情
func showReport(risks) {
    for k, riskIns := range risks {
        payload, _ := codec.StrconvUnquote(riskIns.Payload)
        if payload == "" {
            payload = riskIns.Payload
        }
        request, _ := codec.StrconvUnquote(riskIns.QuotedRequest)
        response, _ := codec.StrconvUnquote(riskIns.QuotedResponse)
        addr := sprintf(\`%v:%v\`, riskIns.Host, riskIns.Port)
        
        titleVerbose = riskIns.TitleVerbose
        if titleVerbose == "" {
            titleVerbose = riskIns.Title
        }
        reportInstance.Raw({"type": "fix-list", "data": {
            "标题": {
                "fold": true,
                "sort": 1,
                "value": titleVerbose
            },
            "风险地址": {
                 "search": true,
                 "sort": 2,
                 "value": addr
             },
            "漏洞级别": {
                 "sort": 3,
                 "value": riskIns.Severity
            },
            "标漏洞类型": {
                  "sort": 4,
                  "value": riskIns.RiskTypeVerbose
            },
            "漏洞描述": {
                "sort": 5,
                "value":  riskIns.Description
            },
            "修复建议": {
                  "sort": 6,
                  "value": riskIns.Solution
            },
            "Payload": {
                "sort": 7,
                "value": payload
            },
            "HTTP Request": {
                "sort": 8,
                "value": request,
                "type": "code"
             },
            "HTTP Response": {
                "sort": 9,
                "value": response,
                "type": "code"
            }
            
          }
         
        })
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
    reportInstance.Markdown(sprintf("暂无漏洞详情"))
}

reportInstance.Markdown("## 合规检查风险详情")

// 用 map 存储每个年份的 CVE 编号
cveTestMap := make(map[string][]var)

func showCVEReport(risks, riskSeverity) {
    for _, riskIns := range risks {
        year = riskIns.CVE[4:8]

        if len(cveTestMap[year]) == 0 {
            cveTestMap[year] = []
        }

        cveTestMap[year] = append(cveTestMap[year], riskIns)
    }

    for year, cves := range cveTestMap {
        cveResult = []
        for _, cve := range cves {
            level, description, solution = "-", "-", "-"
            if str.Contains(cve.Severity, "critical") {
                level = \`<font color="#da4943">严重</font>\`
            }
            if str.Contains(cve.Severity, "high") {
                level = \`<font color="#d83931">高危</font>\`
            }
            if str.Contains(cve.Severity, "warning") {
                level = "中危"
            }
            if str.Contains(cve.Severity, "low") {
                level = \`<font color="#43ab42">低危</font>\`
            }
            if len(cve.Description) > 0 {
                description = cve.Description
            }
            if len(cve.Solution) > 0 {
                solution = cve.Solution
            }
            accessVector := cve.CveAccessVector
            if accessVector == "" {
                accessVector = "UNKNOWN"
            }
            complexity := cve.CveAccessComplexity
            if complexity == "" {
                complexity = "UNKNOWN"
            }
            addr := sprintf(\`%v:%v\`, cve.Host, cve.Port)
            parameter = "-"
            if customHasPrefix(cve.Parameter, "cpe") {
            \tparameter = cve.Parameter
            }
            titleVerbose = cve.TitleVerbose
            if titleVerbose == "" {
                titleVerbose = cve.Title
            }
            if cve.Severity == riskSeverity {
               cveResult = append(cveResult, {
                        "标题": {
                            "fold": true,
                            "sort": 1,
                            "value": titleVerbose
                        },
                        "风险地址": {
                             "sort": 2,
                             "value": addr
                        },
                        "漏洞级别":{
                            "sort": 3,
                            "value": level
                        },
                        "标漏洞类型": {
                             "sort": 4,
                             "value": cve.RiskTypeVerbose
                         },
                        "漏洞描述": {
                              "sort": 5,
                              "value":description
                        },
                        "修复建议": {
                             "sort": 6,
                             "value": solution
                        },
                        "扫描规则": {
                             "sort": 7,
                             "value": parameter
                        },
                        "联网状态": accessVector,
                        "可利用复杂度": complexity
               })
            }
        }
        if len(cveResult) > 0 {
           cveList := json.dumps({ "type": "fix-array-list", "riskSeverity": riskSeverity, "title": sprintf(\`%v年的CVE列表\` , year), "data": cveResult })
           reportInstance.Raw(cveList)
        }

    }
}

func customHasPrefix(str, prefix) {
    if len(str) < len(prefix) {
        return false
    }

    for i := 0; i < len(prefix); i++ {
        if str[i] != prefix[i] {
            return false
        }
    }
    return true
}

if len(criticalPotentialRisks) > 0 {
    reportInstance.Markdown(sprintf("### 严重合规风险详情"))
    showCVEReport(criticalPotentialRisks, "critical")
}
if len(highPotentialRisks) > 0 {
    reportInstance.Markdown(sprintf("### 高危合规风险详情"))
    showCVEReport(highPotentialRisks, "high")
}
if len(warningPotentialRisks) > 0 {
    reportInstance.Markdown(sprintf("### 中危合规风险详情"))
    showCVEReport(warningPotentialRisks, "warning")
}
if len(lowPotentialRisks) > 0 {
    reportInstance.Markdown(sprintf("### 低危合规风险详情"))
    showCVEReport(lowPotentialRisks, "low")
}
if len(criticalPotentialRisks)== 0 && len(highPotentialRisks)== 0 && len(warningPotentialRisks)== 0 && len(lowPotentialRisks)== 0 {
    reportInstance.Markdown(sprintf("暂无合规风险"))
}
`