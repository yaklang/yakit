import {UpdateMCPServerRequest} from "../../type/aiMCP"

export interface AIMCPFormProps {
    onCancel: () => void
    defaultValues?: UpdateMCPServerRequest
}
