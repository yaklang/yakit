import React, {useState} from "react";
import {Button, Form} from "antd";
import {InputItem} from "@/utils/inputUtil";
import {StringToUint8Array} from "@/utils/str";
import {failed} from "@/utils/notification";

export interface LoadYakitRemoteConfigProp {
    onLoad: (tls: boolean, host: string, port: string, publicKey: string, secret: string) => any
}

export const LoadYakitRemoteConfig: React.FC<LoadYakitRemoteConfigProp> = (props) => {
    const [raw, setRaw] = useState("");

    return <Form
        labelCol={{span: 5}} wrapperCol={{span: 14}}
        onSubmitCapture={e => {
            e.preventDefault()

            try {
                const obj = JSON.parse(raw);
                const base64pem = new Buffer(`${obj["pubpem"]}`, "base64");
                props.onLoad(
                    true,
                    `${obj["host"] || "127.0.0.1"}`,
                    `${obj["port"] || "8087"}`,
                    base64pem.toString("latin1"),
                    `${obj["secret"] || ""}`
                )
            } catch (e) {
                failed(`加载配置失败: ${e}`)
            }
        }}
    >
        <InputItem
            label={"配置信息"} textarea={true} allowClear={true} textareaRow={10}
            value={raw} setValue={setRaw}
        />
        <Form.Item colon={false} label={" "}>
            <Button type="primary" htmlType="submit"> 导入配置 </Button>
        </Form.Item>
    </Form>
};