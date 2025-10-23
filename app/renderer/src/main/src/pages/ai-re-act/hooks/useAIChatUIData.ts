import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {useCreation} from "ahooks"
import {AIOutputI18n} from "./grpcApi"
import useAIAgentStore from "@/pages/ai-agent/useContext/useStore"
import {defaultChatIPCData} from "@/pages/ai-agent/defaultConstant"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"
import {isEmpty} from "lodash"
import {AIChatQSData, AIYakExecFileRecord} from "./aiRender"
import {UseAIPerfDataState, UseCasualChatState, UseTaskChatState, UseYakExecResultState} from "./type"

function useAIChatUIData() {
    const {activeChat} = useAIAgentStore()
    const {chatIPCData} = useChatIPCStore()

    const taskChat: UseTaskChatState = useCreation(() => {
        if (activeChat && activeChat.answer && activeChat.answer.taskChat) {
            return activeChat.answer.taskChat
        }
        return chatIPCData.taskChat || defaultChatIPCData.taskChat
    }, [activeChat, chatIPCData.taskChat])

    const yakExecResult: UseYakExecResultState = useCreation(() => {
        if (activeChat && activeChat.answer && activeChat.answer.yakExecResult) {
            let result: Map<string, AIYakExecFileRecord[]> = new Map()
            if (!isEmpty(activeChat.answer.yakExecResult.execFileRecord)) {
                result = new Map(activeChat.answer.yakExecResult.execFileRecord)
            }
            return {
                ...activeChat.answer.yakExecResult,
                execFileRecord: result
            }
        }
        return chatIPCData.yakExecResult || defaultChatIPCData.yakExecResult
    }, [activeChat, chatIPCData.yakExecResult])

    const aiPerfData: UseAIPerfDataState = useCreation(() => {
        if (activeChat && activeChat.answer && activeChat.answer.aiPerfData) {
            return activeChat.answer.aiPerfData
        }
        return chatIPCData.aiPerfData || defaultChatIPCData.aiPerfData
    }, [chatIPCData.aiPerfData])
    const casualChat: UseCasualChatState = useCreation(() => {
        if (!!activeChat?.answer?.casualChat) {
            return activeChat.answer.casualChat
        }
        return chatIPCData.casualChat
    }, [activeChat, chatIPCData.casualChat])
    const logs: AIChatQSData[] = useCreation(() => {
        if (!!activeChat?.answer?.logs) {
            return activeChat?.answer?.logs
        }
        return chatIPCData.logs
    }, [activeChat, chatIPCData.logs])
    return {taskChat, yakExecResult, aiPerfData, casualChat, logs}
}

export default useAIChatUIData
