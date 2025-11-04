import {useRef} from "react"
import {useMemoizedFn} from "ahooks"
import { randomString } from "@/utils/randomUtil"

const {ipcRenderer} = window.require("electron")

interface StreamConcurrencyConfig<TData> {
    onData: (data: TData) => void
    onStreamEnd?: () => void
    baseToken?: string
}

export const useStreamConcurrency = <TData = any, TParams = any>({
    onData,
    onStreamEnd,
    baseToken
}: StreamConcurrencyConfig<TData>) => {
    const streamTokenRef = useRef<string>("")
    const cleanupRef = useRef<(() => void) | null>(null)

    const startConcurrency = useMemoizedFn((params: TParams) => {
        if (cleanupRef.current) {
            cleanupRef.current()
        }

        const token = baseToken || `stream-${randomString(40)}`
        streamTokenRef.current = token

        const dataToken = `${token}-data`
        const errToken = `${token}-error`
        const endToken = `${token}-end`

        const handleData = (_: any, data: TData) => {
            console.log(data,'data');
            onData(data)
        }

        const handleError = () => {
            onStreamEnd?.()
        }

        const handleEnd = () => {
            onStreamEnd?.()
            if (cleanupRef.current) {
                cleanupRef.current()
                cleanupRef.current = null
            }
        }

        ipcRenderer.on(dataToken, handleData)
        ipcRenderer.on(errToken, handleError)
        ipcRenderer.on(endToken, handleEnd)

        ipcRenderer.invoke("HTTPFuzzerGroup", params, token).catch(() => {
            onStreamEnd?.()
            if (cleanupRef.current) {
                cleanupRef.current()
                cleanupRef.current = null
            }
        })

        cleanupRef.current = () => {
            ipcRenderer.invoke("cancel-HTTPFuzzerGroup", token)
            ipcRenderer.removeAllListeners(dataToken)
            ipcRenderer.removeAllListeners(errToken)
            ipcRenderer.removeAllListeners(endToken)
        }
    })

    const cancelConcurrency = useMemoizedFn(() => {
        if (cleanupRef.current) {
            cleanupRef.current()
            cleanupRef.current = null
        }
        streamTokenRef.current = ""
    })

    return {startConcurrency, cancelConcurrency}
}


