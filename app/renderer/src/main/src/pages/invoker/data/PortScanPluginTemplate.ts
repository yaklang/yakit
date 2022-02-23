export const PortScanPluginTemplate = `# port scan plugin
yakit.AutoInitYakit()

/*
本插件定义的函数主要用于端口扫描的额外扩展

函数定义如下：
func(result *fp.MatchResult)

// 详细结构体定义与内容见模版结尾
// 这里最关键的是，如果对扫描出的结果有疑问，需要对 MatchResult 进行修改，应该直接
// 对变量.Field 进行修改。

DEMO:

handle = func(result) {
    if result.Fingerprint != nil {
        if result.Port == 80 && result.GetServiceName() == "" {
            result.Fingerprint.ServiceName = "http"
        }
    }
}

*/

handle = func(result /* *fp.MatchResult */) {
    // handle match result
    
}

/*
// 具体定义如下：
type palm/common/fp.(MatchResult) struct {
      Target: string  
      Port: int  
      State: fp.PortState  
      Reason: string  
      Fingerprint: *fp.FingerprintInfo  
  StructMethods(结构方法/函数): 
  PtrStructMethods(指针结构方法/函数): 
      func GetBanner() return(string) 
      func GetCPEs() return([]string) 
      func GetDomains() return([]string) 
      func GetHtmlTitle() return(string) 
      func GetProto() return(fp.TransportProto) 
      func GetServiceName() return(string) 
      func IsOpen() return(bool) 
      func String() return(string) 
}


type palm/common/fp.(FingerprintInfo) struct {
      IP: string  
      Port: int  
      Proto: fp.TransportProto  
      ServiceName: string  
      ProductVerbose: string  
      Info: string  
      Version: string  
      Hostname: string  
      OperationVerbose: string  
      DeviceType: string  
      CPEs: []string  
      Raw: string  
      Banner: string  
      CPEFromUrls: map[string][]*webfingerprint.CPE  
      HttpFlows: []*fp.HTTPFlow  
  StructMethods(结构方法/函数): 
  PtrStructMethods(指针结构方法/函数): 
      func FromRegexp2Match(v1: *regexp2.Match) 
}
*/

`