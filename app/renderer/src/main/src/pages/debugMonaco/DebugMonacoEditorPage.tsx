import React, {useEffect, useState} from "react";
import {AutoCard} from "@/components/AutoCard";
import {HTTPPacketEditor, YakEditor} from "@/utils/editors";
import {MONACO_SPEC_WEBFUZZER_REQUEST} from "@/pages/debugMonaco/monaco_WebfuzzerRequestTokenProvider";
import {info} from "@/utils/notification";

export interface DebugMonacoEditorPageProp {

}

export const DebugMonacoEditorPage: React.FC<DebugMonacoEditorPageProp> = (props) => {
    const [value, setValue] = useState(`GET / HTTP/1.1
Host: www.baidu.com

a=1&b=2

{"a": 123}

{{null(1)}}
`)
    const [languageType, setLangType] = useState(MONACO_SPEC_WEBFUZZER_REQUEST);

    useEffect(()=>{
        if (!languageType) {
            setLangType(MONACO_SPEC_WEBFUZZER_REQUEST)
            return
        }
        info("DEBUG: " + languageType)
    }, [languageType])

    return <div style={{height: "100%"}}>
        <AutoCard title={"插件调试器"} size={"small"} bodyStyle={{padding: 0}}>
            <YakEditor value={value} type={"http"}/>
        </AutoCard>
    </div>
};