import React from 'react'
import { act, render } from '@testing-library/react'
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
      configNetwork: { ConfigNetworkPage: { effortNoSet: '不设置（跟随模型默认）' } },
    },
    en: {
      aiAgent: { AiAgengt: { reasoningEffort: 'Thinking' } },
      configNetwork: { ConfigNetworkPage: { effortNoSet: 'Not set (follow model default)' } },
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

import i18nInstance from '@/i18n/i18n'
import { AIReasoningEffortSelect } from '../AIReasoningEffortSelect'

describe('AIReasoningEffortSelect 语言切换', () => {
  it(
    'changeLanguage 后 pill 文案应随语言更新（aiAgent + 懒加载 configNetwork 双命名空间）',
    { timeout: 20000 },
    async () => {
      const { container } = render(
        <React.Suspense fallback={null}>
          <AIReasoningEffortSelect />
        </React.Suspense>,
      )

      // 等待懒加载命名空间与防抖刷新完成
      await act(async () => {
        await new Promise((r) => setTimeout(r, 1200))
      })
      expect(container.querySelector('.ant-select-selection-item')?.textContent).toContain('思考')

      await act(async () => {
        await i18nInstance.changeLanguage('en')
        await new Promise((r) => setTimeout(r, 900))
      })

      expect(container.querySelector('.ant-select-selection-item')?.textContent).toContain('Thinking')
    },
  )
})
