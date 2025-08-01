import {LocalModelConfig} from "../../type/aiChat"

export interface AIStartModelFormProps {
    item: LocalModelConfig
    token:string
    onSuccess: () => void
}
