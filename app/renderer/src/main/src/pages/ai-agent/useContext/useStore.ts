import {useContext} from "react"
import AIAgentContext, {AIAgentContextStore} from "./AIAgentContext"

export default function useAIAgentStore(): AIAgentContextStore {
    const {store} = useContext(AIAgentContext)
    return store
}
