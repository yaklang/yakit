import React, {useState} from "react";
import {ThirdPartyApplicationConfig} from "@/components/configNetwork/ConfigNetworkPage";
import {Form, Space} from "antd";
import {InputItem} from "@/utils/inputUtil";
import {DemoItemSelectOne} from "@/demoComponents/itemSelect/ItemSelect";
import {DemoItemSwitch} from "@/demoComponents/itemSwitch/ItemSwitch";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";

export interface ThirdPartyApplicationConfigProp {
    data?: ThirdPartyApplicationConfig
    onAdd: (i: ThirdPartyApplicationConfig) => void;
    onCancel:()=>void
}

export const ThirdPartyApplicationConfigForm: React.FC<ThirdPartyApplicationConfigProp> = (props) => {
    const [existed, setExisted] = useState(props.data !== undefined);
    const [params, setParams] = useState<ThirdPartyApplicationConfig>(props?.data || {
        APIKey: "", Domain: "", Namespace: "", Type: "", UserIdentifier: "", UserSecret: "", WebhookURL: ""
    })
    const [advanced, setAdvanced] = useState(false);
    return <Form
        layout={"horizontal"} labelCol={{span: 4}} wrapperCol={{span: 20}}
        onSubmitCapture={e => {
            e.preventDefault()
        }}
    >
        <DemoItemSelectOne
            label={"类型"}
            data={[
                {label: "ZoomEye", value: "zoomeye"},
                {label: "Shodan", value: "shodan"},
                {label: "Hunter", value: "hunter"},
                {label: "Quake", value: "quake"},
                {label: "Fofa", value: "fofa"},
            ]}
            value={params.Type} disabled={existed}
            setValue={val => setParams({...params, Type: val})}
            required={true}
        />
        <InputItem
            label={"API Key"}
            value={params.APIKey} setValue={val => setParams({...params, APIKey: val})}
            help={"APIKey / Token"} required={true}
        />
        <InputItem
            label={"用户信息"} value={params.UserIdentifier}
            setValue={val => setParams({...params, UserIdentifier: val})}
            help={"email / username"}
        />
        <DemoItemSwitch
            label={"其他信息"}
            value={advanced} setValue={setAdvanced}
        />
        {
            advanced && <>
                <InputItem
                    label={"用户密码"} value={params.UserSecret}
                    setValue={val => setParams({...params, UserSecret: val})}
                />
                <InputItem
                    label={"命名空间"} value={params.Namespace}
                    setValue={val => setParams({...params, Namespace: val})}
                />
                <InputItem
                    label={"域"} value={params.Domain}
                    setValue={val => setParams({...params, Domain: val})}
                />
                <InputItem
                    label={"Webhook"} value={params.WebhookURL}
                    setValue={val => setParams({...params, WebhookURL: val})}
                />
            </>
        }
        <div style={{display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12}}>
            <YakitButton type='outline2' loading={false} onClick={() => props.onCancel()}>
                取消
            </YakitButton>
            <YakitButton type={"primary"} loading={false} onClick={() => props.onAdd(params)}>
                确定添加
            </YakitButton>
        </div>

    </Form>
};