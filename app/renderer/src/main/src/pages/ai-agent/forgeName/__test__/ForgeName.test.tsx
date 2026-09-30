import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ForgeName.tsx 模块顶层解构 window.require('electron')，必须在 import 被测模块之前挂上
vi.hoisted(() => {
  const w = window as unknown as { require: (id: string) => unknown }
  w.require = (id: string) => {
    if (id === 'electron') return { ipcRenderer: { invoke: vi.fn(), on: vi.fn(), removeAllListeners: vi.fn() } }
    throw new Error(`Unexpected require: ${id}`)
  }
})
// 捕获 ImportExportModal 收到的 props（extra / renderForm / formProps / onSubmitForm）
const modalPropsRef = vi.hoisted(() => ({ current: null as any }))
vi.mock('@/components/ImportExportModal/ImportExportModal', async () => {
  const React = await import('react')
  return {
    default: (props: any) => {
      modalPropsRef.current = props
      return React.createElement('div', { 'data-testid': 'import-export-modal' })
    },
  }
})

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/utils/openWebsite', () => ({ openABSFileLocated: vi.fn() }))
vi.mock('../../grpc', () => ({
  grpcDeleteAIForge: vi.fn(),
  grpcGetAIForge: vi.fn(),
  grpcQueryAIForge: vi.fn(),
}))
vi.mock('../../aiToolList/utils', () => ({
  grpcGetAIToolList: vi.fn(async () => ({ Tools: [], Pagination: { Page: 1, Limit: 20 }, Total: 0 })),
}))
vi.mock('../../defaultConstant', () => ({
  AIForgeListDefaultPagination: { Page: 1, Limit: 20, OrderBy: 'created_at', Order: 'desc' },
  defaultExportAIForgeRequest: {
    ForgeNames: [],
    TargetPath: '',
    OutputName: '',
    ToolNames: [],
    Password: '',
    Filter: {},
  },
  ReActChatEventEnum: {},
}))
vi.mock('@/components/yakitUI/YakitForm/YakitForm', () => ({ YakitFormDragger: () => null }))
vi.mock('@/components/TableVirtualResize/YakitProtoCheckbox/YakitProtoCheckbox', () => ({
  YakitProtoCheckbox: () => null,
}))

import { BatchExportAIforge, ImportAIforge } from '../ForgeName'
import type { BatchExportAIforgeRef, ImportAIforgeRef } from '../type'
import { yakitNotify } from '@/utils/notification'

/** 从 renderForm() 的 JSX 树里按 Form.Item name / 组件特征取元素 */
const findFormItem = (name: string) => {
  const children = modalPropsRef.current.renderForm().props.children as any[]
  return children.find((c) => c?.props?.name === name || c?.props?.formItemProps?.name === name)
}

const renderExportModal = (isTool?: boolean) => {
  const ref: { current: BatchExportAIforgeRef | null } = { current: null }
  render(<BatchExportAIforge ref={ref} isTool={isTool} />)
  return ref
}

const renderImportModal = (isTool?: boolean, onSuccess?: () => void) => {
  const ref: { current: ImportAIforgeRef | null } = { current: null }
  render(<ImportAIforge ref={ref} isTool={isTool} onSuccess={onSuccess} />)
  return ref
}

describe('ForgeName 导入导出弹窗 isTool 分支', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    modalPropsRef.current = null
  })

  it('isTool 导出：apiKey/title 切到工具，且带入 ToolNames 时为必填', () => {
    const ref = renderExportModal(true)
    act(() => {
      ref.current?.open({ ToolNames: ['tool-a'], OutputName: 'x' })
    })
    const props = modalPropsRef.current
    expect(props.extra.apiKey).toBe('ExportAITool')
    expect(props.extra.type).toBe('export')
    expect(props.extra.title).toBe('ForgeName.exportTool')
    expect(props.formProps.initialValues.ToolNames).toEqual(['tool-a'])

    const toolItem = findFormItem('ToolNames')
    expect(toolItem.props.rules[0].required).toBe(true)
  })

  it('isTool 全选入口（Filter）：ToolNames 非必填，提交参数保留 Filter', () => {
    const ref = renderExportModal(true)
    act(() => {
      ref.current?.open({ Filter: { Keyword: 'kw', OnlyFavorites: true } })
    })
    const props = modalPropsRef.current
    expect(props.extra.apiKey).toBe('ExportAITool')
    expect(props.formProps.initialValues.ToolNames).toEqual([])

    const toolItem = findFormItem('ToolNames')
    expect(toolItem.props.rules[0].required).toBe(false)

    const merged = props.onSubmitForm({ OutputName: 'n', ToolNames: [], Password: '' })
    expect(merged).toMatchObject({ OutputName: 'n', Filter: { Keyword: 'kw', OnlyFavorites: true } })
  })

  it('默认（技能）导出：apiKey/title 保持 Forge 语义，ToolNames 不强制', () => {
    const ref = renderExportModal()
    act(() => {
      ref.current?.open({ ForgeNames: ['f1'], ToolNames: ['t1'] })
    })
    const props = modalPropsRef.current
    expect(props.extra.apiKey).toBe('ExportAIForge')
    expect(props.extra.title).toBe('ForgeName.exportForge')

    const toolItem = findFormItem('ToolNames')
    expect(toolItem.props.rules[0].required).toBe(false)
  })

  it('isTool 导入：apiKey 切到工具，文件选择限定为文件', () => {
    const ref = renderImportModal(true)
    act(() => {
      ref.current?.open()
    })
    const props = modalPropsRef.current
    expect(props.extra.apiKey).toBe('ImportAITool')
    expect(props.extra.type).toBe('import')
    expect(props.extra.title).toBe('ForgeName.importTool')

    const dragger = findFormItem('InputPath')
    expect(dragger.props.selectType).toBe('file')
    expect(dragger.props.formItemProps.name).toBe('InputPath')
  })

  it('默认（技能）导入：apiKey 保持 Forge，文件选择为 all', () => {
    const ref = renderImportModal()
    act(() => {
      ref.current?.open()
    })
    const props = modalPropsRef.current
    expect(props.extra.apiKey).toBe('ImportAIForge')
    expect(props.extra.title).toBe('ForgeName.importForge')

    const dragger = findFormItem('InputPath')
    expect(dragger.props.selectType).toBe('all')
  })

  it('导入完成回调：成功时触发 onSuccess 并提示', () => {
    const onSuccess = vi.fn()
    const ref = renderImportModal(true, onSuccess)
    act(() => {
      ref.current?.open()
    })
    act(() => {
      modalPropsRef.current.onFinished(true)
    })
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(yakitNotify).toHaveBeenCalledWith('success', 'YakitNotification.imported')
  })
})
