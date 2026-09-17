import type { GrpcOutput } from '@/services/ipc'
import { int64ToSafeNumber } from '@/utils/int64'
import type { YakScript } from './schema'

export function yakScriptForUI(value: GrpcOutput<'GetYakScriptById'>): YakScript {
  return { ...value, CreatedAt: int64ToSafeNumber(value.CreatedAt), UpdatedAt: int64ToSafeNumber(value.UpdatedAt) }
}

export function yakScriptsForUI(value: GrpcOutput<'QueryYakScript'>) {
  return { ...value, Data: value.Data.map(yakScriptForUI) }
}

export function yakScriptGroupForUI(value: GrpcOutput<'QueryYakScriptByOnlineGroup'>) {
  return { ...value, Data: value.Data.map(yakScriptForUI) }
}

export function navigationForUI(value: GrpcOutput<'GetAllNavigationItem'>) {
  return {
    ...value,
    Data: value.Data.map((group) => ({
      ...group,
      GroupSort: int64ToSafeNumber(group.GroupSort),
      Items: group.Items.map((item) => ({
        ...item,
        GroupSort: int64ToSafeNumber(item.GroupSort),
        VerboseSort: int64ToSafeNumber(item.VerboseSort),
      })),
    })),
  }
}
