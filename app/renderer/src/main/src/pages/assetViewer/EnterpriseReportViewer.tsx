import React, {ReactNode, useEffect, useRef, useState} from "react"
import {failed} from "@/utils/notification"
import {Spin, Space, Tag} from "antd"
import {AutoCard} from "../../components/AutoCard"
import {} from "@ant-design/icons"
import styles from "./EnterpriseReportViewer.module.scss"
import classNames from "classnames"
import {useMemoizedFn} from "ahooks"
import {ReportItemRender} from "./reportRenders/render"
import {ReportItem} from "./reportRenders/schema"
const {ipcRenderer} = window.require("electron")

export interface EnterpriseReportItemRenderProps {}
export const EnterpriseReportItemRender: React.FC<EnterpriseReportItemRenderProps> = (props) => {
    return <div></div>
}
export const useInitEnterpriseReport = () => {
    const [reportItems, setReportItems] = useState<ReportItem[]>([])
    useEffect(()=>{
        const defaultEnterpriseReport: ReportItem[] = [
            {
                type: "markdown",
                content: `
# 1、项目概述
        
## 1.1 测试目的
                
本次安全测试是在公司授权下进行的，目的是分析网站系统安全现状，检测应用系统的漏洞和安全问题，从而全面了解和掌握应用系统的信息安全威胁和风险，为应用系统开展安全调优及加固建设提供依据，并指导实施调优及加固工作，具体的目标包括：帮助客户理解应用系统当前的安全状况，发现授权目标系统的安全漏洞；对所检测出的漏洞作出具体分析和加固建议。
                
## 1.2 安全测试原则
                
本次安全测试工作中严格遵循以下原则：
                
### 1.2.1 标准性原则
                
测试方案的设计和实施应依据行业、国家、国际的相关标准进行；
                
主要参考标准如下：
                
1. GB/T 20270-2006 信息安全技术 网络基础安全技术要求；
1. GB/T 20271-2006 信息安全技术 信息系统通用安全技术要求；
1. GB/T 20984-2007 信息安全技术 信息安全风险评估规范；
1. ISO 27001:2013 信息技术 安全技术 信息安全管理体系要求；
1. ISO 27002:2013 信息技术 安全技术 信息安全控制实用细则；
1. ISO 13335:2001信息技术 信息安全管理指南；
1. Cobit5:2012信息系统和技术控制目标；
1. IATF 16949:2016 信息保障技术框架。
                
### 1.2.2 规范性原则
                
服务提供商的工作过程和所有文档，应具有很好的规范性，以便于项目的跟踪和控制；
                
### 1.2.3 最小影响原则
                
测试工作应尽量避免影响系统和网络的正常运行，不对正常运行的系统和网络构成破坏和造成停产；
                
### 1.2.4 保密原则
                
测试的过程和结果应严格保密，不能泄露测试项目所涉及的任何打印和电子形式的有效数据和文件。
                
# 2、测试方法
                
## 2.1 概述
                
安全测试工作主要是对于已经采取了安全防护措施（安全产品、安全服务）或者即将采用安全防护措施的用户而言，明确网络当前的安全现状并对下一步的安全建设有重大的指导意义。渗透测试服务用于验证在当前的安全防护措施下网络、系统抵抗攻击者攻击的能力。
                
安全测试目的是发现网络、系统和应用层面存在的安全漏洞和隐患，并提出相应的整改建议。
                
## 2.2 风险等级说明
                
|  风险等级   | 等级划分依据  |
|  ----  | ----  |
| <font color="#da4943">严重</font>  | 1) 直接获取核心系统服务器权限的漏洞。包括但不仅限于核心系统服务器的任意命令执行、上传获取 WebShell、SQL 注入获取系统权限、远程代码执行漏洞等；<br/> 2) 严重的敏感信息泄露。包括但不仅限于重要数据的 SQL 注入（例如重要的账号密码）、包含敏感信息的源文件压缩包泄露。 |
| <font color="#d83931">高危</font>  | 1) 高风险的信息泄露，包括但不限于可以获取一般数据的 SQL 注入漏洞、源代码泄露以及任意文件读取和下载漏洞等；<br/> 2) 越权访问，包括但不限于绕过验证直接访问管理后台、后台登录弱口令、以及其它服务的弱口令等。 |
| <font color="#dc9b02">中危</font>  | 1) 需交互才能影响用户的漏洞。包括但不限于能够造成切实危害的存储型 XSS，重要的敏感操作 CSRF；<br/> 2) 普通信息泄露。包括但不仅限于获取用户敏感信息等；<br/> 3) 普通越权操作。包括但不仅限于越权查看非核心的信息、记录等；<br/> 4）普通逻辑设计缺陷。包括但不仅限于短信验证绕过、邮件验证绕过。 |
| <font color="#43ab42">低危</font>  | 1) 有一定价值的轻微信息泄露。比如 phpinfo、测试数据泄露等；<br/> 2) 逻辑设计缺陷。包括但不仅限于图形验证码绕过；<br/> 3）有一定轻微影响的反射型 XSS、URL 跳转、非重要的敏感操作 CSRF 漏洞等。 |
                
# 3、测试结果概述
                
## 3.1 总体安全现状
                
以下是本次测试的总体安全现状:
        
共扫描端口：【33】个，涉及主机：【1】个，每台主机涉及端口：【33】个
        
本次测试风险漏洞共【123】个，其中<font color='#da4943'>严重</font>漏洞有【0】个，<font color='#d83931'>高危</font>漏洞有【0】个，<font color='#dc9b02'>中危</font>漏洞有【0】个，<font color='#43ab42'>低危</font>漏洞有【123】个，附录含有漏洞详情，如有需求请及时修复。
        
#### 漏洞汇总
        
        
        `
            },
            {
                type: "bar-graph",
                content: `
        [{\"key\":\"严重漏洞\",\"value\":0},{\"key\":\"高危漏洞\",\"value\":0},{\"key\":\"中危漏洞\",\"value\":0},{\"key\":\"低危漏洞\",\"value\":123}]
                `,
                direction: false
            },
            {
                type: "markdown",
                content: `
## 3.2 端口扫描统计
        `
            },
            {
                type: "json-table",
                content: `
                {\"data\":[[\"8.210.89.159\",\"80\",\"http/nginx[1.20.1]\",\"Yu \\u0026 Mo\"],[\"8.210.89.159\",\"3306\",\"mysql/mysql[5.7.36]\",\"\"],[\"8.210.89.159\",\"22\",\"openssh[7.4]/ssh\",\"\"]],\"header\":[\"地址\",\"端口\",\"指纹\",\"网站标题\"]}
        `
            },
            {
                type: "markdown",
                content: `
## 3.3 弱口令风险统计
        
涉及扫描插件：1个
        `
            },
            {
                type: "json-table",
                content: `
                {\"data\":[[\"MySQL CVE 合规检查: 2016-2022\",\"加载成功\"]],\"header\":[\"插件名称\",\"扫描状态\"]}
        `
            },
            {
                type: "markdown",
                content: `
## 3.4 风险统计
        
### 3.4.1 漏洞统计列表
        
无漏洞信息
        
### 3.4.2 合规检查风险列表
        
合规检查是根据多年的经验， 通过扫描检查出危险系统及组件的版本。合规检查风险不是会造成实际损失的漏洞，可跟技术人员评估后，决定是否升级系统版本。
        `
            },
            {
                type: "json-table",
                content: `
                {\"data\":[[\"CVE-2016-0639:Oracle MySQL Server 远程代码执行漏洞(8.210.89.159:3306)\",\"8.210.89.159\",\"CVE基线检查\",\"低危\"],[\"CVE-2016-5507:Oracle MySQL Server 组件Dos漏洞(8.210.89.159:3306)\",\"8.210.89.159\",\"CVE基线检查\",\"低危\"],[\"CVE-2016-3486:Oracle MySQL Server 组件Dos漏洞(8.210.89.159:3306)\",\"8.210.89.159\",\"CVE基线检查\",\"低危\"],[\"CVE-2016-3492:Oracle MySQL Server Dos漏洞(8.210.89.159:3306)\",\"8.210.89.159\",\"CVE基线检查\",\"低危\"],[\"CVE-2016-3495:Oracle MySQL Server 组件Dos漏洞(8.210.89.159:3306)\",\"8.210.89.159\",\"CVE基线检查\",\"低危\"],[\"CVE-2016-3521:Oracle MySQL Server 组件Dos漏洞(8.210.89.159:3306)\",\"8.210.89.159\",\"CVE基线检查\",\"低危\"],[\"CVE-2016-3518:Oracle MySQL Server 组件Dos漏洞(8.210.89.159:3306)\",\"8.210.89.159\",\"CVE基线检查\",\"低危\"],[\"CVE-2016-6662:Oracle MySQL Server 远程代码执行/权限提升漏洞(8.210.89.159:3306)\",\"8.210.89.159\",\"CVE基线检查\",\"低危\"],[\"CVE-2016-6664:Oracle MySQL Server 权限提升漏洞(8.210.89.159:3306)\",\"8.210.89.159\",\"CVE基线检查\",\"低危\"],[\"CVE-2017-10155:Oracle MySQL Server DOS漏洞(8.210.89.159:3306)\",\"8.210.89.159\",\"CVE基线检查\",\"低危\"],[\"更多风险请在附录中查看\",\"\",\"\",\"\"]],\"header\":[\"漏洞标题\",\"地址\",\"漏洞类型\",\"漏洞级别\"]}
        `
            },
            {
                type: "markdown",
                content: `
# 4、后续整改建议
        
本次测试风险漏洞共123个，其中<font color='#da4943'>严重</font>漏洞有0个，<font color='#d83931'>高危</font>漏洞有0个，<font color='#dc9b02'>中危</font>漏洞有0个，<font color='#43ab42'>低危</font>漏洞有123个。整体安全防护良好。
        
# 附录：
        
## 漏洞详情与复现依据
        
暂无漏洞
        
## 合规检查风险详情
        
### 低危漏洞详情
        
#### CVE-2016-0639:Oracle MySQL Server 远程代码执行漏洞(8.210.89.159:3306)\n\n漏洞级别：low\n\n漏洞类型：CVE基线检查\n
        `
            },
        ]
        setReportItems(defaultEnterpriseReport)
    },[])
    
    return [reportItems] as const
}


export interface EnterpriseReportViewerProps {
    id?: number
}

export const EnterpriseReportViewer: React.FC<EnterpriseReportViewerProps> = (props) => {
    const {id} = props
    const [loading, setLoading] = useState<boolean>(false)
    
    const [reportItems] = useInitEnterpriseReport()
    useEffect(() => {
        // if ((props?.id || 0) <= 0) {
        //     return
        // }

        // setLoading(true)
        // ipcRenderer
        //     .invoke("QueryReport", {Id: id})
        //     .then((r) => {
        //         console.log("yakit报告结构", r)
        //         if (r) {
        //         }
        //     })
        //     .catch((e) => {
        //         failed(`Query Report[${id}] failed`)
        //     })
        //     .finally(() => setTimeout(() => setLoading(false), 300))
    }, [id])
    const downloadReport = useMemoizedFn(() => {})
    return (
        <div className={classNames(styles["enterprise-report-viewer"])}>
            <AutoCard
                size={"small"}
                bordered={false}
                loading={loading}
                title={<Space>{/* {report.Title} <Tag>{props.id}</Tag> */}</Space>}
                bodyStyle={{overflow: "auto", paddingLeft: 20}}
                extra={
                    <Space>
                        <a
                            href={"#"}
                            onClick={() => {
                                // showModal({
                                //     title: "RAW DATA",
                                //     content: (
                                //         <div style={{height: 300}}>
                                //             <YakEditor value={report.JsonRaw} />
                                //         </div>
                                //     ),
                                //     width: "50%"
                                // })
                            }}
                        >
                            RAW
                        </a>
                        <a
                            href={"#"}
                            onClick={() => {
                                downloadReport()
                            }}
                        >
                            下载
                        </a>
                    </Space>
                }
            >
                <Space direction={"vertical"} style={{width: "100%"}}>
                    {reportItems.map((i, index) => {
                        return <ReportItemRender item={i} key={index} />
                    })}
                </Space>
            </AutoCard>
        </div>
    )
}
