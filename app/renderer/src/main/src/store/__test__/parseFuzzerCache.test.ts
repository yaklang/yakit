import { afterEach, describe, expect, it, vi } from 'vitest'
import type * as LogCollection from '@/utils/logCollection'
import { debugToPrintLogs } from '@/utils/logCollection'
import { safeParseFuzzerCache } from '../parseFuzzerCache'

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
})
