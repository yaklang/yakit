import type { AddMCPServerRequest, UpdateMCPServerRequest } from '../../type/aiMCP'

export interface AIMCPFormProps {
  onCancel: (saved?: AddMCPServerRequest | UpdateMCPServerRequest) => void
  defaultValues?: UpdateMCPServerRequest
}
