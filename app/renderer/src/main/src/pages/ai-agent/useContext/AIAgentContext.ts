import {Dispatch, SetStateAction, createContext} from "react"
import {AIAgentSetting, RenderMCPClientInfo} from "../aiAgentType"
import {DefaultAIAgentSetting} from "../defaultConstant"

export interface AIAgentContextStore {
    mcpServers: RenderMCPClientInfo[]
    setting: AIAgentSetting
}

export interface AIAgentContextDispatcher {
    setMCPServers?: Dispatch<SetStateAction<RenderMCPClientInfo[]>>
    setSetting?: Dispatch<SetStateAction<AIAgentSetting>>
}

export interface AIAgentContextValue {
    store: AIAgentContextStore
    dispatcher: AIAgentContextDispatcher
}

export default createContext<AIAgentContextValue>({
    store: {
        mcpServers: [],
        setting: {...DefaultAIAgentSetting}
    },
    dispatcher: {
        setMCPServers: undefined,
        setSetting: undefined
    }
})
