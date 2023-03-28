import React, {useState} from "react";
import {Form, Space} from "antd";
import {SelectOne} from "@/utils/inputUtil";
import {YakEditor} from "@/utils/editors";
import {AutoCard} from "@/components/AutoCard";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {useMemoizedFn} from "ahooks";
import {failed} from "@/utils/notification";

export interface ChaosMakerRuleImportProp {

}

export interface ChaosMakerRuleImportParams {
    RuleType: string
    Content: string
}

export const ChaosMakerRuleImport: React.FC<ChaosMakerRuleImportProp> = (props) => {
    const [params, setParams] = useState<ChaosMakerRuleImportParams>({
        RuleType: "suricata", Content: "",
    });

    const onSubmit = useMemoizedFn(() => {
        if (params.Content === "") {
            failed("规则内容为空")
            return
        }
    })

    return <AutoCard size={"small"} bordered={true} title={"导入流量规则"} extra={(
        <Space>
            <YakitButton>导入流量规则</YakitButton>
        </Space>
    )}>
        <Form
            onSubmitCapture={e => {
                e.preventDefault()

                onSubmit()
            }}
            layout={"vertical"}
        >
            <SelectOne label={"流量类型"} data={[
                {value: "suricata", text: "Suricata 流量规则"},
                {value: "http-request", text: "HTTP"},
                {value: "tcp", text: "TCP"},
                {value: "icmp", text: "ICMP"},
                {value: "linklayer", text: "链路层"},
            ]} setValue={RuleType => setParams({...params, RuleType})} value={params.RuleType}/>
            <Form.Item label={"规则"} style={{height: "100%"}} required={true}>
                <div style={{height: "300px"}}>
                    <YakEditor
                        type={"html"}
                        setValue={Content => setParams({...params, Content})}
                        value={params.Content}
                        noMiniMap={true}
                    />
                </div>
            </Form.Item>
        </Form>
    </AutoCard>
};