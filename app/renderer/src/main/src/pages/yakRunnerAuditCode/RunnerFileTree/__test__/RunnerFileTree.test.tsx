vi.hoisted(() => {
  ;(window as any).require = (id: string) => {
    if (id === 'electron') {
      return { ipcRenderer: { invoke: vi.fn(), on: vi.fn(), off: vi.fn(), send: vi.fn() } }
    }
    return {}
  }
})

import type React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { YakitSideTabProps } from '@/components/yakitSideTab/YakitSideTabType'

const store = {
  fileTree: [{ path: '/proj' }],
  activeFile: undefined,
  projectName: 'demo',
  pageInfo: undefined,
  areaInfo: [] as { elements: { files: unknown[] }[] }[],
}

vi.mock('../../hooks/useStore', () => ({
  default: () => store,
}))

vi.mock('../../hooks/useDispatcher', () => ({
  default: () => ({ handleFileLoadData: vi.fn(), setRuntimeID: vi.fn() }),
}))

vi.mock('../../utils', () => ({
  grpcFetchAuditTree: vi.fn().mockResolvedValue({ res: { Resources: [] } }),
  grpcFetchAuditCodeRiskOrRuleList: vi.fn().mockResolvedValue({ Data: [] }),
  grpcFetchRiskOrRuleTree: vi.fn().mockResolvedValue({ res: {}, data: [] }),
  removeAuditCodeAreaFileInfo: vi.fn(),
  setAuditCodeAreaFileActive: vi.fn(),
  updateAuditCodeAreaFileInfo: vi.fn(),
}))

vi.mock('../../FileTreeMap/FileMap', () => ({
  getMapFail: {},
  getMapFileDetail: () => ({
    parent: null,
    name: 'proj',
    path: '/proj',
    isFolder: true,
    icon: '',
  }),
}))

vi.mock('../../FileTreeMap/ChildMap', () => ({
  getMapFolderDetail: () => [],
}))

vi.mock('../../FileTree/FileTree', () => ({
  FileTree: () => <div>file-tree</div>,
}))

vi.mock('../../AuditCode/AuditCode', () => ({
  AfreshAuditModal: () => null,
  AuditHistoryTable: () => null,
}))

vi.mock('../../AuditSearchModal/AuditSearch', () => ({
  AuditSearchModal: () => null,
}))

vi.mock('../../GlobalFilterFunction/GlobalFilterFunction', () => ({
  default: () => <div>global-filter</div>,
}))

vi.mock('../../AuditCodeRuleGenChat', () => ({
  AuditCodeRuleGenChat: () => <div>rule-generate</div>,
}))

vi.mock('@/pages/yakRunnerScanHistory/utils', () => ({
  apiQuerySSAPrograms: vi.fn().mockResolvedValue({ Data: [] }),
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0, i18n: { language: 'zh' } }),
}))

vi.mock('@/components/yakitSideTab/YakitSideTab', () => ({
  YakitSideTab: ({ yakitTabs, onActiveKey, activeKey }: YakitSideTabProps) => (
    <div>
      <output aria-label="active">{activeKey}</output>
      {yakitTabs.map((tab) => (
        <button key={tab.value} type="button" onClick={() => onActiveKey?.(tab.value)}>
          {tab.value}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('@/components/yakitUI/YakitDrawer/YakitDrawer', () => ({
  YakitDrawer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}))

vi.mock('@/pages/yakRunner/CollapseList/CollapseList', () => ({
  CollapseList: () => null,
}))

import { RunnerFileTree } from '../RunnerFileTree'

const tabValues = new Set(['all', 'file', 'rule', 'rule-generate', 'global-filtering-function'])
const toolbarButtons = () => screen.getAllByRole('button').filter((button) => !tabValues.has(button.textContent || ''))

describe('RunnerFileTree', () => {
  beforeEach(() => {
    store.pageInfo = undefined
    store.fileTree = [{ path: '/proj' }]
  })

  it('默认 all 页展示定位/搜索/刷新/新增四个工具按钮', () => {
    render(<RunnerFileTree fileTreeLoad={false} boxHeight={400} />)
    expect(screen.getByLabelText('active')).toHaveTextContent('all')
    expect(toolbarButtons()).toHaveLength(4)
  })

  it('切到全局过滤函数页时隐藏文件树工具按钮', async () => {
    const user = userEvent.setup()
    const onActiveTabChange = vi.fn()
    render(<RunnerFileTree fileTreeLoad={false} boxHeight={400} onActiveTabChange={onActiveTabChange} />)

    await user.click(screen.getByRole('button', { name: 'global-filtering-function' }))
    expect(onActiveTabChange).toHaveBeenCalledWith('global-filtering-function')
    expect(screen.getByLabelText('active')).toHaveTextContent('global-filtering-function')
    expect(toolbarButtons()).toHaveLength(0)
  })
})
