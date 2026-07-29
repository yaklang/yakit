import { yakitSystem } from '@/services/electronBridge'

/** 操作系统 */
export type System = 'Linux' | 'Darwin' | 'Windows_NT'
/** CPU架构 */
export type Architecture =
  | 'arm'
  | 'arm64'
  | 'ia32'
  | 'mips'
  | 'mipsel'
  | 'ppc'
  | 'ppc64'
  | 'riscv64'
  | 's390'
  | 's390x'
  | 'x64'

interface SystemInfoProps {
  /** 操作系统 */
  system?: System
  /** 系统架构 */
  architecture?: Architecture
  /** 是否为开发环境 */
  isDev?: boolean
  /** 本地模式或者远程模式 */
  mode?: 'local' | 'remote' | undefined
}

export const SystemInfo: SystemInfoProps = {
  system: undefined,
  architecture: undefined,
  isDev: undefined,
  mode: undefined,
}

export const handleFetchSystemInfo = async () => {
  try {
    SystemInfo.system = await yakitSystem.fetchSystemName()
  } catch (error) {}
  try {
    SystemInfo.architecture = await yakitSystem.fetchCpuArch()
  } catch (error) {}
  try {
    SystemInfo.isDev = !!(await yakitSystem.isDev())
  } catch (error) {}
}

export const handleFetchSystem = async (callback?: (value: System | undefined) => any) => {
  try {
    SystemInfo.system = await yakitSystem.fetchSystemName()
  } catch (error) {}
  if (callback) callback(SystemInfo.system)
}

export const handleFetchArchitecture = async (callback?: (value: Architecture | undefined) => any) => {
  try {
    SystemInfo.architecture = await yakitSystem.fetchCpuArch()
  } catch (error) {}
  if (callback) callback(SystemInfo.architecture)
}

export const handleFetchIsDev = async (callback?: (value: boolean | undefined) => any) => {
  try {
    SystemInfo.isDev = !!(await yakitSystem.isDev())
  } catch (error) {}
  if (callback) callback(SystemInfo.isDev)
}
