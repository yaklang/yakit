import React, {Dispatch, SetStateAction} from "react"
import {YakitSystem} from "@/yakitGVDefine"

export interface LocalEngineProps {
    ref?: React.ForwardedRef<LocalEngineLinkFuncProps>
    system: YakitSystem
    setLog: Dispatch<SetStateAction<string[]>>
    onLinkEngine: (port: number) => any
    setYakitStatus: (v: YakitStatusType) => any
    checkEngineDownloadLatestVersion: () => any
}

export interface LocalEngineLinkFuncProps {
    /** 初始化并检查所有前置项后的本地连接 */
    init: () => any
    /** 检查引擎版本后的本地连接 */
    link: () => any
}
