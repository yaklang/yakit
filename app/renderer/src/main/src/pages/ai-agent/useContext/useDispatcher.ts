import {useContext} from "react"
import AIAgentContext, {AIAgentContextDispatcher} from "./AIAgentContext"

export default function useAIAgentDispatcher(): AIAgentContextDispatcher {
    const {dispatcher} = useContext(AIAgentContext)
    return dispatcher
}
