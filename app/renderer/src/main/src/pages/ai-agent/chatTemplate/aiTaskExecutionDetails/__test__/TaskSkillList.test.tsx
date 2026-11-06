import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../../../grpc', () => ({ grpcGetAIForge: m.get }))
vi.mock('../../../components/aiFileSystemList/FilePreview/FilePreview', () => ({
  default: ({ data }: any) => <div data-testid="preview">{data.path}</div>,
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (k: string) => k }) }))
vi.mock('antd', () => {
  const Button = ({ value, children }: any) => <option value={value}>{children}</option>
  return {
    Radio: {
      Group: ({ value, onChange, children }: any) => (
        <select aria-label="state" value={value} onChange={onChange}>
          {children}
        </select>
      ),
      Button,
    },
    Select: ({ options, onChange, value, ...p }: any) => (
      <select {...p} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o: any) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    ),
    Modal: ({ visible, children }: any) => (visible ? <div role="dialog">{children}</div> : null),
  }
})
import { TaskSkillList, selectTaskSkills } from '../TaskSkillList'
const skills: any = {
  fixed: [{ name: 'fixed', skill_load_state: 'loaded', token_count: 50 }],
  dynamic: [
    { name: 'available', skill_load_state: 'metadata', token_count: 10 },
    { name: 'unknown', skill_load_state: '' },
  ],
}
beforeEach(() => {
  m.get.mockReset().mockResolvedValue({ SkillPath: 'C:\\allowed\\skill' })
})
afterEach(cleanup)
it('separates loaded and available skills while retaining unknown legacy entries under All', () => {
  expect(selectTaskSkills([...skills.fixed, ...skills.dynamic], 'loaded', '', 'asc').map((s) => s.name)).toEqual([
    'fixed',
  ])
  render(<TaskSkillList skills={skills} taskId="task" />)
  expect(screen.getByText('unknown')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('state'), { target: { value: 'metadata' } })
  expect(screen.queryByText('fixed')).toBeNull()
  expect(screen.getByText('available')).toBeInTheDocument()
})
it('sorts token counts and filters descriptions without mutating task data', () => {
  const list = [
    { name: 'b', description: 'audit', token_count: 200 },
    { name: 'a', description: 'audit', token_count: 100 },
  ]
  expect(selectTaskSkills(list, 'all', 'AUDIT', 'asc').map((s) => s.name)).toEqual(['a', 'b'])
  expect(list[0].name).toBe('b')
})
it('opens SKILL.md through the existing preview and drops stale details after switching tasks', async () => {
  const h = render(<TaskSkillList skills={skills} taskId="task" />)
  fireEvent.click(screen.getByText('fixed'))
  await act(async () => {
    await vi.dynamicImportSettled()
  })
  expect(await screen.findByTestId('preview')).toHaveTextContent('C:\\allowed\\skill\\SKILL.md')
  let old!: (data: any) => void
  m.get.mockReturnValueOnce(
    new Promise((r) => {
      old = r
    }),
  )
  fireEvent.click(screen.getByText('available'))
  h.rerender(<TaskSkillList skills={skills} taskId="new-task" />)
  await act(async () => old({ SkillPath: 'C:\\stale' }))
  expect(screen.queryByRole('dialog')).toBeNull()
})
