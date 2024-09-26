import React from "react"
import {Typography, Space, Table} from "antd"
import {FuzzableParams} from "./HTTPFlowTable/HTTPFlowTable"
import {HTTPPacketFuzzable} from "./HTTPHistory"
import {YakitPopconfirm} from "./yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitButton} from "./yakitUI/YakitButton/YakitButton"
import {CopyComponents, YakitTag} from "./yakitUI/YakitTag/YakitTag"

const {ipcRenderer} = window.require("electron")
const {Text} = Typography

export interface FuzzableParamListProp extends HTTPPacketFuzzable {
    data: FuzzableParams[]
    sendToWebFuzzer?: () => any
}

export const FuzzableParamList: React.FC<FuzzableParamListProp> = (props) => {
    return (
        <Table<FuzzableParams>
            pagination={false}
            dataSource={props.data}
            rowKey={(row) => row.ParamName}
            columns={[
                {
                    title: "参数名",
                    render: (i: FuzzableParams) => (
                        <YakitTag closeIcon={<CopyComponents copyText={i.ParamName} />} closable>
                            <Text
                                style={{maxWidth: 150}}
                                ellipsis={{
                                    tooltip: true
                                }}
                            >
                                {i.ParamName}
                            </Text>
                        </YakitTag>
                    )
                },
                {
                    title: "参数位置",
                    render: (i: FuzzableParams) => (
                        <YakitTag>
                            <Text
                                style={{maxWidth: 250}}
                                ellipsis={{
                                    tooltip: true
                                }}
                            >
                                {i.Position}
                            </Text>
                        </YakitTag>
                    )
                },
                {
                    title: "参数原值",
                    render: (i: FuzzableParams) => (
                        <YakitTag
                            closeIcon={
                                <CopyComponents copyText={i.OriginValue ? new Buffer(i.OriginValue).toString() : ""} />
                            }
                            closable
                        >
                            <Text
                                style={{maxWidth: 450}}
                                ellipsis={{
                                    tooltip: (
                                        <div style={{maxHeight: 300, overflowY: "auto"}}>
                                            {i.OriginValue ? new Buffer(i.OriginValue).toString() : ""}
                                        </div>
                                    )
                                }}
                            >
                                {i.OriginValue ? new Buffer(i.OriginValue).toString() : ""}
                            </Text>
                        </YakitTag>
                    )
                },
                {title: "IsHTTPS", render: (i: FuzzableParams) => <YakitTag>{i.IsHTTPS + ""}</YakitTag>},
                {
                    title: "操作",
                    render: (i: FuzzableParams) => (
                        <Space>
                            <YakitPopconfirm
                                title={"测试该参数将会暂时进入 Web Fuzzer"}
                                onConfirm={(e) => {
                                    ipcRenderer.invoke("send-to-tab", {
                                        type: "fuzzer",
                                        data: {
                                            isHttps: i.IsHTTPS,
                                            request: new Buffer(i.AutoTemplate).toString("utf8")
                                        }
                                    })
                                    if (props.sendToWebFuzzer) props.sendToWebFuzzer()
                                }}
                            >
                                <YakitButton type={"primary"} size={"small"}>
                                    模糊测试该参数
                                </YakitButton>
                            </YakitPopconfirm>
                        </Space>
                    )
                }
            ]}
        ></Table>
    )
}
