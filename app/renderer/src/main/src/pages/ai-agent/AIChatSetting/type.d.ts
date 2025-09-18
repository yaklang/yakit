import {SliderSingleProps} from "antd"
import {AIAgentSetting} from "../aiAgentType"

export interface AIChatSettingProps {
    setting: AIAgentSetting
    setSetting?: React.Dispatch<React.SetStateAction<AIAgentSetting>>
}
export type FormItemSliderProps = SliderSingleProps
