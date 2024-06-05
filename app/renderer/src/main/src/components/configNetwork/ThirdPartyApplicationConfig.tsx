import React, {useEffect, useState} from "react"
import {ThirdPartyApplicationConfig} from "@/components/configNetwork/ConfigNetworkPage"
import {Form, Space} from "antd"
import {InputItem} from "@/utils/inputUtil"
import {DemoItemSelectOne} from "@/demoComponents/itemSelect/ItemSelect"
import {DemoItemSwitch} from "@/demoComponents/itemSwitch/ItemSwitch"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {KVPair} from "@/models/kv"
import {SelectOptionsProps} from "@/demoComponents/itemSelect/ItemSelectType"
import {DefaultOptionType} from "antd/lib/select"
import {YakitAutoComplete} from "../yakitUI/YakitAutoComplete/YakitAutoComplete"
import { warn } from "@/utils/notification"

export interface ThirdPartyApplicationConfigProp {
    data?: ThirdPartyApplicationConfig
    onAdd: (i: ThirdPartyApplicationConfig) => void
    onCancel: () => void
    /**是否可输入 @default true */
    isCanInput?: boolean
    // 限制展示的 options
    showOptions?: string[]
}

export function getThirdPartyAppExtraParams(type: string) {
    switch (type) {
        case "openai":
        case "chatglm":
        case "moonshot":
            return [
                {label: "模型名称", key: "model"},
                {label: "第三方加速域名", key: "domain"},
                {label: "代理地址", key: "proxy"}
            ]
        default:
            return []
    }
}

export function getThirdPartyAppExtraParamValue(config: ThirdPartyApplicationConfig, key: string): string {
    return config.ExtraParams?.find((i) => i.Key === key)?.Value || ""
}

export function setThirdPartyAppExtraParamValue(
    config: ThirdPartyApplicationConfig,
    key: string,
    value: string
): ThirdPartyApplicationConfig {
    const newExtraParams = config.ExtraParams?.filter((j) => j.Key !== key) || []
    newExtraParams.push({Key: key, Value: value})
    return {...config, ExtraParams: newExtraParams}
}

export const ThirdPartyApplicationConfigForm: React.FC<ThirdPartyApplicationConfigProp> = (props) => {
    const {isCanInput = true,showOptions} = props
    const [existed, setExisted] = useState(props.data !== undefined)
    const [params, setParams] = useState<ThirdPartyApplicationConfig>(
        props?.data || {
            APIKey: "",
            Domain: "",
            Namespace: "",
            Type: "",
            UserIdentifier: "",
            UserSecret: "",
            WebhookURL: "",
            ExtraParams: [] as KVPair[]
        }
    )
    const [advanced, setAdvanced] = useState((params.ExtraParams?.length || 0) > 0 ? true : false)
    const [options, setOptions] = useState<DefaultOptionType[] | SelectOptionsProps[]>([
        {label: "ZoomEye", value: "zoomeye"},
        {label: "Shodan", value: "shodan"},
        {label: "Hunter", value: "hunter"},
        {label: "Quake", value: "quake"},
        {label: "Fofa", value: "fofa"},
        {label: "OpenAI", value: "openai"},
        {label: "Chatglm", value: "chatglm"},
        {label: "Moonshot", value: "moonshot"},
    ])

    useEffect(()=>{
        if(showOptions){
           const newOptions = (options as unknown as any).filter((item)=>showOptions.includes(item.value))
           setOptions(newOptions)
        }
    },[showOptions])
    return (
        <Form
            layout={"horizontal"}
            labelCol={{span: 5}}
            wrapperCol={{span: 18}}
            onSubmitCapture={(e) => {
                e.preventDefault()
            }}
        >
            {isCanInput ? (
                <Form.Item label={"类型"} required={true}>
                    <YakitAutoComplete
                        options={options}
                        value={params.Type}
                        onChange={(val) => setParams({...params, Type: val})}
                        disabled={existed}
                    />
                </Form.Item>
            ) : (
                <DemoItemSelectOne
                    label={"类型"}
                    data={options as SelectOptionsProps[]}
                    value={params.Type}
                    disabled={existed}
                    setValue={(val) => setParams({...params, Type: val})}
                    required={true}
                />
            )}
            <InputItem
                label={"API Key"}
                value={params.APIKey}
                setValue={(val) => setParams({...params, APIKey: val})}
                help={"APIKey / Token"}
                required={true}
            />
            <InputItem
                label={"用户信息"}
                value={params.UserIdentifier}
                setValue={(val) => setParams({...params, UserIdentifier: val})}
                help={"email / username"}
            />
            {getThirdPartyAppExtraParams(params.Type).length > 0 && (
                <DemoItemSwitch label={"其他信息"} value={advanced} setValue={setAdvanced} />
            )}

            {advanced &&
                getThirdPartyAppExtraParams(params.Type).map((i) => {
                    return (
                        <InputItem
                            label={i.label}
                            value={getThirdPartyAppExtraParamValue(params, i.key)}
                            setValue={(val) => {
                                setParams(setThirdPartyAppExtraParamValue(params, i.key, val))
                            }}
                        />
                    )
                })}
            <div style={{display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12}}>
                <YakitButton type='outline2' onClick={() => props.onCancel()}>
                    取消
                </YakitButton>
                <YakitButton type={"primary"} onClick={() => {
                    if(params.Type.length===0 || params.APIKey.length === 0){
                        warn(`请填入必要参数`)
                        return
                    }
                    props.onAdd(params)
                    }}>
                    确定添加
                </YakitButton>
            </div>
        </Form>
    )
}
