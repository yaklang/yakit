import React, {useState, useEffect} from "react"
import {Tabs} from "antd"
import {MITMPage} from "../mitm/MITMPage"
import {WebsiteTreeViewer} from "../yakitStore/viewers/WebsiteTree"
import {YakScriptExecResultTable} from "../../components/YakScriptExecResultTable"
import {HTTPHistory} from "../../components/HTTPHistory"
import {showDrawer} from "../../utils/showModal"
import {HackerPlugin} from "./HackerPlugin"
import ReactDOM from "react-dom"
import {WebsocketFlowHistory} from "@/pages/websocket/WebsocketFlowHistory"

// import "../main.scss"

export interface HTTPHackerProp {}

const defaultHTTPPacket = `GET / HTTP/1.1
Host: www.example.com
Uesr-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.80 Safari/537.36

`

const {ipcRenderer} = window.require("electron")

const HTTPHacker: React.FC<HTTPHackerProp> = (props) => {
    const [activeTab, setActiveTag] = useState("mitm")

    useEffect(() => {
        ipcRenderer.on("fetch-send-to-packet-hack", (e, res: any) => {
            const {request, ishttps, response} = res || {}
            if (request && ishttps !== undefined) {
                let m = showDrawer({
                    width: "80%",
                    content: <HackerPlugin request={request} isHTTPS={ishttps} response={response}></HackerPlugin>
                })
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-send-to-packet-hack")
        }
    }, [])

    return (
        <div style={{margin: 0, height: "100%"}}>
            <Tabs
                className={"httphacker-tabs"}
                activeKey={activeTab}
                onChange={setActiveTag}
                type={"editable-card"}
                hideAdd={true}
                onTabClick={(key, e) => {
                    const divExisted = document.getElementById("yakit-cursor-menu")
                    if (divExisted) {
                        const div: HTMLDivElement = divExisted as HTMLDivElement
                        const unmountResult = ReactDOM.unmountComponentAtNode(div)
                        if (unmountResult && div.parentNode) {
                            div.parentNode.removeChild(div)
                        }
                    }
                }}
            >
                <Tabs.TabPane tab={"MITM：中间人代理与劫持"} key={"mitm"} closable={false}>
                    <div style={{height: "100%", overflow: "auto"}}>
                        <MITMPage />
                    </div>
                </Tabs.TabPane>
                <Tabs.TabPane tab={"HTTP History"} key={"history"} closable={false} forceRender={false}>
                    <div style={{height: "100%"}}>
                        <HTTPHistory />
                    </div>
                </Tabs.TabPane>
                {/*<Tabs.TabPane tab={"Websocket History"} key={"wshistory"} closable={false} forceRender={false}>*/}
                {/*    <div style={{height: "100%"}}>*/}
                {/*        <WebsocketFlowHistory/>*/}
                {/*    </div>*/}
                {/*</Tabs.TabPane>*/}
                <Tabs.TabPane tab={"插件输出"} key={"plugin"} closable={false}>
                    <YakScriptExecResultTable />
                </Tabs.TabPane>
                <Tabs.TabPane tab={"网站树视角"} key={"website-tree"} closable={false}>
                    <div style={{height: "100%"}}>
                        <WebsiteTreeViewer />
                    </div>
                </Tabs.TabPane>
            </Tabs>
        </div>
    )
}

export default HTTPHacker
