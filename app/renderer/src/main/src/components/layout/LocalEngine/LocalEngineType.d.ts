import React, {Dispatch, SetStateAction} from "react"
import {YakitStatusType, YakitSystem} from "@/yakitGVDefine"

export interface LocalEngineProps {
    ref?: React.ForwardedRef<LocalEngineLinkFuncProps>
    setLog: Dispatch<SetStateAction<string[]>>
    onLinkEngine: (port: number) => any
    setYakitStatus: (v: YakitStatusType) => any
    checkEngineDownloadLatestVersion: () => any
    setOldLink: (v: boolean) => any
    openEngineLinkWin: (type: YakitSettingCallbackType | YaklangEngineMode | YakitStatusType) => any
}

export interface LocalEngineLinkFuncProps {
    /** 初始化并检查所有前置项后的本地连接 */
    init: () => any
    /** 检查引擎版本后的本地连接 */
    link: () => any
    /** 引擎版本问题后的内置版本解压弹框确认 */
    resetBuiltIn: () => void
}
