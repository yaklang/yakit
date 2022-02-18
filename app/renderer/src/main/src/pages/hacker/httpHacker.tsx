import React, {useState, useEffect} from "react";
import {Button, Col, Input, Popover, Row, Select, Space, Spin, Tabs} from "antd";
import {MITMPage} from "../mitm/MITMPage";
import {HTTPFuzzerPage} from "../fuzzer/HTTPFuzzerPage";
import {randomString} from "../../utils/randomUtil";
import {CloseOutlined, EditOutlined, PlusOutlined} from "@ant-design/icons";
import {WebsiteTreeViewer} from "../yakitStore/viewers/WebsiteTree";
import {YakScriptExecResultTable} from "../../components/YakScriptExecResultTable";
import {HTTPHistory} from "../../components/HTTPHistory";
import "../main.css";
import { useMemoizedFn } from "ahooks";
import { showDrawer } from "../../utils/showModal";
import { HackerPlugin } from "./HackerPlugin";

export interface HTTPHackerProp {

}

const defaultHTTPPacket = `GET / HTTP/1.1
Host: www.example.com
`

const {ipcRenderer} = window.require("electron");

const HTTPHacker: React.FC<HTTPHackerProp> = (props) => {
    const [activeTab, setActiveTag] = useState("mitm")
    const [loading, setLoading] = useState(false)

    // 管理 Fuzzer 状态
    const [fuzzers, setFuzzers] = useState<{ verbose: string, key: string, node: React.ReactNode }[]>([]);
    const [fuzzerCounter, setFuzzerCounter] = useState(0);

    // 系统类型
    const [system,setSystem]=useState<string>("")

    //获取系统类型
    useEffect(()=>{
        ipcRenderer.invoke('fetch-system-name').then((res)=>{setSystem(res)})
    },[])

    const sendToFuzzer = useMemoizedFn((isHttps: boolean, request: string) => {
        const counter = fuzzerCounter + 1
        setFuzzerCounter(counter)
        const newFuzzerId = randomString(100);
        const verbose = `Web Fuzzer-[${counter}]`;
        setFuzzers([...fuzzers, {
            verbose,
            key: newFuzzerId,
            node: <HTTPFuzzerPage
                isHttps={isHttps}
                request={request}
                system={system}
                onSendToWebFuzzer={sendToFuzzer}
            />
        }])

        setLoading(true)
        setActiveTag(newFuzzerId)
        // setCurrentRequest({isHttps, request})
        setTimeout(() => setLoading(false), 300)
    })

    const sendToPlugin = useMemoizedFn((request: Uint8Array, isHTTPS: boolean, response?: Uint8Array) => {
        let m = showDrawer({
            width: "80%",
            content: <HackerPlugin request={request} isHTTPS={isHTTPS} response={response}></HackerPlugin>
        })
    })

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
        <Tabs
            className={"httphacker-tabs"}
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
            addIcon={<div style={{cursor: 'pointer', padding: '0 5px', color: 'rgb(25,143,255'}}>
                <PlusOutlined/>创建 Web Fuzzer
            </div>}
        >
            <Tabs.TabPane tab={"MITM：中间人代理与劫持"} key={"mitm"} closable={false}>
                <div style={{height: "100%"}}>
                    <MITMPage onSendToWebFuzzer={sendToFuzzer} sendToPlugin={sendToPlugin}/>
                </div>
            </Tabs.TabPane>
            <Tabs.TabPane tab={"HTTP History"} key={"history"} closable={false} forceRender={true}>
                <div style={{height: "100%"}}>
                    <HTTPHistory sendToWebFuzzer={sendToFuzzer} sendToPlugin={sendToPlugin}/>
                </div>
            </Tabs.TabPane>
            <Tabs.TabPane tab={"插件输出"} key={"plugin"} closable={false}>
                <YakScriptExecResultTable/>
            </Tabs.TabPane>
            <Tabs.TabPane tab={"网站树视角"} key={"website-tree"} closable={false}>
                <div style={{height: "100%"}}>
                    <WebsiteTreeViewer
                        onSendToWebFuzzer={sendToFuzzer}
                    />
                </div>
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
                <div style={{height: "100%"}}>
                    {i.node}
                </div>
            </Tabs.TabPane>)}
        </Tabs>
    </div>
};

export default HTTPHacker;