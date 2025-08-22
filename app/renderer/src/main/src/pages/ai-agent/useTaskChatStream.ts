import {useRef, useState} from "react"
import {AITaskChatStreamAnswer} from "./type/aiChat"
import {useMemoizedFn} from "ahooks"

export interface UseChatDataParams {}

function useTaskChatStream(params?: UseChatDataParams) {
    const {} = params || {}

    const allStreams = useRef<AITaskChatStreamAnswer[]>([])
    const [streams, setStreams] = useState<AITaskChatStreamAnswer[]>([])

    const upadteStream = useMemoizedFn(() => {})

    const clearStreams = useMemoizedFn(() => {
        allStreams.current = []
        setStreams([])
    })

    return [streams, upadteStream, clearStreams] as const
}

export default useTaskChatStream
