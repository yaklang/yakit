import {useCreation, useMemoizedFn} from "ahooks"
import useAIAgentStore from "@/pages/ai-agent/useContext/useStore"
import {defaultChatIPCData} from "@/pages/ai-agent/defaultConstant"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"
import {
    AIFileSystemPin,
    UseAIPerfDataState,
    UseCasualChatState,
    UseChatIPCEvents,
    UseTaskChatState,
    UseYakExecResultState
} from "./type"
import {AIChatData} from "@/pages/ai-agent/type/aiChat"
import useAIAgentDispatcher from "@/pages/ai-agent/useContext/useDispatcher"
import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"
function useAIChatUIData(): AIChatData

function useAIChatUIData() {
    const {activeChat} = useAIAgentStore()
    const {chatIPCData} = useChatIPCStore()
    const {getChatData} = useAIAgentDispatcher()
    const {fetchToken} = useChatIPCDispatcher().chatIPCEvents
    const session = fetchToken()
    const runTimeIDs: string[] = useCreation(() => {
        if (activeChat && activeChat.session && getChatData && activeChat.session !== session) {
            return getChatData(activeChat.session)?.runTimeIDs || defaultChatIPCData.runTimeIDs
        }
        return chatIPCData.runTimeIDs || defaultChatIPCData.runTimeIDs
    }, [activeChat, chatIPCData.runTimeIDs])

    const grpcFolders: AIFileSystemPin[] = useCreation(() => {
        if (activeChat && activeChat.session && getChatData && activeChat.session !== session) {
            return getChatData(activeChat.session)?.grpcFolders || defaultChatIPCData.grpcFolders
        }
        return chatIPCData.grpcFolders || defaultChatIPCData.grpcFolders
    }, [activeChat, chatIPCData.grpcFolders])

    const taskChat: UseTaskChatState = useCreation(() => {
        if (activeChat && activeChat.session && getChatData && activeChat.session !== session) {
            return getChatData(activeChat.session)?.taskChat || defaultChatIPCData.taskChat
        }
        return chatIPCData.taskChat || defaultChatIPCData.taskChat
    }, [activeChat, chatIPCData.taskChat])

    const yakExecResult: UseYakExecResultState = useCreation(() => {
        if (activeChat && activeChat.session && getChatData && activeChat.session !== session) {
            return getChatData(activeChat.session)?.yakExecResult || defaultChatIPCData.yakExecResult
        }
        return chatIPCData.yakExecResult || defaultChatIPCData.yakExecResult
    }, [activeChat, chatIPCData.yakExecResult])

    const aiPerfData: UseAIPerfDataState = useCreation(() => {
        if (activeChat && activeChat.session && getChatData && activeChat.session !== session) {
            return getChatData(activeChat.session)?.aiPerfData || defaultChatIPCData.aiPerfData
        }
        return chatIPCData.aiPerfData || defaultChatIPCData.aiPerfData
    }, [chatIPCData.aiPerfData])
    const casualChat: UseCasualChatState = useCreation(() => {
        if (activeChat && activeChat.session && getChatData && activeChat.session !== session) {
            return getChatData(activeChat.session)?.casualChat || defaultChatIPCData.casualChat
        }
        return chatIPCData.casualChat || defaultChatIPCData.casualChat
    }, [activeChat, chatIPCData.casualChat])

    const reActTimelines = useCreation(() => {
        if (activeChat && activeChat.session && getChatData && activeChat.session !== session) {
            return getChatData(activeChat.session)?.reActTimelines || defaultChatIPCData.reActTimelines
        }
        return chatIPCData.reActTimelines || defaultChatIPCData.reActTimelines
    }, [activeChat, chatIPCData.reActTimelines])

    const coordinatorIDs: string[] = useCreation(() => {
        if (activeChat && activeChat.session && getChatData && activeChat.session !== session) {
            return getChatData(activeChat.session)?.coordinatorIDs || defaultChatIPCData.coordinatorIDs
        }
        return chatIPCData.coordinatorIDs || []
    }, [activeChat, chatIPCData.coordinatorIDs])

    const getChatContentMap: UseChatIPCEvents["getChatContentMap"] = useMemoizedFn((chatType, mapKey) => {
        if (chatType === "task") {
            return taskChat.contents.current.get(mapKey)
        }
        return casualChat.contents.current.get(mapKey)
    })

    return {
        runTimeIDs,
        grpcFolders,
        taskChat,
        yakExecResult,
        aiPerfData,
        casualChat,
        reActTimelines,
        coordinatorIDs,
        getChatContentMap
    }
}

export default useAIChatUIData
