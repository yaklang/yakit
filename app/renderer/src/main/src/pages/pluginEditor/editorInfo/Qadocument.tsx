import React, {ReactElement, useMemo} from "react"
import image_1 from "@/assets/qa/image_1.png"
import image_2 from "@/assets/qa/image_2.png"
import image_3 from "@/assets/qa/image_3.png"
import image_4 from "@/assets/qa/image_4.png"
import image_5 from "@/assets/qa/image_5.png"
import image_6 from "@/assets/qa/image_6.png"
import image_7 from "@/assets/qa/image_7.png"
import image_8 from "@/assets/qa/image_8.png"
import image_9 from "@/assets/qa/image_9.png"
import image_10 from "@/assets/qa/image_10.png"
import image_11 from "@/assets/qa/image_11.png"
import image_12 from "@/assets/qa/image_12.png"
import image_13 from "@/assets/qa/image_13.png"
import image_14 from "@/assets/qa/image_14.png"
import image_15 from "@/assets/qa/image_15.png"
import image_16 from "@/assets/qa/image_16.png"
import image_17 from "@/assets/qa/image_17.png"
import image_18 from "@/assets/qa/image_18.png"
import image_19 from "@/assets/qa/image_19.png"
import image_20 from "@/assets/qa/image_20.png"
import image_21 from "@/assets/qa/image_21.png"
import styles from "./Qadocument.module.scss"
export interface QaDocumentInfo {
    label: string
    renderCont?: ReactElement
}
const qaDocumentList: QaDocumentInfo[] = [
    {
        label: "请检查插件是否正常发起请求",
        renderCont: (
            <div>
                <div>
                    <h2>报错</h2>
                    <div style={{textAlign: "center", margin: "5px 0"}}>
                        <img src={image_1} />
                    </div>
                </div>
                <div>
                    <h2>可能原因及修复方法1</h2>
                    <div>
                        插件确实没发起请求，可能是因为插件需要先检查指纹再发送请求。需要特殊的引擎来忽略这种报错。
                    </div>
                </div>
                <div>
                    <h2>可能原因及修复方法2</h2>
                    <div>缩进问题导致数据为是畸形的http数据包，无法发出去</div>
                    <div style={{textAlign: "center", margin: "5px 0"}}>
                        <img src={image_2} />
                    </div>
                </div>
                <div>
                    <h2>可能原因及修复方法3</h2>
                    <div>插件发起了请求，但是执行时报错了，此时要根据具体情况进行分析，例如：</div>
                    <div style={{textAlign: "center", margin: "5px 0"}}>
                        <img src={image_3} />
                    </div>
                    <div>根据代码分析，实际上这个插件写的非常不规范，发包时固定设置代理，这明显是不合理的：</div>
                    <div style={{textAlign: "center", margin: "5px 0"}}>
                        <img src={image_4} />
                    </div>
                    <div>将此行删掉即可。</div>
                </div>
            </div>
        )
    },
    {
        label: "代码判断过于宽松问题",
        renderCont: (
            <div>
                <div>
                    <h2>可能原因及修复方法1</h2>
                    <div>漏洞验证匹配的关键字不能直接出现在请求包里</div>
                </div>
                <div>
                    <h2>可能原因及修复方法2</h2>
                    <div>直接判断状态码为200，然后判断一个常见的字符串是否存在：</div>
                    <div style={{textAlign: "center", margin: "5px 0"}}>
                        <img src={image_5} />
                    </div>
                    <div>要将判断条件进行严格设置，例如：</div>
                    <ul className={styles["numbered-list"]}>
                        <li>多判断几个响应里有的内容，</li>
                        <li>如果是一段json，那么可以多判断包含的标点符号，比如一个字符串在json里应该是"string"</li>
                    </ul>
                    <div>例子：</div>
                    <div>飞企互联 FE业务协作平台任意文件读取漏洞</div>
                    <div>修改前：</div>
                    <div style={{textAlign: "center", margin: "5px 0"}}>
                        <img src={image_6} />
                    </div>
                    <div>修改后：</div>
                    <div style={{textAlign: "center", margin: "5px 0"}}>
                        <img src={image_7} />
                    </div>
                </div>
                <div>
                    <h2>可能原因及修复方法3</h2>
                    <div>
                        做命令执行的时候不要直接echo最好做一些计算，如果响应直接给请求给返回去字符串再怎么特殊也会误报的
                    </div>
                </div>
            </div>
        )
    },
    {
        label: "parseint",
        renderCont: (
            <div>
                <div>
                    <h2>报错</h2>
                    <div style={{textAlign: "center", margin: "5px 0"}}>
                        <img src={image_8} />
                    </div>
                </div>
                <div>
                    <h2>原因及修复方法</h2>
                    <div>不存在函数parseint，是函数名大小写不对。将所有的parseint改为parseInt即可。</div>
                    <div>例如：</div>
                    <div style={{textAlign: "center", margin: "5px 0"}}>
                        <img src={image_9} />
                    </div>
                    <div>改为：</div>
                    <div style={{textAlign: "center", margin: "5px 0"}}>
                        <img src={image_10} />
                    </div>
                </div>
            </div>
        )
    },
    {
        label: "cannot assign to type，this is extern-instance",
        renderCont: (
            <div>
                <div>
                    <h2>报错</h2>
                    <div style={{textAlign: "center", margin: "5px 0"}}>
                        <img src={image_11} />
                    </div>
                </div>
                <div>
                    <h2>原因及修复方法</h2>
                    <div>type是一个内置函数，但是定义了名为type的变量。将变量命名改为别的即可，例如改为typ。</div>
                    <div>例如：</div>
                    <div style={{textAlign: "center", margin: "5px 0"}}>
                        <img src={image_12} />
                    </div>
                    <div>改为：</div>
                    <div style={{textAlign: "center", margin: "5px 0"}}>
                        <img src={image_13} />
                    </div>
                </div>
            </div>
        )
    },
    {
        label: "The closure function expects to capture variable [null], but it was not found at the calling location",
        renderCont: (
            <div>
                <div>
                    <h2>报错</h2>
                    <div style={{textAlign: "center", margin: "5px 0"}}>
                        <img src={image_14} />
                    </div>
                </div>
                <div>
                    <h2>原因及修复方法</h2>
                    <div>null不是yak的关键字。应该修改为nil。</div>
                </div>
            </div>
        )
    },
    {
        label: "risk type invalid，will replace with `其他`",
        renderCont: (
            <div>
                <div>
                    <h2>报错</h2>
                    <div style={{textAlign: "center", margin: "5px 0"}}>
                        <img src={image_15} />
                    </div>
                </div>
                <div>
                    <h2>原因及修复方法</h2>
                    <div>
                        设置risk的类型现在有规范，只能使用合法的type。以下列出合法的risk
                        type（通常为英文），从其中选择合适的将risk.type参数替换即可。
                    </div>
                </div>
                <div>
                    <h2>合法的risk type</h2>
                    <div>SQL 注入 </div>
                    <ul>
                        <li>sqli</li>
                        <li>sqlinj</li>
                        <li>sql-inj</li>
                        <li>sqlinjection</li>
                        <li>sql-injection</li>
                    </ul>
                    <div>跨站脚本</div>
                    <ul>
                        <li>xss</li>
                    </ul>
                    <div>远程执行</div>
                    <ul>
                        <li>rce</li>
                        <li>rce-command</li>
                        <li>rce-code</li>
                    </ul>
                    <div>文件操作</div>
                    <ul>
                        <li>lfi</li>
                        <li>file-read</li>
                        <li>file-download</li>
                        <li>rfi</li>
                        <li>file-write</li>
                        <li>file-upload</li>
                    </ul>
                    <div>其他注入类型</div>
                    <ul>
                        <li>xxe</li>
                        <li>ssti</li>
                    </ul>
                    <div>序列化问题</div>
                    <ul>
                        <li>unserialize</li>
                        <li>deserialization</li>
                    </ul>
                    <div>访问控制</div>
                    <ul>
                        <li>unauth-access</li>
                        <li>未授权访问</li>
                        <li>authentication-bypass</li>
                        <li>privilege-escalation</li>
                    </ul>
                    <div>信息泄露</div>
                    <ul>
                        <li>path-traversal</li>
                        <li>info-exposure</li>
                        <li>information-exposure</li>
                    </ul>
                    <div>配置与凭证问题</div>
                    <ul>
                        <li>insecure-default</li>
                        <li>weak-pass</li>
                        <li>weak-password</li>
                        <li>weak-credential</li>
                        <li>弱口令</li>
                    </ul>
                    <div>逻辑漏洞</div>
                    <ul>
                        <li>logic</li>
                    </ul>
                    <div>安全测试</div>
                    <ul>
                        <li>compliance-test</li>
                        <li>cve-baseline</li>
                    </ul>
                    <div>服务端请求伪造</div>
                    <ul>
                        <li>ssrf</li>
                    </ul>
                    <div>跨站请求伪造</div>
                    <ul>
                        <li>csrf</li>
                    </ul>
                    <div>反连检测</div>
                    <ul>
                        <li>random-port-trigger[tcp]</li>
                        <li>random-port-trigger[udp]</li>
                        <li>reverse</li>
                        <li>reverse-</li>
                        <li>reverse-tcp</li>
                        <li>reverse-tls</li>
                        <li>reverse-rmi</li>
                        <li>reverse-rmi-handshake</li>
                        <li>reverse-http</li>
                        <li>reverse-https</li>
                        <li>reverse-dns</li>
                        <li>reverse-ldap</li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        label: "risk.NewRisk should be called with (risk.description and risk.solution) or risk.cve",
        renderCont: (
            <div>
                <div>
                    <h2>报错</h2>
                    <div style={{textAlign: "center", margin: "5px 0"}}>
                        <img src={image_16} />
                    </div>
                </div>
                <div>
                    <h2>原因及修复方法</h2>
                    <div>
                        新建risk时，必须符合对应的规范，即同时设置了description（描述）与solution（解决方法），或者设置了此risk对应的cve编号。
                    </div>
                    <div>例如：</div>
                    <div style={{textAlign: "center", margin: "5px 0"}}>
                        <img src={image_17} />
                    </div>
                    <div>改为：</div>
                    <div style={{textAlign: "center", margin: "5px 0"}}>
                        <img src={image_18} />
                    </div>
                </div>
            </div>
        )
    },
    {
        label: "冒烟测试失败：YakVM Panic: slice call error, start index out of range",
        renderCont: (
            <div>
                <div>
                    <h2>报错</h2>
                    <div style={{textAlign: "center", margin: "5px 0"}}>
                        <img src={image_19} />
                    </div>
                </div>
                <div>
                    <h2>原因及修复方法</h2>
                    <div>数组越界。修复方法需要先检查长度，不能直接访问数组。</div>
                    <div>例如：</div>
                    <div style={{textAlign: "center", margin: "5px 0"}}>
                        <img src={image_20} />
                    </div>
                    <div>改为：</div>
                    <div style={{textAlign: "center", margin: "5px 0"}}>
                        <img src={image_21} />
                    </div>
                </div>
            </div>
        )
    }
]

export const qaDocumentLableList: string[] = qaDocumentList.map((item) => item.label)

interface QadocumentProps {
    label: string
}
export const Qadocument: React.FC<QadocumentProps> = React.memo((props) => {
    const {label} = props

    const renderCont = useMemo(() => {
        return qaDocumentList.find((item) => item.label === label)?.renderCont
    }, [label])

    return (
        <div className={styles["document-help-body"]}>
            <h1>{label}</h1>
            {renderCont}
        </div>
    )
})
