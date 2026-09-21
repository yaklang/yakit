import { type UpdateLocalModelRequest } from '../../type/aiModel'

export interface AddAIModelProps {
  defaultValues?: UpdateLocalModelRequest
  onCancel: () => void
}
