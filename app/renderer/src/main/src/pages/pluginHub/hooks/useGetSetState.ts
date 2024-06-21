import {SetStateAction, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"

/**
 * @description 在设置值时，注意对象类型使用的是引用
 */
function useGetSetState<T>(target: T): [T, (initState: SetStateAction<T>) => void, () => T] {
    const [value, setValue] = useState<T>(target)
    const valueRef = useRef<T>(target)

    const onSetValue = useMemoizedFn((initState: SetStateAction<T>) => {
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
