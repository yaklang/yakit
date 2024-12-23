/** 规则类型渲染 tag */
export const RuleType: Record<string, {key: string; name: string}> = {
    audit: {key: "audit", name: "Code Audit"},
    vuln: {key: "vuln", name: "Vulnerability"},
    config: {key: "config", name: "Config"},
    security: {key: "security", name: "Security Hotspot"}
}
/** 规则可选类型 */
export const RuleTypeList: {value: string; label: string}[] = [
    {value: "audit", label: "Code Audit"},
    {value: "vuln", label: "Vulnerability"},
    {value: "config", label: "Config"},
    {value: "security", label: "Security Hotspot"}
]

/** 规则可选语言 */
export const RuleLanguageList: {value: string; label: string}[] = [
    {value: "java", label: "Java"},
    {value: "php", label: "PHP"},
    {value: "yak", label: "Yaklang"},
    {value: "js", label: "JavaScript"},
    {value: "golang", label: "Golang"},
    {value: "general", label: "通用"}
]

/** 默认的规则源码 */
export const DefaultRuleContent = `desc(
    title: "PHP Filtered Path Command Injection",
    title_zh: "用户输入被过滤的命令注入代码（需额外检查过滤是否充分）",
    type: audit,
    level: mid,
    risk:'rce'
)
<include('php-os-exec')>(* as $sink);
<include('php-param')> as $params;
<include('php-filter-function')> as $filter;

check $sink;

$sink #{
    include: \`<self> & $params\`,
    exclude: \`<self>?{opcode: call}\`
}-> as $high

check $high
alert $high for{
    title_zh: '检测到命令执行，且没有经过任何函数',
    type: 'vuln',
    level: 'high'
}

$sink#{
    include: \`<self> & $params\`,
    exclude: \`<self>?{opcode: call && <self><getCaller> & $filter}\`
}-> as $middle

alert $middle for{
    title_zh: '检测到命令执行，经过函数过滤，但未检出过滤函数',
    type: 'vuln',
    level: 'mid'
}

$sink #{
include: \`<self> & $params\`,
include: \`<self>?{opcode: call && <self><getCaller> & $filter}\`
       }-> as $low
alert $low for{
    title_zh: '检测到命令执行，但是经过函数过滤',
    type:   'info',
    level: 'low'
}

desc(
    lang: 'php',
    alert_min: 3,
    alert_low: 1,
    alert_mid: 1,
    alert_high: 1,
    'file://test.php': <<<CODE
<?php
    $a = $_GET[1];
    system($a); //high

    $b = trim($a);
    system($b);

    $c = filter($a);
    system($c); //low

CODE
)
`
