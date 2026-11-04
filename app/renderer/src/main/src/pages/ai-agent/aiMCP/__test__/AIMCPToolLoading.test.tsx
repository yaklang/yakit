import '@/pages/ai-re-act/hooks/__test__/setupElectron'
import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AIMCPToolList } from '../AIMCP'
import { getMCPServersById } from '../utils'
vi.mock('../aiMCPForm/AIMCPForm', () => ({ AIMCPForm: () => null }))
vi.mock('../utils', () => ({
  getMCPServersById: vi.fn(),
  grpcUpdateMCPServer: vi.fn(),
  grpcGetAllMCPServers: vi.fn(),
  grpcDeleteMCPServer: vi.fn(),
}))
vi.mock('../../aiMCPHistory/MCPHistory', () => ({ default: () => null }))
vi.mock('@/utils/ConfigSystemMcp', () => ({ ConfigMcpModal: () => null }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/RollingLoadList/RollingLoadList', () => ({
  RollingLoadList: ({ data }: any) => (
    <div>
      {data.map((tool: any) => (
        <span key={tool.Name}>{tool.Name}</span>
      ))}
    </div>
  ),
}))
vi.mock('@/components/yakitUI/YakitEmpty/YakitEmpty', () => ({
  YakitEmpty: ({ title, description, children }: any) => (
    <div>
      {title}
      {description}
      {children}
    </div>
  ),
}))
vi.mock('@/components/yakitUI/YakitSpin/YakitSpin', () => ({ YakitSpin: () => <div>loading-tools</div> }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, loading, onClick }: any) => (
    <button disabled={loading} onClick={onClick}>
      {children}
    </button>
  ),
}))
const item = (ID: number) => ({ ID, Name: `server-${ID}`, Enable: true, Tools: [] }) as any
beforeEach(() => {
  vi.clearAllMocks()
})
afterEach(cleanup)
describe('MCP tool loading boundaries', () => {
  it('shows loading rather than an empty list until the first detail completes', async () => {
    let resolve!: (value: any) => void
    vi.mocked(getMCPServersById).mockReturnValueOnce(
      new Promise((r) => {
        resolve = r
      }),
    )
    render(<AIMCPToolList item={item(1)} onBack={vi.fn()} />)
    expect(screen.getByText('loading-tools')).toBeInTheDocument()
    expect(screen.queryByText('AIMCP.noToolsLoaded')).toBeNull()
    await act(async () => resolve({ ...item(1), Tools: [{ Name: 'real-tool', Params: [] }] }))
    expect(screen.getByText('real-tool')).toBeInTheDocument()
  })
  it('distinguishes a real empty response from an error and allows refresh', async () => {
    vi.mocked(getMCPServersById).mockResolvedValueOnce(item(1)).mockRejectedValueOnce(new Error('offline'))
    render(<AIMCPToolList item={item(1)} onBack={vi.fn()} />)
    await screen.findByText('AIMCP.noToolsLoaded')
    fireEvent.click(screen.getByText('YakitButton.refresh'))
    expect(await screen.findByRole('alert')).toHaveTextContent('offline')
    expect(screen.queryByText('AIMCP.noToolsLoaded')).toBeNull()
  })
  it('ignores the previous server response after switching servers', async () => {
    let old!: (value: any) => void
    vi.mocked(getMCPServersById)
      .mockReturnValueOnce(
        new Promise((r) => {
          old = r
        }),
      )
      .mockResolvedValueOnce({ ...item(2), Tools: [{ Name: 'current-tool', Params: [] }] })
    const view = render(<AIMCPToolList item={item(1)} onBack={vi.fn()} />)
    view.rerender(<AIMCPToolList item={item(2)} onBack={vi.fn()} />)
    await screen.findByText('current-tool')
    await act(async () => old({ ...item(1), Tools: [{ Name: 'stale-tool', Params: [] }] }))
    expect(screen.queryByText('stale-tool')).toBeNull()
    expect(screen.getByText('current-tool')).toBeInTheDocument()
  })
})
