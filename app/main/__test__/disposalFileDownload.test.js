// @vitest-environment node
const fs = require('fs/promises')
const os = require('os')
const path = require('path')
const http = require('http')
const { downloadDisposalFile } = require('../disposalFileDownload')

describe('处置日志文件下载', () => {
  let directory
  let server
  let baseUrl
  let requestedUrl

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'yakit-download-test-'))
    server = http.createServer((request, response) => {
      requestedUrl = request.url
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
  })

  afterEach(async () => {
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
