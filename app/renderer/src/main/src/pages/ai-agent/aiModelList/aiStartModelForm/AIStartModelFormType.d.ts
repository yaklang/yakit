import { type LocalModelConfig } from '../../type/aiModel'

export interface AIStartModelFormProps {
  item: LocalModelConfig
  token: string
  onSuccess: () => void
}
