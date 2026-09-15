import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformSync } from '@babel/core'
import { reactCompilerPreset } from '@vitejs/plugin-react'
import { describe, expect, it } from 'vitest'

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

describe('AI 界面 React Compiler 兼容性', () => {
  it.each([
    'pages/ai-agent/AIAgentSideList.tsx',
    'pages/ai-agent/aiChatContent/AIChatWorkspace/AIChatWorkspace.tsx',
    'pages/ai-agent/components/aiMarkdown/AIMarkdown.tsx',
    'pages/ai-agent/components/aiFileSystemList/FileTreeSystemItem/FileTreeSystemIem.tsx',
    'pages/ai-agent/components/aiFileSystemList/FileTreeSystemListWrapper/FileTreeSystemListWrapper.tsx',
    'pages/ai-agent/aiTree/AITree.tsx',
    'pages/ai-re-act/aiReActChat/AIReActChat.tsx',
    'pages/ai-re-act/aiReActChat/aiToDoList/AIToDoList.tsx',
    'pages/ai-re-act/aiRightPanel/AIRightPanel.tsx',
  ])('%s 实际参与编译且没有被诊断跳过的组件', (relativePath) => {
    const filename = path.resolve(sourceRoot, relativePath)
    const events: { kind: string }[] = []
    transformSync(readFileSync(filename, 'utf8'), {
      filename,
      babelrc: false,
      configFile: false,
      parserOpts: { plugins: ['typescript', 'jsx'] },
      presets: [reactCompilerPreset({ logger: { logEvent: (_filename, event) => events.push(event) } }).preset],
    })
    expect(events.filter((event) => event.kind === 'CompileError')).toEqual([])
    expect(events.some((event) => event.kind === 'CompileSuccess')).toBe(true)
  })

  it('PluginExecuteLog 实际参与编译，保护日志与 loading 更新', () => {
    const filename = path.resolve(sourceRoot, 'pages/plugins/operator/pluginExecuteResult/PluginExecuteResult.tsx')
    const source = readFileSync(filename, 'utf8')
    const declarationLine =
      source.split('\n').findIndex((line) => line.startsWith('export const PluginExecuteLog:')) + 1
    expect(declarationLine).toBeGreaterThan(0)
    const events: { kind: string; fnLoc?: { start: { line: number } } | null }[] = []
    transformSync(source, {
      filename,
      babelrc: false,
      configFile: false,
      parserOpts: { plugins: ['typescript', 'jsx'] },
      presets: [reactCompilerPreset({ logger: { logEvent: (_filename, event) => events.push(event) } }).preset],
    })
    const componentEvents = events.filter((event) => event.fnLoc?.start.line === declarationLine)
    expect(componentEvents.some((event) => event.kind === 'CompileSuccess')).toBe(true)
    expect(componentEvents.filter((event) => event.kind === 'CompileError')).toEqual([])
  })
})
