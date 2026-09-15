// @vitest-environment node
const { parseRemoteEndpoint } = require('../engineEndpoint')

describe('parseRemoteEndpoint', () => {
  it('parses a remote Host with embedded port', () => {
    const result = parseRemoteEndpoint({ Host: '192.168.1.5:9022' })
    expect(result.address).toBe('192.168.1.5:9022')
    expect(result.password).toBe('')
  })

  it('rejects a Host with whitespace or path separators', () => {
    expect(() => parseRemoteEndpoint({ Host: '127.0.0.1 /etc', Port: 9022 })).toThrow('无效')
    expect(() => parseRemoteEndpoint({ Host: '127.0.0.1\\root', Port: 9022 })).toThrow('无效')
  })

  it('wraps an IPv6 host in brackets', () => {
    const result = parseRemoteEndpoint({ Host: '::1', Port: 9022 })
    expect(result.address).toBe('[::1]:9022')
  })

  it('rejects an invalid port', () => {
    expect(() => parseRemoteEndpoint({ Host: '127.0.0.1', Port: 0 })).toThrow('无效')
    expect(() => parseRemoteEndpoint({ Host: '127.0.0.1', Port: 99999 })).toThrow('无效')
  })
})
