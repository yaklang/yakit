import React, {useEffect, useState} from "react";
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm";
import {failed} from "@/utils/notification";
import {AutoSpin} from "@/components/AutoSpin";
import {Alert, Space} from "antd";
import {AutoCard} from "@/components/AutoCard";
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin";

interface SmokingEvaluateProp {
    pluginName?: string
    pluginCode?: string
    pluginType?: string

    onResult?: (rsp: SmokingEvaluateResponse) => void
}

export interface SmokingEvaluateResult {
    Item: string
    Suggestion: string
    ExtraInfo: Uint8Array
}

export interface SmokingEvaluateResponse {
    Score: number
    Results: SmokingEvaluateResult[]
}

const {ipcRenderer} = window.require("electron");

const SmokingEvaluate: React.FC<SmokingEvaluateProp> = (props) => {
    const [pluginName, setPluginName] = useState(props.pluginName);
    const [code, setCode] = useState(props.pluginCode);
    const [pluginType, setPluginType] = useState(props.pluginType);
    const [loading, setLoading] = useState(true);
    const [response, setResponse] = useState<SmokingEvaluateResponse>();

    useEffect(() => {
        ipcRenderer.invoke("SmokingEvaluatePlugin", {
            PluginName: pluginName,
            PluginType: pluginType,
            Code: code,
        }).then((rsp: SmokingEvaluateResponse) => {
            if (props.onResult) {
                props.onResult(rsp)
            }
            setResponse(rsp)
        }).catch(e => {
            failed(`插件基础测试失败: ${e}`)
        }).finally(()=> {
            setLoading(false)
        })
    }, [])

    return <div>
        <Alert style={{marginBottom: 20}} type={"success"} message={<div>
            <p>插件基础检查项目包含如下测试项目：</p>
            <ol>
                <li>基础编译测试，判断语法是否符合规范，是否存在不正确语法</li>
                <li>把基础防误报服务器作为测试基准，防止条件过于宽松导致的误报</li>
                <li>检查插件执行过程是否会发生崩溃</li>
            </ol>
            <p>一般来说，测试将会在10-20s内结束</p>
        </div>}/>
        {loading ? <YakitSpin>
            正在进行插件基础评估
        </YakitSpin> : <Space direction={"vertical"}>
            {response && response.Results.map(i => {
                console.log(i)
                return <AutoCard title={i.Item} size={"small"} bordered={true}>
                    {i.Suggestion}
                </AutoCard>
            })}
            {response && (
                response.Score > 55 ? <div>
                    插件表现良好：基础分数 {response.Score}
                </div> : <div>
                    插件表现不佳：基础分数 {response.Score}
                </div>
            )}
            {!response && <div>
                插件基础评估失败，请检查插件是否存在语法错误
            </div>}
        </Space>}
    </div>
};

export const execSmokingEvaluatePlugin = (
    pluginName: string,
    callback?: (e: SmokingEvaluateResponse) => void,
) => {
    const m = showYakitModal({
        title: "插件基础测试",
        destroyOnClose: true,
        maskClosable: false,
        okButtonProps: {hidden: true},
        content: (
            <div style={{margin: 24}}>
                <SmokingEvaluate
                    onResult={rsp => {
                        if (callback) {
                            callback(rsp)
                        }
                        // m.destroy()
                    }}
                    pluginName={pluginName}
                />
            </div>
        )
    })
}

export const execSmokingEvaluateCode = (
    pluginType: string,
    pluginCode: string,
    callback?: (e: SmokingEvaluateResponse) => void,
) => {
    const m = showYakitModal({
        title: "插件基础测试",
        destroyOnClose: true,
        maskClosable: false,
        okButtonProps: {hidden: true},
        content: (
            <div style={{margin: 24}}>
                <SmokingEvaluate
                    onResult={rsp => {
                        if (callback) {
                            callback(rsp)
                        }
                        // m.destroy()
                    }}
                    pluginType={pluginType}
                    pluginCode={pluginCode}
                />
            </div>
        )
    })
}