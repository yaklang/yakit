import {useRef} from "react"
import {useMemoizedFn} from "ahooks"
import { randomString } from "@/utils/randomUtil"

const {ipcRenderer} = window.require("electron")

interface StreamConcurrencyConfig<TData, TParams> {
    onData: (data: TData, params: TParams, index: number) => void
    onStreamEnd?: (params: TParams, index: number) => void
    onAllCompleted?: () => void
    baseToken?: string
}

export const useStreamConcurrency = <TData = any, TParams = any>({
    onData,
    onStreamEnd,
    onAllCompleted,
    baseToken
}: StreamConcurrencyConfig<TData, TParams>) => {
    const streamsRef = useRef<Map<string, () => void>>(new Map())
    const totalRef = useRef(0)
    const completedRef = useRef(0)

   
    const checkAllCompleted = useMemoizedFn(() => {
        if (completedRef.current >= totalRef.current && totalRef.current > 0) {
            streamsRef.current.forEach((cleanup) => cleanup())
            streamsRef.current.clear()
            onAllCompleted?.()
        }
    })

    const startConcurrency = useMemoizedFn((httpParams: TParams[]) => {
        if (!httpParams?.length) return

        const token = baseToken || `stream-${randomString(40)}`
        
        totalRef.current = httpParams.length
        completedRef.current = 0
        streamsRef.current.clear()

        httpParams.forEach((params, index) => {
            const streamToken = `${token}-${index}`
            const dataToken = `${streamToken}-data`
            const errToken = `${streamToken}-error`
            const endToken = `${streamToken}-end`

            const handleData = (_: any, data: TData) => {
                onData(data, params, index)
            }

            const handleError = () => {
                checkAllCompleted()
            }

            const handleEnd = () => {
                completedRef.current++
                onStreamEnd?.(params, index)
                checkAllCompleted()
            }

            ipcRenderer.on(dataToken, handleData)
            ipcRenderer.on(errToken, handleError)
            ipcRenderer.on(endToken, handleEnd)

            ipcRenderer.invoke("HTTPFuzzer", params, streamToken).catch(() => {
                completedRef.current++
                checkAllCompleted()
            })

            streamsRef.current.set(streamToken, () => {
                ipcRenderer.invoke("cancel-HTTPFuzzer", streamToken)
                ipcRenderer.removeAllListeners(dataToken)
                ipcRenderer.removeAllListeners(errToken)
                ipcRenderer.removeAllListeners(endToken)
            })
        })
    })

    const cancelConcurrency = useMemoizedFn(() => {
        streamsRef.current.forEach((cleanup) => cleanup())
        streamsRef.current.clear()
        totalRef.current = 0
        completedRef.current = 0
    })

    return {startConcurrency, cancelConcurrency}
}


