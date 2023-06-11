import React, {useState} from "react";
import {List, PageHeader, Spin, Table, Tooltip} from "antd";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {AutoCard} from "@/components/AutoCard";
import {ResizeBox} from "@/components/ResizeBox";
import {ChaosMakerRuleTable, QueryChaosMakerRulesRequest} from "@/pages/chaosmaker/ChaosMakerRuleTable";
import {CopyableField} from "@/utils/inputUtil";
import {showDrawer} from "@/utils/showModal";
import {ChaosMakerRuleImport} from "@/pages/chaosmaker/ChaosMakerRuleImport";
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin";

export interface ChaosMakerPageProp {

}

export interface ChaosMakerRule {
    Id: number;
    RawTrafficBeyondIpPacketBase64: string;
    RawTrafficBeyondLinkLayerBase64: string;
    RawTrafficBeyondHttpBase64: string;
    RuleType: string;
    SuricataRaw: string;
    Protocol: string;
    Action: string;
    Name: string;
    NameZh: string;
    ClassType: string;
    ClassTypeZh: string;
    Group: string;
    Keywords: string;
    KeywordsZh: string;
    Description: string;
    DescriptionZh: string;
    CVE: string[]
}

export interface ChaosMakerRuleGroup {
    Title: string
    Description: string
    Keywords: string
    Protocols: string[]
    Solution: string
}

const groups: ChaosMakerRuleGroup[] = [
    {
        "Title": "攻击 Struts2",
        "Description": "针对基于Java Web的Struts框架的应用程序的安全攻击，可能导致信息泄露、权限提升、远程代码执行等问题。",
        "Keywords": "struts",
        "Protocols": [
            "http",
        ],
        "Solution": "为了防止Java Web Struts攻击，请确保及时更新Struts框架至最新版本，遵循安全编码实践，对输入进行有效的验证与过滤，并定期进行安全审计。"
    },
    {
        "Title": "攻击 SpringCloud",
        "Description": "针对基于Java Web的SpringMVC框架的应用程序的安全攻击，可能导致信息泄露、权限提升、远程代码执行等问题。",
        "Keywords": "spring",
        "Protocols": [
            "http",
        ],
        "Solution": "为了防止Java Web SpringMVC框架攻击，请确保及时更新SpringMVC框架至最新版本，遵循安全编码实践，对输入进行有效的验证与过滤，并定期进行安全审计。"
    },
    {
        "Title": "ICMP 隧道回连",
        "Description": "ICMP隧道回连是一种利用ICMP协议的数据包在网络中建立隐蔽的通信通道的技术。攻击者可能利用这种技术绕过防火墙，实现远程控制、数据泄露等目的。",
        "Keywords": "icmp",
        "Protocols": [
            "icmp"
        ],
        "Solution": "为了防止ICMP隧道回连攻击，建议采取以下措施：1. 限制ICMP流量，对出入口流量进行监控与过滤；2. 在网络边界部署防火墙，实施严格的安全策略；3. 增强内部网络安全，监控异常行为；4. 定期进行安全审计和渗透测试，检查系统漏洞。"
    },
    {
        "Title": "挖矿外连(DNS协议)",
        "Description": "DNS协议下挖矿外连是指攻击者利用DNS协议在受害者设备中植入恶意挖矿程序，通过DNS请求将挖矿收益传输至攻击者的指定服务器，可能导致受害者设备资源被滥用、性能下降等问题。",
        "Keywords": "mine",
        "Protocols": [
            "dns"
        ],
        "Solution": "为了防止DNS协议下挖矿外连攻击，建议采取以下措施：1. 安装并更新有效的安全防护软件，以便检测和移除恶意挖矿程序；2. 对DNS流量进行监控，分析异常请求和数据传输；3. 限制或禁止未经授权的设备访问内部网络；4. 增强DNS服务器安全，限制未经授权的DNS解析；5. 定期进行安全审计，检查系统漏洞。"
    },
    {
        "Title": "攻击协同办公套件",
        "Description": "对常见的OA系统万户Ezoffice、Tongda OA、红帆OA、Weaver e-bridge、FineReport、Weaver e-cology、Weaver e-office、Weaver e-mobile、YonYou NC等产品的历史漏洞进行攻击",
        "Keywords": "oa",
        "Protocols": [
            "http"
        ],
        "Solution": "及时升级软件版本：对于已知的漏洞,协同办公软件厂商通常会发布修复程序,用户应该及时升级软件版本以避免漏洞被攻击者利用。配置安全策略：协同办公软件一般包括许多功能和模块,用户可以根据自身需求和安全要求配置相应的安全策略,例如禁止外网访问、限制文件上传大小、配置防火墙等。"
    },
    {
        "Title": "攻击 大数据平台",
        "Description": "对常见的大数据平台比如hadoop(HDFS、hbase、hive、zookeeper)、spark、kafka、splunk、Apache Dubbo、OpenStack、Apache Flink、Elasticsearch历史漏洞进行攻击",
        "Keywords": "hdfs,hbase,hive,zookeeper,spark,kafka,splunk,dubbo,openstack,flink,elasticsearch",
        "Protocols": [],
        "Solution": "对于已知的漏洞,大数据平台的开发团队通常会发布修复程序,用户应该及时升级软件版本以避免漏洞被攻击者利用。启用访问控制：大数据平台包括许多组件和模块,用户可以根据自身需求和安全要求配置相应的访问控制策略,如限制访问IP、授权用户访问、配置防火墙等。"
    },
    {
        "Title": "攻击中间件服务器",
        "Description": "对常见的IIS、apache、Nginx、Weblogic、Tomcat 、jboss等进行历史漏洞进行攻击",
        "Keywords": "iis,apache,nginx,weblogic,tomcat,jboss",
        "Protocols": [],
        "Solution": "及时升级软件版本：对于已知的漏洞,Web服务器的开发团队通常会发布修复程序,用户应该及时升级软件版本以避免漏洞被攻击者利用。启用安全配置：Web服务器包括许多配置选项,用户应该根据自身需求和安全要求配置相应的安全策略,如关闭不必要的服务、启用HTTPS、配置访问控制等。"
    },
    {
        "Title": "攻击IOT设备",
        "Description": "对常见的IPCamera、iCatch摄像头、GoAhead摄像头、avtech摄像头、ACTI Camera、5MP Network Camera、海康威视摄像头等进行历史漏洞进行攻击",
        "Keywords": "camara,ipcamera,icatch,goadhead,avtech,acti,5mp,海康威视,hiwatch,hikvision",
        "Protocols": [],
        "Solution": "及时固件版本：对于已知的漏洞,设备厂商通常会发布补丁进行修复。尽量将设备部署在内网环境"
    },
    {
        "Title": "攻击邮件服务器",
        "Description": "对常见的exchange、亿邮、Coremail、anymacro、华为 anymail、webmail、zimbra等进行历史漏洞进行攻击",
        "Keywords": "mail,exchange",
        "Protocols": [],
        "Solution": ""
    }
] as ChaosMakerRuleGroup[];

export const ChaosMakerPage: React.FC<ChaosMakerPageProp> = (props) => {
    const [selected, setSelected] = useState<ChaosMakerRuleGroup[]>([]);
    const [loading, setLoading] = useState(false);

    if (loading) {
        return <YakitSpin spinning={loading}>
            <div style={{width: "100%", height: "100%"}}/>
        </YakitSpin>
    }

    return <div style={{display: "flex", flexDirection: "column", width: "100%", height: "100%"}}>
        <PageHeader style={{width: "100%"}} title={"Breach & Attack Simulator Playbook"} subTitle={"入侵与攻击模拟剧本管理"}
                    extra={<div>
                        <YakitButton onClick={() => {
                            const d = showDrawer({
                                title: "导入规则",
                                width: "70%",
                                maskClosable: false,
                                content: (
                                    <ChaosMakerRuleImport/>
                                )
                            })
                        }}>导入规则</YakitButton>
                    </div>}/>
        <div style={{flex: 1, backgroundColor: "#fff"}}>
            <ResizeBox
                firstMinSize={"400px"}
                firstRatio={"400px"}
                firstNode={
                    <List<ChaosMakerRuleGroup>
                        grid={{column: 2, gutter: 0}}
                        bordered={true}
                        dataSource={groups}
                        style={{borderRadius: "6px", backgroundColor: "#f5f5f5", paddingTop: 20, paddingBottom: 20}}
                        renderItem={(e: ChaosMakerRuleGroup) => {
                            const isSelected = selected.filter(i => i.Title === e.Title).length > 0;
                            return <List.Item style={{marginTop: 8, marginBottom: 8}} key={e.Title}>
                                <AutoCard title={<div style={{color: isSelected ? "#fff" : ""}}>
                                    {e.Title}
                                </div>} size={"small"} hoverable={true} style={{
                                    backgroundColor: isSelected ? "#F28B44" : "#eee",
                                    borderRadius: "6px", color: isSelected ? "#fff" : "",
                                    fontWeight: isSelected ? "bold" : "unset",
                                }} onClick={() => {
                                    if (isSelected) {
                                        setSelected(selected.filter(i => i.Title !== e.Title))
                                        return
                                    }
                                    setSelected([...selected, e])
                                }}>
                                    <div style={{
                                        maxWidth: "100%",
                                        maxHeight: "50px",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        lineHeight: "25px"
                                    }}>
                                        <Tooltip title={e.Description}>
                                            {e.Description}
                                        </Tooltip>
                                    </div>
                                </AutoCard>
                            </List.Item>
                        }}
                    >

                    </List>
                }
                secondNode={<ChaosMakerRuleTable groups={selected} onReset={() => {
                    setLoading(true)
                    setTimeout(() => setLoading(false), 500)
                }}/>}
            />
        </div>
    </div>
};