import React from "react"
import styles from "./FingerprintManage.module.scss"
import { SafeMarkdown, StreamMarkdown } from "../assetViewer/reportRenders/markdownRender"

interface FingerprintRuleDomProp {}
export const FingerprintRuleDom: React.FC<FingerprintRuleDomProp> = (props) => {
    // 目录内容单独提取
    const toc = `
- [介绍](#介绍)
- [运算符](#运算符)
  - [关系运算符](#关系运算符)
    - [包含 =](#包含)
    - [不包含 !=](#不包含)
    - [等于 ==](#等于)
    - [不等于 !==](#不等于)
    - [正则 ~=](#正则)
  - [逻辑运算符](#逻辑运算符)
  - [括号](#括号)
- [内置变量](#内置变量)
  - [预制变量](#预制变量)
  - [运行时变量](#运行时变量)
    `.trim()

    const mdContent = `
    ## 介绍

新版指纹通过一条表达式实现，通过内置变量和运算符实现对流量匹配。

---

## 运算符

### 关系运算符

| 运算符 | 名称 | 类型要求 | 运算逻辑 | 示例 |
|------|------|------|------|------|
| = | 包含 | 字符串 | 检测左操作数是否包含右操作数字符序列 | title = "Login" |
| != | 不包含 | 字符串 | 包含运算的逻辑取反 | body != "test" |
| == | 等于 | 类型敏感 | 严格比较类型和值的完全相等 | port == 443 |
| !== | 不等于 | 类型敏感 | 等于运算的逻辑取反 | server !== "nginx" |
| ~= | 正则匹配 | 字符串 | 使用正则表达式模式进行匹配 | path ~= "^/api/" |

---

#### 包含=

包含运算有两个字符串类型的操作数，第一个操作数是一个变量名，第二个操作数为需要匹配的数据：如表达式\`title = "Hello"\` 等价于 \`contains(title,"Hello")\`，当 \`"Hello"\` 是变量 \`title\` 的子串时，表达式的值为 \`True\`，否则为 \`False\`。

**注意：** 包含运算的操作数类型为字符串类型，当类型不匹配时，会强制转为字符串类型再进行匹配，如 \`port = 80\`在运算时，由于 port 和 80 都是数字类型，会自动转为 string 类型后进行比较。如 port 的值为 8080，那表达式的值会为 \`True\`，如果想精确匹配端口号需要使用 \`==\` 运算符，如 \`port == 80\`

---

#### 不包含!=

此运算符的值等价于对操作数进行包含运算再进行非运算，如表达式 \`title != "Hello"\`，等价于 \`title = "Hello"\` 运算的相反值。

---

#### 等于==

此运算有两个操作数，第一个操作数是一个变量名，第二个操作数为需要匹配的数据，在匹配时先对操作数类型比较，再对值比较，如果都相等，则返回 \`True\`，否则返回 \`False\`

---

#### 不等于!==

此运算符的值等价于对操作数进行等于运算再进行非运算，如表达式 \`title !== "Hello"\`，等价于 \`title == "Hello"\` 运算的相反值。
**注意：** 需要注意区分不等于和不包含，对于相同的操作数，如果不等于运算结果为 \`True\`，那么不包含一定为 \`True\`，反之则不成立。

---

#### 正则~=

包含运算有两个操作数，第一个操作数是一个变量名，第二个操作数为需要匹配的数据：如表达式 \`title ~= "Hello"\` 等价于 re.Match\`(title,"Hello")\`，其中 \`"Hello"\` 是正则的pattern，如果匹配成功表达式的值为 \`True\`，否则为 \`False\`

---

### 逻辑运算符

| 运算符 | 名称 | 优先级 | 运算逻辑 |
|------|------|------|------|
| && | 逻辑与 | 高 | 两个条件同时满足 |
| &#124;&#124; | 逻辑或 | 低 | 任一条件满足即可 |

---

### 括号

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

---

## 内置变量

### 预制变量

| 变量名 | 描述 |
|------|------|
| banner | 服务标识信息 |
| body | 消息体内容 |
| title | 页面标题 |
| header | 完整 HTTP 头部字典 |
| server | Server 头部值 |
| port | 服务端口号 |
| protocol | 协议版本 |

在开始匹配之前，对于http协议数据包会解析出下列变量：\`banner\`、\`body\`、\`title\`、\`header\`、\`server\`、\`port\`、\`protocol\`，可以直接在匹配表达式中使用。

**例如：**

\`\`\`c++
body = "ThinkPHP"
\`\`\`

---

### 运行时变量

运行时变量是根据变量名从数据包中提取数据的变量，这种变量名不确定。如变量 \`header_xxx\` 的值为 header 中的 xxx item 的值(忽略大小写)

如需要使用正则 \`Polylang(?: (Pro))?\` 匹配 header 中 X-redirected-by 字段的值，则编写为表达式为：\`header_X-redirected-by ~= Polylang(?: (Pro))\`
`.trim()

    return (
        <div style={{height: 700, display: "flex"}}>
            <div
                style={{
                    width: 200,
                    borderRight: "1px solid var(--Colors-Use-Neutral-Border)",
                    padding: "8px",
                    background: "var(--Colors-Use-Basic-Background)"
                }}
            >
                <div className={styles["toc-list"]}>
                    <StreamMarkdown content={toc} />
                </div>
            </div>
            <div style={{flex: 1, padding: 24, overflowY: "auto"}}>
                <StreamMarkdown content={mdContent} />
            </div>
        </div>
    )
}
