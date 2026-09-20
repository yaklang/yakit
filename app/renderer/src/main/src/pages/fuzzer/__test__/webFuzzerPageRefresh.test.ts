import { describe, expect, it, vi } from 'vitest'
import { defaultWebFuzzerPageInfo } from '@/defaultConstants/HTTPFuzzerPage'
import { applyWebFuzzerPageRuntimeRefresh, buildWebFuzzerPageRuntimeRefresh } from '../webFuzzerPageRefresh'

describe('Web Fuzzer page runtime refresh', () => {
  it('synchronizes every MCP-managed editor setting from the page store', () => {
    const pageInfo = {
      ...defaultWebFuzzerPageInfo,
      request: 'POST /updated HTTP/1.1\r\nHost: api.example.com\r\n\r\n',
      hotPatchCode: 'afterRequest = func(rsp) { return rsp }',
      browserTransformSelection: {
        deviceId: 'browser',
        profileId: 'profile',
        profileName: 'AES',
      },
      advancedConfigValue: {
        ...defaultWebFuzzerPageInfo.advancedConfigValue,
        isHttps: false,
        concurrent: 8,
        proxy: ['http://127.0.0.1:9090'],
        actualHost: '127.0.0.1:9080',
      },
    }

    const requestRef = { current: 'GET /old HTTP/1.1\r\n\r\n' }
    const hotPatchCodeRef = { current: 'old hot patch' }
    const isHttpsRef = { current: true }
    const setAdvancedConfigValue = vi.fn()
    const setBrowserTransformSelection = vi.fn()
    const refreshEditor = vi.fn()

    applyWebFuzzerPageRuntimeRefresh(pageInfo, {
      requestRef,
      hotPatchCodeRef,
      isHttpsRef,
      setAdvancedConfigValue,
      setBrowserTransformSelection,
      refreshEditor,
    })

    expect(requestRef.current).toBe(pageInfo.request)
    expect(hotPatchCodeRef.current).toBe(pageInfo.hotPatchCode)
    expect(isHttpsRef.current).toBe(false)
    expect(setAdvancedConfigValue).toHaveBeenCalledWith(
      expect.objectContaining({
        isHttps: false,
        concurrent: 8,
        proxy: ['http://127.0.0.1:9090'],
        actualHost: '127.0.0.1:9080',
      }),
    )
    expect(setAdvancedConfigValue.mock.calls[0][0]).not.toBe(pageInfo.advancedConfigValue)
    expect(setBrowserTransformSelection).toHaveBeenCalledWith(pageInfo.browserTransformSelection)
    expect(setBrowserTransformSelection.mock.calls[0][0]).not.toBe(pageInfo.browserTransformSelection)
    expect(refreshEditor).toHaveBeenCalledOnce()
  })

  it('does not refresh the editor when only advanced settings changed', () => {
    const pageInfo = {
      ...defaultWebFuzzerPageInfo,
      advancedConfigValue: {
        ...defaultWebFuzzerPageInfo.advancedConfigValue,
        concurrent: 16,
      },
    }

    const refresh = buildWebFuzzerPageRuntimeRefresh(
      pageInfo,
      defaultWebFuzzerPageInfo.request,
      defaultWebFuzzerPageInfo.hotPatchCode,
    )

    expect(refresh.refreshEditor).toBe(false)
    expect(refresh.advancedConfigValue.concurrent).toBe(16)
  })
})
