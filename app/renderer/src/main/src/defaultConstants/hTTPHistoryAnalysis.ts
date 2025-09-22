import {HTTPHistoryAnalysisPageInfo} from "@/store/pageInfo"

export const defaultHTTPHistoryAnalysisPageInfo: HTTPHistoryAnalysisPageInfo = {
    webFuzzer: false,
    runtimeId: [],
    sourceType: "mitm",
    verbose: "",
    pageId: ""
}
export const HotPatchDefaultContent = `analyzeHTTPFlow = func(flow /* *yakit.HTTPFlow */ , extract /*func(ruleName string, flow *yakit.HTTPFlow,contents ...string)*/) {
    // flow 从数据库查询的流量数据
    // extract 将数据进行提取,ruleName做为提取流量的规则名，contents为提取的内容

    // Example:
    // 在响应内容中搜索手机号
    // respStr := string(flow.Response)
    // // 使用正则匹配手机号
    // phoneRegex := re.MustCompile(\`\\b1[3-9]d{9}\\b\`)
    // phoneMatches := phoneRegex.FindAllString(respStr, -1)

    // if len(phoneMatches) > 0 {
    //     // 高亮显示包含手机号的流量
    //     flow.Red()
    //     // 提取流量并标注发现的手机号数量
    //     extract("手机号提取", flow,sprintf("手机号%v",phoneMatches ))
    // }
}
`

export const footerTabs = [
    {key: "rule", label: "规则"},
    {key: "hot-patch", label: "热加载"}
]
