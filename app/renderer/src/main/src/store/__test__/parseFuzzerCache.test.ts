import { afterEach, describe, expect, it, vi } from 'vitest'
import type * as LogCollection from '@/utils/logCollection'
import { debugToPrintLogs } from '@/utils/logCollection'
import { defaultPostTemplate, HotPatchDefaultContent } from '@/defaultConstants/HTTPFuzzerPage'
import type {
  HTTPResponseMatcher,
  HTTPResponseExtractor,
} from '@/pages/fuzzer/MatcherAndExtractionCard/MatcherAndExtractionCardType'
import { safeParseFuzzerCache, sanitizeFuzzerCachePageParams } from '../parseFuzzerCache'

vi.mock('@/utils/logCollection', async (importOriginal) => {
  const actual = await importOriginal<typeof LogCollection>()
  return {
    ...actual,
    debugToPrintLogs: vi.fn(),
  }
})

const goodItem = {
  groupChildren: [],
  groupId: '0',
  id: 'httpFuzzer-good',
  pageParams: {
    actualHost: '',
    id: 'httpFuzzer-good',
    isHttps: true,
    request: 'GET / HTTP/1.1\r\nHost: a\r\n\r\n',
    params: [{ Key: 'p', Value: '1', Type: 'raw' }],
    extractors: [],
    matchers: [],
    repeatTimes: 0,
    concurrent: 20,
    proxy: [],
    minDelaySeconds: 0,
    maxDelaySeconds: 0,
    hotPatchCode: 'handle = func(p) { return p }',
  },
  sortFieId: 1,
  verbose: 'good',
}

describe('safeParseFuzzerCache', () => {
  afterEach(() => {
    vi.mocked(debugToPrintLogs).mockClear()
  })

  it('returns valid cache as-is including hotPatchCode', () => {
    const result = safeParseFuzzerCache(JSON.stringify([goodItem]))
    expect(result).toHaveLength(1)
    expect(result[0].pageParams.hotPatchCode).toBe(goodItem.pageParams.hotPatchCode)
    expect(result[0].pageParams.request).toBe(goodItem.pageParams.request)
    expect(debugToPrintLogs).not.toHaveBeenCalled()
  })

  it('drops truncated hotPatchCode and fills missing verbose/sortFieId with defaults', () => {
    const broken =
      '{"groupChildren":[],"groupId":"0","id":"httpFuzzer-truncated","pageParams":{"actualHost":"","id":"httpFuzzer-truncated","isHttps":false,"request":"GET / HTTP/1.1\\r\\nHost: a","params":[{"Key":"p","Value":"1","Type":"raw"}],"extractors":[],"matchers":[],"repeatTimes":0,"concurrent":20,"proxy":[],"minDelaySeconds":0,"maxDelaySeconds":0,"hotPatchCode":"handle = func(p) { return unclosed'
    const result = safeParseFuzzerCache(`[${JSON.stringify(goodItem)},${broken}]`)
    expect(result).toHaveLength(2)
    expect(result[0].pageParams.hotPatchCode).toBe(goodItem.pageParams.hotPatchCode)
    expect(result[1].id).toBe('httpFuzzer-truncated')
    expect(result[1].pageParams.request).toBe('GET / HTTP/1.1\r\nHost: a')
    expect(result[1].pageParams.params).toEqual([{ Key: 'p', Value: '1', Type: 'raw' }])
    expect(result[1].pageParams.concurrent).toBe(20)
    expect(result[1].pageParams.hotPatchCode).toBeUndefined()
    expect(result[1].verbose).toBe('2')
    expect(result[1].sortFieId).toBe(2)
    expect(debugToPrintLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'WARN',
        title: expect.stringContaining('hotPatchCode因缓存截断不完整已丢弃'),
        content: expect.objectContaining({ id: 'httpFuzzer-truncated', index: 2, field: 'hotPatchCode' }),
      }),
    )
  })

  it('drops corrupted string value and every field after it, then fills defaults', () => {
    const broken =
      '{"groupChildren":[],"groupId":"0","id":"httpFuzzer-a","pageParams":{"actualHost":"","id":"httpFuzzer-a","isHttps":true,"request":"GET /","params":[],"extractors":[],"matchers":[],"repeatTimes":0,"concurrent":33,"proxy":[],"minDelaySeconds":0,"maxDelaySeconds":0,"hotPatchCode":"broken "quote" here"},"sortFieId":7,"verbose":"keep-me"}'
    const result = safeParseFuzzerCache(`[${broken}]`)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('httpFuzzer-a')
    expect(result[0].pageParams.concurrent).toBe(33)
    expect(result[0].pageParams.request).toBe('GET /')
    expect(result[0].pageParams.hotPatchCode).toBeUndefined()
    // sortFieId and verbose come after the corrupted hotPatchCode, so they are dropped and defaulted
    expect(result[0].sortFieId).toBe(1)
    expect(result[0].verbose).toBe('1')
    expect(debugToPrintLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'WARN',
        title: expect.stringContaining('keep-me'),
        content: expect.objectContaining({ id: 'httpFuzzer-a', verbose: 'keep-me', index: 1, field: 'hotPatchCode' }),
      }),
    )
  })

  it('recovers a multi-tab cache when the last hotPatchCode is truncated', () => {
    const one = JSON.stringify({
      groupChildren: [],
      groupId: '0',
      id: 'httpFuzzer-one',
      pageParams: {
        actualHost: '',
        id: 'httpFuzzer-one',
        isHttps: false,
        request: 'POST /one HTTP/1.1',
        params: [{ Key: 'k', Value: 'v', Type: 'raw' }],
        extractors: [],
        matchers: [],
        repeatTimes: 0,
        concurrent: 15,
        proxy: [],
        minDelaySeconds: 0,
        maxDelaySeconds: 0,
        hotPatchCode: 'handle = func(p) { return p }',
      },
      sortFieId: 1,
      verbose: 'one',
    })
    const broken =
      '{"groupChildren":[],"groupId":"0","id":"httpFuzzer-two","pageParams":{"actualHost":"","id":"httpFuzzer-two","isHttps":true,"request":"GET /two","params":[{"Key":"k","Value":"v","Type":"raw"}],"extractors":[],"matchers":[],"repeatTimes":0,"concurrent":15,"proxy":[],"minDelaySeconds":0,"maxDelaySeconds":0,"hotPatchCode":"handle = func(p) { return unclosed'
    const result = safeParseFuzzerCache(`[${one},${broken}]`)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('httpFuzzer-one')
    expect(result[0].pageParams.hotPatchCode).toBe('handle = func(p) { return p }')
    expect(result[1].id).toBe('httpFuzzer-two')
    expect(result[1].pageParams.request).toBe('GET /two')
    expect(result[1].pageParams.isHttps).toBe(true)
    expect(result[1].pageParams.concurrent).toBe(15)
    expect(result[1].pageParams.hotPatchCode).toBeUndefined()
    expect(result[1].verbose).toBe('2')
    expect(result[1].sortFieId).toBe(2)
  })

  it('fills missing verbose/sortFieId by tab index when the last of several tabs is truncated', () => {
    const makeGood = (id: string, verbose: string, sortFieId: number) =>
      JSON.stringify({
        ...goodItem,
        id,
        pageParams: { ...goodItem.pageParams, id },
        verbose,
        sortFieId,
      })
    const broken =
      '{"groupChildren":[],"groupId":"0","id":"httpFuzzer-d","pageParams":{"actualHost":"","id":"httpFuzzer-d","isHttps":false,"request":"POST /","params":[],"extractors":[],"matchers":[],"repeatTimes":0,"concurrent":20,"proxy":[],"minDelaySeconds":0,"maxDelaySeconds":0,"hotPatchCode":"unclosed'
    const result = safeParseFuzzerCache(
      `[${makeGood('httpFuzzer-a', 'a', 1)},${makeGood('httpFuzzer-b', 'b', 2)},${makeGood('httpFuzzer-c', 'c', 3)},${broken}]`,
    )
    expect(result).toHaveLength(4)
    expect(result.map((item) => item.verbose)).toEqual(['a', 'b', 'c', '4'])
    expect(result.map((item) => item.sortFieId)).toEqual([1, 2, 3, 4])
    expect(result[3].pageParams.request).toBe('POST /')
    expect(result[3].pageParams.hotPatchCode).toBeUndefined()
  })

  it('removes truncated request and later bulky fields', () => {
    const broken =
      '{"groupChildren":[],"groupId":"0","id":"httpFuzzer-bad-request","sortFieId":1,"verbose":"请求页","pageParams":{"actualHost":"","id":"httpFuzzer-bad-request","isHttps":true,"params":[],"extractors":[],"matchers":[],"repeatTimes":0,"concurrent":20,"proxy":[],"minDelaySeconds":0,"maxDelaySeconds":0,"request":"GET / unclosed'
    const result = safeParseFuzzerCache(`[${broken}]`)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('httpFuzzer-bad-request')
    expect(result[0].verbose).toBe('请求页')
    expect(result[0].pageParams.isHttps).toBe(true)
    expect(result[0].pageParams.request).toBeUndefined()
    expect(result[0].pageParams.hotPatchCode).toBeUndefined()
    expect(debugToPrintLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'WARN',
        title: expect.stringContaining('request因缓存截断不完整已丢弃'),
        content: expect.objectContaining({ id: 'httpFuzzer-bad-request', field: 'request' }),
      }),
    )
  })

  it('drops later bulky fields when an earlier bulky field is corrupted', () => {
    const broken =
      '{"groupChildren":[],"groupId":"0","id":"httpFuzzer-keep-hot","sortFieId":1,"verbose":"keep-hot","pageParams":{"actualHost":"","id":"httpFuzzer-keep-hot","isHttps":false,"params":[],"extractors":[],"matchers":[],"repeatTimes":0,"concurrent":20,"proxy":[],"minDelaySeconds":0,"maxDelaySeconds":0,"request":"GET / broken "quote" here","hotPatchCode":"handle = func(p) { return \\"keep\\" }"}}'
    const result = safeParseFuzzerCache(`[${broken}]`)
    expect(result).toHaveLength(1)
    expect(result[0].pageParams.request).toBeUndefined()
    expect(result[0].pageParams.hotPatchCode).toBeUndefined()
    expect(debugToPrintLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ field: 'request' }),
      }),
    )
  })

  it('removes truncated actualHost string and keeps fields before it', () => {
    const broken =
      '{"groupChildren":[],"groupId":"0","id":"httpFuzzer-bad-host","sortFieId":1,"verbose":"短字段","pageParams":{"actualHost":"unclosed'
    const result = safeParseFuzzerCache(`[${broken}]`)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('httpFuzzer-bad-host')
    expect(result[0].verbose).toBe('短字段')
    expect(result[0].pageParams.actualHost).toBeUndefined()
    expect(debugToPrintLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ field: 'actualHost' }),
      }),
    )
  })

  it('removes a string field that is closed by a quote then hits EOF', () => {
    const broken =
      '{"groupChildren":[],"groupId":"0","id":"httpFuzzer-eof","pageParams":{"actualHost":"","id":"httpFuzzer-eof","isHttps":false,"request":"GET /","hotPatchCode":"closed-quote-then-eof"'
    const result = safeParseFuzzerCache(`[${broken}]`)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('httpFuzzer-eof')
    expect(result[0].pageParams.request).toBe('GET /')
    expect(result[0].pageParams.hotPatchCode).toBeUndefined()
    expect(result[0].verbose).toBe('1')
    expect(result[0].sortFieId).toBe(1)
  })

  it('throws original JSON error when a non-string field is truncated', () => {
    const inner =
      '[{"groupChildren":[],"groupId":"0","id":"httpFuzzer-bad-num","pageParams":{"actualHost":"","concurrent":'
    expect(() => safeParseFuzzerCache(inner)).toThrow(SyntaxError)
    expect(debugToPrintLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ERRO',
        title: expect.stringContaining('截断修复未成功'),
        content: expect.objectContaining({ originalError: expect.any(String), repairError: expect.any(String) }),
      }),
    )
  })

  it('throws original JSON error when payload is not json', () => {
    expect(() => safeParseFuzzerCache('{not-json')).toThrow(SyntaxError)
    expect(debugToPrintLogs).toHaveBeenCalledWith(expect.objectContaining({ status: 'ERRO' }))
  })

  it('drops request/hotPatchCode when truncation hits an earlier field; recovery must fall back to defaults', () => {
    // 真实缓存字段顺序里 request / hotPatchCode 排在 params 之后，截断落在 params 内会连带丢弃二者
    const broken =
      '[{"groupChildren":[],"groupId":"0","id":"tab-req","sortFieId":1,"verbose":"req","pageParams":{"actualHost":"","id":"tab-req","isHttps":true,"params":[{"Key":"k","Value":"unclosed'
    const parsed = safeParseFuzzerCache(broken)
    expect(parsed[0].pageParams.isHttps).toBe(true)
    expect(parsed[0].pageParams.request).toBeUndefined()
    expect(parsed[0].pageParams.hotPatchCode).toBeUndefined()
    // 恢复端（fetchFuzzerList）须用默认值回填：页面编辑器对空请求提前返回，
    // 拿到 '' 会一直空白而不会回退默认值；热加载编辑器同理直接展示空串
    expect(defaultPostTemplate.trim().startsWith('POST')).toBe(true)
    expect(HotPatchDefaultContent.trim().length).toBeGreaterThan(0)
  })
})

const goodMatcher: HTTPResponseMatcher = {
  SubMatchers: [],
  SubMatcherCondition: '',
  MatcherType: 'word',
  Scope: 'body',
  Condition: 'and',
  Group: ['admin'],
  GroupEncoding: '',
  Negative: false,
  ExprType: '',
  HitColor: 'red',
  Action: '',
  filterMode: 'onlyMatch',
}
const goodExtractor: HTTPResponseExtractor = {
  Name: 'data_0',
  Type: 'regex',
  Scope: 'body',
  Groups: ['root'],
  RegexpMatchGroup: [],
  XPathAttribute: '',
}

describe('sanitizeFuzzerCachePageParams', () => {
  afterEach(() => {
    vi.mocked(debugToPrintLogs).mockClear()
  })

  it('returns the original params object when matchers/extractors are intact', () => {
    const params = { matchers: [goodMatcher], extractors: [goodExtractor], concurrent: 20 }
    const result = sanitizeFuzzerCachePageParams(params)
    expect(result).toBe(params)
    expect(result.matchers).toHaveLength(1)
    expect(result.extractors).toHaveLength(1)
    expect(debugToPrintLogs).not.toHaveBeenCalled()
  })

  it('returns the original params when matchers/extractors are missing or not arrays', () => {
    const params: { matchers?: HTTPResponseMatcher[]; extractors?: HTTPResponseExtractor[]; concurrent: number } = {
      concurrent: 20,
    }
    expect(sanitizeFuzzerCachePageParams(params)).toBe(params)
    const nullParams: typeof params = {
      concurrent: 20,
      matchers: null as unknown as HTTPResponseMatcher[],
      extractors: null as unknown as HTTPResponseExtractor[],
    }
    expect(sanitizeFuzzerCachePageParams(nullParams)).toBe(nullParams)
    expect(debugToPrintLogs).not.toHaveBeenCalled()
  })

  it('drops matchers missing SubMatchers or Group and extractors missing Groups', () => {
    const brokenSubMatchers = { ...goodMatcher, SubMatchers: undefined } as unknown as HTTPResponseMatcher
    const brokenGroup = { ...goodMatcher, Group: undefined } as unknown as HTTPResponseMatcher
    const brokenGroups = { ...goodExtractor, Groups: undefined } as unknown as HTTPResponseExtractor
    const result = sanitizeFuzzerCachePageParams({
      matchers: [goodMatcher, brokenSubMatchers, brokenGroup],
      extractors: [goodExtractor, brokenGroups],
    })
    expect(result.matchers).toEqual([goodMatcher])
    expect(result.extractors).toEqual([goodExtractor])
    expect(debugToPrintLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'WARN',
        fun: 'sanitizeFuzzerCachePageParams',
        content: expect.objectContaining({ matchers: 3, matchersLeft: 1, extractors: 2, extractorsLeft: 1 }),
      }),
    )
  })

  it('keeps other pageParams fields untouched while dropping broken elements', () => {
    const result = sanitizeFuzzerCachePageParams({
      request: 'GET / HTTP/1.1',
      concurrent: 20,
      matchers: [{ MatcherType: 'word' } as HTTPResponseMatcher],
      extractors: [],
    })
    expect(result.request).toBe('GET / HTTP/1.1')
    expect(result.concurrent).toBe(20)
    expect(result.matchers).toEqual([])
  })

  it('end-to-end: truncated cache yields broken matchers, sanitize makes them panel-safe', () => {
    const broken =
      '[{"groupChildren":[],"groupId":"0","id":"httpFuzzer-m","sortFieId":1,"verbose":"m","pageParams":{"actualHost":"","id":"httpFuzzer-m","isHttps":true,"request":"GET /","params":[],"extractors":[],"matchers":[{"MatcherType":"word","Scope":"body","Group":["adm'
    const parsed = safeParseFuzzerCache(broken)
    // 截断修复保留残缺 matcher：规则面板直接 .SubMatchers.map / .Group.length 会抛 TypeError
    expect(parsed[0].pageParams.matchers).toEqual([{ MatcherType: 'word', Scope: 'body' }])
    expect(() => (parsed[0].pageParams.matchers[0] as HTTPResponseMatcher).SubMatchers.map((ele) => ele)).toThrow(
      TypeError,
    )

    const sanitized = sanitizeFuzzerCachePageParams(parsed[0].pageParams)
    expect(sanitized.matchers).toEqual([])
    // 清洗后可被规则面板安全消费
    expect(sanitized.matchers.map((ele) => ele.SubMatchers.length)).toEqual([])
  })
})
