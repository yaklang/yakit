import {ChatMarkdown} from "@/components/yakChat/ChatMarkdown"
import React from "react"
import styles from "./FingerprintManage.module.scss"

interface FingerprintRuleDomProp {}
export const FingerprintRuleDom: React.FC<FingerprintRuleDomProp> = (props) => {
    // 目录内容单独提取
    const toc = `
<ul>
  <li><a href="#intro">介绍</a></li>
  <li><a href="#operator">运算符</a>
    <ul>
      <li><a href="#relation-operator">关系运算符</a>
        <ul>
          <li><a href="#equal">包含 =</a></li>
          <li><a href="#not-equal">不包含 !=</a></li>
          <li><a href="#eq">等于 ==</a></li>
          <li><a href="#neq">不等于 !==</a></li>
          <li><a href="#regex">正则 ~=</a></li>
        </ul>
      </li>
      <li><a href="#logic-operator">逻辑运算符</a></li>
      <li><a href="#bracket">括号</a></li>
    </ul>
  </li>
  <li><a href="#variable">内置变量</a>
    <ul>
      <li><a href="#predefined-variable">预制变量</a></li>
      <li><a href="#runtime-variable">运行时变量</a></li>
    </ul>
  </li>
</ul>
    `.trim()

    const mdContent = `
<details open>
<summary id="intro"><strong style="font-size: 1.5em; text-transform: uppercase;">介绍</strong></summary>

新版指纹通过一条表达式实现，通过内置变量和运算符实现对流量匹配。

</details>

<details open>
<summary id="operator"><strong style="font-size: 1.5em; text-transform: uppercase;">运算符</strong></summary>

<details open>
<summary id="relation-operator"><strong style="font-size: 1.2em; text-transform: uppercase;">关系运算符</strong></summary>

<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;">
  <tr>
    <th>运算符</th>
    <th>名称</th>
    <th>类型要求</th>
    <th>运算逻辑</th>
    <th>示例</th>
  </tr>
  <tr>
    <td>=</td>
    <td>包含</td>
    <td>字符串</td>
    <td>检测左操作数是否包含右操作数字符序列</td>
    <td>title = "Login"</td>
  </tr>
  <tr>
    <td>!=</td>
    <td>不包含</td>
    <td>字符串</td>
    <td>包含运算的逻辑取反</td>
    <td>body != "test"</td>
  </tr>
  <tr>
    <td>==</td>
    <td>等于</td>
    <td>类型敏感</td>
    <td>严格比较类型和值的完全相等</td>
    <td>port == 443</td>
  </tr>
  <tr>
    <td>!==</td>
    <td>不等于</td>
    <td>类型敏感</td>
    <td>等于运算的逻辑取反</td>
    <td>server !== "nginx"</td>
  </tr>
  <tr>
    <td>~=</td>
    <td>正则匹配</td>
    <td>字符串</td>
    <td>使用正则表达式模式进行匹配</td>
    <td>path ~= "^/api/"</td>
  </tr>
</table>

<details open>
<summary id="equal"><strong>包含 =</strong></summary>

包含运算有两个字符串类型的操作数，第一个操作数是一个变量名，第二个操作数为需要匹配的数据：如表达式\`title = "Hello"\` 等价于 \`contains(title,"Hello")\`，当 \`"Hello"\` 是变量 \`title\` 的子串时，表达式的值为 \`True\，否则为 \`False\`。

**注意：** 包含运算的操作数类型为字符串类型，当类型不匹配时，会强制转为字符串类型再进行匹配，如 \`port = 80\`在运算时，由于 port 和 80 都是数字类型，会自动转为 string 类型后进行比较。如 port 的值为 8080，那表达式的值会为 \`True\`，如果想精确匹配端口号需要使用 \`==\` 运算符，如 \`port == 80\`

</details>

<details open>
<summary id="not-equal"><strong>不包含 !=</strong></summary>

此运算符的值等价于对操作数进行包含运算再进行非运算，如表达式 \`title != "Hello"\`，等价于 \`title = "Hello"\` 运算的相反值。

</details>

<details open>
<summary id="eq"><strong>等于 ==</strong></summary>

此运算有两个操作数，第一个操作数是一个变量名，第二个操作数为需要匹配的数据，在匹配时先对操作数类型比较，再对值比较，如果都相等，则返回 \`True\`，否则返回 \`False\`

</details>

<details open>
<summary id="neq"><strong>不等于 !==</strong></summary>

此运算符的值等价于对操作数进行等于运算再进行非运算，如表达式 \`title !== "Hello"\`，等价于 \`title == "Hello"\` 运算的相反值。
**注意：** 需要注意区分不等于和不包含，对于相同的操作数，如果不等于运算结果为 \`True\`，那么不包含一定为 \`True\`，反之则不成立。

</details>

<details open>
<summary id="regex"><strong>正则 ~=</strong></summary>

包含运算有两个操作数，第一个操作数是一个变量名，第二个操作数为需要匹配的数据：如表达式 \`title ~= "Hello"\` 等价于 re.Match\`(title,"Hello")\`，其中 \`"Hello"\` 是正则的pattern，如果匹配成功表达式的值为 \`True\`，否则为 \`False\`

</details>

</details>

<details open>
<summary id="logic-operator"><strong style="font-size: 1.2em; text-transform: uppercase;">逻辑运算符</strong></summary>

<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;">
  <tr>
    <th>运算符</th>
    <th>名称</th>
    <th>优先级</th>
    <th>运算逻辑</th>
  </tr>
  <tr>
    <td>&&</td>
    <td>逻辑与</td>
    <td>高</td>
    <td>双目运算，两个条件同时满足</td>
  </tr>
  <tr>
    <td>||</td>
    <td>逻辑或</td>
    <td>低</td>
    <td>双目运算，任一条件满足即可</td>
  </tr>
</table>

</details>

<details open>
<summary id="bracket"><strong style="font-size: 1.2em; text-transform: uppercase;">括号</strong></summary>

括号运算可以改变优先级

**案例：**

\`\`\`js
// 原始表达式
title = "mysql" || title = "sql" && body = "mysql"
// 实际执行顺序
(title = "sql" && body = "mysql") || title = "mysql"
// 使用括号改变优先级
(title = "mysql" || title = "sql") && body = "mysql"
\`\`\`

</details>

</details>

<details open>
<summary id="variable"><strong style="font-size: 1.5em; text-transform: uppercase;">内置变量</strong></summary>

<details open>
<summary id="predefined-variable"><strong style="font-size: 1.2em; text-transform: uppercase;">预制变量</strong></summary>

<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;">
  <tr>
    <th>变量名</th>
    <th>描述</th>
  </tr>
  <tr>
    <td>banner</td>
    <td>服务标识信息</td>
  </tr>
  <tr>
    <td>body</td>
    <td>消息体内容</td>
  </tr>
  <tr>
    <td>title</td>
    <td>页面标题</td>
  </tr>
  <tr>
    <td>header</td>
    <td>完整的HTTP头部字典</td>
  </tr>
  <tr>
    <td>server</td>
    <td>Server头部值</td>
  </tr>
  <tr>
    <td>port</td>
    <td>服务端口号</td>
  </tr>
  <tr>
    <td>protocol</td>
    <td>协议版本</td>
  </tr>
</table>

在开始匹配之前，对于http协议数据包会解析出下列变量：\`banner\`、\`body\`、\`title\`、\`header\`、\`server\`、\`port\`、\`protocol\`，可以直接在匹配表达式中使用。

**例如：**

\`\`\`c++
body = "ThinkPHP"
\`\`\`

</details>

<details open>
<summary id="runtime-variable"><strong style="font-size: 1.3em; text-transform: uppercase;">运行时变量</strong></summary>
运行时变量是根据变量名从数据包中提取数据的变量，这种变量名不确定。如变量 \`header_xxx\` 的值为 header 中的 xxx item 的值(忽略大小写)

如需要使用正则 \`Polylang(?: (Pro))?\` 匹配 header 中 X-redirected-by 字段的值，则编写为表达式为：\`header_X-redirected-by ~= Polylang(?: (Pro))\`

</details>

</details>
    `.trim()

    return (
        <div style={{height: 700, display: "flex"}}>
            <div
                style={{
                    width: 260,
                    minWidth: 180,
                    maxWidth: 320,
                    borderRight: "1px solid #eee",
                    padding: "8px",
                    background: "#fafbfc"
                }}
            >
                <div className={styles['toc-list']}>
                    <ChatMarkdown content={toc} />
                </div>
            </div>
            <div style={{flex: 1, padding: 24, overflowY: "auto"}}>
                <ChatMarkdown content={mdContent} />
            </div>
        </div>
    )
}
