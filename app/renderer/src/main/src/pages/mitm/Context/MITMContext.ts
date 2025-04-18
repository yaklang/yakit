import {YakitRoute} from "@/enums/yakitRoute"
import {createContext} from "react"

export interface MITMContext {
    mitmStore: MITMContextStore
    // dispatcher: MITMContextDispatcher
}

export interface MITMContextStore {
    version: string
    route: YakitRoute
}
interface MITMContextDispatcher {
    setVersion: (s: string) => void
}

export default createContext<MITMContext>({
    mitmStore: {
        version: "V2", // 默认v2版本
        route: YakitRoute.MITMHacker // 默认v2版本
    }
    // dispatcher: {
    //     setVersion:()=>{}
    // }
})

export enum MITMVersion {
    V1 = "", // v1版本就是空字符
    V2 = "V2"
}
