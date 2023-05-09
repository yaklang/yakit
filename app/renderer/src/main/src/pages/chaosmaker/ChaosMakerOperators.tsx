import React, {useEffect, useState} from "react";
import {Form, Space} from "antd";
import {AutoCard} from "@/components/AutoCard";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {ChaosMakerRuleGroup} from "@/pages/chaosmaker/ChaosMaker";
import {showModal} from "@/utils/showModal";
import {InputInteger, InputItem} from "@/utils/inputUtil";
import {failed} from "@/utils/notification";

const {ipcRenderer} = window.require("electron");

export interface ChaosMakerOperatorsProp {
    running?: boolean
    groups: ChaosMakerRuleGroup[]
    onExecute: (data: ExecuteChaosMakerRuleRequest) => any
    couldBeenReset?: boolean
    onReset?: () => any
}

export interface ExecuteChaosMakerRuleRequest {
    Groups: ChaosMakerRuleGroup[];
    ExtraOverrideDestinationAddress: string[];
    Concurrent: number;
    TrafficDelayMinSeconds: number;
    TrafficDelayMaxSeconds: number;
    ExtraRepeat: number;
    GroupGapSeconds: number;
}

export const ChaosMakerOperators: React.FC<ChaosMakerOperatorsProp> = (props) => {
    const [params, setParams] = useState<ExecuteChaosMakerRuleRequest>({
        Concurrent: 10,
        ExtraOverrideDestinationAddress: [],
        ExtraRepeat: -1,
        GroupGapSeconds: 5,
        Groups: [], TrafficDelayMaxSeconds: 0, TrafficDelayMinSeconds: 0
    });
    const [availableAddrs, setAvailableAddrs] = useState<IsRemoteAddrAvailableResponse[]>([]);

    useEffect(() => {
        setParams({...params, Groups: (props?.groups || [])})
    }, [props.groups])

    useEffect(() => {
        setParams({
            ...params, ExtraOverrideDestinationAddress: availableAddrs.map(i => {
                return i.Addr
            })
        })
    }, [availableAddrs])

    return <Form onSubmitCapture={e => {
        e.preventDefault()

    }} layout={"vertical"} disabled={props.running}>
        <Form.Item label={<div>
            设置发起任务的参数
        </div>} help={"如果添加探针，模拟攻击流量将会额外对探针进行发送"}>
            <Space>
                {availableAddrs.map(i => {
                    return <AutoCard
                        style={{
                            height: 40, width: 40, borderRadius: '6px',
                            backgroundColor: (() => {
                                switch (i.Status) {
                                    case "offline":
                                        return "#eee"
                                    case "online":
                                        return "#FFC085"
                                    default:
                                        return "#2BB5B4"
                                }
                            })(),
                            color: "#fff", fontWeight: "bold",
                        }}
                    >{i.Addr}[{(() => {
                        switch (i.Status) {
                            case "offline":
                                return "离线"
                            case "online":
                                return "在线"
                            default:
                                return "外部"
                        }
                    })()}]</AutoCard>
                })}
                <AutoCard style={{height: 40, width: 40, borderRadius: '6px'}}>
                    <YakitButton type={"text"} onClick={() => {
                        const m = showModal({
                            title: "添加一个新的 BAS 节点", width: "50%",
                            content: (
                                <AddBASAgent onFinished={(data) => {
                                    m.destroy()
                                    setAvailableAddrs([...availableAddrs, data])
                                }}/>
                            )
                        })
                    }}>添加探针</YakitButton>
                </AutoCard>
                {
                    props.couldBeenReset ? <AutoCard
                        style={{
                            height: 40, width: 40, borderRadius: '6px',
                            border: '1px solid var(--yakit-primary-5)',
                            backgroundColor: '#e01f1f',
                        }}
                        hoverable={true}
                        onClick={()=>{
                            if (props.onReset) {
                                props.onReset()
                            }
                        }}
                    >
                        <div style={{fontWeight: "bold", color: "#fff"}}>
                            重置 BAS 操作台
                        </div>
                    </AutoCard> : <AutoCard style={{
                        height: 40, width: 40, borderRadius: '6px',
                        border: '1px solid var(--yakit-primary-3)',
                        backgroundColor: '#F28B44',
                    }} hoverable={true} onClick={() => {
                        if (props.onExecute) {
                            props.onExecute(params)
                        }
                    }}>
                        <div style={{fontWeight: "bold", color: "#fff"}}>
                            配置模拟攻击参数
                        </div>
                    </AutoCard>
                }

            </Space>
        </Form.Item>
    </Form>
};

export interface AddBASAgentProp {
    onFinished: (rsp: IsRemoteAddrAvailableResponse) => any
}

interface IsRemoteAddrAvailableResponse {
    Addr: string;
    IsAvailable: boolean;
    Reason: string;
    Status: string;
}


export const AddBASAgent: React.FC<AddBASAgentProp> = (props) => {
    const [loading, setLoading] = useState(false);
    const [params, setParams] = useState<{
        Addr: string,
        Timeout: number,
        Probe: string
    }>({Addr: "", Timeout: 5, Probe: ""})
    const [response, setResponse] = useState<IsRemoteAddrAvailableResponse>();

    return <Form
        labelCol={{span: 5}} wrapperCol={{span: 14}}
        onSubmitCapture={e => {
            e.preventDefault()

            setLoading(true)
            ipcRenderer.invoke("IsRemoteAddrAvailable", params).then((data: IsRemoteAddrAvailableResponse) => {
                setResponse(data)
                if (data && !!props.onFinished) {
                    props.onFinished(data)
                }
            }).catch(e => {
                failed(`检测BAS节点失败：${e}`)
            }).finally(() => setTimeout(() => setLoading(false), 300))
        }}
    >
        <InputItem label={"需要导入的地址"} required={true} setValue={Addr => setParams({...params, Addr})}
                   value={params.Addr} disable={loading}/>
        <InputInteger label={"连接超时"} setValue={Timeout => setParams({...params, Timeout})} value={params.Timeout}
                      disable={loading}/>
        <Form.Item colon={false} label={" "}>
            <YakitButton type="primary" htmlType="submit" loading={loading}> 添加该节点 </YakitButton>
        </Form.Item>
    </Form>
};