import React, {useEffect, useState} from "react";
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";
import {Form, Select, Space} from "antd";
import {ManyMultiSelectForString} from "@/utils/inputUtil";
import {PcapMetadata} from "@/models/Traffic";
import {AutoCard} from "@/components/AutoCard";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {randomString} from "@/utils/randomUtil";
import {failed, info} from "@/utils/notification";
import {useMemoizedFn} from "ahooks";
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect";
import {PacketListDemo} from "@/components/playground/PacketListDemo";

export interface PcapXDemoProp {

}

const {ipcRenderer} = window.require("electron");


interface PcapXRequest {
    NetInterfaceList: string[]
}

export const PcapXDemo: React.FC<PcapXDemoProp> = (props) => {
    const [pcapMeta, setPcapMeta] = useState<PcapMetadata>();
    const [token, setToken] = useState(randomString(40));
    const [loading, setLoading] = useState(false);

    const [firstRequest, setFirstRequest] = useState<PcapXRequest>({
        NetInterfaceList: []
    });

    useEffect(() => {
        ipcRenderer.invoke("GetPcapMetadata", {}).then((data: PcapMetadata) => {
            setPcapMeta(data)
            if (!!(data?.DefaultPublicNetInterface)) {
                setFirstRequest({...firstRequest, NetInterfaceList: [data.DefaultPublicNetInterface.Name]})
            }
        })
    }, [])

    useEffect(() => {
        if (!token) {
            return
        }
        ipcRenderer.on(`${token}-data`, async (e, data: any) => {

        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[PcapX] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("[PcapX] finished")
            setTimeout(() => setLoading(false), 300)
        })
        return () => {
            ipcRenderer.invoke("cancel-PcapX", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    const cancel = useMemoizedFn(() => {
        setToken(randomString(40))
        ipcRenderer.invoke("cancel-PcapX", token).finally(() => {
            setTimeout(() => setLoading(false), 300)
        })
    })

    const startSniff = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer.invoke("PcapX", {
            ...firstRequest,
        }, token)
    })

    return <YakitResizeBox
        firstNode={<AutoCard
            size={"small"} bordered={false} title={"设置参数"}
            extra={<Space>
                {loading ? <YakitButton
                    colors={"danger"}
                    onClick={() => {
                        cancel()
                    }}>
                    停止嗅探
                </YakitButton> : <YakitButton onClick={() => {
                    startSniff()
                }}>
                    开始嗅探
                </YakitButton>}
            </Space>}
            style={{marginTop: 3}}
        >
            <Form onSubmitCapture={e => {
                e.preventDefault()
            }} labelCol={{span: 5}} wrapperCol={{span: 14}} size={"small"}>
                <ManyMultiSelectForString data={(pcapMeta?.AvailablePcapDevices || []).map(i => ({
                    value: i.Name, label: `${i.Name} ${i.IP}`
                }))} label={"网卡"} setValue={(data) => {
                    setFirstRequest({...firstRequest, NetInterfaceList: data.split(",")})
                }} value={firstRequest.NetInterfaceList.join(",")} help={<div>
                    <>选择需要抓包的网卡：</>
                    {
                        pcapMeta?.DefaultPublicNetInterface && <>默认网卡: {pcapMeta?.DefaultPublicNetInterface}({
                            pcapMeta?.DefaultPublicNetInterface.Addr
                        })</>
                    }
                </div>}/>
            </Form>
        </AutoCard>}
        firstRatio={'300px'}
        secondNode={<div style={{overflow: "hidden", height: '100%', background: "#fcfcfc"}}>
            <PacketListDemo/>
        </div>}
    />
};