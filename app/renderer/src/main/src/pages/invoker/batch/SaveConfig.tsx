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
    Group: string
    Name: string
    QueryConfig: SimpleQueryYakScriptSchema
}

export const SaveConfig: React.FC<SaveConfigProp> = (props) => {
    const [params, setParams] = useState<BatchScanConfig>({Group: "", Name: "", QueryConfig: props.QueryConfig});
    return <div>
        <Form
            labelCol={{span: 5}} wrapperCol={{span: 14}}
            onSubmitCapture={e => {
                e.preventDefault()
                const filename = `config-${moment().format("YYYY-MM-DD-HH-mm-SS")}.json`
                saveABSFileToOpen(filename, JSON.stringify(params.QueryConfig))
                if (!!props.onSave) {
                    props.onSave(filename)
                }
            }}
        >
            <InputItem required={true} label={"一级菜单组"} setValue={Group => setParams({...params, Group})} value={params.Group}/>
            <InputItem required={true} label={"二级菜单"} setValue={Name => setParams({...params, Name})} value={params.Name}/>
            <Form.Item label={"内容"}>
                <div style={{height: 300}}>
                    <YakEditor type={"http"} readOnly={true} value={JSON.stringify(params.QueryConfig)}/>
                </div>
            </Form.Item>
            <Form.Item colon={false} label={" "}>
                <Button type="primary" htmlType="submit"> 保存到本地 </Button>
            </Form.Item>
        </Form>
    </div>
};