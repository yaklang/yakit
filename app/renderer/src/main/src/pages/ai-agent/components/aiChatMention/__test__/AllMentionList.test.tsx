vi.mock('antd', () => ({ Modal: () => null }))
import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ forge: vi.fn(), tool: vi.fn(), focus: vi.fn(), instances: [] as any[] }))
vi.mock('../../../grpc', () => ({ grpcQueryAIForge: m.forge, grpcQueryAIFocus: m.focus }))
vi.mock('../../../aiToolList/utils', () => ({ grpcGetAIToolList: m.tool }))
vi.mock('@/pages/invoker/schema', () => ({
  genDefaultPagination: (Limit: number) => ({ Page: 1, Limit, Order: 'desc', OrderBy: 'id' }),
}))
vi.mock('../../../defaultConstant', () => ({
  AIMentionTabsEnum: {
    All: 'all',
    Browser: 'browser',
    Forge_Name: 'forgeName',
    Tool: 'tool',
    KnowledgeBase: 'knowledgeBase',
    FocusMode: 'focusMode',
  },
}))
vi.mock('@/pages/KnowledgeBase/hooks/useKnowledgeBase', () => ({
  useKnowledgeBase: () => ({ knowledgeBases: [{ ID: 1, KnowledgeBaseName: 'manual' }] }),
}))
vi.mock('../../../browserInstances/browserInstanceStore', () => ({
  useBrowserInstances: () => ({ instances: m.instances }),
  browserInstanceMentionName: (s: any) => s.name,
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (k: string) => k }) }))
import { AllMentionList } from '../AllMentionList'
beforeEach(() => {
  vi.clearAllMocks()
  m.instances = [
    { id: 'online', name: 'browser online', online: true },
    { id: 'offline', name: 'browser offline', online: false },
  ]
  m.forge.mockResolvedValue({ Data: [{ Id: 7, ForgeName: 'forge' }], Total: 1 })
  m.tool.mockResolvedValue({ Tools: [{ ID: 7, Name: 'tool' }], Total: 1 })
  m.focus.mockResolvedValue({ Data: [{ Name: 'focus' }] })
})
afterEach(cleanup)
function setup(props: any = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const onSelect = vi.fn()
  const getContainer = () => container
  return {
    ...render(<AllMentionList query="" getContainer={getContainer} onSelect={onSelect} {...props} />, { container }),
    container,
    onSelect,
    getContainer,
  }
}
describe('grouped mention selection', () => {
  it('keeps same numeric IDs in different groups and excludes offline browser references', async () => {
    const h = setup()
    await screen.findByText('forge')
    fireEvent.click(screen.getByText('tool'))
    expect(h.onSelect).toHaveBeenLastCalledWith('tool', expect.objectContaining({ id: '7' }))
    fireEvent.click(screen.getByText('browser online'))
    expect(h.onSelect).toHaveBeenLastCalledWith('browser', expect.objectContaining({ id: 'online' }))
    expect(screen.queryByText('browser offline')).toBeNull()
    expect(screen.getByText('manual')).toBeInTheDocument()
  })
  it('honors excluded categories before requesting them', async () => {
    setup({ filterMode: ['forgeName', 'knowledgeBase', 'focusMode'] })
    await screen.findByText('tool')
    expect(m.forge).not.toHaveBeenCalled()
    expect(m.focus).not.toHaveBeenCalled()
    expect(screen.queryByText('manual')).toBeNull()
  })
  it('handles partial failures without hiding successful groups and supports retry', async () => {
    m.tool.mockRejectedValue(Error('tools offline'))
    setup()
    await screen.findByText('forge')
    expect(screen.getByRole('alert')).toHaveTextContent('tools offline')
    m.tool.mockResolvedValue({ Tools: [{ ID: 2, Name: 'recovered' }] })
    fireEvent.click(screen.getByText('SessionSkills.refresh'))
    await screen.findByText('recovered')
  })
  it('uses keyboard selection and ignores IME Enter', async () => {
    const h = setup()
    await screen.findByText('forge')
    fireEvent.keyDown(h.container, { key: 'Enter', isComposing: true })
    expect(h.onSelect).not.toHaveBeenCalled()
    fireEvent.keyDown(h.container, { key: 'ArrowDown' })
    fireEvent.keyDown(h.container, { key: 'Enter' })
    expect(h.onSelect).toHaveBeenCalledWith('tool', expect.objectContaining({ name: 'tool' }))
  })
  it('ignores stale search replies and retrieves more than the first page', async () => {
    let old!: (r: any) => void
    m.forge.mockReturnValueOnce(
      new Promise((r) => {
        old = r
      }),
    )
    const h = setup()
    m.forge.mockResolvedValue({ Data: [{ Id: 3, ForgeName: 'new match' }], Total: 50 })
    h.rerender(<AllMentionList query="new" getContainer={h.getContainer} onSelect={h.onSelect} />)
    await screen.findByText('new match')
    await act(async () => old({ Data: [{ Id: 1, ForgeName: 'old' }] }))
    expect(screen.queryByText('old')).toBeNull()
    fireEvent.click(screen.getByText('SessionSkills.more'))
    await waitFor(() =>
      expect(m.forge).toHaveBeenLastCalledWith(
        expect.objectContaining({ Pagination: expect.objectContaining({ Limit: 40 }) }),
        true,
      ),
    )
  })
})
