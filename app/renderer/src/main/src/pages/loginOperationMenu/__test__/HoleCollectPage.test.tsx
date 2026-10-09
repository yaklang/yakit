import type { TableProps } from 'antd'
import type * as Antd from 'antd'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HoleCollectPage } from '../HoleCollectPage'
import { NetWorkApi } from '@/services/fetch'
import type { API } from '@/services/swagger/resposeType'

const mocks = vi.hoisted(() => ({
  exportData: undefined as undefined | ((query: { Page: number; Limit: number }) => Promise<unknown>),
}))

vi.hoisted(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  })
  Object.defineProperty(window, 'require', {
    configurable: true,
    value: () => ({ ipcRenderer: { invoke: vi.fn() } }),
  })
})
vi.mock('@/services/fetch', () => ({ NetWorkApi: vi.fn() }))
vi.mock('@/utils/notification', () => ({ failed: vi.fn(), success: vi.fn() }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }),
}))
vi.mock('@/pages/risks/RiskTable', () => ({ TitleColor: [], RiskDetails: () => null, cellColorFontSetting: {} }))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({ showYakitModal: vi.fn() }))
vi.mock('@/components/DataExport/DataExport', () => ({
  ExportExcel: ({ getData }: { getData: typeof mocks.exportData }) => {
    mocks.exportData = getData
    return null
  },
}))
vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof Antd>()
  return {
    ...actual,
    Table: ({ title, onChange }: TableProps<API.RiskLists>) => (
      <div>
        {title?.([])}
        <button
          onClick={() =>
            onChange?.({ current: 2, pageSize: 10 }, {}, {}, { currentDataSource: [], action: 'paginate' })
          }
        >
          下一页
        </button>
      </div>
    ),
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(NetWorkApi).mockImplementation(async (config) => {
    if (config.url === 'risk/type') return { data: [] }
    // 模拟服务端：分页和排序四个必填字段均从 POST 请求体读取。
    const body = config.data as Partial<API.GetRiskRequest>
    for (const key of ['page', 'limit', 'order_by', 'order'] as const) {
      if (!body?.[key]) throw new Error(`${key} in body is required`)
    }
    return { data: [], pagemeta: { page: body.page, limit: body.limit, total: 40 } }
  })
})

describe('企业风险列表查询参数', () => {
  it('初次加载、带筛选条件查询和翻页均将分页放入请求体', async () => {
    render(<HoleCollectPage />)
    await waitFor(() =>
      expect(NetWorkApi).toHaveBeenCalledWith({
        method: 'post',
        url: 'risk',
        data: { page: 1, limit: 20, order_by: 'id', order: 'desc' },
      }),
    )

    fireEvent.change(screen.getByPlaceholderText('HoleCollectPage.inputVulnerabilityTitle'), {
      target: { value: 'SQL' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'HoleCollectPage.search' }))
    await waitFor(() =>
      expect(NetWorkApi).toHaveBeenCalledWith({
        method: 'post',
        url: 'risk',
        data: expect.objectContaining({ search: 'SQL', page: 1, limit: 20, order_by: 'id', order: 'desc' }),
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    await waitFor(() =>
      expect(NetWorkApi).toHaveBeenCalledWith({
        method: 'post',
        url: 'risk',
        data: expect.objectContaining({ search: 'SQL', page: 2, limit: 10, order_by: 'id', order: 'desc' }),
      }),
    )
  })

  it('导出使用自身分页并保留当前筛选条件', async () => {
    render(<HoleCollectPage />)
    fireEvent.change(screen.getByPlaceholderText('HoleCollectPage.inputVulnerabilityTitle'), {
      target: { value: 'SQL' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'HoleCollectPage.search' }))
    await waitFor(() =>
      expect(NetWorkApi).toHaveBeenCalledWith({
        method: 'post',
        url: 'risk',
        data: expect.objectContaining({ search: 'SQL', page: 1, limit: 20, order_by: 'id', order: 'desc' }),
      }),
    )
    await act(async () => {
      const result = await mocks.exportData?.({ Page: 3, Limit: 50 })
      expect(result).toMatchObject({ response: { Pagination: { Page: 3, Limit: 50 }, Total: 40 } })
    })
    expect(NetWorkApi).toHaveBeenCalledWith({
      method: 'post',
      url: 'risk',
      data: expect.objectContaining({ search: 'SQL', page: 3, limit: 50, order_by: 'id', order: 'desc' }),
    })
  })
})
