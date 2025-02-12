import {Dispatch, SetStateAction, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"

type GetStateAction<S> = () => S

function useGetSetState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>, GetStateAction<S>]
function useGetSetState<S = undefined>(): [
    S | undefined,
    Dispatch<SetStateAction<S | undefined>>,
    GetStateAction<S | undefined>
]

/**
 * @description 在设置值时，注意对象类型使用的是引用
 */
function useGetSetState<S>(target?: S) {
    const [value, setValue] = useState(target)
    const valueRef = useRef(target)

    const onSetValue = useMemoizedFn((initState: SetStateAction<S>) => {
        try {
            if (typeof initState === "function") {
                setValue((old) => {
                    valueRef.current = (initState as Function)(old)
                    return (initState as Function)(old)
                })
            } else {
                valueRef.current = initState
                setValue(initState)
            }
        } catch (error) {
            console.error(error)
        }
    })
    const onGetValue = useMemoizedFn(() => {
        return valueRef.current
    })

    return [value, onSetValue, onGetValue]
}

export default useGetSetState
