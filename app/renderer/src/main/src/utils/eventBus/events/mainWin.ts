import {YakitSettingCallbackType, YakitStatusType, YaklangEngineMode} from "@/yakitGVDefine"

export type MainWinOperatorEventProps = {
    /**销毁主窗口antd ui */
    destroyMainWinAntdUiEvent?: string
    /**通知打开连接窗口 */
    openEngineLinkWin: YakitSettingCallbackType | YaklangEngineMode | YakitStatusType
}
