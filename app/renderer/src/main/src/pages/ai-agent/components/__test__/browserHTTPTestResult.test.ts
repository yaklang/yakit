import { describe, expect, it } from 'vitest'
import { parseBrowserHTTPTestResult } from '../browserHTTPTestResult'

const result = {
  browserRef: 'A',
  url: 'https://example.test/login',
  statusCode: 200,
  requestTransformed: true,
  responseTransformed: false,
  requestTransformEnabled: true,
  responseTransformEnabled: true,
  plaintextRequest: { raw: 'POST /login HTTP/1.1\r\n\r\n{"password":"plain"}', truncated: false },
  wireRequest: { raw: 'POST /login HTTP/1.1\r\n\r\ncipher=abc', truncated: false },
  wireResponse: { raw: 'HTTP/1.1 200 OK\r\n\r\n{"ok":true}', truncated: false },
  plaintextResponse: { raw: 'HTTP/1.1 200 OK\r\n\r\n{"ok":true}', truncated: false },
}

describe('parseBrowserHTTPTestResult', () => {
  it('reads the semantic result from the real tool execution envelope', () => {
    const parsed = parseBrowserHTTPTestResult({
      stdout: 'RESULT: misleading text',
      stderr: '',
      combined_output: 'RESULT: misleading text',
      result,
    })
    expect(parsed).toMatchObject({ browserRef: 'A', statusCode: 200, requestTransformed: true })
    expect(parsed?.wireRequest.raw).toContain('cipher=abc')
  })

  it('rejects incomplete packet evidence', () => {
    expect(parseBrowserHTTPTestResult({ result: { statusCode: 200 } })).toBeUndefined()
  })
})
