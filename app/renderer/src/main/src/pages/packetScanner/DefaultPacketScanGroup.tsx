import React, {useState} from "react"
import {ByCursorMenuItemProps} from "@/utils/showByCursor"
import {Space} from "antd"
import {execPacketScan, execPacketScanFromRaw} from "@/pages/packetScanner/PacketScanner"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import styles from "./packetScanner.module.scss"

/**
 * @description 数据包扫描的默认菜单数据
 */
export const packetScanDefaultValue: {Verbose: string; Keyword?: string}[] = [
    {Verbose: "自定义", Keyword: undefined},
    {Verbose: "网络设备与OA系统", Keyword: "锐捷,若依,金和,金山,金蝶,致远,Seeyou,seeyou,通达,tonged,Tongda,银澎,浪潮,泛微,方维,帆软,向日葵,ecshop,dahua,huawei,zimbra,coremail,Coremail,邮件服务器"},
    {Verbose: "安全产品", Keyword: "防火墙,行为管理,绿盟,天擎,tianqing,防篡改,网御星云,安防,审计系统,天融信,安全系统"},
    {Verbose: "FastJSON", Keyword: "fastjson,FastJson,FastJSON"},
    {Verbose: "Log4j", Keyword: "Log4j,log4j,Log4shell,log4shell,Log4Shell"},
    {Verbose: "Weblogic", Keyword: "weblogic,Weblogic"},
    {Verbose: "远程代码执行（扫描）", Keyword: "RCE,rce"},
    {Verbose: "XSS", Keyword: "xss,XSS"},
]

export const GetPacketScanByCursorMenuItem = (id: number): ByCursorMenuItemProps => {
    return {
        title: "数据包扫描", onClick: () => {
        },
        subMenuItems: packetScanDefaultValue.map(i => {
            return {
                id:i.Keyword,
                title: i.Verbose, onClick: () => {
                    execPacketScan([id], i.Keyword)
                }
            }
        })
    }
}

export interface PacketScanButtonProp {
    packetGetter: () => { https: boolean, httpRequest: Uint8Array }
}

export const PacketScanButton: React.FC<PacketScanButtonProp> = (props) => {
    const [visible, setVisible] = useState<false | undefined>(undefined);
    return (
        <YakitPopover
            title={"数据包扫描"}
            trigger={["click"]}
            visible={visible}
            content={[
                <Space direction={"vertical"} style={{width: 150}}>
                    {packetScanDefaultValue.map((i,n) => {
                        return (
                            <YakitButton
                                themeClass={styles["yakit-button-theme"]}
                                className={styles["yakit-button-theme"]}
                                type='outline2'
                                onClick={() => {
                                    const {https, httpRequest} = props.packetGetter()
                                    setVisible(false)
                                    setTimeout(() => {
                                        setVisible(undefined)
                                    }, 300)
                                    execPacketScanFromRaw(https, httpRequest, i.Keyword)
                                }}
                                key={`${i.Verbose}+${n}`}
                            >
                                {i.Verbose}
                            </YakitButton>
                        )
                    })}
                </Space>
            ]}
        >
            <YakitButton size={"small"} type='outline2'>
                数据包扫描
            </YakitButton>
        </YakitPopover>
    )
}
