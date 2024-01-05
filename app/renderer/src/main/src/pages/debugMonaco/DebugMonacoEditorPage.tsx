import React, {useEffect, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {MONACO_SPEC_WEBFUZZER_REQUEST} from "@/pages/debugMonaco/monaco_WebfuzzerRequestTokenProvider"
import {info} from "@/utils/notification"
import {SelectOne} from "@/utils/inputUtil"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakURLTree} from "@/pages/yakURLTree/YakURLTree"
import {TrafficDemo} from "@/components/playground/TrafficDemo"
import {PcapXDemo} from "@/components/playground/PcapXDemo"
import {DemoItemSelectOne} from "@/demoComponents/itemSelect/ItemSelect"
import {RiskTableDemo} from "@/components/playground/RiskTableDemo"
import {ChaosMakerRulesDemo} from "@/components/playground/ChaosMakerRulesDemo"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {HybridScanDemo} from "@/components/playground/hybrid/HybridScanDemo"
import {HybridScanTaskTable} from "@/components/playground/hybrid/HybridScanTaskTable"
import {SpaceEngineOperator} from "@/components/playground/spaceengine/SpaceEngineOperator"

export interface DebugMonacoEditorPageProp {}

const TAG = "DEBUG_PLAYGROUND_DEFAULT_MODE"

export const DebugMonacoEditorPage: React.FC<DebugMonacoEditorPageProp> = (props) => {
    const [value, setValue] = useState(`GET / HTTP/1.1
Host: www.baidu.com
Content-Length: 123


a=1&b=2 Content-Length: a

{"a": 123}

{{null(1)}}
`)
    const [languageType, setLangType] = useState(MONACO_SPEC_WEBFUZZER_REQUEST)
    const [mode, setMode] = useState<"http-monaco-editor" | "fs-tree" | string>()

    useEffect(() => {
        if (!mode) {
            getRemoteValue(TAG).then((value) => {
                setMode(value)
            })
            return
        }
        if (mode) {
            setRemoteValue(TAG, mode)
        }
    }, [mode])

    useEffect(() => {
        if (!languageType) {
            setLangType(MONACO_SPEC_WEBFUZZER_REQUEST)
            return
        }
        info("DEBUG: " + languageType)
    }, [languageType])

    return (
        <div style={{height: "100%"}}>
            <AutoCard
                title={
                    <DemoItemSelectOne
                        label={"调试组件"}
                        data={[
                            {value: "space-engine-operator", label: "空间引擎操作台"},
                            {value: "hybrid-scan-demo", label: "HybridScan 批量"},
                            {value: "hybrid-scan-task", label: "HybridScan 任务列表"},
                            {value: "chaos-maker-rule", label: "流量生成器规则"},
                            {value: "risk-table", label: "漏洞查询规则"},
                            {value: "http-monaco-editor", label: "HTTP 数据包编辑器"},
                            {value: "fs-tree", label: "文件系统树"}
                        ]}
                        formItemStyle={{margin: 0}}
                        value={mode}
                        setValue={setMode}
                    />
                }
                size={"small"}
                bodyStyle={{padding: 0, overflow: "hidden"}}
            >
                {(() => {
                    switch (mode) {
                        case "hybrid-scan-demo":
                            return <HybridScanDemo />
                        case "hybrid-scan-task":
                            return <HybridScanTaskTable />
                        case "chaos-maker-rule":
                            return <ChaosMakerRulesDemo />
                        case "risk-table":
                            return <RiskTableDemo />
                        case "http-monaco-editor":
                            return <YakitEditor value={value} type={"http"} />
                        case "fs-tree":
                            return <YakURLTree />
                        case "space-engine-operator":
                            return <SpaceEngineOperator />
                    }
                    return <div>NO PLUGIN DEMO</div>
                })()}
            </AutoCard>
        </div>
    )
}
