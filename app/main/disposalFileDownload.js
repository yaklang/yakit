const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')
const { pipeline } = require('stream/promises')
const dns = require('dns').promises
const { isIP, BlockList } = require('net')
const http = require('http')
const https = require('https')
const { HttpSetting } = require('./state')

const blockedIPv4 = new BlockList()
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
]) {
  blockedIPv4.addSubnet(network, prefix)
}
const globalIPv6 = new BlockList()
globalIPv6.addSubnet('2000::', 3, 'ipv6')
const blockedIPv6 = new BlockList()
blockedIPv6.addSubnet('2001::', 23, 'ipv6')
blockedIPv6.addSubnet('2001:db8::', 32, 'ipv6')
blockedIPv6.addSubnet('2002::', 16, 'ipv6')
blockedIPv6.addSubnet('3fff::', 20, 'ipv6')

// 私有域例外仅来自主进程配置，不能由附件参数扩展；每一跳都重新解析和校验。
const resolveDisposalDownloadAddress = async (url, trustedOrigin) => {
  const address = new URL(url)
  if (!['http:', 'https:'].includes(address.protocol) || address.username || address.password) {
    throw new Error('不支持的下载地址')
  }
  const hostname = address.hostname.replace(/^\[|\]$/g, '')
  const family = isIP(hostname)
  const records = family ? [{ address: hostname, family }] : await dns.lookup(hostname, { all: true })
  if (!records.length) throw new Error('下载地址无法解析')
  if (
    address.origin !== trustedOrigin &&
    records.some((record) =>
      record.family === 4
        ? blockedIPv4.check(record.address)
        : !globalIPv6.check(record.address, 'ipv6') || blockedIPv6.check(record.address, 'ipv6'),
    )
  ) {
    throw new Error('不允许下载非配置私有域的内网或保留地址')
  }
  // 连接复用已校验的 IP，避免校验和连接之间再次 DNS 解析。
  const lookup = (_hostname, options, callback) => {
    const record = records[0]
    if (options.all) callback(null, records)
    else callback(null, record.address, record.family)
  }
  return { address, lookup }
}

const downloadDisposalFile = async ({ url, fileName }, showSaveDialog) => {
  const trustedOrigin = new URL(HttpSetting.httpBaseURL).origin
  let target = await resolveDisposalDownloadAddress(url, trustedOrigin)
  const { address } = target
  const urlName = decodeURIComponent(address.pathname).replace(
    /(\.(?:jpe?g|png|gif|txt|xlsx?|csv|pdf|word|docx))_\d{13}$/i,
    '$1',
  )
  const suggestedName = path.basename((fileName || urlName).replace(/\\/g, '/')) || 'download'
  const { canceled, filePath } = await showSaveDialog({
    title: '保存文件',
    defaultPath: suggestedName,
    properties: ['showOverwriteConfirmation'],
  })
  if (canceled || !filePath) return { canceled: true }

  // 先写临时文件，下载完成后再替换，失败时保留用户原有文件。
  const temporaryPath = `${filePath}.${randomUUID()}.download`
  let agent
  try {
    for (let redirects = 0; ; redirects += 1) {
      const Agent = target.address.protocol === 'https:' ? https.Agent : http.Agent
      agent = new Agent({ lookup: target.lookup })
      const response = await axios.get(target.address.href, {
        responseType: 'stream',
        timeout: 5 * 60 * 1000,
        maxRedirects: 0,
        proxy: false,
        httpAgent: agent,
        httpsAgent: agent,
        validateStatus: (status) => (status >= 200 && status < 300) || [301, 302, 303, 307, 308].includes(status),
      })
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        response.data.destroy()
        agent.destroy()
        if (redirects >= 5 || !response.headers.location) throw new Error('下载重定向无效或次数过多')
        target = await resolveDisposalDownloadAddress(new URL(response.headers.location, target.address), trustedOrigin)
        continue
      }
      await pipeline(response.data, fs.createWriteStream(temporaryPath, { flags: 'wx' }))
      break
    }
    await fs.promises.rename(temporaryPath, filePath)
    return { canceled: false, filePath }
  } finally {
    agent?.destroy()
    await fs.promises.unlink(temporaryPath).catch(() => {})
  }
}

module.exports = { downloadDisposalFile, resolveDisposalDownloadAddress }
