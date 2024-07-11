import React, {useEffect, useState} from "react";
import {AutoCard} from "@/components/AutoCard";
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";
import {YakEditor} from "@/utils/editors";
import {Alert, Form, Space} from "antd";
import {getDefaultSpaceEngineStartParams, SpaceEngineStartParams, SpaceEngineStatus} from "@/models/SpaceEngine";
import {isRegisteredLanguage} from "@/utils/monacoSpec/spaceengine";
import {DemoItemSwitch} from "@/demoComponents/itemSwitch/ItemSwitch";
import {InputInteger} from "@/utils/inputUtil";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {DemoItemSelectOne} from "@/demoComponents/itemSelect/ItemSelect";
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag";
import {AutoSpin} from "@/components/AutoSpin";
import {randomString} from "@/utils/randomUtil";
import useHoldingIPCRStream from "@/hook/useHoldingIPCRStream";
import {useMemoizedFn} from "ahooks";
import {PluginResultUI} from "@/pages/yakitStore/viewers/base";

export interface SpaceEngineOperatorProp {

}

const {ipcRenderer} = window.require("electron");

export const SpaceEngineOperator: React.FC<SpaceEngineOperatorProp> = (props) => {
    const [params, setParams] = useState<SpaceEngineStartParams>(getDefaultSpaceEngineStartParams())
    const [status, setStatus] = useState<SpaceEngineStatus>({
        Info: "",
        Raw: new Uint8Array,
        Remain: 0,
        Status: "",
        Type: "",
        Used: 0
    })
    const [statusLoading, setStatusLoading] = useState(false);
    const [statusFailed, setStatusFailed] = useState("");
    const [loading, setLoading] = useState(false);
    const noEngine = params.Type === "";
    const [token, setToken] = useState(randomString(50));
    const [infoState, {reset, setXtermRef}, xtermRef] = useHoldingIPCRStream(
        "FetchPortAssetFromSpaceEngine",
        "",
        token,
        () => {
            setTimeout(() => setLoading(false), 300)
        }
    )

    useEffect(() => {
        if (params.Type === "") {
            setStatus({Info: "", Raw: new Uint8Array, Remain: 0, Status: "", Type: "", Used: 0})
            return
        }

        const updateInfo = () => {
            setStatusLoading(true)
            ipcRenderer.invoke("GetSpaceEngineStatus", {
                Type: params.Type
            }).then((value: SpaceEngineStatus) => {
                setStatusFailed("")
                setStatus(value)
            }).catch(e => {
                setStatusFailed(`${e}`)
                setStatus({Info: "", Raw: new Uint8Array, Remain: 0, Status: "", Type: params.Type, Used: 0})
            }).finally(() => {
                setStatusLoading(false)
            })
        }
        updateInfo()
        const id = setInterval(updateInfo, 10000)
        return () => {
            clearInterval(id)
        }
    }, [params.Type])

    const cancel = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-FetchPortAssetFromSpaceEngine", token)
    })

    return <AutoCard
        style={{backgroundColor: "#fff"}}
        bodyStyle={{overflow: "hidden", padding: 0}}
    >
        <YakitResizeBox
            firstNode={<AutoCard
                title={<DemoItemSelectOne
                    label={"引擎"}
                    formItemStyle={{margin: 0, width: 180}}
                    data={[
                        {label: "ZoomEye", value: "zoomeye"},
                        {label: "Fofa", value: "fofa"},
                        {label: "Shodan", value: "shodan"},
                        {label: "不设置", value: ""},
                    ]}
                    setValue={Type => setParams({...params, Type})} value={params.Type}
                />} size={"small"}
                bodyStyle={{paddingLeft: 6, paddingRight: 4, paddingTop: 4, paddingBottom: 4}}
                extra={<Space>
                    <YakitButton disabled={loading} onClick={() => {
                        ipcRenderer.invoke("FetchPortAssetFromSpaceEngine", params, token).then(() => {
                            setLoading(true)
                        })
                    }}>执行</YakitButton>
                    <YakitButton danger={true} disabled={!loading} onClick={() => {
                        cancel()
                    }}>停止</YakitButton>
                </Space>}
            >
                {noEngine ? <Alert
                    type={"warning"} description={"请先设置空间引擎"}
                    style={{marginBottom: 8}}
                /> : <Alert
                    type={statusFailed === "" ? "success" : "error"} description={<div>
                    {statusFailed}
                    {status.Info}
                    {status.Used > 0 && <YakitTag>已用额度: {status.Used}</YakitTag>}
                    {status.Remain > 0 && <YakitTag>剩余额度: {status.Remain}</YakitTag>}
                    {statusLoading ? <AutoSpin spinning={true} size={"small"}/> : ""}
                </div>}
                />}
                {!noEngine &&
                    <Form layout={"vertical"} onSubmitCapture={e => (e.preventDefault())} disabled={params.Type === ""}>
                        <Form.Item label={"搜索条件"}>
                            <YakEditor
                                type={isRegisteredLanguage(params.Type) ? params.Type : "text"}
                                value={params.Filter}
                                setValue={(value) => (setParams({...params, Filter: value}))}
                            />
                        </Form.Item>
                        <DemoItemSwitch label={"扫描"} value={params.ScanBeforeSave} setValue={i => (
                            setParams({...params, ScanBeforeSave: i})
                        )}/>
                        <InputInteger label={"最大页数"} setValue={MaxPage => setParams({...params, MaxPage})}
                                      value={params.MaxPage}/>
                        <InputInteger label={"最大记录数"} setValue={MaxRecord => setParams({...params, MaxRecord})}
                                      value={params.MaxRecord}/>
                    </Form>}
            </AutoCard>}
            firstMinSize={`350px`}
            firstRatio={"350px"}
            secondNode={<div style={{width: "100%", height: "100%"}}>
                <PluginResultUI
                    results={infoState.messageState}
                    statusCards={infoState.statusState}
                    risks={infoState.riskState}
                    featureType={infoState.featureTypeState}
                    progress={infoState.processState}
                    feature={infoState.featureMessageState}
                    loading={loading} consoleHeight={"100%"}
                    onXtermRef={(ref) => setXtermRef(ref)}
                    cardStyleType={1}
                />
            </div>}
        />
    </AutoCard>
};