// @vitest-environment node
const fs = require('fs/promises')
const os = require('os')
const path = require('path')
const http = require('http')
const { downloadDisposalFile, resolveDisposalDownloadAddress } = require('../disposalFileDownload')
const { HttpSetting } = require('../state')
const dns = require('dns').promises

describe('处置日志文件下载', () => {
  let directory
  let server
  let baseUrl
  let requestedUrl
  let originalBaseUrl

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'yakit-download-test-'))
    server = http.createServer((request, response) => {
      requestedUrl = request.url
      if (request.url === '/redirect-private') {
        response.writeHead(302, { Location: `http://localhost:${server.address().port}/redirect-target` })
        response.end()
        return
      }
      if (request.url === '/redirect-relative') {
        response.writeHead(302, { Location: '/image.png' })
        response.end()
        return
      }
      if (request.url === '/redirect-loop') {
        response.writeHead(302, { Location: '/redirect-loop' })
        response.end()
        return
      }
      if (request.url === '/missing') {
        response.writeHead(404)
        response.end('missing')
        return
      }
      if (request.url === '/broken') {
        response.writeHead(200, { 'Content-Length': 100, Connection: 'close' })
        response.end('partial')
        return
      }
      response.end(Buffer.from([0, 1, 2, 255]))
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    baseUrl = `http://127.0.0.1:${server.address().port}`
    originalBaseUrl = HttpSetting.httpBaseURL
    HttpSetting.httpBaseURL = baseUrl
  })

  afterEach(async () => {
    HttpSetting.httpBaseURL = originalBaseUrl
    vi.restoreAllMocks()
    await new Promise((resolve) => server.close(resolve))
    for (const name of await fs.readdir(directory)) await fs.unlink(path.join(directory, name))
    await fs.rmdir(directory)
  })

  it('实际写入图片/附件字节，保留编码URL，保存时使用原文件名', async () => {
    const filePath = path.join(directory, '附件.zip')
    await fs.writeFile(filePath, 'old contents')
    const dialog = vi.fn().mockResolvedValue({ canceled: false, filePath })
    await expect(
      downloadDisposalFile({ url: `${baseUrl}/a%20b.png?signature=a%2Bb`, fileName: '附件.zip' }, dialog),
    ).resolves.toEqual({ canceled: false, filePath })
    expect(dialog).toHaveBeenCalledWith(expect.objectContaining({ defaultPath: '附件.zip' }))
    expect(await fs.readFile(filePath)).toEqual(Buffer.from([0, 1, 2, 255]))
    expect(requestedUrl).toBe('/a%20b.png?signature=a%2Bb')
    expect(await fs.readdir(directory)).toEqual(['附件.zip'])
  })

  it('取消保存时不发起请求、不生成文件', async () => {
    requestedUrl = undefined
    await expect(
      downloadDisposalFile({ url: `${baseUrl}/image.png` }, async () => ({ canceled: true })),
    ).resolves.toEqual({ canceled: true })
    expect(requestedUrl).toBeUndefined()
    expect(await fs.readdir(directory)).toEqual([])
  })

  it.each(['/missing', '/broken'])('下载失败（%s）向调用方报错并保留已有文件', async (endpoint) => {
    const filePath = path.join(directory, 'existing.zip')
    await fs.writeFile(filePath, 'original')
    await expect(
      downloadDisposalFile({ url: `${baseUrl}${endpoint}` }, async () => ({ canceled: false, filePath })),
    ).rejects.toThrow()
    expect(await fs.readFile(filePath, 'utf8')).toBe('original')
    expect(await fs.readdir(directory)).toEqual(['existing.zip'])
  })

  it('拒绝本地文件等非HTTP下载地址', async () => {
    const dialog = vi.fn()
    await expect(downloadDisposalFile({ url: 'file:///C:/secret' }, dialog)).rejects.toThrow('不支持')
    expect(dialog).not.toHaveBeenCalled()
  })

  it('拒绝非配置私有域的回环地址，且不显示保存框或发出请求', async () => {
    HttpSetting.httpBaseURL = 'https://vip.yaklang.com'
    const dialog = vi.fn().mockResolvedValue({ canceled: true })
    requestedUrl = undefined
    await expect(downloadDisposalFile({ url: `${baseUrl}/private` }, dialog)).rejects.toThrow()
    expect(dialog).not.toHaveBeenCalled()
    expect(requestedUrl).toBeUndefined()
  })

  it('逐跳拒绝重定向到非配置的内网域名，保留原文件', async () => {
    const filePath = path.join(directory, 'existing.zip')
    await fs.writeFile(filePath, 'original')
    await expect(
      downloadDisposalFile({ url: `${baseUrl}/redirect-private` }, async () => ({ canceled: false, filePath })),
    ).rejects.toThrow()
    expect(requestedUrl).toBe('/redirect-private')
    expect(await fs.readFile(filePath, 'utf8')).toBe('original')
    expect(await fs.readdir(directory)).toEqual(['existing.zip'])
  })

  it('允许配置私有域内的相对重定向', async () => {
    const filePath = path.join(directory, 'file.png')
    await downloadDisposalFile({ url: `${baseUrl}/redirect-relative` }, async () => ({ canceled: false, filePath }))
    expect(requestedUrl).toBe('/image.png')
    expect(await fs.readFile(filePath)).toEqual(Buffer.from([0, 1, 2, 255]))
  })

  it('配置的内网域名连接使用已校验IP，避免连接时重新解析', async () => {
    HttpSetting.httpBaseURL = `http://enterprise.test:${server.address().port}`
    const lookup = vi.spyOn(dns, 'lookup').mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }])
    const filePath = path.join(directory, 'file.png')
    await downloadDisposalFile({ url: `${HttpSetting.httpBaseURL}/image.png` }, async () => ({
      canceled: false,
      filePath,
    }))
    expect(lookup).toHaveBeenCalledTimes(1)
    expect(requestedUrl).toBe('/image.png')
    expect(await fs.readFile(filePath)).toEqual(Buffer.from([0, 1, 2, 255]))
  })

  it('限制重定向次数并清理临时文件', async () => {
    const filePath = path.join(directory, 'file.png')
    await expect(
      downloadDisposalFile({ url: `${baseUrl}/redirect-loop` }, async () => ({ canceled: false, filePath })),
    ).rejects.toThrow('重定向')
    expect(await fs.readdir(directory)).toEqual([])
  })

  it.each([
    [undefined, '私密の笔记.txt'],
    ['原始名字.txt', '原始名字.txt'],
    ['笔记.txt_1790751951784', '笔记.txt_1790751951784'],
  ])('下载以原文件名优先，仅URL回退名清理存储时间戳（%s）', async (fileName, expectedName) => {
    const dialog = vi.fn().mockResolvedValue({ canceled: true })
    await downloadDisposalFile(
      { url: `${baseUrl}/${encodeURIComponent('私密の笔记.txt')}_1790751951784`, fileName },
      dialog,
    )
    expect(dialog).toHaveBeenCalledWith(expect.objectContaining({ defaultPath: expectedName }))
  })
})

describe('处置下载地址策略', () => {
  afterEach(() => vi.restoreAllMocks())

  it.each([
    'http://127.1/file',
    'http://2130706433/file',
    'http://0x7f000001/file',
    'http://0.0.0.0/file',
    'http://10.0.0.1/file',
    'http://172.16.0.1/file',
    'http://192.168.0.1/file',
    'http://169.254.169.254/file',
    'http://100.100.100.200/file',
    'http://[::1]/file',
    'http://[::ffff:127.0.0.1]/file',
    'http://[fc00::1]/file',
    'http://[fe80::1]/file',
    'http://[64:ff9b::a00:1]/file',
    'http://[2002:7f00:1::]/file',
    'http://user:pass@8.8.8.8/file',
  ])('拒绝内网、保留地址及带凭据URL：%s', async (url) => {
    await expect(resolveDisposalDownloadAddress(url, 'https://vip.yaklang.com')).rejects.toThrow()
  })

  it('公网域名解析到任意内网IP时拒绝，包括混合IPv4/IPv6结果', async () => {
    vi.spyOn(dns, 'lookup').mockResolvedValue([
      { address: '8.8.8.8', family: 4 },
      { address: '::1', family: 6 },
    ])
    await expect(resolveDisposalDownloadAddress('https://files.test/a', 'https://vip.yaklang.com')).rejects.toThrow()
  })

  it.each([
    ['8.8.8.8', 4],
    ['2606:4700:4700::1111', 6],
  ])('公网IP %s 校验后固定连接地址，DNS变化不影响该连接', async (address, family) => {
    const resolve = vi.spyOn(dns, 'lookup').mockResolvedValueOnce([{ address, family }])
    const target = await resolveDisposalDownloadAddress('https://files.test/a', 'https://vip.yaklang.com')
    resolve.mockResolvedValue([{ address: '127.0.0.1', family: 4 }])
    const callback = vi.fn()
    target.lookup('files.test', {}, callback)
    expect(callback).toHaveBeenCalledWith(null, address, family)
    target.lookup('files.test', { all: true }, callback)
    expect(callback).toHaveBeenLastCalledWith(null, [{ address, family }])
    expect(resolve).toHaveBeenCalledTimes(1)
  })

  it('配置的私有域例外不包含其他端口或子域', async () => {
    await expect(resolveDisposalDownloadAddress('http://127.0.0.1:81/a', 'http://127.0.0.1:80')).rejects.toThrow()
    vi.spyOn(dns, 'lookup').mockResolvedValue([{ address: '10.0.0.1', family: 4 }])
    await expect(
      resolveDisposalDownloadAddress('http://sub.enterprise.test/a', 'http://enterprise.test'),
    ).rejects.toThrow()
  })
})
