const { ipcRendererMock } = vi.hoisted(() => {
  const ipcRendererMock = {
    invoke: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
  }
  ;(window as unknown as { require: (id: string) => unknown }).require = (id: string) => {
    if (id === 'electron') return { ipcRenderer: ipcRendererMock }
    return {}
  }
  return { ipcRendererMock }
})

import { describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/notification', () => ({
  yakitFailed: vi.fn(),
  yakitNotify: vi.fn(),
}))

import { DEFAULT_GLOBAL_TEMPLATES } from '../globalHotPatch'

// 「[全局] HTTP流量测试项打标」模板：正则判据均为 JS RegExp 兼容语法，
// 在 JS 侧提取并锚定行为，防止内容替换时无感弱化判据。
// 局限：只覆盖正则模式本身，不覆盖 yak re2 的多行默认等引擎语义差异。
const entry = DEFAULT_GLOBAL_TEMPLATES.find((t) => t.name === '[全局] HTTP流量测试项打标')
const content = entry?.content ?? ''

const extractRegexes = (source: string): Map<string, RegExp> => {
  const defs = new Map<string, RegExp>()
  const lineRe = /^(\w+) = re2\.Compile\(`([^`]*)`\)~$/gm
  let m: RegExpExecArray | null
  while ((m = lineRe.exec(source))) {
    defs.set(m[1], new RegExp(m[2]))
  }
  return defs
}

const regexes = extractRegexes(content)

const FLOW_TAGS = [
  '注入测试',
  'SQLi',
  '命令注入',
  'SSTI',
  '访问控制',
  'IDOR',
  '批量赋值',
  '敏感信息',
  '信息泄露',
  'CORS',
  'XSS',
  '文件上传',
  '文件下载',
  '路径穿越',
  '文件包含',
  'SSRF',
  '开放重定向',
  'XXE',
  '反序列化',
  '身份认证',
  'CSRF',
]

describe('globalHotPatch HTTP流量测试项打标模板', () => {
  it('条目存在且结构守卫完整', () => {
    expect(entry).toBeDefined()
    expect(entry?.nameUi).toBe('GlobalHotPatch.http_flow_test_tags')
    // 标签统一走 TEST: 前缀
    expect(content).toContain('flow.AddTag("TEST:" + name)')
    // hook 签名与显式放行
    expect(content).toContain('hijackSaveHTTPFlow = func(flow, modify, drop)')
    // hook 以显式放行收尾（函数体内最后一条语句）
    expect(content.trimEnd().endsWith('modify(flow)\n}')).toBe(true)
    expect(content).not.toContain('drop(flow)')
    // 标签清单完整，防止改名后前端筛选失效
    for (const tag of FLOW_TAGS) {
      expect(content).toContain(`tag(flow, "${tag}")`)
    }
  })

  it('内置正则全部提取并可编译', () => {
    expect(regexes.size).toBeGreaterThanOrEqual(28)
    const required = [
      'inputContentTypeRe',
      'inputBodyRe',
      'htmlResponseRe',
      'injectionParamRe',
      'injectionPayloadRe',
      'commandParamRe',
      'commandPayloadRe',
      'sensitiveResponseRe',
      'redirectRe',
      'ssrfRe',
      'resourceIDRe',
      'resourcePathIDRe',
      'xssPayloadRe',
      'traversalRe',
      'csrfTokenRe',
    ]
    for (const name of required) {
      expect(regexes.get(name), `missing regex: ${name}`).toBeInstanceOf(RegExp)
    }
  })

  it('关键判据正例命中（输入侧）', () => {
    expect(regexes.get('inputContentTypeRe')?.test('content-type: application/json')).toBe(true)
    expect(regexes.get('inputBodyRe')?.test('\r\n\r\ncmd=whoami')).toBe(true)
    expect(regexes.get('injectionParamRe')?.test('get /run?cmd=whoami http/1.1')).toBe(true)
    expect(regexes.get('injectionPayloadRe')?.test('q=union%20select%201')).toBe(true)
    expect(regexes.get('injectionPayloadRe')?.test('sleep(5)')).toBe(true)
    expect(regexes.get('commandParamRe')?.test('/ping?host=example.com')).toBe(true)
    expect(regexes.get('commandPayloadRe')?.test(';cat /etc/passwd')).toBe(true)
    expect(regexes.get('commandPayloadRe')?.test('|curl http://evil.example')).toBe(true)
    expect(regexes.get('sstiRe')?.test('${7*7}')).toBe(true)
    expect(regexes.get('resourceIDRe')?.test('/api/user_id/123')).toBe(true)
    expect(regexes.get('resourcePathIDRe')?.test('/api/orders/123/page')).toBe(true)
    expect(regexes.get('massAssignmentRe')?.test('{"isadmin": true}')).toBe(true)
    expect(regexes.get('xssInputRe')?.test('q=keyword')).toBe(true)
    expect(regexes.get('xssPayloadRe')?.test('<script>alert(1)')).toBe(true)
    expect(regexes.get('uploadRe')?.test('content-type: multipart/form-data')).toBe(true)
    expect(regexes.get('traversalRe')?.test('../../etc/passwd')).toBe(true)
    expect(regexes.get('fileSchemeRe')?.test('file:///etc/passwd')).toBe(true)
    expect(regexes.get('ssrfRe')?.test('/fetch?url=http://127.0.0.1/x')).toBe(true)
    expect(regexes.get('redirectRe')?.test('/login?redirect=https://evil.example')).toBe(true)
    expect(regexes.get('xmlRe')?.test('content-type: application/xml')).toBe(true)
    expect(regexes.get('deserializationRe')?.test('ac ed 00 05')).toBe(true)
    expect(regexes.get('authRe')?.test('authorization: bearer x')).toBe(true)
    expect(regexes.get('cookieRe')?.test('cookie: session=1')).toBe(true)
  })

  it('关键判据正例命中（响应侧）', () => {
    expect(regexes.get('htmlResponseRe')?.test('content-type: text/html')).toBe(true)
    expect(regexes.get('sensitiveResponseRe')?.test('password=secret123')).toBe(true)
    expect(regexes.get('sensitiveResponseRe')?.test('-----begin rsa private key-----')).toBe(true)
    expect(regexes.get('sensitiveResponseRe')?.test('aws_access_key_id=akiaiosfodnn7example')).toBe(true)
    expect(regexes.get('errorDisclosureRe')?.test('sql syntax error')).toBe(true)
    expect(regexes.get('corsRe')?.test('access-control-allow-origin: *')).toBe(true)
    expect(regexes.get('downloadResponseRe')?.test('content-disposition: attachment')).toBe(true)
    expect(regexes.get('authenticationRe')?.test('set-cookie: sessionid=1')).toBe(true)
    expect(regexes.get('csrfTokenRe')?.test('x-csrf-token: 1')).toBe(true)
  })

  it('已知弱化场景的现状锚定（修复判据后应翻转对应断言）', () => {
    // 交付版简化正则的已知弱化：命令 payload 与分隔符间的空格、串结尾不命中
    expect(regexes.get('commandPayloadRe')?.test('foo; id')).toBe(false)
    expect(regexes.get('commandPayloadRe')?.test('foo && whoami')).toBe(false)
    // JSON 带引号键名的敏感字段（旧版 ["']? 可命中）
    expect(regexes.get('sensitiveResponseRe')?.test('"access_token":"abc"')).toBe(false)
    // JSON 形态的重定向参数（旧版 ["']\s*:\s*["'] 变体可命中）
    expect(regexes.get('redirectRe')?.test('{"next":"https://evil.example/"}')).toBe(false)
  })
})
