import React, {useState} from "react";
import {AutoCard} from "@/components/AutoCard";
import {Button, Space, Tag} from "antd";
import {HTTPFlow} from "@/components/HTTPFlowTable/HTTPFlowTable";
import {SelectOne} from "@/utils/inputUtil";
import {YakEditor} from "@/utils/editors";
import {Uint8ArrayToString} from "@/utils/str";
import {ThunderboltOutlined} from "@ant-design/icons";
import {newWebFuzzerTab} from "@/pages/fuzzer/HTTPFuzzerPage";
import {newWebsocketFuzzerTab} from "@/pages/websocket/WebsocketFuzzer";

export interface HTTPFlowForWebsocketViewerProp {
    flow: HTTPFlow
}

export const HTTPFlowForWebsocketViewer: React.FC<HTTPFlowForWebsocketViewerProp> = (props) => {
    const [mode, setMode] = useState<"request" | "response">("request")
    const {flow} = props;

    return <AutoCard
        title={<Space size={4}>
            <div>Websocket</div>
            <SelectOne data={[
                {value: "request", text: "请求"},
                {value: "response", text: "响应"},
            ]} value={mode} setValue={setMode} size={"small"} formItemStyle={{marginBottom: 0}}/>
            <Tag>{mode === "request" ? `请求大小：${flow.RequestSizeVerbose}` : `Body大小: ${flow.BodySizeVerbose}`}</Tag>
        </Space>} size={"small"}
        bodyStyle={{padding: 0}}
        extra={<Space>
            <Button
                type={"primary"}
                size={"small"}
                icon={<ThunderboltOutlined/>}
                onClick={() => {
                    newWebsocketFuzzerTab(flow.IsHTTPS, flow.Request)
                }}
            >FUZZ</Button>
        </Space>}
    >
        {mode === "request" && <YakEditor
            type={"http"}
            noMiniMap={true}
            value={Uint8ArrayToString(flow.Request)}
            readOnly={true}
        />}
        {mode === "response" && <YakEditor
            type={"http"}
            noMiniMap={true}
            value={Uint8ArrayToString(flow.Response)}
            readOnly={true}
        />}
    </AutoCard>
};