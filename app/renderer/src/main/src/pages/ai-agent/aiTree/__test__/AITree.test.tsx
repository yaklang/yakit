import React from 'react'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { transformSync } from '@babel/core'
import { reactCompilerPreset } from '@vitejs/plugin-react'
import ts from 'typescript'
import { useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { AITreeProps } from '../type'
import type { AITaskInfoProps } from '@/pages/ai-re-act/hooks/aiRender'

const require = createRequire(import.meta.url)
const filename = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../AITree.tsx')

// 普通 Vitest 不启用 React Compiler，需编译真实组件才能覆盖稳定函数导致的渲染缓存问题。
const compiled = transformSync(readFileSync(filename, 'utf8'), {
  filename,
  babelrc: false,
  configFile: false,
  parserOpts: { plugins: ['typescript', 'jsx'] },
  presets: [reactCompilerPreset().preset],
})!
const { outputText } = ts.transpileModule(compiled.code!, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
    target: ts.ScriptTarget.ES2022,
  },
})

const dependencies: Record<string, unknown> = {
  react: React,
  ahooks: { useMemoizedFn },
  classnames: classNames,
  './AITree.module.scss': new Proxy({}, { get: (_, key) => (key === '__esModule' ? false : key) }),
  '@yakit-libs/yakit-ui-icons/oldicon/TaskErrorIcon': {
    TaskErrorIcon: () => <span data-testid="aborted" />,
  },
  '@yakit-libs/yakit-ui-icons/oldicon/TaskSkippedIcon': {
    TaskSkippedIcon: () => <span data-testid="skipped" />,
  },
  '@yakit-libs/yakit-ui-icons/oldicon/TaskSuccessIcon': {
    TaskSuccessIcon: () => <span data-testid="completed" />,
  },
  './TaskInProgressIndicator': { TaskInProgressIndicator: () => <span data-testid="processing" /> },
  '@yakit-libs/yakit-ui-icons/outline': {
    InformationCircleOutlined: () => null,
    ListTodoOutlined: () => null,
  },
  '@/components/yakitUI/YakitPopover/YakitPopover': {
    YakitPopover: ({ children }: React.PropsWithChildren) => <>{children}</>,
  },
  '@/components/yakitUI/YakitTag/YakitTag': {
    YakitTag: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  },
  '../chatTemplate/historyTaskTree/HistoryTaskTree': {
    AIHistorySkipTask: () => <button>跳过任务</button>,
  },
  '@/components/yakitUI/YakitButton/YakitButton': { YakitButton: () => <button>任务详情</button> },
  antd: { Tooltip: ({ children }: React.PropsWithChildren) => <>{children}</> },
  '@/utils/eventBus/eventBus': { emit: () => {} },
  '@/utils/notification': { yakitNotify: () => {} },
}
const compiledExports: { AITree?: React.FC<AITreeProps> } = {}
new Function('require', 'exports', outputText)(
  (id: string) => (id in dependencies ? dependencies[id] : require(id)),
  compiledExports,
)
const AITree = compiledExports.AITree!

const makeTask = (overrides: Partial<AITaskInfoProps> = {}): AITaskInfoProps => ({
  task_id: 'task-1',
  name: '原任务',
  goal: '原目标',
  level: 2,
  isLeaf: true,
  semantic_identifier: '',
  isRemove: false,
  tools: [],
  description: '',
  total_tool_call_count: 0,
  success_tool_call_count: 0,
  fail_tool_call_count: 0,
  summary: '',
  progress: 'processing',
  ...overrides,
})

afterEach(cleanup)

describe('AITree（启用 React Compiler）', () => {
  it.each([
    ['completed', 'success'],
    ['aborted', 'error'],
    ['skipped', 'skipped'],
  ] as const)('processing → %s → processing 同步图标、背景和跳过按钮', (progress, classSuffix) => {
    const task = makeTask()
    const { rerender } = render(<AITree tasks={[task]} taskType="current" />)
    expect(screen.getByTestId('processing')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '跳过任务' })).toBeInTheDocument()

    rerender(<AITree tasks={[{ ...task, progress }]} taskType="current" />)
    expect(screen.getByTestId(progress)).toBeInTheDocument()
    expect(screen.queryByTestId('processing')).not.toBeInTheDocument()
    expect(screen.getByText('原任务').closest('.node-wrapper')).toHaveClass(`node-wrapper-${classSuffix}`)
    expect(screen.queryByRole('button', { name: '跳过任务' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '任务详情' })).toBeInTheDocument()

    rerender(<AITree tasks={[{ ...task }]} taskType="current" />)
    expect(screen.getByTestId('processing')).toBeInTheDocument()
    expect(screen.queryByTestId(progress)).not.toBeInTheDocument()
    expect(screen.getByText('原任务').closest('.node-wrapper')).toHaveClass('node-wrapper-in-progress')
    expect(screen.getByRole('button', { name: '跳过任务' })).toBeInTheDocument()
  })

  it('状态不变时更新标题、目标和工具统计', () => {
    const task = makeTask()
    const { rerender } = render(<AITree tasks={[task]} taskType="current" />)
    rerender(
      <AITree
        tasks={[{ ...task, name: '新任务', goal: '新目标', success_tool_call_count: 3, fail_tool_call_count: 2 }]}
        taskType="current"
      />,
    )
    expect(screen.getByText('新任务')).toBeInTheDocument()
    expect(screen.getByText('新目标')).toBeInTheDocument()
    expect(screen.queryByText('原任务')).not.toBeInTheDocument()
    expect(screen.queryByText('原目标')).not.toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('切换到历史任务时移除任务详情按钮', () => {
    const tasks = [makeTask({ progress: 'completed' })]
    const { rerender } = render(<AITree tasks={tasks} taskType="current" />)
    expect(screen.getByRole('button', { name: '任务详情' })).toBeInTheDocument()
    rerender(<AITree tasks={tasks} taskType="history" />)
    expect(screen.queryByRole('button', { name: '任务详情' })).not.toBeInTheDocument()
  })
})
