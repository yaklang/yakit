import React, {useState} from "react";
import {AutoCard} from "@/components/AutoCard";
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";
import {YakEditor} from "@/utils/editors";
import {Alert, Form} from "antd";
import {getDefaultSpaceEngineStartParams, SpaceEngineStartParams} from "@/models/SpaceEngine";
import {isRegisteredLanguage} from "@/utils/monacoSpec/spaceengine";
import {DemoItemSwitch} from "@/demoComponents/itemSwitch/ItemSwitch";
import {InputInteger, InputItem} from "@/utils/inputUtil";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {DemoItemSelectOne} from "@/demoComponents/itemSelect/ItemSelect";

export interface SpaceEngineOperatorProp {

}

export const SpaceEngineOperator: React.FC<SpaceEngineOperatorProp> = (props) => {
    const [params, setParams] = useState<SpaceEngineStartParams>(getDefaultSpaceEngineStartParams())
    const noEngine = params.Type === "";

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
                {noEngine && <Alert
                    type={"success"} description={"请先设置空间引擎"}
                    style={{marginBottom: 8}}
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