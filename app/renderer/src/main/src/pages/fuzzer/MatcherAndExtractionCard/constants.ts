import {TableCellToColorTag} from "@/components/TableVirtualResize/utils"
import {HTTPResponseExtractor, HTTPResponseMatcher} from "./MatcherAndExtractionCardType"

/**@name 过滤器模式 */
export const filterModeOptions = (t: (text: string) => string) => {
    return [
        {
            value: "drop",
            label: t("MatcherCollapse.discard")
        },
        {
            value: "match",
            label: t("MatcherCollapse.match")
        },
        {
            value: "onlyMatch",
            label: t("MatcherCollapse.onlyMatch")
        }
    ]
}

/**@name 条件关系 */
export const matchersConditionOptions = [
    {
        value: "and",
        label: "AND"
    },
    {
        value: "or",
        label: "OR"
    }
]
export const defaultSubMatcherItem: HTTPResponseMatcher = {
    MatcherType: "word",
    ExprType: "nuclei-dsl",
    Scope: "request_body",
    Group: [""],
    Condition: "and",
    Negative: false,
    SubMatchers: [],
    SubMatcherCondition: "",
    GroupEncoding: "",
    HitColor: "",
    Action: "",
    filterMode: "onlyMatch"
}
export const defaultMatcherItem: HTTPResponseMatcher = {
    MatcherType: "",
    ExprType: "",
    Scope: "",
    Group: [""],
    Condition: "",
    Negative: false,
    // ---------
    SubMatchers: [
        {
            ...defaultSubMatcherItem
        }
    ],
    SubMatcherCondition: "and",
    GroupEncoding: "",
    HitColor: TableCellToColorTag["RED"],
    Action: "",
    filterMode: "onlyMatch"
}

export const defaultExtractorItem: HTTPResponseExtractor = {
    Type: "regex",
    Scope: "request_body",
    Groups: [""],
    // ---------
    Name: "data_0",
    RegexpMatchGroup: [],
    XPathAttribute: ""
}

export const matcherTypeList = (t: (text: string) => string) => {
    return [
        {label: t("MatcherCollapse.keyword"), value: "word"},
        {label: t("MatcherCollapse.regex"), value: "regex"},
        {label: t("MatcherCollapse.status_code"), value: "status_code"},
        {label: t("MatcherCollapse.hex"), value: "binary"},
        {label: t("MatcherCollapse.expression"), value: "expr"}
    ]
}

export const extractorTypeList = (t: (text: string) => string) => {
    return [
        {label: t("ExtractorItem.regex"), value: "regex"},
        {label: "XPath", value: "xpath"},
        {label: t("ExtractorItem.keyValuePair"), value: "kval"},
        {label: "JQ(*)", value: "json"},
        {label: t("ExtractorItem.expression"), value: "nuclei-dsl"}
    ]
}

export const ScopeList = (t: (text: string) => string) => {
    return [
        {label: t("MatcherItem.request_url"), value: "request_url"},
        {label: t("MatcherItem.request_header"), value: "request_header"},
        {label: t("MatcherItem.request_body"), value: "request_body"},
        {label: t("MatcherItem.all_requests"), value: "request_raw"},
    ]
}

export const defMatcherAndExtractionCode =
    "HTTP/1.1 200 OK\r\n" +
    "Date: Mon, 23 May 2005 22:38:34 GMT\r\n" +
    "Content-Type: text/html; charset=UTF-8\r\n" +
    "Content-Encoding: UTF-8\r\n" +
    "\r\n" +
    "<html>" +
    '<!doctype html>\n<html>\n<body>\n  <div id="result">%d</div>\n</body>\n</html>' +
    "</html>"


export const MatchersAndExtractorsUseInstructions = `## 常见场景

### 1. 如何判断响应延迟？（SQL 延时注入检测）

**场景**：检测 SQL 延时注入漏洞，判断响应时间是否超过 4 秒

**方法一：使用 DSL 表达式**
- 匹配类型：选择 \`dsl\`
- 表达式：\`duration > 4\`

\`\`\`yaml
matchers:
  - type: dsl
    dsl:
      - 'duration > 4'
\`\`\`

### 2. 如何判断响应中是否包含关键字？

**场景**：检测响应中是否包含 "admin" 关键字

**方法一：使用关键字匹配**
- 匹配类型：选择 \`word\`
- 匹配范围：选择 \`body\`（响应体）
- 关键字：填写 \`admin\`

\`\`\`yaml
matchers:
  - type: word
    scope: body
    words:
      - "admin"
\`\`\`

**方法二：使用 DSL 表达式**
- 匹配类型：选择 \`dsl\`
- 表达式：\`contains(body, "admin")\`

\`\`\`yaml
matchers:
  - type: dsl
    dsl:
      - 'contains(body, "admin")'
\`\`\`

### 3. 如何判断响应状态码？

**场景**：检测是否返回 200 或 201 状态码

**方法一：使用状态码匹配**
- 匹配类型：选择 \`status\`
- 状态码：填写 200 和 201

\`\`\`yaml
matchers:
  - type: status
    status:
      - 200
      - 201
\`\`\`

**方法二：使用 DSL 表达式**
- 匹配类型：选择 \`dsl\`
- 表达式：\`status_code == 200 || status_code == 201\`

\`\`\`yaml
matchers:
  - type: dsl
    dsl:
      - 'status_code == 200 || status_code == 201'
\`\`\`

### 4. 如何检测 SQL 注入错误回显？

**场景**：检测响应中是否包含 SQL 错误信息

**方法：使用关键字匹配（OR 条件）**
- 匹配类型：选择 \`word\`
- 匹配范围：选择 \`body\`
- 关键字：填写多个 SQL 错误关键字
- 条件：选择 \`or\`（任一匹配即可）

\`\`\`yaml
matchers:
  - type: word
    scope: body
    words:
      - "SQL syntax"
      - "mysql_fetch"
      - "ORA-"
      - "PostgreSQL"
    condition: or
\`\`\`

### 5. 如何检测请求中是否包含敏感参数？

**场景**：检测发送的请求体中是否包含密码字段

**方法：使用请求范围匹配**
- 匹配类型：选择 \`word\`
- 匹配范围：选择 \`request_body\`（请求体）
- 关键字：填写 \`password\`

\`\`\`yaml
matchers:
  - type: word
    scope: request_body
    words:
      - "password"
\`\`\`

### 6. 如何检测请求头中的认证信息？

**场景**：检测请求头中是否包含 Authorization

**方法：使用请求头匹配**
- 匹配类型：选择 \`word\`
- 匹配范围：选择 \`request_header\`（请求头）
- 关键字：填写 \`Authorization\`

\`\`\`yaml
matchers:
  - type: word
    scope: request_header
    words:
      - "Authorization"
\`\`\`

### 7. 如何检测访问了管理后台？

**场景**：检测请求 URL 中是否包含 /admin 路径

**方法一：使用请求 URL 匹配**
- 匹配类型：选择 \`word\`
- 匹配范围：选择 \`request_url\`
- 关键字：填写 \`/admin\`

\`\`\`yaml
matchers:
  - type: word
    scope: request_url
    words:
      - "/admin"
\`\`\`

**方法二：使用 DSL 表达式**
- 匹配类型：选择 \`dsl\`
- 表达式：\`contains(request_url, "/admin")\`

\`\`\`yaml
matchers:
  - type: dsl
    dsl:
      - 'contains(request_url, "/admin")'
\`\`\`

### 8. 如何检测 HTTPS 登录请求？

**场景**：检测使用 HTTPS 协议的登录请求

**方法：使用 DSL 组合条件**
- 匹配类型：选择 \`dsl\`
- 表达式：组合多个条件

\`\`\`yaml
matchers:
  - type: dsl
    dsl:
      - 'is_https == true'
      - 'contains(request_url, "/login")'
      - 'contains(request_body, "username")'
\`\`\`

### 9. 如何使用正则表达式匹配？

**场景**：检测响应中是否包含 Email 地址

**方法：使用正则匹配**
- 匹配类型：选择 \`regex\`
- 匹配范围：选择 \`body\`
- 正则表达式：填写 Email 正则

\`\`\`yaml
matchers:
  - type: regex
    scope: body
    regex:
      - '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'
\`\`\`

### 10. 如何组合多个条件？

**场景**：检测成功的管理员登录（状态码 200 且响应包含 admin）

**方法：使用 AND 条件组合**
- 条件关系：选择 \`and\`
- 添加多个匹配器

\`\`\`yaml
matchers-condition: and
matchers:
  - type: status
    status:
      - 200
  - type: word
    scope: body
    words:
      - "admin"
      - "success"
\`\`\`

## 匹配范围说明

### 响应范围
- **body** - 响应体内容
- **header** - 响应头
- **raw** - 完整响应包
- **status_code** - 状态码

### 请求范围
- **request_header** - 请求头内容
- **request_body** - 请求体内容
- **request_raw** - 完整请求包
- **request_url** - 请求 URL

## 附录：常用 DSL 表达式

### 时间判断
\`\`\`javascript
duration > 4                    // 响应时间大于 4 秒
duration >= 3 && duration <= 5  // 响应时间在 3-5 秒之间
\`\`\`

### 状态码判断
\`\`\`javascript
status_code == 200              // 状态码等于 200
status_code >= 400              // 4xx 或 5xx 错误
status_code >= 200 && status_code < 300  // 2xx 成功
\`\`\`

### 内容判断
\`\`\`javascript
contains(body, "error")         // 响应体包含 "error"
contains(body, "admin")         // 响应体包含 "admin"
contains(all_headers, "Set-Cookie")  // 响应头包含 Set-Cookie
\`\`\`

### 长度判断
\`\`\`javascript
content_length > 1000           // 响应长度大于 1000
len(body) > 0                   // 响应体不为空
len(body) < 100                 // 响应体小于 100 字节
\`\`\`

### 请求判断
\`\`\`javascript
is_https == true                // 使用 HTTPS 协议
contains(request_url, "/admin") // URL 包含 /admin
contains(request_headers, "Authorization")  // 请求头包含认证
contains(request_body, "password")  // 请求体包含密码
\`\`\`

### 头部判断
\`\`\`javascript
content_type == "application/json"  // JSON 响应
contains(server, "nginx")           // 服务器是 nginx
contains(server, "Apache")          // 服务器是 Apache
\`\`\`

### 组合条件
\`\`\`javascript
status_code == 200 && contains(body, "success")  // AND 条件
status_code == 200 || status_code == 201         // OR 条件
status_code == 200 && !contains(body, "error")   // NOT 条件
\`\`\`

### 常用函数
\`\`\`javascript
contains(str, substr)           // 包含判断
len(str)                        // 获取长度
to_lower(str)                   // 转小写
to_upper(str)                   // 转大写
regex("pattern", str)           // 正则匹配
\`\`\`

---

# 提取器使用说明

## 常见场景

### 1. 如何从响应中提取 Token？

**场景**：登录后从 JSON 响应中提取 access_token

**方法一：使用正则提取**
- 提取类型：选择 \`regex\`（正则表达式）
- 提取范围：选择 \`body\`（响应体）
- 变量名：填写 \`token\`
- 正则表达式：\`"access_token":"([^"]+)"\`
- 捕获组：填写 \`1\`

\`\`\`yaml
extractors:
  - name: token
    type: regex
    scope: body
    regex:
      - '"access_token":"([^"]+)"'
    group: 1
\`\`\`

**方法二：使用 JSON 提取**
- 提取类型：选择 \`json\`
- 提取范围：选择 \`body\`
- 变量名：填写 \`token\`
- JSONPath：\`.access_token\`

\`\`\`yaml
extractors:
  - name: token
    type: json
    scope: body
    json:
      - '.access_token'
\`\`\`

### 2. 如何从请求头中提取 API Key？

**场景**：从发送的请求头中提取 X-API-Key 的值

**方法：使用正则提取请求头**
- 提取类型：选择 \`regex\`
- 提取范围：选择 \`request_header\`（请求头）
- 变量名：填写 \`api_key\`
- 正则表达式：\`X-API-Key: ([\\w-]+)\`
- 捕获组：填写 \`1\`

\`\`\`yaml
extractors:
  - name: api_key
    type: regex
    scope: request_header
    regex:
      - 'X-API-Key: ([\\w-]+)'
    group: 1
\`\`\`

### 3. 如何从 URL 中提取参数？

**场景**：从请求 URL 中提取 id 参数的值

**方法：使用正则提取 URL 参数**
- 提取类型：选择 \`regex\`
- 提取范围：选择 \`request_url\`
- 变量名：填写 \`user_id\`
- 正则表达式：\`id=(\\d+)\`
- 捕获组：填写 \`1\`

\`\`\`yaml
extractors:
  - name: user_id
    type: regex
    scope: request_url
    regex:
      - 'id=(\\d+)'
    group: 1
\`\`\`

### 4. 如何从请求体中提取用户名？

**场景**：从发送的表单数据中提取 username 字段

**方法：使用正则提取请求体**
- 提取类型：选择 \`regex\`
- 提取范围：选择 \`request_body\`（请求体）
- 变量名：填写 \`username\`
- 正则表达式：\`username=(\\w+)\`
- 捕获组：填写 \`1\`

\`\`\`yaml
extractors:
  - name: username
    type: regex
    scope: request_body
    regex:
      - 'username=(\\w+)'
    group: 1
\`\`\`

### 5. 如何提取 Cookie？

**场景**：从响应头中提取 Set-Cookie 的值

**方法：使用键值对提取**
- 提取类型：选择 \`kval\`（键值对）
- 提取范围：选择 \`header\`（响应头）
- 变量名：填写 \`session\`
- 键名：填写 \`Set-Cookie\`

\`\`\`yaml
extractors:
  - name: session
    type: kval
    scope: header
    kval:
      - 'Set-Cookie'
\`\`\`

### 6. 如何提取并编码数据？

**场景**：提取响应体并进行 Base64 编码

**方法：使用 DSL 表达式**
- 提取类型：选择 \`dsl\`
- 变量名：填写 \`encoded_data\`
- 表达式：\`base64(body)\`

\`\`\`yaml
extractors:
  - name: encoded_data
    type: dsl
    dsl:
      - 'base64(body)'
\`\`\`

### 7. 如何从 HTML 中提取标题？

**场景**：从 HTML 响应中提取页面标题

**方法：使用 XPath 提取**
- 提取类型：选择 \`xpath\`
- 提取范围：选择 \`body\`
- 变量名：填写 \`title\`
- XPath 表达式：\`//title/text()\`

\`\`\`yaml
extractors:
  - name: title
    type: xpath
    scope: body
    xpath:
      - '//title/text()'
\`\`\`

### 8. 如何提取多个字段？

**场景**：同时提取用户名和密码

**方法：使用多个提取器**

\`\`\`yaml
extractors:
  - name: username
    type: regex
    scope: request_body
    regex:
      - 'username=(\\w+)'
    group: 1
  
  - name: password
    type: regex
    scope: request_body
    regex:
      - 'password=(\\w+)'
    group: 1
\`\`\`

### 9. 如何在后续请求中使用提取的数据？

**场景**：第一个请求提取 token，第二个请求使用这个 token

\`\`\`yaml
http:
  # 第一步：登录并提取 token
  - method: POST
    path:
      - '{{RootURL}}/login'
    body: 'username=admin&password=pass'
    extractors:
      - name: token
        type: regex
        scope: body
        regex:
          - '"token":"([^"]+)"'
        group: 1
  
  # 第二步：使用提取的 token 访问 API
  - method: GET
    path:
      - '{{RootURL}}/api/data'
    headers:
      Authorization: 'Bearer {{token}}'
\`\`\`

### 10. 如何提取 JSON 嵌套字段？

**场景**：从嵌套的 JSON 中提取用户信息

**方法：使用 JSON 提取**
- 提取类型：选择 \`json\`
- 提取范围：选择 \`body\`
- JSONPath：使用点号访问嵌套字段

\`\`\`yaml
extractors:
  - name: user_name
    type: json
    scope: body
    json:
      - '.data.user.name'
  
  - name: user_email
    type: json
    scope: body
    json:
      - '.data.user.email'
\`\`\`

## 提取范围说明

### 响应范围
- **body** - 响应体内容
- **header** - 响应头
- **raw** - 完整响应包

### 请求范围
- **request_header** - 请求头内容
- **request_body** - 请求体内容
- **request_raw** - 完整请求包
- **request_url** - 请求 URL

## 正则捕获组说明

- \`group: 0\` - 提取整个匹配的内容
- \`group: 1\` - 提取第一个括号 \`()\` 内的内容
- \`group: 2\` - 提取第二个括号 \`()\` 内的内容

**示例**：
\`\`\`yaml
# 正则：user=(\\w+)&pass=(\\w+)
# 输入：user=admin&pass=123

- group: 0  # 提取 "user=admin&pass=123"
- group: 1  # 提取 "admin"
- group: 2  # 提取 "123"
\`\`\`

## 附录：常用 DSL 表达式

### 直接提取
\`\`\`javascript
body                    // 响应体
all_headers            // 所有响应头
status_code            // 状态码
request_url            // 请求 URL
request_body           // 请求体
request_headers        // 请求头
\`\`\`

### 编码转换
\`\`\`javascript
base64(body)           // Base64 编码
base64_decode(body)    // Base64 解码
url_encode(body)       // URL 编码
url_decode(body)       // URL 解码
hex_encode(body)       // 十六进制编码
hex_decode(body)       // 十六进制解码
\`\`\`

### 字符串处理
\`\`\`javascript
to_lower(body)         // 转小写
to_upper(body)         // 转大写
trim(body)             // 去除首尾空格
reverse(body)          // 反转字符串
\`\`\`

### 哈希计算
\`\`\`javascript
md5(body)              // MD5 哈希
sha1(body)             // SHA1 哈希
sha256(body)           // SHA256 哈希
\`\`\`

### 组合使用
\`\`\`javascript
base64(to_lower(body))         // 先转小写再编码
md5(request_body)              // 计算请求体的 MD5
to_upper(request_url)          // URL 转大写
\`\`\`

## 附录：常用正则表达式

### 提取数字
\`\`\`regex
\\d+                    // 一个或多个数字
\\d{1,3}               // 1-3 个数字
\`\`\`

### 提取字母数字
\`\`\`regex
\\w+                    // 字母数字下划线
[a-zA-Z0-9]+          // 字母和数字
\`\`\`

### 提取引号内容
\`\`\`regex
"([^"]+)"             // 双引号内的内容
'([^']+)'             // 单引号内的内容
\`\`\`

### 提取 JSON 值
\`\`\`regex
"key":"([^"]+)"       // JSON 字符串值
"key":(\\d+)           // JSON 数字值
\`\`\`

### 提取 URL 参数
\`\`\`regex
param=([^&]+)         // 提取参数值
id=(\\d+)              // 提取 id 参数
\`\`\`

### 提取 Email
\`\`\`regex
[\\w.-]+@[\\w.-]+\\.\\w+  // Email 地址
\`\`\`

### 提取 IP 地址
\`\`\`regex
\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}  // IPv4 地址
\`\`\`

### 提取 Token
\`\`\`regex
Bearer ([a-zA-Z0-9._-]+)  // Bearer Token
token[=:]([a-zA-Z0-9]+)   // token 值
\`\`\`

### 提取 HTML 标签内容
\`\`\`regex
<title>([^<]+)</title>    // 标题内容
<a[^>]*>([^<]+)</a>       // 链接文本
\`\`\`
`