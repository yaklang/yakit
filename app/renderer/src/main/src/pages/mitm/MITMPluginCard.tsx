import React, {useState} from "react";
import {Button, Card, Col, Divider, Space, Switch, Tabs} from "antd";
import {YakEditor} from "../../utils/editors";
import {genDefaultPagination, YakScript} from "../invoker/schema";
import {YakExecutorParam} from "../invoker/YakExecutorParams";
import {showDrawer, showModal} from "../../utils/showModal";
import {YakModuleList} from "../yakitStore/YakitStorePage";
import {HTTPFlowMiniTable} from "../../components/HTTPFlowMiniTable";
import {HTTPFlowTable} from "../../components/HTTPFlowTable";
import {YakitLogViewers} from "../invoker/YakitLogFormatter";
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer";

export interface MITMPluginCardProp {
    messages: ExecResultLog[]
    onSubmitScriptContent?: (script: string) => any
    onSubmitYakScriptId?: (id: number, params: YakExecutorParam[]) => any
}

const defaultScript = `mirrorRequest = func(isHttps, url, req) {
}

mirrorResponse = func(isHttps, url, req, rsp) {
}
`

export const MITMPluginCard: React.FC<MITMPluginCardProp> = (props) => {
    const [selectedYakScriptId, setSelectYakScriptId] = useState();
    const [yakScript, setYakScript] = useState<YakScript>();
    const [script, setScript] = useState(defaultScript);
    const [tab, setTab] = useState("history");

    // history
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    return <div>
        <Tabs size={"small"} type={"card"} activeKey={tab} onChange={setTab}>
            <Tabs.TabPane key={"history"} tab={"历史请求"}>
                <HTTPFlowMiniTable
                    simple={true}
                    onTotal={setTotal} // onSendToWebFuzzer={props.onSendToWebFuzzer}
                    filter={{
                        SearchURL: "",
                        Pagination: {...genDefaultPagination(10), Page: page, Limit: limit}
                    }} source={""}/>
            </Tabs.TabPane>
            <Tabs.TabPane key={"plugin"} tab={"劫持插件"}>
                <Card
                    title={<>
                        <Space>
                            <div>MITM 工具栏</div>
                            <Divider type={"vertical"}/>
                            <span style={{color: "#999"}}>历史请求：<Switch size={"small"}/></span>
                        </Space>
                    </>}
                    size={"small"} bodyStyle={{padding: 0}}
                    extra={[
                        <Space>
                            <Button type={"link"} size={"small"} onClick={() => {
                                let m = showModal({
                                    title: "选择启用的 MITM 插件",
                                    width: "60%",
                                    content: <>
                                        <YakModuleList Type={"mitm"} Keyword={""} onClicked={(script) => {
                                            props.onSubmitYakScriptId && props.onSubmitYakScriptId(script.Id, [])
                                            m.destroy()
                                        }} isIgnored={false} isHistory={false}/>
                                    </>
                                })
                            }}>
                                插件商店
                            </Button>
                            <Button
                                type={"primary"}
                                size={"small"}
                                onClick={() => {
                                    props.onSubmitScriptContent && props.onSubmitScriptContent(script)
                                    setTab("mitm-output")
                                }}
                            >执行插件</Button>
                        </Space>
                    ]}
                >
                    <div style={{height: 500}}>
                        <YakEditor
                            noLineNumber={true} type={"yak"} value={script} setValue={setScript}
                            noMiniMap={true}
                        />
                    </div>
                </Card>
            </Tabs.TabPane>
            <Tabs.TabPane key={"mitm-output"} tab={"插件输出"}>
                <YakitLogViewers data={props.messages}/>
            </Tabs.TabPane>
        </Tabs>

    </div>
};