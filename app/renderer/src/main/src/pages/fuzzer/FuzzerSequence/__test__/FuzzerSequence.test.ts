import { readFileSync } from 'node:fs'
import { Buffer } from 'node:buffer'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

// Exercise the actual parameter builder and start guard without loading Monaco/Electron.
const source = ts.createSourceFile(
  'FuzzerSequence.tsx',
  readFileSync('app/renderer/src/main/src/pages/fuzzer/FuzzerSequence/FuzzerSequence.tsx', 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
)
const declarations = (names: string[]) => {
  const result: string[] = []
  const visit = (node: ts.Node) => {
    if (
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.some((declaration) => names.includes(declaration.name.getText(source)))
    )
      result.push(node.getText(source))
    ts.forEachChild(node, visit)
  }
  visit(source)
  expect(result).toHaveLength(names.length)
  return ts.transpileModule(result.join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
}

describe('browser gateway group execution boundary', () => {
  it.each([false, true])(
    'rejects an entire mixed group before state changes or IPC (concurrency=%s)',
    (isConcurrency) => {
      const selection = { deviceId: 'browser', profileId: 'profile', profileName: 'AES' }
      const pages = ['ordinary', 'gateway'].map((pageId) => ({
        pageId,
        pageParamsInfo: {
          webFuzzerPageInfo: {
            advancedConfigValue: { proxy: [], resNumlimit: 100 },
            request: 'POST /login',
            hotPatchCode: '',
            browserTransformSelection: pageId === 'gateway' ? selection : undefined,
          },
        },
      }))
      const bindings = {
        Buffer,
        isConcurrency,
        currentList: pages.map(({ pageId }) => ({ pageId, id: pageId })),
        useMemoizedFn: (fn: unknown) => fn,
        getCurrentGroupSequence: () => pages,
        yakitNotify: vi.fn(),
        t: (key: string) => key,
        setLoading: vi.fn(),
        onClearRef: vi.fn(),
        ipcRenderer: { invoke: vi.fn() },
        startConcurrency: vi.fn(),
        fuzzerTableMaxDataRef: { current: new Map() },
        hotPatchCodeWithParamGetterRef: { current: '' },
        getProxyValue: () => ({ proxyEndpoints: '' }),
        advancedConfigValueToFuzzerRequests: () => ({ Concurrent: 20, Extractors: [], Matchers: [] }),
        setRequest: vi.fn(),
        resetResponse: vi.fn(),
        updateConcurrentLoad: vi.fn(),
        resetDroppedCount: vi.fn(),
        droppedSequenceIndexMapRef: { current: new Map() },
        setShowAllRes: vi.fn(),
        setCurrentSelectResponse: vi.fn(),
        setCurrentList: vi.fn(),
        fuzzerIndexModeRef: { current: new Map() },
        pageGroupData: undefined,
        fuzzTokenRef: { current: 'token' },
        setHasExtractorRules: vi.fn(),
      }
      const api = new Function(
        ...Object.keys(bindings),
        `${declarations(['getHttpParams', 'onStartExecution'])}\nreturn {getHttpParams, onStartExecution}`,
      )(...Object.values(bindings))
      api.onStartExecution()
      expect(bindings.yakitNotify).toHaveBeenCalledWith('error', 'FuzzerSequence.browserGatewayUnsupported')
      expect(bindings.setLoading).not.toHaveBeenCalled()
      expect(bindings.onClearRef).not.toHaveBeenCalled()
      expect(bindings.ipcRenderer.invoke).not.toHaveBeenCalled()
      expect(bindings.startConcurrency).not.toHaveBeenCalled()
      expect(bindings.setRequest).not.toHaveBeenCalled()
      // Explicitly disabling the binding restores ordinary group parameter construction.
      pages[1].pageParamsInfo.webFuzzerPageInfo.browserTransformSelection = undefined
      expect(api.getHttpParams()).toEqual(
        pages.map(({ pageId }) =>
          expect.objectContaining({
            FuzzerTabIndex: pageId,
            Concurrent: 20,
            RequestRaw: Buffer.from('POST /login'),
          }),
        ),
      )
      api.onStartExecution()
      const requests = expect.objectContaining({
        Requests: expect.arrayContaining([
          expect.objectContaining({ FuzzerTabIndex: 'ordinary', Concurrent: 20 }),
          expect.objectContaining({ FuzzerTabIndex: 'gateway', Concurrent: 20 }),
        ]),
      })
      if (isConcurrency) expect(bindings.startConcurrency).toHaveBeenCalledWith(requests)
      else expect(bindings.ipcRenderer.invoke).toHaveBeenCalledWith('HTTPFuzzerSequence', requests, 'token')
      expect(bindings.fuzzerTableMaxDataRef.current.get('ordinary')).toBe(100)
      expect(bindings.fuzzerTableMaxDataRef.current.get('gateway')).toBe(100)
    },
  )
})
