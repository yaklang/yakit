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

`