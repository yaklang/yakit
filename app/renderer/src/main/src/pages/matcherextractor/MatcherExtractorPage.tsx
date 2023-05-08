import React, {useState} from "react";
import {Button, Col, PageHeader, Row, Space, Tag} from "antd";
import {AutoCard} from "@/components/AutoCard";
import {ResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";
import {HTTPPacketEditor} from "@/utils/editors";
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {MatcherForm, MatcherItem} from "@/pages/matcherextractor/MatcherForm";
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch";
import {VariablesForm} from "@/pages/matcherextractor/VariablesForm";
import {ExtractorForm, ExtractorItem} from "@/pages/matcherextractor/ExtractorForm";
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm";
import {failed} from "@/utils/notification";

export interface MatcherExtractorPageProp {

}

const {ipcRenderer} = window.require("electron");

export const MatcherExtractorPage: React.FC<MatcherExtractorPageProp> = (props) => {
    const [data, setData] = useState("HTTP/1.1 200 OK\r\n" +
        "Date: Mon, 23 May 2005 22:38:34 GMT\r\n" +
        "Content-Type: text/html; charset=UTF-8\r\n" +
        "Content-Encoding: UTF-8\r\n" +
        "\r\n" + "<html>" +
        "<!doctype html>\n<html>\n<body>\n  <div id=\"result\">%d</div>\n</body>\n</html>" +
        "</html>");
    const [matched, setMatched] = useState<boolean>();
    const [enableVars, setEnableVars] = useState<boolean>(false);

    return <AutoCard
        title={<Space>
            匹配提取调试
            <YakitSwitch checked={enableVars} onChange={setEnableVars}/>
        </Space>}
        bodyStyle={{overflow: "hidden", padding: 0}}
        size={"small"}
    >
        <div style={{height: "100%"}}>
            <ResizeBox
                isVer={true}
                firstNode={<AutoCard
                    size={"small"} bordered={false} bodyStyle={{padding: 0}}
                >
                    <Row gutter={6} style={{height: "100%"}}>
                        {enableVars && <Col span={6}>
                            <VariablesForm HTTPResponse={StringToUint8Array(data)}/>
                        </Col>}
                        <Col span={enableVars ? 18 : 24}>
                            <HTTPPacketEditor
                                noHeader={true}
                                originValue={StringToUint8Array(data)} onChange={e => setData(Uint8ArrayToString(e))}
                            />
                        </Col>
                    </Row>
                </AutoCard>}
                secondNode={<AutoCard
                    bodyStyle={{overflow: "auto", padding: 0}} size={"small"}
                    title={<Space>
                        <div>HTTP 响应调试器</div>
                        <Tag color={(() => {
                            if (matched === undefined) {
                                return "default"
                            }
                            return matched ? "success" : "error"
                        })()}>匹配状态：{(() => {
                            if (matched === undefined) {
                                return "未执行"
                            }
                            return matched ? "成功" : "失败"
                        })()}</Tag>
                    </Space>} bordered={false}
                >
                    <ResizeBox
                        isVer={false}
                        firstNode={<MatcherForm
                            onChange={(condition: string, matchers: MatcherItem[]) => {
                                setMatched(undefined)
                            }}
                            onExecute={(condition, matchers) => {
                                ipcRenderer.invoke("MatchHTTPResponse", {
                                    HTTPResponse: data,
                                    Matchers: matchers,
                                    MatcherCondition: condition,
                                }).then((data: { Matched: boolean }) => {
                                    setMatched(data.Matched)
                                })
                            }}/>}
                        secondNode={<ExtractorForm
                            onChange={extractors => {

                            }}
                            onExecute={extractors => {
                                ipcRenderer.invoke("ExtractHTTPResponse", {
                                    Extractors: extractors,
                                    HTTPResponse: data,
                                }).then((obj: { Values: { Key: string, Value: string }[] }) => {
                                    if (!obj) {
                                        failed("匹配不到有效结果")
                                        return
                                    }

                                    if ((obj?.Values || []).length <= 0) {
                                        failed("匹配不到有效结果")
                                        return
                                    }
                                    showYakitModal({
                                        title: "提取结果",
                                        width: "60%",
                                        content: (
                                            <Space style={{margin: 24}} direction={"vertical"}>
                                                {obj.Values.map(i => {
                                                    return `${i.Key}: ${i.Value}`
                                                })}
                                            </Space>
                                        )
                                    })
                                })
                            }}
                        />}
                    />
                </AutoCard>}
            />
        </div>
    </AutoCard>
};