import { ipc } from '@/services/ipc'
import { yakitNotify } from '@/utils/notification'

export type SystemType = 'Linux' | 'Windows' | 'Mac' | 'All'
export type CmdType = 'ReverseShell' | 'MSFVenom'
export interface GetReverseShellProgramListRequest {
  System: SystemType
  CmdType: CmdType
}

export interface GetReverseShellProgramListResponse {
  ProgramList: string[]
  ShellList: string[]
}

export const apiGetReverseShellProgramList: (
  params: GetReverseShellProgramListRequest,
) => Promise<GetReverseShellProgramListResponse> = (params) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'GetReverseShellProgramList', params)
      .then(resolve)
      .catch((e) => {
        reject(e)
        yakitNotify('error', '获取ReverseShellProgram失败:' + e)
      })
  })
}

export interface GenerateReverseShellCommandRequest {
  System: SystemType
  CmdType: CmdType
  ShellType: string
  Encode: string
  Program: string
  IP: string
  port: number
}
export interface GenerateReverseShellCommandResponse {
  Status: { Ok: boolean; Reason: string }
  Result: string
}
export const apiGenerateReverseShellCommand: (
  params: GenerateReverseShellCommandRequest,
) => Promise<GenerateReverseShellCommandResponse> = (params) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'GenerateReverseShellCommand', params)
      .then((res) => {
        if (!res.Status) throw new Error('命令生成接口未返回状态')
        return { ...res, Status: res.Status }
      })
      .then(resolve)
      .catch((e) => {
        reject(e)
        yakitNotify('error', 'GenerateReverseShellCommand失败:' + e)
      })
  })
}
