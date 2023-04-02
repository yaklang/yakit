import React, {useState} from "react";
import {Empty, Form, Popconfirm, Space, Steps} from "antd";
import {randomString} from "@/utils/randomUtil";
import {ExecuteChaosMakerRuleRequest} from "@/pages/chaosmaker/ChaosMakerOperators";
import {InputInteger, SelectOne} from "@/utils/inputUtil";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import "./ChaosMakerRunningSteps.scss"
import useHoldingIPCRStream from "@/hook/useHoldingIPCRStream";
import {AutoCard} from "@/components/AutoCard";
import {PluginResultUI, StatusCardProps} from "@/pages/yakitStore/viewers/base";
import {StatisticCard} from "@ant-design/pro-card";
import {StatusCardViewer} from "@/pages/mitm/MITMYakScriptLoader";

export interface ChaosMakerRunningStepsProp {
    params?: ExecuteChaosMakerRuleRequest
}

const {ipcRenderer} = window.require("electron");

export const ChaosMakerRunningSteps: React.FC<ChaosMakerRunningStepsProp> = (props) => {
    const [token, setToken] = useState(randomString(20));
    const [step, setStep] = useState(0);
    const [params, setParams] = useState<ExecuteChaosMakerRuleRequest>(props.params || {
        Groups: [],
        ExtraOverrideDestinationAddress: [],
        ExtraRepeat: 1,
        TrafficDelayMinSeconds: 1,
        TrafficDelayMaxSeconds: 20,
        GroupGapSeconds: 1,
        Concurrent: 10,
    });
    const [msg, setMsg] = useState<string[]>([]);
    const [executing, setExecuting] = useState(false);

    const [infoState, {reset, setXtermRef}, xtermRef] = useHoldingIPCRStream(
        `ExecuteChaosMakerRule`,
        "ExecuteChaosMakerRule",
        token,
        () => {
            setExecuting(false)
            setStep(2)
        }
    )

    return <Space direction={"vertical"} style={{width: "100%"}}
    >
        {params && <Steps
            className={"chaos-maker-rule-step"}
            current={step}
        >
            <Steps.Step
                stepIndex={0} key={0} title={"参数"}
                description={<div>
                    设置额外参数 <br/>
                    准备观察过程
                </div>}
            />
            <Steps.Step stepIndex={1} key={1} title={"进行模拟攻击"} description={(
                <>
                    {
                        step === 1 && <Popconfirm
                            title={"确定要停止当前进程？"}
                            onConfirm={() => {
                                ipcRenderer.invoke("cancel-ExecuteChaosMakerRule", token)
                            }}
                        >
                            <YakitButton type={"danger"} onClick={() => {

                            }}>
                                停止模拟
                            </YakitButton>
                        </Popconfirm>

                    }
                </>
            )}/>
            <Steps.Step stepIndex={2} key={2} title={"模拟攻击报告"}/>
        </Steps>}
        {!params && <Empty description={"请您选中你想要执行的剧本规则"}/>}
        {step === 0 && <Form
            labelCol={{span: 5}} wrapperCol={{span: 14}}
            onSubmitCapture={e => {
                e.preventDefault()

                setStep(1)
                ipcRenderer.invoke("ExecuteChaosMakerRule", params, token)
            }}
        >
            <InputInteger label={"并发模拟数"} setValue={Concurrent => setParams({...params, Concurrent})}
                          value={params.Concurrent} help={"并发数越高，模拟攻击速度越快"}/>
            <SelectOne label={"重复模拟"} data={[
                {text: "无限重复", value: -1},
                {text: "不重复", value: 0},
                {text: "重复10次", value: 10},
            ]} setValue={ExtraRepeat => setParams({...params, ExtraRepeat})} value={params.ExtraRepeat}/>
            <InputInteger label={"剧本间隔"} help={"指在大类别的模拟攻击间隔的秒数"}
                          setValue={GroupGapSeconds => setParams({...params, GroupGapSeconds})}
                          value={params.GroupGapSeconds}/>
            <Form.Item colon={false} label={" "}>
                <YakitButton size={"max"} type="primary" htmlType="submit"> 执行模拟攻击剧本 </YakitButton>
            </Form.Item>
        </Form>}
        {step === 1 && <AutoCard style={{padding: 0, marginTop: 10, height: "100%"}} bordered={false} bodyStyle={{
            padding: 0, margin: 0,
        }}
        >
            <PluginResultUI
                debugMode={false} defaultConsole={false}
                results={infoState.messageState}
                progress={infoState.processState}
                risks={infoState.riskState}
                featureType={infoState.featureTypeState}
                feature={infoState.featureMessageState}
                statusCards={infoState.statusState}
                loading={executing}
                onXtermRef={setXtermRef}
            />
        </AutoCard>}
        {step === 2 && <AutoCard
            style={{padding: 0, marginTop: 10, height: "100%"}}
            bordered={false}
            bodyStyle={{
                padding: 0, margin: 0,
            }}
        >
            <StatusCardViewer status={(() => {
                const data: StatusCardProps[] = [];
                infoState.statusState.forEach((i) => {
                    i.info.map(i => {
                        data.push({
                            Id: i.Id, Data: i.Data, Timestamp: i.Timestamp,
                        })
                    })
                })
                return data
            })()}/>
        </AutoCard>}
    </Space>

};