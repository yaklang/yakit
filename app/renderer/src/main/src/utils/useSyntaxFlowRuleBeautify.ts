import {useMemoizedFn} from "ahooks"
import {useEffect, useRef, useState} from "react"
import {YakitRoute} from "@/enums/yakitRoute"
import emiter from "@/utils/eventBus/eventBus"
import {yakitNotify} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

type UseSyntaxFlowRuleBeautifyOptions = {
    getRuleContent: () => string
    forgeNameCandidates?: string[]
}

/**
 * 规则美化（BeautifySyntaxFlowRule）统一监听 + 卸载清理，避免组件卸载后 setState 和监听泄漏。
 */
export const useSyntaxFlowRuleBeautify = (options: UseSyntaxFlowRuleBeautifyOptions) => {
    const {getRuleContent, forgeNameCandidates = ["syntaxflow-rule-beautify", "syntaxflow 规则美化", "SyntaxFlow 规则美化"]} = options

    const [beautifyLoading, setBeautifyLoading] = useState(false)
    const isMountedRef = useRef(true)
    const beautifyTokenRef = useRef<string | null>(null)
    const beautifyHandlersRef = useRef<{
        onError?: (e: unknown, err: unknown) => void
        onEnd?: (e?: unknown, data?: unknown) => void
    }>({})

    useEffect(() => {
        return () => {
            isMountedRef.current = false
            const token = beautifyTokenRef.current
            const {onError, onEnd} = beautifyHandlersRef.current || {}
            if (token) {
                if (onError) ipcRenderer.removeListener(`${token}-error`, onError as any)
                if (onEnd) ipcRenderer.removeListener(`${token}-end`, onEnd as any)
            }
            beautifyTokenRef.current = null
            beautifyHandlersRef.current = {}
        }
    }, [])

    const handleBeautify = useMemoizedFn(() => {
        if (beautifyLoading || !isMountedRef.current) return
        setBeautifyLoading(true)

        ipcRenderer
            .invoke("BeautifySyntaxFlowRule", {
                ruleContent: getRuleContent() || "",
                forgeNameCandidates
            })
            .then((res: any) => {
                if (!isMountedRef.current) return

                yakitNotify("success", "已提交规则美化任务，可在 AI Agent 查看执行过程")
                // 后端已负责触发 AI-ReAct，前端只打开 AI Agent 页面用于展示
                emiter.emit(
                    "openPage",
                    JSON.stringify({route: YakitRoute.AI_Agent, params: {defualtAIMentionCommandParams: []}})
                )

                const token = res?.token
                if (!token) {
                    // 未返回 token 也不要一直转圈
                    if (isMountedRef.current) setBeautifyLoading(false)
                    return
                }

                beautifyTokenRef.current = token

                let onError: ((e: unknown, err: unknown) => void) | undefined
                let onEnd: ((e?: unknown, data?: unknown) => void) | undefined

                const onCancel = () => {
                    if (onError) ipcRenderer.removeListener(`${token}-error`, onError as any)
                    if (onEnd) ipcRenderer.removeListener(`${token}-end`, onEnd as any)
                    beautifyTokenRef.current = null
                    beautifyHandlersRef.current = {}
                    if (isMountedRef.current) setBeautifyLoading(false)
                }

                onError = (_, err) => {
                    yakitNotify("error", `规则美化失败: ${err}`)
                    onCancel()
                }
                onEnd = () => {
                    yakitNotify("success", "规则美化任务已结束")
                    onCancel()
                }

                ipcRenderer.on(`${token}-error`, onError)
                ipcRenderer.on(`${token}-end`, onEnd)
                beautifyHandlersRef.current = {onError, onEnd}
            })
            .catch((e: any) => {
                if (!isMountedRef.current) return
                yakitNotify("error", `提交规则美化失败: ${e}`)
                setBeautifyLoading(false)
            })
    })

    return {beautifyLoading, handleBeautify}
}

