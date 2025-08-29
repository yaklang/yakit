import {useContext} from "react"
import AIReActContext, {AIReActContextStore} from "./AIReActContext"

export default function useAIReActStore(): AIReActContextStore {
    const {store} = useContext(AIReActContext)
    return store
}
