import React, {useState} from "react";
import {SimpleQueryYakScriptSchema} from "./QueryYakScriptParam";
import {Button, Form} from "antd";
import {InputItem} from "../../../utils/inputUtil";
import {YakEditor} from "../../../utils/editors";
import {saveABSFileToOpen} from "../../../utils/openWebsite";
import moment from "moment";

export interface SaveConfigProp {
    QueryConfig: SimpleQueryYakScriptSchema
    onSave: (filename: string) => any
}

export interface BatchScanConfig {
    group: string
    name: string
    query: SimpleQueryYakScriptSchema
}

export const SaveConfig: React.FC<SaveConfigProp> = (props) => {
    const [params, setParams] = useState<BatchScanConfig>({group: "", name: "", query: props.QueryConfig});
    return <div>
        <Form
            labelCol={{span: 5}} wrapperCol={{span: 14}}
            onSubmitCapture={e => {
                e.preventDefault()
                const filename = `config-${moment().format("YYYY-MM-DD-HH-mm-SS")}.json`
                saveABSFileToOpen(filename, JSON.stringify(params))
                if (!!props.onSave) {
                    props.onSave(filename)
                }
            }}
        >
            <InputItem required={true} label={"一级菜单组"} setValue={Group => setParams({...params, group: Group})}
                       value={params.group}/>
            <InputItem required={true} label={"二级菜单"} setValue={Name => setParams({...params, name: Name})}
                       value={params.name}/>
            <Form.Item label={"内容"}>
                <div style={{height: 300}}>
                    <YakEditor type={"http"} readOnly={true} value={JSON.stringify(params.query)}/>
                </div>
            </Form.Item>
            <Form.Item colon={false} label={" "}>
                <Button type="primary" htmlType="submit"> 保存到本地 </Button>
            </Form.Item>
        </Form>
    </div>
};