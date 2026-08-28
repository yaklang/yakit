import { isNil } from 'lodash'
import { type TFunction } from '@/i18n/useI18nNamespaces'
import type { SelectOptionsProps } from '@/demoComponents/itemSelect/ItemSelectType'
import type { ProbeReasoningEffortResponse } from '../utils'

/**扩展思考强度档位（部分厂商支持，需探测确认后展示） */
export const EXTENDED_EFFORTS = ['xhigh', 'max'] as const

/**基础档位（始终展示）；no-set 为表单哨兵值，保存时转 undefined（跟随模型默认） */
export const baseReasoningEffortOptions: (t: TFunction) => SelectOptionsProps[] = (t) => [
  { label: t('ConfigNetworkPage.effortNoSet'), value: 'no-set' },
  { label: t('ConfigNetworkPage.effortOff'), value: 'off' },
  { label: 'low', value: 'low' },
  { label: 'medium', value: 'medium' },
  { label: 'high', value: 'high' },
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
  EXTENDED_EFFORTS.forEach((effort) => {
    if (values.has(effort)) return
    if (probed?.includes(effort) || normalized === effort) {
      options.push({ label: effort, value: effort })
    }
  })
  return options
}

/**探测响应转换为支持的扩展档列表（都不支持为空数组，是合法结果） */
export const probedExtendedEffortsFromResponse = (resp: ProbeReasoningEffortResponse): string[] => {
  const efforts: string[] = []
  if (resp?.XhighSupported) efforts.push('xhigh')
  if (resp?.MaxSupported) efforts.push('max')
  return efforts
}
