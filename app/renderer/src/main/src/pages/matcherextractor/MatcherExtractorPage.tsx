import React, {useState} from "react";
import {Button, PageHeader, Space, Tag} from "antd";
import {AutoCard} from "@/components/AutoCard";
import {ResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";
import {HTTPPacketEditor} from "@/utils/editors";
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {MatcherForm, MatcherItem} from "@/pages/matcherextractor/MatcherForm";

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

    return <AutoCard
        title={"匹配提取调试"}
        bodyStyle={{overflow: "hidden"}}
    >
        <div style={{height: "100%"}}>
            <ResizeBox
                isVer={true}
                firstNode={<HTTPPacketEditor
                    noHeader={true}
                    originValue={StringToUint8Array(data)} onChange={e => setData(Uint8ArrayToString(e))}
                />}
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
                            onChange={(condition: string, matchers: MatcherItem[])=>{
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
                        secondNode={<div>
                            2
                        </div>}
                    />
                </AutoCard>}
            />
        </div>
    </AutoCard>
};