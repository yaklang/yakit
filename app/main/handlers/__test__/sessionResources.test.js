// @vitest-environment node
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { expect, it, vi } from 'vitest'

it.each([
  ['ai-agent.js', 'GetAISessionCurrentResources'],
  ['ai-agent.js', 'QueryAITool'],
  ['knowlegebase.js', 'QueryKnowledgeBase'],
])('%s forwards %s requests and propagates gRPC failures', async (file, method) => {
  const filename = new URL(`../${file}`, import.meta.url)
  const require = createRequire(filename)
  const handlers = new Map()
  const dependencies = {
    electron: { ipcMain: { handle: (name, callback) => handlers.set(name, callback) } },
    './handleStreamWithContext': { cancelHandler: () => vi.fn() },
    '../filePath': {},
  }
  const module = { exports: {} }
  new Function('require', 'module', readFileSync(filename, 'utf8'))((id) => dependencies[id] ?? require(id), module)
  const result = { Data: [], TaskResources: [] }
  const query = vi.fn((params, callback) => callback(null, result))
  module.exports({}, () => ({ [method]: query }))
  const params = method === 'QueryAITool' ? { Filter: { ToolNames: ['read-file'] } } : { SessionID: 'session-1' }
  await expect(handlers.get(method)({}, params)).resolves.toBe(result)
  expect(query).toHaveBeenCalledWith(params, expect.any(Function))
  query.mockImplementation((params, callback) => callback(new Error('offline')))
  await expect(handlers.get(method)({}, params)).rejects.toThrow('offline')
})
