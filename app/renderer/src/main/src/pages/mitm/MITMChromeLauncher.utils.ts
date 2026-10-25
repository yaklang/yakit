const TCP_HOST = /^[a-zA-Z0-9.-]+$/

/**
 * 从引擎地址取出可交给 Chrome 的代理主机。
 * TCP 地址形如 `127.0.0.1:端口` 或 `host:端口`，返回主机。
 * Unix Socket（`unix:…`）、非字符串和无法当成 IP/域名的地址返回 null，
 * 调用方保留 MITM 默认主机，与启动器里解析失败时直接 return 的行为一致。
 */
export const parseChromeProxyHostFromEngineAddr = (addr: unknown): string | null => {
  if (typeof addr !== 'string') return null
  const parts = addr.split(':')
  if (parts.length !== 2) return null
  const host = parts[0]
  if (!host || host.toLowerCase() === 'unix' || !TCP_HOST.test(host)) return null
  return host
}
