import type { GrpcOutput } from '@/services/ipc'
import { int64ToSafeNumber } from '@/utils/int64'
export enum ShellType {
  Behinder = 'Behinder',
  Godzilla = 'Godzilla',
}

export enum ShellScript {
  JSP = 'JSP',
  JSPX = 'JSPX',
  ASP = 'ASP',
  ASPX = 'ASPX',
  PHP = 'PHP',
}

export enum EncMode {
  Raw = 'Raw',
  Base64 = 'Base64',
  AesRaw = 'AesRaw',
  AesBase64 = 'AesBase64',
  XorRaw = 'XorRaw',
  XorBase64 = 'XorBase64',
}

export interface WebShellDetail {
  Id: string
  Url: string
  Pass: string
  SecretKey: string
  EncMode: string
  Charset: string
  ShellType: 'Behinder' | 'Godzilla'
  ShellScript: string
  Status: boolean
  Tag: string
  Proxy: string
  Headers: { [key: string]: string }
  Remark: string
  CreatedAt: number
  UpdatedAt: number
  PacketCodecName: string
  PayloadCodecName: string
}

export function webShellForUI(row: GrpcOutput<'CreateWebShell'>): WebShellDetail {
  if (row.ShellType !== 'Behinder' && row.ShellType !== 'Godzilla')
    throw new Error('未知 WebShell 类型: ' + row.ShellType)
  return {
    ...row,
    ShellType: row.ShellType,
    CreatedAt: int64ToSafeNumber(row.CreatedAt),
    UpdatedAt: int64ToSafeNumber(row.UpdatedAt),
  }
}
export function webShellsForUI(value: GrpcOutput<'QueryWebShells'>) {
  return { ...value, Data: value.Data.map(webShellForUI) }
}
