const { normalizeLocalEndpoint, grpcTarget, createLocalEndpoint, matchesEngineEndpoint } = require('../engineEndpoint')

describe('local engine endpoints', () => {
  it('uses the locked grpc-js unix resolver for raw Windows pipes', () => {
    const endpoint = { transport: 'npipe', path: '\\\\.\\pipe\\yakit-测试' }
    expect(grpcTarget(endpoint, 'win32')).toBe('unix:' + endpoint.path)
    expect(matchesEngineEndpoint({ transport: 'npipe', address: endpoint.path.toUpperCase() }, endpoint, 'win32')).toBe(
      true,
    )
  })
  it.each([
    '\\\\server\\pipe\\yak',
    'npipe://localhost/yak',
    '\\\\.\\pipe\\nested\\yak',
    '\\\\.\\pipe\\yak\0',
    '\\\\.\\pipe\\' + 'x'.repeat(256),
  ])('rejects unsafe pipe %s', (value) => {
    expect(() => normalizeLocalEndpoint({ transport: 'npipe', path: value }, 'win32')).toThrow()
  })
  it('generates independent Windows sessions without installation/CWD paths', () => {
    const first = createLocalEndpoint('auto', 9011, 'yakitEE', 'win32').endpoint
    const second = createLocalEndpoint('ipc', 9011, 'yakitEE', 'win32').endpoint
    expect(first.path).toMatch(/^\\\\\.\\pipe\\yakitEE-[a-f0-9]{40}$/)
    expect(first.path).not.toBe(second.path)
    expect(first.port).toBeUndefined()
  })
  it('counts Unix bytes, preserves short aliases and rejects wrong transport', () => {
    expect(grpcTarget({ transport: 'unix', path: '/tmp/a/grpc.sock' }, 'darwin')).toBe('unix:/tmp/a/grpc.sock')
    expect(() => normalizeLocalEndpoint({ transport: 'unix', path: '/tmp/' + '测'.repeat(34) }, 'linux')).toThrow()
    expect(() => normalizeLocalEndpoint({ transport: 'unix', path: 'relative' }, 'linux')).toThrow()
    expect(() => normalizeLocalEndpoint({ transport: 'unix', path: '/tmp/a' }, 'win32')).toThrow()
  })
  it.each([0, -1, 65536, '1x'])('rejects invalid TCP port %s', (port) => {
    expect(() => createLocalEndpoint('tcp', port)).toThrow()
  })
  it('restricts local TCP to loopback and never accepts engine transport auto', () => {
    expect(() => normalizeLocalEndpoint({ transport: 'tcp', host: '0.0.0.0', port: 9011 })).toThrow()
    expect(() => normalizeLocalEndpoint({ transport: 'auto' })).toThrow()
  })
})
