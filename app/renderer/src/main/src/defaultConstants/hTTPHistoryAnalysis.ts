import {HTTPHistoryAnalysisPageInfo} from "@/store/pageInfo"

export const defaultHTTPHistoryAnalysisPageInfo: HTTPHistoryAnalysisPageInfo = {
    webFuzzer: false,
    runtimeId: [],
    sourceType: "mitm",
    verbose: "",
    pageId: ""
}
export const HotPatchDefaultContent = `
// f = file.OpenFile(tempFile, file.O_APPEND|file.O_CREATE, 0o777)~
// m = sync.NewMutex() //因为analyzeHTTPFlow是并发的，所以需要加锁

analyzeHTTPFlow = func(flow /* *yakit.HTTPFlow */ , extract /*func(ruleName string, flow *yakit.HTTPFlow,contents ...string)*/) {
    // flow 从数据库查询的流量数据
    // extract 将数据进行提取,ruleName做为提取流量的规则名，contents为提取的内容
    
    // Example:
    // 在响应内容中搜索手机号
    // 需要使用GetResponse()方法拿到响应体，直接使用flow.Response拿到的是被转移存在数据库的响应体。
    // respStr := flow.GetResponse() 
    // // 使用正则匹配手机号
    // phoneRegex := re.MustCompile(\`\\b1[3-9]d{9}\\b\`)
    // phoneMatches := phoneRegex.FindAllString(respStr, -1)

    // if len(phoneMatches) > 0 {
    //     // 高亮显示包含手机号的流量
    //     flow.Red()
    //     // 提取流量并标注发现的手机号数量
    //     extract("手机号提取", flow,sprintf("手机号%v",phoneMatches ))
    //     // 提取的内容写入文件内
    //     m.Lock()
	//	   f.WriteLine(sprintf("手机号%v",phoneMatches ))
	//	   m.Unlock()
    // }
}

// onAnalyzeHTTPFlowFinish将会在流量分析的时候被调用
onAnalyzeHTTPFlowFinish = func(totalCount, matchedCount) {
	// 释放文件句柄
	// f.Close()
}

`

export const footerTabs = (t: (text: string) => string) => {
    return [
        {key: "packet", label: t("AnalysisMain.packet")},
        {key: "rule", label: t("AnalysisMain.rule")},
        {key: "hot-patch", label: t("AnalysisMain.hot_reload")}
    ]
}
