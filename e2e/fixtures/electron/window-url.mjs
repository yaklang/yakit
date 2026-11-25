/**
 * E2E 窗口 URL 匹配。
 * dev 目标是 `host:port/path` 片段，生产目标是 asar 内的绝对 pathname。
 * 不能用简单的 includes：`127.0.0.1:3000` 会命中 `127.0.0.1:30000/engine-link.html`。
 */
export const matchesYakitWindowUrl = (url, target) => {
  if (!url || !target) return false

  try {
    const actual = new URL(url)
    if (target.startsWith('/')) return actual.pathname.endsWith(target)

    const expected = new URL(target.includes('://') ? target : `http://${target}`)
    return (
      actual.protocol === expected.protocol &&
      actual.hostname === expected.hostname &&
      actual.port === expected.port &&
      actual.pathname === expected.pathname
    )
  } catch {
    return url.includes(target)
  }
}
