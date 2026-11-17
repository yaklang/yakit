// Chromium 会把 atom://C:/... 的盘符当成 host。这里还原成本地路径。
const filePathFromAtomUrl = (requestUrl) => {
  const parsed = new URL(String(requestUrl).replace(/\\/g, '/'))
  const pathname = decodeURIComponent(parsed.pathname)
  if (/^[a-zA-Z]$/.test(parsed.host)) return `${parsed.host}:${pathname}`
  if (/^\/[a-zA-Z]:\//.test(pathname)) return pathname.slice(1)
  return pathname
}

module.exports = { filePathFromAtomUrl }
