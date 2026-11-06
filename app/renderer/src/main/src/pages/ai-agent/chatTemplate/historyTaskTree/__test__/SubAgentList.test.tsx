import React from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { createStore } from 'zustand/vanilla'
import { afterEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ store: null as any, raw: { contents: new Map() } }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => m.store,
  useCurrentRawData: () => m.raw,
}))
vi.mock('@/pages/ai-re-act/hooks/useAIItemKind', () => ({ default: () => () => 'task' }))
vi.mock('@/pages/ai-re-act/hooks/aiRender', () => ({ AIChatQSDataTypeEnum: { TASK_NODE_GROUP: 'task-node-group' } }))
vi.mock('../../../aiTree/AITree', () => ({
  AITree: ({ tasks }: any) => (
    <div>
      {tasks.map((t: any) => (
        <p key={t.task_id}>
          {t.name}:{t.progress}
        </p>
      ))}
    </div>
  ),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (k: string) => k }) }))
import { SubAgentList } from '../SubAgentList'
afterEach(cleanup)
it('summarizes ReAct child agents, excludes plan entries and refreshes mutable task status', () => {
  m.raw.contents = new Map([
    ['child', { type: 'task-node-group', data: { taskId: 'id', taskName: 'child agent', status: 'running' } }],
    ['plan', { type: 'task-node-group', data: { taskName: 'plan agent' } }],
  ])
  m.store = createStore(() => ({
    chatElements: [
      { token: 'child', chatType: 'reAct' },
      { token: 'plan', chatType: 'task' },
    ],
    tasks: { child: { renderNum: 1 } },
  }))
  render(<SubAgentList />)
  expect(screen.getByText('child agent:running')).toBeInTheDocument()
  expect(screen.queryByText(/plan agent/)).toBeNull()
  act(() => {
    m.raw.contents.get('child').data.status = 'completed'
    m.store.setState({ tasks: { child: { renderNum: 2 } } })
  })
  expect(screen.getByText('child agent:completed')).toBeInTheDocument()
})
