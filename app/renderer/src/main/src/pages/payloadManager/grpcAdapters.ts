import type { GrpcOutput } from '@/services/ipc'
import { int64ToSafeNumber } from '@/utils/int64'
import type { PayloadGroupNodeProps } from './newPayload'

function payloadNodeForUI(value: GrpcOutput<'GetAllPayloadGroup'>['Nodes'][number]): PayloadGroupNodeProps {
  if (value.Type !== 'File' && value.Type !== 'Folder' && value.Type !== 'DataBase') {
    throw new Error('未知字典节点类型: ' + value.Type)
  }
  return {
    ...value,
    Type: value.Type,
    Number: int64ToSafeNumber(value.Number),
    Nodes: value.Nodes.map(payloadNodeForUI),
  }
}

export function payloadGroupsForUI(value: GrpcOutput<'GetAllPayloadGroup'>) {
  return { ...value, Nodes: value.Nodes.map(payloadNodeForUI) }
}

export function payloadsForUI(value: GrpcOutput<'QueryPayload'>) {
  return { ...value, Data: value.Data.map((row) => ({ ...row, HitCount: int64ToSafeNumber(row.HitCount) })) }
}
