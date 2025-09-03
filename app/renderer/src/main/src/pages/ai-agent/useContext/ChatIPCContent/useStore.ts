import {useContext} from "react"
import ChatIPCContext, {ChatIPCContextStore} from "./ChatIPCContent"

export default function useChatIPCStore(): ChatIPCContextStore {
    const {store} = useContext(ChatIPCContext)
    return store
}
