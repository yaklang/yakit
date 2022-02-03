export const PacketHackPluginTemplate = `# packet hack plugin

/*
本插件定义的函数(Hook)的参数来源于以下内容 
1. HTTP History
2. Repeater

Hook I/O 的输入输出均可用
1. yakit_status
2. yakit_output
3. yakit_save  

函数定义如下：
func(requestRaw: []byte|string|url, responseBody: []byte, isHttps: bool)
*/

handle = func(requestRaw, responseRaw, isHttps) {
    freq, err := fuzz.HTTPRequest(requestRaw, fuzz.https(isHttps))
    if err != nil {
        yakit_output("Build Fuzz HTTPRequest failed")
        return
    }
}


__test__ = func() {
    # run your testcase!
}
`