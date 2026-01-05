import {useEffect, useState} from "react"
import {useTimeout} from "ahooks"

interface UseAISystemStreamProps {
    value?: string
    systemStream?: string
    delay?: number
    enabled?: boolean
}
type AISystemStreamMode = "value" | "systemStream"

const useAISystemStream = ({value, systemStream, delay = 2000, enabled = true}: UseAISystemStreamProps) => {
    const [displayValue, setDisplayValue] = useState(value)
    const [mode, setMode] = useState<AISystemStreamMode>("value")
    const [timeoutDelay, setTimeoutDelay] = useState<number | undefined>()

    useTimeout(() => {
        if (!enabled) return
        setDisplayValue(systemStream)
        setTimeoutDelay(undefined)
        setMode("systemStream")
    }, timeoutDelay)

    useEffect(() => {
        if (!enabled) {
            setTimeoutDelay(undefined)
            return
        }
        setDisplayValue(value)
        setTimeoutDelay(delay)
        setMode("value")
    }, [value, enabled, delay])

    return {displayValue,mode}
}

export default useAISystemStream
