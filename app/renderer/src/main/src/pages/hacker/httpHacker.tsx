import React, {useState} from "react";
import {Spin, Tabs} from "antd";
import {MITMPage} from "../mitm/MITMPage";
import {HTTPFuzzerPage} from "../fuzzer/HTTPFuzzerPage";
import {HTTPFlowTable} from "../../components/HTTPFlowTable";
import {CodecPage} from "../codec/CodecPage";
import {YakExecutor} from "../invoker/YakExecutor";
import {ShellReceiverPage} from "../shellReceiver/ShellReceiverPage";
import {YakScriptManagerPage} from "../invoker/YakScriptManager";

export interface HTTPHackerProp {

}

export const HTTPHacker: React.FC<HTTPHackerProp> = (props) => {
    const [activeTab, setActiveTag] = useState("mitm")
    const [currentRequest, setCurrentRequest] = useState<{
        isHttps: boolean, request: string
    }>();
    const [loading, setLoading] = useState(false)

    const sendToFuzzer = (isHttps: boolean, request: string) => {
        setLoading(true)
        setActiveTag("fuzzer")
        setCurrentRequest({isHttps, request})
        setTimeout(() => setLoading(false), 300)
    }

    return <div style={{margin: 0}}>
        <Spin spinning={loading}>
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTag}
                type={"card"}
                tabBarGutter={2}
            >
                <Tabs.TabPane tab={"MITM：中间人代理与劫持"} key={"mitm"}>
                    <MITMPage onSendToWebFuzzer={sendToFuzzer}/>
                </Tabs.TabPane>
                <Tabs.TabPane tab={"HTTP History"} key={"history"}>
                    <HTTPFlowTable
                        onSendToWebFuzzer={sendToFuzzer}/>
                </Tabs.TabPane>
                <Tabs.TabPane tab={"Web Fuzzer"} key={"fuzzer"}>
                    <HTTPFuzzerPage
                        isHttps={currentRequest?.isHttps}
                        request={currentRequest?.request}
                    />
                </Tabs.TabPane>
                {/*<Tabs.TabPane tab={"PoC / 模块管理"} key={"yak-script-manager"}>*/}
                {/*    <YakScriptManagerPage/>*/}
                {/*</Tabs.TabPane>*/}
                {/*<Tabs.TabPane tab={"Yak 远程执行"} key={"yak-runner"}>*/}
                {/*    <YakExecutor/>*/}
                {/*</Tabs.TabPane>*/}
                {/*<Tabs.TabPane tab={"Reverse Shell Receiver"} key={"shell-receiver"}>*/}
                {/*    <ShellReceiverPage/>*/}
                {/*</Tabs.TabPane>*/}
                {/*<Tabs.TabPane tab={"编码与解码"} key={"codec"}>*/}
                {/*    <CodecPage/>*/}
                {/*</Tabs.TabPane>*/}
            </Tabs>
        </Spin>
    </div>
};