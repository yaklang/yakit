import React, {useState} from "react";
import {Form, Space} from "antd";
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {failed, yakitFailed} from "@/utils/notification";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm";

interface HTTPFuzzerHostInputProp {
    onAdd: (obj: { Key: string, Value: string }) => any
    onClose: () => any
}

export const inputHTTPFuzzerHostConfigItem = (handler: (obj: { Key: string, Value: string }) => any) => {
    const m = showYakitModal({
        title: "输入 DNS Hosts 配置",
        width: "500px", okButtonProps: {hidden: true}, cancelButtonProps: {hidden: true},
        content: (
            <div style={{marginLeft: 20, marginRight: 20, marginTop: 24}}>
                <HTTPFuzzerHostInput onAdd={handler} onClose={()=>{
                    m.destroy()
                }}/>
            </div>
        )
    })
}

const HTTPFuzzerHostInput: React.FC<HTTPFuzzerHostInputProp> = (props) => {
    const [params, setParams] = useState<{Key: string, Value: string}>({Key: "", Value: ""})

    return <Form
        labelCol={{span: 5}} wrapperCol={{span: 14}}
        size={"small"}
        onSubmitCapture={(e)=>{
            e.preventDefault()

            if (params.Key === "" || params.Value === "") {
                yakitFailed("域名不能为空")
                return
            }

            props.onAdd(params)
            props.onClose()
        }}
    >
        <Form.Item label={"域名"} required={true}>
            <YakitInput
                size={"small"} placeholder={"例如：oa.com"}
                value={params.Key}
                onChange={e => {
                    setParams({...params, Key: e.target.value})
                }}
            />
        </Form.Item>
        <Form.Item label={"IP"} required={true}>
            <YakitInput
                size={"small"} placeholder={"例如：10.0.0.1"} value={params.Value}
                onChange={e => {
                    setParams({...params, Value: e.target.value})
                }}
            />
        </Form.Item>
        <Form.Item label={" "} colon={false}>
            <Space>
                <YakitButton htmlType={"submit"}>添加</YakitButton>
                <YakitButton type={"danger"} onClick={()=>{
                    props.onClose()
                }}>取消</YakitButton>
            </Space>
        </Form.Item>
    </Form>
};