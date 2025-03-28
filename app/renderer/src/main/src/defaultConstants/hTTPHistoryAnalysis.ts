export const HotPatchDefaultContent = `analyzeHTTPFlow = func(flow /* *yakit.HTTPFlow */ ,extract /*func(ruleName string, flow *yakit.HTTPFlow)*/){
    // flow 从数据库查询的流量数据
    // extract 将数据进行提取,ruleName做为提取流量的规则名
    // Example:
    // // 判断流量的Url是否包含"baidu"以及请求包是否包含"HelloWorld"
    // if str.Contains(flow.Url, "baidu") && str.Contains(string(flow.Request),"HelloWorld"){  
    //     flow.Red() // 染红色
	//     extract("热加载",flow) // 提取流量，命名规则为"热加载"
    // }
}
`
