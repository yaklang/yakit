import React, {useState} from "react";
import {Button, Input, Popconfirm, Popover, Space, Spin, Tabs} from "antd";
import {MITMPage} from "../mitm/MITMPage";
import {HTTPFuzzerPage} from "../fuzzer/HTTPFuzzerPage";
import {HTTPFlowTable} from "../../components/HTTPFlowTable";
import {CodecPage} from "../codec/CodecPage";
import {YakExecutor} from "../invoker/YakExecutor";
import {ShellReceiverPage} from "../shellReceiver/ShellReceiverPage";
import {YakScriptManagerPage} from "../invoker/YakScriptManager";
import {randomBytes} from "crypto";
import {randomString} from "../../utils/randomUtil";
import {CloseOutlined, EditOutlined, PlusOutlined} from "@ant-design/icons";
import {info} from "../../utils/notification";
import {WebsiteTreeViewer} from "../yakitStore/viewers/WebsiteTree";
import {YakScriptExecResultTable} from "../../components/YakScriptExecResultTable";
import {HTTPHistory} from "../../components/HTTPHistory";

export interface HTTPHackerProp {

}

const defaultHTTPPacket = `GET / HTTP/1.1
Host: www.example.com
`

export const HTTPHacker: React.FC<HTTPHackerProp> = (props) => {
    const [activeTab, setActiveTag] = useState("mitm")
    const [loading, setLoading] = useState(false)

    // 管理 Fuzzer 状态
    const [fuzzers, setFuzzers] = useState<{ verbose: string, key: string, node: React.ReactNode }[]>([]);
    const [fuzzerCounter, setFuzzerCounter] = useState(0);

    const sendToFuzzer = (isHttps: boolean, request: string) => {
        const counter = fuzzerCounter + 1
        setFuzzerCounter(counter)
        const newFuzzerId = randomString(100);
        const verbose = `Web Fuzzer-[${counter}]`;
        setFuzzers([...fuzzers, {
            verbose,
            key: newFuzzerId,
            node: loading ? <Spin/>
                : <HTTPFuzzerPage
                    isHttps={isHttps}
                    request={request}
                />
        }])

        setLoading(true)
        setActiveTag(newFuzzerId)
        // setCurrentRequest({isHttps, request})
        setTimeout(() => setLoading(false), 300)
    }

    const changeVerboseForFuzzer = (key: string, verbose: string) => {
        setFuzzers(fuzzers.map(i => {
            if (i.key === key) i.verbose = verbose;
            return i
        }))
    }

    const removeFuzzer = (key: string) => {
        if (fuzzers.length <= 0) {
            return
        }

        const res = fuzzers.filter(i => i.key !== key);
        setFuzzers([...res])

        if (res[res.length - 1]) {
            setActiveTag(res[res.length - 1].key)
        } else {
            setActiveTag("mitm")
        }

        setLoading(true)
        setTimeout(() => {
            setLoading(false)
        }, 300)
    }

    const findFuzzerIndexByKey = (key: string) => {
        for (let i = 0; i <= fuzzers.length; i++) {
            if (fuzzers[i].key === key) {
                return i
            }
        }
        return -1
    }

    return <div style={{margin: 0, height: "100%"}}>
        <Spin spinning={loading} style={{height: "100%"}}>
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTag}
                type={"editable-card"}
                tabBarGutter={2}
                onEdit={(key, event: "add" | "remove") => {
                    switch (event) {
                        case "remove":
                            return
                        case "add":
                            sendToFuzzer(false, defaultHTTPPacket)
                            return
                    }
                }}
                addIcon={<div>
                    <Button
                        type={"link"} size={"small"}
                        icon={<PlusOutlined/>}
                    >创建 Web Fuzzer</Button>
                </div>}
            >
                <Tabs.TabPane tab={"MITM：中间人代理与劫持"} key={"mitm"} closable={false}>
                    <MITMPage onSendToWebFuzzer={sendToFuzzer}/>
                </Tabs.TabPane>
                <Tabs.TabPane tab={"HTTP History"} key={"history"} closable={false}>
                    <HTTPHistory/>
                    {/*<HTTPFlowTable*/}
                    {/*    onSendToWebFuzzer={sendToFuzzer}/>*/}
                </Tabs.TabPane>
                <Tabs.TabPane tab={"插件输出"} key={"plugin"} closable={false}>
                    <YakScriptExecResultTable />
                </Tabs.TabPane>
                <Tabs.TabPane tab={"网站树视角"} key={"website-tree"} closable={false}>
                    <WebsiteTreeViewer
                        onSendToWebFuzzer={sendToFuzzer}
                    />
                </Tabs.TabPane>
                {fuzzers.map(i => <Tabs.TabPane tab={i.verbose} key={i.key} closeIcon={<Space>
                    <Popover
                        trigger={"click"}
                        title={"修改名称"}
                        content={<>
                            <Input size={"small"} defaultValue={i.verbose} onBlur={(e) => {
                                changeVerboseForFuzzer(i.key, e.target.value)
                            }}/>
                        </>}
                    >
                        <EditOutlined/>
                    </Popover>
                    <CloseOutlined onClick={() => {
                        setLoading(true)
                        const key = i.key;
                        const targetIndex = findFuzzerIndexByKey(key)
                        if (targetIndex > 0 && fuzzers[targetIndex - 1]) {
                            const targetCache = fuzzers[targetIndex - 1];
                            setActiveTag(targetCache.key)
                        }
                        removeFuzzer(key);
                        setTimeout(() => setLoading(false), 300)
                    }}/>
                </Space>}>
                    {i.node}
                </Tabs.TabPane>)}
                {/*<Tabs.TabPane tab={"Web Fuzzer"} key={"fuzzer"}>*/}
                {/*    <HTTPFuzzerPage*/}
                {/*        isHttps={currentRequest?.isHttps}*/}
                {/*        request={currentRequest?.request}*/}
                {/*    />*/}
                {/*</Tabs.TabPane>*/}
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