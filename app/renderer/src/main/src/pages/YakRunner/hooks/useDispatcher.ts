import {useContext} from "react"
import YakRunnerContext, {YakRunnerContextDispatcher} from "./YakRunnerContext"

export default function useDispatcher(): YakRunnerContextDispatcher {
    const {dispatcher} = useContext(YakRunnerContext)
    return dispatcher
}
