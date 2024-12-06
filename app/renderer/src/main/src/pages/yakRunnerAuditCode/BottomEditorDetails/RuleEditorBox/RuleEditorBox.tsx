import React, {useEffect, useRef, useState} from "react"
import {useGetState, useMemoizedFn, useUpdateEffect} from "ahooks"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {SyntaxFlowMonacoSpec} from "@/utils/monacoSpec/syntaxflowEditor"
import useStore from "../../hooks/useStore"
import {apiFetchQuerySyntaxFlowResult} from "@/pages/yakRunnerCodeScan/utils"
import {QuerySyntaxFlowResultResponse} from "@/pages/yakRunnerCodeScan/YakRunnerCodeScanType"
const {ipcRenderer} = window.require("electron")
export interface RuleEditorBoxProps {
    ruleEditor: string
    setRuleEditor: (value: string) => void
    disabled?: boolean
}
export const RuleEditorBox: React.FC<RuleEditorBoxProps> = (props) => {
    const {ruleEditor, setRuleEditor, disabled} = props
    const {projectName, pageInfo} = useStore()

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

    return (
        <YakitEditor
            type={SyntaxFlowMonacoSpec}
            value={ruleEditor}
            setValue={(content: string) => {
                setRuleEditor(content)
            }}
            disabled={disabled}
        />
    )
}
