import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"

interface RuleLevelInfo {
    key: string
    name: string
    color: YakitTagColor
}

/** 规则等级渲染 tag */
export const RuleLevel: Record<string, RuleLevelInfo> = {
    critical: {key: "critical", name: "严重", color: "serious"},
    high: {key: "high", name: "高危", color: "danger"},
    middle: {key: "middle", name: "中危", color: "info"},
    low: {key: "low", name: "低危", color: "warning"},
    info: {key: "info", name: "信息", color: "success"}
}
/** 规则可选等级 */
export const RuleLevelList: {value: string; label: string}[] = [
    {value: "critical", label: "严重"},
    {value: "high", label: "高危"},
    {value: "middle", label: "中危"},
    {value: "low", label: "低危"},
    {value: "info", label: "信息"}
]

/** 规则可选语言 */
export const RuleLanguageList: {value: string; label: string}[] = [
    {value: "java", label: "Java"},
    {value: "php", label: "PHP"},
    {value: "yak", label: "Yaklang"},
    {value: "js", label: "JavaScript"},
    {value: "go", label: "Golang"},
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
