import { generateColorScales, generateRandomColorScales } from '@yakit-libs/color'
import { describe, expect, it } from 'vitest'
import { YakitRoute } from '@/enums/yakitRoute'
import { getFuzzerProcessedCacheData, type PageNodeItemProps, type PageProps } from '@/store/pageInfo'
import type { MultipleNodeInfo } from '../MainOperatorContentType'
import {
  applyWebFuzzerTabMutation,
  countWebFuzzerTabs,
  filterMissingWebFuzzerNodes,
  rebuildWebFuzzerTabTree,
  type WebFuzzerPushNode,
} from '../webFuzzerTabPush'
import {
  collectUsedBaseHex,
  getFixedColorBaseHex,
  getWebFuzzerGroupColorStyle,
  isCustomWebFuzzerGroupColor,
  pickWebFuzzerGroupColor,
  webFuzzerGroupColorList,
} from '../webFuzzerGroupColor'

const request = 'GET / HTTP/1.1\r\nHost: example.com\r\n\r\n'

const tab = (id: string, groupId = '0', sortFieId = 1, verbose = id): WebFuzzerPushNode => ({
  id,
  groupId,
  sortFieId,
  verbose,
  groupChildren: [],
  pageParams: {
    id,
    groupId,
    request,
    isHttps: true,
  },
})

const group = (id: string, sortFieId = 1, verbose = id): WebFuzzerPushNode => ({
  id,
  groupId: '0',
  sortFieId,
  verbose,
  groupChildren: [],
  expand: true,
  color: 'purple',
})

const pageNode = (node: WebFuzzerPushNode, internalId = `internal-${node.id}`): PageNodeItemProps => ({
  id: internalId,
  routeKey: YakitRoute.HTTPFuzzer,
  pageGroupId: node.groupId,
  pageId: node.id,
  pageName: node.verbose,
  pageParamsInfo: {
    webFuzzerPageInfo: {
      pageId: node.id,
      advancedConfigValue: {
        concurrent: 33,
      } as any,
      request,
      hotPatchCode: '',
    },
  },
  sortFieId: node.sortFieId,
})

const page = (nodes: WebFuzzerPushNode[], selectedPageId: string): PageProps => ({
  routeKey: YakitRoute.HTTPFuzzer,
  singleNode: false,
  currentSelectPageId: selectedPageId,
  pageList: nodes.map((node) => pageNode(node)),
})

describe('Web Fuzzer group colors', () => {
  const makeGroup = (id: string, color: string): MultipleNodeInfo => ({
    id,
    groupId: '0',
    verbose: id,
    sortFieId: 1,
    expand: true,
    color,
    groupChildren: [{ id: `${id}-tab`, groupId: id, verbose: 'tab', sortFieId: 1 }],
  })

  const withMockRandom = (random: () => number, runTest: () => void) => {
    const originalRandom = Math.random
    Math.random = random
    try {
      runTest()
    } finally {
      Math.random = originalRandom
    }
  }

  it('turns a named fixed color into generateColorScales 60/10 CSS variables', () => {
    const baseHex = getFixedColorBaseHex('purple', 'light')
    const scales = generateColorScales([{ name: 'WebFuzzer-purple', hex: baseHex }]).light
    expect(getWebFuzzerGroupColorStyle('purple', 'light')).toEqual({
      '--web-fuzzer-group-color': scales['--yakit-colors-WebFuzzer-purple-60'],
      '--web-fuzzer-group-contrast-color': scales['--yakit-colors-WebFuzzer-purple-10'],
    })
  })

  it('collects the eight fixed theme base colors from named groups', () => {
    const subPage = webFuzzerGroupColorList.map((color, index) => makeGroup(`group-${index}`, color))
    const exclusions = collectUsedBaseHex(subPage, 'light')
    expect(exclusions).toHaveLength(8)
    webFuzzerGroupColorList.forEach((color) => {
      expect(exclusions).toContain(getFixedColorBaseHex(color, 'light').toLowerCase())
    })
  })

  it('returns light Random-1-60 after eight named groups and remixed hex on display', () => {
    const subPage = webFuzzerGroupColorList.map((color, index) => makeGroup(`group-${index}`, color))
    withMockRandom(
      () => 0,
      () => {
        const exclusions = collectUsedBaseHex(subPage, 'light')
        const expectedHex = generateRandomColorScales(exclusions, 1).light['--yakit-colors-Random-1-60']
        const persistedHex = pickWebFuzzerGroupColor(subPage, 'light')
        expect(persistedHex).toMatch(/^#[0-9A-Fa-f]{6}$/)
        expect(persistedHex).toBe(expectedHex)
        expect(pickWebFuzzerGroupColor(subPage, 'dark')).toBe(persistedHex)

        const remixed = generateColorScales([{ name: 'WebFuzzerGroup', hex: persistedHex }])
        const lightStyle = getWebFuzzerGroupColorStyle(persistedHex, 'light')
        const darkStyle = getWebFuzzerGroupColorStyle(persistedHex, 'dark')
        expect(lightStyle['--web-fuzzer-group-color']).toBe(remixed.light['--yakit-colors-WebFuzzerGroup-60'])
        expect(lightStyle['--web-fuzzer-group-contrast-color']).toBe(remixed.light['--yakit-colors-WebFuzzerGroup-10'])
        expect(darkStyle['--web-fuzzer-group-color']).toBe(remixed.dark['--yakit-colors-WebFuzzerGroup-70'])
        expect(darkStyle['--web-fuzzer-group-contrast-color']).toBe(remixed.dark['--yakit-colors-WebFuzzerGroup-100'])
        expect(lightStyle['--web-fuzzer-group-color']).not.toBe(persistedHex)
        expect(darkStyle['--web-fuzzer-group-color']).not.toBe(lightStyle['--web-fuzzer-group-color'])
      },
    )
  })

  it('does not treat named colors as custom hex colors', () => {
    expect(isCustomWebFuzzerGroupColor('#2F80ED')).toBe(true)
    expect(isCustomWebFuzzerGroupColor('red')).toBe(false)
    expect(getWebFuzzerGroupColorStyle('not-a-color')).toEqual({})
  })
})

describe('rebuildWebFuzzerTabTree', () => {
  it('does not add duplicate ids when create arrives after live-cache restoration', () => {
    const current = [
      {
        ...group('auth-group'),
        groupChildren: [tab('tab-a', 'auth-group')],
      },
    ] as MultipleNodeInfo[]

    expect(filterMissingWebFuzzerNodes(current, [group('auth-group'), tab('tab-a'), tab('tab-b')])).toEqual([
      tab('tab-b'),
    ])
  })

  it('groups existing tabs without replacing their stable ids', () => {
    const current = [tab('tab-a', '0', 1), tab('tab-b', '0', 2)] as MultipleNodeInfo[]
    const changed = [
      group('auth-group', 1, 'Authentication'),
      tab('tab-a', 'auth-group', 1),
      tab('tab-b', 'auth-group', 2),
    ]

    const result = rebuildWebFuzzerTabTree(current, changed, [])

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('auth-group')
    expect(result[0].verbose).toBe('Authentication')
    expect(result[0].groupChildren?.map((item) => item.id)).toEqual(['tab-a', 'tab-b'])
    expect(result[0].groupChildren?.map((item) => item.groupId)).toEqual(['auth-group', 'auth-group'])
    expect(countWebFuzzerTabs(result)).toBe(2)
  })

  it('moves orphaned children to the top level when their group is deleted', () => {
    const currentGroup = {
      ...group('auth-group'),
      groupChildren: [tab('tab-a', 'auth-group', 1), tab('tab-b', 'auth-group', 2)],
    } as MultipleNodeInfo

    const result = rebuildWebFuzzerTabTree([currentGroup], [tab('tab-a', '0', 1), tab('tab-b', '0', 2)], ['auth-group'])

    expect(result.map((item) => item.id)).toEqual(['tab-a', 'tab-b'])
    expect(result.every((item) => item.groupId === '0')).toBe(true)
  })
})

describe('applyWebFuzzerTabMutation', () => {
  it('updates both menu tree and page data while preserving local page state', () => {
    const tabA = tab('tab-a', '0', 1, 'Old name')
    const currentPage = page([tabA], 'tab-a')
    const changed = tab('tab-a', '0', 1, 'New name')
    changed.pageParams = {
      ...changed.pageParams,
      request: 'POST /login HTTP/1.1\r\nHost: example.com\r\n\r\n',
    }

    const result = applyWebFuzzerTabMutation([tabA] as MultipleNodeInfo[], currentPage, [changed], [])
    const updatedPage = result.page.pageList[0]

    expect(result.multipleNode[0].verbose).toBe('New name')
    expect(updatedPage.id).toBe('internal-tab-a')
    expect(updatedPage.pageName).toBe('New name')
    expect(updatedPage.pageParamsInfo.webFuzzerPageInfo?.advancedConfigValue.concurrent).toBe(33)
    expect(updatedPage.pageParamsInfo.webFuzzerPageInfo?.request).toContain('POST /login')
    expect(result.selectedPageId).toBe('tab-a')
  })

  it('selects a remaining tab after the active tab is deleted', () => {
    const tabA = tab('tab-a', '0', 1)
    const tabB = tab('tab-b', '0', 2)

    const result = applyWebFuzzerTabMutation(
      [tabA, tabB] as MultipleNodeInfo[],
      page([tabA, tabB], 'tab-a'),
      [],
      ['tab-a'],
    )

    expect(result.multipleNode.map((item) => item.id)).toEqual(['tab-b'])
    expect(result.page.pageList.map((item) => item.pageId)).toEqual(['tab-b'])
    expect(result.selectedPageId).toBe('tab-b')
  })

  it('focuses the preferred changed tab when openFlag requests it', () => {
    const tabA = tab('tab-a', '0', 1)
    const tabB = tab('tab-b', '0', 2)
    const changedB = tab('tab-b', '0', 2, 'Updated tab B')

    const result = applyWebFuzzerTabMutation(
      [tabA, tabB] as MultipleNodeInfo[],
      page([tabA, tabB], 'tab-a'),
      [changedB],
      [],
      'tab-b',
    )

    expect(result.selectedPageId).toBe('tab-b')
    expect(result.page.currentSelectPageId).toBe('tab-b')
  })

  it('keeps the current tab selected when a changed tab is not preferred', () => {
    const tabA = tab('tab-a', '0', 1)
    const tabB = tab('tab-b', '0', 2)

    const result = applyWebFuzzerTabMutation(
      [tabA, tabB] as MultipleNodeInfo[],
      page([tabA, tabB], 'tab-a'),
      [tab('tab-b', '0', 2, 'Updated tab B')],
      [],
    )

    expect(result.selectedPageId).toBe('tab-a')
    expect(result.page.currentSelectPageId).toBe('tab-a')
  })

  it('applies every MCP-managed request setting to the frontend page state', () => {
    const tabA = tab('tab-a')
    const currentPage = page([tabA], 'tab-a')
    const changed = tab('tab-a', '0', 1, 'Updated request')
    changed.pageParams = {
      ...changed.pageParams,
      request: 'POST /updated HTTP/1.1\r\nHost: api.example.com\r\n\r\n',
      isHttps: false,
      concurrent: 8,
      proxy: ['http://127.0.0.1:9090'],
      actualHost: '127.0.0.1:9080',
      hotPatchCode: 'afterRequest = func(rsp) { return rsp }',
    }

    const result = applyWebFuzzerTabMutation([tabA] as MultipleNodeInfo[], currentPage, [changed], [])
    const info = result.page.pageList[0].pageParamsInfo.webFuzzerPageInfo

    expect(info?.request).toContain('POST /updated')
    expect(info?.hotPatchCode).toBe('afterRequest = func(rsp) { return rsp }')
    expect(info?.advancedConfigValue).toMatchObject({
      isHttps: false,
      concurrent: 8,
      proxy: ['http://127.0.0.1:9090'],
      actualHost: '127.0.0.1:9080',
    })
  })
})

describe('getFuzzerProcessedCacheData', () => {
  it('preserves MCP proxy settings when the frontend rewrites the live cache', () => {
    const tabA = tab('tab-a')
    const currentPage = page([tabA], 'tab-a')
    currentPage.pageList[0].pageParamsInfo.webFuzzerPageInfo!.advancedConfigValue.proxy = [
      'http://127.0.0.1:8080',
      'http://127.0.0.1:8081',
    ]

    const [cached] = getFuzzerProcessedCacheData(currentPage.pageList)

    expect(cached.pageParams.proxy).toEqual(['http://127.0.0.1:8080', 'http://127.0.0.1:8081'])
  })
})
