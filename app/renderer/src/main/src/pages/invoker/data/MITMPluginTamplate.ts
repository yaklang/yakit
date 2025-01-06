export const HotPatchTemplate = `// 请求 -> hijackHTTPRequest -> 前端劫持 -> beforeRequest -> 服务器响应 ->  hijackResponse -> 后端劫持 -> afterRequest -> 客户端看到的响应 -> hijackSaveHTTPFlow

// mirrorHTTPFlow 会镜像所有的流量到这里，包括被过滤器过滤的请求
// !!! 一般插件不要实现这个接口
// isHttps 请求是否为https请求
// url 网站URL
// req 请求
// rsp 响应
// body 响应体
mirrorHTTPFlow = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {

}

// mirrorFilteredHTTPFlow 会镜像过滤后的流量到这里
// isHttps 请求是否为https请求
// url 网站URL
// req 请求
// rsp 响应
// body 响应体
mirrorFilteredHTTPFlow = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {

}

// mirrorNewWebsite 会镜像过滤后的流量到这里，每个网站只会触发一次
// isHttps 请求是否为https请求
// url 网站URL
// req 请求
// rsp 响应
// body 响应体
mirrorNewWebsite = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {

}

// mirrorNewWebsitePath 会镜像过滤后的流量到这里，每个网站的相同路径只会触发一次
// isHttps 请求是否为https请求
// url 网站URL
// req 请求
// rsp 响应
// body 响应体
mirrorNewWebsitePath = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {

}

// mirrorNewWebsitePathParams 会镜像过滤后的流量到这里，每个网站的参数相同的请求只会触发一次
// isHttps 请求是否为https请求
// url 网站URL
// req 请求
// rsp 响应
// body 响应体
mirrorNewWebsitePathParams = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {

}

// hijackHTTPRequest 会在过滤后的请求到达Yakit MITM前被调用，可以通过该函数提前将请求修改或丢弃
// isHttps 请求是否为https请求
// url 网站URL
// req 请求
// forward(req) 提交修改后的请求，如果未被调用，则使用原始的请求
// drop() 丢弃请求
hijackHTTPRequest = func(isHttps, url, req, forward /*func(modifiedRequest []byte)*/, drop /*func()*/) {
    // Example:
    // if str.Contains(string(req), "/should_modify") {
    //     modified = str.ReplaceAll(string(req), "/should_modify", "/modified")
    //     forward(poc.FixHTTPRequest(modified))
    // } 

    // if str.Contains(string(req), "/drop") {
    //     drop()
    // } 
}


// hijackHTTPResponse 会在过滤后的响应到达Yakit MITM前被调用，可以通过该函数提前将响应修改或丢弃
// isHttps 请求是否为https请求
// url 网站URL
// rsp 响应
// forward(req) 提交修改后的响应，如果未被调用，则使用原始的响应
// drop() 丢弃响应
hijackHTTPResponse = func(isHttps  /*bool*/, url  /*string*/, rsp /*[]byte*/, forward /*func(modifiedResponse []byte)*/, drop /*func()*/) {
    // Example:
    // if str.Contains(string(rsp), "凝聚磅礴的中国文学力量") {
    //     modified = poc.FixHTTPResponse(str.ReplaceAll(rsp, "凝聚磅礴的中国文学力量", "AAAAAAAAAAAAAAAA"))
    //     forward(modified)
    // }
}

// hijackHTTPResponseEx 是hijackHTTPResponse的扩展，能够获取到响应对应的请求，会在过滤后的响应到达Yakit MITM前被调用，可以通过该函数提前将响应修改或丢弃
// !!! 通常实现hijackHTTPResponse 或 hijackHTTPResponseEx 其中一个函数即可
// isHttps 请求是否为https请求
// url 网站URL
// req 请求
// rsp 响应
// forward(req) 提交修改后的响应，如果未被调用，则使用原始的响应
// drop() 丢弃响应
hijackHTTPResponseEx = func(isHttps  /*bool*/, url  /*string*/, req/*[]byte*/, rsp /*[]byte*/, forward /*func(modifiedResponse []byte)*/, drop /*func()*/) {
    // Example:
    // if str.Contains(string(rsp), "凝聚磅礴的中国文学力量") {
    //     modified = poc.FixHTTPResponse(str.ReplaceAll(rsp, "凝聚磅礴的中国文学力量", "AAAAAAAAAAAAAAAA"))
    //     forward(modified)
    // }
}

// beforeRequest 会在请求到达服务器之前被调用,可以通过该函数对请求做最后一次修改
// isHttps 请求是否为https请求
// oreq 原始请求
// req hijackRequest修改后的请求
// 返回值: 修改后的请求,如果没有返回值则使用hijackRequest修改后的请求
beforeRequest = func(ishttps /*bool*/, oreq /*[]byte*/, req/*[]byte*/){
    // Example:
	// if str.Contains(string(req), "凝聚磅礴的中国文学力量") {
    //     modified = poc.FixHTTPRequest(str.ReplaceAll(req, "凝聚磅礴的中国文学力量", "AAAAAAAAAAAAAAAA"))
    //     return []byte(modified)
    // }
}

// afterRequest 会在响应到达客户端之前被调用,可以通过该函数对响应做最后一次修改
// isHttps 请求是否为https请求
// oreq 原始请求
// req hijackRequest修改后的请求
// orsp 原始响应
// rsp hijackHTTPResponse/hijackHTTPResponseEx修改后的响应
// 返回值: 修改后的响应,如果没有返回值则使用hijackHTTPResponse/hijackHTTPResponseEx修改后的响应
afterRequest = func(ishttps, oreq/*原始请求*/ ,req/*hiajck修改之后的请求*/ ,orsp/*原始响应*/ ,rsp/*hijack修改后的响应*/){
    // Example:
	// if str.Contains(string(rsp), "凝聚磅礴的中国文学力量") {
    //     modified = poc.FixHTTPRequest(str.ReplaceAll(rsp, "凝聚磅礴的中国文学力量", "AAAAAAAAAAAAAAAA"))
    //     return []byte(modified)
    // }
}

// hijackSaveHTTPFlow 会在流量被存储到数据库前被调用,可以通过该函数对入库前的流量进行修改,例如修改请求/响应,添加tag/染色等
// flow 流量结构体,可以通过鼠标悬浮提示查看其拥有的字段并对其进行修改
// modify(modified) 提交修改后的流量结构体，如果未被调用，则使用原始的流量结构体
// drop() 丢弃流量
hijackSaveHTTPFlow = func(flow /* *yakit.HTTPFlow */, modify /* func(modified *yakit.HTTPFlow) */, drop/* func() */) {
    // flow.Request 转义后的请求
    // flow.Response 转义后的响应
    // 对于转义后的请求和响应,需要通过以下方式拿到原始的请求/响应
    // req = str.Unquote(flow.Request)~
    // rsp = str.Unquote(flow.Response)~
    // 对于修改后的请求和响应,需要通过以下方式再将其转义回去
    // flow.Request = str.Quote(req)
    // flow.Response = str.Quote(rsp)
    // flow.AddTag("tag") // 添加tag
    // flow.Red() // 染红色
    // 
    // Example:
    // responseBytes, _ = codec.StrconvUnquote(flow.Response)
    // if str.MatchAnyOfRegexp(responseBytes, "/admin/", "accessKey") { 
    //     flow.Red(); 
    //     modify(flow) 
    // }
}
`
