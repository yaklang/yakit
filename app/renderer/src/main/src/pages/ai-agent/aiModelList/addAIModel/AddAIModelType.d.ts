import {UpdateLocalModelRequest} from "../../type/aiChat"

export interface AddAIModelProps {
    defaultValues?: UpdateLocalModelRequest
    onCancel: () => void
}
