import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { editor, languages, Position } from 'monaco-editor'
import type { CancellationToken } from 'typescript'

const { invoke, getModelContext } = vi.hoisted(() => {
  const invoke = vi.fn()
  window.require = (() => ({ ipcRenderer: { invoke } })) as unknown as typeof window.require
  return { invoke, getModelContext: vi.fn() }
})

vi.mock('../yakEditor', () => ({ getModelContext }))
vi.mock('../fuzzHTTPMonacoSpec', () => ({ highlightKinds: [] }))

import { newYaklangCompletionHandlerProvider } from '../yakCompletionSchema'

describe('Yak 补全请求上下文', () => {
  beforeEach(() => {
    invoke.mockReset().mockResolvedValue({ SuggestionMessage: [] })
    getModelContext.mockReset()
  })

  it.each(['yak', 'mitm'])('保留 %s 分析上下文并发送当前代码和光标范围', async (scriptType) => {
    const code = 'chat = func(req, emit) { return req.Prompt }'
    const model = {
      id: 'script-model',
      getValue: () => code,
      getWordAtPosition: () => ({ word: 'req', startColumn: 1, endColumn: 4 }),
      getValueInRange: () => '',
    } as unknown as editor.ITextModel
    getModelContext.mockReturnValue(scriptType)

    await newYaklangCompletionHandlerProvider(
      model,
      { lineNumber: 1, column: 4 } as Position,
      {} as languages.CompletionContext,
      {} as CancellationToken,
    )

    expect(getModelContext).toHaveBeenCalledWith(model, 'plugin')
    expect(invoke).toHaveBeenCalledWith('YaklangLanguageSuggestion', {
      InspectType: 'completion',
      YakScriptType: scriptType,
      YakScriptCode: code,
      ModelID: 'script-model',
      Range: { Code: 'req', StartLine: 1, EndLine: 1, StartColumn: 1, EndColumn: 4 },
    })
  })
})
