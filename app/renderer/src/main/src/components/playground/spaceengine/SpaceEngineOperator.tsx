import React, {useEffect, useState} from "react";
import {AutoCard} from "@/components/AutoCard";
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";
import {YakEditor} from "@/utils/editors";
import {Alert, Form} from "antd";
import {getDefaultSpaceEngineStartParams, SpaceEngineStartParams, SpaceEngineStatus} from "@/models/SpaceEngine";
import {isRegisteredLanguage} from "@/utils/monacoSpec/spaceengine";
import {DemoItemSwitch} from "@/demoComponents/itemSwitch/ItemSwitch";
import {InputInteger, InputItem} from "@/utils/inputUtil";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {DemoItemSelectOne} from "@/demoComponents/itemSelect/ItemSelect";
import {debugYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm";
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag";
import {AutoSpin} from "@/components/AutoSpin";
import {Uint8ArrayToString} from "@/utils/str";

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
    const noEngine = params.Type === "";

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
                extra={<>
                    <YakitButton>执行</YakitButton>
                </>}
            >
                {noEngine ? <Alert
                    type={"warning"} description={"请先设置空间引擎"}
                    style={{marginBottom: 8}}
                /> : <Alert
                    type={statusFailed === "" ? "success": "error"} description={<div>
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
            secondNode={<div>
                OP2
            </div>}
        />
    </AutoCard>
};