import { YaklangEngineMode } from '@/yakitGVDefine'
import { DynamicStatusProps } from '@/store'

export const EngineModeVerbose = (m: YaklangEngineMode, n?: DynamicStatusProps) => {
  if (n && n.isDynamicStatus) {
    return '控制模式'
  }
  switch (m) {
    case 'local':
      return '本地模式'
    case 'remote':
      return '远程模式'
    default:
      return '未知模式'
  }
}
