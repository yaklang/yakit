import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'
import type * as AIToDoListModule from '../AIToDoList'
import type { AIToDoListItemProps } from '../type'

vi.mock('@/pages/ai-agent/defaultConstant', () => ({
  AIToDoListStatusEnum: { Pending: 'PENDING', Doing: 'DOING', Done: 'DONE', Deleted: 'DELETED', Skipped: 'SKIPPED' },
}))
vi.mock('../AIToDoListDetail', () => ({ AIToDoListDetail: () => null }))
vi.mock('@yakit-libs/yakit-ui-icons/oldicon/AIToDoListPendingIcon', () => ({
  AIToDoListPendingIcon: () => <span data-testid="PENDING" />,
}))
vi.mock('@yakit-libs/yakit-ui-icons/oldicon/AIToDoListDoneIcon', () => ({
  AIToDoListDoneIcon: () => <span data-testid="DONE" />,
}))
vi.mock('@yakit-libs/yakit-ui-icons/oldicon/AIToDoListDeletedIcon', () => ({
  AIToDoListDeletedIcon: () => <span data-testid="DELETED" />,
}))
vi.mock('@yakit-libs/yakit-ui-icons/oldicon/AIToDoListSkippedIcon', () => ({
  AIToDoListSkippedIcon: () => <span data-testid="SKIPPED" />,
}))
vi.mock('@/components/yakitUI/YakitSolidLoading/YakitSolidLoading', () => ({
  default: () => <span data-testid="DOING" />,
}))
const { AIToDoListItem } = await compileReactModule<typeof AIToDoListModule>(import.meta.url, '../AIToDoList.tsx')

afterEach(cleanup)

describe('AIToDoListItem（启用 React Compiler）', () => {
  it.each(['PENDING', 'DOING', 'DONE', 'DELETED', 'SKIPPED'] as const)('%s 更新状态和文本', (status) => {
    const item: AIToDoListItemProps['item'] = {
      id: 'todo-1',
      content: '旧内容',
      status: 'PENDING',
      created_at: 1,
      updated_at: 1,
    }
    const { rerender } = render(<AIToDoListItem item={item} />)
    rerender(<AIToDoListItem item={{ ...item, status, content: '新内容', updated_at: 2 }} />)
    expect(screen.getByTestId(status)).toBeInTheDocument()
    expect(screen.getByText('新内容')).toHaveAttribute('title', '新内容')
    expect(screen.queryByText('旧内容')).not.toBeInTheDocument()
    if (status !== 'PENDING') expect(screen.queryByTestId('PENDING')).not.toBeInTheDocument()
    rerender(<AIToDoListItem item={{ ...item, status: 'DOING', content: '继续执行' }} />)
    expect(screen.getByTestId('DOING')).toBeInTheDocument()
    expect(screen.getByText('继续执行')).toBeInTheDocument()
  })
})
