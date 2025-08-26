import {useContext} from "react"
import AIReActContext, {AIReActContextDispatcher} from "./AIReActContext"

export default function useAIReActDispatcher(): AIReActContextDispatcher {
    const {dispatcher} = useContext(AIReActContext)
    return dispatcher
}
