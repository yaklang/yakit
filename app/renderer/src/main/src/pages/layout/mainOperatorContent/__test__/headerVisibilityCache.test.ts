import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'
import { adoptOrphanCacheTabs } from '../adoptOrphanCacheTabs'
import { safeParseFuzzerCache, sanitizeFuzzerCachePageParams } from '@/store/parseFuzzerCache'

// Execute the production serialization and both restoration branches without mounting the application shell.
const initializer = (path: string, name: string) => {
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let result = ''
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) result = node.initializer!.getText(source)
    ts.forEachChild(node, visit)
  }
  visit(source)
  if (!result) throw new Error(`Missing production function: ${name}`)
  return result
}
const sourcePath = 'app/renderer/src/main/src/pages/layout/mainOperatorContent/MainOperatorContent.tsx'
const serializeSource = initializer('app/renderer/src/main/src/store/pageInfo.ts', 'getFuzzerProcessedCacheData')
const restoreSource = initializer(sourcePath, 'fetchFuzzerList')
const rebuildSource = initializer(sourcePath, 'rebuildMultipleNodeTree')
const execute = (code: string, bindings: Record<string, unknown>) => {
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  return new Function(...Object.keys(bindings), js)(...Object.values(bindings))
}
const request = 'GET / HTTP/1.1\r\nHost: example.test\r\nAccept: */*\r\n\r\n'
const nodes = () =>
  [
    ['single-hidden', '0', true, false],
    ['single-visible', '0', false, true],
    ['group-1', '0', false, false],
    ['child-hidden', 'group-1', true, true],
    ['child-visible', 'group-1', false, false],
  ].map(([id, groupId, requestHidden, responseHidden], index) => ({
    pageId: id,
    pageGroupId: groupId,
    pageName: id,
    sortFieId: index,
    pageParamsInfo: {
      webFuzzerPageInfo: {
        request,
        hotPatchCode: 'patch',
        requestHeadersHidden: requestHidden,
        responseHeadersHidden: responseHidden,
        advancedConfigValue: {},
      },
    },
  }))
const serialize = (pageList: ReturnType<typeof nodes>) =>
  execute(`return (${serializeSource})(pageList)`, {
    pageList,
    defaultAdvancedConfigValue: {},
    defaultPostTemplate: 'template',
  })
const restore = async (cache: unknown, add: boolean) => {
  let id = 0
  const setPagesData = vi.fn()
  const yakitNotify = vi.fn()
  await execute(`const rebuildMultipleNodeTree = ${rebuildSource}; return (${restoreSource})(cache, add)`, {
    cache,
    add,
    useMemoizedFn: (fn: unknown) => fn,
    getFuzzerCacheData: async () => ({}),
    clearDataByRoute: vi.fn(),
    clearFuzzerSequence: vi.fn(),
    YakitRoute: { HTTPFuzzer: 'wf' },
    YakitRouteToPageInfo: { wf: { label: 'Web Fuzzer' } },
    routeConvertKey: () => 'wf',
    routeKeyToLabel: new Map(),
    cloneDeep: structuredClone,
    defPage: { pageList: [] },
    getCurrentSelectPageId: () => '',
    adoptOrphanCacheTabs,
    randomString: () => `id-${id++}`,
    generateGroupId: () => `group-${id++}`,
    generateTabIdentity: () => ({ tabId: `tab-${id++}` }),
    defaultAdvancedConfigValue: {},
    sanitizeFuzzerCachePageParams,
    defaultPostTemplate: 'template',
    HotPatchDefaultContent: '',
    compareAsc: (a: any, b: any, key: string) => a[key] - b[key],
    getPageCache: () => [],
    pages: new Map(),
    setPagesData,
    setPageCache: vi.fn(),
    setSelectGroupId: vi.fn(),
    isSecurityExpert: true,
    yakitNotify,
    t: (key: string) => key,
  })
  expect(yakitNotify).not.toHaveBeenCalled()
  expect(setPagesData).toHaveBeenCalledOnce()
  return setPagesData.mock.calls[0][1].pageList as ReturnType<typeof nodes>
}

describe('request header visibility cache roundtrip', () => {
  it.each([false, true])('preserves hidden and visible states in standalone and grouped tabs (add=%s)', async (add) => {
    const before = nodes()
    const cache = safeParseFuzzerCache(JSON.stringify(serialize(before)))
    const after = await restore(cache, add)
    for (const node of before) {
      expect(after.find((item) => item.pageName === node.pageName)?.pageParamsInfo.webFuzzerPageInfo).toMatchObject({
        request,
        hotPatchCode: 'patch',
        requestHeadersHidden: node.pageParamsInfo.webFuzzerPageInfo.requestHeadersHidden,
        responseHeadersHidden: node.pageParamsInfo.webFuzzerPageInfo.responseHeadersHidden,
      })
    }
  })

  it.each([false, true])('restores old caches with no visibility field as expanded (add=%s)', async (add) => {
    const cache = serialize(nodes())
    cache.forEach((node) => {
      delete node.pageParams.requestHeadersHidden
      delete node.pageParams.responseHeadersHidden
    })
    const after = await restore(safeParseFuzzerCache(JSON.stringify(cache)), add)
    expect(
      after.every(
        (node) =>
          node.pageParamsInfo.webFuzzerPageInfo.requestHeadersHidden === false &&
          node.pageParamsInfo.webFuzzerPageInfo.responseHeadersHidden === false,
      ),
    ).toBe(true)
  })
})
