export const HotPatchDefaultContent = `// 使用标签 {{yak(handle|param)}} 可以触发热加载调用
handle = func(p) {
    // 返回值可以是一个字符串
    return codec.EncodeBase64("base64-prefix" + p) + sprintf("_origin(%v)", p)
}

// 使用标签 {{yak(handle1|...)}} 也可以触发热加载调用
// 如何传多个参数：使用自定义的分隔符进行分隔，例如逗号(,)
handle1 = func(p) {
    results = str.Split(p, ",")
    // 返回值也支持返回一个数组
    return results
}

// 使用标签 {{yak(handleYield|...)}} 可以触发热加载调用，这通常用于返回的数据需要长时间执行（例如读取大文件）的时候
// 使用yield可以在执行中途返回值并交给渲染系统进行渲染，无需等待该函数执行完再进行发包
handleYield = func(param, yield) {
    // 这个特殊的 Hook 也支持返回数组
    for s in ["12312312", "abc", "def"] {
        yield(s)
    }
}

// beforeRequest 允许在每次发送数据包前对请求做最后的处理，定义为 func(https bool, originReq []byte, req []byte) []byte
// https 请求是否为https请求
// originReq 原始请求
// req 请求
beforeRequest = func(https, originReq, req) {
    // 我们可以将请求进行一定的修改
    /*
    一个替换请求参数a的例子
    poc.ReplaceHTTPPacketQueryParam(req, "a", "bbb")
    */
    // 将修改后的请求返回
    return []byte(req)
}

// afterRequest 允许在返回响应前对响应做最后的处理，定义为 func(https bool, originReq []byte, req []byte, originRsp []byte, rsp []byte) []byte
// https 请求是否为https请求
// originReq 原始请求
// req 请求
// originRsp 原始响应
// rsp 响应
afterRequest = func(https, originReq, req, originRsp, rsp) {
       // 我们可以将响应进行一定的修改，例如解密响应
    /*
    一个替换响应的例子
    body = poc.GetHTTPPacketBody(rsp)
    data = json.loads(body)~
    if "result" in data {
        data["result"] = string(codec.DecodeBase64(data["result"])~)
    }
    */

    return []byte(rsp)
}

// mirrorHTTPFlow 允许对每一个请求的响应做处理，定义为 func(req []byte, rsp []byte, params map[string]any) map[string]any
// req 请求
// rsp 响应
// params 之前提取器/mirrorHTTPFlow中提取到的参数
// 返回值会作为下一个请求的参数
mirrorHTTPFlow = func(req, rsp, params) {
    return params
}
`
