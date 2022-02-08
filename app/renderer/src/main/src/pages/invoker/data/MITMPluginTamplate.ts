export const MITMPluginTemplate = `# mitm plugin template

yakit_output(MITM_PARAMS)

#-----------------------MITM Hooks I/O-------------------------
/*
#如何使用插件参数？

## 例如，如果你设置了一个参数为 url_keyword 的参数，可以通过 MITM_PARAMS 来使用它！
urlKeyword = MITM_PARAMS["url_keyword"]

# 如何输出给 Yakit 给用户查看？

yakit_output(i: any) // 可以只输出到 "Console 界面"
yakit_save(i: any)   // 可以输出并保存到数据库中，在 "插件输出" 中查看
*/
#----------------MITM Hooks Test And Quick Debug-----------------
/*
# __test__ 是 yakit mitm 插件用于调试的函数 【注意：这个函数在 MITM hooks劫持环境下不会被导入】

在这个函数中，你可以使用 yakit.GenerateYakitMITMHooksParams(method: string, url: string, opts ...http.Option) 来方便的生成可供 hooks 调用的参数，参考代码模版中的用法～

*/


#--------------------------WORKSPACE-----------------------------
__test__ = func() {
    results, err := yakit.GenerateYakitMITMHooksParams("GET", "https://example.com")
    if err != nil {
        return
    }
    isHttps, url, reqRaw, rspRaw, body = results

    mirrorHTTPFlow(results...)
    mirrorFilteredHTTPFlow(results...)
    mirrorNewWebsite(results...)
    mirrorNewWebsitePath(results...)
    mirrorNewWebsitePathParams(results...)
}


# mirrorHTTPFlow 会镜像所有的流量到这里，包括 .js / .css / .jpg 这类一般会被劫持程序过滤的请求
mirrorHTTPFlow = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorFilteredHTTPFlow 劫持到的流量为 MITM 自动过滤出的可能和 "业务" 有关的流量，会自动过滤掉 js / css 等流量
mirrorFilteredHTTPFlow = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsite 每新出现一个网站，这个网站的第一个请求，将会在这里被调用！
mirrorNewWebsite = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsitePath 每新出现一个网站路径，关于这个网站路径的第一个请求，将会在这里被传入回调
mirrorNewWebsitePath = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsitePathParams 每新出现一个网站路径且带有一些参数，参数通过常见位置和参数名去重，去重的第一个 HTTPFlow 在这里被调用
mirrorNewWebsitePathParams = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}


# hijackHTTPRequest 每一个新的 HTTPRequest 将会被这个 HOOK 劫持，劫持后通过 forward(modifed) 来把修改后的请求覆盖，如果需要屏蔽该数据包，通过 drop() 来屏蔽
# ATTENTION-DEMO:
#   hijacked = str.ReplaceAll(string(req), "abc", "bcd")
#       1. forward(hijacked)：确认转发
#       2. drop() 丢包
#       3. 如果 forward 和 drop 都没有被调用，则使用默认数据流
#       4. 如果 drop 和 forward 在一个劫持中都被调用到了，以 drop 为准
/*
# Demo2 Best In Practice
hijackHTTPRequest = func(isHttps, url, req, forward, drop) {
    if str.Contains(string(req), "/products/plugins/plugin_11") {
        forward(str.ReplaceAll(string(req), "/products/plugins/plugin_11", "/products/plugins/plugin_create"))
    } 

    if str.Contains(string(req), "/products/plugins/plugin_12") {
        drop()
    } 
}
*/
hijackHTTPRequest = func(isHttps, url, req, forward /*func(modifiedRequest []byte)*/, drop /*func()*/) {

}
`

export const MITMPluginTemplateShort = `# mirrorHTTPFlow 会镜像所有的流量到这里，包括 .js / .css / .jpg 这类一般会被劫持程序过滤的请求
mirrorHTTPFlow = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorFilteredHTTPFlow 劫持到的流量为 MITM 自动过滤出的可能和 "业务" 有关的流量，会自动过滤掉 js / css 等流量
mirrorFilteredHTTPFlow = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsite 每新出现一个网站，这个网站的第一个请求，将会在这里被调用！
mirrorNewWebsite = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsitePath 每新出现一个网站路径，关于这个网站路径的第一个请求，将会在这里被传入回调
mirrorNewWebsitePath = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsitePathParams 每新出现一个网站路径且带有一些参数，参数通过常见位置和参数名去重，去重的第一个 HTTPFlow 在这里被调用
mirrorNewWebsitePathParams = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}


# hijackHTTPRequest 每一个新的 HTTPRequest 将会被这个 HOOK 劫持，劫持后通过 forward(modifed) 来把修改后的请求覆盖，如果需要屏蔽该数据包，通过 drop() 来屏蔽
# ATTENTION-DEMO:
#   hijacked = str.ReplaceAll(string(req), "abc", "bcd")
#       1. forward(hijacked)：确认转发
#       2. drop() 丢包
#       3. 如果 forward 和 drop 都没有被调用，则使用默认数据流
#       4. 如果 drop 和 forward 在一个劫持中都被调用到了，以 drop 为准
/*
# Demo2 Best In Practice
hijackHTTPRequest = func(isHttps, url, req, forward, drop) {
    if str.Contains(string(req), "/products/plugins/plugin_11") {
        forward(str.ReplaceAll(string(req), "/products/plugins/plugin_11", "/products/plugins/plugin_create"))
    } 

    if str.Contains(string(req), "/products/plugins/plugin_12") {
        drop()
    } 
}
*/
hijackHTTPRequest = func(isHttps, url, req, forward /*func(modifiedRequest []byte)*/, drop /*func()*/) {

}
`
