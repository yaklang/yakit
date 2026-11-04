import isNil from 'lodash/isNil'
import type { TFunction } from '@/i18n/useI18nNamespaces'
import type { SelectOptionsProps } from '@/demoComponents/itemSelect/ItemSelectType'
import type { ProbeReasoningEffortResponse } from '../utils'

/**扩展思考强度档位（部分厂商支持，需探测确认后展示） */
export const EXTENDED_EFFORTS = ['xhigh', 'max'] as const

/**基础档位（始终展示）；no-set 为表单哨兵值，保存时转 undefined（跟随模型默认）；
 * 文案统一走 configNetwork 命名空间的 effort* key */
export const baseReasoningEffortOptions: (t: TFunction) => SelectOptionsProps[] = (t) => [
  { label: t('ConfigNetworkPage.effortDefault'), value: 'no-set' },
  { label: t('ConfigNetworkPage.effortOff'), value: 'off' },
  { label: t('ConfigNetworkPage.effortLow'), value: 'low' },
  { label: t('ConfigNetworkPage.effortMedium'), value: 'medium' },
  { label: t('ConfigNetworkPage.effortHigh'), value: 'high' },
]

/**旧值迁移到新档位语义；空值归一为 no-set */
export const normalizeReasoningEffort = (v?: string): string => {
  if (isNil(v) || v === '' || v === 'auto' || v === 'default') return 'no-set'
  if (v === 'middle') return 'medium'
  if (v === 'none' || v === 'disabled') return 'off'
  return v
}

/**基础档 + 已探测支持的扩展档；当前值为扩展档但尚未探测通过时也追加，避免下拉框显示空标签 */
export const buildReasoningEffortOptions = (
  t: TFunction,
  probed?: string[],
  currentValue?: string,
): SelectOptionsProps[] => {
  const options = [...baseReasoningEffortOptions(t)]
  const values = new Set(options.map((o) => o.value))
  const normalized = normalizeReasoningEffort(currentValue)
  const effortKeys: Record<string, string> = {
    xhigh: 'ConfigNetworkPage.effortXhigh',
    max: 'ConfigNetworkPage.effortMax',
  }
  EXTENDED_EFFORTS.forEach((effort) => {
    if (values.has(effort)) return
    if (probed?.includes(effort) || normalized === effort) {
      options.push({ label: t(effortKeys[effort]), value: effort })
    }
  })
  return options
}

export interface EffortProbeResult {
  /** 所有扩展档位是否都得到了无错误的探测结果 */
  conclusive: boolean
  /**本次探测确认支持的扩展档位 */
  efforts: string[]
}

/** 收集明确支持的档位。有错误说明的否定结果不视为已完成探测。 */
export const effortProbeResultFromResponse = (resp: ProbeReasoningEffortResponse): EffortProbeResult => {
  const efforts: string[] = []
  let conclusive = true
  if (resp?.XhighSupported) {
    efforts.push('xhigh')
  } else if (resp?.XhighErrorMessage) {
    conclusive = false
  }
  if (resp?.MaxSupported) {
    efforts.push('max')
  } else if (resp?.MaxErrorMessage) {
    conclusive = false
  }
  return { conclusive, efforts }
}
