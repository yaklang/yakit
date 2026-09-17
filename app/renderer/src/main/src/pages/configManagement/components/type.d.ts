export interface ExportHotPatchFormValues {
  OutputPluginDir?: string
  OutputFilename: string
  Password?: string
}

interface HotPatchTemplateRequest {
  Name?: string[]
  Type: 'fuzzer' | 'mitm' | 'httpflow-analyze' | 'global'
}

export interface ExportHotPatchTemplateStreamRequest extends ExportHotPatchFormValues {
  Filter: HotPatchTemplateRequest
}

export interface BatchExportHotPatchTemplateRef {
  open: (params: Partial<ExportHotPatchTemplateStreamRequest>) => void
}
export interface BatchExportHotPatchTemplateProps {}

export interface ImportHotPatchFormValues {
  Filename?: string
  Password?: string
}

export interface ImportHotPatchTemplateStreamRequest extends ImportHotPatchFormValues {
  Data?: Uint8Array
}

export interface BatchImportHotPatchTemplateRef {
  open: () => void
}
export interface BatchImportHotPatchTemplateProps {
  onSuccess?: () => void
}
