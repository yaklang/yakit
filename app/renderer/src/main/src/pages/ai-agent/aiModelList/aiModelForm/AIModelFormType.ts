import { ThirdPartyApplicationConfigProp } from '@/components/configNetwork/NewThirdPartyApplicationConfig'
import { AIModelConfig, AIModelTypeFileName, AIConfigHealthCheckResponse } from '../utils'
import { AIModelTypeEnumType } from '../../defaultConstant'
import { FormItemProps } from 'antd'
import { ThirdPartyApplicationConfig } from '@/components/configNetwork/ConfigNetworkPage'

export interface AIModelFormProps {
  item?: AIModelConfig
  aiModelType?: AIModelTypeEnumType
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
  modelType: AIModelTypeEnumType
}
export interface AIModelFormAddOptions extends AddOrUpdateOptions {}

export interface AIModelFormUpdateOptions extends AddOrUpdateOptions {}

export interface AIModelCheckResultProps {
  testResult?: AIConfigHealthCheckResponse
  onClose: () => void
  onApplyRecommendConfig?: (config: ThirdPartyApplicationConfig) => void
  aiModelType?: AIModelTypeEnumType
  model?: string
}
