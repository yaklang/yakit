import React, {useEffect, useState} from "react";
import {AutoCard} from "@/components/AutoCard";
import {MONACO_SPEC_WEBFUZZER_REQUEST} from "@/pages/debugMonaco/monaco_WebfuzzerRequestTokenProvider";
import {info} from "@/utils/notification";
import {SelectOne} from "@/utils/inputUtil";
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor";
import {YakURLTree} from "@/pages/yakURLTree/YakURLTree";
import {TrafficDemo} from "@/components/playground/TrafficDemo";
import {PcapXDemo} from "@/components/playground/PcapXDemo";

export interface DebugMonacoEditorPageProp {

}

export const DebugMonacoEditorPage: React.FC<DebugMonacoEditorPageProp> = (props) => {
    const [value, setValue] = useState(`GET / HTTP/1.1
Host: www.baidu.com
Content-Length: 123


a=1&b=2 Content-Length: a

{"a": 123}

{{null(1)}}
`)
    const [languageType, setLangType] = useState(MONACO_SPEC_WEBFUZZER_REQUEST);
    const [mode, setMode] = useState<"http-monaco-editor" | "fs-tree" | string>("pcapx");

    useEffect(() => {
        if (!languageType) {
            setLangType(MONACO_SPEC_WEBFUZZER_REQUEST)
            return
        }
        info("DEBUG: " + languageType)
    }, [languageType])

    return <div style={{height: "100%"}}>
        <AutoCard
            title={<SelectOne label={"调试组件"} data={[
                {value: "pcapx", text: "抓包工具"},
                {value: "traffic-session", text: "流量会话"},
                {value: "http-monaco-editor", text: "HTTP 数据包编辑器"},
                {value: "fs-tree", text: "文件系统树"},
            ]} formItemStyle={{margin: 0}} value={mode} setValue={setMode}/>}
            size={"small"} bodyStyle={{padding: 0}}
        >
            {
                (() => {
                    switch (mode) {
                        case "pcapx":
                            return <PcapXDemo/>
                        case "traffic-session":
                            return <TrafficDemo/>
                        case "http-monaco-editor":
                            return <YakitEditor value={value} type={"http"}/>
                        case "fs-tree":
                            return <YakURLTree/>
                    }
                    return <div>NO PLUGIN DEMO</div>
                })()
            }
        </AutoCard>
    </div>
};