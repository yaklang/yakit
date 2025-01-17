import {Paging} from "@/utils/yakQueryHTTPFlow"

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
  // risk/risk_type表示风险类型 如：xss/rce/sqlinjection等

  // type/purpose 表示规则目的: (audit 审计位置/vuln 漏洞点/config 配置项/security 安全信息)
  type: audit,

  // level/serverity 表示规则默认risk等级，如果在alert中没有指定等级则会使用这个
  // (info 信息/low 低危/middle 中危/high 高危/critical 严重)
  level:info,
)

// write your SyntaxFlow Rule, please see: https://ssa.to/syntaxflow-guide/intro, like:
//     DocumentBuilderFactory.newInstance()...parse(* #-> * as $source) as $sink; // find some call chain for parse
//     check $sink then 'find sink point' else 'No Found' // if not found sink, the rule will stop here and report error
//     alert $source // record $source

`

/** 规则(导入|导出)弹框的宽度和表单的比例 */
export const RuleImportExportModalSize = {
    export: {
        width: 520,
        labelCol: 5,
        wrapperCol: 18
    },
    import: {
        width: 680,
        labelCol: 6,
        wrapperCol: 17
    }
}

/** 规则组默认的搜索 pagemeta 条件 */
export const DefaultRuleGroupFilterPageMeta: Paging = {Page: 1, Limit: 1000, OrderBy: "created_at", Order: "desc"}
