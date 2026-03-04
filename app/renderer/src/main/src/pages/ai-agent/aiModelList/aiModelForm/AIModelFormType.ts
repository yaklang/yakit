import {ThirdPartyApplicationConfigProp} from "@/components/configNetwork/NewThirdPartyApplicationConfig"
import {AIModelConfig} from "../utils"
import {AIModelTypeEnum} from "../../defaultConstant"
import {FormItemProps} from "antd"
import {KVPair} from "@/models/kv"

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
}

interface AddOrUpdateOptions {
    aiModelName: string
    modelType: AIModelTypeEnum
}
export interface AIModelFormAddOptions extends AddOrUpdateOptions {}

export interface AIModelFormUpdateOptions extends AddOrUpdateOptions {}
