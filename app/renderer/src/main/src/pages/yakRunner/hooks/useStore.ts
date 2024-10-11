import {useContext} from "react"
import YakRunnerContext, {YakRunnerContextStore} from "./YakRunnerContext"

export default function useStore(): YakRunnerContextStore {
    const {store} = useContext(YakRunnerContext)
    return store
}
