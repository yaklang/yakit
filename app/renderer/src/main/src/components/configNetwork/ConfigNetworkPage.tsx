import React, {useEffect, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {ManyMultiSelectForString, SelectOne, SwitchItem} from "@/utils/inputUtil"
import {Divider, Form, Popconfirm, Space} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {debugYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {yakitInfo} from "@/utils/notification"
import {AutoSpin} from "@/components/AutoSpin"
import {setTimeout} from "timers"
import {useMemoizedFn} from "ahooks"
import {setLogger} from "@grpc/grpc-js"

export interface ConfigNetworkPageProp {
    onClose: () => void
}

export interface GlobalNetworkConfig {
    DisableSystemDNS: boolean
    CustomDNSServers: string[]
    DNSFallbackTCP: boolean
    DNSFallbackDoH: boolean
    CustomDoHServers: string[]
}

const {ipcRenderer} = window.require("electron")

export const ConfigNetworkPage: React.FC<ConfigNetworkPageProp> = (props) => {
    const [mode, setMode] = useState<"dns" | "network">("dns")
    const [params, setParams] = useState<GlobalNetworkConfig>()
    const [loading, setLoading] = useState(false)

    const update = useMemoizedFn(() => {
        setLoading(true)
        setParams(undefined)
        ipcRenderer.invoke("GetGlobalNetworkConfig", {}).then((rsp: GlobalNetworkConfig) => {
            setTimeout(() => {
                setParams(rsp)
                setLoading(false)
            }, 500)
        })
    })
    useEffect(() => {
        update()
    }, [])

    return (
        <AutoCard>
            {!params && <AutoSpin>网络配置加载中...</AutoSpin>}
            {params && (
                <Form
                    size={"small"}
                    labelCol={{span: 5}}
                    wrapperCol={{span: 14}}
                    onSubmitCapture={(e) => {
                        e.preventDefault()

                        ipcRenderer.invoke("SetGlobalNetworkConfig", params).then(() => {
                            yakitInfo("更新配置成功")
                            update()
                        })
                    }}
                >
                    <Divider orientation={"left"} style={{marginTop:"0px"}}>DNS 配置</Divider>
                    <SwitchItem
                        label={"禁用系统 DNS"}
                        setValue={(DisableSystemDNS) => setParams({...params, DisableSystemDNS})}
                        value={params.DisableSystemDNS}
                        oldTheme={false}
                    />
                    <ManyMultiSelectForString
                        label={"备用 DNS"}
                        setValue={(CustomDNSServers) =>
                            setParams({...params, CustomDNSServers: CustomDNSServers.split(",")})
                        }
                        value={params.CustomDNSServers.join(",")}
                        data={[]}
                        mode={"tags"}
                    />
                    <SwitchItem
                        label={"启用 TCP DNS"}
                        setValue={(DNSFallbackTCP) => setParams({...params, DNSFallbackTCP})}
                        value={params.DNSFallbackTCP}
                        oldTheme={false}
                    />
                    <SwitchItem
                        label={"启用 DoH 抗污染"}
                        setValue={(DNSFallbackDoH) => setParams({...params, DNSFallbackDoH})}
                        value={params.DNSFallbackDoH}
                        oldTheme={false}
                    />
                    {params.DNSFallbackDoH && (
                        <ManyMultiSelectForString
                            label={"备用 DoH"}
                            setValue={(data) => setParams({...params, CustomDoHServers: data.split(",")})}
                            value={params.CustomDoHServers.join(",")}
                            data={[]}
                            mode={"tags"}
                        />
                    )}
                    <Form.Item colon={false} label={" "}>
                        <Space>
                            <YakitButton type='primary' htmlType='submit'>
                                更新全局网络配置
                            </YakitButton>
                            <YakitPopconfirm
                                title={"确定需要重置网络配置吗？"}
                                onConfirm={() => {
                                    ipcRenderer.invoke("ResetGlobalNetworkConfig", {}).then(() => {
                                        yakitInfo("重置配置成功")
                                    })
                                }}
                                placement="top"
                            >
                                <YakitButton type='outline1'> 重置网络配置 </YakitButton>
                            </YakitPopconfirm>
                        </Space>
                    </Form.Item>
                </Form>
            )}
        </AutoCard>
    )
}
