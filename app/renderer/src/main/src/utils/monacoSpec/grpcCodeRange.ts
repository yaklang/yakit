import type { GrpcOutput } from '@/services/ipc'
import { int64ToSafeNumber } from '@/utils/int64'
import type { YaklangLanguageFindResponse } from './yakCompletionSchema'

export function languageFindForUI(value: GrpcOutput<'YaklangLanguageFind'>): YaklangLanguageFindResponse {
  return {
    ...value,
    Ranges: value.Ranges.map((range) => ({
      ...range,
      StartLine: int64ToSafeNumber(range.StartLine),
      StartColumn: int64ToSafeNumber(range.StartColumn),
      EndLine: int64ToSafeNumber(range.EndLine),
      EndColumn: int64ToSafeNumber(range.EndColumn),
    })),
  }
}
