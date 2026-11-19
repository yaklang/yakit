// Chromium 会把 atom://C:/... 的盘符当成 host。仅在 Windows 下还原盘符与反斜杠，POSIX 保留原始路径。
const filePathFromAtomUrl = (requestUrl, platform = process.platform) => {
  const raw = String(requestUrl)
  const isWin32 = platform === 'win32'
  const parsed = new URL(isWin32 ? raw.replace(/\\/g, '/') : raw)
  const pathname = decodeURIComponent(parsed.pathname)
  if (isWin32) {
    if (/^[a-zA-Z]$/.test(parsed.host)) return `${parsed.host}:${pathname}`
    if (/^\/[a-zA-Z]:\//.test(pathname)) return pathname.slice(1)
  }
  return pathname
}

module.exports = { filePathFromAtomUrl }
