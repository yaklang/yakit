export namespace OutputAsset {
    export const outputDomainByKeyword = `loglevel("info")
yakit.Info("Start to EXPORT Asset")

yakit.AutoInitYakit()

condition = cli.String("keyword")
if condition == "*" {
    condition = ""
}
domains, err = yakit.QueryDomainsByDomainKeyword(condition)
if err != nil {
    yakit.Error("Query Domains failed: %s", err)
    die(err)
}

/*
type palm/common/yakgrpc/yakit.(Domain) struct {
  Fields(可用字段): 
      Model: gorm.Model  
      Domain: string  
      IPAddr: string  
      IPInteger: int64  
      HTTPTitle: string  
      Hash: string  
  StructMethods(结构方法/函数): 
  PtrStructMethods(指针结构方法/函数): 
      func BeforeSave() return(error) 
      func CalcHash() return(string) 
      func FillDomainHTTPInfo() 
}
*/
fileName = sprintf("domain_%v_%v.csv", condition, time.Now().Format("2006_01_02-15_04"))
outputDir = str.PathJoin(yakit.GetHomeDir(), "exports/")
file.MkdirAll(outputDir)
fileActually = str.PathJoin(outputDir, fileName)
fp, err = file.Open(fileActually)
if err != nil {
    yakit.Info("Open %v failed: %v", fileActually, err)
    die(err)
}
defer fp.Close()

yakit.Info("Start to OUTPUT to: %v", fileActually)
/*
type palm/common/yak/yaklib.(_yakFile) struct {
  Fields(可用字段): 
  StructMethods(结构方法/函数): 
  PtrStructMethods(指针结构方法/函数): 
      func Close() return(error) 
      func GetOsFile() return(*os.File) 
      func Name() return(string) 
      func ReadAll() return([]uint8, error) 
      func ReadLines() return([]string) 
      func ReadString() return(string, error) 
      func Write(v1: interface {}) return(int, error) 
      func WriteLine(v1: interface {}) return(int, error) 
      func WriteString(v1: string) return(int, error) 
}
*/
fp.WriteLine("Domain,IP,HTTPTitle")
for domain = range domains {
    if domain.HTTPTitle == "" {
        domain.HTTPTitle = "-"
    }
    data = sprintf("%v,%v,%v", domain.Domain, str.ReplaceAll(domain.IPAddr, ",", "|"), str.TrimSpace(domain.HTTPTitle))
    fp.WriteLine(data)
}

yakit.File(fileActually, "Domain Assets", "Domain Assets：Domian,Address,HTTPTitle")`
    export const outputPortByNetwork = `yakit.AutoInitYakit()

# Input your code!
network = cli.String("network")
if network == "*" {
    network = ""
}

yakit.Info("Output Port Assets by Network: %v", network)
res, err = yakit.QueryPortAssetByNetwork(network)
if err != nil {
    yakit.Error("Query Network Assets failed: %v", err)
    die(err)
}

/*
type palm/common/yakgrpc/yakit.(Port) struct {
  Fields(可用字段): 
      Model: gorm.Model  
      Host: string  
      IPInteger: int  
      Port: int  
      Proto: string  
      ServiceType: string  
      State: string  
      Reason: string  
      Fingerprint: string  
      CPE: string  
      HtmlTitle: string  
      From: string  
      Hash: string  
  StructMethods(结构方法/函数): 
  PtrStructMethods(指针结构方法/函数): 
      func BeforeSave() return(error) 
      func CalcHash() return(string) 
}
*/

fileName := sprintf("ports_%v_%v.csv", network, time.Now().Format("2006_01_02-15-04"))
outputDir = str.PathJoin(yakit.GetHomeDir(), "exports/")
file.MkdirAll(outputDir)
fileActually = str.PathJoin(outputDir, fileName)
fp, err = file.Open(fileActually)
if err != nil {
    yakit.Error("Create %v failed: %v", fileActually, err)
    die(err)
}
defer fp.Close()

gendata = func(result) {
    // 127.0.0.1:22,tcp,htmlTitle,serviceType
    return sprintf("%v,%v,%v,%v", 
        str.HostPort(result.Host, result.Port), 
        result.Proto, 
        str.TrimSpace(x.If(result.HtmlTitle=="", "-", str.ReplaceAll(result.HtmlTitle, ",", "|"))),
        x.If(result.ServiceType=="", "-", str.ReplaceAll(result.ServiceType, ",", "|")),
    )
}
for result = range res {
    fp.WriteLine(gendata(result))
}

yakit.File(fileActually, "Port Assets", "Addr,Proto,HtmlTitle,ServiceType")`
}