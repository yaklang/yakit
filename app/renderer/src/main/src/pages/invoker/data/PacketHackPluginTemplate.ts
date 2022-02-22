export const PacketHackPluginTemplate = `# packet hack plugin
yakit.AutoInitYakit()

/*
本插件定义的函数(Hook)的参数来源于以下内容 
1. HTTP History
2. Repeater

函数定义如下：
func(requestRaw: []byte|string|url, responseBody: []byte, isHttps: bool)


*/

handle = func(requestRaw, responseRaw, isHttps) {
    freq, err := fuzz.HTTPRequest(requestRaw, fuzz.https(isHttps))
    if err != nil {
        yakit.Info("Build Fuzz HTTPRequest failed")
        return
    }
}


__test__ = func() {
    # run your testcase!
}

if YAK_MAIN {
    __test__()
}
`