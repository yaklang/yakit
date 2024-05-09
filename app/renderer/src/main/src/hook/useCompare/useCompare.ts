import {useRef} from "react"
import {isEqual} from "lodash"

export const useCampare = (value: any) => {
    const ref = useRef<any>(null)
    if (!isEqual(value, ref.current)) {
        ref.current = value
    }
    return ref.current
}
