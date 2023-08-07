import React from "react";

export const PortScanPluginTemplate: string = `/*
端口扫描插件在每一次端口扫描的时候将会执行

port-scan plugin is working on anytime a port scanned.
*/
handle = result => {
    // result is obj from servicescan
}

/*
// 判断端口是否开放？check if the port open
if result.IsOpen() {
    // do sth
}

// 如果端口大概是个 Web 服务的话，查看 Html Title？check html title for port(if website existed)
if result.GetHtmlTitle().Contains("login") {
    // do sth
}

// 如果端口是一个 web 服务，获取他的数据包信息? get the packet info for port(if website existed)
isHttps, request := result.GetRequestRaw()
response := result.GetResponseRaw()
result.Get


type *MatchResult struct {
  Fields(可用字段): 
      Target: string  
      Port: int  
      State: fp.PortState  
      Reason: string  
      Fingerprint: *fp.FingerprintInfo  
  Methods(可用方法): 
      func GetBanner() return(string) 
      func GetCPEs() return([]string) 
      func GetDomains() return([]string) 
      func GetHtmlTitle() return(string) 
      func GetProto() return(fp.TransportProto) 
      func GetServiceName() return(string) 
      func IsOpen() return(bool) 
      func GetRequestRaw() return(bool, []uint8) 
      func GetResponseRaw() return([]uint8)
      func GetFuzzRequest() return(*mutate.FuzzRequest)
}
*/

`

export const MITMPluginTemplate: string = `

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


`

export const NucleiPluginTemplate: string = `id: plugin-short-name
info:
  name: YourPluginName

requests:
  - raw:
    - |
      GET / HTTP/1.1
      Host: {{Hostname}}
      
      abc
    matchers:
    - type: word
      words:
        - "abc"
`