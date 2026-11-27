import type { KVPair } from '@/models/kv'
import type { AddMCPServerRequest } from '../type/aiMCP'

type ImportError = 'invalidServer' | 'invalidTransport' | 'invalidUrl' | 'invalidCommand' | 'invalidPairs'

export type MCPImportEntry =
  | { name: string; error: ImportError }
  | { name: string; server: AddMCPServerRequest; target: string }

type MCPImportConfig = { error: 'invalidJson' | 'emptyConfig' } | { entries: MCPImportEntry[] }

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parsePairs = (value: unknown): KVPair[] | undefined => {
  if (value === undefined) return []
  if (!isObject(value)) return undefined
  const entries: KVPair[] = []
  for (const [Key, Value] of Object.entries(value)) {
    if (!Key.trim() || typeof Value !== 'string') return undefined
    entries.push({ Key, Value })
  }
  return entries
}

const parseServer = (name: string, config: unknown): MCPImportEntry => {
  if (!name.trim() || !isObject(config)) return { name, error: 'invalidServer' }

  const type = config.type
  const command = config.command
  const url = config.url
  if (type === 'stdio' || (type === undefined && command !== undefined)) {
    const args = config.args === undefined ? [] : config.args
    // The engine splits Command on spaces and drops empty arguments.
    const isCommandPart = (part: unknown): part is string =>
      typeof part === 'string' && part.length > 0 && part === part.trim() && !part.includes(' ') && !part.includes('\0')
    if (url !== undefined || !isCommandPart(command) || !Array.isArray(args) || !args.every(isCommandPart)) {
      return { name, error: 'invalidCommand' }
    }
    const envs = parsePairs(config.env)
    if (!envs) return { name, error: 'invalidPairs' }

    return {
      name,
      target: command,
      server: {
        Name: name,
        Type: 'stdio',
        URL: '',
        Command: [command, ...args].join(' '),
        Enable: false,
        Envs: envs,
        Headers: [],
      },
    }
  }

  if (
    type !== undefined &&
    type !== 'sse' &&
    type !== 'http' &&
    type !== 'streamable-http' &&
    type !== 'streamable_http'
  ) {
    return { name, error: 'invalidTransport' }
  }
  if (typeof url !== 'string' || command !== undefined) return { name, error: 'invalidUrl' }
  let endpoint: URL
  try {
    endpoint = new URL(url.trim())
    if (endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:') return { name, error: 'invalidUrl' }
  } catch {
    return { name, error: 'invalidUrl' }
  }
  const headers = parsePairs(config.headers)
  if (!headers) return { name, error: 'invalidPairs' }
  const normalizedHeaders: KVPair[] = []
  try {
    const validated = new Headers(headers.map<[string, string]>(({ Key, Value }) => [Key, Value]))
    validated.forEach((Value, Key) => {
      normalizedHeaders.push({ Key, Value })
    })
  } catch {
    return { name, error: 'invalidPairs' }
  }

  const isSse = type === 'sse' || (type === undefined && /\/sse\/?$/.test(endpoint.pathname))
  return {
    name,
    target: endpoint.origin,
    server: {
      Name: name,
      Type: isSse ? 'sse' : 'streamable_http',
      URL: endpoint.href,
      Command: '',
      Enable: true,
      Envs: [],
      Headers: normalizedHeaders,
    },
  }
}

export const parseMCPImportConfig = (text: string): MCPImportConfig => {
  let config: unknown
  try {
    config = JSON.parse(text.trim())
  } catch {
    return { error: 'invalidJson' }
  }
  if (!isObject(config) || !isObject(config.mcpServers) || Object.keys(config.mcpServers).length === 0) {
    return { error: 'emptyConfig' }
  }
  return { entries: Object.entries(config.mcpServers).map(([name, server]) => parseServer(name, server)) }
}
