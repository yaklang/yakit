import React, {useEffect, useState} from "react";
import {AutoCard} from "@/components/AutoCard";
import {Col, Form, Input, Row, Space} from "antd";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {DeleteOutlined} from "@ant-design/icons";
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal";
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm";

export interface VariablesFormProp {
    HTTPResponse?: Uint8Array
}

const {ipcRenderer} = window.require("electron");
export const VariablesForm: React.FC<VariablesFormProp> = (props) => {
    const [variables, setVariables] = useState<{ Key: string; Value: string }[]>([
        {Key: "r1", Value: "{{rand_int(1000,9999)}}"},
        {Key: "r2", Value: "abc"},
    ])

    useEffect(() => {
        if (!variables || variables.length === 0) {
            setVariables([{Key: "r1", Value: "{{rand_str}}"}])
        }
    }, [variables])

    return <AutoCard
        title={<Space>
            <div>
                设置变量
            </div>
            <YakitButton
                type={"text"}
                onClick={() => {
                    ipcRenderer.invoke("RenderVariables", {
                        Params: variables,
                        HTTPResponse: props.HTTPResponse,
                    }).then((rsp: { Results: { Key: string, Value: string }[] }) => {
                        showYakitModal({
                            title: "渲染后变量内容",
                            content: (
                                <Space
                                    direction={"vertical"} style={{margin: 20}}
                                >
                                    {rsp.Results.map(data => {
                                        return <div>
                                            {data.Key}: {data.Value}
                                        </div>
                                    })}
                                </Space>
                            )
                        })
                    })
                }}
            >预览</YakitButton>
        </Space>}
        size={"small"} bodyStyle={{overflow: "auto", padding: 0}}>
        <Form
            style={{marginTop: 4}}
            labelCol={{span: 5}} wrapperCol={{span: 18}}
            size={"small"}
        >
            {variables.map((data, index) => {
                const isLastOne = index === variables.length - 1;
                const haveKey = data.Key !== "";
                return <Form.Item
                    label={"变量" + `${index}`}
                    style={{marginBottom: isLastOne ? undefined : 4}}
                    help={isLastOne ? <Space>
                        <YakitButton type={"outline1"} onClick={() => {
                            let varIndex = index + 1;
                            let newKey = "r" + `${varIndex}`;
                            while (variables.find((v) => v.Key === newKey)) {
                                varIndex++;
                                newKey = "r" + `${varIndex}`;
                            }
                            setVariables([...variables, {Key: newKey, Value: "{{rand_str}}"}])
                        }}>添加变量</YakitButton>
                    </Space> : undefined}
                >
                    <Row gutter={4}>
                        <Col span={8}>
                            <Input
                                placeholder={`变量名`}
                                value={data.Key}
                                onChange={(e) => {
                                    const newVariables = [...variables]
                                    newVariables[index].Key = e.target.value
                                    setVariables(newVariables)
                                }}
                            />
                        </Col>
                        <Col span={16}>
                            <Input
                                disabled={!haveKey}
                                placeholder={"abc, {{rand_str}}"}
                                value={data.Value}
                                onChange={(e) => {
                                    const newVariables = [...variables]
                                    newVariables[index].Value = e.target.value
                                    setVariables(newVariables)
                                }}
                                suffix={<DeleteOutlined style={{
                                    margin: 0, padding: 0,
                                    color: "red",
                                }} onClick={() => {
                                    setVariables(variables.filter((_, i) => i !== index))
                                }}/>}
                            />
                        </Col>
                    </Row>
                </Form.Item>
            })}
        </Form>
    </AutoCard>
};