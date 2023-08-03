export const CodecPluginTemplate = `# codec plugin

/*
Codec Plugin 可以支持在 Codec 中自定义编码解码，自定义 Bypass 与字符串处理函数

函数定义非常简单

func(i: string) string
*/

handle = func(origin /*string*/) {
    # handle your origin str
    return origin
}
`


export const CustomDnsLogPlatformTemplate = `
yakit.AutoInitYakit()

requireDomain = func() {
    packet = \`GET /xxx HTTP/1.1
Host: target

\`
        rsp,req = poc.HTTPEx(
            packet,
            poc.https(true),
            poc.timeout(10),
            // poc.proxy("http://127.0.0.1:9999")

        )~
        _, body = poc.Split(rsp.RawPacket)
        subdomain, token = "", ""
        // 处理逻辑
        return subdomain,token
}

getResults = func(token) {
    packet = f\`GET / HTTP/1.1
Host: target.com
\`
    rsp,req = poc.HTTPEx(
            packet,
            poc.https(true),
            poc.timeout(10),
            // poc.proxy("http://127.0.0.1:9999")
        )~
    _, body = poc.Split(rsp.RawPacket)
    events = []
    if len(body)> 0 {
        // 处理逻辑
        return events
    }

}
`