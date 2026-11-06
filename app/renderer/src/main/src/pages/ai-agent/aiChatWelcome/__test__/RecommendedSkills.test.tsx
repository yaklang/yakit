import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => {
  const invoke = vi.fn()
  ;(window as any).require = () => ({ ipcRenderer: { invoke } })
  return { invoke, read: vi.fn(), write: vi.fn() }
})
vi.mock('@/utils/kv', () => ({ getRemoteValue: m.read, setRemoteValue: m.write }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (k: string) => k, i18n: { language: 'zh' } }),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, loading, type, ...p }: any) => (
    <button {...p} disabled={p.disabled || loading}>
      {children}
    </button>
  ),
}))
vi.mock('antd', () => ({
  Checkbox: ({ children, onChange, ...p }: any) => (
    <label>
      <input type="checkbox" {...p} onChange={onChange} />
      {children}
    </label>
  ),
  Input: { TextArea: (p: any) => <textarea {...p} /> },
  Modal: Object.assign(
    ({ visible, children, footer }: any) =>
      visible ? (
        <div role="dialog">
          {children}
          {footer}
        </div>
      ) : null,
    {
      confirm: ({ onOk }: any) => {
        onOk()
        return { destroy: vi.fn() }
      },
    },
  ),
}))
import { RecommendedSkills } from '../RecommendedSkills'
const skills = [
  { Name: 'audit', Type: 'skill', DisplayNameZhCN: '审计', Content: 'old' },
  { Name: 'report', Type: 'skill', DisplayNameZhCN: '报告', Content: 'report' },
]
beforeEach(() => {
  vi.clearAllMocks()
  m.read.mockResolvedValue('')
  m.write.mockResolvedValue(undefined)
  m.invoke.mockResolvedValue({ Data: skills })
})
afterEach(cleanup)
describe('recommended selection and editing', () => {
  it('defaults to first skill, supports multiple and persists explicit empty selection', async () => {
    const change = vi.fn()
    render(<RecommendedSkills cacheKey="role-a" onChange={change} />)
    await waitFor(() => expect(screen.getByLabelText('审计')).toBeChecked())
    fireEvent.click(screen.getByLabelText('报告'))
    expect(change.mock.calls.at(-1)?.[0].map((s: any) => s.Name)).toEqual(['audit', 'report'])
    fireEvent.click(screen.getByLabelText('审计'))
    fireEvent.click(screen.getByLabelText('报告'))
    await waitFor(() => expect(m.write).toHaveBeenLastCalledWith('role-a', '[]'))
  })
  it('restores intentional empty selection without defaulting again', async () => {
    m.read.mockResolvedValue('[]')
    render(<RecommendedSkills cacheKey="role" onChange={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('审计')).not.toBeChecked())
    expect(screen.getByLabelText('报告')).not.toBeChecked()
  })
  it('saves only edited content and can reset to backend defaults', async () => {
    render(<RecommendedSkills cacheKey="role" onChange={vi.fn()} />)
    await screen.findByLabelText('审计')
    fireEvent.click(screen.getAllByText('Parity.editSkill')[0])
    fireEvent.change(screen.getByLabelText('Parity.skillContent'), { target: { value: 'new\n正文' } })
    m.invoke.mockResolvedValue({ ...skills[0], Content: 'new\n正文' })
    fireEvent.click(screen.getByText('Parity.save'))
    await waitFor(() =>
      expect(m.invoke).toHaveBeenCalledWith('UpdateAIReActRecommendedSkill', { Name: 'audit', Content: 'new\n正文' }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(screen.getAllByText('Parity.editSkill')[0])
    m.invoke.mockResolvedValue({ ...skills[0], Content: 'default' })
    fireEvent.click(screen.getByText('Parity.resetSkill'))
    await waitFor(() => expect(screen.getByLabelText('Parity.skillContent')).toHaveValue('default'))
  })
  it('keeps the editor open and reports a failed save', async () => {
    render(<RecommendedSkills cacheKey="role" onChange={vi.fn()} />)
    await screen.findByLabelText('审计')
    fireEvent.click(screen.getAllByText('Parity.editSkill')[0])
    m.invoke.mockRejectedValue(Error('unavailable'))
    fireEvent.click(screen.getByText('Parity.save'))
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
  it('ignores late data from a previous role', async () => {
    let resolve!: (v: any) => void
    m.invoke.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r
      }),
    )
    const change = vi.fn()
    const view = render(<RecommendedSkills cacheKey="role-a" onChange={change} />)
    view.rerender(<RecommendedSkills cacheKey="role-b" onChange={change} />)
    await screen.findByLabelText('审计')
    await act(async () => resolve({ Data: [{ Name: 'stale', Type: 'skill', Content: '' }] }))
    expect(screen.queryByLabelText('stale')).toBeNull()
  })
})
