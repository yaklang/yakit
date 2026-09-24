import { describe, expect, it, vi } from 'vitest'
import type { TFunction } from '@/i18n/useI18nNamespaces'
// 先于被测模块注册 window.require('electron') stub（AIModelForm 导入链顶层会解构 ipcRenderer）
import '../../../../ai-re-act/hooks/__test__/setupElectron'
import { AIModelTypeEnum } from '../../../defaultConstant'
import { getModelLabelByModelType } from '../AIModelForm'

// lottie-web 在 jsdom 中加载即访问 canvas 上下文（依赖链经组件引入），mock 掉以隔离
vi.mock('lottie-web', () => ({ default: { loadAnimation: vi.fn(), destroy: vi.fn() } }))

const t = ((key: string) => key) as TFunction

describe('getModelLabelByModelType', () => {
  it('模型类型映射到对应 i18n key', () => {
    expect(getModelLabelByModelType(t, AIModelTypeEnum.TierIntelligent)).toBe('AiAgengt.intelligentModels')
    expect(getModelLabelByModelType(t, AIModelTypeEnum.TierLightweight)).toBe('AiAgengt.lightweightModels')
    expect(getModelLabelByModelType(t, AIModelTypeEnum.TierVision)).toBe('AiAgengt.visionModels')
  })

  it('未知类型回退到未知模型文案', () => {
    expect(getModelLabelByModelType(t, 'unknown' as never)).toBe('AIContextToken.unknownModel')
  })
})
