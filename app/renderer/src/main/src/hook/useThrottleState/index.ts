import {Dispatch, SetStateAction, useRef, useState} from "react"
import {useMemoizedFn, useThrottleFn} from "ahooks"
import {ThrottleOptions} from "./throtleOptions"
import {isFunction} from "./utils"

type GetStateAction<S> = () => S

function useThrottleState<S>(
    initialState: S | (() => S),
    options?: ThrottleOptions
): [S, Dispatch<SetStateAction<S>>, GetStateAction<S>]
function useThrottleState<S = undefined>(
    value?: S,
    options?: ThrottleOptions
): [S | undefined, Dispatch<SetStateAction<S | undefined>>, GetStateAction<S | undefined>]

function useThrottleState<S>(value?: S, options?: ThrottleOptions) {
    const [state, setState] = useState(value)
    const stateRef = useRef(value)

    const {run} = useThrottleFn(() => {
        setState(stateRef.current)
    }, options)

    const handleSet = useMemoizedFn((patch) => {
        stateRef.current = isFunction(patch) ? patch(stateRef.current) : patch
        run()
    })

    const handleGet = useMemoizedFn(() => {
        return stateRef.current
    })

    return [state, handleSet, handleGet]
}

export default useThrottleState
