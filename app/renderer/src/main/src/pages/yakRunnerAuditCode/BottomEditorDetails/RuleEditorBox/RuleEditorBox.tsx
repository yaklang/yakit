import React, {useEffect, useRef, useState} from "react"
import {useGetState, useMemoizedFn, useUpdateEffect} from "ahooks"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {SyntaxFlowMonacoSpec} from "@/utils/monacoSpec/syntaxflowEditor"
import useStore from "../../hooks/useStore"
import {apiFetchQuerySyntaxFlowResult} from "@/pages/yakRunnerCodeScan/utils"
import {QuerySyntaxFlowResultResponse} from "@/pages/yakRunnerCodeScan/YakRunnerCodeScanType"
import {monaco} from "react-monaco-editor"
import { randomString } from "@/utils/randomUtil"
import { handleShortcutKey } from "@/utils/globalShortcutKey/utils"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {yakitNotify} from "@/utils/notification"
const {ipcRenderer} = window.require("electron")
export interface RuleEditorBoxProps {
    ruleEditor: string
    setRuleEditor: (value: string) => void
    disabled?: boolean
    onAuditRuleSubmit: () => void
}
export const RuleEditorBox: React.FC<RuleEditorBoxProps> = (props) => {
    const {ruleEditor, setRuleEditor, disabled,onAuditRuleSubmit} = props
    const {projectName, pageInfo} = useStore()
    const [beautifyLoading, setBeautifyLoading] = useState(false)

    // 获取文本域输入框
    const onGrpcSetTextArea = useMemoizedFn((arr: {Key: string; Value: number}[]) => {
        let resultId: number | null = null
        arr.forEach((item) => {
            if (item.Key === "result_id") {
                resultId = item.Value
            }
        })
        if (resultId) {
            const Pagination = {
                Page: 1,
                Limit: 10,
                Order: "desc",
                OrderBy: "Id"
            }
            apiFetchQuerySyntaxFlowResult({
                Pagination,
                Filter: {
                    TaskIDs: [],
                    ResultIDs: [resultId],
                    RuleNames: [],
                    ProgramNames: [],
                    Keyword: "",
                    OnlyRisk: false
                }
            })
                .then((rsp: QuerySyntaxFlowResultResponse) => {
                    const resData = rsp?.Results || []
                    if (resData.length > 0) {
                        setRuleEditor(resData[0].RuleContent)
                    }
                })
                .catch(() => {
                    setRuleEditor("")
                })
        }
    })

    useEffect(() => {
        if (pageInfo && pageInfo.Query) {
            onGrpcSetTextArea(pageInfo.Query)
        } else {
            setRuleEditor("")
        }
    }, [pageInfo?.Query])

    useUpdateEffect(() => {
        setRuleEditor("")
    }, [projectName])

    const handleBeautify = useMemoizedFn(() => {
        if (beautifyLoading) return
        setBeautifyLoading(true)
        ipcRenderer
            .invoke("BeautifySyntaxFlowRule", {
                ruleContent: ruleEditor || "",
                forgeNameCandidates: ["syntaxflow-rule-beautify", "syntaxflow 规则美化", "SyntaxFlow 规则美化"]
            })
            .then((res: any) => {
                yakitNotify("success", "已提交规则美化任务，可在 AI Agent 查看执行过程")
                // 后端已负责触发 AI-ReAct，前端只打开 AI Agent 页面用于展示
                emiter.emit("openPage", JSON.stringify({route: YakitRoute.AI_Agent, params: {defualtAIMentionCommandParams: []}}))

                const token = res?.token
                if (token) {
                    const onError = (_: any, err: any) => {
                        yakitNotify("error", `规则美化失败: ${err}`)
                        setBeautifyLoading(false)
                        ipcRenderer.removeAllListeners(`${token}-error`)
                        ipcRenderer.removeAllListeners(`${token}-end`)
                    }
                    const onEnd = () => {
                        yakitNotify("success", "规则美化任务已结束")
                        setBeautifyLoading(false)
                        ipcRenderer.removeAllListeners(`${token}-error`)
                        ipcRenderer.removeAllListeners(`${token}-end`)
                    }
                    ipcRenderer.on(`${token}-error`, onError)
                    ipcRenderer.on(`${token}-end`, onEnd)
                } else {
                    // 未返回 token 也不要一直转圈
                    setBeautifyLoading(false)
                }
            })
            .catch((e: any) => {
                yakitNotify("error", `提交规则美化失败: ${e}`)
                setBeautifyLoading(false)
            })
    })

    return (
        <div style={{height: "100%", display: "flex", flexDirection: "column"}}>
            <div style={{display: "flex", justifyContent: "flex-end", padding: "6px 0"}}>
                <YakitButton
                    size='small'
                    type='outline2'
                    onClick={handleBeautify}
                    loading={beautifyLoading}
                    disabled={disabled || beautifyLoading}
                >
                    美化
                </YakitButton>
            </div>
            <div style={{flex: 1, minHeight: 0}}>
                <YakitEditor
                    type={SyntaxFlowMonacoSpec}
                    value={ruleEditor}
                    setValue={(content: string) => {
                        setRuleEditor(content)
                    }}
                    disabled={disabled}
                    editorDidMount={(editor) => {
                        // monaco快捷键
                        // editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                        //     onAuditRuleSubmit()
                        // })
                    }}
                />
            </div>
        </div>
    )
}
