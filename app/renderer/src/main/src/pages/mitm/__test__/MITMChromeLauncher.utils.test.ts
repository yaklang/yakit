import { describe, expect, it } from 'vitest'
import { parseChromeProxyHostFromEngineAddr } from '../MITMChromeLauncher.utils'

describe('parseChromeProxyHostFromEngineAddr', () => {
  it('uses the host from a loopback engine address', () => {
    expect(parseChromeProxyHostFromEngineAddr('127.0.0.1:9011')).toBe('127.0.0.1')
    expect(parseChromeProxyHostFromEngineAddr('127.0.0.1:8087')).toBe('127.0.0.1')
  })

  it('uses a DNS hostname and does not reject names that merely contain unix', () => {
    expect(parseChromeProxyHostFromEngineAddr('remote.example:9011')).toBe('remote.example')
    expect(parseChromeProxyHostFromEngineAddr('unix.example:80')).toBe('unix.example')
  })

  it.each([
    'unix:/tmp/yakit/grpc.sock',
    'unix:///tmp/yakit/grpc.sock',
    'UNIX:/var/run/yak.sock',
    'unix:\\\\.\\pipe\\yakit-abc',
  ])('does not use unix socket %s as the Chrome proxy host', (addr) => {
    expect(parseChromeProxyHostFromEngineAddr(addr)).toBeNull()
  })

  it.each(['', '127.0.0.1', ':9011', '127.0.0.1:9011:extra', 'bad host:9011', 'http://127.0.0.1:8080', '[::1]:9022'])(
    'returns null for malformed input %s',
    (addr) => {
      expect(parseChromeProxyHostFromEngineAddr(addr)).toBeNull()
    },
  )

  it.each([undefined, null, 9011])('returns null for non-string input %s', (addr) => {
    expect(parseChromeProxyHostFromEngineAddr(addr)).toBeNull()
  })
})
