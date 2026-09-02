import React from 'react'
import { act, render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// 组件依赖链上有模块在顶层 window.require('electron')，测试环境注入 stub
vi.hoisted(() => {
  const w = window as any
  w.require = (mod: string) => {
    if (mod === 'electron') {
      return { ipcRenderer: { invoke: async () => ({}), on: () => {}, off: () => {}, send: () => {} } }
    }
    return {}
  }
})

// 资源表必须定义在工厂内部：i18n.init 的预加载在 import 阶段就会触发 read
vi.mock('i18next-resources-to-backend', () => {
  const resources: Record<string, Record<string, unknown>> = {
    zh: {
      aiAgent: { AiAgengt: { reasoningEffort: '思考' } },
      configNetwork: { ConfigNetworkPage: { effortNoSet: '默认' } },
    },
    en: {
      aiAgent: { AiAgengt: { reasoningEffort: 'Thinking' } },
      configNetwork: { ConfigNetworkPage: { effortNoSet: 'Default' } },
    },
  }
  return {
    default: () => ({
      type: 'backend' as const,
      init() {},
      read(language: string, namespace: string, callback: (err: unknown, data: unknown) => void) {
        const data = resources[language]?.[namespace]
        callback(null, data !== undefined ? data : {})
      },
    }),
  }
})

import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { AIReasoningEffortSelect } from '../AIReasoningEffortSelect'

// 经 useI18nNamespaces 获取组件实际使用的 i18n 实例来切换语言；
// 不直接 import '@/i18n/i18n'：仓库根 vitest 配置会把它替换为 changeLanguage 空操作的 stub，
// 而该 hook 内部经相对路径引用的是真实单例，两种配置下行为一致
const captured: { i18n?: any } = {}
const Probe: React.FC = () => {
  const { i18n } = useI18nNamespaces(['aiAgent', 'configNetwork'] as any)
  captured.i18n = i18n
  return <AIReasoningEffortSelect />
}

describe('AIReasoningEffortSelect 语言切换', () => {
  it(
    'changeLanguage 后 pill 文案应随语言更新（aiAgent + 懒加载 configNetwork 双命名空间）',
    { timeout: 20000 },
    async () => {
      const { container } = render(
        <React.Suspense fallback={null}>
          <Probe />
        </React.Suspense>,
      )
      const pill = () => container.querySelector('.ant-select-selection-item')?.textContent || ''

      // 懒加载 configNetwork 与防抖刷新完成后，pill 显示中文占位
      await waitFor(() => expect(pill()).toContain('思考'), { timeout: 5000 })

      await act(async () => {
        await captured.i18n?.changeLanguage('en')
      })
      await waitFor(() => expect(pill()).toContain('Thinking'), { timeout: 5000 })
    },
  )
})
