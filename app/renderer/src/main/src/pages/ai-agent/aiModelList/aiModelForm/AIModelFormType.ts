import {ThirdPartyApplicationConfigProp} from "@/components/configNetwork/NewThirdPartyApplicationConfig"
import {AIModelConfig, AIModelTypeFileName, AIConfigHealthCheckResponse} from "../utils"
import {AIModelTypeEnum} from "../../defaultConstant"
import {FormItemProps} from "antd"

export interface AIModelFormProps {
    item?: AIModelConfig
    aiModelType?: AIModelTypeEnum
    thirdPartyApplicationConfig?: ThirdPartyApplicationConfigProp
    onSuccess?: () => void
    onClose: () => void
}

export interface AIConfigAPIKeyFormItemProps {
    formProps: FormItemProps
    aiType?: string
}

export interface AIModelFormSetAIGlobalConfigOptions {
    aiService: string
    aiModelName: string
    fileName?: AIModelTypeFileName
}

interface AddOrUpdateOptions {
    aiModelName: string
    modelType: AIModelTypeEnum
}
export interface AIModelFormAddOptions extends AddOrUpdateOptions {}

export interface AIModelFormUpdateOptions extends AddOrUpdateOptions {}

export interface AIModelCheckResultProps {
    testResult?: AIConfigHealthCheckResponse
    onClose: () => void
}
