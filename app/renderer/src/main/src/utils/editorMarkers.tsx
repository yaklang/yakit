import { MarkerSeverity, MarkerTag } from 'monaco-editor'
import { Uint8ArrayToString } from '@/utils/str'
import type { SSARisk } from '@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType'
import type { CodeRangeProps } from '@/pages/yakRunnerAuditCode/RightAuditDetail/RightAuditDetail'
import { SeverityMapTag } from '@/pages/risks/YakitRiskTable/YakitRiskTable'
import { JSONParseLog } from './tool'

export interface IMonacoEditorMarker {
  message: string
  severity: MarkerSeverity
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
  tags: MarkerTag[]
}

export interface YakStaticAnalyzeErrorResult {
  Message: Uint8Array
  /** Rich copy text from engine (hints + code context); not used for editor markers. */
  RawMessage: Uint8Array
  Severity: 'Error' | 'Warning' | 'Info' | 'Hint' | string
  StartLineNumber: number
  StartColumn: number
  EndLineNumber: number
  EndColumn: number
  Tag: 'Unnecessary' | 'Deprecated' | string
}

function getMarkerTags(name: string): MarkerTag[] {
  const tag = MarkerTag[name as keyof typeof MarkerTag]
  return tag !== undefined ? [tag] : []
}

function getMarkerSeverity(name: string): MarkerSeverity {
  const severity = MarkerSeverity[name as keyof typeof MarkerSeverity]
  return severity !== undefined ? severity : MarkerSeverity.Hint
}

export const ConvertYakStaticAnalyzeErrorToMarker = (i: YakStaticAnalyzeErrorResult): IMonacoEditorMarker => {
  return {
    // Message is the short diagnostic; RawMessage is reserved for rich copy text.
    message: Uint8ArrayToString(i.Message || new Uint8Array()),
    severity: getMarkerSeverity(i.Severity),
    startLineNumber: parseInt(`${i.StartLineNumber}`),
    startColumn: parseInt(`${i.StartColumn}`),
    endLineNumber: parseInt(`${i.EndLineNumber}`),
    endColumn: parseInt(`${i.EndColumn}`),
    tags: getMarkerTags(i.Tag),
  }
}

function getAuditMarkerSeverity(name: string): MarkerSeverity {
  const severity = MarkerSeverity[name as keyof typeof MarkerSeverity]
  return severity !== undefined ? severity : MarkerSeverity.Hint
}

export const ConvertAuditStaticAnalyzeErrorToMarker = (i: SSARisk): IMonacoEditorMarker | null => {
  try {
    const code_range: CodeRangeProps = JSONParseLog(i.CodeRange, {
      page: 'editorMarkers',
      fun: 'ConvertAuditStaticAnalyzeErrorToMarker',
    })
    const title = SeverityMapTag.filter((item) => item.key.includes(i.Severity || ''))[0]
    let Severity = ''
    switch (title.name) {
      case '信息':
        Severity = 'Hint'
        break
      case '低危':
        Severity = 'Info'
        break
      case '中危':
        Severity = 'Warning'
        break
      case '高危':
        Severity = 'Error'
        break
      case '严重':
        Severity = 'Error'
        break
    }
    return {
      message: i.Title.length > 0 ? i.Title : i.TitleVerbose || '',
      severity: getAuditMarkerSeverity(Severity),
      startLineNumber: parseInt(`${code_range.start_line}`),
      startColumn: parseInt(`${code_range.start_column}`),
      endLineNumber: parseInt(`${code_range.end_line}`),
      endColumn: parseInt(`${code_range.end_column}`),
      tags: getMarkerTags(''),
    }
  } catch (error) {
    return null
  }
}
