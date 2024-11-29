import {YaklangEngineMode} from "@/yakitGVDefine"

/** Yakit链接模式 远程/本地 */
let EngineMode: YaklangEngineMode | undefined = undefined

export const setYakitEngineMode = (v?: YaklangEngineMode) => {
    EngineMode = v
}

export const getYakitEngineMode = () => {
    return EngineMode
}